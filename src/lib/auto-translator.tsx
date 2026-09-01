import { useEffect, useRef } from "react";
import { useUserPrefs } from "@/lib/user-prefs";
import { translateBatch } from "@/lib/auto-translate.functions";

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "CODE",
  "PRE",
  "TEXTAREA",
  "NOSCRIPT",
  "SVG",
  "PATH",
]);

const ATTR_TARGETS = ["placeholder", "aria-label", "title", "alt"] as const;

// Preserve originals across re-translations
const originalText = new WeakMap<Text, string>();
const originalAttr = new WeakMap<Element, Record<string, string>>();

function isTranslatable(s: string) {
  const t = s.trim();
  if (!t) return false;
  if (t.length > 500) return false;
  if (!/[A-Za-z]/.test(t)) return false;
  return true;
}

function collect(root: Node, texts: Set<string>, textNodes: Text[], attrNodes: Element[]) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (n.nodeType === Node.TEXT_NODE) {
        const parent = (n as Text).parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.closest("[data-notranslate]")) return NodeFilter.FILTER_REJECT;
        const orig = originalText.get(n as Text) ?? n.nodeValue ?? "";
        if (!isTranslatable(orig)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
      const el = n as Element;
      if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
      if (el.closest("[data-notranslate]")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_SKIP; // don't emit element, but keep walking children
    },
  });
  let n: Node | null;
  // eslint-disable-next-line no-cond-assign
  while ((n = walker.nextNode())) {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = n as Text;
      const orig = originalText.get(t) ?? t.nodeValue ?? "";
      if (!originalText.has(t)) originalText.set(t, orig);
      textNodes.push(t);
      texts.add(orig.trim());
    }
  }

  // Attributes pass
  const els = (root instanceof Element ? root : document.body).querySelectorAll(
    "[placeholder], [aria-label], [title], [alt]",
  );
  els.forEach((el) => {
    if (SKIP_TAGS.has(el.tagName)) return;
    if (el.closest("[data-notranslate]")) return;
    let map = originalAttr.get(el);
    if (!map) {
      map = {};
      for (const a of ATTR_TARGETS) {
        const v = el.getAttribute(a);
        if (v) map[a] = v;
      }
      originalAttr.set(el, map);
    }
    for (const a of ATTR_TARGETS) {
      const orig = map[a];
      if (orig && isTranslatable(orig)) {
        texts.add(orig.trim());
        attrNodes.push(el);
      }
    }
  });
}

function loadCache(lang: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(`arch:autoi18n:${lang}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveCache(lang: string, cache: Record<string, string>) {
  try {
    localStorage.setItem(`arch:autoi18n:${lang}`, JSON.stringify(cache));
  } catch {
    /* quota */
  }
}

export function AutoTranslator() {
  const { language } = useUserPrefs();
  const langRef = useRef(language);
  const cacheRef = useRef<Record<string, string>>({});
  const pendingRef = useRef<Set<string>>(new Set());
  const inflightRef = useRef<Promise<void> | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    langRef.current = language;
    const short = (language || "en").toLowerCase();
    // Reset & restore originals when switching to English
    if (short.startsWith("en")) {
      cacheRef.current = {};
      restoreAll();
      return;
    }
    cacheRef.current = loadCache(language);
    scheduleScan();

    const obs = new MutationObserver(() => scheduleScan());
    obs.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "aria-label", "title", "alt"],
    });

    return () => {
      obs.disconnect();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  function restoreAll() {
    // Text nodes
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    // eslint-disable-next-line no-cond-assign
    while ((n = walker.nextNode())) {
      const t = n as Text;
      const orig = originalText.get(t);
      if (orig != null && t.nodeValue !== orig) t.nodeValue = orig;
    }
    // Attributes
    document.body.querySelectorAll("[placeholder], [aria-label], [title], [alt]").forEach((el) => {
      const map = originalAttr.get(el);
      if (!map) return;
      for (const a of ATTR_TARGETS) if (map[a]) el.setAttribute(a, map[a]);
    });
  }

  function scheduleScan() {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(runScan, 120);
  }

  async function runScan() {
    const lang = langRef.current;
    if (!lang || lang.toLowerCase().startsWith("en")) return;
    const texts = new Set<string>();
    const textNodes: Text[] = [];
    const attrNodes: Element[] = [];
    collect(document.body, texts, textNodes, attrNodes);

    // Apply cached translations immediately
    applyTranslations(cacheRef.current);

    // Find missing
    const missing: string[] = [];
    texts.forEach((t) => {
      if (!(t in cacheRef.current) && !pendingRef.current.has(t)) missing.push(t);
    });
    if (missing.length === 0) return;

    missing.forEach((m) => pendingRef.current.add(m));
    // Batch in chunks of 60
    const chunks: string[][] = [];
    for (let i = 0; i < missing.length; i += 60) chunks.push(missing.slice(i, i + 60));

    for (const chunk of chunks) {
      try {
        const res = await translateBatch({ data: { texts: chunk, targetLang: lang } });
        const arr = res.translations;
        chunk.forEach((src, i) => {
          cacheRef.current[src] = arr[i] ?? src;
          pendingRef.current.delete(src);
        });
        saveCache(lang, cacheRef.current);
        applyTranslations(cacheRef.current);
      } catch (e) {
        chunk.forEach((src) => pendingRef.current.delete(src));
        // eslint-disable-next-line no-console
        console.warn("[auto-translate] batch failed", e);
      }
    }
  }

  function applyTranslations(cache: Record<string, string>) {
    // Text nodes
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const parent = (n as Text).parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        if (parent.closest("[data-notranslate]")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n: Node | null;
    // eslint-disable-next-line no-cond-assign
    while ((n = walker.nextNode())) {
      const t = n as Text;
      const orig = originalText.get(t) ?? t.nodeValue ?? "";
      if (!originalText.has(t)) originalText.set(t, orig);
      const key = orig.trim();
      const translated = cache[key];
      if (!translated) continue;
      // Preserve surrounding whitespace
      const leading = orig.match(/^\s*/)?.[0] ?? "";
      const trailing = orig.match(/\s*$/)?.[0] ?? "";
      const next = `${leading}${translated}${trailing}`;
      if (t.nodeValue !== next) t.nodeValue = next;
    }

    // Attributes
    document.body.querySelectorAll("[placeholder], [aria-label], [title], [alt]").forEach((el) => {
      const map = originalAttr.get(el);
      if (!map) return;
      for (const a of ATTR_TARGETS) {
        const orig = map[a];
        if (!orig) continue;
        const translated = cache[orig.trim()];
        if (translated && el.getAttribute(a) !== translated) el.setAttribute(a, translated);
      }
    });
  }

  // Silent — no UI
  return null;
}
