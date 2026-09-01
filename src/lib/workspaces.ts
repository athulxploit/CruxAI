// Metrixcom Workspaces — dedicated professional tools for software
// engineering and cybersecurity. Outputs are planning & educational aids.

export type WorkspaceId =
  // Professional Coding
  | "code-preview"
  | "code-review"
  | "refactor-lab"
  | "system-design"
  | "regex-lab"
  | "api-designer"
  | "algo-analyzer"
  | "json-lab"
  | "diff-viewer"
  | "cron-lab"
  | "uuid-lab"
  // Cybersecurity & Pentest (defensive / authorized-testing only)
  | "recon-planner"
  | "threat-model"
  | "owasp-audit"
  | "password-analyzer"
  | "hash-lab"
  | "cvss-calculator"
  | "jwt-inspector"
  | "password-generator"
  | "subnet-calc"
  | "cipher-lab";

export type WorkspaceCategory = "coding" | "security";

export type Workspace = {
  id: WorkspaceId;
  icon: string;
  title: string;
  tag: string;
  blurb: string;
  category: WorkspaceCategory;
};

export const WORKSPACES: Workspace[] = [
  // Coding
  { id: "code-preview", icon: "🖥️", title: "Live Code Preview", tag: "Forge-1", blurb: "Build React/TSX components or plain HTML-CSS-JS and watch them render live — device sizes, console, and export.", category: "coding" },
  { id: "code-review", icon: "🔍", title: "Code Review", tag: "Forge-1", blurb: "Paste code; get a structured review — correctness, perf, security, style.", category: "coding" },
  { id: "refactor-lab", icon: "🧪", title: "Refactor Lab", tag: "Forge-1", blurb: "Refactor towards a goal: readability, testability, performance, or functional style.", category: "coding" },
  { id: "system-design", icon: "🏗️", title: "System Design Studio", tag: "Architecture", blurb: "Traffic, storage, and bandwidth estimator with stack tradeoffs.", category: "coding" },
  { id: "regex-lab", icon: "🧬", title: "Regex Lab", tag: "DevTools", blurb: "Live regex tester with capture groups, flags, and match preview.", category: "coding" },
  { id: "api-designer", icon: "🧱", title: "API Designer", tag: "REST/GraphQL", blurb: "Design resources, fields, and operations; generate an OpenAPI skeleton.", category: "coding" },
  { id: "algo-analyzer", icon: "📐", title: "Algorithm Analyzer", tag: "Complexity", blurb: "Time & space complexity for common structures, with growth at scale.", category: "coding" },
  { id: "json-lab", icon: "🧾", title: "JSON Lab", tag: "DevTools", blurb: "Validate, format, minify, and query JSON with JSONPath — instantly in-browser.", category: "coding" },
  { id: "diff-viewer", icon: "🔀", title: "Diff Viewer", tag: "DevTools", blurb: "Line-by-line diff between two texts with added/removed highlighting.", category: "coding" },
  { id: "cron-lab", icon: "⏰", title: "Cron Lab", tag: "Schedulers", blurb: "Parse cron expressions, get human description and next 5 scheduled runs.", category: "coding" },
  { id: "uuid-lab", icon: "🪪", title: "UUID & Time Lab", tag: "DevTools", blurb: "Generate UUID v4 in bulk and convert Unix timestamps ↔ ISO 8601.", category: "coding" },
  // Cybersecurity & Pentest — authorized/defensive
  { id: "recon-planner", icon: "🎯", title: "Engagement Planner", tag: "Cipher-1", blurb: "Scope, authorization, RoE, and reporting checklist for an authorized pentest.", category: "security" },
  { id: "threat-model", icon: "🛡️", title: "Threat Model (STRIDE)", tag: "Cipher-1", blurb: "STRIDE builder with assets, trust boundaries, and mitigations.", category: "security" },
  { id: "owasp-audit", icon: "🕸️", title: "OWASP Top 10 Audit", tag: "Web AppSec", blurb: "Walk through OWASP Top 10 (2021) against your own web app.", category: "security" },
  { id: "password-analyzer", icon: "🔑", title: "Password Strength", tag: "Cipher-1", blurb: "Live entropy, character class, and offline-crack-time estimator.", category: "security" },
  { id: "hash-lab", icon: "🧮", title: "Hash & Encoding Lab", tag: "DevTools", blurb: "SHA-256, SHA-1, Base64, URL & hex encoding for defensive analysis.", category: "security" },
  { id: "cvss-calculator", icon: "📉", title: "CVSS 3.1 Calculator", tag: "Vuln Mgmt", blurb: "Compute base score & vector string with severity rating.", category: "security" },
  { id: "jwt-inspector", icon: "🪙", title: "JWT Inspector", tag: "AppSec", blurb: "Decode header & payload, inspect algorithm, expiry, and common-claim risks.", category: "security" },
  { id: "password-generator", icon: "🎲", title: "Password Generator", tag: "Cipher-1", blurb: "Cryptographically secure passwords and passphrases with live entropy.", category: "security" },
  { id: "subnet-calc", icon: "🌐", title: "Subnet Calculator", tag: "Network", blurb: "IPv4 CIDR: network, broadcast, mask, host range, usable count.", category: "security" },
  { id: "cipher-lab", icon: "🔐", title: "Classical Cipher Lab", tag: "CryptoEdu", blurb: "Caesar/ROT13/XOR/Atbash for CTF-style education — never for real secrets.", category: "security" },
];

export const WORKSPACE_DISCLAIMER =
  "Planning & educational aid only. Not a substitute for formal engineering analysis, qualification testing, or regulatory validation.";

// Handoff prompts loaded into the chat when the user clicks "Ask Metrixcom".
export const WORKSPACE_PROMPT: Record<WorkspaceId, (ctx: string) => string> = {
  "code-preview": (ctx) =>
    `Act as a senior frontend engineer. Review this live sketch (React/TSX component or HTML/CSS/JS page): fix bugs, improve semantics and accessibility (ARIA, contrast, keyboard), tighten responsive layout, and modernise the CSS. Return the complete updated code blocks in the same language as the sketch so they can be pasted straight back into the preview.\n\n${ctx}`,
  "code-review": (ctx) =>

    `Act as a senior staff engineer performing a rigorous code review. Provide a structured report: (1) Correctness issues & bugs, (2) Performance concerns, (3) Security risks (OWASP-aware), (4) Readability & naming, (5) Test gaps, (6) Concrete patch suggestions with diff-style snippets. Rank findings by severity.\n\n${ctx}`,
  "refactor-lab": (ctx) =>
    `Act as a refactoring expert. Produce a refactored version of the code below optimised for the stated goal, preserving public behaviour. Explain each change, note any behavioural risks, and list the tests you would add to lock the new shape.\n\n${ctx}`,
  "system-design": (ctx) =>
    `Act as a principal architect. From these capacity numbers, propose a system design: components, data stores, caching, queueing, sharding & replication strategy, failure modes, and back-of-envelope cost. Include a simple ASCII diagram.\n\n${ctx}`,
  "regex-lab": (ctx) =>
    `Act as a regex expert. Review this pattern for correctness, backtracking / ReDoS risk, and readability. Provide an equivalent, safer, better-commented version and 5 edge-case test strings.\n\n${ctx}`,
  "api-designer": (ctx) =>
    `Act as an API designer. Turn this resource sketch into a production-grade OpenAPI 3.1 skeleton: paths, methods, request/response schemas, error model, auth, pagination, idempotency, and versioning notes.\n\n${ctx}`,
  "algo-analyzer": (ctx) =>
    `Act as an algorithms specialist. For this problem/data structure, discuss time & space complexity, best/avg/worst cases, cache behaviour, and 2 alternative approaches with tradeoffs. Recommend the best pick for the stated scale.\n\n${ctx}`,
  "recon-planner": (ctx) =>
    `Act as a lead penetration tester. Based on this authorized-engagement brief, produce a rules-of-engagement document: scope in/out, permitted techniques, test windows, comms plan, evidence handling, and reporting template. Refuse or flag anything outside written authorization.\n\n${ctx}`,
  "threat-model": (ctx) =>
    `Act as an application security architect. Review this STRIDE model, add missing threats per element, propose concrete mitigations mapped to OWASP ASVS controls, and rank residual risk.\n\n${ctx}`,
  "owasp-audit": (ctx) =>
    `Act as a web application security auditor. Walk through OWASP Top 10 (2021) against this application. For each category, state observed posture, evidence needed, and remediation guidance. Emphasise defensive fixes, not exploitation payloads.\n\n${ctx}`,
  "password-analyzer": (ctx) =>
    `Act as an authentication security engineer. Review this password/passphrase policy and the sample entropy estimate. Recommend a policy consistent with NIST SP 800-63B: length, blocklist, breach checks, MFA, and rate-limit / lockout guidance.\n\n${ctx}`,
  "hash-lab": (ctx) =>
    `Act as a defensive cryptography reviewer. Given this hash/encoding transcript, discuss appropriate algorithm choice (e.g. Argon2id vs bcrypt vs SHA-256), when to use HMAC, salt/pepper handling, and when encoding is NOT encryption.\n\n${ctx}`,
  "cvss-calculator": (ctx) =>
    `Act as a vulnerability manager. From this CVSS 3.1 vector, produce a triage note: severity band, likely exploitability, expected business impact, temporal considerations, and a recommended SLA (e.g. patch within X days) per typical enterprise policy.\n\n${ctx}`,
  "json-lab": (ctx) =>
    `Act as a senior backend engineer. Review this JSON payload for schema consistency, naming, nullability, and API-response ergonomics. Suggest a matching JSON Schema (draft 2020-12) and flag risky shapes.\n\n${ctx}`,
  "diff-viewer": (ctx) =>
    `Act as a code reviewer. Explain the intent and risk of this diff, highlight logical/behavioural changes, missing tests, and any subtle regressions. Propose a review checklist.\n\n${ctx}`,
  "cron-lab": (ctx) =>
    `Act as an SRE. Review this cron schedule for timezone/DST pitfalls, thundering-herd risk, missed-run behaviour, and idempotency. Recommend safer patterns (jitter, distributed locks, retries).\n\n${ctx}`,
  "uuid-lab": (ctx) =>
    `Act as a systems engineer. Discuss identifier strategy tradeoffs (UUID v4 vs v7 vs ULID vs snowflake) for the described use case: index locality, sort order, size, privacy, and cross-region uniqueness.\n\n${ctx}`,
  "jwt-inspector": (ctx) =>
    `Act as an application security engineer. Given this JWT header/payload summary, discuss algorithm choice (avoid HS/none pitfalls), key management, expiry and refresh strategy, audience/issuer validation, and revocation. Do NOT produce forged tokens.\n\n${ctx}`,
  "password-generator": (ctx) =>
    `Act as an authentication security engineer. Turn this password/passphrase policy into a NIST SP 800-63B-aligned recommendation: length, blocklist, breach-check, rate-limit, MFA, and rotation guidance.\n\n${ctx}`,
  "subnet-calc": (ctx) =>
    `Act as a network engineer. Review this IPv4 plan: subnet sizing, waste, growth headroom, VLSM opportunities, and security-group / route-table implications for a typical cloud VPC.\n\n${ctx}`,
  "cipher-lab": (ctx) =>
    `Act as a defensive cryptography reviewer. Given this classical cipher exercise, explain why it is educational only, discuss what modern algorithms replace it (AES-GCM, ChaCha20-Poly1305), and outline correct key/IV handling.\n\n${ctx}`,
};
