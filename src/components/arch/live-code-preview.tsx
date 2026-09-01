import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Monitor, Tablet, Smartphone, RefreshCw, Play, Download, Trash2, ExternalLink, Maximize2, Minimize2 } from "lucide-react";

type Device = "desktop" | "tablet" | "mobile";
type Mode = "react" | "web";

const DEVICE_WIDTH: Record<Device, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px",
};

const STARTER_HTML = `<div class="card">
  <h1>Hello from Metrixcom</h1>
  <p>Edit the HTML, CSS or JS — the preview updates live.</p>
  <button id="go">Click me</button>
  <p id="out"></p>
</div>`;

const STARTER_CSS = `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  font-family: ui-sans-serif, system-ui, sans-serif;
  background: #0b0b0f;
  color: #f4f4f5;
}
.card {
  padding: 32px;
  border: 1px solid #27272a;
  border-radius: 20px;
  background: #131317;
  text-align: center;
  max-width: 420px;
}
button {
  margin-top: 12px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 0;
  background: #6366f1;
  color: white;
  cursor: pointer;
}`;

const STARTER_JS = `let n = 0;
document.getElementById("go").addEventListener("click", () => {
  n++;
  document.getElementById("out").textContent = "Clicked " + n + " time(s)";
  console.log("click", n);
});`;

const STARTER_TSX = `import { useState } from "react";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="text-xs uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans">
      <h1 className="text-3xl font-semibold tracking-tight">Metrixcom React Preview</h1>
      <p className="mt-2 text-zinc-400">Live JSX/TSX with hooks, Tailwind classes and components.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 max-w-md">
        <Stat label="Clicks" value={String(count)} />
        <Stat label="Status" value={count > 4 ? "Warm" : "Idle"} />
      </div>

      <button
        onClick={() => setCount((c) => c + 1)}
        className="mt-6 rounded-full bg-indigo-500 px-5 py-2 text-sm font-medium hover:bg-indigo-400 transition"
      >
        Increment
      </button>
    </main>
  );
}`;

const STARTER_TSX_CSS = `/* Optional extra CSS. Tailwind utility classes work out of the box. */`;

const STORAGE_KEY = "mx.code-preview.v2";

const CONSOLE_BRIDGE = `(function(){
  var send=function(level,args){try{parent.postMessage({__mxlog:true,level:level,text:Array.prototype.map.call(args,function(a){try{return typeof a==="string"?a:JSON.stringify(a)}catch(e){return String(a)}}).join(" ")},"*")}catch(e){}};
  ["log","warn","error","info"].forEach(function(k){var o=console[k].bind(console);console[k]=function(){send(k,arguments);o.apply(null,arguments)}});
  window.addEventListener("error",function(e){send("error",[e.message])});
  window.addEventListener("unhandledrejection",function(e){send("error",[String(e.reason)])});
})();`;

function buildWebDoc(html: string, css: string, js: string) {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>${css}</style></head><body>${html}
<script>
${CONSOLE_BRIDGE}
try{
${js}
}catch(e){console.error(e && e.message ? e.message : String(e));}
<\/script></body></html>`;
}

function buildReactDoc(tsx: string, css: string) {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<script src="https://cdn.tailwindcss.com"><\/script>
<script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin><\/script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin><\/script>
<script src="https://unpkg.com/@babel/standalone@7/babel.min.js"><\/script>
<style>html,body,#root{min-height:100%}body{margin:0;font-family:ui-sans-serif,system-ui,sans-serif}
${css}</style></head>
<body><div id="root"></div>
<script>
${CONSOLE_BRIDGE}
<\/script>
<script type="text/mx-source" data-mx="app">
${tsx}
<\/script>
<script>
(function(){
  // Strip ES module imports (React globals are provided) and mount the default export.
  var el = document.querySelector('script[data-mx="app"]');
  var src = el.textContent || "";
  src = src.replace(/^\\s*import\\s+[^;]*?;?\\s*$/gm, "");
  var m = src.match(/export\\s+default\\s+function\\s+([A-Za-z0-9_$]+)/);
  var name = m ? m[1] : null;
  src = src.replace(/export\\s+default\\s+/, name ? "" : "var __MXDefault = ");
  src = src.replace(/^\\s*export\\s+(?=(const|let|var|function|class)\\b)/gm, "");
  var hooks = "var {useState,useEffect,useMemo,useRef,useCallback,useReducer,useContext,createContext,Fragment,memo,Suspense,lazy} = React;";
  try {
    var out = Babel.transform(src, { presets: [["typescript",{allExtensions:true,isTSX:true}], "react"], filename: "App.tsx" }).code;
    var factory = new Function("React","ReactDOM", hooks + "\\n" + out + "\\nreturn typeof __MXDefault !== 'undefined' ? __MXDefault : (" + (name || "(typeof App!=='undefined'?App:null)") + ");");
    var Comp = factory(React, ReactDOM);
    if (!Comp) throw new Error("No component found. Export a default component (export default function App() { ... }).");
    ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(Comp));
  } catch (e) {
    console.error(e && e.message ? e.message : String(e));
    document.getElementById("root").innerHTML =
      '<pre style="white-space:pre-wrap;color:#f87171;background:#18181b;padding:16px;border-radius:12px;margin:16px;font:12px ui-monospace,monospace">' +
      String(e && e.message ? e.message : e).replace(/</g,"&lt;") + '</pre>';
  }
})();
<\/script>
</body></html>`;
}

export function LiveCodePreview({ onContext }: { onContext: (s: string) => void }) {
  const [mode, setMode] = useState<Mode>("react");
  const [html, setHtml] = useState(STARTER_HTML);
  const [css, setCss] = useState(STARTER_CSS);
  const [js, setJs] = useState(STARTER_JS);
  const [tsx, setTsx] = useState(STARTER_TSX);
  const [tsxCss, setTsxCss] = useState(STARTER_TSX_CSS);
  const [tab, setTab] = useState<"html" | "css" | "js">("html");
  const [rtab, setRtab] = useState<"tsx" | "css">("tsx");
  const [device, setDevice] = useState<Device>("desktop");
  const [auto, setAuto] = useState(true);
  const [doc, setDoc] = useState(() => buildReactDoc(STARTER_TSX, STARTER_TSX_CSS));
  const [logs, setLogs] = useState<{ level: string; text: string }[]>([]);
  const [nonce, setNonce] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const loaded = useRef(false);

  const currentDoc = () => (mode === "react" ? buildReactDoc(tsx, tsxCss) : buildWebDoc(html, css, js));

  // Restore any saved sketch (client only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<{ mode: Mode; html: string; css: string; js: string; tsx: string; tsxCss: string }>;
        if (s.mode === "react" || s.mode === "web") setMode(s.mode);
        if (typeof s.html === "string") setHtml(s.html);
        if (typeof s.css === "string") setCss(s.css);
        if (typeof s.js === "string") setJs(s.js);
        if (typeof s.tsx === "string") setTsx(s.tsx);
        if (typeof s.tsxCss === "string") setTsxCss(s.tsxCss);
      }
    } catch { /* ignore */ }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, html, css, js, tsx, tsxCss })); } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [mode, html, css, js, tsx, tsxCss]);

  // Debounced live rebuild.
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => {
      setLogs([]);
      setDoc(mode === "react" ? buildReactDoc(tsx, tsxCss) : buildWebDoc(html, css, js));
      setNonce((n) => n + 1);
    }, 600);
    return () => clearTimeout(t);
  }, [mode, html, css, js, tsx, tsxCss, auto]);

  // Console bridge from the sandboxed iframe.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { __mxlog?: boolean; level?: string; text?: string };
      if (!d || !d.__mxlog) return;
      setLogs((l) => [...l.slice(-49), { level: d.level ?? "log", text: d.text ?? "" }]);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const run = () => {
    setLogs([]);
    setDoc(currentDoc());
    setNonce((n) => n + 1);
  };

  const openInNewTab = () => {
    const blob = new Blob([currentDoc()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const download = () => {
    const blob = new Blob([currentDoc()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "metrixcom-preview.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const value = mode === "react"
    ? (rtab === "tsx" ? tsx : tsxCss)
    : tab === "html" ? html : tab === "css" ? css : js;
  const setValue = mode === "react"
    ? (rtab === "tsx" ? setTsx : setTsxCss)
    : tab === "html" ? setHtml : tab === "css" ? setCss : setJs;

  const ctx = useMemo(
    () =>
      (mode === "react"
        ? `Live React (TSX) preview sketch — React 18 + Tailwind, single default-exported component.\n\n\`\`\`tsx\n${tsx}\n\`\`\`\n\n\`\`\`css\n${tsxCss}\n\`\`\``
        : `Live code preview sketch.\n\n\`\`\`html\n${html}\n\`\`\`\n\n\`\`\`css\n${css}\n\`\`\`\n\n\`\`\`js\n${js}\n\`\`\``) +
      (logs.length ? `\n\nConsole output:\n${logs.map((l) => `[${l.level}] ${l.text}`).join("\n")}` : ""),
    [mode, html, css, js, tsx, tsxCss, logs],
  );
  useEffect(() => { onContext(ctx); }, [ctx, onContext]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Editor */}
      <section className="rounded-2xl border border-border bg-surface p-4 flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex gap-1 rounded-full border border-border p-1">
            {([["react", "React / TSX"], ["web", "HTML / CSS / JS"]] as const).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1 text-xs tracking-wide transition ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-[var(--primary)]" />
            Live
          </label>
        </div>

        <div className="flex gap-1 rounded-full border border-border p-1 w-fit mb-3">
          {mode === "react"
            ? (["tsx", "css"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRtab(t)}
                  className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide transition ${rtab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t}
                </button>
              ))
            : (["html", "css", "js"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide transition ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {t}
                </button>
              ))}
        </div>

        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          spellCheck={false}
          className="font-mono text-xs min-h-[340px] resize-y"
          placeholder={mode === "react" ? "Write your React component here…" : `Write ${tab.toUpperCase()} here…`}
        />

        {mode === "react" && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            React 18 + hooks + TypeScript + Tailwind are preloaded. Export one default component; imports are ignored.
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={run} className="gap-1.5"><Play className="h-3.5 w-3.5" /> Run</Button>
          <Button size="sm" variant="outline" onClick={() => setNonce((n) => n + 1)} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Reload</Button>
          <Button size="sm" variant="outline" onClick={download} className="gap-1.5"><Download className="h-3.5 w-3.5" /> Export HTML</Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { if (mode === "react") { setTsx(""); setTsxCss(""); } else { setHtml(""); setCss(""); setJs(""); } setLogs([]); }}
            className="gap-1.5 text-muted-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </Button>
        </div>
      </section>

      {/* Preview */}
      <section
        className={
          expanded
            ? "fixed inset-0 z-50 flex flex-col bg-surface p-4"
            : "rounded-2xl border border-border bg-surface p-4 flex flex-col"
        }
      >
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <h2 className="text-sm font-semibold">Live preview</h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-full border border-border p-1">
              {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([d, Icon]) => (
                <button
                  key={d}
                  type="button"
                  aria-label={d}
                  onClick={() => setDevice(d)}
                  className={`rounded-full p-1.5 transition ${device === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={openInNewTab} className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label={expanded ? "Exit full view" : "Full view"}
              onClick={() => setExpanded((v) => !v)}
              className="gap-1.5 text-muted-foreground"
            >
              {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              {expanded ? "Exit" : "Full view"}
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 rounded-xl border border-border/60 bg-background/40 p-3 flex justify-center overflow-auto">
          <iframe
            key={nonce}
            title="Live preview"
            srcDoc={doc}
            sandbox="allow-scripts allow-forms allow-modals allow-popups"
            className={`rounded-lg border border-border/60 bg-white transition-[width] ${expanded ? "h-full" : "h-[calc(100vh-22rem)] min-h-[420px]"}`}
            style={{ width: DEVICE_WIDTH[device], maxWidth: "100%" }}
          />
        </div>

        <div className="mt-3 shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Console</div>
          <div className="h-28 overflow-auto rounded-xl border border-border/60 bg-background/40 p-2 font-mono text-[11px] space-y-0.5">
            {logs.length === 0 ? (
              <div className="text-muted-foreground">No output yet.</div>
            ) : (
              logs.map((l, i) => (
                <div key={i} className={l.level === "error" ? "text-destructive" : l.level === "warn" ? "text-primary" : "text-muted-foreground"}>
                  <span className="opacity-60">[{l.level}]</span> {l.text}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

    </div>
  );
}
