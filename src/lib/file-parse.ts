// Client-side extraction for chat attachments.
//   - PDF        → text via pdfjs
//   - DOCX       → text via mammoth
//   - text/*     → raw text
//   - image/*    → base64 data URL (sent multimodal to a vision-capable model)
//   - other      → skipped with a note

import { supabase } from "@/integrations/supabase/client";

export interface RawAttachment { name: string; size: number; path: string; mime?: string }

export interface ExtractedText {
  kind: "text";
  name: string;
  mime: string;
  size: number;
  text: string;
  truncated?: boolean;
}

export interface ExtractedImage {
  kind: "image";
  name: string;
  mime: string;
  size: number;
  dataUrl: string;
  ocrText?: string;
  ocrTruncated?: boolean;
}

export interface ExtractedNotice {
  kind: "notice";
  name: string;
  mime: string;
  size: number;
  message: string;
}

export type Extracted = ExtractedText | ExtractedImage | ExtractedNotice;

const MAX_TEXT_CHARS = 60_000;   // ~15k tokens; safely under any per-request cap
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      // Vite ?url import ensures the worker file is served from the bundle.
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function clip(s: string): { text: string; truncated: boolean } {
  if (s.length <= MAX_TEXT_CHARS) return { text: s, truncated: false };
  return { text: s.slice(0, MAX_TEXT_CHARS), truncated: true };
}

async function extractPdf(blob: Blob): Promise<string> {
  const pdfjs = await loadPdfjs();
  const buf = await blob.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  const max = Math.min(doc.numPages, 50);
  for (let i = 1; i <= max; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .filter(Boolean);
    pages.push(`--- Page ${i} ---\n${strings.join(" ")}`);
    if (pages.join("\n\n").length > MAX_TEXT_CHARS) break;
  }
  return pages.join("\n\n");
}

async function extractDocx(blob: Blob): Promise<string> {
  const mammoth = await import("mammoth");
  const buf = await blob.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return value;
}

// OCR — lazy-load tesseract.js so it only ships when a user attaches an image.
let ocrWorkerPromise: Promise<import("tesseract.js").Worker> | null = null;
async function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      return createWorker("eng");
    })();
  }
  return ocrWorkerPromise;
}

async function runOcr(blob: Blob): Promise<string> {
  try {
    const worker = await getOcrWorker();
    const { data } = await worker.recognize(blob);
    return (data.text || "").trim();
  } catch {
    return "";
  }
}

function isTextMime(mime: string, name: string): boolean {
  if (mime.startsWith("text/")) return true;
  if (
    /^(application\/json|application\/xml|application\/javascript|application\/x-yaml|application\/toml)/i.test(
      mime,
    )
  ) return true;
  return /\.(txt|md|markdown|json|xml|yaml|yml|toml|csv|tsv|log|ini|env|js|ts|tsx|jsx|css|html|py|rb|go|rs|java|c|h|cpp|hpp|cs|php|sh|sql)$/i.test(
    name,
  );
}

export async function extractAttachment(a: RawAttachment): Promise<Extracted> {
  const mime = a.mime || "application/octet-stream";
  try {
    const { data, error } = await supabase.storage.from("user-files").download(a.path);
    if (error || !data) throw new Error(error?.message || "download failed");

    if (mime.startsWith("image/")) {
      if (data.size > MAX_IMAGE_BYTES) {
        return { kind: "notice", name: a.name, mime, size: a.size, message: `Image too large (${(data.size / 1024 / 1024).toFixed(1)}MB > 10MB).` };
      }
      const [dataUrl, ocrRaw] = await Promise.all([blobToDataUrl(data), runOcr(data)]);
      const { text: ocrText, truncated: ocrTruncated } = clip(ocrRaw);
      return { kind: "image", name: a.name, mime, size: a.size, dataUrl, ocrText: ocrText || undefined, ocrTruncated: ocrText ? ocrTruncated : undefined };
    }

    if (mime === "application/pdf" || /\.pdf$/i.test(a.name)) {
      const raw = await extractPdf(data);
      const { text, truncated } = clip(raw);
      return { kind: "text", name: a.name, mime: "application/pdf", size: a.size, text, truncated };
    }

    if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      /\.docx$/i.test(a.name)
    ) {
      const raw = await extractDocx(data);
      const { text, truncated } = clip(raw);
      return { kind: "text", name: a.name, mime, size: a.size, text, truncated };
    }

    if (isTextMime(mime, a.name)) {
      const raw = await data.text();
      const { text, truncated } = clip(raw);
      return { kind: "text", name: a.name, mime: mime || "text/plain", size: a.size, text, truncated };
    }

    return {
      kind: "notice",
      name: a.name,
      mime,
      size: a.size,
      message: `Unsupported file type "${mime || "unknown"}" — Metrixcom can read PDF, DOCX, images, and text/code files.`,
    };
  } catch (e) {
    return {
      kind: "notice",
      name: a.name,
      mime,
      size: a.size,
      message: `Couldn't read this file (${e instanceof Error ? e.message : "unknown error"}).`,
    };
  }
}

export async function extractAttachments(list: RawAttachment[]): Promise<Extracted[]> {
  return Promise.all(list.map(extractAttachment));
}

/** Human-readable summary block for the prompt (text + notice items). */
export function buildAttachmentTextBlock(items: Extracted[]): string {
  const parts: string[] = [];
  for (const it of items) {
    if (it.kind === "text") {
      parts.push(
        `📎 **${it.name}** (${it.mime})\n\`\`\`\n${it.text}${it.truncated ? "\n…[truncated]" : ""}\n\`\`\``,
      );
    } else if (it.kind === "notice") {
      parts.push(`📎 **${it.name}** — _${it.message}_`);
    } else if (it.kind === "image") {
      if (it.ocrText && it.ocrText.length > 2) {
        parts.push(
          `🖼️ **${it.name}** (image attached below)\n_OCR-extracted text:_\n\`\`\`\n${it.ocrText}${it.ocrTruncated ? "\n…[truncated]" : ""}\n\`\`\``,
        );
      } else {
        parts.push(`🖼️ **${it.name}** (image attached below)`);
      }
    }
  }
  if (!parts.length) return "";
  return `\n\n---\n**Attached files:**\n\n${parts.join("\n\n")}\n---\n`;
}
