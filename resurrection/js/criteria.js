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

  // "Naturalistic" is modelled as a DISJUNCTION of distinct, coherent accounts,
  // not a single column. Each is a full competing hypothesis with its own prior,
  // parsimony cost (auxiliary assumptions), and per-criterion likelihoods. The
  // engine compares Resurrection against the best-fitting naturalistic account
  // per datum, and sums the naturalistic posteriors for the family total.
  const HYPOTHESES = [
    {
      id: "R",
      name: "Bodily Resurrection",
      short: "Resurrection",
      role: "pro",
      family: "resurrection",
      color: "#c9a227",
      prior: 0.4,
      description:
        "Jesus was crucified, died, was buried, and was raised bodily, with " +
        "post-mortem appearances to individuals and groups.",
      assumptions: [
        { text: "A God exists who would have reason to raise Jesus (background theism).", plausibility: 0.5 },
      ],
    },
    {
      id: "Nv",
      name: "Subjective visions / cognitive dissonance",
      short: "Visions",
      role: "con",
      family: "naturalistic",
      color: "#5b8def",
      prior: 0.25,
      description:
        "Grief- and dissonance-driven visionary experiences (Lüdemann, Goulder): " +
        "sincere disciples 'saw' Jesus; the empty tomb is secondary or legendary.",
      assumptions: [
        { text: "Independent visionary experiences arose in several disciples, including sceptics (Paul, James).", plausibility: 0.5 },
        { text: "Group appearances reduce to coincident or socially-reinforced individual visions.", plausibility: 0.45 },
      ],
    },
    {
      id: "Nl",
      name: "Legendary development",
      short: "Legend",
      role: "con",
      family: "naturalistic",
      color: "#7c6fd6",
      prior: 0.2,
      description:
        "The physical appearances and empty-tomb narratives grew by legendary " +
        "accretion over decades; the historical core is minimal.",
      assumptions: [
        { text: "Substantial legendary growth occurred despite the very early creed (1 Cor 15).", plausibility: 0.45 },
      ],
    },
    {
      id: "Nd",
      name: "Unknown fate of the body",
      short: "Body unknown",
      role: "con",
      family: "naturalistic",
      color: "#4bb3a7",
      prior: 0.15,
      description:
        "Jesus was probably not buried in a known, identifiable tomb (Ehrman): the " +
        "body's fate is unknown, and belief arose from later experiences.",
      assumptions: [
        { text: "Crucifixion victims were typically not given honourable, marked burial.", plausibility: 0.55 },
        { text: "The empty-tomb story is a later inference from the appearance belief.", plausibility: 0.55 },
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
      likelihoods: { R: 0.99, Nv: 0.99, Nl: 0.96, Nd: 0.99 },
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
      likelihoods: { R: 0.92, Nv: 0.70, Nl: 0.55, Nd: 0.30 },
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
      likelihoods: { R: 0.95, Nv: 0.50, Nl: 0.40, Nd: 0.60 },
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
      likelihoods: { R: 0.90, Nv: 0.85, Nl: 0.40, Nd: 0.80 },
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
      likelihoods: { R: 0.95, Nv: 0.60, Nl: 0.45, Nd: 0.60 },
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
      likelihoods: { R: 0.90, Nv: 0.85, Nl: 0.60, Nd: 0.80 },
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
      likelihoods: { R: 0.40, Nv: 0.90, Nl: 0.60, Nd: 0.70 },
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
      likelihoods: { R: 0.50, Nv: 0.70, Nl: 0.90, Nd: 0.70 },
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
      likelihoods: { R: 0.80, Nv: 0.99, Nl: 0.99, Nd: 0.99 },
      weight: 1,
      keywords: ["miracle", "prior probability", "base rate", "laws of nature", "Hume"],
      references: [
        "Hume, 'Of Miracles', Enquiry X.",
        "Swinburne, The Resurrection of God Incarnate (Oxford, 2003) — replies to Hume via background theism.",
      ],
      note: "This is the heart of the prior debate; it is encoded in priors/assumptions, and lightly here to avoid double-counting.",
    },
  ];

  // Default dependency group: the creed, the group appearances, and the
  // disciples' transformation are largely the SAME early proclamation tradition
  // seen from three angles — not three independent witnesses. Grouping them with
  // a moderate correlation stops the engine from multiplying one tradition three
  // times. Fully editable; set rho=0 to treat them as independent.
  const GROUPS = [
    { id: "g-proclamation", label: "Early appearance / proclamation tradition", rho: 0.5 },
  ];
  const GROUP_MEMBERS = { creed: "g-proclamation", appearances: "g-proclamation", transformation: "g-proclamation" };
  EVIDENCE.forEach((e) => { if (GROUP_MEMBERS[e.id]) e.group = GROUP_MEMBERS[e.id]; });

  global.DefaultModel = {
    hypotheses: () => JSON.parse(JSON.stringify(HYPOTHESES)),
    evidence: () => JSON.parse(JSON.stringify(EVIDENCE)),
    groups: () => JSON.parse(JSON.stringify(GROUPS)),
  };
})(window);
