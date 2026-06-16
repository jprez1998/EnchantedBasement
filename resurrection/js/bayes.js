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
    // Dependency groups: correlated criteria (e.g. several reports of one early
    // tradition) must not be multiplied at full strength. Each group has a
    // correlation rho in [0,1]; we discount its combined evidence to an
    // "effective number of independent sources" n_eff = 1 + (n-1)(1-rho), and
    // scale every member's contribution by n_eff/n. rho=0 → independent (no
    // change); rho=1 → the whole group counts as a single source.
    const groupRho = {};
    (state.groups || []).forEach((g) => { groupRho[g.id] = Math.min(1, Math.max(0, +g.rho || 0)); });
    const groupCount = {};
    state.evidence.forEach((e) => {
      if (e.enabled !== false && e.group) groupCount[e.group] = (groupCount[e.group] || 0) + 1;
    });
    const groupFactor = (gid) => {
      const n = groupCount[gid] || 0;
      if (n <= 1) return 1;
      const nEff = 1 + (n - 1) * (1 - (groupRho[gid] ?? 0));
      return nEff / n;
    };

    const logScore = {};
    hyps.forEach((h) => (logScore[h.id] = h.logPrior));

    const evidenceOut = state.evidence.map((e) => {
      const contributions = {};
      const depFactor = e.group ? groupFactor(e.group) : 1;
      // Epistemic-quality factor kappa in [0,1]. It scales a datum's evidential
      // weight by the soundness of the reasoning behind it: ad hoc, circular,
      // unfalsifiable, or bare-opinion support gets kappa -> 0, which forces the
      // datum's likelihood ratio to 1 (no impact on the posterior in EITHER
      // direction). Default 1 = take the datum at face value.
      const quality = e.quality == null ? 1 : Math.max(0, Math.min(1, +e.quality));
      hyps.forEach((h) => {
        const lik = clampProb((e.likelihoods && e.likelihoods[h.id]) ?? 0.5);
        const w = e.weight == null ? 1 : Math.max(0, Math.min(1, +e.weight));
        const c = quality * w * Math.log(lik);       // quality- and weight-scaled log-likelihood
        contributions[h.id] = c;
        if (e.enabled !== false) logScore[h.id] += depFactor * c; // also dependency-discounted
      });
      return { ...e, contributions, depFactor, qualityFactor: quality };
    });

    // --- Normalise posteriors via softmax over log scores ------------------
    const scores = hyps.map((h) => logScore[h.id]);
    const lse = logSumExp(scores);
    hyps.forEach((h) => {
      h.logScore = logScore[h.id];
      h.posterior = Math.exp(logScore[h.id] - lse);
    });

    // --- Family aggregation (Resurrection vs the Naturalistic disjunction) --
    // "Naturalistic" is not one hypothesis; it is a disjunction of distinct
    // explanations. We let every sub-hypothesis compete in the softmax and then
    // sum posteriors by family, which is the correct probability of the
    // disjunction P(N1 ∨ N2 ∨ …) for mutually-exclusive accounts.
    const familyOf = (h) => h.family || (h.role === "pro" ? "resurrection" : "naturalistic");
    const families = {};
    hyps.forEach((h) => {
      const fam = familyOf(h); h.family = fam;
      const f = (families[fam] = families[fam] || { posterior: 0, priorW: 0, members: [] });
      f.posterior += h.posterior;
      f.priorW += clampProb(h.prior) * clampProb(h.parsimony); // prior incl. parsimony
      f.members.push(h.id);
    });

    // --- Pivot: Resurrection vs the leading naturalistic account -----------
    const pro = hyps.find((h) => h.role === "pro") ||
      hyps.find((h) => h.family === "resurrection") || hyps[0];
    const natMembers = hyps.filter((h) => h.family === "naturalistic" && h.id !== pro.id);
    const competitors = hyps.filter((h) => h.id !== pro.id);
    const conPool = natMembers.length ? natMembers : competitors;
    const con = conPool.slice().sort((a, b) => b.posterior - a.posterior)[0] || pro;

    // Per-datum Bayes factor: Resurrection vs the BEST-FITTING naturalistic
    // explanation FOR THAT DATUM (max likelihood among naturalistic members).
    // You cannot defeat the naturalistic disjunction by beating its weakest
    // member, so each datum is scored against the best alternative available.
    let logBFsum = 0;
    evidenceOut.forEach((e) => {
      const cp = e.contributions[pro.id] ?? 0;
      let best = conPool[0], bestC = e.contributions[(conPool[0] || pro).id] ?? 0;
      conPool.forEach((m) => { const c = e.contributions[m.id] ?? 0; if (c > bestC) { bestC = c; best = m; } });
      const logBF = e.depFactor * (cp - bestC);
      e.logBF = logBF;
      e.rawLogBF = cp - bestC;
      e.decibans = (10 / Math.log(10)) * logBF;
      e.swing = logBF;
      e.bestConId = best ? best.id : con.id;
      if (e.enabled !== false) logBFsum += logBF;
    });

    const resP = (families.resurrection && families.resurrection.posterior) || pro.posterior;
    const natP = (families.naturalistic && families.naturalistic.posterior) || con.posterior;
    const resPW = (families.resurrection && families.resurrection.priorW) || (clampProb(pro.prior) * clampProb(pro.parsimony));
    const natPW = (families.naturalistic && families.naturalistic.priorW) ||
      (clampProb(con.prior) * clampProb(con.parsimony));
    const priorLogOdds = Math.log(clampProb(resPW)) - Math.log(clampProb(natPW));
    const postLogOdds = Math.log(clampProb(resP)) - Math.log(clampProb(natP));

    return {
      hypotheses: hyps,
      evidence: evidenceOut,
      families,
      pivot: { proId: pro.id, conId: con.id },
      totals: {
        logBFsum,
        resPosterior: resP,
        natPosterior: natP,
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
