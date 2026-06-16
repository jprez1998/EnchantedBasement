/* =============================================================================
 * claude.js — Expert historical-critical analysis via the Anthropic API.
 *
 * Runs ONLY with the user's own API key (stored in their browser). It calls the
 * Messages API directly from the browser. The model is forced (via a single
 * tool) to return, for every criterion, an EXHAUSTIVE list of data points it
 * actually found in the uploaded texts — each one classified by provenance and
 * assessed, not quoted ad hoc.
 *
 * The non-negotiable rule: a quotation's evidential value depends on (a) its
 * authenticity, (b) why the author cites it, and (c) whether the author's
 * inference from it is valid. A quoted ancient source the author themselves
 * flags as a later interpolation (e.g. the Testimonium Flavianum) must NOT be
 * counted at face value. Context decides weight.
 *
 * Every quote is validated as a literal substring of the uploaded text; quotes
 * that fail are flagged and cannot count. No fabricated citations.
 * ========================================================================== */

(function (global) {
  "use strict";

  const KEY_LS = "eb-anthropic-key";
  const MODEL_LS = "eb-anthropic-model";
  const ENDPOINT = "https://api.anthropic.com/v1/messages";
  const MAX_SOURCE_CHARS = 600000; // ~150k tokens; bounds cost on whole books

  const MODELS = [
    { id: "claude-opus-4-8", label: "Opus 4.8 — deepest reasoning" },
    { id: "claude-sonnet-4-6", label: "Sonnet 4.6 — fast & cheaper" },
    { id: "claude-haiku-4-5", label: "Haiku 4.5 — fastest, light" },
  ];

  const getKey = () => { try { return localStorage.getItem(KEY_LS) || ""; } catch { return ""; } };
  const setKey = (k) => { try { k ? localStorage.setItem(KEY_LS, k) : localStorage.removeItem(KEY_LS); } catch {} };
  const getModel = () => { try { return localStorage.getItem(MODEL_LS) || MODELS[0].id; } catch { return MODELS[0].id; } };
  const setModel = (m) => { try { localStorage.setItem(MODEL_LS, m); } catch {} };
  const hasKey = () => !!getKey();

  // Economy mode: run the bulk extraction (map) passes on a cheap model and keep
  // the final scoring (reduce) pass on the user's chosen model. Default on.
  const ECON_LS = "eb-ai-economy";
  const DEEP_LS = "eb-ai-deepread";
  const MAP_MODEL = "claude-haiku-4-5";
  const getEconomy = () => { try { return localStorage.getItem(ECON_LS) !== "0"; } catch { return true; } };
  const setEconomy = (on) => { try { localStorage.setItem(ECON_LS, on ? "1" : "0"); } catch {} };
  // Deep read = read every source in full (map-reduce). Off (default) = retrieval:
  // for large corpora, pull only the keyword-relevant passages and score in one call.
  const getDeepRead = () => { try { return localStorage.getItem(DEEP_LS) === "1"; } catch { return false; } };
  const setDeepRead = (on) => { try { localStorage.setItem(DEEP_LS, on ? "1" : "0"); } catch {} };
  const mapModel = () => (getEconomy() ? MAP_MODEL : getModel());

  const SYSTEM_PROMPT =
    "You are a historian of Christian origins applying the HISTORICAL-CRITICAL " +
    "METHOD, and a Bayesian epistemologist of testimony. Your task is to read " +
    "the supplied source texts and, for each evidential criterion, extract the " +
    "EXHAUSTIVE list of distinct data points the author(s) actually use — then " +
    "assess each one rigorously rather than ad hoc. Do not summarise; enumerate.\n\n" +
    "For EACH data point you find in a source text, you MUST:\n" +
    "1. Quote it VERBATIM — an exact substring of the source — and name the source file.\n" +
    "2. Classify its provenance as exactly one of:\n" +
    "   • 'quoted_source' — the author quotes/cites an ancient or external source " +
    "(Josephus, Tacitus, a Gospel, Paul, a creed, etc.). Name the cited source precisely in cited_source.\n" +
    "   • 'historical_reference' — the author appeals to a generally established historical fact/event.\n" +
    "   • 'author_inference' — the author draws their own argued conclusion from evidence.\n" +
    "   • 'author_opinion' — an assertion or value judgement the author offers without demonstrated support.\n" +
    "3. State WHY the author raises it (why_quoted).\n" +
    "4. Capture the AUTHOR'S OWN ASSESSMENT of it (author_assessment): does the author endorse, " +
    "qualify, dispute, or reject this datum? CONTEXT IS DECISIVE — read the sentences around the quote. " +
    "Example: if an author quotes the Testimonium Flavianum but the surrounding text says 'nearly all " +
    "commentators are agreed that the present text cannot be what Josephus actually wrote', then the " +
    "datum is a disputed Christian interpolation and must NOT be counted at face value.\n" +
    "5. Give a validity verdict: 'established' | 'probable' | 'disputed' | 'author_opinion' | 'refuted'.\n" +
    "6. Run a CRITICAL-THINKING check and record any fallacy that taints the point: 'ad_hoc' (an " +
    "auxiliary claim introduced only to save a theory, with no independent support), 'circular' (assumes " +
    "what it sets out to prove), 'unfalsifiable' (no possible evidence could count against it), " +
    "'special_pleading', 'argument_from_silence', 'anachronism', or 'none'. Set ad_hoc=true when the support " +
    "is contrived to fit. A point that is ad hoc, circular, unfalsifiable, or mere unsupported opinion MUST " +
    "NOT move the probability: mark counts=false for it.\n" +
    "7. State which hypothesis it bears on (supports: 'R' resurrection, 'N' naturalistic, or 'neither'), " +
    "whether AFTER assessment it should actually move the probability (counts: true/false), and why (weight_note).\n\n" +
    "Principles you must apply, not merely mention: distinguish the author's CLAIM from the underlying " +
    "historical DATUM; never take a quoted ancient source at face value; weigh testimony by source dating, " +
    "dependence/independence (multiple attestation), the criteria of embarrassment and dissimilarity, and " +
    "demonstrated reliability; down-weight bare opinion and interpolated or disputed sources to near zero.\n\n" +
    "For EACH criterion ALSO return an epistemic-quality factor 'quality' in [0,1] with a one-line " +
    "'quality_reason'. quality is how much the criterion's argument should be allowed to move the posterior " +
    "given its critical soundness: 1 = sound, well-attested, non-fallacious; near 0 = the support is ad hoc, " +
    "circular, unfalsifiable, interpolated, or bare opinion and so should have NO impact in either direction. " +
    "Set quality low whenever the data points that would move the result are tainted by the checks above.\n\n" +
    "Then, for EACH hypothesis listed in the prompt (the resurrection hypothesis AND each distinct " +
    "naturalistic account), set P(evidence | hypothesis) as a likelihood in (0,1) — reflecting ONLY the data " +
    "points that genuinely count after assessment. 'Naturalistic' is a DISJUNCTION of competing accounts " +
    "(e.g. subjective visions vs legendary development vs unknown fate of the body); give each its own " +
    "likelihood, since a datum can fit one naturalistic account well and another poorly. Weigh parsimony (the " +
    "cost of auxiliary assumptions each hypothesis needs). If the sources do not address a criterion, return an " +
    "empty data_points list, set quality=0, and say so. Quote everything VERBATIM and invent nothing.";

  const DP = {
    type: "object",
    properties: {
      quote: { type: "string", description: "EXACT verbatim substring of the source." },
      source: { type: "string", description: "The source file name as given." },
      provenance: { type: "string", enum: ["quoted_source", "historical_reference", "author_inference", "author_opinion"] },
      cited_source: { type: "string", description: "If quoted_source: the ancient/external source cited, e.g. 'Josephus, Antiquities 18.63-64'." },
      why_quoted: { type: "string", description: "Why the author raises this datum." },
      author_assessment: { type: "string", description: "The author's own verdict on it, incl. any caveat from surrounding context (e.g. interpolation)." },
      validity: { type: "string", enum: ["established", "probable", "disputed", "author_opinion", "refuted"] },
      fallacy: { type: "string", enum: ["none", "ad_hoc", "circular", "unfalsifiable", "special_pleading", "argument_from_silence", "anachronism"] },
      ad_hoc: { type: "boolean", description: "True if the support is contrived only to fit the theory." },
      independently_attested: { type: "boolean", description: "True if corroborated by an independent source (multiple attestation)." },
      supports: { type: "string", enum: ["R", "N", "neither"] },
      counts: { type: "boolean", description: "Does it actually move the probability after assessment? Must be false if ad hoc/circular/unfalsifiable/opinion." },
      weight_note: { type: "string", description: "How and why it affects (or fails to affect) P(H)." },
    },
    required: ["quote", "provenance", "supports", "validity", "counts"],
  };

  const TOOL = {
    name: "submit_assessment",
    description: "Return the per-criterion, per-data-point historical-critical assessment.",
    input_schema: {
      type: "object",
      properties: {
        criteria: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "The criterion id provided in the prompt." },
              hyp_likelihoods: {
                type: "array",
                description: "P(evidence | hypothesis) for EVERY hypothesis id listed in the prompt.",
                items: {
                  type: "object",
                  properties: {
                    hyp_id: { type: "string", description: "Exact hypothesis id from the prompt (e.g. R, Nv, Nl, Nd)." },
                    p: { type: "number", description: "Likelihood in (0,1)." },
                  },
                  required: ["hyp_id", "p"],
                },
              },
              rationale: { type: "string", description: "How the counting data points set these likelihoods." },
              parsimony_note: { type: "string", description: "What this datum costs each hypothesis in assumptions." },
              quality: { type: "number", description: "Epistemic-quality factor in [0,1]: 1 = sound; near 0 = ad hoc/circular/unfalsifiable/opinion → no impact." },
              quality_reason: { type: "string", description: "One line justifying the quality factor." },
              data_points: { type: "array", items: DP },
            },
            required: ["id", "hyp_likelihoods", "data_points"],
          },
        },
        overall_parsimony: { type: "string", description: "Synthesis: which hypothesis is more parsimonious given the assessed data." },
      },
      required: ["criteria"],
    },
  };

  const normalize = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();

  function buildSourcesText(sources) {
    let out = "", truncated = false;
    for (const s of sources) {
      const header = `\n===== SOURCE: ${s.name} =====\n`;
      const remaining = MAX_SOURCE_CHARS - out.length;
      if (remaining <= header.length) { truncated = true; break; }
      let body = s.text || "";
      if (body.length > remaining - header.length) { body = body.slice(0, remaining - header.length); truncated = true; }
      out += header + body;
    }
    return { text: out.trim(), truncated };
  }

  function buildCriteriaText(state) {
    const lines = ["HYPOTHESES:"];
    state.hypotheses.forEach((h) => {
      lines.push(`- ${h.id} = ${h.name}: ${h.description || ""}`);
      (h.assumptions || []).forEach((a) =>
        lines.push(`    auxiliary assumption (plausibility ${a.plausibility}): ${a.text}`));
    });
    lines.push("\nCRITERIA — for each, return its likelihoods plus the EXHAUSTIVE data_points list (use the exact id):");
    state.evidence.forEach((e) => lines.push(`- id="${e.id}" — ${e.name}: ${e.description || ""}`));
    lines.push("\nEnumerate every distinct data point the sources actually use for each criterion. " +
      "Classify provenance, capture the author's assessment and context, judge validity, and decide whether it counts. " +
      "Quote verbatim. Return everything via the submit_assessment tool.");
    return lines.join("\n");
  }

  // Just the criterion list (ids + names) — used in the extraction (map) phase.
  function buildCriteriaList(state) {
    return "CRITERIA (use the exact id):\n" +
      state.evidence.map((e) => `- id="${e.id}" — ${e.name}: ${e.description || ""}`).join("\n");
  }

  // ---- Map-reduce machinery (for many / large sources) ---------------------
  const SINGLE_CALL_CHARS = 500000;  // ≤ this and few sources → one call
  const SINGLE_CALL_SOURCES = 6;
  const BATCH_CHARS = 200000;        // ~50k tokens of source text per extract call
  const PER_CRITERION_CAP = 10;      // consolidated data points kept per criterion

  const EXTRACT_SYSTEM =
    "You are a historian doing SOURCE EXTRACTION. From the supplied source text only, extract — per " +
    "criterion — the distinct data points the author(s) actually use. For EACH: quote VERBATIM (an exact " +
    "substring) and name the source; classify provenance (quoted_source / historical_reference / " +
    "author_inference / author_opinion); capture why it is raised and the author's own assessment and " +
    "surrounding context; run the critical-fallacy check (ad_hoc / circular / unfalsifiable / special_pleading " +
    "/ argument_from_silence / anachronism / none); and say which hypothesis it bears on (supports: R / N / " +
    "neither). DO NOT set probabilities or final likelihoods — this is extraction only. If a source does not " +
    "address a criterion, omit it. Quote everything VERBATIM and invent nothing.";

  const EXTRACT_TOOL = {
    name: "extract_evidence",
    description: "Per criterion, the verbatim data points the supplied source uses. No likelihoods.",
    input_schema: {
      type: "object",
      properties: {
        criteria: {
          type: "array",
          items: {
            type: "object",
            properties: { id: { type: "string" }, data_points: { type: "array", items: DP } },
            required: ["id", "data_points"],
          },
        },
      },
      required: ["criteria"],
    },
  };

  function callBody(model, system, tools, toolName, content, maxTokens) {
    return {
      model, max_tokens: maxTokens,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools, tool_choice: { type: "tool", name: toolName },
      messages: [{ role: "user", content }],
    };
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function callTool(body, toolName, opts = {}) {
    const maxTries = 4;
    let lastErr;
    for (let attempt = 1; attempt <= maxTries; attempt++) {
      let resp;
      try {
        resp = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": getKey(),
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
          },
          body: JSON.stringify(body),
        });
      } catch (netErr) {
        // Network blip — retry with backoff.
        lastErr = new Error("Network error contacting Anthropic.");
        if (attempt < maxTries) { if (opts.onStatus) opts.onStatus(`Network hiccup — retrying (${attempt}/${maxTries - 1})…`); await sleep(1500 * attempt); continue; }
        throw lastErr;
      }
      if (resp.ok) {
        const data = await resp.json();
        if (data.stop_reason === "max_tokens") throw new Error("A response hit the length limit — try Sonnet/Haiku or fewer sources.");
        const block = (data.content || []).find((b) => b.type === "tool_use" && b.name === toolName);
        if (!block || !block.input) throw new Error("Claude did not return a structured result.");
        return { input: block.input, usage: data.usage || {} };
      }
      // Non-OK. Retry transient (429 / 5xx / 529); fail fast on 401/4xx.
      let detail = ""; try { detail = (await resp.json())?.error?.message || ""; } catch {}
      if (resp.status === 401) throw new Error("Invalid API key (401).");
      const transient = resp.status === 429 || resp.status === 529 || resp.status >= 500;
      lastErr = new Error(`Anthropic API error ${resp.status}${detail ? ": " + detail : ""}`);
      if (transient && attempt < maxTries) {
        const backoff = (resp.status === 429 ? 5000 : 2000) * attempt;
        if (opts.onStatus) opts.onStatus(`${resp.status === 429 ? "Rate limited" : "Server busy"} — retrying in ${backoff / 1000}s (${attempt}/${maxTries - 1})…`);
        await sleep(backoff); continue;
      }
      throw lastErr;
    }
    throw lastErr || new Error("Request failed.");
  }

  function makeVerifier(sources) {
    const haystacks = sources.map((s) => ({ name: s.name, norm: normalize(s.text) }));
    return (q) => {
      const nq = normalize(q);
      if (nq.length < 8) return null;
      const hit = haystacks.find((h) => h.norm.includes(nq));
      return hit ? hit.name : null;
    };
  }

  // Split sources into ≤budget character batches, splitting any oversized source
  // across batches so NOTHING is dropped (the truncation bug is gone).
  function buildBatches(sources, budget) {
    const batches = []; let cur = "";
    const flush = () => { if (cur.trim()) batches.push(cur); cur = ""; };
    for (const s of sources) {
      const header = `\n===== SOURCE: ${s.name} =====\n`;
      const text = s.text || ""; let off = 0;
      if (!text) continue;
      while (off < text.length) {
        const slice = text.slice(off, off + Math.max(1000, budget - header.length));
        const piece = header + slice;
        if (cur && cur.length + piece.length > budget) flush();
        cur += piece; off += slice.length;
        if (cur.length >= budget) flush();
      }
    }
    flush();
    return batches;
  }

  function verifyDataPoints(dps, verify) {
    return (dps || []).map((dp) => {
      const v = verify(dp.quote);
      return { ...dp, verified: !!v, source: v || dp.source || "(unverified)", counts: dp.counts === true && !!v };
    });
  }

  // ---- Single call (few / small sources) -----------------------------------
  async function singleCall(state, sources, opts) {
    const { text: sourcesText, truncated } = buildSourcesText(sources);
    if (opts.onStatus) opts.onStatus("Asking Claude to read and assess the sources…");
    const body = callBody(getModel(), SYSTEM_PROMPT, [TOOL], TOOL.name, [
      { type: "text", text: "SOURCES (verbatim):\n" + sourcesText, cache_control: { type: "ephemeral" } },
      { type: "text", text: buildCriteriaText(state) },
    ], 16000);
    const { input, usage } = await callTool(body, TOOL.name, opts);
    const verify = makeVerifier(sources);
    (input.criteria || []).forEach((c) => { c.data_points = verifyDataPoints(c.data_points, verify); });
    return { criteria: input.criteria || [], overall: input.overall_parsimony || "", truncated, model: getModel(), usage, mode: "single", calls: 1, sourcesRead: sources.length };
  }

  // ---- Map-reduce (many / large sources) -----------------------------------
  async function mapReduce(state, sources, opts) {
    const model = getModel();
    const mapM = mapModel();
    const verify = makeVerifier(sources);
    const batches = buildBatches(sources, BATCH_CHARS);
    const acc = {};           // critId -> [verified dp]
    const seen = {};          // critId -> Set(normalized-quote-key) for dedupe

    for (let i = 0; i < batches.length; i++) {
      if (opts.onStatus) opts.onStatus(`Reading sources — pass ${i + 1} of ${batches.length}…`);
      const body = callBody(mapM, EXTRACT_SYSTEM, [EXTRACT_TOOL], EXTRACT_TOOL.name, [
        { type: "text", text: "SOURCE TEXT (verbatim):\n" + batches[i] },
        { type: "text", text: buildCriteriaList(state) + "\n\nExtract per-criterion data points from THIS text only. Do not set likelihoods." },
      ], 8000);
      let input;
      try { ({ input } = await callTool(body, EXTRACT_TOOL.name, opts)); }
      catch (e) { if (opts.onStatus) opts.onStatus(`Pass ${i + 1} failed (${e.message}) — continuing…`); continue; }
      (input.criteria || []).forEach((c) => {
        const verified = verifyDataPoints(c.data_points, verify).filter((d) => d.verified);
        acc[c.id] = acc[c.id] || []; seen[c.id] = seen[c.id] || new Set();
        verified.forEach((d) => {
          const k = normalize(d.quote).slice(0, 120);
          if (seen[c.id].has(k)) return;           // de-duplicate repeated material
          seen[c.id].add(k); acc[c.id].push(d);
        });
      });
    }

    // Consolidate: cap per criterion, preferring source diversity.
    const consolidated = {};
    Object.keys(acc).forEach((id) => {
      const bySource = {};
      acc[id].forEach((d) => { (bySource[d.source] = bySource[d.source] || []).push(d); });
      const picked = []; const pools = Object.values(bySource);
      let idx = 0;
      while (picked.length < PER_CRITERION_CAP && pools.some((p) => p.length)) {
        const pool = pools[idx % pools.length]; idx++;
        if (pool.length) picked.push(pool.shift());
      }
      consolidated[id] = picked;
    });

    // Reduce: one judgment over the consolidated, verbatim-verified evidence.
    if (opts.onStatus) opts.onStatus("Consolidating and scoring across all sources…");
    const evidenceText = state.evidence.map((e) => {
      const dps = consolidated[e.id] || [];
      if (!dps.length) return `# ${e.id} (${e.name})\n  (no passages found in the sources)`;
      return `# ${e.id} (${e.name})\n` + dps.map((d) =>
        `  - [${d.supports || "?"}] ${d.provenance || ""}${d.fallacy && d.fallacy !== "none" ? " FALLACY:" + d.fallacy : ""} · ${d.source}: "${(d.quote || "").replace(/\s+/g, " ").trim().slice(0, 300)}"`).join("\n");
    }).join("\n\n");

    const reduceSystem = SYSTEM_PROMPT +
      "\n\nIMPORTANT: You are now given data points ALREADY EXTRACTED and verbatim-verified from many sources. " +
      "Treat identical or near-identical material repeated across sources as ONE piece of evidence — many books " +
      "citing the same datum is NOT independent confirmation. Weigh source independence explicitly when setting " +
      "likelihoods and quality. Choose a representative subset of the supplied data points for data_points.";
    const body = callBody(model, reduceSystem, [TOOL], TOOL.name, [
      { type: "text", text: "CONSOLIDATED EVIDENCE (verbatim, de-duplicated across sources):\n" + evidenceText, cache_control: { type: "ephemeral" } },
      { type: "text", text: buildCriteriaText(state) },
    ], 16000);
    const { input, usage } = await callTool(body, TOOL.name, opts);
    (input.criteria || []).forEach((c) => { c.data_points = verifyDataPoints(c.data_points, verify); });
    return {
      criteria: input.criteria || [], overall: input.overall_parsimony || "", truncated: false,
      model, mapModel: mapM, usage, mode: "map-reduce", calls: batches.length + 1, sourcesRead: sources.length,
    };
  }

  // ---- Retrieval scoring (default for large corpora) -----------------------
  // Use the criteria keywords to pull the relevant verbatim passages from every
  // source, then score in ONE call. Cheap, reliable, grounded — at the cost of
  // keyword coverage (a passage phrased without the keywords may be missed).
  const RX_WINDOW = 700, RX_PER_SOURCE = 2, RX_PER_CRIT = 8;
  const escRx = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function retrievePassages(state, sources) {
    const out = {};
    state.evidence.forEach((e) => {
      const bySource = {};
      for (const src of sources) {
        const text = src.text || ""; let hits = 0; const seen = new Set();
        for (const kw of (e.keywords || [])) {
          if (hits >= RX_PER_SOURCE) break;
          const re = new RegExp(escRx(kw), "gi"); let m;
          while ((m = re.exec(text)) !== null && hits < RX_PER_SOURCE) {
            const start = Math.max(0, m.index - (RX_WINDOW >> 1));
            const end = Math.min(text.length, m.index + m[0].length + (RX_WINDOW >> 1));
            const key = start >> 8;
            if (!seen.has(key)) { seen.add(key); (bySource[src.name] = bySource[src.name] || []).push(text.slice(start, end).trim()); hits++; }
            if (re.lastIndex === m.index) re.lastIndex++;
          }
        }
      }
      // Round-robin across sources for diversity, capped per criterion.
      const picked = []; const pools = Object.entries(bySource); let i = 0;
      while (picked.length < RX_PER_CRIT && pools.some(([, p]) => p.length)) {
        const [name, pool] = pools[i % pools.length]; i++;
        if (pool.length) picked.push({ source: name, quote: pool.shift() });
      }
      out[e.id] = picked;
    });
    return out;
  }

  async function retrievalScore(state, sources, opts) {
    if (opts.onStatus) opts.onStatus("Retrieving relevant passages from your sources…");
    const passages = retrievePassages(state, sources);
    const verify = makeVerifier(sources);
    const evidenceText = state.evidence.map((e) => {
      const ps = passages[e.id] || [];
      if (!ps.length) return `# ${e.id} (${e.name})\n  (no keyword-matched passage found in the sources)`;
      return `# ${e.id} (${e.name})\n` + ps.map((p) => `  - ${p.source}: "${p.quote.replace(/\s+/g, " ").trim()}"`).join("\n");
    }).join("\n\n");

    const sys = SYSTEM_PROMPT +
      "\n\nIMPORTANT: The passages below were RETRIEVED BY KEYWORD SEARCH from the user's sources, so coverage " +
      "is imperfect — a criterion with no passage may still be discussed in the sources under different wording; " +
      "treat 'no passage' as 'not surfaced', not 'the sources are silent'. Quote ONLY from the supplied passages. " +
      "Treat the same datum repeated across sources as ONE (source independence).";
    if (opts.onStatus) opts.onStatus("Scoring the retrieved evidence…");
    const body = callBody(getModel(), sys, [TOOL], TOOL.name, [
      { type: "text", text: "RETRIEVED PASSAGES (verbatim, keyword-matched):\n" + evidenceText, cache_control: { type: "ephemeral" } },
      { type: "text", text: buildCriteriaText(state) },
    ], 16000);
    const { input, usage } = await callTool(body, TOOL.name, opts);
    (input.criteria || []).forEach((c) => { c.data_points = verifyDataPoints(c.data_points, verify); });
    const matched = Object.values(passages).reduce((a, p) => a + p.length, 0);
    return {
      criteria: input.criteria || [], overall: input.overall_parsimony || "", truncated: false,
      model: getModel(), usage, mode: "retrieval", calls: 1, sourcesRead: sources.length, passagesMatched: matched,
    };
  }

  // Rough cost estimate (USD). Prices are approximate $ per 1M tokens and CAN
  // CHANGE; prompt caching makes the real cost lower. ~4 chars/token.
  const PRICES = {
    "claude-opus-4-8": { in: 5, out: 25 }, "claude-opus-4-7": { in: 5, out: 25 },
    "claude-opus-4-6": { in: 5, out: 25 }, "claude-sonnet-4-6": { in: 3, out: 15 },
    "claude-haiku-4-5": { in: 1, out: 5 },
  };
  const priceOf = (m) => PRICES[m] || { in: 5, out: 25 };

  function estimate(state) {
    const sources = (state.sources || []).filter((s) => (s.text || "").trim());
    const totalChars = sources.reduce((a, s) => a + (s.text || "").length, 0);
    const tok = Math.ceil(totalChars / 4);
    const reduceModel = getModel();
    const single = sources.length <= SINGLE_CALL_SOURCES && totalChars <= SINGLE_CALL_CHARS;
    let usd, calls, mode;
    if (single) {
      const p = priceOf(reduceModel);
      usd = ((tok + 4000) * p.in + 6000 * p.out) / 1e6;
      calls = 1; mode = "single";
    } else if (getDeepRead()) {
      const batches = Math.max(1, Math.ceil(totalChars / BATCH_CHARS));
      const mp = priceOf(mapModel()), rp = priceOf(reduceModel);
      const mapUsd = ((tok + batches * 1500) * mp.in + batches * 2500 * mp.out) / 1e6;
      const redIn = Math.min(40000, state.evidence.length * PER_CRITERION_CAP * 90) + 4000;
      const redUsd = (redIn * rp.in + 6000 * rp.out) / 1e6;
      usd = mapUsd + redUsd; calls = batches + 1; mode = "map-reduce";
    } else {
      // Retrieval: one call over the keyword-matched passages (bounded).
      const rp = priceOf(reduceModel);
      const inTok = Math.min(80000, state.evidence.length * RX_PER_CRIT * (RX_WINDOW / 4)) + 4000;
      usd = (inTok * rp.in + 6000 * rp.out) / 1e6; calls = 1; mode = "retrieval";
    }
    return { usd, calls, mode, sources: sources.length, totalChars, mapModel: (single || !getDeepRead()) ? reduceModel : mapModel(), reduceModel };
  }

  /** Run the analysis. opts: { onStatus(msg) }. Returns structured result or throws. */
  async function analyze(state, opts = {}) {
    if (!getKey()) throw new Error("No API key set. Add one in Settings.");
    const sources = (state.sources || []).filter((s) => (s.text || "").trim());
    if (!sources.length) throw new Error("Upload at least one source first.");
    const totalChars = sources.reduce((a, s) => a + (s.text || "").length, 0);
    if (sources.length <= SINGLE_CALL_SOURCES && totalChars <= SINGLE_CALL_CHARS) {
      return singleCall(state, sources, opts);
    }
    // Large corpus: retrieval (one call, keyword-grounded) unless the user opts
    // into an exhaustive deep read (full map-reduce).
    return getDeepRead() ? mapReduce(state, sources, opts) : retrievalScore(state, sources, opts);
  }

  global.ClaudeAnalyst = { analyze, estimate, getKey, setKey, getModel, setModel, getEconomy, setEconomy, getDeepRead, setDeepRead, hasKey, MODELS, MAP_MODEL };
})(window);
