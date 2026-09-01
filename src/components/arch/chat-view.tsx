import { useEffect, useRef, useState } from "react";
import { useApp, store, type Message } from "@/lib/app-store";
import { loadIntelligence, subscribeIntelligence, type IntelligencePrefs } from "@/lib/intelligence";
import { getAgent } from "@/lib/agents";
import { ArchLogo } from "./logo";
import {
  ChevronDown, ChevronUp, Globe, Loader2, Check, Telescope, Pencil, Copy,
  ThumbsUp, ThumbsDown, Share2, RefreshCw, Brain, X, Link2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { parseFileBlocks } from "@/lib/file-gen";
import { FileArtifacts } from "./file-artifacts";

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <div className="group relative my-3 overflow-hidden rounded-xl border border-border bg-[#0b0f17]">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 bg-surface/50">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          {language || "code"}
        </span>
        <button
          onClick={copy}
          className="rounded-md p-1 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
          aria-label="Copy code"
          title="Copy"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language || "text"}
          style={oneDark as any}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "12px 14px",
            background: "transparent",
            fontSize: "13px",
            lineHeight: 1.55,
          }}
          codeTagProps={{ style: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" } }}
        >
          {value.replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>

    </div>
  );
}

const markdownComponents = {
  code({ inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    const value = String(children ?? "");
    if (!inline && (match || value.includes("\n"))) {
      return <CodeBlock language={match?.[1] ?? ""} value={value} />;
    }
    return (
      <code
        className="rounded-md bg-surface-elevated px-1.5 py-0.5 text-[0.9em] font-mono text-primary"
        {...props}
      >
        {children}
      </code>
    );
  },
  img({ src, alt }: any) {
    if (!src) return null;
    return (
      <a href={src} target="_blank" rel="noreferrer" className="block my-3">
        <img
          src={src}
          alt={alt || "Generated image"}
          loading="lazy"
          className="w-full max-w-[520px] rounded-2xl border border-border bg-surface object-cover shadow-lg transition-opacity hover:opacity-95"
        />
      </a>
    );
  },
};


type MCQData = { question: string; options: string[]; correct: number; explanation?: string };

function InteractiveMCQ({ data }: { data: MCQData }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const letters = ["A", "B", "C", "D", "E", "F"];
  return (
    <div className="my-4 rounded-2xl border border-border bg-surface p-4">
      <div className="text-[14px] font-medium text-foreground mb-3">{data.question}</div>
      <div className="grid gap-2">
        {data.options.map((opt, i) => {
          const isCorrect = i === data.correct;
          const isPicked = i === picked;
          let cls = "border-border bg-surface-elevated/40 hover:bg-surface-elevated hover:border-border-strong";
          if (answered) {
            if (isCorrect) cls = "border-emerald-500/70 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]";
            else if (isPicked) cls = "border-red-500/70 bg-red-500/10 shadow-[0_0_0_1px_rgba(239,68,68,0.35)]";
            else cls = "border-border/60 bg-surface/40 opacity-60";
          }
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => setPicked(i)}
              className={`group flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-[13.5px] transition-all ${cls} ${answered ? "cursor-default" : "cursor-pointer"}`}
            >
              <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                answered && isCorrect ? "border-emerald-500/70 text-emerald-400" :
                answered && isPicked ? "border-red-500/70 text-red-400" :
                "border-border text-muted-foreground"
              }`}>{letters[i]}</span>
              <span className="flex-1">{opt}</span>
              {answered && isCorrect && <Check className="h-4 w-4 text-emerald-400" />}
              {answered && isPicked && !isCorrect && <X className="h-4 w-4 text-red-400" />}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`mt-3 rounded-lg border px-3 py-2 text-[12.5px] ${
          picked === data.correct
            ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-300"
            : "border-red-500/40 bg-red-500/5 text-red-300"
        }`}>
          <div className="font-medium mb-0.5">
            {picked === data.correct ? "Correct" : `Not quite — the answer is ${letters[data.correct]}`}
          </div>
          {data.explanation && <div className="text-foreground/80">{data.explanation}</div>}
        </div>
      )}
    </div>
  );
}

type QuizQuestion = {
  topic?: string;
  question: string;
  options: string[];
  correct: number;
  hint?: string;
  explanations?: string[];
};
type QuizData = { title?: string; questions: QuizQuestion[]; outro?: string };

function InteractiveQuiz({ data }: { data: QuizData }) {
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<(number | null)[]>(() => data.questions.map(() => null));
  const [hintOpen, setHintOpen] = useState(false);
  const letters = ["A", "B", "C", "D", "E", "F"];
  const total = data.questions.length;
  const q = data.questions[idx];
  const picked = picks[idx];
  const answered = picked !== null;

  function pick(i: number) {
    if (answered) return;
    const next = picks.slice();
    next[idx] = i;
    setPicks(next);
  }
  function go(delta: number) {
    const n = Math.max(0, Math.min(total - 1, idx + delta));
    setIdx(n);
    setHintOpen(false);
  }

  return (
    <div className="my-4 rounded-2xl border border-border bg-surface p-5">
      {data.title && (
        <div className="mb-4 text-[15px] font-semibold text-foreground leading-snug">{data.title}</div>
      )}
      {/* Progress bar */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-1.5">
          {data.questions.map((_, i) => {
            const p = picks[i];
            const done = p !== null;
            const ok = done && p === data.questions[i].correct;
            const active = i === idx;
            let color = "bg-border";
            if (done && ok) color = "bg-emerald-500";
            else if (done) color = "bg-primary";
            else if (active) color = "bg-primary/60";
            return (
              <div key={i} className="relative flex-1">
                <div className={`h-1 rounded-full transition-colors ${color}`} />
                {done && !ok && (
                  <X className="absolute -top-3 left-1/2 -translate-x-1/2 h-3 w-3 text-red-400" strokeWidth={3} />
                )}
                {done && ok && (
                  <Check className="absolute -top-3 left-1/2 -translate-x-1/2 h-3 w-3 text-emerald-400" strokeWidth={3} />
                )}
              </div>
            );
          })}
        </div>
        <div className="text-[12px] tabular-nums text-muted-foreground shrink-0">{idx + 1} / {total}</div>
      </div>

      {q.topic && (
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{q.topic}</div>
      )}
      <div className="mb-4 text-[14.5px] font-medium text-foreground leading-relaxed">
        <span className="text-muted-foreground mr-1.5">{idx + 1}.</span>{q.question}
      </div>

      <div className="grid gap-2">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correct;
          const isPicked = i === picked;
          let cls = "border-border bg-surface-elevated/40 hover:bg-surface-elevated hover:border-border-strong";
          if (answered) {
            if (isCorrect) cls = "border-emerald-500/60 bg-emerald-500/10";
            else if (isPicked) cls = "border-red-500/60 bg-red-500/10";
            else cls = "border-border/50 bg-surface/40 opacity-70";
          }
          const showExplanation = answered && (isCorrect || isPicked) && q.explanations?.[i];
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => pick(i)}
              className={`group block w-full rounded-xl border px-4 py-3 text-left transition-all ${cls} ${answered ? "cursor-default" : "cursor-pointer"}`}
            >
              <div className="flex items-start gap-2 text-[13.5px] font-medium text-foreground">
                <span className="shrink-0">{letters[i]}.</span>
                <span className="flex-1">{opt}</span>
              </div>
              {showExplanation && (
                <div className={`mt-1.5 pl-5 text-[12.5px] leading-relaxed ${isCorrect ? "text-emerald-200/90" : "text-red-200/90"}`}>
                  <span className="font-semibold">{isCorrect ? "Correct! " : "Incorrect. "}</span>
                  {q.explanations![i]}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {q.hint && (
        <div className="mt-4">
          <button
            onClick={() => setHintOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {hintOpen ? "Hide hint" : "Show hint"}
            {hintOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {hintOpen && (
            <div className="mt-2 text-[13px] leading-relaxed text-foreground/80">{q.hint}</div>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          onClick={() => go(-1)}
          disabled={idx === 0}
          className="rounded-lg px-4 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => go(1)}
          disabled={idx === total - 1}
          className="rounded-lg bg-primary px-5 py-2 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
        </button>
      </div>

      {idx === total - 1 && picks.every((p) => p !== null) && (
        <div className="mt-4 rounded-xl border border-border bg-surface-elevated/40 px-4 py-3 text-[13px]">
          <div className="font-semibold text-foreground">
            Score: {picks.filter((p, i) => p === data.questions[i].correct).length} / {total}
          </div>
          {data.outro && <div className="mt-1 text-foreground/70 leading-relaxed">{data.outro}</div>}
        </div>
      )}
    </div>
  );
}

type RenderPart =
  | { type: "md"; content: string }
  | { type: "mcq"; content: string; data: MCQData }
  | { type: "quiz"; content: string; data: QuizData };

function renderWithMCQ(text: string): RenderPart[] {
  const re = /```(mcq|quiz)\s*\n?([\s\S]*?)```/g;
  const parts: RenderPart[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "md", content: text.slice(last, m.index) });
    const kind = m[1];
    try {
      const data = JSON.parse(m[2].trim());
      if (kind === "mcq" && data && Array.isArray(data.options) && typeof data.correct === "number" && typeof data.question === "string") {
        parts.push({ type: "mcq", content: m[0], data: data as MCQData });
      } else if (kind === "quiz" && data && Array.isArray(data.questions) && data.questions.length > 0) {
        parts.push({ type: "quiz", content: m[0], data: data as QuizData });
      } else {
        parts.push({ type: "md", content: m[0] });
      }
    } catch {
      parts.push({ type: "md", content: m[0] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "md", content: text.slice(last) });
  return parts;
}






export function ChatView() {
  const activeId = useApp((s) => s.activeChatId);
  const chats = useApp((s) => s.chats);
  const agentId = useApp((s) => s.agent);
  const agent = getAgent(agentId);
  const chat = chats.find((c) => c.id === activeId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat?.messages.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(distance > 240);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [chat?.id]);

  function scrollToBottom() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }

  if (!chat || chat.messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <ArchLogo size={40} className="mb-6 [&>span]:text-[22px]" />
        <h1 className="text-[26px] font-semibold tracking-tight text-center">
          How can I help today?
        </h1>
        <p className="mt-2 text-[13.5px] text-muted-foreground text-center">
          {agent.name} · {agent.tagline}
        </p>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
          {[
            "Summarize a long research paper",
            "Draft a product launch email",
            "Explain a concept simply",
            "Plan a two-week roadmap",
          ].map((s) => (
            <button
              key={s}
              onClick={() => store.sendMessage(s)}
              className="text-left rounded-xl border border-border bg-surface hover:bg-surface-elevated hover:border-border-strong transition-colors px-4 py-3 text-[13px] text-foreground/90"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const pendingId = chat.pendingUserId;

  return (
    <div className="relative flex-1 min-h-0">
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto">
        <div className="arch-chat-container arch-msg-text mx-auto px-4 sm:px-6 py-8 space-y-5">
          {chat.messages.map((m) => {
            const aurora = m.role === "user" && m.mode && pendingId === m.id;
            return m.role === "user" ? (
              <UserMessage key={m.id} m={m} aurora={!!aurora} />
            ) : (
              <AssistantMessage key={m.id} m={m} />
            );
          })}
        </div>
      </div>
      <button
        onClick={scrollToBottom}
        aria-label="Scroll to latest message"
        title="Scroll to latest"
        className={`absolute left-1/2 -translate-x-1/2 bottom-4 z-10 grid place-items-center h-9 w-9 rounded-full border border-border bg-surface/90 backdrop-blur text-foreground shadow-lg hover:bg-surface-elevated hover:border-border-strong transition-all ${
          showScrollBtn ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}


function UserMessage({ m, aurora }: { m: Message; aurora: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.content);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && taRef.current) {
      const el = taRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 300) + "px";
    }
  }, [editing]);

  function copy() {
    navigator.clipboard.writeText(m.content).then(
      () => toast.success("Copied"),
      () => toast.error("Copy failed"),
    );
  }

  function submit() {
    const text = draft.trim();
    if (!text) return;
    setEditing(false);
    if (text === m.content) return;
    store.editAndResend(m.id, text);
  }

  if (editing) {
    return (
      <div className="flex justify-end">
        <div className="w-full max-w-[80%] rounded-3xl bg-secondary px-4 py-2.5">
          <textarea
            ref={taRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 300) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setDraft(m.content);
                setEditing(false);
              }
            }}
            rows={1}
            className="w-full resize-none bg-transparent text-[14.5px] leading-relaxed text-foreground focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-end gap-1.5">
            <button
              onClick={() => {
                setDraft(m.content);
                setEditing(false);
              }}
              className="rounded-lg px-3 py-1 text-[12.5px] text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!draft.trim()}
              className="rounded-lg bg-primary px-3 py-1 text-[12.5px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex justify-end">
      <div className="flex flex-col items-end max-w-[80%]">
        {aurora ? (
          <div className="arch-aurora">
            <div className="arch-aurora-inner px-4 py-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap text-foreground">
              {m.content}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-secondary text-foreground px-4 py-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap">
            {m.content}
          </div>
        )}
        <div className="mt-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => {
              setDraft(m.content);
              setEditing(true);
            }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
            aria-label="Edit message"
            title="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={copy}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
            aria-label="Copy message"
            title="Copy"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}


function useIntelligenceLive(): IntelligencePrefs {
  const [p, setP] = useState<IntelligencePrefs>(() => loadIntelligence());
  useEffect(() => subscribeIntelligence(setP), []);
  return p;
}

function ReasoningPanel({ m }: { m: Message }) {
  const streaming = m.pending && !m.reasoningDone;
  const prefs = useIntelligenceLive();
  const expandPref = prefs.thinking_expand ?? "auto";

  // Live tick for elapsed timer while streaming.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!streaming) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [streaming]);

  // Compute elapsed: prefer live start time while streaming, saved ms after.
  const startedAt = m.reasoningStartedAt;
  const elapsedMs = m.reasoningDone
    ? (m.reasoningMs ?? 0)
    : startedAt
      ? now - startedAt
      : 0;
  const elapsedLabel = formatElapsed(elapsedMs);
  const label = streaming
    ? (startedAt ? `Thinking… ${elapsedLabel}` : "Thinking…")
    : elapsedMs
      ? `Thought for ${elapsedLabel}`
      : "Thinking";

  // Preference-driven expand/collapse.
  const initialOpen =
    expandPref === "always" ? true :
    expandPref === "never" ? false :
    streaming; // auto
  const [open, setOpen] = useState(initialOpen);
  const [userToggled, setUserToggled] = useState(false);
  useEffect(() => {
    if (userToggled) return;
    if (expandPref === "always") setOpen(true);
    else if (expandPref === "never") setOpen(false);
    else setOpen(streaming); // auto: open while streaming, collapse when done
  }, [expandPref, streaming, userToggled]);

  return (
    <div className="mb-3 rounded-xl border border-border bg-surface/60 overflow-hidden">
      <button
        onClick={() => { setUserToggled(true); setOpen((o) => !o); }}
        className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-foreground/85 hover:bg-surface-elevated/60 transition-colors"
      >
        {streaming
          ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          : <Brain className="h-3.5 w-3.5 text-primary" />}
        <span className={`font-medium ${streaming ? "arch-shimmer" : ""}`}>{label}</span>
        <ChevronDown className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-border">
          <div className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-muted-foreground italic">
            {m.reasoning || (streaming ? "…" : "")}
          </div>
        </div>
      )}
    </div>
  );
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${Math.max(0, Math.round(ms / 100) * 100) / 1000}s`;
  const totalSec = ms / 1000;
  if (totalSec < 60) return `${totalSec.toFixed(1)}s`;
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec - m * 60);
  return `${m}m ${s}s`;
}

function AssistantMessage({ m }: { m: Message }) {
  const hasThinking = !!m.thinking && m.thinking.length > 0;
  const hasReasoning = typeof m.reasoning === "string" && (m.reasoning.length > 0 || (m.pending && !m.reasoningDone));
  const [open, setOpen] = useState(m.pending);

  useEffect(() => {
    if (!m.pending) setOpen(false);
  }, [m.pending]);

  return (
    <div className="flex justify-start">
      <div className="max-w-full w-full text-[14.5px] leading-relaxed text-foreground/95">
        {hasReasoning && !m.pending && <ReasoningPanel m={m} />}
        {hasThinking && (
          <div className="mb-3 rounded-xl border border-border bg-surface/60 overflow-hidden">
            <button
              onClick={() => setOpen((o) => !o)}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12.5px] text-foreground/85 hover:bg-surface-elevated/60 transition-colors"
            >
              {m.pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : m.mode === "deep" ? (
                <Telescope className="h-3.5 w-3.5 text-primary" />
              ) : m.mode === "web" ? (
                <Globe className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              )}
              <span className="font-medium">
                {m.pending
                  ? m.mode === "deep"
                    ? "Researching…"
                    : m.mode === "web"
                      ? "Searching the web…"
                      : (m.thinking!.find((s) => !s.done)?.label ?? "Working…")
                  : m.mode === "deep"
                    ? "Research steps"
                    : m.mode === "web"
                      ? "Web search steps"
                      : "Activity"}
              </span>
              <span className="text-muted-foreground">
                · {m.thinking!.filter((s) => s.done).length}/{m.thinking!.length}
              </span>
              <ChevronDown
                className={`ml-auto h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
            {open && (
              <ol className="px-3 pb-3 pt-1 space-y-1.5 border-t border-border">
                {m.thinking!.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px]">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                      {s.done ? (
                        <Check className="h-3 w-3 text-primary" />
                      ) : (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      )}
                    </span>
                    <span className={s.done ? "text-foreground/90" : "text-muted-foreground"}>
                      {s.label}
                      {s.detail && (
                        <span className="text-muted-foreground">
                          {" — "}
                          {s.url ? (
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                              className="underline underline-offset-2 hover:text-primary"
                            >
                              {s.detail}
                            </a>
                          ) : (
                            s.detail
                          )}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
        
        {m.content && (() => {
          const { cleaned, files } = parseFileBlocks(m.content);
          return (
            <>
              {cleaned && (
                <div className="arch-markdown max-w-full">
                  {renderWithMCQ(cleaned).map((p, i) =>
                    p.type === "mcq" ? (
                      <InteractiveMCQ key={i} data={p.data} />
                    ) : p.type === "quiz" ? (
                      <InteractiveQuiz key={i} data={p.data} />
                    ) : (
                      <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={markdownComponents}>{p.content}</ReactMarkdown>
                    )
                  )}
                </div>
              )}
              {files.length > 0 && <FileArtifacts files={files} />}
            </>
          );
        })()}
        {m.content && !m.pending && <AssistantActions m={m} />}

      </div>
    </div>
  );
}

function AssistantActions({ m }: { m: Message }) {
  const liked = m.feedback === "like";
  const disliked = m.feedback === "dislike";
  const [shareOpen, setShareOpen] = useState(false);

  function copy() {
    navigator.clipboard.writeText(m.content).then(
      () => toast.success("Copied"),
      () => toast.error("Copy failed"),
    );
  }

  function like() {
    store.setFeedback(m.id, "like");
    if (!liked) toast.success("Thanks — Metrixcom will learn from this");
  }

  function dislike() {
    store.setFeedback(m.id, "dislike");
    if (!disliked) toast("Noted — try again for a better answer");
  }

  function retry() {
    store.regenerate(m.id);
  }

  const btn =
    "flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors";

  return (
    <>
      <div className="mt-2 flex items-center gap-0.5 -ml-1">
        <button onClick={copy} className={btn} title="Copy" aria-label="Copy reply">
          <Copy className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={like}
          className={`${btn} ${liked ? "text-primary hover:text-primary" : ""}`}
          title="Good reply"
          aria-label="Like reply"
          aria-pressed={liked}
        >
          <ThumbsUp className={`h-3.5 w-3.5 ${liked ? "fill-primary/30" : ""}`} />
        </button>
        <button
          onClick={dislike}
          className={`${btn} ${disliked ? "text-destructive hover:text-destructive" : ""}`}
          title="Bad reply"
          aria-label="Dislike reply"
          aria-pressed={disliked}
        >
          <ThumbsDown className={`h-3.5 w-3.5 ${disliked ? "fill-destructive/30" : ""}`} />
        </button>
        <button onClick={() => setShareOpen(true)} className={btn} title="Share" aria-label="Share reply">
          <Share2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={retry} className={btn} title="Try again" aria-label="Regenerate reply">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
      {shareOpen && <ShareDialog m={m} onClose={() => setShareOpen(false)} />}
    </>
  );
}

function ShareDialog({ m, onClose }: { m: Message; onClose: () => void }) {
  const [title, setTitle] = useState(() => deriveTitle(m.content));
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const preview = m.content;

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const shareText = encodeURIComponent(`${title} — via Metrixcom`);
  const encodedUrl = encodeURIComponent(shareUrl);

  const targets = [
    { key: "link", label: "Copy link", onClick: copyLink, icon: copied ? Check : Link2 },
    { key: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${shareText}&url=${encodedUrl}`, icon: XIcon },
    { key: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, icon: LinkedInIcon },
    { key: "reddit", label: "Reddit", href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${shareText}`, icon: RedditIcon },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <h2 className="text-[15px] font-semibold text-foreground">Share reply</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[11.5px] uppercase tracking-wide text-muted-foreground font-medium mb-1.5">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-[13.5px] text-foreground focus:outline-none focus:border-border-strong"
            />
          </div>
          <div className="rounded-xl border border-border bg-surface-elevated/60 px-4 py-3 text-[13px] leading-relaxed text-foreground/85 max-h-72 overflow-y-auto whitespace-pre-wrap">
            {preview}
          </div>
          <div className="grid grid-cols-4 gap-2 pt-1">
            {targets.map((t) => {
              const Icon = t.icon;
              const body = (
                <>
                  <div className="grid place-items-center h-11 w-11 rounded-full border border-border bg-surface-elevated group-hover:border-border-strong group-hover:bg-surface transition-colors">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                  <span className="text-[11.5px] text-muted-foreground group-hover:text-foreground transition-colors">
                    {t.label}
                  </span>
                </>
              );
              return "href" in t ? (
                <a
                  key={t.key}
                  href={t.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex flex-col items-center gap-1.5"
                >
                  {body}
                </a>
              ) : (
                <button key={t.key} onClick={t.onClick} className="group flex flex-col items-center gap-1.5">
                  {body}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function deriveTitle(content: string): string {
  const first = content.split(/\n+/).find((l) => l.trim().length > 0) ?? "Metrixcom reply";
  const cleaned = first.replace(/^#+\s*/, "").replace(/[*_`]/g, "").trim();
  return cleaned.length > 60 ? cleaned.slice(0, 60).trimEnd() + "…" : cleaned;
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2H21.5l-7.5 8.573L23 22h-6.844l-5.36-6.79L4.6 22H1.34l8.03-9.18L1 2h7.02l4.85 6.19L18.244 2Zm-1.2 18h1.86L7.05 4H5.08L17.045 20Z" />
    </svg>
  );
}
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5.001 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.82-2.05 3.75-2.05 4 0 4.75 2.63 4.75 6.05V21h-4v-5.55c0-1.32-.03-3.02-1.84-3.02-1.84 0-2.12 1.44-2.12 2.93V21h-4V9Z" />
    </svg>
  );
}
function RedditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M22 12.14a2.14 2.14 0 0 0-3.62-1.54 10.5 10.5 0 0 0-5.7-1.8l.98-4.6 3.2.68a1.5 1.5 0 1 0 .16-.98l-3.57-.76a.5.5 0 0 0-.58.38l-1.1 5.28a10.5 10.5 0 0 0-5.79 1.8 2.14 2.14 0 1 0-2.36 3.49 4.2 4.2 0 0 0-.05.66c0 3.36 3.92 6.08 8.75 6.08s8.75-2.72 8.75-6.08c0-.22-.02-.44-.05-.66A2.14 2.14 0 0 0 22 12.14ZM7.5 13.75a1.25 1.25 0 1 1 2.5 0 1.25 1.25 0 0 1-2.5 0Zm8.9 3.66c-1.1 1.1-3.2 1.19-3.82 1.19s-2.72-.09-3.82-1.19a.42.42 0 0 1 .6-.6c.7.7 2.19.94 3.22.94s2.52-.24 3.22-.94a.42.42 0 0 1 .6.6ZM15.75 15a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
    </svg>
  );
}

const PROVIDER_LABEL: Record<string, string> = {
  groq: "Groq",
  gemini: "Google Gemini",
  openrouter: "OpenRouter",
};

const STAGE_META: Record<NonNullable<Message["stage"]>, { label: string; icon: typeof Brain }> = {
  direct:   { label: "Direct answer",   icon: Check },
  thinking: { label: "Reasoning trace", icon: Brain },
  web:      { label: "Web search",      icon: Globe },
  deep:     { label: "Deep research",   icon: Telescope },
};

function SourceBadge({ m }: { m: Message }) {
  const agent = getAgent(m.agent);
  const stage = m.stage ?? "direct";
  const meta = STAGE_META[stage];
  const StageIcon = meta.icon;
  const providerLabel = m.source
    ? PROVIDER_LABEL[m.source.provider] ?? m.source.provider
    : m.pending ? "Routing…" : "—";
  const modelLabel = m.source?.model;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px]">
      <span
        className="inline-flex items-center gap-1 rounded-md border border-border bg-surface/70 px-1.5 py-0.5 font-medium text-foreground/85"
        title={`Reply generated by ${agent.name}`}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "hsl(var(--primary))" }}
          aria-hidden
        />
        {agent.name}
      </span>
      <span
        className="inline-flex items-center gap-1 rounded-md border border-border bg-surface/70 px-1.5 py-0.5 text-muted-foreground"
        title={`Internal stage: ${meta.label}`}
      >
        <StageIcon className="h-3 w-3" />
        {meta.label}
      </span>
      <span
        className="inline-flex items-center gap-1 rounded-md border border-border bg-surface/70 px-1.5 py-0.5 text-muted-foreground"
        title={modelLabel ? `Model: ${modelLabel}` : "Provider selecting…"}
      >
        <span className="text-foreground/80">{providerLabel}</span>
        {modelLabel && <span className="text-muted-foreground/80">· {modelLabel}</span>}
      </span>
    </div>
  );
}
