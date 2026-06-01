# Enchanted Basement

A small hub of interactive experiments. The landing page (`index.html`) links
out to each app; apps live in their own folders so they stay independent.

- **Homepage** — `/` (`index.html`, `css/home.css`)
- **Resurrection Bayes Table** — `/resurrection/`

Deployed via GitHub Pages from `main`:
**https://jprez1998.github.io/EnchantedBasement/**

---

## Resurrection Bayes Table  (`/resurrection/`)

An interactive **Bayesian model-comparison** tool for weighing the historical
plausibility of the death, burial, and resurrection of Jesus against
naturalistic alternatives.

It is a transparent statistical instrument, not an oracle: every number is an
**editable prior**, and every citation is quoted **verbatim** from sources *you*
upload — the tool never invents a quotation.

## Run it

No build step. Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

## What it does

- **Bayes table.** Each row is a datum (criterion). Two coloured cells show how
  well it fits each hypothesis (its likelihood). **Click any cell** to open a
  detail drawer explaining *why* that datum raises or lowers the probability,
  with the exact Bayes factor and the verbatim source passages behind it.
- **Upload as many sources as you like** (`.txt`, `.md`, `.json`, `.csv`, or
  paste). The matcher finds literal keyword occurrences and quotes the
  surrounding sentence with character offsets — auditable, reproducible, no
  hallucination.
- **Recalculate** re-scans all sources, re-derives the posterior, and produces a
  per-criterion impact report (in decibans) plus a ready-to-copy, source-grounded
  analysis prompt for optional LLM commentary.
- **Edit everything:** priors, likelihoods, independence weights, auxiliary
  assumptions, and the criteria list. Export/import the whole model as JSON.

## The statistics (see the in-app *Methodology* button)

1. **Log-space posterior** with the log-sum-exp trick — dozens of small
   likelihoods never underflow:
   `P(H_k | E) ∝ P(H_k) · Parsimony(H_k) · Πᵢ P(Eᵢ | H_k)^{wᵢ}`
2. **Bayes factors in decibans** (`10·log₁₀ BF`) so each datum's pull is additive
   and comparable.
3. **Parsimony as a Bayes factor, not a fudge.** Each hypothesis declares its
   auxiliary assumptions with plausibilities; their product multiplies the prior
   (`P(H & A₁ & A₂…) = P(H)·ΠP(Aᵢ)`), so a theory needing improbable conjuncts is
   demoted automatically — the correct Bayesian form of Occam's razor.
4. **Independence weights** `∈ [0,1]` let you down-weight correlated data (e.g.
   four Gospels echoing one tradition) instead of over-counting them.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Enchanted Basement homepage |
| `css/home.css` | Homepage theme |
| `resurrection/index.html` | Calculator layout and markup |
| `resurrection/css/styles.css` | Wood-and-parchment theme |
| `resurrection/js/bayes.js` | Pure statistical engine (no DOM) |
| `resurrection/js/criteria.js` | Default hypotheses + criteria with real scholarly references |
| `resurrection/js/sources.js` | Verbatim, no-hallucination citation matcher |
| `resurrection/js/app.js` | UI controller |
| `resurrection/sample-source.txt` | A demo source so the citation feature works immediately |

## On honesty

The default likelihoods are defensible starting points, **not** facts mined from
the cited works. The references (Habermas & Licona, N. T. Wright, Swinburne,
Ehrman, Lüdemann, Crossan, Carrier, Tacitus, etc.) point to where each datum is
genuinely debated. Verbatim quotation only ever comes from your uploaded files.
