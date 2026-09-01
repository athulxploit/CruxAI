// RFC 6238 TOTP verification (SHA-1, 30s step, 6 digits).
// Pure browser: uses Web Crypto for HMAC-SHA1.

function base32Decode(input: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = input.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  const out: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx < 0) throw new Error("Invalid base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

async function hotp(secret: Uint8Array, counter: number, digits = 6): Promise<string> {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  // JS bitwise ops are 32-bit; write hi/lo separately.
  view.setUint32(0, Math.floor(counter / 0x100000000));
  view.setUint32(4, counter >>> 0);
  const key = await crypto.subtle.importKey(
    "raw",
    secret as BufferSource,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
  const offset = sig[sig.length - 1] & 0x0f;
  const code =
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff);
  const mod = 10 ** digits;
  return (code % mod).toString().padStart(digits, "0");
}

export async function verifyTotp(secretBase32: string, code: string, window = 1): Promise<boolean> {
  const cleaned = code.replace(/\D/g, "");
  if (cleaned.length !== 6) return false;
  let secret: Uint8Array;
  try {
    secret = base32Decode(secretBase32);
  } catch {
    return false;
  }
  const step = Math.floor(Date.now() / 1000 / 30);
  for (let w = -window; w <= window; w++) {
    const c = await hotp(secret, step + w);
    if (c === cleaned) return true;
  }
  return false;
}

export function otpauthUri(secretBase32: string, account: string, issuer = "Metrixcom"): string {
  const enc = encodeURIComponent;
  return `otpauth://totp/${enc(issuer)}:${enc(account)}?secret=${enc(secretBase32)}&issuer=${enc(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
