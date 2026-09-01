import { useState } from "react";
import { Download, FileText, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { FILE_KIND_LABEL, generateAndDownload, type FileBlock } from "@/lib/file-gen";

export function FileArtifacts({ files }: { files: FileBlock[] }) {
  if (!files.length) return null;
  return (
    <div className="mt-3 mb-2 flex flex-col gap-2">
      {files.map((f, i) => (
        <FileCard key={`${f.name}-${i}`} file={f} />
      ))}
    </div>
  );
}

function FileCard({ file }: { file: FileBlock }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function onDownload() {
    if (state === "loading") return;
    setState("loading");
    try {
      await generateAndDownload(file);
      setState("done");
      setTimeout(() => setState("idle"), 1800);
    } catch (e) {
      setState("idle");
      toast.error(e instanceof Error ? e.message : "Couldn't generate file");
    }
  }

  return (
    <button
      onClick={onDownload}
      className="group flex items-center gap-3 rounded-2xl border border-border bg-surface hover:bg-surface-elevated transition-colors px-3.5 py-2.5 text-left w-full max-w-md"
    >
      <div className="h-9 w-9 rounded-xl bg-surface-elevated border border-border flex items-center justify-center shrink-0">
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-medium truncate">{file.name}</div>
        <div className="text-[11.5px] text-muted-foreground truncate">
          {FILE_KIND_LABEL[file.kind]} · click to download
        </div>
      </div>
      <div className="shrink-0 text-muted-foreground group-hover:text-foreground">
        {state === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "done" ? (
          <Check className="h-4 w-4 text-emerald-400" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </div>
    </button>
  );
}
