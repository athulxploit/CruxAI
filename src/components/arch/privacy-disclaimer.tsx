import { ShieldCheck, Info } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISS_KEY = "arch:privacy-disclaimer:dismissed:v1";

/**
 * Small always-visible line under the composer stating the data-protection
 * guarantees and their honest limits. Users can dismiss the expanded card;
 * the compact footer line remains.
 */
export function PrivacyDisclaimer() {
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try { setDismissed(localStorage.getItem(DISMISS_KEY) === "1"); } catch { /* noop */ }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
    setDismissed(true);
  };

  return (
    <div className="mx-auto max-w-3xl w-full">
      {!dismissed && (
        <div className="mb-2 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5 text-[12px] text-muted-foreground">
          <div className="flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <div className="flex-1 leading-relaxed">
              <span className="text-foreground font-medium">Your data, minimized.</span>{" "}
              Chats are encrypted at rest with a key stored only on this device — the server can't read them.
              Unsaved chats are automatically deleted after <b>7 days</b>. Pin a chat to keep it.
              <div className="mt-1 text-[11px] text-muted-foreground/80">
                Note: to compute a reply, the AI provider still sees your prompt for that turn. True end-to-end encryption isn't possible when the model runs remotely.
              </div>
            </div>
            <button
              onClick={dismiss}
              className="text-[11px] text-muted-foreground/70 hover:text-foreground shrink-0 px-1"
              aria-label="Dismiss privacy notice"
            >
              Got it
            </button>
          </div>
        </div>
      )}
      <div className="text-center text-[10.5px] text-muted-foreground/70 flex items-center justify-center gap-1">
        <Info className="h-3 w-3" />
        Encrypted at rest · unsaved chats auto-delete after 7 days · pin to keep
      </div>
    </div>
  );
}
