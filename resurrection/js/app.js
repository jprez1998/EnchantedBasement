/* =============================================================================
 * app.js — UI controller for the Resurrection Bayes Table.
 *
 * Holds the editable state, renders the table / priors / sources, opens the
 * detail drawer with verbatim citations, and drives the Recalculate workflow.
 * All probability arithmetic is delegated to BayesEngine; all source quoting to
 * SourceMatcher. This file does no statistics and no quoting of its own.
 * ========================================================================== */

(function () {
  "use strict";

  const LS_KEY = "eb-resurrection-bayes-v1";
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const AI_ON_LS = "eb-ai-on-recalc";

  // --- State ---------------------------------------------------------------
  let state = load() || freshState();
  let lastResult = null;       // last BayesEngine.compute(...) output
  let matchIndex = {};         // evidenceId -> [verbatim snippet, ...]
  let aiIndex = {};            // evidenceId -> { rationale, parsimony_note, citations, direction }
  let aiOverall = "";          // Claude's overall parsimony synthesis (last run)
  const view = { filter: "all", sort: "default" }; // table filter/sort (UI only)

  function freshState() {
    return {
      hypotheses: window.DefaultModel.hypotheses(),
      evidence: window.DefaultModel.evidence(),
      groups: window.DefaultModel.groups(),
      sources: [],
      framing: "balanced",
      version: window.DefaultModel.version(),
    };
  }
  const findGroup = (id) => (state.groups || []).find((g) => g.id === id);
  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function persist() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      // A whole book can exceed the ~5MB localStorage quota. Save the model and
      // light source metadata so edits/priors survive; large texts stay in
      // memory only (re-upload after a reload). Better than saving nothing.
      try {
        const slim = {
          ...state,
          sources: state.sources.map((s) =>
            (s.text || "").length > 50000
              ? { id: s.id, name: s.name, kind: s.kind, pages: s.pages, text: "", _dropped: true }
              : s),
        };
        localStorage.setItem(LS_KEY, JSON.stringify(slim));
      } catch {}
    }
  }

  // --- Helpers -------------------------------------------------------------
  const fmtPct = (p) => (100 * p).toFixed(1) + "%";
  const fmtNum = (n, d = 2) => (Math.abs(n) >= 1000 || (Math.abs(n) < 0.01 && n !== 0))
    ? n.toExponential(2) : n.toFixed(d);
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function hyp(id) { return state.hypotheses.find((h) => h.id === id); }
  let toastTimer;
  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // --- Core recompute ------------------------------------------------------
  function recompute() {
    lastResult = window.BayesEngine.compute(state);
    persist();
    renderVerdict();
    renderTable();
  }

  // =========================================================================
  // RENDER: verdict bar
  // =========================================================================
  function renderVerdict() {
    const r = lastResult;
    const pro = hyp(r.pivot.proId), con = hyp(r.pivot.conId);
    const resP = r.totals.resPosterior, natP = r.totals.natPosterior;
    const natColor = "#5b8def";

    // Headline: Resurrection family vs the Naturalistic disjunction.
    const famBars = `
      <div class="vbar">
        <span class="vname" style="color:${pro.color}">Resurrection</span>
        <div class="vtrack"><div class="vfill" style="width:${(resP * 100).toFixed(1)}%;background:${pro.color}"></div></div>
        <span class="vpct">${fmtPct(resP)}</span>
      </div>
      <div class="vbar">
        <span class="vname" style="color:${natColor}">Naturalistic — any</span>
        <div class="vtrack"><div class="vfill" style="width:${(natP * 100).toFixed(1)}%;background:${natColor}"></div></div>
        <span class="vpct">${fmtPct(natP)}</span>
      </div>`;

    // Breakdown of the naturalistic sub-hypotheses (the disjunction's members).
    const nats = r.hypotheses.filter((h) => h.family === "naturalistic").sort((a, b) => b.posterior - a.posterior);
    const breakdown = nats.length
      ? `<div class="vsubs">${nats.map((h) => `<span class="vsub" style="border-color:${h.color}">${esc(h.short)} ${fmtPct(h.posterior)}</span>`).join("")}</div>`
      : "";

    const odds = r.totals.posteriorOdds;
    const oddsTxt = odds >= 1
      ? `${fmtNum(odds, 2)} : 1 for Resurrection`
      : `${fmtNum(1 / odds, 2)} : 1 for Naturalistic`;

    $("#verdict").innerHTML = `
      <div class="verdict-bars">${famBars}${breakdown}</div>
      <div class="verdict-odds">
        <span class="muted">Posterior odds (R vs any naturalistic)</span>
        <span class="big">${esc(oddsTxt)}</span>
        <span class="muted">Evidence swing: ${fmtNum(r.totals.posteriorDecibans - r.totals.priorDecibans, 1)} decibans
          (${window.BayesEngine.bfStrength(r.totals.logBFsum)})</span>
        ${(state.framing && state.framing !== "custom" && state.framing !== "balanced") ? `<span class="framing-badge">${esc(FRAMING_LABEL[state.framing] || state.framing)} framing</span>` : ""}
        ${(+state.temper > 0) ? `<span class="qual-tag" title="Likelihoods shrunk toward 0.5">tempered −${Math.round(state.temper * 100)}%</span>` : ""}
      </div>`;
  }

  // =========================================================================
  // RENDER: Bayes table
  // =========================================================================
  function renderTable() {
    const r = lastResult;
    const pro = hyp(r.pivot.proId), con = hyp(r.pivot.conId);
    $("#th-pro").textContent = pro.short;
    $("#th-pro").style.color = pro.color;
    $("#th-con").textContent = "Naturalistic (best fit)";
    $("#th-con").style.color = con.color;

    // Apply the view's filter + sort. Totals stay model-wide (unfiltered).
    const passes = (e) => {
      switch (view.filter) {
        case "pro": return e.enabled !== false && e.decibans > 0.2;
        case "con": return e.enabled !== false && e.decibans < -0.2;
        case "neutral": return e.enabled !== false && Math.abs(e.decibans) <= 0.2;
        case "downweighted": return e.qualityFactor != null && e.qualityFactor < 0.999;
        case "correlated": return e.depFactor != null && e.depFactor < 0.999;
        case "cited": return (matchIndex[e.id] || []).length > 0;
        case "off": return e.enabled === false;
        default: return true;
      }
    };
    const order = { default: 0 };
    r.evidence.forEach((e, i) => (order[e.id] = i));
    const rows = r.evidence.filter(passes).sort((a, b) => {
      switch (view.sort) {
        case "impact": return Math.abs(b.decibans) - Math.abs(a.decibans);
        case "pro": return b.decibans - a.decibans;
        case "con": return a.decibans - b.decibans;
        case "quality": return (a.qualityFactor ?? 1) - (b.qualityFactor ?? 1);
        case "name": return String(a.name).localeCompare(String(b.name));
        default: return order[a.id] - order[b.id];
      }
    });
    const cnt = $("#tools-count");
    if (cnt) cnt.textContent = rows.length === r.evidence.length
      ? `${r.evidence.length} criteria` : `${rows.length} of ${r.evidence.length}`;

    const body = $("#bayes-body");
    body.innerHTML = "";
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="7" class="empty-rows">No criteria match this filter.</td></tr>`;
    }
    rows.forEach((e) => {
      const orig = state.evidence.find((x) => x.id === e.id);
      const tr = document.createElement("tr");
      if (e.enabled === false) tr.classList.add("row-disabled");

      const likPro = (orig.likelihoods[pro.id] ?? 0.5);
      // The con cell shows the BEST-FITTING naturalistic explanation for THIS datum.
      const bestCon = hyp(e.bestConId) || con;
      const conId = bestCon.id;
      const likCon = (orig.likelihoods[conId] ?? 0.5);
      const cites = (matchIndex[e.id] || []).length;
      const deci = e.enabled === false ? 0 : e.decibans;
      const pillCls = deci > 0.2 ? "bf-pro" : deci < -0.2 ? "bf-con" : "bf-neutral";
      const pillTxt = (deci > 0 ? "+" : "") + fmtNum(deci, 1) + " dB";

      tr.innerHTML = `
        <td class="col-toggle"><input type="checkbox" class="toggle" data-id="${e.id}" ${e.enabled === false ? "" : "checked"} title="Include in calculation"></td>
        <td>
          <div class="crit-name" data-detail="${e.id}">${esc(e.name)}</div>
          <div class="crit-note">${esc(e.note || "")}${(e.depFactor != null && e.depFactor < 0.999)
            ? ` <span class="dep-tag" title="Correlated-evidence discount">⛓ ×${e.depFactor.toFixed(2)}</span>` : ""}${(e.qualityFactor != null && e.qualityFactor < 0.999)
            ? ` <span class="qual-tag ${e.qualityFactor < 0.05 ? "neutral" : ""}" title="Epistemic-quality factor">${e.qualityFactor < 0.05 ? "⚖ neutralised" : "⚖ ×" + e.qualityFactor.toFixed(2)}</span>` : ""}</div>
        </td>
        <td class="cell-hyp pro" data-cell="${e.id}" data-hyp="${pro.id}">
          <span class="likeval">${likPro.toFixed(2)}</span>
          <div class="likebar"><div class="likefill" style="width:${likPro * 100}%"></div></div>
        </td>
        <td class="cell-hyp con" data-cell="${e.id}" data-hyp="${conId}">
          <span class="likeval">${likCon.toFixed(2)}</span>
          <span class="best-con" title="Best-fitting naturalistic account for this datum">${esc(bestCon.short)}</span>
          <div class="likebar"><div class="likefill" style="width:${likCon * 100}%"></div></div>
        </td>
        <td><input class="cell-edit" type="number" min="0" max="1" step="0.05" value="${orig.weight ?? 1}" data-weight="${e.id}"></td>
        <td><span class="bf-pill ${pillCls}" title="${window.BayesEngine.bfStrength(e.logBF)}">${pillTxt}</span></td>
        <td><span class="cite-count ${cites ? "has" : ""}" data-cites="${e.id}">${cites}</span></td>`;
      body.appendChild(tr);
    });

    // Footer totals — family posteriors (Resurrection vs the whole disjunction).
    $("#foot-pro").textContent = fmtPct(r.totals.resPosterior);
    $("#foot-pro").style.color = pro.color;
    $("#foot-con").textContent = fmtPct(r.totals.natPosterior);
    $("#foot-con").style.color = con.color;
    const totDeci = r.totals.posteriorDecibans;
    $("#foot-bf").textContent = (totDeci > 0 ? "+" : "") + fmtNum(totDeci, 1) + " dB";

    wireTableEvents();
  }

  function wireTableEvents() {
    $$(".toggle").forEach((cb) => cb.onchange = () => {
      const e = state.evidence.find((x) => x.id === cb.dataset.id);
      e.enabled = cb.checked;
      recompute();
    });
    $$("[data-weight]").forEach((inp) => inp.onchange = () => {
      const e = state.evidence.find((x) => x.id === inp.dataset.weight);
      e.weight = Math.max(0, Math.min(1, parseFloat(inp.value) || 0));
      recompute();
    });
    $$("[data-cell]").forEach((td) => td.onclick = () =>
      openDetail(td.dataset.cell, td.dataset.hyp));
    $$("[data-detail]").forEach((el) => el.onclick = () =>
      openDetail(el.dataset.detail, lastResult.pivot.proId));
    $$("[data-cites]").forEach((el) => el.onclick = () => {
      if ((matchIndex[el.dataset.cites] || []).length)
        openDetail(el.dataset.cites, lastResult.pivot.proId);
    });
  }

  // =========================================================================
  // RENDER: hypotheses & priors
  // =========================================================================
  function renderHypotheses() {
    const list = $("#hyp-list");
    list.innerHTML = "";
    const famOf = (h) => h.family || (h.role === "pro" ? "resurrection" : "naturalistic");
    let lastFam = null;
    state.hypotheses.slice().sort((a, b) => famOf(a).localeCompare(famOf(b)) === 0 ? 0 : (famOf(a) === "resurrection" ? -1 : 1)).forEach((h) => {
      const fam = famOf(h);
      if (fam !== lastFam) {
        const hd = document.createElement("div");
        hd.className = "fam-head";
        hd.textContent = fam === "resurrection" ? "Resurrection" : "Naturalistic disjunction (compared as a family)";
        list.appendChild(hd);
        lastFam = fam;
      }
      const card = document.createElement("div");
      card.className = "hyp-card " + (h.role === "pro" ? "pro" : "con");
      const parsimony = window.BayesEngine.parsimonyFactor(h);
      const assumptions = (h.assumptions || []).map((a, i) => `
        <div class="assumption">
          <input type="text" value="${esc(a.text)}" data-atext="${h.id}:${i}">
          <input type="number" min="0.01" max="0.99" step="0.01" value="${a.plausibility}" data-aplaus="${h.id}:${i}">
          <button class="btn danger" data-arem="${h.id}:${i}" title="Remove assumption">×</button>
        </div>`).join("");

      card.innerHTML = `
        <h3 style="color:${h.color}">${esc(h.name)}</h3>
        <p class="desc">${esc(h.description || "")}</p>
        <div class="prior-row">
          <span>Prior</span>
          <input type="range" min="1" max="99" value="${Math.round((h.prior || 0.5) * 100)}" data-prior="${h.id}">
          <span class="pv" data-pv="${h.id}">${Math.round((h.prior || 0.5) * 100)}%</span>
        </div>
        <div class="assumptions">
          <div class="alabel">Auxiliary assumptions (parsimony / Occam cost)</div>
          ${assumptions || '<div class="parsimony-note">No extra assumptions — fully parsimonious.</div>'}
          <button class="link-btn add-assumption" data-aadd="${h.id}">+ add assumption</button>
          <div class="parsimony-note">Joint plausibility factor: <strong>${parsimony.toFixed(3)}</strong>
            — multiplies this hypothesis' prior, so improbable conjuncts lower its standing.</div>
        </div>`;
      list.appendChild(card);
    });
    wireHypEvents();
  }

  function wireHypEvents() {
    $$("[data-prior]").forEach((rng) => {
      rng.oninput = () => { $(`[data-pv="${rng.dataset.prior}"]`).textContent = rng.value + "%"; };
      rng.onchange = () => {
        hyp(rng.dataset.prior).prior = parseInt(rng.value, 10) / 100;
        markCustomFraming();
        recompute();
      };
    });
    $$("[data-atext]").forEach((inp) => inp.onchange = () => {
      const [id, i] = inp.dataset.atext.split(":");
      hyp(id).assumptions[+i].text = inp.value; persist();
    });
    $$("[data-aplaus]").forEach((inp) => inp.onchange = () => {
      const [id, i] = inp.dataset.aplaus.split(":");
      hyp(id).assumptions[+i].plausibility = Math.max(0.01, Math.min(0.99, parseFloat(inp.value) || 0.5));
      markCustomFraming();
      renderHypotheses(); recompute();
    });
    $$("[data-arem]").forEach((btn) => btn.onclick = () => {
      const [id, i] = btn.dataset.arem.split(":");
      hyp(id).assumptions.splice(+i, 1);
      renderHypotheses(); recompute();
    });
    $$("[data-aadd]").forEach((btn) => btn.onclick = () => {
      const h = hyp(btn.dataset.aadd);
      (h.assumptions = h.assumptions || []).push({ text: "New assumption", plausibility: 0.5 });
      renderHypotheses(); recompute();
    });
  }

  // =========================================================================
  // RENDER: sources
  // =========================================================================
  function renderSources() {
    $("#src-count").textContent = state.sources.length + " loaded";
    const ul = $("#source-list");
    ul.innerHTML = "";
    state.sources.forEach((s) => {
      const li = document.createElement("li");
      const words = ((s.text || "").trim().match(/\S+/g) || []).length;
      const bits = [`${words.toLocaleString()} words`];
      if (s.pages) bits.push(`${s.pages}p`);
      if (s.ocredPages) bits.push(`${s.ocredPages} OCR'd`);
      else if (s.kind === "image") bits.push("OCR");
      else if (s.kind === "pdf") bits.push("PDF");
      if (s._dropped) bits.push("in memory only — re-upload after reload");
      li.innerHTML = `
        <span>
          <span class="sname">${esc(s.name)}</span>
          <span class="smeta">${bits.join(" · ")}</span>
        </span>
        <button class="btn danger" data-srcrem="${s.id}">remove</button>`;
      ul.appendChild(li);
    });
    $$("[data-srcrem]").forEach((b) => b.onclick = () => {
      state.sources = state.sources.filter((s) => s.id !== b.dataset.srcrem);
      rescanSources();
      renderSources();
      recompute();
      toast("Source removed");
    });
  }

  function rescanSources() {
    matchIndex = window.SourceMatcher.scanAll(state.evidence, state.sources);
  }

  // --- Upload progress UI --------------------------------------------------
  function setProgress(label, frac) {
    const box = $("#upload-progress");
    if (!box) return;
    box.hidden = false;
    $("#up-label").textContent = label;
    $("#up-fill").style.width = Math.max(0, Math.min(1, frac || 0)) * 100 + "%";
  }
  function hideProgress() { const b = $("#upload-progress"); if (b) b.hidden = true; }

  async function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const ocr = !!($("#ocr-toggle") && $("#ocr-toggle").checked);
    const opts = {
      ocr,
      onProgress: (msg, frac) => setProgress(msg, frac),
      confirmLarge: (n) => confirm(
        `This PDF has ${n} page(s) with no text layer. OCR-ing them runs in your ` +
        `browser and can take a while (roughly ${n}–${n * 3}s) and a lot of memory. ` +
        `Continue?`),
    };

    let added = 0, suggestedOcr = false;
    for (const f of files) {
      try {
        setProgress(`Opening ${f.name}…`, 0.02);
        const rec = await window.SourceMatcher.readFile(f, opts);
        if (!rec.text || !rec.text.trim()) {
          if ((rec.kind === "pdf" || rec.kind === "image") && !ocr) {
            suggestedOcr = true;
            toast(`“${f.name}” has no selectable text — tick OCR and re-upload to read it.`);
          } else {
            toast(`“${f.name}” produced no readable text.`);
          }
          continue;
        }
        state.sources.push(rec);
        added++;
        if (rec.ocredPages) toast(`OCR read ${rec.ocredPages} page(s) of “${f.name}”.`);
      } catch (e) {
        toast("Could not read " + f.name + (e && e.message ? " — " + e.message : ""));
      }
    }
    hideProgress();
    if (!added) {
      if (suggestedOcr) toast("Tip: enable OCR for scanned documents.");
      return;
    }
    rescanSources();
    renderSources();
    recompute();
    toast(added + " source(s) added");
  }

  // =========================================================================
  // Detail drawer (the "click a side to see why" feature)
  // =========================================================================
  const PROV_LABEL = {
    quoted_source: "Quotes a source",
    historical_reference: "Historical reference",
    author_inference: "Author's inference",
    author_opinion: "Author's opinion",
  };
  const FALLACY_LABEL = {
    ad_hoc: "⚑ ad hoc", circular: "⚑ circular", unfalsifiable: "⚑ unfalsifiable",
    special_pleading: "⚑ special pleading", argument_from_silence: "⚑ argument from silence",
    anachronism: "⚑ anachronism",
  };

  /** Render the exhaustive, assessed data points the author(s) use for one side. */
  function renderDataPoints(ai, sideKey, h) {
    const all = ai.dataPoints || [];
    const mine = all.filter((d) => d.supports === sideKey);
    const sideName = sideKey === "R" ? "Resurrection" : "Naturalistic";

    let head = `<h3>Data points used for ${esc(sideName)} ✦
        <span class="cite-count ${mine.length ? "has" : ""}">${mine.length}</span></h3>`;
    if (ai.rationale) head += `<p class="parsimony-note">${esc(ai.rationale)}</p>`;

    if (!mine.length) {
      return head + `<p class="no-cite">Claude found no data point in your sources that bears on
        <strong>${esc(sideName)}</strong> for this criterion${all.length ? ` (it read ${all.length} for the other side / neutral)` : ""}.</p>`;
    }

    const cards = mine.map((d) => {
      const prov = PROV_LABEL[d.provenance] || d.provenance || "data point";
      const counts = d.counts;
      const cls = counts ? "dp-counts" : "dp-discounted";
      const badge = counts
        ? `<span class="dp-verdict ok">counts</span>`
        : `<span class="dp-verdict no">does not count</span>`;
      const valid = `<span class="dp-validity v-${esc(d.validity || "")}">${esc(d.validity || "—")}</span>`;
      const fallacy = (d.fallacy && d.fallacy !== "none") ? `<span class="dp-fallacy">${esc(FALLACY_LABEL[d.fallacy] || d.fallacy)}</span>` : "";
      const adhoc = (d.ad_hoc && !(d.fallacy === "ad_hoc")) ? `<span class="dp-fallacy">⚑ ad hoc</span>` : "";
      const attest = d.independently_attested ? `<span class="dp-flag ok" title="Multiple attestation">independently attested</span>` : "";
      const verified = d.verified
        ? `<span class="dp-flag ok">verbatim ✓</span>`
        : `<span class="dp-flag warn">⚠ quote not verified — discarded</span>`;
      return `
        <div class="dp ${cls}">
          <div class="dp-head">
            <span class="dp-prov">${esc(prov)}</span>${valid}${fallacy}${adhoc}${badge}
          </div>
          <div class="cmeta">${esc(d.source || "")}${d.cited_source ? " · cites " + esc(d.cited_source) : ""} · ${verified}${attest ? " · " + attest : ""}</div>
          <blockquote>${esc(d.quote || "")}</blockquote>
          ${d.why_quoted ? `<p class="dp-line"><strong>Why raised:</strong> ${esc(d.why_quoted)}</p>` : ""}
          ${d.author_assessment ? `<p class="dp-line"><strong>Author's assessment / context:</strong> ${esc(d.author_assessment)}</p>` : ""}
          ${d.weight_note ? `<p class="dp-line"><strong>Effect on P(${sideKey === "R" ? "Resurrection" : "Naturalistic"}):</strong> ${esc(d.weight_note)}</p>` : ""}
        </div>`;
    }).join("");

    const discounted = mine.filter((d) => !d.counts).length;
    const note = discounted
      ? `<p class="parsimony-note">${discounted} of these are <strong>raised in favour but do not count</strong> after
         historical-critical assessment (e.g. a disputed/interpolated source or an unsupported opinion) — shown so the
         reasoning is transparent.</p>`
      : "";
    return head + cards + note;
  }

  function openDetail(evId, hypId) {
    const e = lastResult.evidence.find((x) => x.id === evId);
    const orig = state.evidence.find((x) => x.id === evId);
    const h = hyp(hypId);
    const r = lastResult;
    const pro = hyp(r.pivot.proId), con = hyp(r.pivot.conId);

    // Direction of this datum's effect on the chosen hypothesis: compare its
    // likelihood under h to the average likelihood across hypotheses.
    const liks = state.hypotheses.map((hh) => orig.likelihoods[hh.id] ?? 0.5);
    const mean = liks.reduce((a, b) => a + b, 0) / liks.length;
    const likH = orig.likelihoods[hypId] ?? 0.5;
    const raises = likH > mean + 1e-6;
    const lowers = likH < mean - 1e-6;
    const chip = raises
      ? `<span class="verdict-chip ${h.role === "pro" ? "chip-pro" : "chip-con"}">▲ Raises P(${esc(h.short)})</span>`
      : lowers
      ? `<span class="verdict-chip chip-neutral">▼ Lowers P(${esc(h.short)})</span>`
      : `<span class="verdict-chip chip-neutral">— Near-neutral for ${esc(h.short)}</span>`;

    // Citations
    const cites = matchIndex[evId] || [];
    const citeHtml = cites.length
      ? cites.map((c) => {
          const rel = c.matchIndex - c.start;
          const pre = esc(c.quote.slice(0, Math.max(0, rel)));
          const hit = esc(c.quote.slice(Math.max(0, rel), Math.max(0, rel) + c.term.length));
          const post = esc(c.quote.slice(Math.max(0, rel) + c.term.length));
          return `<div class="cite">
            <div class="cmeta">${esc(c.sourceName)} · chars ${c.start}–${c.end} · matched “${esc(c.term)}”</div>
            <blockquote>${pre}<mark>${hit}</mark>${post}</blockquote>
          </div>`;
        }).join("")
      : `<div class="no-cite">No verbatim passages for this criterion were found in your uploaded sources yet.
           Upload sources containing terms like: <em>${esc((orig.keywords || []).slice(0, 6).join(", "))}</em>.
           The tool will only ever quote text that literally appears in your files.</div>`;

    const refs = (orig.references || []).map((x) => `<li>${esc(x)}</li>`).join("");

    // Claude's exhaustive, assessed data points for THIS side (R or N).
    const ai = aiIndex[evId];
    const sideKey = h.role === "pro" ? "R" : "N";
    const aiHtml = ai ? renderDataPoints(ai, sideKey, h) : "";

    $("#drawer-content").innerHTML = `
      <h2>${esc(orig.name)}</h2>
      <p class="sub">Viewing the <strong style="color:${h.color}">${esc(h.name)}</strong> side</p>
      ${chip}
      <p>${esc(orig.description || "")}</p>

      <div class="detail-stat">
        <div class="stat-box"><div class="k">P(datum | ${esc(h.short)})</div><div class="v">${likH.toFixed(2)}</div></div>
        <div class="stat-box"><div class="k">Independence weight</div><div class="v">${(orig.weight ?? 1).toFixed(2)}</div></div>
        <div class="stat-box"><div class="k">Bayes factor (${esc(pro.short)} vs ${esc(con.short)})</div><div class="v">${fmtNum(Math.exp(e.logBF), 2)}×</div></div>
        <div class="stat-box"><div class="k">Weight of evidence</div><div class="v">${(e.decibans > 0 ? "+" : "") + fmtNum(e.decibans, 1)} dB</div></div>
      </div>

      <p class="parsimony-note"><strong>Strength:</strong> ${window.BayesEngine.bfStrength(e.logBF)} —
        this datum ${e.logBF > 0.05 ? "pulls toward " + esc(pro.short) : e.logBF < -0.05 ? "pulls toward " + esc(con.short) : "is roughly neutral between the two hypotheses"}.</p>

      <h3>Epistemic quality (ad-hoc neutraliser)</h3>
      <p class="parsimony-note">Scales how much this criterion can move the result. <strong>0 = neutralised</strong>
        (ad hoc / circular / unfalsifiable / opinion-only → no impact in either direction); <strong>1 = full strength</strong>.
        ${ai && ai.quality_reason ? "Claude's reason: <em>" + esc(ai.quality_reason) + "</em>" : ""}</p>
      <div class="quality-row">
        <input type="range" min="0" max="100" value="${Math.round((orig.quality == null ? 1 : orig.quality) * 100)}" data-qual="${evId}">
        <span class="pv" id="qual-pv">${Math.round((orig.quality == null ? 1 : orig.quality) * 100)}%</span>
        <button class="btn small" data-qual0="${evId}">Neutralise</button>
      </div>

      <h3>Why it moves the probability</h3>
      <p>${esc(orig.note || "This datum's effect is determined entirely by its likelihood ratio across the hypotheses.")}
         Because P(datum | ${esc(h.short)}) = ${likH.toFixed(2)} versus an across-hypotheses average of ${mean.toFixed(2)},
         observing it ${raises ? "increases" : lowers ? "decreases" : "barely changes"} the posterior credence in ${esc(h.short)}.</p>

      ${aiHtml}

      <h3>Editable likelihoods</h3>
      <div class="detail-stat" id="detail-edit"></div>

      <h3>Verbatim source citations <span class="cite-count ${cites.length ? "has" : ""}">${cites.length}</span></h3>
      ${citeHtml}

      <h3>Scholarly references <span class="parsimony-note">(where this datum is debated — not quoted)</span></h3>
      <ul class="refs">${refs || "<li>None listed.</li>"}</ul>`;

    // inline likelihood editors for every hypothesis
    const editBox = $("#detail-edit");
    state.hypotheses.forEach((hh) => {
      const div = document.createElement("div");
      div.className = "stat-box";
      div.innerHTML = `<div class="k" style="color:${hh.color}">P(datum | ${esc(hh.short)})</div>
        <input class="cell-edit" type="number" min="0" max="1" step="0.01" value="${(orig.likelihoods[hh.id] ?? 0.5)}" data-likedit="${hh.id}">`;
      editBox.appendChild(div);
    });
    $$("[data-likedit]").forEach((inp) => inp.onchange = () => {
      orig.likelihoods[inp.dataset.likedit] = Math.max(0, Math.min(1, parseFloat(inp.value) || 0.5));
      recompute();
      openDetail(evId, hypId); // refresh
    });

    const qSlider = $(`[data-qual="${evId}"]`);
    if (qSlider) {
      qSlider.oninput = () => { $("#qual-pv").textContent = qSlider.value + "%"; };
      qSlider.onchange = () => { orig.quality = +qSlider.value / 100; recompute(); openDetail(evId, hypId); };
    }
    const qZero = $(`[data-qual0="${evId}"]`);
    if (qZero) qZero.onclick = () => { orig.quality = 0; recompute(); openDetail(evId, hypId); };

    $("#drawer").hidden = false;
    $("#drawer").setAttribute("aria-hidden", "false");
    $("#drawer-backdrop").hidden = false;
  }
  function closeDrawer() {
    $("#drawer").hidden = true;
    $("#drawer").setAttribute("aria-hidden", "true");
    $("#drawer-backdrop").hidden = true;
  }

  // =========================================================================
  // Recalculate workflow: rescan sources, recompute, build report + prompt
  // =========================================================================
  function buildAnalysisPrompt() {
    const r = lastResult;
    const pro = hyp(r.pivot.proId), con = hyp(r.pivot.conId);
    const lines = [];
    lines.push("You are a rigorous Bayesian historian. Assess each datum below ONLY against the provided sources.");
    lines.push("For each criterion, state whether it raises or lowers P(Resurrection), justify the likelihood ratio,");
    lines.push("and quote the source verbatim. Do NOT invent citations; if a source does not support a datum, say so.");
    lines.push("");
    lines.push(`Hypotheses: H1 = ${pro.name}; H2 = ${con.name}.`);
    lines.push(`Current posterior: ${pro.short} ${fmtPct(pro.posterior)}, ${con.short} ${fmtPct(con.posterior)}.`);
    lines.push("");
    lines.push("CRITERIA:");
    r.evidence.forEach((e, i) => {
      const o = state.evidence.find((x) => x.id === e.id);
      lines.push(`${i + 1}. ${o.name} | P(E|H1)=${(o.likelihoods[pro.id] ?? 0.5)}, P(E|H2)=${(o.likelihoods[con.id] ?? 0.5)}, weight=${o.weight ?? 1}, decibans=${fmtNum(e.decibans, 1)}`);
    });
    lines.push("");
    lines.push(`SOURCES (${state.sources.length}):`);
    state.sources.forEach((s) => lines.push(`--- ${s.name} ---\n${s.text.slice(0, 4000)}${s.text.length > 4000 ? "\n…[truncated]" : ""}`));
    return lines.join("\n");
  }

  // Reproducible audit trail (the bayesian-workflow "report.md" principle).
  function buildAuditMarkdown() {
    const r = window.BayesEngine.compute(state);
    const pro = hyp(r.pivot.proId), con = hyp(r.pivot.conId);
    const L = [];
    L.push(`# Resurrection Bayes Table — analysis report`);
    L.push(`_Generated ${new Date().toISOString()}_\n`);
    L.push(`## Posterior`);
    r.hypotheses.forEach((h) => L.push(`- **${h.name}**: ${fmtPct(h.posterior)} (prior ${fmtPct(h.prior)}, parsimony ${h.parsimony.toFixed(3)})`));
    const sw = r.totals.posteriorDecibans - r.totals.priorDecibans;
    L.push(`\nNet evidential swing: ${(sw > 0 ? "+" : "") + fmtNum(sw, 1)} decibans toward ${sw >= 0 ? pro.short : con.short} (${window.BayesEngine.bfStrength(r.totals.logBFsum)}).`);

    if (window.BayesRobustness) {
      try {
        const rob = window.BayesRobustness.analyze(state, { samples: 2000 });
        L.push(`\n## Robustness (prior sensitivity, ${rob.samples} perturbations)`);
        L.push(`- P(${pro.short}) point ${fmtPct(rob.base)}, mean ${fmtPct(rob.mean)}, 94% interval ${fmtPct(rob.lo)}–${fmtPct(rob.hi)}`);
        L.push(`- Conclusion holds in ${fmtPct(rob.favourFrac)} of perturbations → **${rob.robust ? "robust" : "fragile"}**`);
        L.push(`- Most influential (leave-one-out Δ): ` + rob.influence.slice(0, 5).map((i) => `${i.name} ${(i.delta >= 0 ? "+" : "") + (i.delta * 100).toFixed(1)}pts`).join("; "));
      } catch {}
    }

    if (window.BayesCalibration) {
      try {
        const c = window.BayesCalibration.analyze(state);
        L.push(`\n## Calibration & overconfidence`);
        if (+state.temper > 0) L.push(`- Global tempering active: likelihoods shrunk ${Math.round(state.temper * 100)}% toward 0.5.`);
        L.push(`- Overconfidence index: ${fmtPct(c.overconfidence)}; extreme likelihoods (≥0.95/≤0.05): ${c.extreme.length}; Cromwell (~0/1): ${c.cromwell.length}`);
        L.push(`- Top datum dominance: ${c.dominance.top.name} (${fmtPct(c.dominance.top.share)} of evidential weight)`);
        L.push(`- Tempering curve P(R-family): ` + c.curve.map((p) => `${Math.round(p.temper * 100)}%→${fmtPct(p.resP)}`).join(", "));
        c.recommendations.forEach((rline) => L.push(`- ${rline}`));
      } catch {}
    }

    const groups = (state.groups || []).filter((g) => state.evidence.some((e) => e.group === g.id));
    if (groups.length) {
      L.push(`\n## Dependency groups`);
      groups.forEach((g) => {
        const n = state.evidence.filter((e) => e.group === g.id).length;
        const nEff = n <= 1 ? n : 1 + (n - 1) * (1 - (g.rho || 0));
        L.push(`- **${g.label}** — ${n} members, ρ=${(g.rho || 0).toFixed(2)} → ≈${nEff.toFixed(2)} independent`);
      });
    }

    L.push(`\n## Criteria`);
    r.evidence.forEach((e) => {
      const o = state.evidence.find((x) => x.id === e.id);
      L.push(`\n### ${o.name}${e.enabled === false ? " (excluded)" : ""}`);
      L.push(`- P(E|${pro.short}) = ${(o.likelihoods[pro.id] ?? 0.5)}, P(E|${con.short}) = ${(o.likelihoods[con.id] ?? 0.5)}, weight ${o.weight ?? 1}${o.group ? `, group "${(findGroup(o.group) || {}).label || o.group}"` : ""}`);
      L.push(`- Evidence: ${(e.decibans >= 0 ? "+" : "") + fmtNum(e.decibans, 1)} decibans`);
      if (e.qualityFactor != null && e.qualityFactor < 0.999) {
        const ai0 = aiIndex[e.id];
        L.push(`- Epistemic quality κ=${e.qualityFactor.toFixed(2)}${e.qualityFactor < 0.05 ? " (NEUTRALISED — no impact)" : ""}${ai0 && ai0.quality_reason ? " — " + ai0.quality_reason : ""}`);
      }
      const ai = aiIndex[e.id];
      if (ai && (ai.dataPoints || []).length) {
        L.push(`- Data points (historical-critical assessment):`);
        ai.dataPoints.forEach((d) => {
          const v = d.verified ? "verbatim✓" : "UNVERIFIED";
          const fl = (d.fallacy && d.fallacy !== "none") ? " · FALLACY:" + d.fallacy : (d.ad_hoc ? " · FALLACY:ad_hoc" : "");
          L.push(`  - [${d.supports}] ${d.counts ? "COUNTS" : "does not count"} · ${d.provenance}${d.cited_source ? " (" + d.cited_source + ")" : ""} · ${d.validity}${fl} · ${v}`);
          if (d.quote) L.push(`    > ${d.quote.replace(/\s+/g, " ").trim()}`);
          if (d.author_assessment) L.push(`    Author's assessment: ${d.author_assessment}`);
        });
      }
      (o.references || []).forEach((ref) => L.push(`- Ref: ${ref}`));
    });
    L.push(`\n---\n_All quotations are verbatim substrings of uploaded sources; unverifiable quotes are flagged and never counted. Numbers are editable priors/likelihoods, not assertions of fact._`);
    return L.join("\n");
  }

  function downloadReport() {
    const md = buildAuditMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "resurrection-analysis-report.md";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Report downloaded");
  }

  function buildDependencyHtml() {
    const groups = (state.groups || []);
    const count = {};
    state.evidence.forEach((e) => { if (e.enabled !== false && e.group) count[e.group] = (count[e.group] || 0) + 1; });
    const active = groups.filter((g) => (count[g.id] || 0) > 1);
    if (!active.length) return "";
    const rows = active.map((g) => {
      const n = count[g.id];
      const nEff = 1 + (n - 1) * (1 - (g.rho || 0));
      return `<tr><td>${esc(g.label)}</td><td class="num">${n}</td><td class="num">${Math.round((g.rho || 0) * 100)}%</td>
        <td class="num">${nEff.toFixed(2)}</td><td class="num">×${(nEff / n).toFixed(2)}</td></tr>`;
    }).join("");
    return `
      <h3>Dependency discounting (anti-double-counting)</h3>
      <p>Correlated criteria are not counted as independent witnesses. Each group's evidence is shrunk to an
         effective number of independent sources, so one tradition cannot be multiplied several times.</p>
      <table class="report-table">
        <tr><th>Group</th><th>Members</th><th>ρ</th><th>≈ independent</th><th>Evidence ×</th></tr>${rows}
      </table>`;
  }

  function buildQualityHtml() {
    const r = lastResult;
    const flagged = r.evidence.filter((e) => e.qualityFactor != null && e.qualityFactor < 0.999);
    if (!flagged.length) return "";
    const rows = flagged.map((e) => {
      const o = state.evidence.find((x) => x.id === e.id);
      const ai = aiIndex[e.id];
      const reason = (ai && ai.quality_reason) ? ai.quality_reason
        : (o.note || "down-weighted for epistemic quality");
      return `<tr><td>${esc(o.name)}</td><td class="num">${e.qualityFactor.toFixed(2)}</td>
        <td>${e.qualityFactor < 0.05 ? "<strong>neutralised</strong>" : "down-weighted"} — ${esc(reason)}</td></tr>`;
    }).join("");
    return `
      <h3>Critical-quality control (ad-hoc neutralisation)</h3>
      <p>Each criterion's evidential weight is scaled by an epistemic-quality factor κ. Points whose support is
         ad hoc, circular, unfalsifiable, or mere opinion get κ→0, so they cannot move the posterior in either direction.</p>
      <table class="report-table"><tr><th>Criterion</th><th>κ</th><th>Why</th></tr>${rows}</table>`;
  }

  function buildCalibrationHtml() {
    if (!window.BayesCalibration) return "";
    let c;
    try { c = window.BayesCalibration.analyze(state); } catch { return ""; }
    const temper = Math.max(0, Math.min(1, +state.temper || 0));
    const curve = c.curve.map((p) => `<tr><td class="num">${Math.round(p.temper * 100)}%</td><td class="num">${fmtPct(p.resP)}</td></tr>`).join("");
    const recs = c.recommendations.map((x) => `<li>${esc(x)}</li>`).join("");
    const exTop = c.extreme.slice(0, 8).map((x) => `${esc(x.name)} · ${esc(x.hyp)} = ${(+x.p).toFixed(2)}`).join("; ");
    return `
      <h3>Calibration &amp; overconfidence</h3>
      <p>Subjective likelihoods are prone to overconfidence, and one near-0/near-1 number can dominate everything.
         Overconfidence index (share of strong likelihoods): <strong>${fmtPct(c.overconfidence)}</strong>;
         top datum supplies <strong>${fmtPct(c.dominance.top.share)}</strong> of the evidential weight.</p>
      ${c.extreme.length ? `<p class="parsimony-note"><strong>Extreme likelihoods (≥0.95 / ≤0.05):</strong> ${esc(exTop)}${c.extreme.length > 8 ? " …" : ""}</p>` : ""}
      <p><strong>Tempering curve</strong> — the posterior as every likelihood is shrunk toward 0.5 (distrusting confident numbers):</p>
      <table class="report-table"><tr><th>Temper</th><th>P(Resurrection family)</th></tr>${curve}</table>
      <div class="quality-row">
        <span class="parsimony-note">Apply tempering globally:</span>
        <input type="range" min="0" max="90" value="${Math.round(temper * 100)}" data-temper>
        <span class="pv" id="temper-pv">${Math.round(temper * 100)}%</span>
      </div>
      <ul class="refs">${recs}</ul>`;
  }

  function buildRobustnessHtml() {
    if (!window.BayesRobustness) return "";
    let rob;
    try { rob = window.BayesRobustness.analyze(state, { samples: 2000 }); }
    catch { return ""; }
    const pro = hyp(rob.proId);
    const verdict = rob.robust
      ? `<span class="dp-verdict ok">robust</span>`
      : `<span class="dp-verdict no">fragile</span>`;
    const infl = rob.influence.slice(0, 6).map((i) => {
      const cls = i.delta > 0.002 ? "swing-pos" : i.delta < -0.002 ? "swing-neg" : "";
      return `<tr><td>${esc(i.name)}</td>
        <td class="num ${cls}">${(i.delta >= 0 ? "+" : "") + (i.delta * 100).toFixed(1)} pts</td></tr>`;
    }).join("");
    return `
      <h3>Robustness &amp; prior sensitivity ${verdict}</h3>
      <p>Following a principled Bayesian workflow, we don't report a point estimate alone. Perturbing every
         prior, auxiliary-assumption plausibility, and likelihood within plausible bounds across
         <strong>${rob.samples.toLocaleString()}</strong> Monte-Carlo draws, the posterior for
         <strong style="color:${pro.color}">${esc(pro.short)}</strong> is:</p>
      <table class="report-table">
        <tr><th>Point</th><th>Mean under perturbation</th><th>94% interval</th><th>Conclusion holds</th></tr>
        <tr>
          <td class="num">${fmtPct(rob.base)}</td>
          <td class="num">${fmtPct(rob.mean)}</td>
          <td class="num">${fmtPct(rob.lo)} – ${fmtPct(rob.hi)}</td>
          <td class="num">${fmtPct(rob.favourFrac)}</td>
        </tr>
      </table>
      <p class="parsimony-note">${rob.robust
        ? "The leading hypothesis still leads in ≥90% of perturbations — the conclusion is robust to reasonable changes in the inputs."
        : "The leading hypothesis flips in more than 10% of perturbations — treat the conclusion as <strong>sensitive</strong> to the inputs, not settled."}</p>
      <h3>Most influential data points (leave-one-out)</h3>
      <p class="parsimony-note">How much P(${esc(pro.short)}) moves when each datum is removed — a result resting on one fragile datum is visible here.</p>
      <table class="report-table"><tr><th>Criterion</th><th>Δ P(${esc(pro.short)}) if removed</th></tr>${infl}</table>`;
  }

  function openReport() {
    rescanSources();
    recompute();
    const r = lastResult;
    const pro = hyp(r.pivot.proId), con = hyp(r.pivot.conId);

    const rows = r.evidence.slice()
      .sort((a, b) => Math.abs(b.decibans) - Math.abs(a.decibans))
      .map((e) => {
        const o = state.evidence.find((x) => x.id === e.id);
        const n = (matchIndex[e.id] || []).length;
        const cls = e.decibans > 0.2 ? "swing-pos" : e.decibans < -0.2 ? "swing-neg" : "";
        const dir = e.decibans > 0.2 ? "↑ " + esc(pro.short) : e.decibans < -0.2 ? "↑ " + esc(con.short) : "neutral";
        return `<tr>
          <td>${esc(o.name)}${e.enabled === false ? " <em>(off)</em>" : ""}</td>
          <td class="num">${(e.decibans > 0 ? "+" : "") + fmtNum(e.decibans, 1)}</td>
          <td class="${cls}">${dir}</td>
          <td class="num">${n}</td>
        </tr>`;
      }).join("");

    const totalSwing = r.totals.posteriorDecibans - r.totals.priorDecibans;
    const totalCites = Object.values(matchIndex).reduce((a, b) => a + b.length, 0);

    $("#report-content").innerHTML = `
      <p>Re-scanned <strong>${state.sources.length}</strong> source(s), found
         <strong>${totalCites}</strong> verbatim citation(s), and re-derived the posterior in log-space.</p>
      <table class="report-table">
        <tr><th>Hypothesis</th><th>Prior</th><th>Parsimony</th><th>Posterior</th></tr>
        ${r.hypotheses.map((h) => `<tr><td style="color:${h.color}"><strong>${esc(h.name)}</strong>${h.family === "naturalistic" ? " <em>(naturalistic)</em>" : ""}</td>
          <td class="num">${fmtPct(h.prior)}</td><td class="num">${h.parsimony.toFixed(3)}</td>
          <td class="num"><strong>${fmtPct(h.posterior)}</strong></td></tr>`).join("")}
        <tr><td><strong>Resurrection family</strong></td><td></td><td></td><td class="num"><strong>${fmtPct(r.totals.resPosterior)}</strong></td></tr>
        <tr><td><strong>Naturalistic family (any)</strong></td><td></td><td></td><td class="num"><strong>${fmtPct(r.totals.natPosterior)}</strong></td></tr>
      </table>
      <p class="parsimony-note">"Naturalistic" is a disjunction: each account competes in the softmax and their posteriors are summed.
         Per datum the table contrasts Resurrection with the <em>best-fitting</em> naturalistic account, since the disjunction
         cannot be refuted by beating its weakest member.</p>
      <p><strong>Net evidential swing:</strong> ${(totalSwing > 0 ? "+" : "") + fmtNum(totalSwing, 1)} decibans
         toward ${totalSwing >= 0 ? "Resurrection" : "Naturalistic"}
         (${window.BayesEngine.bfStrength(r.totals.logBFsum)}).</p>

      ${buildQualityHtml()}

      ${buildDependencyHtml()}

      ${buildRobustnessHtml()}

      ${buildCalibrationHtml()}

      <h3>Per-criterion contribution (sorted by impact)</h3>
      <table class="report-table">
        <tr><th>Criterion</th><th>Decibans</th><th>Favors</th><th>Cites</th></tr>
        ${rows}
      </table>

      <h3>Parsimony note</h3>
      <p>${esc(pro.short)} carries a parsimony factor of ${pro.parsimony.toFixed(3)} and ${esc(con.short)} of
         ${con.parsimony.toFixed(3)}. The lower factor reflects more (or less plausible) auxiliary assumptions and
         is applied to the prior, so a theory needing improbable conjuncts is penalised automatically — Occam's razor
         as a Bayes factor rather than an ad-hoc fudge.</p>

      ${aiOverall ? `
      <h3>Claude's analysis ✦</h3>
      <p>${esc(aiOverall)}</p>
      <p class="parsimony-note">Claude proposed the likelihoods now in the table from your sources; every quote below was
         verified as a literal substring of an uploaded source. Open a criterion to read its reasoning and citations.</p>` : ""}

      <h3>Optional: send to an LLM for source-grounded commentary</h3>
      <p>The numbers above are deterministic arithmetic.${window.ClaudeAnalyst && window.ClaudeAnalyst.hasKey()
        ? " Claude already ran (see above)." : " Connect Claude under ✦ AI to have it run automatically, or"}
         copy the prompt below into any LLM. It instructs the model to cite verbatim and never fabricate.</p>
      <pre id="analysis-prompt">${esc(buildAnalysisPrompt())}</pre>`;

    const tSlider = $("[data-temper]");
    if (tSlider) {
      tSlider.oninput = () => { $("#temper-pv").textContent = tSlider.value + "%"; };
      tSlider.onchange = () => { state.temper = +tSlider.value / 100; markCustomFraming(); recompute(); openReport(); };
    }
    $("#report-backdrop").hidden = false;
  }

  // =========================================================================
  // AI-augmented recalculate: optionally call Claude, then show the report
  // =========================================================================
  async function runClaudeAnalysis() {
    rescanSources();
    // Warn before a multi-pass (map-reduce) run, since each pass is a billed call.
    const srcs = state.sources.filter((s) => (s.text || "").trim());
    const totalChars = srcs.reduce((a, s) => a + (s.text || "").length, 0);
    if (srcs.length > 6 || totalChars > 500000) {
      const passes = Math.max(1, Math.ceil(totalChars / 200000)) + 1;
      if (!confirm(
        `${srcs.length} sources (${Math.round(totalChars / 1000)}k chars) will be read in multiple passes — ` +
        `about ${passes} Claude calls on your account, reading every source in full (no truncation), then one ` +
        `final scoring pass. Continue?`)) {
        return false;
      }
    }
    setProgress("Contacting Claude…", 0.1);
    let res;
    try {
      res = await window.ClaudeAnalyst.analyze(state, {
        onStatus: (m) => setProgress(m, 0.4),
      });
    } catch (e) {
      hideProgress();
      toast("Claude analysis failed — " + (e && e.message ? e.message : "unknown error"));
      return false;
    }
    // Apply Claude's likelihoods to the model and capture its reasoning.
    aiIndex = {};
    let applied = 0, totalDP = 0, countedDP = 0;
    const validIds = new Set(state.hypotheses.map((h) => h.id));
    res.criteria.forEach((c) => {
      const ev = state.evidence.find((x) => x.id === c.id);
      if (!ev) return;
      // Apply a likelihood per hypothesis id Claude returned (R, Nv, Nl, Nd, …).
      (c.hyp_likelihoods || []).forEach((hl) => {
        if (!hl || !validIds.has(hl.hyp_id)) return;
        const p = Math.max(0.01, Math.min(0.99, +hl.p));
        if (isFinite(p)) ev.likelihoods[hl.hyp_id] = p;
      });
      // Apply the epistemic-quality factor: ad hoc / circular / unfalsifiable /
      // opinion-only criteria get kappa -> 0 so they cannot move the posterior.
      if (c.quality != null && isFinite(+c.quality)) {
        ev.quality = Math.max(0, Math.min(1, +c.quality));
      }
      const dataPoints = (c.data_points || []);
      totalDP += dataPoints.length;
      countedDP += dataPoints.filter((d) => d.counts).length;
      aiIndex[c.id] = {
        rationale: c.rationale || "",
        parsimony_note: c.parsimony_note || "",
        quality: ev.quality,
        quality_reason: c.quality_reason || "",
        dataPoints,
      };
      applied++;
    });
    aiOverall = res.overall || "";
    hideProgress();
    const modeNote = res.mode === "map-reduce"
      ? ` — read ${res.sourcesRead} sources in ${res.calls} passes`
      : (res.truncated ? " — sources truncated to fit" : "");
    toast(`Claude assessed ${applied} criteria · ${totalDP} data point${totalDP === 1 ? "" : "s"}, ${countedDP} counted` + modeNote);
    return true;
  }

  async function onRecalculate() {
    const aiOn = aiEnabled();
    if (aiOn && window.ClaudeAnalyst && window.ClaudeAnalyst.hasKey()) {
      if (!state.sources.some((s) => (s.text || "").trim())) {
        toast("Upload a source first, or turn off AI in ✦ AI settings.");
      } else {
        await runClaudeAnalysis();
      }
    }
    openReport();
  }

  // =========================================================================
  // Methodology modal
  // =========================================================================
  function openHelp() {
    $("#help-body").innerHTML = `
      <p>This tool performs <strong>Bayesian model comparison</strong> between competing hypotheses
         about the fate of Jesus. It is honest arithmetic on editable inputs, not an oracle.</p>
      <h3>1 · Posterior in log-space</h3>
      <p>For mutually-exclusive hypotheses <code>H_k</code> and data <code>E_i</code>:</p>
      <pre>P(H_k | E) ∝ P(H_k) · Parsimony(H_k) · Π_i P(E_i | H_k)^{w_i}</pre>
      <p>We accumulate <code>log P</code> and normalise with the log-sum-exp trick, so dozens of small
         likelihoods never underflow to zero.</p>
      <h3>2 · Evidence as Bayes factors (decibans)</h3>
      <pre>BF_i = P(E_i | H_pro) / P(E_i | H_con);  weight = 10·log10(BF_i) decibans</pre>
      <p>Decibans are additive, so each datum's pull is directly comparable. +10 dB ≈ 10:1 in favour.</p>
      <h3>3 · Parsimony done correctly</h3>
      <p>Each hypothesis declares its <em>auxiliary assumptions</em>, each with a plausibility. Their product
         multiplies the prior: <code>P(H & A1 & A2 …) = P(H)·ΠP(Ai)</code>. A theory that must assume many
         improbable things pays for it automatically — the Bayesian form of Occam's razor.</p>
      <h3>3b · "Naturalistic" is a disjunction, not one hypothesis</h3>
      <p>Collapsing every naturalistic account into a single column and picking one number understates it. Instead
         the model enumerates distinct accounts — subjective visions, legendary development, unknown fate of the
         body — as separate competing hypotheses. Posteriors are normalised over all of them, and the
         <strong>naturalistic family probability is the sum</strong> of its members (the correct probability of the
         disjunction). Crucially, each datum in the table is scored against the <strong>best-fitting</strong>
         naturalistic account <em>for that datum</em>: you cannot refute the disjunction by beating its weakest
         member. This is why the honest lean is much weaker than a naïve "minimal facts" multiplication suggests.</p>
      <h3>4 · Independence weights and dependency groups</h3>
      <p>The single most common error in arguments like this is <strong>double-counting correlated evidence</strong>:
         multiplying the creed, the appearance reports, and the disciples' transformation as if they were
         independent witnesses, when they are largely one early tradition seen three ways. Two controls:</p>
      <p>The per-datum <code>weight ∈ [0,1]</code> down-weights a single datum's log-likelihood. More importantly,
         <strong>dependency groups</strong> let you mark a set of criteria as correlated with a parameter
         <code>ρ ∈ [0,1]</code>. The group's combined evidence is shrunk to an effective number of independent
         sources <code>n_eff = 1 + (n−1)(1−ρ)</code> and scaled by <code>n_eff/n</code>: at ρ=0 they are independent,
         at ρ=1 the whole group counts as one source. This is why the default posterior is lower than a naïve
         multiplication would give — it refuses to count one tradition several times.</p>
      <h3>4b · Epistemic quality — ad-hoc points cannot move the result</h3>
      <p>Each criterion carries an epistemic-quality factor <code>κ ∈ [0,1]</code> that scales its evidential
         weight by the <em>soundness</em> of the reasoning behind it, independently of how confidently it is
         asserted. A point whose support is <strong>ad hoc</strong> (contrived only to save a theory),
         <strong>circular</strong>, <strong>unfalsifiable</strong>, or mere unsupported opinion gets <code>κ→0</code>,
         which forces its likelihood ratio to 1 — <strong>zero impact on the posterior in either direction.</strong>
         With Claude connected, every data point is run through a fallacy check (ad hoc, circular, unfalsifiable,
         special pleading, argument from silence, anachronism) and κ is set accordingly; you can also neutralise
         any criterion yourself from its detail panel. This is the guard that stops a rhetorically strong but
         logically empty point from swaying the probability.</p>
      <h3>5 · Robustness &amp; audit trail</h3>
      <p>On Recalculate the report runs a 2,000-draw prior-sensitivity analysis (a 94% interval, not a point
         estimate) and a leave-one-out influence ranking, and you can download a full Markdown report — the
         priors, likelihoods, per-datum assessments, citations, and robustness — as a reproducible audit trail.</p>
      <h3>5b · Calibration &amp; overconfidence</h3>
      <p>Subjective likelihoods tend to be over-confident, and a single near-0 or near-1 number can dominate
         everything. The report audits for this: it flags likelihoods pinned at ~0/~1 (<strong>Cromwell's rule</strong> —
         asserting the data are impossible or certain under a hypothesis), reports whether one datum supplies most of
         the evidential weight, and warns on over-extreme posteriors. It also shows a <strong>tempering curve</strong>:
         the posterior as every likelihood is shrunk toward 0.5 (<code>logit(p')=(1−t)·logit(p)</code>). A conclusion
         that survives moderate tempering is not just an artefact of confident numbers — and the tempering slider lets
         you apply that discount globally.</p>
      <h3>5c · Framing presets</h3>
      <p>Much of the disagreement in this debate is not about the data but about the <em>stance</em> you bring to it:
         how low the prior for a miracle should be, how independent the criteria really are, and how much to trust
         confident numbers. The <strong>Framing</strong> presets set exactly those contested knobs — hypothesis priors,
         the background-theism plausibility, within-cluster correlation ρ, and global tempering — and <strong>nothing
         else</strong>. Your per-datum likelihoods, quality factors, and sources are untouched, so the presets let you
         A/B the same evidence under a <em>Skeptical (Humean)</em> framing (low miracle prior, near-redundant criteria,
         tempered) versus a <em>Maximal case</em> framing (higher prior, more independence). The honest takeaway is how
         far the answer moves on stance alone — if it swings from one side of 50% to the other, the data are not
         decisive on their own. Editing any of those knobs by hand switches the framing to "Custom".</p>
      <h3>6 · No hallucinated citations</h3>
      <p>Every quotation in the detail drawer is a literal substring of a file you uploaded. If a passage
         does not exist in your sources, it cannot be displayed, and the AI engine discards any quote that
         fails the verbatim check — so a discarded quote can never count toward a probability.</p>
      <h3>7 · Historical-critical assessment of each data point (✦ AI)</h3>
      <p>With Claude connected, clicking <strong>R</strong> or <strong>¬R</strong> lists every data point the
         author(s) use for that side, each classified by provenance — <em>quotes a source</em>,
         <em>historical reference</em>, <em>author's inference</em>, or <em>bare opinion</em> — with the author's
         own assessment and surrounding context. A datum the author themselves flags as disputed (e.g. an
         interpolated Testimonium Flavianum) is shown but marked <strong>does not count</strong>: a quotation's
         weight depends on its authenticity and on whether the author's inference from it is valid, not on the
         quotation alone.</p>`;
    $("#help-backdrop").hidden = false;
  }

  // =========================================================================
  // AI settings modal
  // =========================================================================
  function aiEnabled() { try { return localStorage.getItem(AI_ON_LS) === "1"; } catch { return false; } }

  function openSettings() {
    const C = window.ClaudeAnalyst;
    const sel = $("#model-select");
    sel.innerHTML = C.MODELS.map((m) => `<option value="${m.id}">${esc(m.label)}</option>`).join("");
    sel.value = C.getModel();
    $("#api-key").value = C.getKey();
    $("#ai-on-recalc").checked = aiEnabled();
    updateKeyStatus();
    $("#settings-backdrop").hidden = false;
  }
  function updateKeyStatus() {
    const has = !!$("#api-key").value.trim();
    $("#key-status").textContent = has
      ? "Key present — Recalculate can call Claude."
      : "No key — the tool runs fully offline and deterministic.";
  }
  function saveSettings() {
    const C = window.ClaudeAnalyst;
    C.setKey($("#api-key").value.trim());
    C.setModel($("#model-select").value);
    try { localStorage.setItem(AI_ON_LS, $("#ai-on-recalc").checked ? "1" : "0"); } catch {}
    $("#settings-backdrop").hidden = true;
    toast(C.hasKey() ? "AI settings saved" : "Running offline (no key)");
  }
  function clearKey() {
    window.ClaudeAnalyst.setKey("");
    $("#api-key").value = "";
    updateKeyStatus();
    toast("Key removed");
  }

  // =========================================================================
  // Add criterion
  // =========================================================================
  function addCriterion() {
    const id = "ev-" + Math.random().toString(36).slice(2, 8);
    const liks = {};
    state.hypotheses.forEach((h) => (liks[h.id] = 0.5));
    state.evidence.push({
      id, name: "New criterion", description: "Describe this data point.",
      likelihoods: liks, weight: 1, enabled: true, keywords: [], references: [],
      note: "Set likelihoods and keywords, then Recalculate.",
    });
    rescanSources();
    recompute();
    openDetail(id, lastResult.pivot.proId);
  }

  // =========================================================================
  // Export / import / reset
  // =========================================================================
  function exportModel() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "resurrection-bayes-model.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function importModel(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.hypotheses || !data.evidence) throw 0;
        state = data;
        state.sources = state.sources || [];
        rescanSources();
        renderAll();
        toast("Model imported");
      } catch { toast("Invalid model file"); }
    };
    reader.readAsText(file);
  }
  function resetModel() {
    if (!confirm("Restore the default model? Your edits and uploaded sources will be cleared.")) return;
    state = freshState();
    matchIndex = {};
    renderAll();
    toast("Model reset to defaults");
  }

  // =========================================================================
  // Framing presets — set only the contested stance knobs (priors, miracle
  // prior, within-cluster correlation, tempering). Per-datum likelihoods,
  // quality, and sources are never touched, so framings A/B cleanly.
  // =========================================================================
  const FRAMING_LABEL = { balanced: "Balanced", skeptical: "Skeptical (Humean)", maximal: "Maximal case", custom: "Custom" };

  function applyPreset(name) {
    const setPrior = (id, p) => { const h = hyp(id); if (h) h.prior = p; };
    const setRho = (v) => { (state.groups || []).forEach((g) => (g.rho = v)); };
    const setTheism = (p) => { const R = hyp("R"); if (R && R.assumptions && R.assumptions[0]) R.assumptions[0].plausibility = p; };

    if (name === "skeptical") {
      // Humean: low prior for a miracle, distrust confident numbers, treat
      // correlated criteria as nearly redundant (minimal independent evidence).
      setPrior("R", 0.2); setPrior("Nv", 0.4); setPrior("Nl", 0.2); setPrior("Nd", 0.2);
      setTheism(0.2); setRho(0.8); state.temper = 0.25;
    } else if (name === "maximal") {
      // Strong-case framing: higher miracle prior, criteria treated as more
      // independent, no tempering.
      setPrior("R", 0.5); setPrior("Nv", 0.22); setPrior("Nl", 0.16); setPrior("Nd", 0.12);
      setTheism(0.65); setRho(0.3); state.temper = 0;
    } else { // balanced — restore shipped defaults for the stance knobs only
      setPrior("R", 0.4); setPrior("Nv", 0.25); setPrior("Nl", 0.2); setPrior("Nd", 0.15);
      setTheism(0.5); state.temper = 0;
      const def = window.DefaultModel.groups();
      (state.groups || []).forEach((g) => { const d = def.find((x) => x.id === g.id); if (d) g.rho = d.rho; });
    }
    state.framing = name;
    recompute(); renderHypotheses(); renderGroups();
    const sel = $("#framing-select"); if (sel) sel.value = name;
    toast(`Framing: ${FRAMING_LABEL[name] || name}`);
  }

  // Any manual edit to a stance knob means we're no longer on a named preset.
  function markCustomFraming() {
    if (state.framing && state.framing !== "custom") {
      state.framing = "custom";
      const sel = $("#framing-select"); if (sel) sel.value = "custom";
    }
  }

  // =========================================================================
  // Wire global events + boot
  // =========================================================================
  function renderAll() {
    recompute();
    renderHypotheses();
    renderGroups();
    renderSources();
  }

  // =========================================================================
  // Evidence dependency groups (anti-double-counting)
  // =========================================================================
  function renderGroups() {
    const box = $("#dep-panel");
    if (!box) return;
    state.groups = state.groups || [];
    const groups = state.groups;
    const count = {};
    state.evidence.forEach((e) => { if (e.group) count[e.group] = (count[e.group] || 0) + 1; });

    let html = `<p class="hint">Correlated criteria (the same underlying source or tradition) must not be
      multiplied as if independent. Group them and set how correlated they are (ρ); the engine discounts the
      group to an <em>effective number of independent sources</em>. ρ=0 → independent; ρ=1 → counts as one.</p>`;
    if (!groups.length) html += `<p class="parsimony-note">No groups — every criterion is treated as independent.</p>`;

    groups.forEach((g) => {
      const n = count[g.id] || 0;
      const nEff = n <= 1 ? n : 1 + (n - 1) * (1 - (g.rho || 0));
      html += `<div class="dep-group">
        <input class="dep-label" type="text" value="${esc(g.label)}" data-glabel="${g.id}">
        <div class="prior-row"><span>ρ</span>
          <input type="range" min="0" max="100" value="${Math.round((g.rho || 0) * 100)}" data-grho="${g.id}">
          <span class="pv" data-grhov="${g.id}">${Math.round((g.rho || 0) * 100)}%</span></div>
        <div class="parsimony-note">${n} member(s) → counts as ~<strong>${nEff.toFixed(2)}</strong> independent source(s)</div>
        <button class="btn danger" data-gdel="${g.id}">remove group</button>
      </div>`;
    });
    html += `<button class="btn small" id="add-group">+ New group</button>`;
    html += `<div class="dep-assign"><div class="alabel">Assign criteria to a group</div>`;
    state.evidence.forEach((e) => {
      const opts = `<option value="">— independent —</option>` +
        groups.map((g) => `<option value="${g.id}" ${e.group === g.id ? "selected" : ""}>${esc(g.label)}</option>`).join("");
      html += `<div class="dep-row"><span>${esc(e.name)}</span><select data-gassign="${e.id}">${opts}</select></div>`;
    });
    html += `</div>`;
    box.innerHTML = html;

    $$("[data-glabel]").forEach((i) => i.onchange = () => { const g = findGroup(i.dataset.glabel); if (g) { g.label = i.value; persist(); renderGroups(); } });
    $$("[data-grho]").forEach((r) => {
      r.oninput = () => { const pv = $(`[data-grhov="${r.dataset.grho}"]`); if (pv) pv.textContent = r.value + "%"; };
      r.onchange = () => { const g = findGroup(r.dataset.grho); if (g) { g.rho = +r.value / 100; markCustomFraming(); recompute(); renderGroups(); } };
    });
    $$("[data-gdel]").forEach((b) => b.onclick = () => {
      const id = b.dataset.gdel;
      state.groups = state.groups.filter((g) => g.id !== id);
      state.evidence.forEach((e) => { if (e.group === id) delete e.group; });
      recompute(); renderGroups();
    });
    const add = $("#add-group");
    if (add) add.onclick = () => {
      const label = prompt('Group name (e.g. "Synoptic-dependent reports"):');
      if (!label) return;
      state.groups.push({ id: "g-" + Math.random().toString(36).slice(2, 7), label: label.trim(), rho: 0.5 });
      recompute(); renderGroups();
    };
    $$("[data-gassign]").forEach((s) => s.onchange = () => {
      const e = state.evidence.find((x) => x.id === s.dataset.gassign);
      if (!e) return;
      if (s.value) e.group = s.value; else delete e.group;
      recompute(); renderGroups();
    });
  }

  let migrated = false;
  function boot() {
    // Migrate an older saved model to the current default schema. The hypotheses
    // and criteria changed structurally (2 → 4 hypotheses, dependency groups, new
    // criteria), so an old persisted model can't be patched in place — we rebuild
    // from the current defaults but KEEP the user's uploaded sources.
    if (state.version !== window.DefaultModel.version()) {
      const keptSources = Array.isArray(state.sources) ? state.sources : [];
      state = freshState();
      state.sources = keptSources;
      persist();
      migrated = true;
    }
    state.groups = state.groups || [];
    // Point PDF.js at its worker (same CDN/version as the library in index.html).
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    rescanSources();
    renderAll();
    if (migrated) setTimeout(() => toast("Updated to the latest criteria set — your uploaded sources were kept."), 400);

    $("#btn-recalculate").onclick = onRecalculate;
    $("#btn-add-evidence").onclick = addCriterion;
    $("#filter-select").onchange = (e) => { view.filter = e.target.value; renderTable(); };
    $("#sort-select").onchange = (e) => { view.sort = e.target.value; renderTable(); };
    $("#framing-select").value = state.framing || "custom";
    $("#framing-select").onchange = (e) => { if (e.target.value !== "custom") applyPreset(e.target.value); };
    $("#btn-help").onclick = openHelp;
    $("#btn-export").onclick = exportModel;
    $("#btn-reset").onclick = resetModel;

    // AI settings
    $("#btn-settings").onclick = openSettings;
    $("#settings-close").onclick = () => ($("#settings-backdrop").hidden = true);
    $("#settings-save").onclick = saveSettings;
    $("#settings-clear").onclick = clearKey;
    $("#api-key").oninput = updateKeyStatus;
    $("#settings-backdrop").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.hidden = true; });
    $("#file-import").onchange = (e) => e.target.files[0] && importModel(e.target.files[0]);

    $("#file-sources").onchange = (e) => { addFiles(e.target.files); e.target.value = ""; };
    $("#btn-add-paste").onclick = () => {
      const ta = $("#paste-source");
      const text = ta.value.trim();
      if (!text) return toast("Nothing to add");
      state.sources.push({ id: "src-" + Math.random().toString(36).slice(2, 9), name: "Pasted source " + (state.sources.length + 1), text });
      ta.value = "";
      rescanSources(); renderSources(); recompute();
      toast("Pasted source added");
    };

    // drag & drop
    const dz = $("#dropzone");
    ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("drag"); }));
    dz.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

    // drawer / modal close
    $("#drawer-close").onclick = closeDrawer;
    $("#drawer-backdrop").onclick = closeDrawer;
    $("#report-close").onclick = $("#report-ok").onclick = () => ($("#report-backdrop").hidden = true);
    $("#help-close").onclick = $("#help-ok").onclick = () => ($("#help-backdrop").hidden = true);
    // Tap the dark area outside a modal to dismiss it (mobile-friendly).
    $("#report-backdrop").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.hidden = true; });
    $("#help-backdrop").addEventListener("click", (e) => { if (e.target === e.currentTarget) e.currentTarget.hidden = true; });
    $("#btn-copy-prompt").onclick = () => {
      const txt = $("#analysis-prompt").textContent;
      navigator.clipboard?.writeText(txt).then(() => toast("Prompt copied")).catch(() => toast("Copy failed"));
    };
    $("#btn-download-report").onclick = downloadReport;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeDrawer();
        $("#report-backdrop").hidden = true;
        $("#help-backdrop").hidden = true;
        $("#settings-backdrop").hidden = true;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
