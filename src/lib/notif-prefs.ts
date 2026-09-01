// Lightweight synchronous cache for notification preferences.
// Written from Settings, read from TopBar / notification handler.

export type NotifPrefs = {
  email_updates: boolean;
  email_security: boolean;
  push_replies: boolean;
  marketing: boolean;
  sound: boolean;
  desktop: boolean;
  mobile_push: boolean;
  weekly_summary: boolean;
  billing: boolean;
};

export const NOTIF_DEFAULTS: NotifPrefs = {
  email_updates: true,
  email_security: true,
  push_replies: true,
  marketing: false,
  sound: true,
  desktop: false,
  mobile_push: false,
  weekly_summary: true,
  billing: true,
};

const KEY = "arch:notif-prefs";

export function loadNotifPrefs(): NotifPrefs {
  if (typeof window === "undefined") return NOTIF_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return NOTIF_DEFAULTS;
    return { ...NOTIF_DEFAULTS, ...(JSON.parse(raw) as Partial<NotifPrefs>) };
  } catch {
    return NOTIF_DEFAULTS;
  }
}

export function saveNotifPrefs(p: Partial<NotifPrefs>) {
  if (typeof window === "undefined") return;
  const next = { ...loadNotifPrefs(), ...p };
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

/** Play a short beep using WebAudio — no assets needed. */
export function playNotifSound() {
  if (typeof window === "undefined") return;
  const prefs = loadNotifPrefs();
  if (!prefs.sound) return;
  try {
    const AC =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.0001;
    o.connect(g).connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.stop(ctx.currentTime + 0.4);
    setTimeout(() => ctx.close(), 500);
  } catch {
    /* ignore */
  }
}

export async function requestDesktopPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const r = await Notification.requestPermission();
  return r === "granted";
}

export function showDesktopNotification(title: string, body?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  const prefs = loadNotifPrefs();
  if (!prefs.desktop || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch {
    /* ignore */
  }
}

export async function subscribeMobilePush(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  const ok = await requestDesktopPermission();
  return ok;
}
