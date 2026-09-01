// Behavioral biometrics: captures a lightweight typing/pointer fingerprint
// in-browser, compares against a per-user baseline, and flags anomalies.
// No raw keystrokes or content are stored — only aggregate statistics.

const KEY = "arch-behavior-profile-v1";
const SAMPLE_WINDOW = 40; // events per sample
const MIN_SAMPLES_FOR_BASELINE = 3;
const ANOMALY_Z = 3.0; // z-score threshold

type Profile = {
  updatedAt: number;
  samples: Array<{
    dwellMean: number; // avg key hold time (ms)
    flightMean: number; // avg inter-key interval (ms)
    pointerVel: number; // avg pointer velocity (px/ms)
    pointerJitter: number; // stddev of angle changes
  }>;
};

function load(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Profile;
  } catch { /* empty */ }
  return { updatedAt: Date.now(), samples: [] };
}

function save(p: Profile) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* empty */ }
}

let keyDownAt: Record<string, number> = {};
let lastKeyUp = 0;
let dwellTimes: number[] = [];
let flightTimes: number[] = [];
let lastPointer: { x: number; y: number; t: number; angle?: number } | null = null;
let pointerVels: number[] = [];
let angleDeltas: number[] = [];
let listening = false;

function mean(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function stddev(arr: number[]) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

function flush(): { anomaly: boolean; score: number } | null {
  if (dwellTimes.length + pointerVels.length < SAMPLE_WINDOW) return null;
  const sample = {
    dwellMean: mean(dwellTimes),
    flightMean: mean(flightTimes),
    pointerVel: mean(pointerVels),
    pointerJitter: stddev(angleDeltas),
  };
  dwellTimes = []; flightTimes = []; pointerVels = []; angleDeltas = [];

  const profile = load();
  let anomaly = false;
  let score = 0;
  if (profile.samples.length >= MIN_SAMPLES_FOR_BASELINE) {
    const keys: (keyof typeof sample)[] = ["dwellMean", "flightMean", "pointerVel", "pointerJitter"];
    for (const k of keys) {
      const vals = profile.samples.map((s) => s[k]);
      const m = mean(vals);
      const sd = stddev(vals) || 1;
      const z = Math.abs((sample[k] - m) / sd);
      score = Math.max(score, z);
      if (z > ANOMALY_Z) anomaly = true;
    }
  }
  // Retain last 20 samples as rolling baseline.
  profile.samples.push(sample);
  if (profile.samples.length > 20) profile.samples.shift();
  profile.updatedAt = Date.now();
  save(profile);
  return { anomaly, score };
}

export function startBehavioralBiometrics(onAnomaly?: (score: number) => void) {
  if (typeof window === "undefined" || listening) return () => { /* empty */ };
  listening = true;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key.length !== 1 && e.key !== "Backspace") return;
    keyDownAt[e.code] = performance.now();
    if (lastKeyUp) flightTimes.push(performance.now() - lastKeyUp);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    const down = keyDownAt[e.code];
    if (down) {
      dwellTimes.push(performance.now() - down);
      delete keyDownAt[e.code];
    }
    lastKeyUp = performance.now();
    const r = flush();
    if (r?.anomaly) onAnomaly?.(r.score);
  };
  const onPointer = (e: PointerEvent) => {
    const now = performance.now();
    if (lastPointer) {
      const dt = now - lastPointer.t;
      if (dt > 0 && dt < 500) {
        const dx = e.clientX - lastPointer.x;
        const dy = e.clientY - lastPointer.y;
        const dist = Math.hypot(dx, dy);
        pointerVels.push(dist / dt);
        const angle = Math.atan2(dy, dx);
        if (lastPointer.angle !== undefined) angleDeltas.push(Math.abs(angle - lastPointer.angle));
        lastPointer = { x: e.clientX, y: e.clientY, t: now, angle };
      } else {
        lastPointer = { x: e.clientX, y: e.clientY, t: now };
      }
    } else {
      lastPointer = { x: e.clientX, y: e.clientY, t: now };
    }
    const r = flush();
    if (r?.anomaly) onAnomaly?.(r.score);
  };

  window.addEventListener("keydown", onKeyDown, { passive: true });
  window.addEventListener("keyup", onKeyUp, { passive: true });
  window.addEventListener("pointermove", onPointer, { passive: true });

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("pointermove", onPointer);
    listening = false;
  };
}

export function resetBehavioralBaseline() {
  try { localStorage.removeItem(KEY); } catch { /* empty */ }
}

export function getBehavioralProfileMeta() {
  const p = load();
  return { samples: p.samples.length, updatedAt: p.updatedAt };
}
