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

  /** Extract a text layer from a PDF using PDF.js (loaded from CDN in index.html). */
  function readPdf(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = async () => {
        try {
          if (!window.pdfjsLib) {
            return reject(new Error("PDF reader did not load (check your connection)."));
          }
          const data = new Uint8Array(reader.result);
          const pdf = await window.pdfjsLib.getDocument({ data }).promise;
          let text = "";
          for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            // Join the page's text items; insert newlines so sentences split sanely.
            text += content.items.map((it) => it.str).join(" ") + "\n\n";
          }
          resolve({
            id: newId(),
            name: file.name,
            text: text.trim(),
            pages: pdf.numPages,
            kind: "pdf",
          });
        } catch (e) {
          reject(e);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  /** Read an uploaded File into a {id,name,text} source record. */
  function readFile(file) {
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (isPdf) return readPdf(file);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        resolve({
          id: newId(),
          name: file.name,
          text: String(reader.result || ""),
          kind: "text",
        });
      };
      reader.readAsText(file);
    });
  }

  global.SourceMatcher = { scanAll, matchEvidenceInSource, readFile };
})(window);
