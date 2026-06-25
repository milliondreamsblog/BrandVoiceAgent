// Competitor follow-list — AGENCIES THAT TARGET YC / FUNDED EARLY-STAGE STARTUPS.
// These compete for Bricx's exact clients (VC-backed B2B SaaS/AI). Ranked by
// strength of YC/funded evidence. Built 2026-06-24 from US-Design-Agencies-Leads.csv
// + web verification of each agency's clients/positioning. Every client name and
// handle below was found in a fetch/search — none invented. This snapshot feeds the
// /competitors page; it'll be superseded by the System B trend tables once built.

export type Tier = 1 | 2 | 3 | 4;
export type XActivity = "active" | "light" | "quiet" | "unverified";
export type Confidence = "high" | "medium-high" | "medium";

export type FollowAgency = {
  name: string;
  site: string; // domain
  tier: Tier;
  discovered?: boolean; // found beyond the source CSV
  evidence: string; // why they qualify (YC/funded clients or positioning)
  xHandle: string | null; // primary @ to follow (without @); null if none/unverified
  xLabel?: string; // override label (e.g. founder account caveat)
  linkedin: string;
  xActivity: XActivity;
  confidence: Confidence;
};

export type DroppedAgency = { name: string; site: string; reason: string };

// A tracked competitor post that performed well, with a "why it worked" read.
export type BestPost = {
  agency: string;
  handle: string;
  text: string;
  date: string; // ISO date
  url: string;
  likes: number;
  reposts: number;
  replies: number;
  bookmarks: number;
  views: number;
  why: string; // why it landed + what Bricx can borrow
};

// A plain-English "winning pattern" distilled across the best posts — the founder
// playbook: name it, why it works, what to do. (Simple does the job.)
export type WinningPattern = {
  name: string; // plain name
  whatItIs: string; // one line
  whyItWorks: string; // one line
  doThis: string; // the action for Bricx
  seenIn: string; // example handle(s)
};

export const TIER_LABEL: Record<Tier, string> = {
  1: "Tier 1 — Explicit YC naming + Framer/Webflow + exact ICP",
  2: "Tier 2 — Confirmed YC / marquee funded logos",
  3: "Tier 3 — Clear “funded startups” positioning",
  4: "Tier 4 — Qualifies, lower ICP/geo fit",
};

export const COMPETITOR_DATA: {
  generatedAt: string;
  criterion: string;
  source: string;
  agencies: FollowAgency[];
  dropped: DroppedAgency[];
  takeaways: string[];
  postsSummary: string;
  winningPatterns: WinningPattern[];
  bestPosts: BestPost[];
} = {
  generatedAt: "2026-06-24",
  criterion:
    "Agencies that target YC / funded early-stage startups — Bricx's direct competition. Ranked by strength of YC/funded evidence.",
  source:
    "US-Design-Agencies-Leads.csv + web verification (client logos & positioning)",
  agencies: [
    // ── Tier 1 ──
    {
      name: "SVZ",
      site: "svz.io",
      tier: 1,
      evidence:
        "Site names client backers Y Combinator, Sequoia, a16z, Founders Fund; clients raised $5B+, 10+ unicorns (Ramp $13B, Skydio, Patreon, Algolia, Square, Fivetran). Webflow Enterprise Partner.",
      xHandle: "svzdesign",
      linkedin: "https://www.linkedin.com/company/svzdesign",
      xActivity: "active",
      confidence: "high",
    },
    {
      name: "Meaningful (M8L)",
      site: "m8l.com",
      tier: 1,
      evidence:
        "Verbatim: “companies backed by Y Combinator, 500 Startups, and great VC funds”; “trusted by unicorns + YC graduates.” Clients: Robinhood, DoorDash, Medium, Reforge, Raycast. Webflow + Framer + Vercel partner.",
      xHandle: "orlandosorio_",
      xLabel: "founder @orlandosorio_ (no brand X account)",
      linkedin: "https://www.linkedin.com/company/m8l",
      xActivity: "light",
      confidence: "high",
    },
    {
      name: "Ramotion",
      site: "ramotion.com",
      tier: 1,
      evidence:
        "Startup-branding page: “seed → Series A/B”; VC trust badges Y Combinator, a16z, Sequoia, Khosla, Accel, Techstars; $1B+ raised by clients (Stripe, Filecoin, Clearbit, Descript, Okta, Redis).",
      xHandle: "Ramotion",
      linkedin: "https://www.linkedin.com/company/ramotion",
      xActivity: "active",
      confidence: "high",
    },
    // ── Tier 2 ──
    {
      name: "Awesomic",
      site: "awesomic.com",
      tier: 2,
      evidence:
        "Is itself YC S21; “4000+ companies incl. 400+ YC startups.” YC case studies: Perseus Defense (S25), Willow (S25), Playhouse (S21), Hegel AI (S22); Fortuna Health $18M, Pylon $31M.",
      xHandle: "awesomic",
      xLabel: "@awesomic + founder @roman_sevast",
      linkedin: "https://www.linkedin.com/company/awesomic",
      xActivity: "active",
      confidence: "high",
    },
    {
      name: "8020",
      site: "8020.inc",
      tier: 2,
      evidence:
        "Case studies for Vanta (YC W18) and Pilot.com (YC S17); plus Circle, Wave, Superlist, Huberman Lab. First agency in the Webflow Enterprise Partner Program.",
      xHandle: "weare8020",
      xLabel: "@weare8020 (founder @mattvaru active)",
      linkedin: "https://www.linkedin.com/company/8020inc",
      xActivity: "active",
      confidence: "high",
    },
    {
      name: "BX Studio",
      site: "bx.studio",
      tier: 2,
      evidence:
        "Certa case study framed around its Series B raise; clients Reddit, Gorgias, Headspace, Anchorage Digital (a16z), Blockaid, + VC firm Amplify Partners. Webflow Enterprise Partner of the Year 2025.",
      xHandle: "bx__studio",
      linkedin: "https://www.linkedin.com/company/bxstudio",
      xActivity: "light",
      confidence: "high",
    },
    {
      name: "Finsweet",
      site: "finsweet.com",
      tier: 2,
      evidence:
        "Vanta (YC W18) logo + Dropbox, GitHub, Aura, WeTransfer. Creators of Client-First/Attributes; Webflow Enterprise Partner. “High-growth teams rely on Finsweet.”",
      xHandle: "finsweet",
      linkedin: "https://www.linkedin.com/company/finsweet",
      xActivity: "active",
      confidence: "high",
    },
    {
      name: "Smith & Diction",
      site: "smith-diction.com",
      tier: 2,
      discovered: true,
      evidence:
        "Marquee funded-AI roster: Perplexity (documented rebrand), Superhuman, Grammarly, Coda, Gamma, Anterior. High-prestige brand studio (aspirational competitor); qualifies on logos, no explicit “for YC” copy.",
      xHandle: "Smith_Diction",
      xLabel: "live-verified active (68–181 likes/post)",
      linkedin: "https://www.linkedin.com/company/smith-diction",
      xActivity: "active",
      confidence: "high",
    },
    {
      name: "Edgar Allan",
      site: "edgarallan.com",
      tier: 2,
      evidence:
        "VC-portfolio orientation: investment-firm clients (Sequoia, Accel, Pacific Lake, Premji) + Narmi (Series B), Flock Safety (a16z; YC), Tonic.ai. 800+ Webflow projects, Enterprise Partner.",
      xHandle: "EdgarAllanCo",
      linkedin: "https://www.linkedin.com/company/edgar-allan",
      xActivity: "active",
      confidence: "high",
    },
    // ── Tier 3 ──
    {
      name: "DesignMe",
      site: "designme.agency",
      tier: 3,
      discovered: true,
      evidence:
        "Tagline “Design + build partner for funded startups”; “from funded startups to $1B unicorns”; $2B+ client funding. Seamless.ai (Series A), Lightdash (Series A $11M), N3XT.io (Series B $72M). Framer/Webflow/React.",
      xHandle: null,
      xLabel: "X unverified — @designmeagency does NOT exist (live-checked); find real handle",
      linkedin: "https://www.linkedin.com/company/designmeagency",
      xActivity: "unverified",
      confidence: "high",
    },
    {
      name: "Lazarev",
      site: "lazarev.agency",
      tier: 3,
      evidence:
        "“design for early-stage startups”; $500M raised by clients; 400+ brands secured funding. Peel (Shopify-acquired), Pika AI, Accern ($40M). Dedicated /for/startups page. (Non-US: Ukraine/EE team.)",
      xHandle: "lazarevagency",
      xLabel: "live-checked: real handle but DORMANT on X (newest post Oct 2024) — follow on LinkedIn",
      linkedin: "https://www.linkedin.com/company/lazarevagency",
      xActivity: "quiet",
      confidence: "medium-high",
    },
    {
      name: "Pixel One",
      site: "pixel-one.com",
      tier: 3,
      evidence:
        "“UI/UX studio for ambitious B2B SaaS teams”; clients raised $5.27B, exited $2.298B. Strong funded positioning, but named clients aren't marquee YC names.",
      xHandle: "pixel1studio",
      linkedin: "https://www.linkedin.com/company/pixel-1",
      xActivity: "quiet",
      confidence: "medium",
    },
    {
      name: "Baunfire",
      site: "baunfire.com",
      tier: 3,
      evidence:
        "“Leading global brands, VC firms, and funded startups.” VC clients Norwest, Sapphire Ventures; funded: Benchling, Instabase, Replicant. Skews enterprise (Google, Nike).",
      xHandle: "baunfire",
      linkedin: "https://www.linkedin.com/company/baunfire",
      xActivity: "quiet",
      confidence: "medium",
    },
    {
      name: "StanVision",
      site: "stan.vision",
      tier: 3,
      discovered: true,
      evidence:
        "“SaaS website design agency for funded teams.” Clients: Rillet, Tolstoy, Primer, Siena, Zipchat. UI/UX + Webflow. Real SaaS clients, not marquee YC names.",
      xHandle: "stan_vision",
      xLabel: "live-verified active (timeline skews to reposts of viral design/AI content)",
      linkedin: "https://www.linkedin.com/company/stanvision",
      xActivity: "active",
      confidence: "medium-high",
    },
    {
      name: "Studio Maydit",
      site: "studiomaydit.com",
      tier: 3,
      discovered: true,
      evidence:
        "Verbatim “a design partner for funded AI companies” / “funded, taste-obsessed companies that just raised.” Framer-focused; case-study clients smaller (Dualite, lensai.tech).",
      xHandle: null,
      xLabel: "X unverified — check site footer",
      linkedin: "https://www.linkedin.com/company/studio-maydit",
      xActivity: "unverified",
      confidence: "medium-high",
    },
    // ── Tier 4 ──
    {
      name: "Clay",
      site: "clay.global",
      tier: 4,
      evidence:
        "Coinbase, Stripe, Slack, Superhuman, Clearbit; Earnin redesign “$100M+ funding.” But enterprise-skewed (Meta, Google, Amazon, Toyota); no YC positioning.",
      xHandle: "clayglobal",
      linkedin: "https://www.linkedin.com/company/clayglobal",
      xActivity: "active",
      confidence: "medium",
    },
    {
      name: "Studio Freight",
      site: "studiofreight.com",
      tier: 4,
      evidence:
        "Logos: Brex (YC W17), Perplexity (Comet), MetaMask, Tabs. No explicit positioning; high-end interactive studio (makers of Lenis). Dev arm posts as @darkroomdevs (active).",
      xHandle: "studiofreight",
      xLabel: "@studiofreight (dev arm @darkroomdevs is the active one)",
      linkedin: "https://www.linkedin.com/company/studio-freight",
      xActivity: "light",
      confidence: "medium",
    },
    {
      name: "Upsilon",
      site: "upsilonit.com",
      tier: 4,
      evidence:
        "“Attract investors”; clients raised $177M; YC founders (Vizzly S22, Thematic). But a dev/product studio, not Framer/Webflow design — service mismatch.",
      xHandle: "upsilon_it",
      linkedin: "https://www.linkedin.com/company/upsilon-it",
      xActivity: "quiet",
      confidence: "medium",
    },
    {
      name: "Black Peak",
      site: "blackpeak.ca",
      tier: 4,
      discovered: true,
      evidence:
        "Webflow for AI/tech companies “many backed by Y Combinator” (per directories, not verbatim on-site). Vancouver, Canada.",
      xHandle: null,
      xLabel: "X unverified",
      linkedin: "https://ca.linkedin.com/company/black-peak-design",
      xActivity: "unverified",
      confidence: "medium",
    },
    {
      name: "Everything Design",
      site: "everything.design",
      tier: 4,
      discovered: true,
      evidence:
        "“Funded B2B startups (Series A and beyond)” but clients skew India enterprise (Razorpay, Zuora, Bizongo) — weakest ICP/geo fit.",
      xHandle: null,
      xLabel: "no X found",
      linkedin: "https://in.linkedin.com/company/everythingdotdesign",
      xActivity: "unverified",
      confidence: "medium",
    },

    // ── Expansion batch (2026-06-24) — all discovered + X handles live-verified ──
    {
      name: "Hedrick",
      site: "hedrick.io",
      tier: 1,
      discovered: true,
      evidence:
        "“High-growth startups backed by YC, a16z, and First Round”; “Investor-Ready Websites” for “venture-backed SaaS, Seed to Series A.” Clients: Linktree, Beeper, Lob, FalconX, Beyond Identity.",
      xHandle: "hedrickagency",
      xLabel: "live-checked: real but quiet on X (newest ~2022/pinned)",
      linkedin: "https://www.linkedin.com/company/hedrick",
      xActivity: "quiet",
      confidence: "high",
    },
    {
      name: "Grafit Agency",
      site: "grafit.agency",
      tier: 1,
      discovered: true,
      evidence:
        "“Clients backed by First Round, Sequoia, Y Combinator”; “trusted by 100+ tech leaders.” Clients: Twilio, Clay, HP, Gentrace. Webflow Enterprise Partner. (Poland + Austin TX.)",
      xHandle: "grafitagency",
      xLabel: "live-checked: newest Oct 2025 but tiny/new account",
      linkedin: "https://www.linkedin.com/company/grafit-agency",
      xActivity: "quiet",
      confidence: "high",
    },
    {
      name: "Flowtrix",
      site: "flowtrix.co",
      tier: 1,
      discovered: true,
      evidence:
        "Page titled “Webflow Agency for Series A SaaS Companies”; backer logos Accel, Techstars, Y Combinator, Sequoia; segments AI Startups / B2B SaaS / VC. (India + Delaware.)",
      xHandle: "flowtrix_co",
      xLabel: "live-checked: newest May 2026, small/low-volume",
      linkedin: "https://www.linkedin.com/company/flowtrix",
      xActivity: "light",
      confidence: "high",
    },
    {
      name: "Basement Studio",
      site: "basement.studio",
      tier: 2,
      discovered: true,
      evidence:
        "Clients: Vercel, Linear, Cursor, Scale, ElevenLabs, Harvey, Mintlify, Baseten, Cal.com, Krea. Harvey case study: “$5M seed → $80M Series B.” (Argentina + LA.)",
      xHandle: "basementstudio",
      xLabel: "live-verified active (18K followers, posting Jun 2026)",
      linkedin: "https://www.linkedin.com/company/basementstudio",
      xActivity: "active",
      confidence: "high",
    },
    {
      name: "Flowout",
      site: "flowout.com",
      tier: 2,
      discovered: true,
      evidence:
        "Clients: Jasper ($125M Series A), Stripe, Clearbit, Sequoia, Obviously AI, Riverside.fm; “clients raised over $2B combined.” Webflow Enterprise Partner. (Slovenia + US.)",
      xHandle: "FlowoutHQ",
      linkedin: "https://www.linkedin.com/company/flowout",
      xActivity: "light",
      confidence: "high",
    },
    {
      name: "Focus Lab",
      site: "focuslab.agency",
      tier: 2,
      discovered: true,
      evidence:
        "Clients: Frame.io, Braze, LaunchDarkly, Customer.io, PolyAI, Voiceflow, Outreach, Salesloft; “$7.6B raised post-branding,” “16 unicorns branded”; serves startups prepping funding rounds. (US, Savannah GA.)",
      xHandle: "FocusLabLLC",
      linkedin: "https://www.linkedin.com/company/focus-lab-llc",
      xActivity: "light",
      confidence: "high",
    },
    {
      name: "Refokus",
      site: "refokus.com",
      tier: 2,
      discovered: true,
      evidence:
        "Dedicated “Venture Capital” + “Startups” verticals; VC clients Space Capital, Maniv, Keystone; funded SaaS/AI clients Lavender, Silvr, Deepset, Candid Health. (Germany; EU/US/LA.)",
      xHandle: "RefokusAgency",
      linkedin: "https://www.linkedin.com/company/refokusagency",
      xActivity: "light",
      confidence: "high",
    },
    {
      name: "Halo Lab",
      site: "halo-lab.com",
      tier: 2,
      discovered: true,
      evidence:
        "“12 years of design-driven development for B2B products”; clients Zoom, Bumble, Nokia, Opera, Bonterra; Webflow Pro Partner. (Ukraine; markets NY presence.)",
      xHandle: "halolabteam",
      xLabel: "live-checked: real but quiet on X (newest Nov 2023)",
      linkedin: "https://www.linkedin.com/company/halolabteam",
      xActivity: "quiet",
      confidence: "high",
    },
    {
      name: "Fireart Studio",
      site: "fireart.studio",
      tier: 2,
      discovered: true,
      evidence:
        "“200+ startups and big brands”; clients Google, Atlassian, Pipedrive, Bolt, Crunchbase, Replicant; “design for startups & leading brands.” (Poland, Warsaw.)",
      xHandle: "Fireart_studio",
      xLabel: "live-checked: real but quiet on X (newest Feb 2024)",
      linkedin: "https://www.linkedin.com/company/fireart-ltd-",
      xActivity: "quiet",
      confidence: "high",
    },
    {
      name: "Trueform",
      site: "trueform.agency",
      tier: 2,
      discovered: true,
      evidence:
        "“AI-Native Digital Agency for High-Growth Startups & Enterprises”; clients Miro, Bilt Rewards, Morning Brew, Gather. (Switzerland.)",
      xHandle: "TrueformCo",
      linkedin: "https://ch.linkedin.com/company/trueform-agency",
      xActivity: "light",
      confidence: "high",
    },
    {
      name: "Deserve Studio",
      site: "deserve.studio",
      tier: 2,
      discovered: true,
      evidence:
        "Framer specialist (“Enterprise Framer Expert”); “early-stage startups to $100M+ companies”; clients Screenloop, Frigade, Roamless, io.net. (Türkiye; claims Bay Area.)",
      xHandle: "Deserve_Studio",
      xLabel: "live-verified active (newest Jun 2026)",
      linkedin: "https://www.linkedin.com/company/deservestudio",
      xActivity: "active",
      confidence: "high",
    },
    {
      name: "SaaSFactor",
      site: "saasfactor.co",
      tier: 2,
      discovered: true,
      evidence:
        "“Global AI SaaS Product Design Agency”; clients PayPal, Venmo, TriNet, Adaptive Security; claims UX work on a $55M Series A. (Offshore — verify direct clients.)",
      xHandle: "Saasfactor",
      xLabel: "live-checked: effectively dormant (2 posts, newest Oct 2025)",
      linkedin: "https://www.linkedin.com/company/saasfactor",
      xActivity: "quiet",
      confidence: "medium-high",
    },
    {
      name: "Wavespace",
      site: "wavespace.agency",
      tier: 2,
      discovered: true,
      evidence:
        "“Trusted by YC, a16z, Sequoia, Techstars”; “YC-backed, VC-funded; early-stage AI to Series B SaaS.” (Caveat: marquee names are investor/accelerator social proof; offshore.)",
      xHandle: null,
      xLabel: "X unverified — no company handle; founder @uxshahid 404s",
      linkedin: "https://www.linkedin.com/in/shahidux",
      xActivity: "unverified",
      confidence: "medium",
    },
    {
      name: "Eleken",
      site: "eleken.co",
      tier: 3,
      discovered: true,
      evidence:
        "“Pragmatic UI/UX design agency for SaaS”; case studies tied to funding (“$3.6M seed,” “$70M Series B”); clients Solvvy, MindTickle, JOOR. UI/UX only (no Framer/Webflow). (Ukraine.)",
      xHandle: "elekenagency",
      xLabel: "live-checked: abandoned on X (newest 2018) — follow on LinkedIn",
      linkedin: "https://www.linkedin.com/company/eleken",
      xActivity: "quiet",
      confidence: "high",
    },
    {
      name: "Outcrowd",
      site: "outcrowd.io",
      tier: 3,
      discovered: true,
      evidence:
        "“Design & Brand Acceleration for SaaS Startups”; stages Pre-seed/Seed/Series A; “25%+ of clients get Series A,” “$300M raised by clients.” (Ukraine; DE address.)",
      xHandle: "outcrowdstudio",
      linkedin: "https://www.linkedin.com/company/outcrowd-network",
      xActivity: "light",
      confidence: "high",
    },
    {
      name: "925Studios",
      site: "925studios.co",
      tier: 3,
      discovered: true,
      evidence:
        "“UI/UX Design Agency for SaaS & AI Startups”; “best for funded seed or Series A founders who need design, motion, and brand from one partner.”",
      xHandle: null,
      xLabel: "no X (Telegram only); LinkedIn has a duplicate UK page — verify",
      linkedin: "https://www.linkedin.com/company/studio925co",
      xActivity: "unverified",
      confidence: "medium-high",
    },
    {
      name: "Lowercase",
      site: "lowercaseb2b.com",
      tier: 3,
      discovered: true,
      evidence:
        "“The Framer & Webflow agency for early-stage B2B startups.” (Caveat: site blocks fetch; positioning only, no client logos confirmed.)",
      xHandle: null,
      xLabel: "X unverified",
      linkedin: "https://www.linkedin.com/company/lowercaseb2b",
      xActivity: "unverified",
      confidence: "medium-high",
    },
    {
      name: "Fineart Design Agency",
      site: "fineartdesign.agency",
      tier: 3,
      discovered: true,
      evidence:
        "Framer; “best for Seed to Series B teams”; “tailored for startups and growth teams.” (Clutch clients non-marquee: Reltio, Surgo Health.) (Canada + India delivery.)",
      xHandle: "fineartagency",
      xLabel: "live-verified active (newest Jun 2026)",
      linkedin: "https://ca.linkedin.com/company/fineartdesignagency",
      xActivity: "active",
      confidence: "medium-high",
    },
    {
      name: "SuperSkills",
      site: "superskills.design",
      tier: 4,
      discovered: true,
      evidence:
        "“High-performance sites for tech and AI startups”; “we partner with AI startups to ship production-ready websites”; Webflow + Framer; ex-Webflow brand designer. (Clients mid-market: Expa, Modern Health, Axios.)",
      xHandle: null,
      xLabel: "no X account (Instagram only)",
      linkedin: "https://www.linkedin.com/company/superskills-agency",
      xActivity: "unverified",
      confidence: "medium-high",
    },
    {
      name: "Adam Fard UX Studio",
      site: "adamfard.com",
      tier: 4,
      discovered: true,
      evidence:
        "“UI/UX Design Agency for SaaS, Fintech & AI,” “SaaS/Fintech startups (Series A and above).” But marquee clients skew enterprise (Samsung, T-Mobile); no Framer/Webflow. (Germany + SF.)",
      xHandle: "AdamFard_",
      xLabel: "founder account, active (27K followers) but now mostly about his product uxpilot.ai",
      linkedin: "https://www.linkedin.com/company/adam-fard",
      xActivity: "active",
      confidence: "medium-high",
    },
    {
      name: "ProCreator",
      site: "procreator.design",
      tier: 4,
      discovered: true,
      evidence:
        "“Early-stage SaaS to complex enterprise platforms”; CleverTap, Salesforce, Netcore. (Roster skews India enterprise/finance; no YC/US-VC logos.) (India, Mumbai.)",
      xHandle: "weareprocreator",
      linkedin: "https://www.linkedin.com/company/weareprocreator",
      xActivity: "light",
      confidence: "medium-high",
    },
    {
      name: "theCSS Agency",
      site: "thecssagency.com",
      tier: 4,
      discovered: true,
      evidence:
        "“Funded startups and growing B2B teams”; Webflow Premium Partner; “Webflow websites and brand identity for startups.” (Clients regional; no VC marquee.) (India.)",
      xHandle: "agency_css",
      linkedin: "https://in.linkedin.com/company/the-css-agency",
      xActivity: "light",
      confidence: "medium-high",
    },
  ],
  dropped: [
    { name: "Brix Agency", site: "brixagency.com", reason: "Webflow template shop; clients (Teachable, Yesware, Celigo) show no YC/funded signal." },
    { name: "Amply", site: "joinamply.com", reason: "“Startup web design” but clients are Dell/Zeni/WorkSpan; no YC/funded proof; no X handle found." },
    { name: "Bop Design", site: "bopdesign.com", reason: "Generic B2B web design; clients in real estate/insurance/industrial. No YC/funded language." },
    { name: "Drifting Creatives", site: "driftingcreatives.com", reason: "Regional TX B2B (Viasat, Texas A&M). No YC/funded signal." },
    { name: "Motion Tactic", site: "motiontactic.com", reason: "Mid-market B2B SaaS WordPress shop; no YC/funded framing; no X handle found." },
    { name: "Cuberto", site: "cuberto.com", reason: "Elite product design (Cisco, Mapbox, TradingView) but NO startup/VC/YC positioning; no Framer/Webflow; Russia-origin (sanctions/geo risk)." },
    { name: "Donux", site: "donux.com", reason: "B2B SaaS product design but no funded-stage/VC language; regional Italian clients." },
    { name: "Taqwah Agency", site: "taqwah.agency", reason: "Uses a “Funded Startups” phrase but homepage shows placeholder logos / no real named clients — unverifiable." },
    { name: "Designjoy, ManyPixels, Tubik, Phantom, Duck.design", site: "various", reason: "Checked — productized/enterprise studios with NO YC/funded-startup positioning on their own sites." },
  ],
  takeaways: [
    "Top 3 direct competitors (explicit YC naming + Framer/Webflow + your exact ICP): SVZ, Meaningful/M8L, Ramotion — follow these first.",
    "Highest-prestige aspirational logo competitor: Smith & Diction (Perplexity, Superhuman, Gamma).",
    "Strongest pure-play 'funded startup' shops to watch: Awesomic, 8020, Finsweet, DesignMe.",
    "Most of these agencies are more active on LinkedIn than X — follow on both; X-activity flags are from site/search signals, not live timestamped (run the browser to confirm before relying on a specific handle).",
    "Brix & Amply dropped on verification — no YC/funded evidence despite 'startup' framing.",
    "Expanded 2026-06-24 to 42 agencies. New explicit-YC direct competitors (Tier 1): Hedrick, Grafit, Flowtrix. Most newly-discovered shops are international (Ukraine/Poland/India/Argentina/Türkiye) and quiet on X — the strongest NEW accounts actually active on X are Basement Studio and Deserve Studio.",
    "Every X handle here was live-verified in the browser (page resolves to the agency, not 'account doesn't exist'); handles marked null/unverified are genuinely absent — do not re-add guessed ones.",
  ],
  postsSummary:
    "Tracked 24 competitor X accounts (23 with posts) → 118 original posts (reposts filtered); top 12 ranked by engagement. Logged-out scrape skews to all-time best-visible, not strictly last-week — weekly recency needs the twitterapi.io feed.",
  winningPatterns: [
    {
      name: "AI is changing the designer's job",
      whatItIs: "Honest takes on how AI shifts what designers do — design straight to code, faster delivery, designer = builder.",
      whyItWorks: "Hits an anxiety + opportunity every founder and designer feels right now, so people reply and argue.",
      doThis: "Post your real opinion on AI + design and end with a question. Lead the conversation instead of watching it.",
      seenIn: "@AdamFard_",
    },
    {
      name: "Say it in three words",
      whatItIs: "Ultra-short, witty, confident one-liners with no explanation.",
      whyItWorks: "Brevity reads as mastery and is instantly shareable — the reader fills in the rest.",
      doThis: "Drop a punchy one-liner that shows taste (e.g. \"Get more creative.\"). Let the copy itself prove the skill.",
      seenIn: "@Smith_Diction",
    },
    {
      name: "Show the result, not the design",
      whatItIs: "Case studies framed as a business outcome and a repeatable system — not pretty screenshots.",
      whyItWorks: "Founders buy outcomes (\"Fortune 500 in 2 years\"), not pixels.",
      doThis: "Every case study = the client + one hard number/result. Frame the deliverable as a system, not a logo.",
      seenIn: "@Ramotion",
    },
    {
      name: "Ship a free thing, then hype it",
      whatItIs: "Launch a small free tool or resource with a waitlist / teaser.",
      whyItWorks: "Gives people a reason to follow, and earns free reach on the platform you're already on.",
      doThis: "Build a tiny free Framer/Webflow resource and tease it before launch (\"be the first to try it\").",
      seenIn: "@finsweet",
    },
    {
      name: "Ask the room",
      whatItIs: "A simple, recurring call-to-action to your audience (\"share your portfolio\").",
      whyItWorks: "Invites replies → more reach, and surfaces leads right in your comments.",
      doThis: "Run one easy recurring CTA your audience can answer in seconds.",
      seenIn: "@outcrowdstudio",
    },
  ],
  bestPosts: [
    { agency: "Outcrowd", handle: "outcrowdstudio", date: "2024-07-29", url: "https://x.com/outcrowdstudio/status/1817923038903513327", likes: 320, reposts: 21, replies: 166, bookmarks: 132, views: 45779,
      text: `The end of the month means it's time to tell you: Share your portfolio. Share your portfolio. Share your portfolio.`,
      why: `Imperative structure + disarming honesty cut through polished feeds — Bricx could run a monthly "show us what you're building" CTA to spark replies and surface portfolio leads.` },
    { agency: "Smith & Diction", handle: "Smith_Diction", date: "2025-10-30", url: "https://x.com/Smith_Diction/status/1983858602537578736", likes: 181, reposts: 2, replies: 6, bookmarks: 89, views: 26828,
      text: `There goes myyyyyy heroooo`,
      why: `A nostalgic sing-it-out-loud pop lyric ("My Hero," Foo Fighters) turns a launch reveal into a shareable emotional moment — borrow that lived-in cultural-reference voice on launch posts.` },
    { agency: "Smith & Diction", handle: "Smith_Diction", date: "2025-10-09", url: "https://x.com/Smith_Diction/status/1976396319926448486", likes: 73, reposts: 2, replies: 1, bookmarks: 25, views: 9638,
      text: `Get more creative.`,
      why: `A confident, ironic two-word flex from a creative agency — Bricx could let ultra-tight copy itself demonstrate the design skill it sells.` },
    { agency: "Finsweet", handle: "finsweet", date: "2025-10-23", url: "https://x.com/finsweet/status/1981390220567478782", likes: 63, reposts: 9, replies: 3, bookmarks: 6, views: 4872,
      text: `The new Finsweet Extension is almost here! Join the waitlist and be the first to try it.`,
      why: `Punchy launch hype with one clear CTA + scarcity ("be first") — Bricx could use a waitlist teaser to build demand before shipping a tool.` },
    { agency: "Ramotion", handle: "Ramotion", date: "2026-03-12", url: "https://x.com/ramotion/status/2032017809874579800", likes: 48, reposts: 3, replies: 3, bookmarks: 17, views: 3864,
      text: `Turning identity into a system. Brand style guide for @flatfile.`,
      why: `"System" framing turns a logo job into repeatable infrastructure, signaling rigor — Bricx should reframe deliverables as systems for B2B SaaS founders.` },
    { agency: "Ramotion", handle: "Ramotion", date: "2026-03-04", url: "https://x.com/ramotion/status/2029106660992528724", likes: 41, reposts: 1, replies: 5, bookmarks: 13, views: 7292,
      text: `Ramotion partnered with @island_io to launch a new enterprise browser brand — strategy, identity and web aligned to reduce enterprise-sales friction. In two years: browser of choice for Fortune 500.`,
      why: `Pairs a credible client with a concrete status outcome ("Fortune 500") — Bricx should attach a specific, measurable business result to every case study.` },
    { agency: "Finsweet", handle: "finsweet", date: "2025-10-30", url: "https://x.com/finsweet/status/1983944191253389679", likes: 41, reposts: 4, replies: 4, bookmarks: 5, views: 2072,
      text: `The new Finsweet Extension is live — now as a Webflow app. Try it here.`,
      why: `Built-in Webflow distribution + a crisp "live now" hook — Bricx could ship and announce a free Framer/Webflow utility to earn the same in-platform reach.` },
    { agency: "Adam Fard", handle: "AdamFard_", date: "2026-06-01", url: "https://x.com/AdamFard_/status/2061449817352437916", likes: 33, reposts: 0, replies: 19, bookmarks: 1, views: 2334,
      text: `you're a designer, PM, or developer and with AI, you're probably doing all three now — be honest, does that free you up or overwhelm you?`,
      why: `Names the reader's exact identity-blur anxiety then asks a binary question — Bricx should mirror this audience-callout-plus-tension hook for SaaS founders.` },
    { agency: "Finsweet", handle: "finsweet", date: "2025-11-06", url: "https://x.com/finsweet/status/1986463681606263272", likes: 36, reposts: 1, replies: 1, bookmarks: 11, views: 1489,
      text: `How to create pixel-perfect websites in Webflow (Migrate PX to REM + the Fluid Design Generator in the new Finsweet Extension).`,
      why: `Pairs a clear "pixel-perfect" outcome with named time-saving tools — Bricx could tie SaaS-design outcomes to its own proprietary process.` },
    { agency: "Finsweet", handle: "finsweet", date: "2025-11-05", url: "https://x.com/finsweet/status/1986115145660309952", likes: 34, reposts: 3, replies: 2, bookmarks: 5, views: 1349,
      text: `Cool things you can do with Dev Mode in Webflow (via the Finsweet Extension) — from advanced class editing to custom code tools.`,
      why: `Teaches a concrete, time-saving Webflow workflow to peers — Bricx could publish bite-sized how-to tips showcasing its tooling expertise.` },
    { agency: "Ramotion", handle: "Ramotion", date: "2026-02-26", url: "https://x.com/ramotion/status/2026981166302011891", likes: 29, reposts: 2, replies: 4, bookmarks: 3, views: 1532,
      text: `Visual identity isn't aesthetics. It's instant recognition. Our work for @firefox.`,
      why: `A crisp contrarian reframe anchored by a marquee client (Firefox) — Bricx could open posts with a sharp "X isn't Y, it's Z" line.` },
    { agency: "Adam Fard", handle: "AdamFard_", date: "2026-05-27", url: "https://x.com/AdamFard_/status/2059641058116423898", likes: 27, reposts: 5, replies: 3, bookmarks: 0, views: 1278,
      text: `product designers are now also product builders — with the right AI tools you deliver designs straight to code, prototype, and end a client call with a mockup already done. new era.`,
      why: `The "design-to-production" leverage story founders crave — Bricx could position itself as builder, not just decorator.` },
  ],
};

// Founder-readable performance score used to rank posts: total meaningful
// engagement. Ignores raw views (one viral/quote-tweet can skew them).
export function postScore(p: BestPost): number {
  return p.likes + p.reposts + p.replies + p.bookmarks;
}
