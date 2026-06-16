# AI Chat for SnoCountry — One-Page Proposal

A snow-and-resort chatbot embedded on snocountry.com. Like Claude/ChatGPT, but it only knows skiing — and pulls answers from our live snow reports, articles, and resort data. Think *"Ask SnoCountry anything"* on every resort and snow-report page.

> **Recommendation:** 6-week proof of concept starting **Mon, May 18, 2026**. Production development **June 29th**.  Soft launch on canary pages **Sep 21**. Public launch **Mon, Oct 5, 2026**.

---

## Timeline (kickoff Mon, May 18, 2026)

| Phase | Dates | Wks | Headcount | What happens |
|---|---|---|---|---|
| **POC (proof of concept)** | May 18 – Jun 26 | 1–6 | 1 dev + 1 LLM designer + ¼ PM | Prove the bot can answer well, fast, and cheap on real SnoCountry data. Test fine-tuning. Test portability across providers. End with a pivot third party (api) vs dedicated system decision. |
| **Production build** | Jun 29 – Sep 18 | 7–18 | 1 dev + 1 LLM designer + ¼ PM | Build the production engine end-to-end: chat panel, "smart cards" for resorts/articles/sponsors, five-layer safety guardrails, monitoring, partner integrations. |
| **Stress + infra decision** | Aug 31 – Sep 18 | 16–18 | 1 LLM designer *(overlaps build team)* | Load-test under programmable 200-user bursts. Confirm caps. Decide pay-per-use AI service vs dedicated GPU. Default: stay pay-per-use. |
| **Soft launch** | Sep 21 – Oct 2 | 19–20 | full team + on-call rotation | Quietly ship to one resort page, internal live testing, ramp 10% → 100% of canary traffic, expand to 3 pages, watch every conversation. |
| **Public launch** | **Mon, Oct 5, 2026** | 21+ | 1 dev sustaining (½ FTE) | Roll out site-wide. Continual learning + monthly fine-tuning kick in. |

**Four milestones**:

1. **Fri, Jun 5** *(end of Week 3)* — early quality check on the stock model. Fine-tuning calibration path.
2. **Fri, Jun 26** *(end of Week 6)* — POC knowledge: ship to production, pivot model/provider.
3. **Fri, Sep 11** *(end of Week 17)* — pay-per-use vs dedicated GPU decision based on load test traffic data.
4. **Fri, Oct 5** *(end of Week 20)* — public launch decision based on soft-launch metrics.

---

## Cost

| Bucket | Amount | Notes |
|---|---|---|
| **POC cloud spend** (Weeks 1–6) | ~$700 | Together AI tokens, fine-tuning, RunPod portability test |
| **Production build cloud** (Weeks 7–18) | ~$800 | Together AI inference + embeddings + ~$50 fine-tunes |
| **Year-1 monthly run rate** (cloud) | $20–$920/mo | Scales with traffic: ~$20 at 5k turns/mo (~800 chat users), ~$920 at 250k turns/mo (~42k chat users) |
| **Legal review** (one-time) | ~$250 | ToS + privacy update |
| **Initial content corpus** (one-time) | ~ xx hours | 50 hand-authored resort overviews |
| **Engineering** | ~18 dev-weeks | 1 dev + 1 LLM designer for POC + production; ½ FTE sustaining post-launch |

**Total v1 launch budget: ~$1,500 cloud + ~$250 legal + ~18 dev-weeks of labor.**

---

## What we get at launch (outcomes)

- **A first-of-its-kind feature for SnoCountry** — the first AI chat on the site, embedded on resort and snow-report pages. Visible product win, story for press and partners.
- **Competitive parity** — With existing OnTheSnow and Perplexity-style "answer engines" and potential (SkiCentral, OpenSnow) addition of AI features in the next 12 months. We are first or fast-second, not last.
- **An elegant, hardened experience** — not a ChatGPT bolt-on. On-brand tone, five-layer safety guardrails, jailbreak test suite, refusal copy reviewed by content lead, sponsor disclosure built in.
- **Smart cards alongside answers** — ask about Copper Mountain, get the chat answer *plus* a live conditions card, lift status, an upcoming event, a relevant article, and a sponsor card — all from existing SnoCountry endpoints.
- **Operational maturity from day one** — monitoring dashboards, on-call runbook, cost alerts, instant kill-switch (feature flag), vendor-failover plan. Built *before* a crisis, not after.
- **A reusable backbone** — the RAG corpus + chat orchestrator becomes the foundation for every future AI feature, internal or external. One investment, many surfaces.

---

## What it enables next (benefits)

- **Deeper user engagement** — Q&A invites longer sessions, more page views, more entity-card clicks (each click is a measurable revenue surface).
- **Embeddable partner widget** *(planned v1.5)* — ship the chat as a `<script>` snippet that radio stations, resort partners, and ski shops drop onto their own sites. Each carries a `partnerId` for traffic attribution and ad-revenue share. **Partner sites become SnoCountry traffic sources.**
- **Internal knowledge tooling** — the same RAG infrastructure powers editor productivity tools: *"summarize this resort,"* *"draft a snow report,"* *"what did we say about A-Basin last March?"*. Wins for the content team beyond the public chatbot.
- **New sponsor / ad inventory** — sponsor cards in the entity panel are a fresh ad surface. Existing `/api/track/ad-impression` and `/api/track/ad-click` endpoints already separate chat-driven from organic, so attribution is built in.
- **First-party data signal** — every conversation tells us what users actually want to know. Gaps in current content surface immediately. Informs the editorial roadmap and SEO priorities.
- **Trip-planning conversion** — bot can recommend resorts and link to current conditions, articles, and events — driving deeper engagement with paid partners and Epic / Ikon / Indy pass affiliations.
- **Brand authority** — positions SnoCountry as the trusted, AI-augmented authority on North American skiing. Press-friendly launch story.
- **Multi-language path** *(v1.5)* — English v1; Spanish + French planned. Opens Latin America and Quebec markets with mostly system-prompt work, no model retraining.

---

## Decision needed by Mon, May 11, 2026

To start kickoff on May 18, we need:

- **Approval to staff** — 1 dev (full-time, Weeks 1–18), 1 LLM designer (Weeks 1–18), and ¼ PM oversight throughout.
- **Budget approval** — ~$1,500 cloud spend + ~$250 legal review.
- **Nomination of a content lead** — to author the 50 resort overviews (Weeks 1–10) and review chat tone before launch.

If approval slips past May 11, kickoff slides one week per week of delay; public launch slides accordingly.

---

*Companion documents (deeper detail):*

- `ai-chat-executive-plan.md` — 10-minute exec digest with phase tables, sensitivity analysis, and the 13 easy-to-forget items.
- `deployment-plan.md` — full 11-section technical plan.
- `rag-plan.md` — architecture and API specs.
- `rag-jailbreak-tests.md` — adversarial test suite.

*Document version: v1 — drafted 2026-05-08*
