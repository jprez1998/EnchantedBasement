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
    "6. State which hypothesis it bears on (supports: 'R' resurrection, 'N' naturalistic, or 'neither'), " +
    "whether AFTER assessment it should actually move the probability (counts: true/false), and why (weight_note).\n\n" +
    "Principles you must apply, not merely mention: distinguish the author's CLAIM from the underlying " +
    "historical DATUM; never take a quoted ancient source at face value; weigh testimony by source dating, " +
    "dependence/independence (multiple attestation), the criteria of embarrassment and dissimilarity, and " +
    "demonstrated reliability; down-weight bare opinion and interpolated or disputed sources to near zero. " +
    "Then, for EACH hypothesis listed in the prompt (the resurrection hypothesis AND each distinct " +
    "naturalistic account), set P(evidence | hypothesis) as a likelihood in (0,1) — reflecting ONLY the data " +
    "points that genuinely count after assessment. 'Naturalistic' is a DISJUNCTION of competing accounts " +
    "(e.g. subjective visions vs legendary development vs unknown fate of the body); give each its own " +
    "likelihood, since a datum can fit one naturalistic account well and another poorly. Weigh parsimony (the " +
    "cost of auxiliary assumptions each hypothesis needs). If the sources do not address a criterion, return an " +
    "empty data_points list and say so. Quote everything VERBATIM and invent nothing.";

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
      supports: { type: "string", enum: ["R", "N", "neither"] },
      counts: { type: "boolean", description: "Does it actually move the probability after assessment?" },
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

  /** Run the analysis. opts: { onStatus(msg) }. Returns structured result or throws. */
  async function analyze(state, opts = {}) {
    const key = getKey();
    if (!key) throw new Error("No API key set. Add one in Settings.");
    const model = getModel();
    const sources = (state.sources || []).filter((s) => (s.text || "").trim());
    if (!sources.length) throw new Error("Upload at least one source first.");

    const { text: sourcesText, truncated } = buildSourcesText(sources);
    if (opts.onStatus) opts.onStatus("Asking Claude to read and assess the sources…");

    const body = {
      model,
      max_tokens: 16000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: [TOOL],
      tool_choice: { type: "tool", name: "submit_assessment" },
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "SOURCES (verbatim):\n" + sourcesText, cache_control: { type: "ephemeral" } },
          { type: "text", text: buildCriteriaText(state) },
        ],
      }],
    };

    const resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      let detail = "";
      try { detail = (await resp.json())?.error?.message || ""; } catch {}
      if (resp.status === 401) throw new Error("Invalid API key (401).");
      if (resp.status === 429) throw new Error("Rate limited (429) — wait and retry.");
      throw new Error(`Anthropic API error ${resp.status}${detail ? ": " + detail : ""}`);
    }

    const data = await resp.json();
    if (data.stop_reason === "max_tokens") {
      throw new Error("Response hit the length limit — try fewer/shorter sources or Sonnet/Haiku.");
    }
    const toolBlock = (data.content || []).find((b) => b.type === "tool_use" && b.name === TOOL.name);
    if (!toolBlock || !toolBlock.input) throw new Error("Claude did not return a structured assessment.");
    const result = toolBlock.input;

    // --- Verify every quote against the uploaded text (no hallucinations) ---
    const haystacks = sources.map((s) => ({ name: s.name, norm: normalize(s.text) }));
    const verify = (q) => {
      const nq = normalize(q);
      if (nq.length < 8) return null;
      const hit = haystacks.find((h) => h.norm.includes(nq));
      return hit ? hit.name : null;
    };
    (result.criteria || []).forEach((c) => {
      c.data_points = (c.data_points || []).map((dp) => {
        const verifiedIn = verify(dp.quote);
        return {
          ...dp,
          verified: !!verifiedIn,
          source: verifiedIn || dp.source || "(unverified)",
          // An unverifiable quote can never count — protects the guarantee.
          counts: dp.counts === true && !!verifiedIn,
        };
      });
    });

    return { criteria: result.criteria || [], overall: result.overall_parsimony || "", truncated, model, usage: data.usage || {} };
  }

  global.ClaudeAnalyst = { analyze, getKey, setKey, getModel, setModel, hasKey, MODELS };
})(window);
