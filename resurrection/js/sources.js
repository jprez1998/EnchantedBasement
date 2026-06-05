/* =============================================================================
 * sources.js — Source ingestion and VERBATIM citation matching.
 *
 * The no-hallucination guarantee lives here. The matcher never paraphrases and
 * never generates text attributed to a source. It does exactly one thing:
 *   - locate literal occurrences of a criterion's keywords/phrases inside the
 *     uploaded source text, and
 *   - return the surrounding sentence(s) as an exact substring, with the
 *     character offset, so the citation is auditable and reproducible.
 *
 * Every snippet returned is `source.text.slice(start, end)` — a substring of
 * what the user actually uploaded. If a quote does not literally exist in an
 * uploaded source, it cannot appear in the UI.
 * ========================================================================== */

(function (global) {
  "use strict";

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /** Expand a match index to a readable sentence window (still a literal slice). */
  function sentenceWindow(text, idx, matchLen) {
    const before = text.lastIndexOf(".", idx);
    const beforeNl = text.lastIndexOf("\n", idx);
    let start = Math.max(before, beforeNl);
    start = start < 0 ? 0 : start + 1;

    let end = text.length;
    for (const term of [". ", ".\n", "\n", "; "]) {
      const e = text.indexOf(term, idx + matchLen);
      if (e !== -1 && e < end) end = e + 1;
    }
    // Cap window length so a missing terminator can't dump the whole document.
    if (end - start > 400) end = Math.min(text.length, idx + matchLen + 200);
    if (idx - start > 200) start = Math.max(0, idx - 200);

    return { start, end, text: text.slice(start, end).trim() };
  }

  /**
   * Match one evidence item against one source.
   * Returns up to `cap` distinct verbatim snippets, each with the matched term
   * and absolute character offsets into the original source text.
   */
  function matchEvidenceInSource(evidence, source, cap = 3) {
    const text = source.text || "";
    const found = [];
    const seenWindows = new Set();

    for (const kw of evidence.keywords || []) {
      if (!kw) continue;
      const re = new RegExp(escapeRegExp(kw), "gi");
      let m;
      while ((m = re.exec(text)) !== null) {
        const win = sentenceWindow(text, m.index, m[0].length);
        const key = win.start + ":" + win.end;
        if (seenWindows.has(key)) continue;
        seenWindows.add(key);
        found.push({
          sourceId: source.id,
          sourceName: source.name,
          term: m[0],
          matchIndex: m.index,
          start: win.start,
          end: win.end,
          quote: win.text,
        });
        if (found.length >= cap) return found;
        if (re.lastIndex === m.index) re.lastIndex++; // guard zero-width
      }
    }
    return found;
  }

  /**
   * Scan every evidence item against every source. Returns a map
   * evidenceId -> [snippet, ...]. Pure; callers attach results to state.
   */
  function scanAll(evidenceList, sources) {
    const out = {};
    for (const ev of evidenceList) {
      let hits = [];
      for (const src of sources) {
        hits = hits.concat(matchEvidenceInSource(ev, src));
      }
      out[ev.id] = hits;
    }
    return out;
  }

  function newId() {
    return "src-" + Math.random().toString(36).slice(2, 9);
  }

  const IMAGE_RE = /\.(png|jpe?g|webp|bmp|gif|tiff?)$/i;
  // A page with fewer than this many non-space chars is treated as "no text layer".
  const PAGE_TEXT_MIN = 12;

  function readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve(reader.result);
      reader.readAsArrayBuffer(file);
    });
  }

  // ---- OCR (Tesseract.js, loaded from CDN; created lazily and reused) -------
  let _ocrWorker = null;
  function getOcrWorker(onStatus) {
    if (_ocrWorker) return _ocrWorker;
    if (!window.Tesseract) {
      return Promise.reject(new Error("OCR engine did not load (check your connection)."));
    }
    _ocrWorker = window.Tesseract.createWorker("eng", 1, {
      logger: (m) => {
        if (onStatus && m && typeof m.progress === "number") {
          onStatus(m.status, m.progress);
        }
      },
    });
    return _ocrWorker;
  }
  async function ocrImageLike(imageOrCanvas, onStatus) {
    const worker = await getOcrWorker(onStatus);
    const { data } = await worker.recognize(imageOrCanvas);
    return (data && data.text) || "";
  }

  /** Render a PDF page to a canvas sized for legible OCR (capped for memory). */
  async function pdfPageToCanvas(page) {
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(3, Math.max(1, 1600 / base.width));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas;
  }

  /**
   * Extract text from a PDF. Always reads the embedded text layer first (fast).
   * If `opts.ocr` is set, any page lacking a text layer is rendered and OCR'd.
   * opts: { ocr, onProgress(msg,frac), confirmLarge(count)->bool|Promise<bool> }
   */
  async function readPdf(file, opts = {}) {
    if (!window.pdfjsLib) throw new Error("PDF reader did not load (check your connection).");
    const buf = await readAsArrayBuffer(file);
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
    const total = pdf.numPages;
    const pageText = new Array(total).fill("");
    const needOcr = [];

    for (let p = 1; p <= total; p++) {
      if (opts.onProgress) opts.onProgress(`Reading page ${p}/${total}…`, (p - 1) / total * 0.5);
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const t = content.items.map((it) => it.str).join(" ").trim();
      pageText[p - 1] = t;
      if (t.replace(/\s/g, "").length < PAGE_TEXT_MIN) needOcr.push(p);
    }

    let ocredPages = 0;
    if (opts.ocr && needOcr.length) {
      let proceed = true;
      if (needOcr.length > 25 && typeof opts.confirmLarge === "function") {
        proceed = await opts.confirmLarge(needOcr.length);
      }
      if (proceed) {
        for (let i = 0; i < needOcr.length; i++) {
          const p = needOcr[i];
          const frac = 0.5 + (i / needOcr.length) * 0.5;
          if (opts.onProgress) opts.onProgress(`OCR page ${p} (${i + 1}/${needOcr.length})…`, frac);
          const page = await pdf.getPage(p);
          const canvas = await pdfPageToCanvas(page);
          try {
            const t = (await ocrImageLike(canvas, (st, pr) => {
              if (opts.onProgress && st === "recognizing text") {
                opts.onProgress(`OCR page ${p} (${i + 1}/${needOcr.length}) ${Math.round(pr * 100)}%`, frac);
              }
            })).trim();
            if (t) { pageText[p - 1] = t; ocredPages++; }
          } finally {
            canvas.width = canvas.height = 0; // free memory on mobile
          }
        }
      }
    }

    return {
      id: newId(),
      name: file.name,
      text: pageText.join("\n\n").trim(),
      pages: total,
      ocredPages,
      kind: "pdf",
    };
  }

  /** OCR a single image file into a source record. */
  async function readImage(file, opts = {}) {
    if (opts.onProgress) opts.onProgress("OCR image…", 0.1);
    const text = (await ocrImageLike(file, (st, pr) => {
      if (opts.onProgress && st === "recognizing text") {
        opts.onProgress(`OCR image ${Math.round(pr * 100)}%`, 0.1 + pr * 0.9);
      }
    })).trim();
    return { id: newId(), name: file.name, text, kind: "image" };
  }

  /** Read an uploaded File into a {id,name,text} source record. */
  function readFile(file, opts = {}) {
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (isPdf) return readPdf(file, opts);
    const isImage = (file.type && file.type.startsWith("image/")) || IMAGE_RE.test(file.name);
    if (isImage) return readImage(file, opts);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => resolve({ id: newId(), name: file.name, text: String(reader.result || ""), kind: "text" });
      reader.readAsText(file);
    });
  }

  global.SourceMatcher = { scanAll, matchEvidenceInSource, readFile };
})(window);
