import { createFileRoute } from "@tanstack/react-router";
import { FileText, Plus, Folder, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/workspaces/$tool/files")({
  head: () => ({
    meta: [
      { title: "Project Files — Metrixcom" },
      { name: "description", content: "Manage and access all documents, code snippets, and research materials in your project workspace." },
      { property: "og:title", content: "Metrixcom Workspace Files" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: WorkspaceFiles,
});

function WorkspaceFiles() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search project files..." className="pl-9 bg-surface/50 border-border/50 text-xs h-9" />
        </div>
        <Button size="sm" className="gap-2 ml-4">
          <Plus className="h-4 w-4" /> Upload
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { name: 'Architecture.pdf', size: '2.4 MB', type: 'pdf' },
          { name: 'Schema.sql', size: '12 KB', type: 'code' },
          { name: 'Vision.docx', size: '45 KB', type: 'doc' },
        ].map((file, i) => (
          <div key={i} className="group flex flex-col items-center p-4 rounded-xl border border-border bg-surface/50 hover:bg-surface hover:border-primary/30 transition-all cursor-pointer">
            <div className="h-12 w-12 flex items-center justify-center rounded-lg bg-background/50 mb-3 group-hover:scale-105 transition-transform">
              <FileText className="h-6 w-6 text-primary/70" />
            </div>
            <span className="text-[11px] font-medium text-center truncate w-full mb-1">{file.name}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{file.size}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
