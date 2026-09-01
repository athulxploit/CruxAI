import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

function hmacKey(): Buffer {
  const raw = process.env.APP_USER_CONNECTION_KEY_SECRET;
  if (!raw) throw new Error("APP_USER_CONNECTION_KEY_SECRET is not set");
  return Buffer.from(raw, "base64");
}

export function signGithubState(payload: { userId: string; origin: string }): string {
  const body = { ...payload, n: randomBytes(8).toString("hex"), ts: Date.now() };
  const b64 = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", hmacKey()).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyGithubState(
  state: string,
): { userId: string; origin: string; ts: number } | null {
  const [b64, sig] = state.split(".");
  if (!b64 || !sig) return null;
  const expected = createHmac("sha256", hmacKey()).update(b64).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
    if (!body?.userId || !body?.origin || !body?.ts) return null;
    if (Date.now() - Number(body.ts) > 15 * 60 * 1000) return null;
    return { userId: body.userId, origin: body.origin, ts: body.ts };
  } catch {
    return null;
  }
}
