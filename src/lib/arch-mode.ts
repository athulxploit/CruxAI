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
