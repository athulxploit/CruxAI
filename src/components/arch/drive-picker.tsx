import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Search as SearchIcon, FileText, Image as ImageIcon, File as FileIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listDriveFiles, importDriveFile, type DriveFile } from "@/lib/gdrive.functions";

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return <ImageIcon className="h-4 w-4 shrink-0" />;
  if (mime.includes("pdf") || mime.includes("document") || mime.includes("text"))
    return <FileText className="h-4 w-4 shrink-0" />;
  return <FileIcon className="h-4 w-4 shrink-0" />;
}

function humanSize(n?: string) {
  if (!n) return "";
  const b = Number(n);
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export interface DrivePickedAttachment {
  name: string;
  size: number;
  path: string;
  mime: string;
}

export function DrivePicker({
  open,
  onOpenChange,
  onPicked,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** If provided, imported file is passed back for chat attachment. Otherwise picker just imports it into user files. */
  onPicked?: (a: DrivePickedAttachment) => void;
}) {
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const list = useServerFn(listDriveFiles);
  const importFn = useServerFn(importDriveFile);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    list({ data: { query: query.trim() || undefined } })
      .then((r) => {
        if (!cancelled) setFiles(r.files);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to list Drive files"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, query, list]);

  async function pick(f: DriveFile) {
    setImporting(f.id);
    try {
      const a = await importFn({
        data: { fileId: f.id, name: f.name, mimeType: f.mimeType },
      });
      toast.success(`${a.name} imported`);
      onPicked?.(a);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-border rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle>Google Drive</DialogTitle>
          <DialogDescription>
            Pick a file to import. Google Docs and Slides are exported as PDF; Sheets as CSV.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Drive…"
            className="pl-9"
          />
        </div>
        <div className="max-h-80 overflow-y-auto -mx-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
            </div>
          ) : files.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-muted-foreground">
              No files found.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {files.map((f) => (
                <li key={f.id}>
                  <button
                    disabled={!!importing}
                    onClick={() => pick(f)}
                    className="w-full flex items-center gap-3 px-2 py-2.5 text-left hover:bg-secondary/60 rounded-lg disabled:opacity-60"
                  >
                    {iconFor(f.mimeType)}
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] truncate">{f.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {humanSize(f.size)}
                        {f.modifiedTime
                          ? ` · ${new Date(f.modifiedTime).toLocaleDateString()}`
                          : ""}
                      </div>
                    </div>
                    {importing === f.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
