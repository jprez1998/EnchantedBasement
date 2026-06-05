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

  // --- State ---------------------------------------------------------------
  let state = load() || freshState();
  let lastResult = null;       // last BayesEngine.compute(...) output
  let matchIndex = {};         // evidenceId -> [verbatim snippet, ...]

  function freshState() {
    return {
      hypotheses: window.DefaultModel.hypotheses(),
      evidence: window.DefaultModel.evidence(),
      sources: [],
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {}
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
    const sorted = r.hypotheses.slice().sort((a, b) => b.posterior - a.posterior);
    const bars = sorted.map((h) => `
      <div class="vbar">
        <span class="vname" style="color:${h.color}">${esc(h.name)}</span>
        <div class="vtrack"><div class="vfill" style="width:${(h.posterior * 100).toFixed(1)}%;background:${h.color}"></div></div>
        <span class="vpct">${fmtPct(h.posterior)}</span>
      </div>`).join("");

    const pro = hyp(r.pivot.proId), con = hyp(r.pivot.conId);
    const odds = r.totals.posteriorOdds;
    const oddsTxt = odds >= 1
      ? `${fmtNum(odds, 2)} : 1 for ${esc(pro.short)}`
      : `${fmtNum(1 / odds, 2)} : 1 for ${esc(con.short)}`;

    $("#verdict").innerHTML = `
      <div class="verdict-bars">${bars}</div>
      <div class="verdict-odds">
        <span class="muted">Posterior odds</span>
        <span class="big">${esc(oddsTxt)}</span>
        <span class="muted">Evidence swing: ${fmtNum(r.totals.posteriorDecibans - r.totals.priorDecibans, 1)} decibans
          (${window.BayesEngine.bfStrength(r.totals.logBFsum)})</span>
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
    $("#th-con").textContent = con.short;
    $("#th-con").style.color = con.color;

    const body = $("#bayes-body");
    body.innerHTML = "";
    r.evidence.forEach((e) => {
      const orig = state.evidence.find((x) => x.id === e.id);
      const tr = document.createElement("tr");
      if (e.enabled === false) tr.classList.add("row-disabled");

      const likPro = (orig.likelihoods[pro.id] ?? 0.5);
      const likCon = (orig.likelihoods[con.id] ?? 0.5);
      const cites = (matchIndex[e.id] || []).length;
      const deci = e.enabled === false ? 0 : e.decibans;
      const pillCls = deci > 0.2 ? "bf-pro" : deci < -0.2 ? "bf-con" : "bf-neutral";
      const pillTxt = (deci > 0 ? "+" : "") + fmtNum(deci, 1) + " dB";

      tr.innerHTML = `
        <td class="col-toggle"><input type="checkbox" class="toggle" data-id="${e.id}" ${e.enabled === false ? "" : "checked"} title="Include in calculation"></td>
        <td>
          <div class="crit-name" data-detail="${e.id}">${esc(e.name)}</div>
          <div class="crit-note">${esc(e.note || "")}</div>
        </td>
        <td class="cell-hyp pro" data-cell="${e.id}" data-hyp="${pro.id}">
          <span class="likeval">${likPro.toFixed(2)}</span>
          <div class="likebar"><div class="likefill" style="width:${likPro * 100}%"></div></div>
        </td>
        <td class="cell-hyp con" data-cell="${e.id}" data-hyp="${con.id}">
          <span class="likeval">${likCon.toFixed(2)}</span>
          <div class="likebar"><div class="likefill" style="width:${likCon * 100}%"></div></div>
        </td>
        <td><input class="cell-edit" type="number" min="0" max="1" step="0.05" value="${orig.weight ?? 1}" data-weight="${e.id}"></td>
        <td><span class="bf-pill ${pillCls}" title="${window.BayesEngine.bfStrength(e.logBF)}">${pillTxt}</span></td>
        <td><span class="cite-count ${cites ? "has" : ""}" data-cites="${e.id}">${cites}</span></td>`;
      body.appendChild(tr);
    });

    // Footer totals
    $("#foot-pro").textContent = fmtPct(pro.posterior);
    $("#foot-pro").style.color = pro.color;
    $("#foot-con").textContent = fmtPct(con.posterior);
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
    state.hypotheses.forEach((h) => {
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
      const words = (s.text.trim().match(/\S+/g) || []).length;
      li.innerHTML = `
        <span>
          <span class="sname">${esc(s.name)}</span>
          <span class="smeta">${words.toLocaleString()} words</span>
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

  async function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const isPdf = (f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    if (files.some(isPdf)) toast("Reading PDF…");
    let added = 0;
    for (const f of files) {
      try {
        const rec = await window.SourceMatcher.readFile(f);
        if (!rec.text || !rec.text.trim()) {
          // A PDF with no text layer (e.g. a scan/photo) yields nothing to quote.
          toast(rec.kind === "pdf"
            ? `“${f.name}” has no selectable text (looks scanned). Citations need a text layer.`
            : `“${f.name}” is empty.`);
          continue;
        }
        state.sources.push(rec);
        added++;
      } catch (e) {
        toast("Could not read " + f.name + (e && e.message ? " — " + e.message : ""));
      }
    }
    if (!added) return;
    rescanSources();
    renderSources();
    recompute();
    toast(added + " source(s) added");
  }

  // =========================================================================
  // Detail drawer (the "click a side to see why" feature)
  // =========================================================================
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

      <h3>Why it moves the probability</h3>
      <p>${esc(orig.note || "This datum's effect is determined entirely by its likelihood ratio across the hypotheses.")}
         Because P(datum | ${esc(h.short)}) = ${likH.toFixed(2)} versus an across-hypotheses average of ${mean.toFixed(2)},
         observing it ${raises ? "increases" : lowers ? "decreases" : "barely changes"} the posterior credence in ${esc(h.short)}.</p>

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
        ${r.hypotheses.map((h) => `<tr><td style="color:${h.color}"><strong>${esc(h.name)}</strong></td>
          <td class="num">${fmtPct(h.prior)}</td><td class="num">${h.parsimony.toFixed(3)}</td>
          <td class="num"><strong>${fmtPct(h.posterior)}</strong></td></tr>`).join("")}
      </table>
      <p><strong>Net evidential swing:</strong> ${(totalSwing > 0 ? "+" : "") + fmtNum(totalSwing, 1)} decibans
         toward ${totalSwing >= 0 ? esc(pro.short) : esc(con.short)}
         (${window.BayesEngine.bfStrength(r.totals.logBFsum)}).</p>

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

      <h3>Optional: send to an LLM for source-grounded commentary</h3>
      <p>The numbers above are fully deterministic. If you want narrative commentary that <em>quotes your sources</em>,
         copy the prompt below into any LLM. It instructs the model to cite verbatim and never fabricate.</p>
      <pre id="analysis-prompt">${esc(buildAnalysisPrompt())}</pre>`;

    $("#report-backdrop").hidden = false;
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
      <h3>4 · Independence weights</h3>
      <p>Correlated data (e.g. four Gospels echoing one tradition) would be over-counted under naive
         independence. The <code>weight ∈ [0,1]</code> on each datum down-weights its log-likelihood so you can
         model that dependence explicitly instead of pretending it away.</p>
      <h3>5 · No hallucinated citations</h3>
      <p>Every quotation in the detail drawer is a literal substring of a file you uploaded, shown with its
         character offsets. If a passage does not exist in your sources, it cannot be displayed.</p>`;
    $("#help-backdrop").hidden = false;
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
  // Wire global events + boot
  // =========================================================================
  function renderAll() {
    recompute();
    renderHypotheses();
    renderSources();
  }

  function boot() {
    // Point PDF.js at its worker (same CDN/version as the library in index.html).
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    rescanSources();
    renderAll();

    $("#btn-recalculate").onclick = openReport;
    $("#btn-add-evidence").onclick = addCriterion;
    $("#btn-help").onclick = openHelp;
    $("#btn-export").onclick = exportModel;
    $("#btn-reset").onclick = resetModel;
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
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeDrawer();
        $("#report-backdrop").hidden = true;
        $("#help-backdrop").hidden = true;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
