// Lightweight haptic feedback utility using the Vibration API.
// Real feedback on Android/mobile Chrome. Silently no-ops on unsupported
// devices (iOS Safari, most desktops) — same behavior as ChatGPT.

const KEY = "arch:haptics-enabled";

export type HapticPattern = "light" | "medium" | "heavy" | "success" | "warning" | "error" | "selection";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 35,
  selection: 8,
  success: [12, 40, 18],
  warning: [20, 60, 20],
  error: [30, 50, 30, 50, 30],
};

export function isHapticsSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return typeof navigator.vibrate === "function";
}

export function isHapticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setHapticsEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function haptic(pattern: HapticPattern = "light"): boolean {
  if (!isHapticsSupported() || !isHapticsEnabled()) return false;
  try {
    return navigator.vibrate(PATTERNS[pattern]);
  } catch {
    return false;
  }
}
