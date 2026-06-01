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

  /** Read an uploaded File into a {id,name,text} source record (text formats). */
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        resolve({
          id: "src-" + Math.random().toString(36).slice(2, 9),
          name: file.name,
          text: String(reader.result || ""),
        });
      };
      reader.readAsText(file);
    });
  }

  global.SourceMatcher = { scanAll, matchEvidenceInSource, readFile };
})(window);
