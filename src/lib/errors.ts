/**
 * Friendly-error helpers. Keep raw provider/DB details in server logs and
 * return a short, user-safe message across the RPC boundary.
 */
export function friendly(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  // Strip anything that looks like a stack trace, URL, key, or JSON blob.
  const cleaned = msg
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "")
    .replace(/[{[].*[}\]]/gs, "")
    .trim();
  if (!cleaned) return fallback;
  // Map a few common backend signals to friendly copy.
  if (/rate limit|429/i.test(cleaned)) return "You're going too fast — please wait a moment and try again.";
  if (/timeout|timed out/i.test(cleaned)) return "The request took too long. Please try again.";
  if (/unauthor|401|403/i.test(cleaned)) return "You're not allowed to do that.";
  if (/network|fetch failed|ECONN/i.test(cleaned)) return "Network issue — please check your connection.";
  if (cleaned.length > 140) return fallback;
  return cleaned;
}

export function logServer(scope: string, err: unknown) {
  // eslint-disable-next-line no-console
  console.error(`[${scope}]`, err);
}
