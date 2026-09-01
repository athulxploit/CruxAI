import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { PageShell } from "@/components/arch/page-shell";
import { WORKSPACES, WORKSPACE_PROMPT, WORKSPACE_DISCLAIMER, type WorkspaceId } from "@/lib/workspaces";
import { ArrowLeft, MessageSquare, ShieldAlert } from "lucide-react";
import { WORKSPACE_ICONS } from "@/lib/workspace-icons";
import { Button } from "@/components/ui/button";
import { store } from "@/lib/app-store";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LiveCodePreview } from "@/components/arch/live-code-preview";

const IDS: WorkspaceId[] = WORKSPACES.map((w) => w.id);

export const Route = createFileRoute("/workspaces/$tool")({
  beforeLoad: ({ params }) => {
    if (!IDS.includes(params.tool as WorkspaceId)) throw notFound();
  },
  head: ({ params }) => {
    const w = WORKSPACES.find((x) => x.id === params.tool);
    return { meta: [{ title: `${w?.title ?? "Workspace"} — Metrixcom` }, { name: "description", content: w?.blurb ?? "" }] };
  },
  component: WorkspaceDetail,
});

function WorkspaceDetail() {
  const { tool } = Route.useParams();
  const w = WORKSPACES.find((x) => x.id === tool)!;
  const navigate = useNavigate();
  const [context, setContext] = useState("");

  const askMetrixcom = () => {
    const prompt = WORKSPACE_PROMPT[w.id](context || `Workspace: ${w.title}. (No specific context provided yet — please provide starter guidance for this workflow.)`);
    const id = store.newChat();
    store.openChat(id);
    void store.sendMessage(prompt);
    toast.success("Handoff sent to Metrixcom");
    navigate({ to: "/" });
  };

  return (
    <PageShell title={w.title} description={w.tag}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10">
        <Link to="/workspaces" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> All workspaces
        </Link>

        <header className="mb-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface shadow-sm shrink-0">
              {(() => {
                const Icon = WORKSPACE_ICONS[w.id];
                return <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} />;
              })()}
            </div>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest text-primary/80 mb-1">{w.tag}</div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{w.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{w.blurb}</p>
            </div>
          </div>
        </header>

        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-border bg-surface p-3">
          <ShieldAlert className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">{WORKSPACE_DISCLAIMER}</p>
        </div>

        <ToolBody id={w.id} onContext={setContext} />

        <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
          <h3 className="text-sm font-semibold mb-2">Escalate to Metrixcom</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Add optional context, then hand off to the AI for deeper review, missing trades, and next steps.
          </p>
          <Textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Add mission notes, constraints, or paste your computed values…"
            className="min-h-[90px] mb-3"
          />
          <Button onClick={askMetrixcom} className="gap-2">
            <MessageSquare className="h-4 w-4" /> Ask Metrixcom
          </Button>
        </div>
      </div>
    </PageShell>
  );
}

/* ---------- Tool bodies ---------- */

function ToolBody({ id, onContext }: { id: WorkspaceId; onContext: (s: string) => void }) {
  switch (id) {
    case "code-preview": return <LiveCodePreview onContext={onContext} />;
    case "code-review": return <CodeReviewTool onContext={onContext} />;
    case "refactor-lab": return <RefactorLabTool onContext={onContext} />;
    case "system-design": return <SystemDesignTool onContext={onContext} />;
    case "regex-lab": return <RegexLabTool onContext={onContext} />;
    case "api-designer": return <ApiDesignerTool onContext={onContext} />;
    case "algo-analyzer": return <AlgoAnalyzerTool onContext={onContext} />;
    case "json-lab": return <JsonLabTool onContext={onContext} />;
    case "diff-viewer": return <DiffViewerTool onContext={onContext} />;
    case "cron-lab": return <CronLabTool onContext={onContext} />;
    case "uuid-lab": return <UuidLabTool onContext={onContext} />;
    case "recon-planner": return <ReconPlannerTool onContext={onContext} />;
    case "threat-model": return <ThreatModelTool onContext={onContext} />;
    case "owasp-audit": return <OwaspAuditTool onContext={onContext} />;
    case "password-analyzer": return <PasswordAnalyzerTool onContext={onContext} />;
    case "hash-lab": return <HashLabTool onContext={onContext} />;
    case "cvss-calculator": return <CvssCalculatorTool onContext={onContext} />;
    case "jwt-inspector": return <JwtInspectorTool onContext={onContext} />;
    case "password-generator": return <PasswordGeneratorTool onContext={onContext} />;
    case "subnet-calc": return <SubnetCalcTool onContext={onContext} />;
    case "cipher-lab": return <CipherLabTool onContext={onContext} />;
  }
}


/* --- shared UI --- */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold mb-4">{title}</h2>
      {children}
    </section>
  );
}
function Field({ label, unit, children }: { label: string; unit?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}{unit ? <span className="ml-1 opacity-60">({unit})</span> : null}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}{unit ? <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span> : null}</div>
    </div>
  );
}
const numFmt = (n: number, d = 2) => Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : "—";

/* --- Δv --- */
function CodeReviewTool({ onContext }: { onContext: (s: string) => void }) {
  const [lang, setLang] = useState("TypeScript");
  const [focus, setFocus] = useState<string[]>(["Correctness", "Security"]);
  const [code, setCode] = useState("");
  const toggle = (f: string) =>
    setFocus((xs) => (xs.includes(f) ? xs.filter((x) => x !== f) : [...xs, f]));
  const lines = code.trim() ? code.split("\n").length : 0;
  useMemo(() => onContext(`Code review request — language: ${lang}. Focus: ${focus.join(", ") || "general"}. ${lines} lines.\n\n\`\`\`${lang.toLowerCase()}\n${code || "// (paste your code)"}\n\`\`\``), [lang, focus, code, lines, onContext]);
  const FOCI = ["Correctness", "Performance", "Security", "Readability", "Testing", "Architecture"];
  return (
    <div className="grid gap-4">
      <Card title="What are we reviewing?">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Language">
            <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={lang} onChange={(e) => setLang(e.target.value)}>
              {["TypeScript", "JavaScript", "Python", "Go", "Rust", "Java", "C#", "C++", "Kotlin", "Swift", "Ruby", "PHP", "SQL"].map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Review focus (multi-select)">
            <div className="flex flex-wrap gap-2">
              {FOCI.map((f) => (
                <button type="button" key={f} onClick={() => toggle(f)} className={`rounded-full border px-3 py-1 text-xs ${focus.includes(f) ? "bg-primary text-primary-foreground border-primary" : "border-border bg-surface hover:border-primary/50"}`}>{f}</button>
              ))}
            </div>
          </Field>
        </div>
      </Card>
      <Card title="Paste code">
        <Textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="// paste code here" className="font-mono text-xs min-h-[240px]" />
        <div className="mt-2 grid grid-cols-3 gap-3">
          <Metric label="Lines" value={String(lines)} />
          <Metric label="Chars" value={String(code.length)} />
          <Metric label="Focus" value={String(focus.length || 1)} />
        </div>
      </Card>
    </div>
  );
}

/* --- Refactor Lab --- */
function RefactorLabTool({ onContext }: { onContext: (s: string) => void }) {
  const [lang, setLang] = useState("TypeScript");
  const [goal, setGoal] = useState<"Readability" | "Performance" | "Testability" | "Functional style" | "Type safety" | "Concurrency">("Readability");
  const [constraints, setConstraints] = useState("Preserve public API. Node 20. No new deps.");
  const [code, setCode] = useState("");
  useMemo(() => onContext(`Refactor request — language: ${lang}. Goal: ${goal}. Constraints: ${constraints}\n\n\`\`\`${lang.toLowerCase()}\n${code || "// (paste your code)"}\n\`\`\``), [lang, goal, constraints, code, onContext]);
  return (
    <div className="grid gap-4">
      <Card title="Goal">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Language">
            <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={lang} onChange={(e) => setLang(e.target.value)}>
              {["TypeScript", "JavaScript", "Python", "Go", "Rust", "Java", "C#", "Kotlin"].map((l) => <option key={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Refactor towards">
            <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={goal} onChange={(e) => setGoal(e.target.value as typeof goal)}>
              {["Readability", "Performance", "Testability", "Functional style", "Type safety", "Concurrency"].map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Constraints"><Input value={constraints} onChange={(e) => setConstraints(e.target.value)} /></Field>
        </div>
      </Card>
      <Card title="Original code">
        <Textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="// paste code to refactor" className="font-mono text-xs min-h-[240px]" />
      </Card>
    </div>
  );
}

/* --- System Design --- */
function SystemDesignTool({ onContext }: { onContext: (s: string) => void }) {
  const [dau, setDau] = useState(1_000_000);
  const [actionsPerUser, setActionsPerUser] = useState(20);
  const [avgPayloadKB, setAvgPayloadKB] = useState(4);
  const [peakFactor, setPeakFactor] = useState(5);
  const [replication, setReplication] = useState(3);
  const [retentionDays, setRetentionDays] = useState(365);
  const [readWriteRatio, setReadWriteRatio] = useState(10); // reads per write

  const totalActionsDay = dau * actionsPerUser;
  const avgRps = totalActionsDay / 86400;
  const peakRps = avgRps * peakFactor;
  const writeRps = avgRps / (1 + readWriteRatio);
  const readRps = avgRps - writeRps;
  const dailyBytes = totalActionsDay * avgPayloadKB * 1024;
  const dailyGB = dailyBytes / 1e9;
  const yearTB = (dailyGB * 365) / 1000;
  const storedTB = yearTB * (retentionDays / 365) * replication;
  const avgBW_Mbps = (avgRps * avgPayloadKB * 8) / 1000; // Mbps
  const peakBW_Mbps = avgBW_Mbps * peakFactor;

  useMemo(() => onContext(
    `System sizing:\n- DAU: ${dau.toLocaleString()}\n- Actions/user/day: ${actionsPerUser}\n- Avg payload: ${avgPayloadKB} KB\n- Read:Write = ${readWriteRatio}:1\n- Peak factor: ${peakFactor}×\n- Retention: ${retentionDays} days, replication ${replication}×\n\nDerived:\n- Total actions/day: ${totalActionsDay.toLocaleString()}\n- Avg RPS: ${numFmt(avgRps, 0)} (reads ${numFmt(readRps, 0)}, writes ${numFmt(writeRps, 0)})\n- Peak RPS: ${numFmt(peakRps, 0)}\n- Daily data: ${numFmt(dailyGB, 1)} GB\n- Stored (retention × repl): ${numFmt(storedTB, 1)} TB\n- Bandwidth avg/peak: ${numFmt(avgBW_Mbps, 1)} / ${numFmt(peakBW_Mbps, 1)} Mbps`
  ), [dau, actionsPerUser, avgPayloadKB, peakFactor, replication, retentionDays, readWriteRatio, totalActionsDay, avgRps, readRps, writeRps, peakRps, dailyGB, storedTB, avgBW_Mbps, peakBW_Mbps, onContext]);

  return (
    <div className="grid gap-4">
      <Card title="Traffic assumptions">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Daily active users"><Input type="number" value={dau} onChange={(e) => setDau(+e.target.value)} /></Field>
          <Field label="Actions per user / day"><Input type="number" value={actionsPerUser} onChange={(e) => setActionsPerUser(+e.target.value)} /></Field>
          <Field label="Avg payload" unit="KB"><Input type="number" value={avgPayloadKB} onChange={(e) => setAvgPayloadKB(+e.target.value)} /></Field>
          <Field label="Peak / avg factor"><Input type="number" value={peakFactor} onChange={(e) => setPeakFactor(+e.target.value)} /></Field>
          <Field label="Read : write"><Input type="number" value={readWriteRatio} onChange={(e) => setReadWriteRatio(+e.target.value)} /></Field>
          <Field label="Retention" unit="days"><Input type="number" value={retentionDays} onChange={(e) => setRetentionDays(+e.target.value)} /></Field>
          <Field label="Replication factor"><Input type="number" value={replication} onChange={(e) => setReplication(+e.target.value)} /></Field>
        </div>
      </Card>
      <Card title="Capacity estimate">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric label="Avg RPS" value={numFmt(avgRps, 0)} />
          <Metric label="Peak RPS" value={numFmt(peakRps, 0)} />
          <Metric label="Read RPS" value={numFmt(readRps, 0)} />
          <Metric label="Write RPS" value={numFmt(writeRps, 0)} />
          <Metric label="Daily data" value={numFmt(dailyGB, 1)} unit="GB" />
          <Metric label="Stored total" value={numFmt(storedTB, 2)} unit="TB" />
          <Metric label="Avg bandwidth" value={numFmt(avgBW_Mbps, 1)} unit="Mbps" />
          <Metric label="Peak bandwidth" value={numFmt(peakBW_Mbps, 1)} unit="Mbps" />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Rule of thumb: one modern app node handles ~1–5k RPS mixed load; one Postgres primary comfortably 5–20k reads/s and 1–5k writes/s. Above that, shard, cache, or offload to a queue.</p>
      </Card>
    </div>
  );
}

/* --- Regex Lab --- */
function RegexLabTool({ onContext }: { onContext: (s: string) => void }) {
  const [pattern, setPattern] = useState("\\b([A-Z]{2,})-(\\d{2,6})\\b");
  const [flags, setFlags] = useState("g");
  const [text, setText] = useState("Tickets: ARCH-1234, METRIX-42, and old code UNK-9. Ignore lowercase abc-99.");
  const { error, matches } = useMemo(() => {
    try {
      const re = new RegExp(pattern, flags.includes("g") ? flags : flags + "g");
      const out: { match: string; groups: string[]; index: number }[] = [];
      let m: RegExpExecArray | null;
      let guard = 0;
      while ((m = re.exec(text)) !== null && guard++ < 500) {
        out.push({ match: m[0], groups: m.slice(1) as string[], index: m.index });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
      return { error: null as string | null, matches: out };
    } catch (e) {
      return { error: (e as Error).message, matches: [] };
    }
  }, [pattern, flags, text]);
  useMemo(() => onContext(`Regex: /${pattern}/${flags}\nSample text (${text.length} chars): ${text.slice(0, 200)}${text.length > 200 ? "…" : ""}\nMatches: ${matches.length}${error ? ` ERROR: ${error}` : ""}`), [pattern, flags, text, matches.length, error, onContext]);
  return (
    <div className="grid gap-4">
      <Card title="Pattern">
        <div className="grid gap-3 md:grid-cols-[1fr_140px]">
          <Field label="Regex">
            <Input value={pattern} onChange={(e) => setPattern(e.target.value)} className="font-mono" />
          </Field>
          <Field label="Flags (gimsuy)">
            <Input value={flags} onChange={(e) => setFlags(e.target.value.replace(/[^gimsuy]/g, ""))} className="font-mono" />
          </Field>
        </div>
        {error ? <p className="mt-2 text-xs text-destructive">Invalid regex: {error}</p> : null}
      </Card>
      <Card title="Test text">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs min-h-[140px]" />
      </Card>
      <Card title={`Matches (${matches.length})`}>
        {matches.length === 0 ? (
          <p className="text-xs text-muted-foreground">No matches.</p>
        ) : (
          <ul className="space-y-1 text-xs font-mono">
            {matches.slice(0, 50).map((m, i) => (
              <li key={i} className="rounded-lg border border-border/60 bg-background/40 p-2">
                <span className="text-primary">#{i + 1}</span> @{m.index}: <span className="text-foreground">{m.match}</span>
                {m.groups.length > 0 ? <span className="text-muted-foreground"> · groups: [{m.groups.map((g) => JSON.stringify(g)).join(", ")}]</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* --- API Designer --- */
type ApiField = { name: string; type: string; required: boolean };
function ApiDesignerTool({ onContext }: { onContext: (s: string) => void }) {
  const [resource, setResource] = useState("Task");
  const [basePath, setBasePath] = useState("/api/v1");
  const [ops, setOps] = useState({ list: true, create: true, read: true, update: true, delete: true });
  const [auth, setAuth] = useState<"None" | "Bearer JWT" | "API Key" | "OAuth2">("Bearer JWT");
  const [fields, setFields] = useState<ApiField[]>([
    { name: "id", type: "string(uuid)", required: true },
    { name: "title", type: "string", required: true },
    { name: "status", type: "enum(open,done)", required: true },
    { name: "createdAt", type: "string(datetime)", required: true },
  ]);
  const plural = resource.toLowerCase() + (resource.endsWith("s") ? "" : "s");
  const yaml = useMemo(() => {
    const lines: string[] = [];
    lines.push(`openapi: 3.1.0`);
    lines.push(`info: { title: ${resource} API, version: 1.0.0 }`);
    lines.push(`paths:`);
    if (ops.list || ops.create) {
      lines.push(`  ${basePath}/${plural}:`);
      if (ops.list) lines.push(`    get: { summary: List ${plural}, responses: { "200": { description: OK } } }`);
      if (ops.create) lines.push(`    post: { summary: Create ${resource}, responses: { "201": { description: Created } } }`);
    }
    if (ops.read || ops.update || ops.delete) {
      lines.push(`  ${basePath}/${plural}/{id}:`);
      if (ops.read) lines.push(`    get: { summary: Get ${resource}, responses: { "200": { description: OK }, "404": { description: Not found } } }`);
      if (ops.update) lines.push(`    patch: { summary: Update ${resource}, responses: { "200": { description: OK } } }`);
      if (ops.delete) lines.push(`    delete: { summary: Delete ${resource}, responses: { "204": { description: No content } } }`);
    }
    lines.push(`components:`);
    lines.push(`  schemas:`);
    lines.push(`    ${resource}:`);
    lines.push(`      type: object`);
    lines.push(`      required: [${fields.filter((f) => f.required).map((f) => f.name).join(", ")}]`);
    lines.push(`      properties:`);
    for (const f of fields) lines.push(`        ${f.name}: { type: "${f.type}" }`);
    if (auth !== "None") {
      lines.push(`  securitySchemes:`);
      if (auth === "Bearer JWT") lines.push(`    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }`);
      if (auth === "API Key") lines.push(`    apiKey: { type: apiKey, in: header, name: X-API-Key }`);
      if (auth === "OAuth2") lines.push(`    oauth2: { type: oauth2, flows: { authorizationCode: { authorizationUrl: /oauth/authorize, tokenUrl: /oauth/token, scopes: {} } } }`);
    }
    return lines.join("\n");
  }, [resource, basePath, plural, ops, fields, auth]);
  useMemo(() => onContext(`API design — resource ${resource} at ${basePath}/${plural}, auth ${auth}, ops: ${Object.entries(ops).filter(([, v]) => v).map(([k]) => k).join(", ")}.\n\n\`\`\`yaml\n${yaml}\n\`\`\``), [resource, basePath, plural, auth, ops, yaml, onContext]);
  return (
    <div className="grid gap-4">
      <Card title="Resource">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Resource (singular, PascalCase)"><Input value={resource} onChange={(e) => setResource(e.target.value)} /></Field>
          <Field label="Base path"><Input value={basePath} onChange={(e) => setBasePath(e.target.value)} /></Field>
          <Field label="Auth">
            <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={auth} onChange={(e) => setAuth(e.target.value as typeof auth)}>
              {["None", "Bearer JWT", "API Key", "OAuth2"].map((a) => <option key={a}>{a}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["list", "create", "read", "update", "delete"] as const).map((op) => (
            <button key={op} type="button" onClick={() => setOps((o) => ({ ...o, [op]: !o[op] }))} className={`rounded-full border px-3 py-1 text-xs ${ops[op] ? "bg-primary text-primary-foreground border-primary" : "border-border bg-surface hover:border-primary/50"}`}>{op.toUpperCase()}</button>
          ))}
        </div>
      </Card>
      <Card title="Fields">
        <div className="grid gap-2">
          {fields.map((f, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_90px_auto] gap-2">
              <Input value={f.name} onChange={(e) => setFields((xs) => xs.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <Input value={f.type} onChange={(e) => setFields((xs) => xs.map((x, j) => j === i ? { ...x, type: e.target.value } : x))} />
              <button type="button" onClick={() => setFields((xs) => xs.map((x, j) => j === i ? { ...x, required: !x.required } : x))} className={`rounded-lg border px-2 text-xs ${f.required ? "bg-primary text-primary-foreground border-primary" : "border-border bg-surface"}`}>{f.required ? "required" : "optional"}</button>
              <Button variant="outline" size="sm" onClick={() => setFields((xs) => xs.filter((_, j) => j !== i))}>×</Button>
            </div>
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setFields((xs) => [...xs, { name: "field", type: "string", required: false }])}>Add field</Button>
      </Card>
      <Card title="OpenAPI 3.1 skeleton">
        <pre className="overflow-auto rounded-lg border border-border/60 bg-background/40 p-3 text-[11px] font-mono leading-relaxed">{yaml}</pre>
      </Card>
    </div>
  );
}

/* --- Algorithm Analyzer --- */
const ALGOS: { name: string; time: string; space: string; tFn: (n: number) => number }[] = [
  { name: "Array access / hash lookup", time: "O(1)", space: "O(1)", tFn: () => 1 },
  { name: "Binary search (sorted)", time: "O(log n)", space: "O(1)", tFn: (n) => Math.log2(Math.max(1, n)) },
  { name: "Linear scan", time: "O(n)", space: "O(1)", tFn: (n) => n },
  { name: "Merge / heap / quick sort (avg)", time: "O(n log n)", space: "O(n) / O(log n)", tFn: (n) => n * Math.log2(Math.max(2, n)) },
  { name: "Two nested loops", time: "O(n²)", space: "O(1)", tFn: (n) => n * n },
  { name: "Triple nested loops", time: "O(n³)", space: "O(1)", tFn: (n) => n * n * n },
  { name: "Subset enumeration", time: "O(2ⁿ)", space: "O(n)", tFn: (n) => Math.pow(2, Math.min(n, 40)) },
  { name: "Permutation enumeration", time: "O(n!)", space: "O(n)", tFn: (n) => { let x = 1; for (let i = 2; i <= Math.min(n, 20); i++) x *= i; return x; } },
];
function AlgoAnalyzerTool({ onContext }: { onContext: (s: string) => void }) {
  const [n, setN] = useState(100000);
  const [pick, setPick] = useState(3);
  const opsPerSec = 5e8; // rough modern CPU tight-loop ops/sec
  const rows = ALGOS.map((a) => {
    const t = a.tFn(n);
    return { ...a, ops: t, sec: t / opsPerSec };
  });
  const chosen = rows[pick];
  useMemo(() => onContext(`Complexity study at n=${n.toLocaleString()}:\n${rows.map((r) => `- ${r.name} — ${r.time} — ~${numFmt(r.ops, 0)} ops, ~${numFmt(r.sec, 3)} s @ ${opsPerSec.toExponential(0)} ops/s`).join("\n")}\n\nChosen: ${chosen.name}.`), [n, rows, chosen, onContext]);
  const fmtTime = (s: number) => s < 1e-6 ? "<1 µs" : s < 1e-3 ? `${(s * 1e6).toFixed(0)} µs` : s < 1 ? `${(s * 1000).toFixed(1)} ms` : s < 60 ? `${s.toFixed(2)} s` : s < 3600 ? `${(s / 60).toFixed(1)} min` : s < 86400 ? `${(s / 3600).toFixed(1)} h` : `${(s / 86400).toFixed(1)} d`;
  return (
    <div className="grid gap-4">
      <Card title="Scale">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Input size n"><Input type="number" value={n} onChange={(e) => setN(+e.target.value)} /></Field>
          <Field label="Primary algorithm">
            <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={pick} onChange={(e) => setPick(+e.target.value)}>
              {ALGOS.map((a, i) => <option value={i} key={a.name}>{a.name} — {a.time}</option>)}
            </select>
          </Field>
        </div>
      </Card>
      <Card title="Growth table">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left"><th className="py-2 pr-3">Algorithm</th><th className="pr-3">Time</th><th className="pr-3">Space</th><th className="pr-3">Ops @ n</th><th>Wall time</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.name} className={`border-t border-border/60 ${i === pick ? "bg-primary/5" : ""}`}>
                  <td className="py-2 pr-3 font-medium">{r.name}</td>
                  <td className="pr-3 font-mono">{r.time}</td>
                  <td className="pr-3 font-mono">{r.space}</td>
                  <td className="pr-3 tabular-nums">{numFmt(r.ops, 0)}</td>
                  <td className="tabular-nums">{fmtTime(r.sec)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Wall time assumes ~5×10⁸ tight-loop ops/s per core. Real cost varies with cache misses, branch prediction, allocation, and I/O.</p>
      </Card>
    </div>
  );
}

/* ===================== Cybersecurity & Pentest Tools ===================== */
/* All tools below are educational / defensive planning aids. They assume the
   user has WRITTEN AUTHORIZATION to test the target system. No exploitation
   payloads, credentials, or offensive tooling are produced here. */

function AuthBanner() {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90">
      <strong className="text-amber-300">Authorized testing only.</strong> These tools are planning
      aids. You must have explicit written permission to assess any system.
      Unauthorized access is illegal in most jurisdictions.
    </div>
  );
}

/* --- Engagement Planner --- */
function ReconPlannerTool({ onContext }: { onContext: (s: string) => void }) {
  const [target, setTarget] = useState("");
  const [type, setType] = useState<"Black-box" | "Grey-box" | "White-box">("Grey-box");
  const [scope, setScope] = useState("*.example.com web apps and public APIs");
  const [outOfScope, setOutOfScope] = useState("Production databases, employee endpoints, social engineering");
  const [window, setWindow] = useState("Mon–Fri, 22:00–06:00 UTC");
  const [contact, setContact] = useState("security-lead@company.tld · +country phone");
  const [auth, setAuth] = useState(false);
  useMemo(() => onContext(`Engagement brief:\n- Target: ${target}\n- Type: ${type}\n- Scope: ${scope}\n- Out of scope: ${outOfScope}\n- Test window: ${window}\n- Emergency contact: ${contact}\n- Written authorization on file: ${auth ? "YES" : "NO — DO NOT PROCEED"}`), [target, type, scope, outOfScope, window, contact, auth, onContext]);
  return (
    <div className="grid gap-4">
      <AuthBanner />
      <Card title="Engagement brief">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Target organization / asset owner"><Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Acme Corp — Web Platform" /></Field>
          <Field label="Test type">
            <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              {["Black-box", "Grey-box", "White-box"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="In-scope assets"><Textarea value={scope} onChange={(e) => setScope(e.target.value)} className="min-h-[70px]" /></Field>
          <Field label="Out-of-scope"><Textarea value={outOfScope} onChange={(e) => setOutOfScope(e.target.value)} className="min-h-[70px]" /></Field>
          <Field label="Test window"><Input value={window} onChange={(e) => setWindow(e.target.value)} /></Field>
          <Field label="Emergency contact"><Input value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={auth} onChange={(e) => setAuth(e.target.checked)} />
          I confirm signed written authorization is on file for this engagement.
        </label>
      </Card>
      <Card title="Recommended phases (PTES / NIST SP 800-115)">
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          <li>Pre-engagement — scoping, RoE, signed authorization, comms plan</li>
          <li>Intelligence gathering — passive OSINT within scope</li>
          <li>Threat modeling — attack surface & abuse cases</li>
          <li>Vulnerability analysis — automated & manual, no exploitation yet</li>
          <li>Exploitation — only when RoE explicitly permits; minimal impact</li>
          <li>Post-exploitation — data-handling per contract; no exfiltration</li>
          <li>Reporting — executive summary, technical findings, CVSS, remediation</li>
        </ul>
      </Card>
    </div>
  );
}

/* --- Threat Model (STRIDE) --- */
type StrideRow = { asset: string; s: boolean; t: boolean; r: boolean; i: boolean; d: boolean; e: boolean; mitigation: string };
function ThreatModelTool({ onContext }: { onContext: (s: string) => void }) {
  const [rows, setRows] = useState<StrideRow[]>([
    { asset: "Login endpoint", s: true, t: false, r: false, i: false, d: true, e: false, mitigation: "Rate limit, MFA, breach-check password" },
    { asset: "Session cookie", s: false, t: true, r: false, i: true, d: false, e: true, mitigation: "HttpOnly, Secure, SameSite=Lax, short TTL, rotation" },
    { asset: "Uploaded files", s: false, t: true, r: false, i: false, d: false, e: false, mitigation: "MIME/size checks, sandbox, AV scan, signed URL" },
  ]);
  const total = rows.reduce((a, r) => a + (r.s ? 1 : 0) + (r.t ? 1 : 0) + (r.r ? 1 : 0) + (r.i ? 1 : 0) + (r.d ? 1 : 0) + (r.e ? 1 : 0), 0);
  useMemo(() => onContext(`STRIDE model (${rows.length} assets, ${total} threats):\n${rows.map((r) => `- ${r.asset}: ${["S", "T", "R", "I", "D", "E"].filter((_, i) => [r.s, r.t, r.r, r.i, r.d, r.e][i]).join("")} → ${r.mitigation}`).join("\n")}`), [rows, total, onContext]);
  const set = (i: number, patch: Partial<StrideRow>) => setRows((xs) => xs.map((x, j) => j === i ? { ...x, ...patch } : x));
  return (
    <div className="grid gap-4">
      <Card title="STRIDE = Spoofing · Tampering · Repudiation · Information disclosure · Denial of service · Elevation of privilege">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left"><th className="py-2 pr-2">Asset / element</th>{"STRIDE".split("").map((k) => <th key={k} className="px-1 text-center">{k}</th>)}<th className="pl-2">Mitigation</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="py-2 pr-2"><Input value={r.asset} onChange={(e) => set(i, { asset: e.target.value })} /></td>
                  {(["s", "t", "r", "i", "d", "e"] as const).map((k) => (
                    <td key={k} className="px-1 text-center"><input type="checkbox" checked={r[k]} onChange={(e) => set(i, { [k]: e.target.checked } as Partial<StrideRow>)} /></td>
                  ))}
                  <td className="pl-2"><Input value={r.mitigation} onChange={(e) => set(i, { mitigation: e.target.value })} /></td>
                  <td><Button variant="outline" size="sm" onClick={() => setRows((xs) => xs.filter((_, j) => j !== i))}>×</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => setRows((xs) => [...xs, { asset: "New element", s: false, t: false, r: false, i: false, d: false, e: false, mitigation: "" }])}>Add element</Button>
      </Card>
      <Card title="Summary"><Metric label="Threats identified" value={String(total)} /></Card>
    </div>
  );
}

/* --- OWASP Top 10 (2021) Audit --- */
const OWASP = [
  { id: "A01", name: "Broken Access Control", hint: "IDOR, missing authorization, forced browsing" },
  { id: "A02", name: "Cryptographic Failures", hint: "Weak/legacy crypto, plaintext secrets, missing TLS" },
  { id: "A03", name: "Injection", hint: "SQLi, NoSQLi, command injection, LDAP, template" },
  { id: "A04", name: "Insecure Design", hint: "Missing threat modeling, no rate-limits, weak workflows" },
  { id: "A05", name: "Security Misconfiguration", hint: "Default creds, verbose errors, open S3, headers" },
  { id: "A06", name: "Vulnerable & Outdated Components", hint: "Old libs, unpatched CVEs, no SBOM" },
  { id: "A07", name: "Identification & Auth Failures", hint: "Weak passwords, no MFA, session fixation" },
  { id: "A08", name: "Software & Data Integrity Failures", hint: "Unsigned updates, insecure deserialization, CI/CD" },
  { id: "A09", name: "Logging & Monitoring Failures", hint: "No alerts, no retention, no SIEM ingestion" },
  { id: "A10", name: "Server-Side Request Forgery (SSRF)", hint: "Unfiltered outbound fetch, cloud metadata reach" },
];
function OwaspAuditTool({ onContext }: { onContext: (s: string) => void }) {
  const [status, setStatus] = useState<Record<string, "unknown" | "pass" | "fail" | "n/a">>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const set = (id: string, v: typeof status[string]) => setStatus((s) => ({ ...s, [id]: v }));
  const fails = OWASP.filter((o) => status[o.id] === "fail").length;
  const passes = OWASP.filter((o) => status[o.id] === "pass").length;
  useMemo(() => onContext(`OWASP Top 10 (2021) audit — ${passes} pass · ${fails} fail:\n${OWASP.map((o) => `- ${o.id} ${o.name}: ${status[o.id] ?? "unknown"}${notes[o.id] ? ` — ${notes[o.id]}` : ""}`).join("\n")}`), [status, notes, passes, fails, onContext]);
  return (
    <div className="grid gap-4">
      <AuthBanner />
      <Card title="Findings">
        <div className="grid gap-3">
          {OWASP.map((o) => (
            <div key={o.id} className="rounded-xl border border-border/60 bg-background/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{o.id} — {o.name}</div>
                  <div className="text-[11px] text-muted-foreground">{o.hint}</div>
                </div>
                <div className="flex gap-1">
                  {(["pass", "fail", "n/a", "unknown"] as const).map((v) => (
                    <button key={v} onClick={() => set(o.id, v)} className={`rounded-full border px-2 py-0.5 text-[11px] ${status[o.id] === v ? (v === "pass" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : v === "fail" ? "bg-rose-500/20 border-rose-500/40 text-rose-300" : "bg-primary/15 border-primary/40 text-primary") : "border-border bg-surface hover:border-primary/50"}`}>{v}</button>
                  ))}
                </div>
              </div>
              <Input placeholder="Evidence / note…" value={notes[o.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [o.id]: e.target.value }))} className="mt-2 h-8 text-xs" />
            </div>
          ))}
        </div>
      </Card>
      <Card title="Summary">
        <div className="grid grid-cols-3 gap-3">
          <Metric label="Pass" value={String(passes)} />
          <Metric label="Fail" value={String(fails)} />
          <Metric label="Reviewed" value={`${passes + fails} / ${OWASP.length}`} />
        </div>
      </Card>
    </div>
  );
}

/* --- Password Strength --- */
function PasswordAnalyzerTool({ onContext }: { onContext: (s: string) => void }) {
  const [pw, setPw] = useState("");
  const analysis = useMemo(() => {
    const classes = [/[a-z]/.test(pw), /[A-Z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)];
    const poolSize = (classes[0] ? 26 : 0) + (classes[1] ? 26 : 0) + (classes[2] ? 10 : 0) + (classes[3] ? 33 : 0);
    const bits = pw.length > 0 && poolSize > 0 ? pw.length * Math.log2(poolSize) : 0;
    // Offline attacker at ~1e11 hashes/sec against a fast hash (worst-case defensive estimate).
    const guessesToBreak = Math.pow(2, Math.max(0, bits - 1));
    const seconds = guessesToBreak / 1e11;
    return { poolSize, bits, seconds, classes };
  }, [pw]);
  useMemo(() => onContext(`Password analysis: length=${pw.length}, pool=${analysis.poolSize}, entropy≈${analysis.bits.toFixed(1)} bits, ~${analysis.seconds.toExponential(2)} s to brute-force offline @ 1e11 H/s.`), [pw, analysis, onContext]);
  const band = analysis.bits < 40 ? "Very weak" : analysis.bits < 60 ? "Weak" : analysis.bits < 80 ? "Reasonable" : analysis.bits < 100 ? "Strong" : "Very strong";
  const color = analysis.bits < 40 ? "text-rose-400" : analysis.bits < 60 ? "text-orange-400" : analysis.bits < 80 ? "text-amber-300" : analysis.bits < 100 ? "text-emerald-400" : "text-emerald-300";
  const fmt = (s: number) => !isFinite(s) ? "∞" : s < 1 ? "<1 s" : s < 60 ? `${s.toFixed(1)} s` : s < 3600 ? `${(s / 60).toFixed(1)} min` : s < 86400 ? `${(s / 3600).toFixed(1)} h` : s < 3.15e7 ? `${(s / 86400).toFixed(1)} days` : s < 3.15e10 ? `${(s / 3.15e7).toFixed(1)} years` : `${(s / 3.15e7).toExponential(1)} years`;
  return (
    <div className="grid gap-4">
      <Card title="Enter a candidate password">
        <Input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Type here — never submit a real production credential." className="font-mono" />
        <p className="mt-2 text-[11px] text-muted-foreground">Runs entirely in your browser. Do not paste live production secrets — use a sample.</p>
      </Card>
      <Card title="Analysis">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric label="Length" value={String(pw.length)} />
          <Metric label="Char pool" value={String(analysis.poolSize)} />
          <Metric label="Entropy" value={analysis.bits.toFixed(1)} unit="bits" />
          <Metric label="Offline crack" value={fmt(analysis.seconds)} />
        </div>
        <div className={`mt-3 text-sm font-semibold ${color}`}>Rating: {band}</div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Offline estimate assumes a fast hash (SHA-256 on GPU cluster). With Argon2id/bcrypt at proper cost, crack time is orders of magnitude longer. NIST SP 800-63B recommends ≥ 15 chars, breach-check via HIBP k-anon, and MFA.
        </p>
      </Card>
    </div>
  );
}

/* --- Hash & Encoding Lab --- */
function HashLabTool({ onContext }: { onContext: (s: string) => void }) {
  const [input, setInput] = useState("hello world");
  const [sha256, setSha256] = useState("");
  const [sha1, setSha1] = useState("");
  const [b64, setB64] = useState("");
  const [urlEnc, setUrlEnc] = useState("");
  const [hex, setHex] = useState("");
  useMemo(() => {
    const enc = new TextEncoder().encode(input);
    try { setB64(btoa(unescape(encodeURIComponent(input)))); } catch { setB64(""); }
    setUrlEnc(encodeURIComponent(input));
    setHex(Array.from(enc).map((b) => b.toString(16).padStart(2, "0")).join(""));
    if (typeof crypto !== "undefined" && crypto.subtle) {
      crypto.subtle.digest("SHA-256", enc).then((b) => setSha256(Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join(""))).catch(() => setSha256(""));
      crypto.subtle.digest("SHA-1", enc).then((b) => setSha1(Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join(""))).catch(() => setSha1(""));
    }
  }, [input]);
  useMemo(() => onContext(`Hash lab input (${input.length} chars):\n- SHA-256: ${sha256}\n- SHA-1: ${sha1}\n- Base64: ${b64}`), [input, sha256, sha1, b64, onContext]);
  const Line = ({ label, value }: { label: string; value: string }) => (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="rounded-lg border border-border/60 bg-background/40 p-2 font-mono text-[11px] break-all">{value || "—"}</div>
    </div>
  );
  return (
    <div className="grid gap-4">
      <Card title="Input">
        <Textarea value={input} onChange={(e) => setInput(e.target.value)} className="font-mono text-xs min-h-[100px]" />
        <p className="mt-2 text-[11px] text-muted-foreground">SHA-256/SHA-1 are message-digest functions — not password hashes. For passwords use Argon2id or bcrypt with a proper cost factor. Base64/URL/hex are encodings, not encryption.</p>
      </Card>
      <Card title="Outputs">
        <div className="grid gap-2">
          <Line label="SHA-256" value={sha256} />
          <Line label="SHA-1" value={sha1} />
          <Line label="Base64" value={b64} />
          <Line label="URL-encoded" value={urlEnc} />
          <Line label="Hex" value={hex} />
        </div>
      </Card>
    </div>
  );
}

/* --- CVSS 3.1 Calculator --- */
type CvssMetric = { key: string; label: string; opts: { code: string; label: string; val: number }[] };
const CVSS_METRICS: CvssMetric[] = [
  { key: "AV", label: "Attack Vector", opts: [{ code: "N", label: "Network", val: 0.85 }, { code: "A", label: "Adjacent", val: 0.62 }, { code: "L", label: "Local", val: 0.55 }, { code: "P", label: "Physical", val: 0.2 }] },
  { key: "AC", label: "Attack Complexity", opts: [{ code: "L", label: "Low", val: 0.77 }, { code: "H", label: "High", val: 0.44 }] },
  { key: "PR", label: "Privileges Required", opts: [{ code: "N", label: "None", val: 0.85 }, { code: "L", label: "Low", val: 0.62 }, { code: "H", label: "High", val: 0.27 }] },
  { key: "UI", label: "User Interaction", opts: [{ code: "N", label: "None", val: 0.85 }, { code: "R", label: "Required", val: 0.62 }] },
  { key: "S", label: "Scope", opts: [{ code: "U", label: "Unchanged", val: 0 }, { code: "C", label: "Changed", val: 1 }] },
  { key: "C", label: "Confidentiality", opts: [{ code: "N", label: "None", val: 0 }, { code: "L", label: "Low", val: 0.22 }, { code: "H", label: "High", val: 0.56 }] },
  { key: "I", label: "Integrity", opts: [{ code: "N", label: "None", val: 0 }, { code: "L", label: "Low", val: 0.22 }, { code: "H", label: "High", val: 0.56 }] },
  { key: "A", label: "Availability", opts: [{ code: "N", label: "None", val: 0 }, { code: "L", label: "Low", val: 0.22 }, { code: "H", label: "High", val: 0.56 }] },
];
function CvssCalculatorTool({ onContext }: { onContext: (s: string) => void }) {
  const [sel, setSel] = useState<Record<string, string>>({ AV: "N", AC: "L", PR: "N", UI: "N", S: "U", C: "H", I: "H", A: "H" });
  const val = (k: string) => CVSS_METRICS.find((m) => m.key === k)!.opts.find((o) => o.code === sel[k])!.val;
  // CVSS 3.1 base formula
  const scopeChanged = sel.S === "C";
  const prVal = sel.PR === "N" ? 0.85 : sel.PR === "L" ? (scopeChanged ? 0.68 : 0.62) : (scopeChanged ? 0.5 : 0.27);
  const iss = 1 - (1 - val("C")) * (1 - val("I")) * (1 - val("A"));
  const impact = scopeChanged ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15) : 6.42 * iss;
  const exploitability = 8.22 * val("AV") * val("AC") * prVal * val("UI");
  let base = 0;
  if (impact > 0) base = scopeChanged ? Math.min(1.08 * (impact + exploitability), 10) : Math.min(impact + exploitability, 10);
  base = Math.ceil(base * 10) / 10;
  const severity = base === 0 ? "None" : base < 4 ? "Low" : base < 7 ? "Medium" : base < 9 ? "High" : "Critical";
  const color = severity === "None" ? "text-muted-foreground" : severity === "Low" ? "text-emerald-400" : severity === "Medium" ? "text-amber-300" : severity === "High" ? "text-orange-400" : "text-rose-400";
  const vector = `CVSS:3.1/${CVSS_METRICS.map((m) => `${m.key}:${sel[m.key]}`).join("/")}`;
  useMemo(() => onContext(`CVSS 3.1 → base=${base.toFixed(1)} (${severity})\nVector: ${vector}`), [base, severity, vector, onContext]);
  return (
    <div className="grid gap-4">
      <Card title="Base metrics">
        <div className="grid gap-3 md:grid-cols-2">
          {CVSS_METRICS.map((m) => (
            <Field key={m.key} label={`${m.label} (${m.key})`}>
              <div className="flex flex-wrap gap-1">
                {m.opts.map((o) => (
                  <button key={o.code} onClick={() => setSel((s) => ({ ...s, [m.key]: o.code }))} className={`rounded-full border px-2.5 py-1 text-[11px] ${sel[m.key] === o.code ? "bg-primary text-primary-foreground border-primary" : "border-border bg-surface hover:border-primary/50"}`}>{o.label}</button>
                ))}
              </div>
            </Field>
          ))}
        </div>
      </Card>
      <Card title="Score">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric label="Base score" value={base.toFixed(1)} />
          <div className="rounded-xl border border-border/60 bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Severity</div>
            <div className={`mt-1 text-lg font-semibold ${color}`}>{severity}</div>
          </div>
          <Metric label="Impact" value={impact.toFixed(2)} />
          <Metric label="Exploitability" value={exploitability.toFixed(2)} />
        </div>
        <div className="mt-3 rounded-lg border border-border/60 bg-background/40 p-2 font-mono text-[11px] break-all">{vector}</div>
      </Card>
    </div>
  );
}


/* ===================== JSON Lab ===================== */
function JsonLabTool({ onContext }: { onContext: (s: string) => void }) {
  const [input, setInput] = useState('{\n  "user": {\n    "id": 42,\n    "name": "Ada",\n    "roles": ["admin", "editor"]\n  }\n}');
  const [indent, setIndent] = useState(2);
  const [path, setPath] = useState("$.user.roles[0]");
  const parsed = useMemo(() => { try { return { ok: true as const, val: JSON.parse(input) }; } catch (e) { return { ok: false as const, err: (e as Error).message }; } }, [input]);
  const formatted = parsed.ok ? JSON.stringify(parsed.val, null, indent) : "";
  const minified = parsed.ok ? JSON.stringify(parsed.val) : "";
  const jpath = useMemo(() => {
    if (!parsed.ok) return { ok: false as const, err: "invalid JSON" };
    try {
      const p = path.trim().replace(/^\$\.?/, "");
      if (!p) return { ok: true as const, val: parsed.val };
      const parts = p.match(/[^.[\]]+/g) ?? [];
      let cur: unknown = parsed.val;
      for (const key of parts) {
        if (cur == null) return { ok: false as const, err: `null at "${key}"` };
        const idx = /^\d+$/.test(key) ? Number(key) : key;
        cur = (cur as Record<string, unknown>)[idx as string];
      }
      return { ok: true as const, val: cur };
    } catch (e) { return { ok: false as const, err: (e as Error).message }; }
  }, [parsed, path]);
  const bytes = new TextEncoder().encode(input).length;
  useMemo(() => onContext(`JSON lab — ${parsed.ok ? "valid" : `invalid: ${parsed.err}`}. Bytes=${bytes}. Query ${path} → ${jpath.ok ? JSON.stringify(jpath.val).slice(0, 200) : jpath.err}\n\n\`\`\`json\n${formatted.slice(0, 2000)}\n\`\`\``), [parsed, bytes, path, jpath, formatted, onContext]);
  return (
    <div className="grid gap-4">
      <Card title="Input">
        <Textarea value={input} onChange={(e) => setInput(e.target.value)} className="font-mono text-xs min-h-[180px]" />
        <div className="mt-2 flex items-center gap-3 text-xs">
          <span className={parsed.ok ? "text-emerald-400" : "text-rose-400"}>{parsed.ok ? "Valid JSON" : `Invalid: ${parsed.err}`}</span>
          <span className="text-muted-foreground">·  {bytes.toLocaleString()} bytes</span>
          <Label className="ml-auto text-xs text-muted-foreground">Indent</Label>
          <select className="rounded-md border border-border bg-background px-2 py-0.5 text-xs" value={indent} onChange={(e) => setIndent(+e.target.value)}>
            <option value={2}>2</option><option value={4}>4</option><option value={0}>tab-min</option>
          </select>
        </div>
      </Card>
      <Card title="Formatted"><pre className="overflow-auto rounded-lg border border-border/60 bg-background/40 p-3 text-[11px] font-mono leading-relaxed max-h-[280px]">{formatted || "—"}</pre></Card>
      <Card title="Minified"><pre className="overflow-auto rounded-lg border border-border/60 bg-background/40 p-3 text-[11px] font-mono break-all">{minified || "—"}</pre></Card>
      <Card title="JSONPath-lite query">
        <Input value={path} onChange={(e) => setPath(e.target.value)} className="font-mono" placeholder="$.user.roles[0]" />
        <pre className="mt-2 overflow-auto rounded-lg border border-border/60 bg-background/40 p-3 text-[11px] font-mono">{jpath.ok ? JSON.stringify(jpath.val, null, 2) : `Error: ${jpath.err}`}</pre>
        <p className="mt-2 text-[11px] text-muted-foreground">Supports dot & bracket access (e.g. <code>$.a.b[0].c</code>). Not full JSONPath; runs in-browser.</p>
      </Card>
    </div>
  );
}

/* ===================== Diff Viewer ===================== */
function lcsDiff(a: string[], b: string[]) {
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: { type: "eq" | "add" | "del"; text: string }[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ type: "eq", text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: "del", text: a[i++] }); }
    else { out.push({ type: "add", text: b[j++] }); }
  }
  while (i < n) out.push({ type: "del", text: a[i++] });
  while (j < m) out.push({ type: "add", text: b[j++] });
  return out;
}
function DiffViewerTool({ onContext }: { onContext: (s: string) => void }) {
  const [left, setLeft] = useState("function add(a, b) {\n  return a + b;\n}");
  const [right, setRight] = useState("function add(a: number, b: number): number {\n  return a + b;\n}");
  const diff = useMemo(() => lcsDiff(left.split("\n"), right.split("\n")), [left, right]);
  const adds = diff.filter((d) => d.type === "add").length;
  const dels = diff.filter((d) => d.type === "del").length;
  useMemo(() => onContext(`Diff: +${adds} / -${dels}\n\n\`\`\`diff\n${diff.map((d) => (d.type === "add" ? "+ " : d.type === "del" ? "- " : "  ") + d.text).join("\n").slice(0, 2000)}\n\`\`\``), [diff, adds, dels, onContext]);
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Original"><Textarea value={left} onChange={(e) => setLeft(e.target.value)} className="font-mono text-xs min-h-[180px]" /></Card>
        <Card title="Modified"><Textarea value={right} onChange={(e) => setRight(e.target.value)} className="font-mono text-xs min-h-[180px]" /></Card>
      </div>
      <Card title={`Unified diff (+${adds} / -${dels})`}>
        <pre className="overflow-auto rounded-lg border border-border/60 bg-background/40 p-3 text-[11px] font-mono leading-relaxed max-h-[360px]">
          {diff.map((d, i) => (
            <div key={i} className={d.type === "add" ? "bg-emerald-500/10 text-emerald-300" : d.type === "del" ? "bg-rose-500/10 text-rose-300" : "text-muted-foreground"}>
              {(d.type === "add" ? "+ " : d.type === "del" ? "- " : "  ") + (d.text || " ")}
            </div>
          ))}
        </pre>
      </Card>
    </div>
  );
}

/* ===================== Cron Lab ===================== */
function parseCronField(f: string, min: number, max: number): number[] | string {
  if (f === "*") { const out: number[] = []; for (let i = min; i <= max; i++) out.push(i); return out; }
  const out = new Set<number>();
  for (const part of f.split(",")) {
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    const stepPart = stepMatch ? stepMatch[1] : part;
    const step = stepMatch ? Number(stepMatch[2]) : 1;
    let lo = min, hi = max;
    if (stepPart !== "*") {
      const range = stepPart.split("-");
      lo = Number(range[0]); hi = range[1] ? Number(range[1]) : (stepMatch ? max : lo);
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo < min || hi > max || lo > hi) return `bad "${part}"`;
    for (let i = lo; i <= hi; i += step) out.add(i);
  }
  return [...out].sort((a, b) => a - b);
}
function nextCronRuns(expr: string, from: Date, count = 5): Date[] | string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return "Expected 5 fields: min hour dom mon dow";
  const mins = parseCronField(parts[0], 0, 59);
  const hours = parseCronField(parts[1], 0, 23);
  const doms = parseCronField(parts[2], 1, 31);
  const mons = parseCronField(parts[3], 1, 12);
  const dows = parseCronField(parts[4], 0, 6);
  for (const x of [mins, hours, doms, mons, dows]) if (typeof x === "string") return x;
  const [mS, hS, dS, moS, dwS] = [mins, hours, doms, mons, dows] as number[][];
  const out: Date[] = [];
  const cur = new Date(from.getTime() + 60000); cur.setSeconds(0, 0);
  const limit = 366 * 24 * 60;
  for (let step = 0; step < limit && out.length < count; step++) {
    if (mS.includes(cur.getMinutes()) && hS.includes(cur.getHours()) && dS.includes(cur.getDate()) && moS.includes(cur.getMonth() + 1) && dwS.includes(cur.getDay())) out.push(new Date(cur));
    cur.setMinutes(cur.getMinutes() + 1);
  }
  return out;
}
function CronLabTool({ onContext }: { onContext: (s: string) => void }) {
  const [expr, setExpr] = useState("*/15 9-17 * * 1-5");
  const now = useMemo(() => new Date(), []);
  const runs = useMemo(() => nextCronRuns(expr, now, 5), [expr, now]);
  const human = useMemo(() => {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) return "Invalid — need 5 fields.";
    return `Runs at minute ${parts[0]}, hour ${parts[1]}, day-of-month ${parts[2]}, month ${parts[3]}, day-of-week ${parts[4]}.`;
  }, [expr]);
  useMemo(() => onContext(`Cron ${expr} — ${typeof runs === "string" ? `error: ${runs}` : `next: ${runs.map((r) => r.toISOString()).join(", ")}`}`), [expr, runs, onContext]);
  return (
    <div className="grid gap-4">
      <Card title="Cron expression (5-field POSIX: min hour dom mon dow)">
        <Input value={expr} onChange={(e) => setExpr(e.target.value)} className="font-mono" />
        <p className="mt-2 text-xs text-muted-foreground">{human}</p>
        <div className="mt-3 grid gap-1 text-[11px] text-muted-foreground">
          <div><code className="text-foreground">* * * * *</code> every minute</div>
          <div><code className="text-foreground">0 * * * *</code> hourly on the hour</div>
          <div><code className="text-foreground">0 9 * * 1-5</code> 09:00 on weekdays</div>
          <div><code className="text-foreground">*/15 * * * *</code> every 15 minutes</div>
        </div>
      </Card>
      <Card title="Next 5 runs (local browser time)">
        {typeof runs === "string" ? <p className="text-xs text-rose-400">{runs}</p> : (
          <ul className="grid gap-1 text-xs font-mono">
            {runs.map((r, i) => <li key={i} className="rounded-md border border-border/60 bg-background/40 p-2">{r.toLocaleString()} <span className="text-muted-foreground">· {r.toISOString()}</span></li>)}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">Watches your machine timezone. For production schedulers, always specify a TZ explicitly (e.g. Vixie <code>CRON_TZ=UTC</code>).</p>
      </Card>
    </div>
  );
}

/* ===================== UUID & Time Lab ===================== */
function uuidV4() {
  const b = new Uint8Array(16); crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b).map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
function UuidLabTool({ onContext }: { onContext: (s: string) => void }) {
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>(() => Array.from({ length: 5 }, uuidV4));
  const [ts, setTs] = useState<string>(String(Math.floor(Date.now() / 1000)));
  const iso = useMemo(() => {
    const n = Number(ts);
    if (!Number.isFinite(n)) return "—";
    const ms = n > 1e12 ? n : n * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? "—" : d.toISOString();
  }, [ts]);
  const regen = () => setUuids(Array.from({ length: Math.max(1, Math.min(count, 100)) }, uuidV4));
  useMemo(() => onContext(`Generated ${uuids.length} UUID v4 · Timestamp ${ts} → ${iso}`), [uuids, ts, iso, onContext]);
  return (
    <div className="grid gap-4">
      <Card title="UUID v4 generator">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Count"><Input type="number" value={count} onChange={(e) => setCount(+e.target.value)} className="w-24" /></Field>
          <Button onClick={regen} size="sm">Regenerate</Button>
          <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(uuids.join("\n")).then(() => toast.success("Copied"))}>Copy all</Button>
        </div>
        <pre className="mt-3 max-h-[240px] overflow-auto rounded-lg border border-border/60 bg-background/40 p-3 text-[11px] font-mono">{uuids.join("\n")}</pre>
        <p className="mt-2 text-[11px] text-muted-foreground">v4 = 122 bits of entropy. Random; not sortable. Use ULID/UUID v7 if you need time-ordered IDs.</p>
      </Card>
      <Card title="Unix timestamp ↔ ISO 8601">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Unix (s or ms)"><Input value={ts} onChange={(e) => setTs(e.target.value)} className="font-mono" /></Field>
          <Field label="ISO 8601 (UTC)"><Input readOnly value={iso} className="font-mono" /></Field>
        </div>
        <div className="mt-2 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTs(String(Math.floor(Date.now() / 1000)))}>Now (s)</Button>
          <Button variant="outline" size="sm" onClick={() => setTs(String(Date.now()))}>Now (ms)</Button>
        </div>
      </Card>
    </div>
  );
}

/* ===================== JWT Inspector ===================== */
function b64urlDecode(s: string) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  try { return decodeURIComponent(atob(b).split("").map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")); } catch { return ""; }
}
function JwtInspectorTool({ onContext }: { onContext: (s: string) => void }) {
  const [token, setToken] = useState("");
  const parsed = useMemo(() => {
    if (!token.trim()) return null;
    const parts = token.trim().split(".");
    if (parts.length !== 3) return { error: "Not a JWT — expected 3 dot-separated parts." };
    try {
      const header = JSON.parse(b64urlDecode(parts[0]));
      const payload = JSON.parse(b64urlDecode(parts[1]));
      return { header, payload, sig: parts[2] };
    } catch { return { error: "Header or payload is not valid base64url JSON." }; }
  }, [token]);
  const nowS = Math.floor(Date.now() / 1000);
  const flags: { level: "ok" | "warn" | "bad"; text: string }[] = [];
  if (parsed && "header" in parsed) {
    const alg = parsed.header?.alg;
    if (alg === "none") flags.push({ level: "bad", text: "alg=none — signature not enforced. Reject." });
    if (alg?.startsWith("HS")) flags.push({ level: "warn", text: `HMAC (${alg}) — shared secret; leaking it forges any token.` });
    if (alg?.startsWith("RS") || alg?.startsWith("ES")) flags.push({ level: "ok", text: `Asymmetric (${alg}) — verify with public key only.` });
    const exp = parsed.payload?.exp;
    if (typeof exp === "number") flags.push({ level: exp < nowS ? "bad" : "ok", text: exp < nowS ? `Expired ${nowS - exp}s ago.` : `Expires in ${exp - nowS}s.` });
    else flags.push({ level: "warn", text: "No exp claim — tokens never expire." });
    if (!parsed.payload?.iss) flags.push({ level: "warn", text: "No iss claim — cannot verify issuer." });
    if (!parsed.payload?.aud) flags.push({ level: "warn", text: "No aud claim — token may be replayed to another service." });
  }
  useMemo(() => onContext(parsed && "header" in parsed ? `JWT header=${JSON.stringify(parsed.header)} payload=${JSON.stringify(parsed.payload)} flags=${flags.map((f) => f.text).join(" | ")}` : `JWT: ${parsed?.error ?? "empty"}`), [parsed, flags, onContext]);
  return (
    <div className="grid gap-4">
      <AuthBanner />
      <Card title="Paste a JWT">
        <Textarea value={token} onChange={(e) => setToken(e.target.value)} className="font-mono text-xs min-h-[100px]" placeholder="eyJhbGciOi..." />
        <p className="mt-2 text-[11px] text-muted-foreground">Runs entirely in-browser. Never paste production tokens tied to real accounts — decoded payload will be shown on screen.</p>
      </Card>
      {parsed && "error" in parsed && <Card title="Error"><p className="text-xs text-rose-400">{parsed.error}</p></Card>}
      {parsed && "header" in parsed && (
        <>
          <Card title="Header"><pre className="overflow-auto rounded-lg border border-border/60 bg-background/40 p-3 text-[11px] font-mono">{JSON.stringify(parsed.header, null, 2)}</pre></Card>
          <Card title="Payload"><pre className="overflow-auto rounded-lg border border-border/60 bg-background/40 p-3 text-[11px] font-mono">{JSON.stringify(parsed.payload, null, 2)}</pre></Card>
          <Card title="Signature (opaque)"><div className="rounded-lg border border-border/60 bg-background/40 p-2 font-mono text-[11px] break-all">{parsed.sig}</div><p className="mt-2 text-[11px] text-muted-foreground">Signature verification requires the issuer's key and is not performed here.</p></Card>
          <Card title="Security flags">
            <ul className="grid gap-1 text-xs">
              {flags.map((f, i) => (
                <li key={i} className={`rounded-md border px-2 py-1 ${f.level === "bad" ? "border-rose-500/40 bg-rose-500/10 text-rose-300" : f.level === "warn" ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"}`}>{f.text}</li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

/* ===================== Password Generator ===================== */
function PasswordGeneratorTool({ onContext }: { onContext: (s: string) => void }) {
  const [len, setLen] = useState(20);
  const [lower, setLower] = useState(true);
  const [upper, setUpper] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [avoidAmbig, setAvoidAmbig] = useState(true);
  const [mode, setMode] = useState<"password" | "passphrase">("password");
  const [words, setWords] = useState(5);
  const [pw, setPw] = useState("");
  const WORDS = ["orbit","photon","cipher","quartz","harbor","lantern","meadow","cosmic","tundra","zephyr","piston","voyager","atlas","comet","glimmer","juniper","koral","luminous","meridian","nebula","onyx","prairie","quasar","raven","solstice","thistle","umbra","valor","willow","xenon","yonder","zenith","amber","basalt","citrus","delta"];
  const gen = () => {
    if (mode === "passphrase") {
      const buf = new Uint32Array(Math.max(3, Math.min(words, 12))); crypto.getRandomValues(buf);
      setPw(Array.from(buf).map((n) => WORDS[n % WORDS.length]).join("-"));
      return;
    }
    let pool = "";
    if (lower) pool += "abcdefghijklmnopqrstuvwxyz";
    if (upper) pool += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (digits) pool += "0123456789";
    if (symbols) pool += "!@#$%^&*()-_=+[]{};:,.?/";
    if (avoidAmbig) pool = pool.replace(/[Il1O0`'"|]/g, "");
    if (!pool) { setPw(""); return; }
    const arr = new Uint32Array(len); crypto.getRandomValues(arr);
    setPw(Array.from(arr).map((n) => pool[n % pool.length]).join(""));
  };
  useMemo(() => { gen(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [len, lower, upper, digits, symbols, avoidAmbig, mode, words]);
  const bits = useMemo(() => {
    if (mode === "passphrase") return words * Math.log2(WORDS.length);
    let pool = 0;
    if (lower) pool += avoidAmbig ? 24 : 26;
    if (upper) pool += avoidAmbig ? 24 : 26;
    if (digits) pool += avoidAmbig ? 8 : 10;
    if (symbols) pool += 24;
    return pool > 0 ? len * Math.log2(pool) : 0;
  }, [mode, len, lower, upper, digits, symbols, avoidAmbig, words]);
  useMemo(() => onContext(`Generated ${mode} (${bits.toFixed(1)} bits entropy). Recommend NIST SP 800-63B policy: ≥15 chars, breach-check, MFA.`), [mode, bits, onContext]);
  const band = bits < 60 ? "Weak" : bits < 80 ? "Reasonable" : bits < 100 ? "Strong" : "Very strong";
  const color = bits < 60 ? "text-rose-400" : bits < 80 ? "text-amber-300" : bits < 100 ? "text-emerald-400" : "text-emerald-300";
  return (
    <div className="grid gap-4">
      <Card title="Mode">
        <div className="flex gap-2">
          {(["password", "passphrase"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-full border px-3 py-1 text-xs ${mode === m ? "bg-primary text-primary-foreground border-primary" : "border-border bg-surface hover:border-primary/50"}`}>{m}</button>
          ))}
        </div>
      </Card>
      {mode === "password" ? (
        <Card title="Options">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={`Length: ${len}`}><input type="range" min={8} max={64} value={len} onChange={(e) => setLen(+e.target.value)} className="w-full" /></Field>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={lower} onChange={(e) => setLower(e.target.checked)} /> lowercase</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={upper} onChange={(e) => setUpper(e.target.checked)} /> UPPERCASE</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={digits} onChange={(e) => setDigits(e.target.checked)} /> digits</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={symbols} onChange={(e) => setSymbols(e.target.checked)} /> symbols</label>
              <label className="flex items-center gap-2 col-span-2"><input type="checkbox" checked={avoidAmbig} onChange={(e) => setAvoidAmbig(e.target.checked)} /> avoid ambiguous (Il1O0`'"|)</label>
            </div>
          </div>
        </Card>
      ) : (
        <Card title="Passphrase"><Field label={`Words: ${words}`}><input type="range" min={3} max={10} value={words} onChange={(e) => setWords(+e.target.value)} className="w-full" /></Field></Card>
      )}
      <Card title="Output">
        <div className="flex items-center gap-2">
          <Input readOnly value={pw} className="font-mono" />
          <Button size="sm" onClick={gen}>Regenerate</Button>
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(pw); toast.success("Copied"); }}>Copy</Button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Metric label="Length" value={String(pw.length)} />
          <Metric label="Entropy" value={bits.toFixed(1)} unit="bits" />
          <div className="rounded-xl border border-border/60 bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Strength</div>
            <div className={`mt-1 text-lg font-semibold ${color}`}>{band}</div>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Generated with <code>crypto.getRandomValues</code> — never sent to a server.</p>
      </Card>
    </div>
  );
}

/* ===================== Subnet Calculator ===================== */
function SubnetCalcTool({ onContext }: { onContext: (s: string) => void }) {
  const [cidr, setCidr] = useState("10.0.0.0/24");
  const info = useMemo(() => {
    const m = cidr.trim().match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)$/);
    if (!m) return { error: "Format: A.B.C.D/nn" };
    const oct = m.slice(1, 5).map(Number);
    const bits = Number(m[5]);
    if (oct.some((o) => o < 0 || o > 255) || bits < 0 || bits > 32) return { error: "Octets 0–255, prefix 0–32." };
    const ip = ((oct[0] << 24) >>> 0) + (oct[1] << 16) + (oct[2] << 8) + oct[3];
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    const network = (ip & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const total = bits === 32 ? 1 : bits === 31 ? 2 : Math.pow(2, 32 - bits);
    const usable = bits >= 31 ? total : total - 2;
    const first = bits >= 31 ? network : network + 1;
    const last = bits >= 31 ? broadcast : broadcast - 1;
    const toIp = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 0xff).join(".");
    const cls = oct[0] < 128 ? "A" : oct[0] < 192 ? "B" : oct[0] < 224 ? "C" : oct[0] < 240 ? "D (multicast)" : "E (reserved)";
    const isPrivate = oct[0] === 10 || (oct[0] === 172 && oct[1] >= 16 && oct[1] <= 31) || (oct[0] === 192 && oct[1] === 168);
    return { ip: toIp(ip), mask: toIp(mask), network: toIp(network), broadcast: toIp(broadcast), first: toIp(first), last: toIp(last), total, usable, bits, cls, isPrivate };
  }, [cidr]);
  useMemo(() => onContext("error" in info ? `Subnet error: ${info.error}` : `Subnet ${cidr}: network ${info.network} mask ${info.mask}, range ${info.first}–${info.last}, usable ${info.usable}, class ${info.cls}${info.isPrivate ? " (RFC1918 private)" : ""}.`), [cidr, info, onContext]);
  return (
    <div className="grid gap-4">
      <Card title="CIDR">
        <Input value={cidr} onChange={(e) => setCidr(e.target.value)} className="font-mono" placeholder="10.0.0.0/24" />
        {"error" in info ? <p className="mt-2 text-xs text-rose-400">{info.error}</p> : null}
      </Card>
      {!("error" in info) && (
        <>
          <Card title="Network">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Metric label="Network" value={info.network} />
              <Metric label="Broadcast" value={info.broadcast} />
              <Metric label="Subnet mask" value={info.mask} />
              <Metric label="First host" value={info.first} />
              <Metric label="Last host" value={info.last} />
              <Metric label="Prefix" value={`/${info.bits}`} />
            </div>
          </Card>
          <Card title="Capacity">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Metric label="Total addresses" value={info.total.toLocaleString()} />
              <Metric label="Usable hosts" value={info.usable.toLocaleString()} />
              <Metric label="Class" value={info.cls} />
              <Metric label="Space" value={info.isPrivate ? "Private" : "Public"} />
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">/31 &amp; /32 are point-to-point/host special cases — no host reservation. Private ranges: 10/8, 172.16/12, 192.168/16.</p>
          </Card>
        </>
      )}
    </div>
  );
}

/* ===================== Classical Cipher Lab ===================== */
function CipherLabTool({ onContext }: { onContext: (s: string) => void }) {
  const [text, setText] = useState("Attack at dawn");
  const [algo, setAlgo] = useState<"caesar" | "rot13" | "atbash" | "xor">("caesar");
  const [shift, setShift] = useState(3);
  const [key, setKey] = useState("secret");
  const out = useMemo(() => {
    if (algo === "rot13") return text.replace(/[a-zA-Z]/g, (c) => { const base = c <= "Z" ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base); });
    if (algo === "caesar") { const s = ((shift % 26) + 26) % 26; return text.replace(/[a-zA-Z]/g, (c) => { const base = c <= "Z" ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - base + s) % 26) + base); }); }
    if (algo === "atbash") return text.replace(/[a-zA-Z]/g, (c) => { const base = c <= "Z" ? 65 : 97; return String.fromCharCode(base + 25 - (c.charCodeAt(0) - base)); });
    if (algo === "xor") { if (!key) return ""; const bytes = new TextEncoder().encode(text); const kb = new TextEncoder().encode(key); const res = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i++) res[i] = bytes[i] ^ kb[i % kb.length]; return Array.from(res).map((b) => b.toString(16).padStart(2, "0")).join(""); }
    return "";
  }, [text, algo, shift, key]);
  useMemo(() => onContext(`Classical cipher (${algo}) — input="${text}" → output="${out.slice(0, 200)}". Educational only.`), [algo, text, out, onContext]);
  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200/90">
        <strong className="text-amber-300">Educational only.</strong> These ciphers are broken in seconds. For real confidentiality use AES-GCM or ChaCha20-Poly1305 via a vetted library.
      </div>
      <Card title="Algorithm">
        <div className="flex flex-wrap gap-2">
          {(["caesar", "rot13", "atbash", "xor"] as const).map((a) => (
            <button key={a} onClick={() => setAlgo(a)} className={`rounded-full border px-3 py-1 text-xs ${algo === a ? "bg-primary text-primary-foreground border-primary" : "border-border bg-surface hover:border-primary/50"}`}>{a}</button>
          ))}
        </div>
        {algo === "caesar" && <div className="mt-3"><Field label={`Shift: ${shift}`}><input type="range" min={-25} max={25} value={shift} onChange={(e) => setShift(+e.target.value)} className="w-full" /></Field></div>}
        {algo === "xor" && <div className="mt-3"><Field label="XOR key"><Input value={key} onChange={(e) => setKey(e.target.value)} className="font-mono" /></Field></div>}
      </Card>
      <Card title="Plaintext"><Textarea value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs min-h-[100px]" /></Card>
      <Card title={algo === "xor" ? "Ciphertext (hex)" : "Ciphertext"}>
        <pre className="overflow-auto rounded-lg border border-border/60 bg-background/40 p-3 text-[11px] font-mono break-all">{out || "—"}</pre>
        <p className="mt-2 text-[11px] text-muted-foreground">Caesar/ROT13/Atbash are monoalphabetic and fall to frequency analysis. XOR with a repeating short key is broken by known-plaintext or Kasiski/Friedman analysis.</p>
      </Card>
    </div>
  );
}

