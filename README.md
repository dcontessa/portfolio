# Caroline Ang — Project Portfolio

Builder-educator working at the intersection of **AI agents and human judgment** — shipping practical, human-in-the-loop AI systems while teaching organizations and public-sector teams how to adopt them.

A serial hackathon builder: **seven competition entries** across DevLeague 2026, BuildForMsia, NVIDIA Inception, Lovable Vibeathon KL, and a Qwen agent hackathon — several of which became live products.

**Live page:** [`index.html`](index.html) · **GitHub:** [github.com/dcontessa](https://github.com/dcontessa)

---

## A note on scope

This portfolio summarizes roughly 35 selected builds drawn from an active repository set, organized by theme, industry, and use case.

**Client work is described but never named.** Where a build was delivered for an organization, that organization is identified only by sector and scale — never by name — and no source, repository link, screenshot, or live URL is provided for it. Named projects on this page are my own products, open-source releases, or competition entries built under my own name.

Most repositories are private. Public repositories are linked where they exist.

---

## Flagship builds

### C³ OS — AI decision cockpit
Turns scattered context into structured decisions. A user drops in messy project context, selects a cognitive lens, and receives a decision dashboard: recommended strategic move, scenario simulation paths, a confidence score, rationale with an evidence trail, strategic risks, and a decide / delegate / delay / decline triage. Built on the C³ framework.
**Industry:** professional services, executive advisory · **Use case:** decision support, scenario planning
`TypeScript` `React` `LLM orchestration` `decision intelligence`

### FunnelOps Autopilot — inbound sales agent · open source
An autopilot agent for solo operators and boutique agencies drowning in messy leads from DMs, forms, and email. It classifies intent, urgency, budget signal, objections, and missing information; retrieves relevant business memory ranked by importance, confidence, freshness, and relevance within a context budget; then drafts a reply and follow-up plan. Human approval is required before any consequential sales action, and every workflow run is traceable.
**Industry:** SMB sales, agencies · **Use case:** lead qualification, agentic follow-up with HITL gates
`TypeScript` `Node/Express` `Qwen Cloud` `agent memory` `human-in-the-loop`
→ [github.com/dcontessa/funnelops-autopilot](https://github.com/dcontessa/funnelops-autopilot)

### GovernIQ — governance intelligence · DevLeague 2026
Benchmarks 100 Malaysian public-listed companies against a validated seven-construct governance model, explains *why* a company scores as it does, and produces an AI brief and board-ready memo. Evidence-first dashboard design: every score traces back to its source. Team build with Clement Teo and Sapttaruben A/L Krishnan; Lab 3 — Operational Sustainability & ESG.
**Industry:** capital markets, corporate governance, ESG · **Use case:** benchmarking, board reporting
`TypeScript` `React` `governance analytics` `AI briefing`
→ [governiq.drcarolineang.com](https://governiq.drcarolineang.com/)

### ScamSOS MY — emergency response agent · BuildForMsia
A 90-second emergency response agent for people who have just transferred money to a scammer or exposed banking credentials. Deliberately scoped as a *response orchestrator* — not a scam detector, not a bank, not a police-reporting channel — it converts panic into the correct emergency action sequence before more money moves. Safety-first workflow design with a custom civic-signal design system.
**Industry:** financial crime, consumer protection, civic tech · **Use case:** crisis response orchestration
`React 19` `TypeScript` `Vite` `Telegram bot` `design system`
→ [scamsos.malaysiacorp.com](https://scamsos.malaysiacorp.com)

### ProofScope — ESG assurance registry · DevLeague 2026
*Know what was assured. And what was not.* A metric-level ESG assurance and restatement registry for Southeast Asian companies, turning an ESG disclosure into a verifiable passport that records what was actually assured versus merely claimed. Solo submission, Solana Lab.
**Industry:** ESG, audit and assurance · **Use case:** disclosure verification, restatement tracking
`TypeScript` `verification registry` `ESG data`

---

## Hackathons & competition builds

Hackathons are where most of this portfolio's strongest work started. Building against a clock forces the two things that matter most in agent design — brutal scope discipline, and a demo that has to actually run in front of judges. Several of these outlived the weekend and became live products.

| Build | Competition | Track / Lab | What it proved |
|---|---|---|---|
| **GovernIQ** | DevLeague 2026 | Lab 3 — Operational Sustainability & ESG | Evidence-first scoring across 100 listed companies, traceable to source |
| **ProofScope** | DevLeague 2026 | Solana Lab *(solo)* | Metric-level assurance registry — what was assured vs. merely claimed |
| **ScamSOS MY** | BuildForMsia | Civic response | 90-second crisis orchestration, now live with a Telegram bot |
| **FunnelOps Autopilot** | Qwen agent hackathon | Track 4 — Autopilot Agent | Persistent agent memory, retrieval within context budget, HITL approval gates |
| **GrassrootsIQ** | NVIDIA Inception Grand Challenge 2026 | Growth intelligence | Signal → pattern → recommendation → next experiment loop |
| **Clinician Copilot** | Lovable Vibeathon KL 2026 *(AWS Malaysia)* | Healthcare · 1-day team build | Two front doors, one grounded knowledge engine |
| **TraceMint** | Solana Devnet demonstration | Sustainability finance | Approval-to-payment with no raw evidence on-chain |

**The pattern across all seven:** each build names what it *refuses* to do before it names what it does. That constraint is what makes a weekend prototype defensible enough to keep running afterwards.

---

## AI readiness & capability diagnostics

Assessment-led advisory tooling — the instrument layer beneath training and consulting engagements.

### AI Readiness Compass
Dual-track AI readiness assessment for individuals *and* organisations, grounded in the C³ framework. Evaluates AI maturity, generates personalised insight, and returns an actionable development path rather than a bare score.
**Industry:** cross-sector, enterprise L&D · **Use case:** maturity diagnostics, capability roadmapping

### AI Onboarding Accelerator
Production-grade client onboarding assessment: secure Claude API integration, PDF document ingestion, persistent client database, and multi-consultant access control — built so a consulting team, not just one operator, can run it.
**Industry:** professional services · **Use case:** client intake, structured discovery
`Claude API` `document processing` `multi-tenant access control`

### AI Business Navigator
Business assessment and personal readiness diagnostics with AI-generated insight, dashboards, and exportable reports — designed to help founders and consultants turn fragmented business information into structured, assessment-led advice.
**Industry:** SMB advisory, consulting · **Use case:** diagnostic reporting

### Business Transformation Assessment
Structured transformation-readiness instrument used to frame organisational change engagements.
**Industry:** enterprise, public sector · **Use case:** change readiness

### Global Export Readiness
Readiness diagnostic for businesses assessing their capacity to enter export markets.
**Industry:** trade, SME growth · **Use case:** market-entry assessment

---

## Public sector, civic & health AI

Work aimed at government service delivery, citizen engagement, and frontline health — much of it doubling as training material for public-sector cohorts.

### GovTransform Pro
An agile government transformation and value-creation training platform for public-sector leaders. Eight self-paced milestones with progressive unlocking and "when ready" assessments instead of fixed deadlines — scheduling that bends around ministry workload. Includes AI-powered coaching, cross-ministry collaboration, and a framework builder covering KPA, KRA, KPI, OKR, and Balanced Scorecard.
**Industry:** government, public administration · **Use case:** leadership capability building
`OpenAI integration` `learning platform` `strategy frameworks`

### Citizen support workflow agent
An agentic chatbot workflow for public service automation, built on n8n: chat-based citizen engagement, automatic data logging to Sheets, and appointment scheduling through Google integrations. Designed as a reusable pattern for counter automation, citizen service portals, kiosk assistants, and community engagement.
**Industry:** government services · **Use case:** citizen intake, booking automation
`n8n` `Google Workspace` `agentic workflow`

### Government service chatbot prototypes
A set of conversational assistants prototyped for public service enquiry handling, exploring how citizens navigate government information without knowing which department owns their question. Delivered for public-sector stakeholders — organisations not named.
**Industry:** government · **Use case:** enquiry deflection, service navigation

### Clinician Copilot — hackathon build
Healthcare triage built in a one-day team hackathon: patients reach a WhatsApp intake bot while clinicians work a shared web dashboard, both powered by the same FAQ knowledge engine grounded in MedlinePlus, PubMed, RxNorm, and openFDA.
**Industry:** healthcare · **Use case:** patient triage, clinician decision support
`TypeScript` `Supabase` `WhatsApp` `medical knowledge APIs` `RAG`

### Zero-Cost AI Voicebot · open source
A voice-enabled assistant built entirely on free-tier tooling, created as a teaching artifact for public-sector and education cohorts — proof that useful voice AI can be assembled with zero budget.
**Industry:** education, public sector training · **Use case:** training artifact, voice interface demo
→ [github.com/dcontessa/zero-cost-voicebot](https://github.com/dcontessa/zero-cost-voicebot)

---

## Agentic systems & revenue operations

Systems that watch a market, qualify demand, and move a pipeline — with a human in the loop at every consequential step.

### Competitive Intelligence Engine
Real-time competitive surveillance across social media, product platforms, and news, watching for product launches, pricing changes, and messaging shifts — then surfacing what actually changed rather than a raw feed.
**Industry:** SaaS, consumer brands · **Use case:** market monitoring, positioning defence

### Authority Engine
A content and positioning system for building professional authority — translating expertise into consistent, platform-appropriate publishing. Iterated across several build environments.
**Industry:** professional services, creator economy · **Use case:** thought-leadership operations

### GrassrootsIQ — NVIDIA Inception Grand Challenge 2026
Omnichannel growth intelligence for grassroots operators: ingests creative assets across channels, scores their signals, surfaces patterns, and recommends the next controlled experiment — a disciplined *signal → pattern → recommendation → next experiment* loop. In development; implementation detail reserved.
**Industry:** growth marketing · **Use case:** creative testing, experiment design

### LeadFlow
Lead capture, routing, and qualification tooling for small sales teams.
**Industry:** SMB sales · **Use case:** pipeline operations

### EV commercial vehicle sales funnel
End-to-end funnel for electric commercial vehicle sales: diagnostic assessment, financial projections, email and SMS automation, calendar booking, and an analytics dashboard, with real-time lead scoring.
**Industry:** automotive, fleet electrification · **Use case:** complex-consideration B2B sales

### SME exit readiness & succession planning
A prototype suite for business-owner succession: an exit-readiness scan and structured succession flows aimed at owner-operators approaching transition.
**Industry:** SME advisory, corporate finance · **Use case:** exit planning, succession diagnostics

---

## Trust, governance & verification

Builds concerned with what can be proven rather than what is asserted.

### TraceMint — evidence receipts on Solana Devnet
An evidence-receipt and approval-to-payment demonstration for local sustainability actions. Deliberately conservative in design: no raw evidence is stored on-chain and no token is issued. A working demonstration of verifiable approval flows, not a currency experiment.
**Industry:** sustainability, public finance · **Use case:** verifiable claims, approval-to-disbursement
`Solana Devnet` `TypeScript` `wallet integration`

### Blockchain standards institutional platform
A multi-page institutional web platform covering policy, standards, programmes, membership, insights, and news for a global standards body advancing responsible blockchain adoption. Organisation not named.
**Industry:** standards bodies, blockchain policy · **Use case:** institutional web presence, membership

### C³ Transcribe
Audio and video transcription built on Whisper, with transcription history management and multi-format export — a working tool for professionals handling interview and session media at volume.
**Industry:** research, professional services · **Use case:** media transcription, research workflow
`OpenAI Whisper API`

---

## Decision dashboards & operational intelligence

Client engagements delivered as decision surfaces. **All entries in this section are anonymised** — no client names, repository links, live URLs, or screenshots. Described here only to show the capability and the class of problem.

### Creative-industry talent intelligence dashboard
Multi-tab analytical dashboard mapping creative-industry talent opportunity across a national market, with an AI strategic advisor grounded in a curated intelligence pack so recommendations cite the underlying evidence rather than improvising.
**Industry:** creative industries, economic development · **Use case:** workforce strategy, policy analysis

### Proptech business-model dashboard
Interactive dashboard visualising a property technology platform's business model, market position, technology architecture, competitive landscape, partnerships, and expansion potential across eight strategic vectors.
**Industry:** proptech · **Use case:** investor and board communication, strategic review

### Operations command dashboard
Operational reporting surface consolidating delivery and performance metrics for a services business.
**Industry:** professional services · **Use case:** operational oversight

### Financial workbenches platform
Modular financial modelling delivered two ways: a multi-tenant SaaS platform and a companion mobile micro-SaaS. Covers DCF valuation, portfolio analytics, risk analysis, cash flow forecasting, and comparable company analysis, with template-driven three-statement and scenario modelling and flexible manual or CSV data input.
**Industry:** finance, corporate advisory · **Use case:** valuation, scenario modelling

### Security operations & cyber-intelligence dashboard
Security operations surface spanning vulnerability assessment, transport security diagnostics, threat detection, and educational intelligence workflows.
**Industry:** cybersecurity · **Use case:** vulnerability triage, security training

### Financial operations workspace
A redesigned finance workspace demonstrating invoice capture, AI-assisted review, controlled journal posting, live reporting, and audit evidence capture — with a guided demo journey through the full cycle.
**Industry:** finance operations, accounting · **Use case:** AP automation with audit trail

### Awards judging & multi-stage scoring platform
A judge portal and multi-stage scoring system for a regional technology awards programme: submission review, structured scoring across rounds, and judge workflow management.
**Industry:** events, awards programmes · **Use case:** structured evaluation at scale

---

## Teaching artifacts & rapid MVPs

Scoped tight, finished properly, and used to show a cohort how a working product actually gets shipped. Most were built as classroom material; the final entry was freelance client delivery and is anonymised accordingly.

### EventPulse Tracker
Class-demo dashboard tracking AI exhibitions, film and television summits, and esports competitions: responsive browsing, filtering, detail views, live status indicators, and saved items.
**Teaching point:** data-driven UI, state management

### GlowMatch
Beauty discovery and shopping MVP with personalised product matching, browsing, product detail, and cart interactions.
**Teaching point:** recommendation UX, commerce flows

### Lumen Market
Mobile-first shopping prototype for a clean skincare brand, built to demonstrate clear navigation and a low-friction browsing-to-checkout journey.
**Teaching point:** mobile-first conversion design

### Street Bite
Food truck ordering MVP with menu browsing, cart actions, live kitchen order tracking, and local weather — a student build demonstration.
**Teaching point:** real-time order state, third-party APIs

### Toy Collector
Premium collectible storefront for anime and mini figures with responsive browsing, product detail, cart, and checkout preview.
**Teaching point:** premium visual design, checkout UX

### Graduate business curriculum flipbooks · *client engagement, anonymised*
Interactive digital flipbooks packaging MBA coursework into browsable, web-native learning material. Delivered on a freelance basis for an education provider.
**Industry:** higher education · **Use case:** curriculum as product

---

## Additional work

Further builds, prototypes, and explorations across the portfolio.

| Project | Industry | Use case |
|---|---|---|
| Sports recovery education site | Sports science, wellness | Non-diagnostic recovery guidance, consent-gated trial funnel |
| Sport Performance OS | Sports science | Athlete performance tracking |
| Weekly content planning dashboard | Marketing, education | Multi-platform content generation *(client — anonymised)* |
| Infographic generator | Marketing | Automated visual asset production |
| SVG generator | Design tooling | Programmatic graphics with effect options |
| YouTube Insight Pro | Creator economy | Video performance analysis |
| Resume Rocket | Careers, HR | Résumé generation and optimisation |
| PhD thesis writer | Academia | Long-form research writing support |
| TherapyFlow | Mental health | Practice workflow prototype |
| Wellnest Balance Beacon | Wellness | Wellbeing tracking prototype |
| Corporate services websites | Corporate services | Marketing site iterations *(client — anonymised)* |
| Training academy platform | Education | Courses, trainer profiles, readiness surveys, admin dashboard *(client — anonymised)* |
| Wellness brand site | Health and wellness | Brand and acquisition site *(client — anonymised)* |
| Capital Sense | Financial services | Funding access prototype |
| Finance Explorers | Financial literacy, education | Learning prototype |
| Smart Trading Solutions | Trading, fintech | Trading tooling prototype |
| Marketing SaaS | Marketing technology | Multi-tenant marketing platform |
| Data Harvest | Data operations | Collection and structuring pipeline |
| PRaivacy | Privacy, communications | Early-stage prototype |
| SoulSync · Soul Tarot | Consumer wellness | Consumer engagement prototypes |
| Personal site | — | Professional web presence |

Additionally, the public GitHub account carries an active **research trail** of forked work across the agent ecosystem — orchestration frameworks, subagent libraries, MCP servers, voice AI, inference engines, and spec-driven development toolkits. These are study repositories, not authored work.

---

## What connects the work

- **Trustworthy agents.** Every agent build includes human approval gates, traceable runs, and graceful degradation — AI accountable enough to sit inside a real business decision.
- **Scope discipline.** The strongest builds are defined as much by what they refuse to do as what they do: a scam-response orchestrator that is explicitly not a detector; a sports recovery site that is deliberately non-diagnostic; an evidence registry that stores no raw evidence on-chain. Knowing where a system's authority ends is a design decision, not an omission.
- **Evidence over assertion.** Recurring pattern across governance, ESG, and advisory work — scores trace to sources, recommendations cite their grounding, and claims carry their provenance.
- **Ship under pressure.** Seven competition builds in roughly eighteen months. Hackathons are the fastest honest feedback loop available — a judge either understands the demo in ninety seconds or the idea needs rework, and no amount of documentation rescues a build that does not run.
- **Build and teach.** The same systems ship as products and get packaged as training for organizations, governments, and education cohorts. The teaching artifacts are not lesser work; they are the method made visible.

---

Caroline Ang · builder & educator · [github.com/dcontessa](https://github.com/dcontessa)
