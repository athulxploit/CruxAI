import type { AgentId } from "./agents";

const CIPHER = [
  "hack", "exploit", "vulnerab", "pentest", "penetration", "cve", "malware",
  "phish", "ransomware", "reverse engineer", "payload", "xss", "sql injection",
  "sqli", "csrf", "burp", "nmap", "metasploit", "red team", "blue team",
  "security", "cyber", "firewall", "encryption", "decrypt", "brute force",
  "recon", "osint", "forensic", "rootkit", "backdoor", "zero day", "0day",
];

const FORGE = [
  "code", "coding", "program", "programming", "function", "class ", "bug",
  "debug", "stack trace", "compile", "typescript", "javascript", "python",
  "react", "node", "api ", "sdk", "algorithm", "regex", "sql ", "schema",
  "database", "docker", "kubernetes", "refactor", "unit test", "npm", "bun",
  "vite", "next.js", "tailwind", "css", "html", "rust", "golang", "java ",
  "c++", "swift", "kotlin", "framework", "library", "endpoint", "server",
  "frontend", "backend", "devops", "git ", "github", "commit", "merge",
];

export function pickAgentForPrompt(text: string): AgentId {
  const t = ` ${text.toLowerCase()} `;
  const score = (words: string[]) => words.reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
  const cipher = score(CIPHER);
  const forge = score(FORGE);
  if (cipher > forge && cipher > 0) return "cipher-1";
  if (forge > 0) return "forge-1";
  return "pulse-1";
}

const KEY = "arch:arch_mode";

export function setArchMode(on: boolean) {
  if (typeof window === "undefined") return;
  if (on) localStorage.setItem(KEY, "1");
  else localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("arch:arch_mode", { detail: on }));
}

export function isArchModeOn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) === "1";
}
