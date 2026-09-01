import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Rocket,
  Bot,
  Sparkles,
  Shield,
  Keyboard,
  Wrench,
  Zap,
  FileText,
  Search,
  Brain,
  Lock,
  ChevronRight,
  Menu,
  X,
  Github,
  Twitter,
  ArrowUpRight,
} from "lucide-react";
import heroAsset from "@/assets/docs-hero-gargantua.jpg.asset.json";
const heroCosmos = heroAsset.url;

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Metrixcom — Documentation" },
      {
        name: "description",
        content:
          "The official Metrixcom documentation. Guides, references and tutorials for agents, effort tuning, web search, security and integrations.",
      },
      { property: "og:title", content: "Metrixcom — Documentation" },
      {
        property: "og:description",
        content:
          "Master Metrixcom — agents, effort tuning, web search, security and integrations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocsSite,
});

type Section = {
  id: string;
  icon: typeof BookOpen;
  title: string;
  eyebrow: string;
  intro: string;
  blocks: {
    h: string;
    p: string;
    code?: { lang: string; body: string };
    list?: string[];
  }[];
};

const SECTIONS: Section[] = [
  {
    id: "introduction",
    icon: Sparkles,
    title: "Introduction",
    eyebrow: "Overview",
    intro:
      "Metrixcom is a premium multi-agent workspace that pairs three specialised models — Pulse-1, Forge-1 and Cipher-1 — with a keyboard-first, privacy-first interface.",
    blocks: [
      {
        h: "What Metrixcom is",
        p: "Metrixcom is a desktop-first AI platform for thinkers, engineers and security professionals. It streams answers token-by-token, remembers what you tell it to, and cites live sources when you enable web search.",
      },
      {
        h: "How it's different",
        p: "Every agent has its own personality and strengths. Metrixcom Mode routes each prompt to the specialist most likely to nail it, so you never have to think about which brain to use.",
        list: [
          "Three specialised agents with automatic routing",
          "Reasoning transparency via Thinking mode",
          "AES-256-GCM client-side encryption on sensitive fields",
          "Files, PDFs, images, OCR and file generation",
          "Live web search with inline citations",
        ],
      },
    ],
  },
  {
    id: "quickstart",
    icon: Rocket,
    title: "Quickstart",
    eyebrow: "Get started in 60 seconds",
    intro:
      "Create an account, open a chat and start talking. Metrixcom handles model selection, memory and safety automatically.",
    blocks: [
      {
        h: "1. Sign in",
        p: "Use email, Google or Apple. Your workspace syncs across every device you sign into.",
      },
      {
        h: "2. Send your first message",
        p: "Type a prompt in the composer and press Enter. Watch the response stream in live.",
        code: {
          lang: "prompt",
          body: `> Explain how a Hall-effect thruster works, in plain English.`,
        },
      },
      {
        h: "3. Pick an agent (or don't)",
        p: "Choose an agent from the selector — or enable Metrixcom Mode in Integrations to let the router decide per prompt.",
      },
    ],
  },
  {
    id: "agents",
    icon: Bot,
    title: "Agents",
    eyebrow: "Three specialists, one workspace",
    intro:
      "Metrixcom ships with three purpose-built agents. Each has its own system prompt, temperature profile and preferred models.",
    blocks: [
      {
        h: "Pulse-1 — General & fast",
        p: "Your everyday brain. Best for chat, writing, summarisation, brainstorming and quick reasoning at low latency.",
      },
      {
        h: "Forge-1 — Coding & engineering",
        p: "Tuned for programming, debugging, architecture reviews and long technical answers with runnable code and diagrams.",
        code: {
          lang: "ts",
          body: `// Ask Forge-1 for a working implementation
"Write a debounced React hook in TypeScript with cleanup."`,
        },
      },
      {
        h: "Cipher-1 — Security & pentest",
        p: "Focused on ethical hacking, penetration testing, threat modelling and hardening. Educational and defensive by default.",
      },
    ],
  },
  {
    id: "effort",
    icon: Zap,
    title: "Effort Tuning",
    eyebrow: "Trade speed for depth",
    intro:
      "Effort levels control how long Metrixcom reasons before answering. Higher effort = more accurate, longer, more structured replies.",
    blocks: [
      {
        h: "The five levels",
        p: "Fast → Balanced → Deep → Expert → Maximum. Choose from the composer or set a default in Settings → Intelligence.",
        list: [
          "Fast — sub-second answers, chat-length",
          "Balanced — the daily driver",
          "Deep — structured, multi-paragraph answers",
          "Expert — long-form technical responses",
          "Maximum — full reasoning trace, research-grade",
        ],
      },
      {
        h: "Thinking mode",
        p: "Enable Thinking to reveal a live reasoning panel — you'll see how Metrixcom plans its answer, similar to Deepseek and Claude.",
      },
    ],
  },
  {
    id: "web-search",
    icon: Search,
    title: "Web Search & Deep Research",
    eyebrow: "Ground answers in live sources",
    intro:
      "Toggle Web on to search the live web. Deep Research runs a full multi-step research plan and produces a cited report.",
    blocks: [
      {
        h: "Web search",
        p: "Metrixcom fetches the top results in real time, extracts the relevant passages, and cites them inline in the reply.",
      },
      {
        h: "Deep research",
        p: "A multi-step planner that searches, reads, cross-references and synthesises. Best for market analysis, technical deep-dives and literature reviews.",
      },
    ],
  },
  {
    id: "files",
    icon: FileText,
    title: "Files & Multimodal",
    eyebrow: "PDF, DOCX, images and OCR",
    intro:
      "Drop any supported file into the composer. Extraction runs on-device where possible, so nothing sensitive leaves your machine unnecessarily.",
    blocks: [
      {
        h: "Supported formats",
        p: "PDF, DOCX, TXT, CSV, PNG, JPG and WebP. Metrixcom extracts text with pdf.js, mammoth and Tesseract, then reasons over the content.",
      },
      {
        h: "Vision",
        p: "Image prompts are routed to a vision-capable model automatically — no configuration required.",
      },
      {
        h: "File generation",
        p: "Ask Metrixcom to export answers as PDF, DOCX or CSV. Generation runs client-side for privacy.",
        code: {
          lang: "prompt",
          body: `> Turn this answer into a one-page PDF titled "Aerospace Primer".`,
        },
      },
    ],
  },
  {
    id: "memory",
    icon: Brain,
    title: "Memory",
    eyebrow: "Long-term context you control",
    intro:
      "Metrixcom remembers what you ask it to. Everything is stored per-user under row-level security and can be edited or wiped at any time.",
    blocks: [
      {
        h: "What Metrixcom remembers",
        p: "Preferences, recurring context and facts you explicitly ask it to remember. Nothing is inferred silently.",
      },
      {
        h: "Managing memory",
        p: "Open Settings → Memory to view, edit or delete every stored entry. Purge everything with one click.",
      },
    ],
  },
  {
    id: "security",
    icon: Shield,
    title: "Security & Privacy",
    eyebrow: "Zero-knowledge posture by default",
    intro:
      "Security isn't a setting — it's the default. Metrixcom ships with client-side encryption, MFA, session controls and chat auto-purge.",
    blocks: [
      {
        h: "Encryption",
        p: "Sensitive fields are encrypted client-side with AES-256-GCM before ever leaving your device.",
      },
      {
        h: "Two-factor auth",
        p: "Enable TOTP in Settings → Security. Admin accounts require MFA and re-verify every 30 minutes.",
      },
      {
        h: "Data lifecycle",
        p: "Chats auto-purge after 7 days by default. Delete individual chats, files and memories at any time.",
      },
    ],
  },
  {
    id: "integrations",
    icon: Wrench,
    title: "Integrations",
    eyebrow: "Connect the tools you already use",
    intro:
      "Metrixcom plugs into the platforms your work already lives in — no context-switching required.",
    blocks: [
      {
        h: "Available integrations",
        p: "Google Drive, GitHub, Notion, Slack, Discord, Gmail and Calendar are available in Settings → Integrations.",
      },
      {
        h: "Metrixcom Mode",
        p: "A smart router that picks the best agent per prompt based on keywords and intent. Toggle from the composer or Settings.",
      },
    ],
  },
  {
    id: "shortcuts",
    icon: Keyboard,
    title: "Keyboard Shortcuts",
    eyebrow: "Fly through the workspace",
    intro: "Metrixcom is built keyboard-first. Learn these and never touch the mouse again.",
    blocks: [
      {
        h: "Essentials",
        p: "The shortcuts you'll use every day.",
        list: [
          "Enter — Send message",
          "Shift + Enter — New line",
          "Cmd/Ctrl + K — Command palette",
          "Cmd/Ctrl + / — Toggle sidebar",
          "Esc — Close overlays",
        ],
      },
    ],
  },
  {
    id: "account",
    icon: Lock,
    title: "Account & Billing",
    eyebrow: "Plans, promos and sessions",
    intro:
      "Manage your subscription, redeem promo codes and audit active sessions from Settings.",
    blocks: [
      {
        h: "Plans",
        p: "Upgrade from the Premium page. Promo codes are validated against expiry and per-user usage.",
      },
      {
        h: "Sessions",
        p: "Review active sessions and sign out remote devices from Settings → Sessions.",
      },
    ],
  },
];

function DocsSite() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const [mobileNav, setMobileNav] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return SECTIONS;
    return SECTIONS.filter(
      (sec) =>
        sec.title.toLowerCase().includes(s) ||
        sec.intro.toLowerCase().includes(s) ||
        sec.blocks.some(
          (b) =>
            b.h.toLowerCase().includes(s) ||
            b.p.toLowerCase().includes(s) ||
            (b.list ?? []).some((l) => l.toLowerCase().includes(s)),
        ),
    );
  }, [q]);

  // Scroll-spy for the sidebar
  useEffect(() => {
    const handler = () => {
      let current = SECTIONS[0].id;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - 120 <= 0) current = s.id;
      }
      setActive(current);
    };
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 h-14 flex items-center gap-4">
          <button
            className="md:hidden -ml-1 p-2 rounded-md hover:bg-surface"
            onClick={() => setMobileNav((v) => !v)}
            aria-label="Toggle navigation"
          >
            {mobileNav ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <a href="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-foreground text-background grid place-items-center text-[10px] font-bold tracking-tight">
              A
            </div>
            <span className="text-[14px] font-semibold tracking-tight">Metrixcom</span>
            <span className="text-[11px] text-muted-foreground border border-border rounded px-1.5 py-0.5 ml-1">
              Docs
            </span>
          </a>
          <div className="flex-1" />
          <div className="hidden md:flex items-center relative w-72">
            <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search the docs…"
              className="w-full h-8 pl-8 pr-3 text-[12.5px] rounded-md bg-surface border border-border focus:outline-none focus:border-border-strong"
            />
          </div>
          <a
            href="/"
            className="hidden sm:inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            Open app <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 py-8">
        {/* Sidebar */}
        <aside
          className={`${mobileNav ? "block" : "hidden"} md:block md:sticky md:top-20 md:self-start`}
        >
          <nav className="text-[13px]">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground px-2 mb-2">
              Documentation
            </div>
            <ul className="space-y-0.5">
              {SECTIONS.map((s) => {
                const isActive = active === s.id;
                return (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      onClick={() => setMobileNav(false)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                        isActive
                          ? "bg-surface text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface/60"
                      }`}
                    >
                      <s.icon className="h-3.5 w-3.5" />
                      <span>{s.title}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 border-t border-border pt-4 px-2 space-y-2 text-[12.5px] text-muted-foreground">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener"
                className="flex items-center gap-2 hover:text-foreground"
              >
                <Github className="h-3.5 w-3.5" /> GitHub
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener"
                className="flex items-center gap-2 hover:text-foreground"
              >
                <Twitter className="h-3.5 w-3.5" /> Follow
              </a>
            </div>
          </nav>
        </aside>

        {/* Main */}
        <main className="min-w-0">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-2xl border border-border bg-background p-8 sm:p-12 min-h-[420px]">
            <img
              src={heroCosmos}
              alt=""
              aria-hidden
              width={1920}
              height={1024}
              className="absolute inset-0 h-full w-full object-cover object-right opacity-70"
            />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-background via-background/85 to-background/30" />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            <div className="absolute inset-0 pointer-events-none opacity-[0.15] [background:radial-gradient(600px_200px_at_20%_0%,white,transparent)]" />
            <div className="relative">

              <div className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground border border-border rounded-full px-2.5 py-1 bg-background/60">
                <Sparkles className="h-3 w-3" /> Metrixcom — official documentation
              </div>
              <h1 className="mt-4 text-[32px] sm:text-[44px] leading-[1.05] font-semibold tracking-tight">
                Master Metrixcom AI.
                <br />
                <span className="text-muted-foreground">One workspace. Unlimited possibilities.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-[14px] sm:text-[15px] text-muted-foreground leading-relaxed">
                Everything you need to build with Pulse-1, Forge-1 and Cipher-1 — from
                your first prompt to reasoning traces, live web search, file generation
                and enterprise-grade security.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <a
                  href="#quickstart"
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-foreground text-background text-[13px] font-medium hover:opacity-90"
                >
                  Get started <ChevronRight className="h-3.5 w-3.5" />
                </a>
                <a
                  href="#agents"
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border bg-surface text-[13px] hover:bg-surface-elevated"
                >
                  Meet the agents
                </a>
              </div>
            </div>
          </section>

          {/* Section grid */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SECTIONS.slice(0, 6).map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="group rounded-xl border border-border bg-surface hover:bg-surface-elevated hover:border-border-strong transition-colors p-5"
              >
                <div className="flex items-center gap-2 text-[11.5px] uppercase tracking-wider text-muted-foreground">
                  <s.icon className="h-3.5 w-3.5" /> {s.eyebrow}
                </div>
                <div className="mt-2 text-[15px] font-medium">{s.title}</div>
                <div className="text-[12.5px] text-muted-foreground mt-1 line-clamp-2">
                  {s.intro}
                </div>
                <div className="mt-3 inline-flex items-center gap-1 text-[12px] text-muted-foreground group-hover:text-foreground">
                  Read <ChevronRight className="h-3 w-3" />
                </div>
              </a>
            ))}
          </div>

          {/* Long-form sections */}
          <div className="mt-10 space-y-14">
            {filtered.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                <div className="flex items-center gap-2 text-[11.5px] uppercase tracking-wider text-muted-foreground">
                  <s.icon className="h-3.5 w-3.5" />
                  {s.eyebrow}
                </div>
                <h2 className="mt-2 text-[26px] sm:text-[30px] font-semibold tracking-tight">
                  {s.title}
                </h2>
                <p className="mt-2 max-w-3xl text-[14px] text-muted-foreground leading-relaxed">
                  {s.intro}
                </p>
                <div className="mt-6 space-y-6">
                  {s.blocks.map((b, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border bg-surface p-5 sm:p-6"
                    >
                      <div className="text-[14px] font-medium">{b.h}</div>
                      <p className="mt-1.5 text-[13.5px] text-muted-foreground leading-relaxed">
                        {b.p}
                      </p>
                      {b.list && (
                        <ul className="mt-3 space-y-1.5">
                          {b.list.map((l) => (
                            <li
                              key={l}
                              className="flex items-start gap-2 text-[13px] text-muted-foreground"
                            >
                              <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/70" />
                              <span>{l}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {b.code && (
                        <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-background/70 p-4 text-[12.5px] font-mono leading-relaxed">
                          <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground mb-2">
                            {b.code.lang}
                          </div>
                          <code>{b.code.body}</code>
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {filtered.length === 0 && (
              <div className="rounded-xl border border-border bg-surface p-8 text-center text-[13px] text-muted-foreground">
                No results for "{q}".
              </div>
            )}
          </div>

          {/* CTA footer */}
          <section className="mt-16 rounded-2xl border border-border bg-surface p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-[16px] font-medium">Ready to try Metrixcom?</div>
              <div className="text-[13px] text-muted-foreground mt-1">
                Open the app and send your first prompt — it takes under a minute.
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href="/"
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-foreground text-background text-[13px] font-medium hover:opacity-90"
              >
                Launch Metrixcom <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <a
                href="/help"
                className="inline-flex items-center h-9 px-4 rounded-lg border border-border bg-background text-[13px] hover:bg-surface-elevated"
              >
                Contact support
              </a>
            </div>
          </section>

          <footer className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-[12px] text-muted-foreground">
            <div>© {new Date().getFullYear()} Metrixcom. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <a href="/" className="hover:text-foreground">Home</a>
              <a href="/help" className="hover:text-foreground">Help</a>
              <a href="/premium" className="hover:text-foreground">Premium</a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
