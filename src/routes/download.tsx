import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/arch/page-shell";
import { Button } from "@/components/ui/button";
import { Download, Monitor, Smartphone, Apple, Chrome, Check, Package } from "lucide-react";
import winAsset from "../../public/downloads/Metrixcom-Windows-x64.zip.asset.json";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/download")({
  head: () => ({
    meta: [
      { title: "Download Metrixcom — Install on Desktop & Mobile" },
      { name: "description", content: "Install Metrixcom as a native-feeling app on Windows, macOS, Linux, Android, and iOS." },
    ],
  }),
  component: DownloadPage,
});

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform(): "windows" | "macos" | "linux" | "android" | "ios" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/win/i.test(ua)) return "windows";
  if (/mac/i.test(ua)) return "macos";
  if (/linux/i.test(ua)) return "linux";
  return "unknown";
}

function DownloadPage() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<ReturnType<typeof detectPlatform>>("unknown");

  useEffect(() => {
    setPlatform(detectPlatform());
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(!!standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      toast.success("Metrixcom installed");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) {
      toast.info("Use your browser menu → Install app (see steps below).");
      return;
    }
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") toast.success("Installing Metrixcom…");
    setDeferred(null);
  }

  const primaryLabel = installed
    ? "Already installed"
    : deferred
      ? "Install Metrixcom"
      : "Show install steps";

  const cards: { icon: typeof Monitor; title: string; body: string[]; active: boolean }[] = [
    {
      icon: Chrome,
      title: "Windows · macOS · Linux",
      active: platform === "windows" || platform === "macos" || platform === "linux",
      body: [
        "Open Metrixcom in Chrome, Edge, Brave, or Arc.",
        "Click the install icon in the address bar (or ⋮ menu → Install Metrixcom).",
        "Launch it from your desktop, Start menu, or Applications like any native app.",
      ],
    },
    {
      icon: Smartphone,
      title: "Android",
      active: platform === "android",
      body: [
        "Open Metrixcom in Chrome.",
        "Tap ⋮ → Install app (or Add to Home screen).",
        "Confirm — the app icon appears on your home screen.",
      ],
    },
    {
      icon: Apple,
      title: "iOS · iPadOS",
      active: platform === "ios",
      body: [
        "Open Metrixcom in Safari (not Chrome — iOS requires Safari).",
        "Tap the Share icon → Add to Home Screen.",
        "Tap Add — Metrixcom runs full-screen with its own icon.",
      ],
    },
  ];

  return (
    <PageShell
      title="Download Metrixcom"
      description="Install Metrixcom as a real app on any device. No store, no waiting — one tap."
    >
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-[15px] font-semibold">Install as an app</div>
            <div className="text-[13px] text-muted-foreground">
              Works offline-friendly, launches fast, no browser tabs.
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={install} disabled={installed} className="gap-2">
            {installed ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {primaryLabel}
          </Button>
          <div className="text-[12.5px] text-muted-foreground">
            {installed
              ? "Metrixcom is already installed on this device."
              : deferred
                ? "Your browser supports one-tap install."
                : "Your browser needs the manual steps below."}
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <div className="text-[13.5px] font-medium">Windows desktop installer</div>
          </div>
          <div className="text-[12.5px] text-muted-foreground mb-3">
            Download the native <code className="text-foreground">Metrixcom.exe</code> app
            {" "}({Math.round(winAsset.size / 1024 / 1024)} MB). Extract the ZIP and run{" "}
            <code className="text-foreground">Metrixcom.exe</code> — no installer required, no admin rights needed.
          </div>
          <a
            href={winAsset.url}
            download={winAsset.original_filename}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-[13px] font-medium hover:opacity-90 transition-opacity"
          >
            <Download className="h-4 w-4" />
            Download for Windows (x64)
          </a>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div
            key={c.title}
            className={`rounded-2xl border p-5 bg-surface ${
              c.active ? "border-primary/60 ring-1 ring-primary/30" : "border-border"
            }`}
          >
            <div className="flex items-center gap-2">
              <c.icon className="h-4 w-4 text-muted-foreground" />
              <div className="text-[13.5px] font-medium">{c.title}</div>
              {c.active && (
                <span className="ml-auto text-[10.5px] uppercase tracking-wide text-primary">
                  You're here
                </span>
              )}
            </div>
            <ol className="mt-3 space-y-2 text-[12.5px] text-muted-foreground list-decimal pl-4">
              {c.body.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-5">
        <div className="text-[13.5px] font-medium">Why the installed app is better</div>
        <ul className="mt-2 space-y-1.5 text-[12.5px] text-muted-foreground list-disc pl-5">
          <li>Launches from your dock / home screen with its own icon.</li>
          <li>Runs in a clean window — no browser chrome, no distractions.</li>
          <li>Faster startup and smoother animations.</li>
          <li>Push notifications and background sync where supported.</li>
        </ul>
      </div>
    </PageShell>
  );
}
