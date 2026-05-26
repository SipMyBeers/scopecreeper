/**
 * Client-side PDF text extraction.
 *
 * pdfjs-dist runs in the browser. We lazy-load it on first use so the main
 * bundle stays small. Worker is sourced from the package; if the bundler
 * doesn't ship it correctly we fall back to the CDN worker.
 */

let pdfjsModule: typeof import("pdfjs-dist") | null = null;

async function loadPdfjs(): Promise<typeof import("pdfjs-dist")> {
  if (pdfjsModule) return pdfjsModule;
  const mod = await import("pdfjs-dist");
  try {
    // Best-effort: try the bundled worker URL.
    const workerUrl = new URL(
      "pdfjs-dist/build/pdf.worker.mjs",
      import.meta.url
    ).toString();
    mod.GlobalWorkerOptions.workerSrc = workerUrl;
  } catch {
    // Fallback to a CDN worker so users still get extraction.
    mod.GlobalWorkerOptions.workerSrc =
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@5/build/pdf.worker.min.mjs";
  }
  pdfjsModule = mod;
  return mod;
}

/** Extract plain text from a PDF File. Concatenates page text with blank lines. */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await loadPdfjs();
  const arrayBuf = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuf) });
  const doc = await loadingTask.promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    pages.push(text);
  }
  return pages.join("\n\n");
}

/** Plain-text / markdown via FileReader — for .md, .txt, anything UTF-8. */
export async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsText(file);
  });
}

/** Dispatch a File → text extraction based on its mime/name. */
export async function extractFile(file: File): Promise<{ text: string; mime: string }> {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) {
    const text = await extractPdfText(file);
    return { text, mime: "application/pdf" };
  }
  if (name.endsWith(".md") || file.type === "text/markdown") {
    return { text: await readTextFile(file), mime: "text/markdown" };
  }
  if (name.endsWith(".txt") || file.type === "text/plain" || !file.type) {
    return { text: await readTextFile(file), mime: "text/plain" };
  }
  // Fallback: try reading as text anyway.
  return { text: await readTextFile(file), mime: file.type || "text/plain" };
}
