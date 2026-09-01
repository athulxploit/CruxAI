// Central input sanitization utilities — defense-in-depth.
//
// Every user-typed string that flows into the AI proxy, database, or logs
// passes through `sanitizeText`. This is layered on top of server-side
// validation in src/routes/api/ai-stream.ts — never rely on it alone.
//
// Guarantees:
//   • Strips ASCII control chars (0x00-0x08, 0x0B-0x1F, 0x7F) except \t \n \r.
//   • Removes zero-width / bidi override chars used in homoglyph attacks.
//   • Normalises to NFC to prevent Unicode look-alike bypasses.
//   • Caps length to prevent oversize payloads (default 32k).
//   • Trims surrounding whitespace.

const ZERO_WIDTH = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;
const CTRL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export function sanitizeText(input: unknown, maxLen = 32_000): string {
  if (input == null) return "";
  let s = String(input);
  try { s = s.normalize("NFC"); } catch { /* older engines */ }
  s = s.replace(CTRL, "").replace(ZERO_WIDTH, "");
  s = s.trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

// Escape a string for safe interpolation into HTML text nodes / attributes.
// Prefer React children over this; use only when constructing raw HTML.
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Allow only http/https URLs — reject javascript:, data:, vbscript:, etc.
export function safeUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch { return null; }
}

// Redact obvious secrets before logging (tokens, bearer, api keys, emails).
export function redactForLog(s: string): string {
  return s
    .replace(/\b(sk|pk|sb|Bearer)[-_ ]?[A-Za-z0-9]{16,}\b/g, "[REDACTED]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .slice(0, 2000);
}
