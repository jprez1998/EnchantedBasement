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

    // ---- Source-critical stratification --------------------------------------
    {
      id: "the500",
      name: "Appearance to 500 at once (1 Cor 15:6)",
      description:
        "Within the creed Paul cites a mass simultaneous appearance to over 500, " +
        "'most of whom are still alive' — an implicit appeal to living witnesses. " +
        "A mass simultaneous experience strains the individual grief-vision model.",
      likelihoods: { R: 0.85, Nv: 0.25, Nl: 0.45, Nd: 0.55 },
      weight: 0.8,
      keywords: ["five hundred", "500", "at one time", "most of whom", "fallen asleep"],
      references: [
        "1 Corinthians 15:6.",
        "Habermas & Licona (2004).",
        "Allison, Resurrecting Jesus (2005) — cautious on the 500.",
      ],
      note: "Mass simultaneity is the part that strains subjective-vision accounts; grouped with the creed for shared source.",
    },
    {
      id: "paul",
      name: "Conversion & testimony of Paul (hostile primary eyewitness)",
      description:
        "Paul is our one first-person source: in undisputed early letters he claims " +
        "to have seen the risen Christ (1 Cor 15:8) as a former persecutor outside the " +
        "grieving community (Gal 1:13–16). The bereavement-vision model has little " +
        "leverage on a hostile outsider.",
      likelihoods: { R: 0.90, Nv: 0.35, Nl: 0.25, Nd: 0.55 },
      weight: 0.9,
      keywords: ["Paul", "Saul", "persecuted", "Damascus", "last of all", "untimely born", "Galatians"],
      references: [
        "1 Corinthians 15:8–9; Galatians 1:11–24.",
        "Habermas & Licona (2004).",
        "Ehrman, How Jesus Became God (2014) — visionary reading.",
      ],
      note: "Primary first-person source AND a hostile witness — all naturalistic accounts struggle here, especially subjective grief visions.",
    },
    {
      id: "james",
      name: "Conversion of James, the sceptical brother",
      description:
        "Jesus' family is shown as sceptical during his ministry (Mark 3:21; John 7:5); " +
        "yet James is named a witness (1 Cor 15:7), becomes a pillar of the Jerusalem " +
        "church (Gal 2:9), and is martyred (Josephus, Ant. 20.200).",
      likelihoods: { R: 0.88, Nv: 0.40, Nl: 0.35, Nd: 0.55 },
      weight: 0.8,
      keywords: ["James", "brother of the Lord", "out of his mind", "did not believe", "pillar"],
      references: [
        "Mark 3:21; John 7:5; 1 Corinthians 15:7; Galatians 2:9.",
        "Josephus, Antiquities 20.200.",
        "Habermas & Licona (2004).",
      ],
      note: "A prior sceptic with external attestation (Josephus); grief visions do not straightforwardly produce this trajectory.",
    },
    {
      id: "external",
      name: "Non-Christian attestation & the Jewish 'stolen body' polemic",
      description:
        "External sources corroborate the skeleton (Tacitus, Ann. 15.44; Josephus on " +
        "James). The early Jewish counter-claim (Matt 28:11–15; Justin, Dial. 108) " +
        "alleges the body was stolen — conceding an empty tomb rather than denying it.",
      likelihoods: { R: 0.85, Nv: 0.45, Nl: 0.50, Nd: 0.40 },
      weight: 0.7,
      keywords: ["Tacitus", "stole", "stolen", "disciples came by night", "Trypho", "guard"],
      references: [
        "Tacitus, Annals 15.44; Matthew 28:11–15; Justin Martyr, Dialogue with Trypho 108.",
        "Wright (2003).",
      ],
      note: "If opponents conceded an empty tomb and argued theft, that favours the tomb's emptiness; the polemic is reported by Matthew, so weight is modest.",
    },

    // ---- Comparative-historical criteria -------------------------------------
    {
      id: "failed_messianic",
      name: "Comparison with failed messianic movements",
      description:
        "First-century Jewish messianic movements (Theudas, Judas of Galilee, the " +
        "Egyptian) collapsed at the leader's death or arrest; none produced a " +
        "resurrection claim. Christianity is anomalous in its post-death persistence.",
      likelihoods: { R: 0.85, Nv: 0.45, Nl: 0.45, Nd: 0.50 },
      weight: 0.8,
      keywords: ["Theudas", "Judas of Galilee", "the Egyptian", "messianic", "dispersed", "came to nothing"],
      references: [
        "Josephus, Antiquities 18.1.1; 20.5.1; Acts 5:36–37.",
        "Wright (2003).",
      ],
      note: "Naturalistic accounts must explain why this movement uniquely innovated a resurrection claim. Caveat: possible survivorship bias.",
    },
    {
      id: "category_mismatch",
      name: "Resurrection claim unprecedented in Second-Temple categories",
      description:
        "Second-Temple Judaism expected a general end-time resurrection, not one " +
        "individual's bodily resurrection mid-history. A legend would more likely use " +
        "available templates (exaltation/assumption like Enoch or Elijah).",
      likelihoods: { R: 0.80, Nv: 0.50, Nl: 0.30, Nd: 0.55 },
      weight: 0.8,
      keywords: ["resurrection", "general resurrection", "last day", "exalted", "Enoch", "Elijah", "assumption"],
      references: [
        "N. T. Wright, The Resurrection of the Son of God (Fortress, 2003).",
        "Daniel 12:2; cf. 2 Maccabees 7.",
      ],
      note: "Tells especially against 'legendary development', which would be expected to follow an existing template.",
    },
    {
      id: "dying_rising_gods",
      name: "Alleged dying-and-rising god parallels",
      description:
        "The older comparative-religion thesis (Frazer; the mystery-cults school) derived " +
        "the resurrection from Osiris/Adonis/Dionysus. Current scholarship largely rejects " +
        "these parallels as late or anachronistic.",
      likelihoods: { R: 0.55, Nv: 0.55, Nl: 0.65, Nd: 0.55 },
      weight: 0.6,
      keywords: ["Osiris", "Adonis", "Dionysus", "mystery", "dying and rising", "Frazer"],
      references: [
        "J. Z. Smith, Drudgery Divine (1990) — critical.",
        "T. Mettinger, The Riddle of Resurrection (2001) — partial defence.",
      ],
      note: "A datum for the legend account, but its evidential force has weakened markedly since the 1970s — hence a low default quality.",
    },

    // ---- Psychological / social-science criteria -----------------------------
    {
      id: "cognitive_dissonance",
      name: "Cognitive-dissonance reduction model (Festinger)",
      description:
        "Social-psychology of failed-expectation groups: disconfirmation can intensify " +
        "belief and generate new theological narratives. A structural mechanism for the " +
        "naturalistic accounts.",
      likelihoods: { R: 0.45, Nv: 0.80, Nl: 0.65, Nd: 0.60 },
      weight: 0.7,
      keywords: ["cognitive dissonance", "prophecy fails", "Festinger", "disconfirmation", "rationalis"],
      references: [
        "Festinger, Riecken & Schachter, When Prophecy Fails (1956).",
        "Lüdemann (1994).",
      ],
      note: "A serious naturalistic mechanism (favours the visions account); grouped with the other psychological mechanisms to avoid stacking.",
    },
    {
      id: "grief_timeline",
      name: "Appearance timeline vs bereavement-vision clinical pattern",
      description:
        "Bereavement visions typically begin soon after a loss and recur and fade. The " +
        "appearances cluster early but reach a defined cessation (Paul: 'last of all'; the " +
        "Ascension). Does the timeline fit the clinical model?",
      likelihoods: { R: 0.55, Nv: 0.65, Nl: 0.55, Nd: 0.55 },
      weight: 0.5,
      keywords: ["grief", "bereavement", "appeared", "ascension", "ceased", "last of all"],
      references: [
        "Allison, Resurrecting Jesus (2005).",
        "Lüdemann (1994).",
      ],
      note: "Early clustering fits grief visions; the sharp cessation is somewhat atypical — a loose comparison, so quality is moderate.",
    },

    // ---- Methodological criteria ---------------------------------------------
    {
      id: "embarrassment",
      name: "Criterion of embarrassment (applied systematically)",
      description:
        "The tradition preserves details an inventor would avoid: female primary witnesses, " +
        "Peter's denial, the disciples' desertion, the cry of dereliction. An authenticity " +
        "marker against wholesale invention.",
      likelihoods: { R: 0.85, Nv: 0.65, Nl: 0.40, Nd: 0.60 },
      weight: 0.6,
      keywords: ["women", "denied", "denial", "forsook", "fled", "my God why", "deserted"],
      references: [
        "Mark 14:50, 66–72; 15:34; 16:1–8.",
        "Habermas & Licona (2004).",
      ],
      note: "Tells against 'legend' (which would sanitise). Partly overlaps the empty-tomb/women datum — weight reduced to avoid double-counting.",
    },
    {
      id: "tomb_veneration",
      name: "Absence of early tomb veneration",
      description:
        "Second-Temple Judaism venerated holy figures' tombs, yet there is no early tomb " +
        "cult at Jesus' burial site despite Jerusalem's accessibility.",
      likelihoods: { R: 0.85, Nv: 0.55, Nl: 0.55, Nd: 0.80 },
      weight: 0.6,
      keywords: ["tomb", "veneration", "shrine", "bones", "burial site"],
      references: [
        "Matthew 23:29; cf. Wright (2003).",
        "Craig, Assessing the New Testament Evidence (1989).",
      ],
      note: "Strange if the tomb were occupied — but well explained by the 'unknown fate of the body' account, which expects no known tomb. Not a strong datum once Nd is on the table.",
    },
    {
      id: "resurrection_body",
      name: "The trans-physical resurrection body",
      description:
        "The accounts describe a body that eats (Luke 24:41–43) and is touched (John 20:27) " +
        "yet passes through doors (John 20:19) and appears/disappears (Luke 24:31). Either " +
        "authentic confused witness of something unprecedented, or redactional harmonisation.",
      likelihoods: { R: 0.65, Nv: 0.55, Nl: 0.65, Nd: 0.55 },
      weight: 0.5,
      keywords: ["touch", "flesh and bones", "locked doors", "vanished", "did not recognise", "ate"],
      references: [
        "Luke 24:31, 36–43; John 20:19–27.",
        "Wright (2003); Lüdemann (1994).",
      ],
      note: "Double-edged: cuts for R (authentic confusion) or for legend (harmonised vision + anti-Docetic traditions) depending on the literary theory.",
    },
    {
      id: "source_independence",
      name: "Source independence / multiple attestation of the appearances",
      description:
        "Appearances are attested across putatively independent streams (Paul; Mark; Luke's " +
        "L; John). The Galilee-vs-Jerusalem divergence suggests either multiple independent " +
        "streams or redactional confusion.",
      likelihoods: { R: 0.78, Nv: 0.65, Nl: 0.45, Nd: 0.60 },
      weight: 0.6,
      keywords: ["Galilee", "Jerusalem", "independent", "tradition", "attested"],
      references: [
        "Mark 16:7; Matthew 28:16; Luke 24:49; John 21.",
        "Habermas & Licona (2004); Crossan (1991).",
      ],
      note: "Independent attestation favours historicity; the location divergence is double-edged (independence vs redaction).",
    },
    {
      id: "n_coherence",
      name: "Internal-coherence audit of the naturalistic disjunction",
      description:
        "The naturalistic sub-mechanisms can be in tension: grief visions imply a small " +
        "group and a short window, while legendary development implies a long generational " +
        "process — yet the creed (1 Cor 15) is too early for major legend.",
      likelihoods: { R: 0.70, Nv: 0.60, Nl: 0.35, Nd: 0.60 },
      weight: 0.6,
      keywords: ["early", "creed", "tradition", "decades", "legendary", "timeframe"],
      references: [
        "1 Corinthians 15:3 ('received… delivered').",
        "Wright (2003); Ehrman (2014).",
      ],
      note: "A coherence critique: an early creed leaves little room for legend. Partly overlaps 'creed' and 'legend' — weight reduced.",
    },
  ];

  // Default dependency groups stop correlated criteria being counted as
  // independent witnesses. The creedal list (creed, group appearances, the 500)
  // is ONE Pauline source seen several ways; the psychological mechanisms
  // (grief visions, cognitive dissonance, timeline) are one naturalistic
  // explanatory strategy. Paul's and James's conversions are left ungrouped:
  // each has independent attestation (Galatians; Josephus). Fully editable —
  // set rho=0 to treat a group's members as independent.
  const GROUPS = [
    // The appearance/witness criteria are largely ONE body of tradition — most are
    // named in the same 1 Cor 15 creed. Paul and James carry some independent
    // corroboration (Galatians; Josephus), so the correlation is high but not total.
    { id: "g-appearance", label: "Early appearance / witness tradition (1 Cor 15 cluster)", rho: 0.6 },
    // The empty-tomb criteria all stand or fall with one tomb being known and empty.
    { id: "g-tomb", label: "Empty-tomb cluster (one tomb)", rho: 0.55 },
    // The naturalistic psychological mechanisms are one explanatory strategy.
    { id: "g-natmech", label: "Naturalistic psychological mechanisms", rho: 0.5 },
  ];
  const GROUP_MEMBERS = {
    creed: "g-appearance", appearances: "g-appearance", the500: "g-appearance",
    paul: "g-appearance", james: "g-appearance", source_independence: "g-appearance",
    embarrassment: "g-appearance",
    burial: "g-tomb", emptytomb: "g-tomb", external: "g-tomb", tomb_veneration: "g-tomb",
    hallucination: "g-natmech", cognitive_dissonance: "g-natmech", grief_timeline: "g-natmech",
  };
  EVIDENCE.forEach((e) => { if (GROUP_MEMBERS[e.id]) e.group = GROUP_MEMBERS[e.id]; });

  global.DefaultModel = {
    hypotheses: () => JSON.parse(JSON.stringify(HYPOTHESES)),
    evidence: () => JSON.parse(JSON.stringify(EVIDENCE)),
    groups: () => JSON.parse(JSON.stringify(GROUPS)),
  };
})(window);
