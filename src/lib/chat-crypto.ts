// Client-side AES-GCM encryption for chat sync blobs.
//
// Design goals (see Settings → Privacy):
//   • Encrypt chat history *at rest* on the server. The server stores only
//     ciphertext in `user_chats.ciphertext`; the raw plaintext `chats` column
//     is never written when encryption is available.
//   • The key is generated in the browser, stored ONLY in localStorage under
//     the current user id, and never uploaded, logged, or exchanged. If a
//     user signs in on a new device, that device generates its own fresh key
//     and starts a new local history — the server cannot decrypt the old blob.
//   • This is not end-to-end encryption for the AI turn itself: the model
//     provider still receives plaintext to compute a reply (they cannot answer
//     ciphertext). Encryption covers the *stored* history only. The UI states
//     this plainly in the privacy disclaimer.

const KEY_PREFIX = "arch:e2e-key:v1";

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function subtle(): SubtleCrypto | null {
  if (typeof window === "undefined") return null;
  return window.crypto?.subtle ?? null;
}

async function loadOrCreateKey(uid: string): Promise<CryptoKey | null> {
  const sc = subtle();
  if (!sc) return null;
  const storageKey = `${KEY_PREFIX}:${uid}`;
  let rawB64 = localStorage.getItem(storageKey);
  if (!rawB64) {
    const bytes = new Uint8Array(new ArrayBuffer(32));
    window.crypto.getRandomValues(bytes);
    rawB64 = b64encode(bytes);
    localStorage.setItem(storageKey, rawB64);
  }
  const raw = b64decode(rawB64);
  return sc.importKey("raw", raw as BufferSource, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export interface EncryptedBlob {
  v: 1;
  iv: string;   // base64
  ct: string;   // base64 ciphertext
}

export async function encryptChats(uid: string, chats: unknown): Promise<EncryptedBlob | null> {
  const sc = subtle();
  if (!sc) return null;
  const key = await loadOrCreateKey(uid);
  if (!key) return null;
  const iv = new Uint8Array(12);
  window.crypto.getRandomValues(iv);
  const plaintext = new TextEncoder().encode(JSON.stringify(chats));
  const ct = await sc.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { v: 1, iv: b64encode(iv), ct: b64encode(new Uint8Array(ct)) };
}

export async function decryptChats<T = unknown>(uid: string, blob: EncryptedBlob | string | null): Promise<T | null> {
  if (!blob) return null;
  const sc = subtle();
  if (!sc) return null;
  const key = await loadOrCreateKey(uid);
  if (!key) return null;
  const parsed: EncryptedBlob | null = typeof blob === "string"
    ? (() => { try { return JSON.parse(blob) as EncryptedBlob; } catch { return null; } })()
    : blob;
  if (!parsed || parsed.v !== 1) return null;
  try {
    const iv = b64decode(parsed.iv);
    const ct = b64decode(parsed.ct);
    const pt = await sc.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, ct as BufferSource);
    return JSON.parse(new TextDecoder().decode(pt)) as T;
  } catch {
    // Wrong key (new device) or tampered blob — caller falls back to local.
    return null;
  }
}

export function hasCryptoSupport(): boolean {
  return subtle() !== null;
}

export function forgetKey(uid: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${KEY_PREFIX}:${uid}`);
}
