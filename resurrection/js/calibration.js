/* =============================================================================
 * calibration.js — Calibration & overconfidence audit (pure, no DOM).
 *
 * Subjective likelihoods are prone to OVERCONFIDENCE, and a single near-0 or
 * near-1 number can dominate the whole result. This module audits the model for
 * the failure modes a careful Bayesian watches for:
 *
 *   1. Cromwell's rule — likelihoods pinned at ~0 or ~1 assert that the data are
 *      impossible / certain under a hypothesis, which is almost never defensible
 *      and gives one number runaway leverage.
 *   2. Datum dominance — if one criterion supplies most of the total evidential
 *      weight, the conclusion rests on a single elicited number.
 *   3. Posterior extremity — a >97% / <3% posterior usually reflects confident
 *      inputs more than decisive evidence.
 *
 * It also computes a TEMPERING CURVE: the posterior as every likelihood is
 * shrunk toward 0.5 on the logit scale (temper 0 → as-stated, 1 → no evidence).
 * A conclusion that survives moderate tempering is not merely an artefact of
 * overconfident numbers.
 * ========================================================================== */

(function (global) {
  "use strict";

  const logit = (p) => Math.log(p / (1 - p));

  function analyze(state) {
    const E = global.BayesEngine;
    const r = E.compute({ ...state, temper: 0 });
    const enabled = state.evidence.filter((e) => e.enabled !== false);

    // --- Extreme likelihoods (Cromwell's rule) ----------------------------
    const extreme = [];
    let nLik = 0, nStrong = 0, sumAbsLogit = 0;
    enabled.forEach((e) => {
      state.hypotheses.forEach((h) => {
        const p = (e.likelihoods && e.likelihoods[h.id]);
        if (p == null) return;
        nLik++;
        const al = Math.abs(logit(Math.min(0.999, Math.max(0.001, p))));
        sumAbsLogit += al;
        if (al > 2) nStrong++;               // p < 0.12 or > 0.88
        if (p <= 0.05 || p >= 0.95) extreme.push({ id: e.id, name: e.name, hyp: h.short, p });
      });
    });
    const cromwell = extreme.filter((x) => x.p <= 0.02 || x.p >= 0.98);

    // --- Datum dominance ---------------------------------------------------
    let totalAbs = 0;
    const shares = r.evidence
      .filter((e) => e.enabled !== false)
      .map((e) => ({ id: e.id, name: e.name, abs: Math.abs(e.decibans) }));
    shares.forEach((s) => (totalAbs += s.abs));
    shares.forEach((s) => (s.share = totalAbs > 0 ? s.abs / totalAbs : 0));
    shares.sort((a, b) => b.share - a.share);
    const top = shares[0] || { share: 0, name: "—" };

    // --- Posterior extremity ----------------------------------------------
    const resP = r.totals.resPosterior;

    // --- Tempering curve ---------------------------------------------------
    const curve = [0, 0.25, 0.5, 0.75].map((t) => ({
      temper: t,
      resP: E.compute({ ...state, temper: t }).totals.resPosterior,
    }));

    // --- Recommendations ---------------------------------------------------
    const recs = [];
    if (cromwell.length) recs.push(`${cromwell.length} likelihood(s) are at ~0 or ~1 (Cromwell's rule): a claim that the data are impossible or certain under a hypothesis. Regress these toward 0.5 unless truly warranted.`);
    else if (extreme.length) recs.push(`${extreme.length} likelihood(s) are more extreme than 0.95 / 0.05 — the least defensible part of any elicitation. Check each is justified.`);
    if (top.share > 0.4) recs.push(`One datum ("${top.name}") supplies ${(top.share * 100).toFixed(0)}% of the total evidential weight — the conclusion rests heavily on a single number.`);
    if (resP > 0.97 || resP < 0.03) recs.push(`The posterior (${(resP * 100).toFixed(1)}%) is very extreme; with subjective inputs this usually reflects confident numbers more than decisive evidence.`);
    const tempered50 = curve.find((c) => c.temper === 0.5);
    if (tempered50 && Math.abs(tempered50.resP - resP) > 0.15) recs.push(`Shrinking every likelihood halfway to 0.5 moves the posterior from ${(resP * 100).toFixed(0)}% to ${(tempered50.resP * 100).toFixed(0)}% — the result depends materially on how confident the numbers are.`);
    if (!recs.length) recs.push("No major calibration concerns: likelihoods are moderate, no single datum dominates, and the posterior is not over-extreme.");

    const overconfidence = nLik ? nStrong / nLik : 0; // share of strong (|logit|>2) likelihoods

    return {
      extreme, cromwell,
      nLik, nStrong, overconfidence,
      meanAbsLogit: nLik ? sumAbsLogit / nLik : 0,
      dominance: { top, shares },
      resP, posteriorExtreme: resP > 0.97 || resP < 0.03,
      curve, recommendations: recs,
    };
  }

  global.BayesCalibration = { analyze };
})(window);
