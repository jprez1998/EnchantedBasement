/* =============================================================================
 * claude.js — Optional "expert Bayesian historian" analysis via the Anthropic API.
 *
 * This runs ONLY when the user supplies their own API key (stored locally in
 * their browser, never in the code). It calls the Messages API directly from
 * the browser using the official direct-browser-access header.
 *
 * What it does:
 *   - Sends the uploaded source texts + the criteria to Claude with a strong
 *     historical-critical-method system prompt.
 *   - Forces a single structured tool call (tool_choice) so the result is
 *     machine-readable: per-criterion P(E|Resurrection), P(E|Naturalistic),
 *     reasoning, a parsimony note, and verbatim quotes.
 *   - VALIDATES every quote Claude returns against the uploaded text. Anything
 *     that is not a literal substring is flagged unverified and never treated
 *     as a citation — preserving the no-hallucination guarantee.
 *
 * The deterministic Bayesian engine still does all the arithmetic; Claude only
 * proposes the likelihoods and the prose, which the user can then edit.
 * ========================================================================== */

(function (global) {
  "use strict";

  const KEY_LS = "eb-anthropic-key";
  const MODEL_LS = "eb-anthropic-model";
  const ENDPOINT = "https://api.anthropic.com/v1/messages";
  const MAX_SOURCE_CHARS = 600000; // ~150k tokens; bounds cost on huge books

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
    "You are a rigorous historian of Christian origins and a careful Bayesian " +
    "statistician. You apply the historical-critical method: criteria of " +
    "multiple attestation, embarrassment, dissimilarity, coherence, and " +
    "contextual credibility, while weighing source dating, dependence, genre, " +
    "and bias. You reason about PARSIMONY explicitly: a hypothesis that needs " +
    "many improbable auxiliary assumptions pays for them in its prior. You are " +
    "fair to both the bodily-resurrection hypothesis and naturalistic " +
    "alternatives, and you never overstate the evidence.\n\n" +
    "You will be given (1) two hypotheses, (2) a list of evidential criteria, " +
    "and (3) the full text of the user's uploaded sources. For EACH criterion " +
    "estimate P(evidence | Resurrection) and P(evidence | Naturalistic) as " +
    "probabilities in (0,1) — these are likelihoods, not posteriors. Justify " +
    "each with the critical method and note the parsimony cost. Ground every " +
    "claim ONLY in the supplied sources or in standard, well-known historical " +
    "facts. When you cite, quote the source VERBATIM (an exact substring) and " +
    "name the source. If the sources do not address a criterion, say so plainly " +
    "and keep its two likelihoods close together (near-neutral). NEVER invent a " +
    "quotation or attribute words to a source that are not literally present.";

  const TOOL = {
    name: "submit_assessment",
    description:
      "Return the per-criterion likelihood assessment and an overall parsimony judgement.",
    input_schema: {
      type: "object",
      properties: {
        criteria: {
          type: "array",
          description: "One entry per criterion, in any order.",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "The criterion id provided in the prompt." },
              p_resurrection: { type: "number", description: "P(evidence | Bodily Resurrection), in (0,1)." },
              p_naturalistic: { type: "number", description: "P(evidence | Naturalistic), in (0,1)." },
              direction: {
                type: "string",
                enum: ["favors_resurrection", "favors_naturalistic", "neutral"],
              },
              rationale: { type: "string", description: "Historical-critical reasoning for the likelihoods." },
              parsimony_note: { type: "string", description: "What this datum costs each hypothesis in assumptions." },
              citations: {
                type: "array",
                description: "Verbatim quotes from the supplied sources that bear on this criterion.",
                items: {
                  type: "object",
                  properties: {
                    source: { type: "string", description: "The source name as given." },
                    quote: { type: "string", description: "An EXACT substring of that source." },
                  },
                  required: ["quote"],
                },
              },
            },
            required: ["id", "p_resurrection", "p_naturalistic", "rationale"],
          },
        },
        overall_parsimony: {
          type: "string",
          description: "A short synthesis of which hypothesis is more parsimonious given the data.",
        },
      },
      required: ["criteria"],
    },
  };

  /** Collapse whitespace for tolerant verbatim matching. */
  function normalize(s) { return String(s || "").replace(/\s+/g, " ").trim().toLowerCase(); }

  function buildSourcesText(sources) {
    let out = "", truncated = false;
    for (const s of sources) {
      const header = `\n===== SOURCE: ${s.name} =====\n`;
      const remaining = MAX_SOURCE_CHARS - out.length;
      if (remaining <= header.length) { truncated = true; break; }
      let body = s.text || "";
      if (body.length > remaining - header.length) {
        body = body.slice(0, remaining - header.length);
        truncated = true;
      }
      out += header + body;
    }
    return { text: out.trim(), truncated };
  }

  function buildCriteriaText(state) {
    const lines = [];
    lines.push("HYPOTHESES:");
    state.hypotheses.forEach((h) => {
      lines.push(`- ${h.id} = ${h.name}: ${h.description || ""}`);
      (h.assumptions || []).forEach((a) =>
        lines.push(`    auxiliary assumption (plausibility ${a.plausibility}): ${a.text}`));
    });
    lines.push("\nCRITERIA (assess each; use the exact id):");
    state.evidence.forEach((e) => {
      lines.push(`- id="${e.id}" — ${e.name}: ${e.description || ""}`);
    });
    lines.push(
      "\nReturn your full assessment via the submit_assessment tool. " +
      "Quote the sources verbatim; if a source does not speak to a criterion, leave its citations empty and say so in the rationale.");
    return lines.join("\n");
  }

  /**
   * Run the analysis. opts: { onStatus(msg) }
   * Returns { criteria: [...], overall, truncated, usage } or throws.
   */
  async function analyze(state, opts = {}) {
    const key = getKey();
    if (!key) throw new Error("No API key set. Add one in Settings.");
    const model = getModel();
    const sources = (state.sources || []).filter((s) => (s.text || "").trim());
    if (!sources.length) throw new Error("Upload at least one source first.");

    const { text: sourcesText, truncated } = buildSourcesText(sources);
    const criteriaText = buildCriteriaText(state);

    if (opts.onStatus) opts.onStatus("Asking Claude to analyse the sources…");

    const body = {
      model,
      max_tokens: 8000,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: [TOOL],
      tool_choice: { type: "tool", name: "submit_assessment" },
      messages: [
        {
          role: "user",
          content: [
            // Big, stable source block first and cached — repeat runs are cheap.
            { type: "text", text: "SOURCES (verbatim):\n" + sourcesText, cache_control: { type: "ephemeral" } },
            { type: "text", text: criteriaText },
          ],
        },
      ],
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
    const toolBlock = (data.content || []).find((b) => b.type === "tool_use" && b.name === TOOL.name);
    if (!toolBlock) throw new Error("Claude did not return a structured assessment.");
    const result = toolBlock.input || {};

    // --- Validate every quote against the uploaded text (no hallucinations) ---
    const haystacks = sources.map((s) => ({ name: s.name, norm: normalize(s.text) }));
    const verifyQuote = (q) => {
      const nq = normalize(q);
      if (nq.length < 8) return null; // too short to verify meaningfully
      const hit = haystacks.find((h) => h.norm.includes(nq));
      return hit ? hit.name : null;
    };

    (result.criteria || []).forEach((c) => {
      c.citations = (c.citations || []).map((cit) => {
        const verifiedIn = verifyQuote(cit.quote);
        return { ...cit, verified: !!verifiedIn, source: verifiedIn || cit.source || "(unverified)" };
      });
    });

    return {
      criteria: result.criteria || [],
      overall: result.overall_parsimony || "",
      truncated,
      model,
      usage: data.usage || {},
    };
  }

  global.ClaudeAnalyst = { analyze, getKey, setKey, getModel, setModel, hasKey, MODELS };
})(window);
