// File generation for Metrixcom replies.
// The model emits blocks like:
//   [[FILE:pdf:invoice.pdf]]
//   # Invoice
//   ...content in markdown...
//   [[/FILE]]
//
// Supported types: pdf, docx, txt, md, csv, json, html
// We parse them out of the assistant message and render download buttons.

export type FileKind = "pdf" | "docx" | "txt" | "md" | "csv" | "json" | "html";

export interface FileBlock {
  kind: FileKind;
  name: string;
  content: string;
}

export interface ParsedContent {
  cleaned: string;    // markdown with FILE blocks stripped (a small badge inserted in place)
  files: FileBlock[];
}

const FILE_RE = /\[\[FILE:(pdf|docx|txt|md|csv|json|html):([^\]\n]+?)\]\]\s*\n?([\s\S]*?)\n?\[\[\/FILE\]\]/gi;

export function parseFileBlocks(raw: string): ParsedContent {
  const files: FileBlock[] = [];
  const cleaned = raw.replace(FILE_RE, (_m, kind: string, name: string, content: string) => {
    const safeName = sanitizeName(name.trim()) || `arch-file.${kind.toLowerCase()}`;
    files.push({
      kind: kind.toLowerCase() as FileKind,
      name: ensureExt(safeName, kind.toLowerCase() as FileKind),
      content,
    });
    return ""; // stripped from prose; we render a card instead
  });
  return { cleaned: cleaned.replace(/\n{3,}/g, "\n\n").trim(), files };
}

function sanitizeName(n: string): string {
  return n.replace(/[^\w.\- ]+/g, "").slice(0, 80);
}

function ensureExt(name: string, kind: FileKind): string {
  const want = "." + kind;
  return name.toLowerCase().endsWith(want) ? name : `${name}${want}`;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function makePdf(text: string, name: string): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 56;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  let y = margin;

  const lines = text.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r/g, "");
    // Simple markdown -> styled text
    let size = 11;
    let style: "normal" | "bold" = "normal";
    let content = line;
    if (/^#\s+/.test(line))       { size = 20; style = "bold"; content = line.replace(/^#\s+/, ""); }
    else if (/^##\s+/.test(line)) { size = 16; style = "bold"; content = line.replace(/^##\s+/, ""); }
    else if (/^###\s+/.test(line)){ size = 13; style = "bold"; content = line.replace(/^###\s+/, ""); }
    else if (/^[-*]\s+/.test(line)) { content = "• " + line.replace(/^[-*]\s+/, ""); }
    else if (/^\d+\.\s+/.test(line)) { /* keep as-is */ }

    // strip inline markdown emphasis
    content = content.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`([^`]+)`/g, "$1");

    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    if (content.trim() === "") { y += size * 0.6; continue; }
    const wrapped = doc.splitTextToSize(content, maxW) as string[];
    for (const w of wrapped) {
      if (y + size + 4 > pageH - margin) { doc.addPage(); y = margin; }
      doc.text(w, margin, y);
      y += size * 1.35;
    }
  }
  return doc.output("blob");
}

async function makeDocx(text: string, _name: string): Promise<Blob> {
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import("docx");
  const paragraphs = text.split("\n").map((rawLine) => {
    const line = rawLine.replace(/\r/g, "");
    if (/^#\s+/.test(line))
      return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(line.replace(/^#\s+/, ""))] });
    if (/^##\s+/.test(line))
      return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(line.replace(/^##\s+/, ""))] });
    if (/^###\s+/.test(line))
      return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(line.replace(/^###\s+/, ""))] });
    if (/^[-*]\s+/.test(line))
      return new Paragraph({ bullet: { level: 0 }, children: [new TextRun(line.replace(/^[-*]\s+/, ""))] });
    // strip inline markdown
    const clean = line.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/`([^`]+)`/g, "$1");
    return new Paragraph({ children: [new TextRun(clean)] });
  });
  const doc = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  return blob;
}

const MIME: Record<FileKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain;charset=utf-8",
  md: "text/markdown;charset=utf-8",
  csv: "text/csv;charset=utf-8",
  json: "application/json;charset=utf-8",
  html: "text/html;charset=utf-8",
};

export async function generateAndDownload(file: FileBlock): Promise<void> {
  let blob: Blob;
  if (file.kind === "pdf") blob = await makePdf(file.content, file.name);
  else if (file.kind === "docx") blob = await makeDocx(file.content, file.name);
  else blob = new Blob([file.content], { type: MIME[file.kind] });
  download(blob, file.name);
}

export const FILE_KIND_LABEL: Record<FileKind, string> = {
  pdf: "PDF document",
  docx: "Word document",
  txt: "Text file",
  md: "Markdown",
  csv: "Spreadsheet (CSV)",
  json: "JSON",
  html: "HTML page",
};
