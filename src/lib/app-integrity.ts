// App integrity verification — runs once on client boot.
// Detects common tamper vectors: injected content-script overrides of
// critical globals, DOM-level script injection into <head>, and iframe
// clickjacking attempts that slipped past X-Frame-Options.
// Non-blocking: logs a security event and warns the user; never crashes the app.

const CRITICAL_GLOBALS = ["fetch", "XMLHttpRequest", "WebSocket", "crypto"] as const;

type IntegrityIssue = { kind: string; detail: string };

function detectTampering(): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  // 1. Framed / clickjacking attempt.
  try {
    if (window.top !== window.self) {
      const host = window.location.hostname;
      // Lovable preview legitimately frames the app; allow it.
      const isPreview =
        host.startsWith("id-preview--") ||
        host.startsWith("preview--") ||
        host.endsWith(".lovableproject.com") ||
        host.endsWith(".lovableproject-dev.com") ||
        host.endsWith(".beta.lovable.dev") ||
        host === "localhost";
      if (!isPreview) issues.push({ kind: "framed", detail: "App loaded inside a foreign iframe" });
    }
  } catch {
    issues.push({ kind: "framed", detail: "Cross-origin frame ancestor blocked access" });
  }

  // 2. Critical globals must be native functions, not extension shims.
  for (const name of CRITICAL_GLOBALS) {
    const g = (window as unknown as Record<string, unknown>)[name];
    if (g == null) {
      issues.push({ kind: "missing_global", detail: name });
      continue;
    }
    if (typeof g === "function") {
      const src = Function.prototype.toString.call(g);
      // Native functions serialize as `function X() { [native code] }`.
      if (!/\[native code\]/.test(src)) {
        issues.push({ kind: "patched_global", detail: name });
      }
    }
  }

  // 3. Foreign <script> tags injected after boot (extensions, MITM).
  try {
    const scripts = Array.from(document.querySelectorAll("script[src]")) as HTMLScriptElement[];
    for (const s of scripts) {
      const src = s.getAttribute("src") ?? "";
      if (!src) continue;
      if (src.startsWith("/") || src.startsWith("./")) continue;
      try {
        const u = new URL(src, window.location.href);
        if (u.origin !== window.location.origin) {
          issues.push({ kind: "foreign_script", detail: u.origin });
        }
      } catch {
        issues.push({ kind: "foreign_script", detail: src.slice(0, 80) });
      }
    }
  } catch { /* ignore */ }

  return issues;
}

let ran = false;
export function verifyAppIntegrity(onIssue?: (issues: IntegrityIssue[]) => void) {
  if (ran || typeof window === "undefined") return;
  ran = true;
  // Defer past hydration so we don't false-flag React's own script tags.
  setTimeout(() => {
    const issues = detectTampering();
    if (issues.length === 0) return;
    try {
      // Fire-and-forget log to activity_log via authenticated proxy if signed in.
      import("@/integrations/supabase/client").then(({ supabase }) => {
        supabase.auth.getUser().then(({ data }) => {
          if (!data.user) return;
          supabase.from("activity_log").insert({
            user_id: data.user.id,
            type: "integrity_alert",
            category: "security",
            message: `App integrity check failed: ${issues.map((i) => i.kind).join(", ")}`,
            meta: { issues, user_agent: navigator.userAgent },
            status: "open",
          }).then(undefined, () => {});
        });
      });
    } catch { /* ignore */ }
    onIssue?.(issues);
  }, 1500);
}
