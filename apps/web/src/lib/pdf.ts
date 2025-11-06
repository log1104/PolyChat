// Lightweight PDF text extraction using pdfjs-dist for browser
// Note: This runs client-side to avoid heavy server dependencies.

import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import type {
  PDFDocumentProxy,
  PDFPageProxy,
  PDFDocumentLoadingTask,
  TextContent,
  TextItem,
  TextMarkedContent,
} from "pdfjs-dist/types/src/display/api";
// Vite will bundle the worker and give us a URL we can assign
// The `?worker&url` query ensures we get a URL string to the worker asset
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - vite query typings
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker?worker&url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl as unknown as string;

export async function extractPdfText(
  file: File,
  options?: { maxChars?: number },
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask: PDFDocumentLoadingTask = getDocument({ data: arrayBuffer });
  const pdf: PDFDocumentProxy = await loadingTask.promise;

  const parts: string[] = [];
  const maxChars = options?.maxChars ?? 20000; // guard to keep token usage sane

  for (let i = 1; i <= pdf.numPages; i++) {
    const page: PDFPageProxy = await pdf.getPage(i);
    const content: TextContent = await page.getTextContent();
    const text = content.items
      .map((item) => extractText(item))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      parts.push(text);
      const current = parts.join("\n\n");
      if (current.length >= maxChars) {
        return current.slice(0, maxChars);
      }
    }
  }

  const full = parts.join("\n\n");
  return full.length > maxChars ? full.slice(0, maxChars) : full;
}

function extractText(item: TextItem | TextMarkedContent): string {
  if ("str" in item && typeof item.str === "string") {
    return item.str;
  }
  return "";
}
