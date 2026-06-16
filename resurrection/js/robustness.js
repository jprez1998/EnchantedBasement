/* =============================================================================
 * robustness.js — Prior-sensitivity & influence analysis for the Bayes table.
 *
 * This applies, in the browser, the core guardrails of a principled Bayesian
 * workflow to our closed-form model comparison:
 *
 *   1. PRIOR SENSITIVITY (the headline rule): a conclusion that flips when you
 *      nudge the priors/likelihoods within plausible bounds is not robust. We
 *      Monte-Carlo perturb every prior, auxiliary-assumption plausibility, and
 *      enabled likelihood, re-derive the posterior with the SAME tested engine,
 *      and report the distribution of P(Resurrection) — not a single point.
 *
 *   2. REPORT AN INTERVAL, NOT A POINT: we return a 94% central credible
 *      interval over the perturbations, and the fraction of perturbations in
 *      which the leading hypothesis still leads (a robustness probability).
 *
 *   3. INFLUENCE / LEAVE-ONE-OUT: for each datum we disable it and measure the
 *      shift in P(Resurrection). This ranks which data points actually drive the
 *      result, so a conclusion resting on one fragile datum is visible.
 *
 * Pure module (no DOM). It reuses BayesEngine.compute so the arithmetic is
 * identical to the live table — no second, divergent implementation.
 * ========================================================================== */

(function (global) {
  "use strict";

  const clamp01 = (p) => Math.min(0.999, Math.max(0.001, p));

  // Box–Muller standard normal from a seeded LCG (reproducible).
  function makeRng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s = (1664525 * s + 1013904223) >>> 0; return s / 4294967296; };
  }
  function gauss(rng) {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const jitterLogit = (p, sigma, rng) => {
    const x = Math.log(clamp01(p) / (1 - clamp01(p))) + sigma * gauss(rng);
    return 1 / (1 + Math.exp(-x));
  };
  const jitterPos = (v, sigma, rng) => Math.max(1e-6, v) * Math.exp(sigma * gauss(rng));

  function slim(state) {
    return {
      hypotheses: JSON.parse(JSON.stringify(state.hypotheses)),
      evidence: JSON.parse(JSON.stringify(state.evidence)),
      groups: JSON.parse(JSON.stringify(state.groups || [])), // keep dependency discount
      temper: state.temper || 0,                              // keep calibration tempering
    };
  }
  function proPosterior(model, proId) {
    const r = global.BayesEngine.compute(model);
    // Track the Resurrection-family posterior vs the naturalistic-family total.
    const resP = r.totals.resPosterior != null ? r.totals.resPosterior
      : (r.hypotheses.find((x) => x.id === proId) || {}).posterior || 0;
    const natP = r.totals.natPosterior != null ? r.totals.natPosterior : (1 - resP);
    return { p: resP, natP, pivot: r.pivot };
  }

  /**
   * opts: { samples=2000, sigmaPrior=0.5, sigmaAux=0.4, sigmaLik=0.4, seed }
   * Returns a robustness summary for P(pro hypothesis).
   */
  function analyze(state, opts = {}) {
    const samples = opts.samples || 2000;
    const sPrior = opts.sigmaPrior ?? 0.5;
    const sAux = opts.sigmaAux ?? 0.4;
    const sLik = opts.sigmaLik ?? 0.4;
    const rng = makeRng(opts.seed || 20260616);

    const base = global.BayesEngine.compute(state);
    const proId = base.pivot.proId, conId = base.pivot.conId;
    const baseP = base.totals.resPosterior != null
      ? base.totals.resPosterior : base.hypotheses.find((h) => h.id === proId).posterior;

    // --- Monte-Carlo prior/likelihood sensitivity -------------------------
    const draws = new Array(samples);
    let holds = 0; // perturbations where Resurrection family still beats naturalistic
    for (let i = 0; i < samples; i++) {
      const m = slim(state);
      m.hypotheses.forEach((h) => {
        h.prior = jitterPos(h.prior == null ? 0.5 : h.prior, sPrior, rng);
        (h.assumptions || []).forEach((a) => { a.plausibility = jitterLogit(a.plausibility, sAux, rng); });
      });
      m.evidence.forEach((e) => {
        if (e.enabled === false) return;
        Object.keys(e.likelihoods || {}).forEach((k) => {
          e.likelihoods[k] = jitterLogit(e.likelihoods[k], sLik, rng);
        });
      });
      // Also perturb the correlation assumption itself, so the interval reflects
      // uncertainty about how dependent the grouped evidence really is.
      (m.groups || []).forEach((g) => { g.rho = jitterLogit(g.rho == null ? 0.001 : g.rho, opts.sigmaRho ?? 0.3, rng); });
      const out = proPosterior(m, proId);
      draws[i] = out.p;
      if (out.p > out.natP) holds++;
    }
    draws.sort((a, b) => a - b);
    const q = (p) => draws[Math.min(samples - 1, Math.max(0, Math.floor(p * samples)))];
    const mean = draws.reduce((a, b) => a + b, 0) / samples;
    const baseLeadsRes = baseP >= (base.totals.natPosterior ?? (1 - baseP));
    const favourFrac = baseLeadsRes ? holds / samples : 1 - holds / samples;
    const lead = baseLeadsRes ? "pro" : "con";

    // --- Leave-one-out influence per datum --------------------------------
    const influence = [];
    state.evidence.forEach((e) => {
      if (e.enabled === false) return;
      const m = slim(state);
      const me = m.evidence.find((x) => x.id === e.id);
      me.enabled = false;
      const without = proPosterior(m, proId).p;
      influence.push({ id: e.id, name: e.name, delta: baseP - without });
    });
    influence.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return {
      proId, conId, lead,
      base: baseP,
      mean,
      lo: q(0.03), hi: q(0.97), // 94% central credible interval
      favourFrac,               // P(conclusion holds under perturbation)
      robust: favourFrac >= 0.9,
      influence,
      samples, sigma: { prior: sPrior, aux: sAux, lik: sLik },
    };
  }

  global.BayesRobustness = { analyze };
})(window);
