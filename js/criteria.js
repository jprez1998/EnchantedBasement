/* =============================================================================
 * criteria.js — Default model: hypotheses and evidential criteria.
 *
 * IMPORTANT ON HONESTY:
 *   - The `likelihoods` below are EDITABLE PRIORS chosen as defensible starting
 *     points, NOT facts mined from the cited works. Every cell is user-editable.
 *   - The `references` are real, verifiable scholarly works where each datum is
 *     actually discussed/debated. They are pointers for the reader, not quotes.
 *   - VERBATIM quotation only ever comes from sources the USER uploads (see
 *     sources.js). The engine never invents a quotation.
 *
 * The default datapoints follow the widely-used "minimal facts" frame
 * (Habermas/Licona) plus the standard naturalistic counter-considerations
 * (Ehrman, Lüdemann, Carrier, Crossan), so both hypotheses get a fair hearing.
 *
 * Likelihood convention: likelihoods[hypId] = P(this datum | hypothesis).
 *   A datum favours a hypothesis when its likelihood there is higher.
 * ========================================================================== */

(function (global) {
  "use strict";

  const HYPOTHESES = [
    {
      id: "R",
      name: "Bodily Resurrection",
      short: "Resurrection (R)",
      role: "pro",
      color: "#c9a227",
      prior: 0.5,
      description:
        "Jesus of Nazareth was crucified, died, was buried, and was raised " +
        "bodily, with post-mortem appearances to individuals and groups.",
      // Occam term: R requires a theistic background in which such an act is
      // possible. Stated as an auxiliary assumption with an explicit, editable
      // plausibility so the parsimony cost is visible rather than hidden.
      assumptions: [
        {
          text: "A God exists who would have reason to raise Jesus (background theism).",
          plausibility: 0.5,
        },
      ],
    },
    {
      id: "N",
      name: "Naturalistic Explanation",
      short: "Naturalistic (¬R)",
      role: "con",
      color: "#5b8def",
      prior: 0.5,
      description:
        "The post-crucifixion data are best explained without a miracle: some " +
        "combination of sincere visionary experiences, legendary development, " +
        "and ordinary historical processes.",
      assumptions: [
        {
          text: "Independent visionary/grief experiences arose in several disciples.",
          plausibility: 0.6,
        },
        {
          text: "The empty-tomb tradition developed legendarily or from a misidentified site.",
          plausibility: 0.6,
        },
      ],
    },
  ];

  // Each datum: likelihood under R and under N, a weight (independence control),
  // a rationale, keywords used to match uploaded sources, and real references.
  const EVIDENCE = [
    {
      id: "crucifixion",
      name: "Death by crucifixion under Pilate",
      description:
        "Jesus was executed by Roman crucifixion. Attested across Christian and " +
        "non-Christian sources; near-universally accepted by historians.",
      likelihoods: { R: 0.99, N: 0.98 },
      weight: 1,
      keywords: ["crucified", "crucifixion", "Pilate", "cross", "executed", "death"],
      references: [
        "Tacitus, Annals 15.44.",
        "Habermas & Licona, The Case for the Resurrection of Jesus (Kregel, 2004), ch.2.",
        "Ehrman, How Jesus Became God (HarperOne, 2014).",
      ],
      note: "A near-certain datum; it barely discriminates between R and N (BF≈1).",
    },
    {
      id: "burial",
      name: "Burial by Joseph of Arimathea",
      description:
        "Jesus was buried in a known tomb by a named member of the Sanhedrin — a " +
        "detail unlikely to be invented (criterion of embarrassment).",
      likelihoods: { R: 0.92, N: 0.6 },
      weight: 0.8,
      keywords: ["Joseph of Arimathea", "buried", "tomb", "Sanhedrin", "burial"],
      references: [
        "Mark 15:42-47.",
        "Wright, The Resurrection of the Son of God (Fortress, 2003).",
        "Crossan, The Historical Jesus (1991) — argues against, for balance.",
      ],
      note: "Disputed: Crossan argues for a dishonourable burial; weight reduced for that uncertainty.",
    },
    {
      id: "emptytomb",
      name: "Empty tomb discovered by women",
      description:
        "The tomb was found empty, first by female disciples whose testimony " +
        "carried little legal weight — again hard to explain as invention.",
      likelihoods: { R: 0.95, N: 0.45 },
      weight: 0.8,
      keywords: ["empty tomb", "women", "Mary Magdalene", "stone rolled", "he is not here"],
      references: [
        "Mark 16:1-8; John 20:1-2.",
        "Habermas & Licona (2004), ch.4.",
        "Lüdemann, The Resurrection of Jesus (Fortress, 1994) — naturalistic reading.",
      ],
      note: "Strongly favours R if historical; N must posit theft, relocation, or legend.",
    },
    {
      id: "creed",
      name: "Early creedal tradition (1 Cor 15:3-8)",
      description:
        "Paul transmits a creed listing appearances, datable to within a few " +
        "years of the crucifixion — too early for legendary accretion.",
      likelihoods: { R: 0.9, N: 0.4 },
      weight: 1,
      keywords: ["1 Corinthians 15", "received", "delivered", "appeared", "five hundred", "creed"],
      references: [
        "1 Corinthians 15:3-8.",
        "Habermas & Licona (2004).",
        "Ehrman, How Jesus Became God (2014) — accepts the creed's antiquity, disputes its import.",
      ],
      note: "Antiquity is widely granted; the dispute is over what the experiences were.",
    },
    {
      id: "appearances",
      name: "Post-mortem appearances to groups",
      description:
        "Multiple individuals and groups reported encountering the risen Jesus, " +
        "including skeptics (Paul, James).",
      likelihoods: { R: 0.95, N: 0.5 },
      weight: 0.9,
      keywords: ["appeared", "appearance", "saw the Lord", "Paul", "James", "Cephas", "twelve"],
      references: [
        "1 Corinthians 15:5-8; Luke 24; John 20-21.",
        "Wright (2003).",
        "Lüdemann (1994) — explains as subjective visions.",
      ],
      note: "Group appearances strain the individual-hallucination model (favours R).",
    },
    {
      id: "transformation",
      name: "Transformation of disciples / willingness to die",
      description:
        "Followers were transformed from fearful to bold proclaimers, several " +
        "suffering and dying for the claim.",
      likelihoods: { R: 0.9, N: 0.6 },
      weight: 0.7,
      keywords: ["martyr", "died for", "bold", "persecution", "willing to die", "transformed"],
      references: [
        "Acts 2-5; 1 Clement 5.",
        "Habermas & Licona (2004).",
      ],
      note: "Shows sincerity, not necessarily truth — sincere people die for sincere errors. Modest BF.",
    },
    {
      id: "hallucination",
      name: "Known psychology of grief/bereavement visions",
      description:
        "Bereavement and grief hallucinations are well documented in modern " +
        "clinical literature, providing a naturalistic mechanism for appearances.",
      likelihoods: { R: 0.4, N: 0.85 },
      weight: 0.8,
      keywords: ["hallucination", "grief", "vision", "bereavement", "cognitive dissonance"],
      references: [
        "Lüdemann (1994).",
        "Carrier, 'The Spiritual Body of Christ', in The Empty Tomb (2005).",
      ],
      note: "Favours N — but is strained by group appearances and the empty tomb.",
    },
    {
      id: "legend",
      name: "Legendary development in later sources",
      description:
        "Later Gospels add increasingly elaborate resurrection details, " +
        "consistent with legendary growth over time.",
      likelihoods: { R: 0.5, N: 0.85 },
      weight: 0.7,
      keywords: ["legend", "later gospel", "embellish", "redaction", "developed", "contradiction"],
      references: [
        "Ehrman (2014).",
        "Crossan (1991).",
      ],
      note: "Favours N for the late material; blunted by the very early creed (1 Cor 15).",
    },
    {
      id: "priorlow",
      name: "Base rate of resurrections (Humean prior)",
      description:
        "Resurrections are not observed in ordinary experience; the base rate of " +
        "such an event is extremely low absent special background.",
      likelihoods: { R: 0.8, N: 0.99 },
      weight: 1,
      keywords: ["miracle", "prior probability", "base rate", "laws of nature", "Hume"],
      references: [
        "Hume, 'Of Miracles', Enquiry X.",
        "Swinburne, The Resurrection of God Incarnate (Oxford, 2003) — replies to Hume via background theism.",
      ],
      note: "This is the heart of the prior debate; it is encoded in priors/assumptions, and lightly here to avoid double-counting.",
    },
  ];

  global.DefaultModel = {
    hypotheses: () => JSON.parse(JSON.stringify(HYPOTHESES)),
    evidence: () => JSON.parse(JSON.stringify(EVIDENCE)),
  };
})(window);
