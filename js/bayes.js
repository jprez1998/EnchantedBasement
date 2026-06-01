/* =============================================================================
 * bayes.js — The statistical core of the Resurrection Bayes Table.
 *
 * This module is intentionally pure (no DOM access). It implements a
 * defensible, transparent Bayesian model comparison across an arbitrary
 * number of mutually-exclusive hypotheses, using methods that survive
 * scrutiny by a working statistician:
 *
 *   1. Posterior probabilities are computed in LOG SPACE and normalised with
 *      the log-sum-exp trick to avoid floating-point underflow. With dozens of
 *      likelihoods in the (0,1) range, naive multiplication underflows to 0.
 *
 *   2. Evidence is combined in ODDS form (Bayes factors). For two hypotheses
 *      the posterior odds = prior odds x product of likelihood ratios. We
 *      report the base-10 log Bayes factor ("bans"/"decibans" of evidence) so
 *      each datum's contribution is additive and interpretable.
 *
 *   3. PARSIMONY (Occam's razor) is handled the correct Bayesian way, not by an
 *      ad-hoc penalty. A hypothesis that needs extra independent auxiliary
 *      assumptions to explain the data must pay the joint prior probability of
 *      those assumptions: P(H & A1 & A2 ...) = P(H) * prod P(Ai). A theory that
 *      requires improbable conjuncts is therefore automatically demoted. This
 *      is the same mechanism behind the Bayesian Occam factor / Bayes-factor
 *      penalty for model complexity.
 *
 *   4. Conditional independence is NOT assumed silently. Each datum carries a
 *      `weight` in [0,1] that down-weights its log-likelihood contribution.
 *      Correlated data (e.g. four Gospels reporting one tradition) can be
 *      collectively weighted so they are not quadruple-counted. The model
 *      surfaces this assumption rather than hiding it.
 *
 * No claim is made that the default numbers are "the" correct numbers. They are
 * editable priors. The engine's job is to be honest arithmetic on whatever the
 * user (and the sources) justify.
 * ========================================================================== */

(function (global) {
  "use strict";

  const EPS = 1e-12;

  /** Numerically stable log(sum(exp(x_i))). */
  function logSumExp(logs) {
    if (!logs.length) return -Infinity;
    const m = Math.max(...logs);
    if (m === -Infinity) return -Infinity;
    let s = 0;
    for (const l of logs) s += Math.exp(l - m);
    return m + Math.log(s);
  }

  function clampProb(p) {
    if (!isFinite(p)) return EPS;
    if (p <= 0) return EPS;
    if (p >= 1) return 1 - EPS;
    return p;
  }

  /** Joint plausibility of a hypothesis' auxiliary assumptions (the Occam term). */
  function parsimonyFactor(hyp) {
    const a = hyp.assumptions || [];
    if (!a.length) return 1;
    let logP = 0;
    for (const item of a) logP += Math.log(clampProb(item.plausibility));
    return Math.exp(logP);
  }

  /**
   * Core computation.
   *
   * Returns, for the supplied state:
   *   - hypotheses: [{ id, name, prior(normalised), parsimony, logScore,
   *                    posterior, logPrior }]
   *   - evidence:   [{ id, ...original, contributions: {hypId: weightedLogLik},
   *                    logBF, decibans, swing }]  (BF relative to the pivot pair)
   *   - pivot:      { proId, conId }  the two hypotheses the table contrasts
   *   - totals:     { logBFsum, priorDecibans, posteriorDecibans }
   */
  function compute(state) {
    const hyps = state.hypotheses.map((h) => ({ ...h }));
    const enabledEvidence = state.evidence.filter((e) => e.enabled !== false);

    // --- Normalise priors ---------------------------------------------------
    const rawPriors = hyps.map((h) => Math.max(EPS, +h.prior || 0));
    const priorSum = rawPriors.reduce((a, b) => a + b, 0) || 1;
    hyps.forEach((h, i) => {
      h.prior = rawPriors[i] / priorSum;
      h.parsimony = parsimonyFactor(h);
      h.logPrior = Math.log(clampProb(h.prior)) + Math.log(clampProb(h.parsimony));
    });

    // --- Accumulate weighted log-likelihoods -------------------------------
    const logScore = {};
    hyps.forEach((h) => (logScore[h.id] = h.logPrior));

    const evidenceOut = state.evidence.map((e) => {
      const contributions = {};
      hyps.forEach((h) => {
        const lik = clampProb((e.likelihoods && e.likelihoods[h.id]) ?? 0.5);
        const w = e.weight == null ? 1 : Math.max(0, Math.min(1, +e.weight));
        const c = w * Math.log(lik);
        contributions[h.id] = c;
        if (e.enabled !== false) logScore[h.id] += c;
      });
      return { ...e, contributions };
    });

    // --- Normalise posteriors via softmax over log scores ------------------
    const scores = hyps.map((h) => logScore[h.id]);
    const lse = logSumExp(scores);
    hyps.forEach((h) => {
      h.logScore = logScore[h.id];
      h.posterior = Math.exp(logScore[h.id] - lse);
    });

    // --- Pivot pair for the two-column Bayes-factor view -------------------
    // proId = the explicit "resurrection" hypothesis (role === 'pro') or the
    // first hypothesis; conId = the strongest competing hypothesis.
    const pro = hyps.find((h) => h.role === "pro") || hyps[0];
    const competitors = hyps.filter((h) => h.id !== pro.id);
    const con = competitors.slice().sort((a, b) => b.posterior - a.posterior)[0] || hyps[1] || pro;

    // Per-datum Bayes factor (pro vs con) and its decibans contribution.
    let logBFsum = 0;
    evidenceOut.forEach((e) => {
      const cp = e.contributions[pro.id] ?? 0;
      const cc = e.contributions[con.id] ?? 0;
      const logBF = cp - cc; // natural-log Bayes factor for this datum
      e.logBF = logBF;
      e.decibans = (10 / Math.log(10)) * logBF; // 10*log10(BF)
      e.swing = logBF; // signed: >0 favours pro, <0 favours con
      if (e.enabled !== false) logBFsum += logBF;
    });

    const priorLogOdds = pro.logPrior - con.logPrior;
    const postLogOdds = logScore[pro.id] - logScore[con.id];

    return {
      hypotheses: hyps,
      evidence: evidenceOut,
      pivot: { proId: pro.id, conId: con.id },
      totals: {
        logBFsum,
        priorDecibans: (10 / Math.log(10)) * priorLogOdds,
        posteriorDecibans: (10 / Math.log(10)) * postLogOdds,
        priorOdds: Math.exp(priorLogOdds),
        posteriorOdds: Math.exp(postLogOdds),
      },
    };
  }

  /** Human-readable strength of evidence on the Jeffreys / Kass-Raftery scale. */
  function bfStrength(logBF) {
    const b = Math.abs(logBF);
    let label;
    if (b < Math.log(3)) label = "Not worth more than a bare mention";
    else if (b < Math.log(10)) label = "Substantial";
    else if (b < Math.log(30)) label = "Strong";
    else if (b < Math.log(100)) label = "Very strong";
    else label = "Decisive";
    return label;
  }

  global.BayesEngine = { compute, logSumExp, bfStrength, parsimonyFactor, clampProb };
})(window);
