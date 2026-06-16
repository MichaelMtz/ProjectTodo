# AI Chat — Executive Plan

This plan covers what we're building, how long it takes, what it costs, and what could trip us up. It's a 10-minute read for non-engineers. The full technical companion is `concepts/deployment-plan.md`.

**In plain English: what we're building.** A snow-and-resort chatbot embedded on snocountry.com that answers questions about ski conditions, resort recommendations, and recent news — like a ChatGPT that only knows skiing and pulls from our live data.

You'll see two AI techniques referenced throughout. Both have plain-English meanings:

- **RAG (Retrieval-Augmented Generation)** — at question time, we inject the latest snow conditions and the most relevant articles into the AI's context, so its answers are current. This is how the bot answers *"how's Vail today?"* with real numbers instead of guessing.
- **Fine-tuning** — we teach a base AI model SnoCountry's tone of voice using a small, swappable add-on called a **LoRA** (think: a expert snow reporter plug-in for the AI vs non-local giving snow condition advice). Cheap, fast, reversible.
- **turn** - In chatbot land, a **turn** = one user message + one AI response. That's the atomic unit of a conversation. A typical session is 2–4 turns.

Total wall-clock from kickoff to public launch: **~22 weeks**. Total v1 budget: **~$1,650 cloud + ~18 dev-weeks of labor**.

---

## 1. Executive summary

(From full plan §1.)

| Phase | Weeks | Headcount | Goal | Cost ceiling |
|---|---|---|---|---|
| **POC (proof of concept)** | 1–6 | 1 dev + 1 LLM designer + ¼ PM | Prove the bot can answer well, fast, and cheap on real SnoCountry data. Test fine-tuning. Test portability across providers. End with a pivot third party (api) vs dedicated system decision. | ~$700 |
| **Production build** | 7–18 | 1 dev + 1 LLM designer + ¼ PM | Full bot: chat panel, complete fine tuning, safety guardrails, RAG tuning, partner integrations, "smart cards" for resorts/articles/sponsors  | $750 + ~$50 |
| **Stress test + infra decision** | 16–18 (overlaps) | 1 dev | Load-test the bot; decide if we stay on pay-per-use AI service (Together AI) or move to dedicated GPU hardware | $200 |
| **Soft launch** | 19–20 | full team + on-call | Quietly ship to one resort page first, then expand; watch closely | actuals |
| **Iterate / scale** | 21+ | 1 dev sustaining | Improve the bot from real conversations; expand to more pages | model-driven |

**Four key gates**:

1. **End of Week 3** — Stock-model + RAG quality check. Fine tuning of model to SnoCountry data.
2. **End of Week 6** — POC knowledge: ship to production, pivot model/provider.
3. **End of Week 17** — Pay-per-use AI service vs. dedicated hardware decision, based on real traffic data.
4. **End of Week 20** — Public launch decision based on soft-launch metrics.

---

## 2. POC objectives

(From full plan §2.1.)

The POC answers four binary questions in 6 weeks:

| # | Question | Pass condition (in plain English) |
|---|---|---|
| Q1 | Does an off-the-shelf AI + light RAG produce acceptable answers for SnoCountry's use cases? | At least 80% (16/20) of test questions land at "good" or better when reviewed by hand. |
| Q2 | Does fine-tuning meaningfully improve answers, tone, or cost? | Either +5 percentage points of quality, **or** ≥30% cost cut by switching to a smaller model. |
| Q3 | Is the fine-tuned model **portable** between providers? (Avoid lock-in to Together AI.) | Same questions get comparable answers when our model runs on RunPod (a competitor) — within ±5%. |
| Q4 | Is the cost-per-conversation acceptable? | Under **$0.01 per turn** at our projected v1 traffic. |


---

## 3. POC budget

(From full plan §2.4.)

| Item | Cost |
|---|---|
| Together AI tokens (testing, exploration) | ~$120 |
| One LoRA fine-tune (the personality plug-in) | ~$16 |
| Together AI dedicated endpoint trial | ~$100 |
| RunPod H100 GPU rental (5 days, portability test) | ~$300 |
| HuggingFace private model storage (free tier covers LoRA adapters) | $0 |
| Embedding the article + resort corpus (preparing content for AI search) | ~$120 |
| **Total** | **~$656** |

We round to **$700** as the ceiling. Keep tabs on budget, to determine if need provider change.

---

## 4. Production build — week-by-week

(From full plan §3.)

Three sub-phases, ~12 weeks total.

### 4.1 Phase A — Foundation hardening (Weeks 7–10)

Build the engine end-to-end at production quality. No public exposure yet.

| Week | What ships |
|---|---|
| 7 | Database tables for tracking conversations; live RAG endpoint snow-data endpoint optimization;  (per-resort context) |
| 8 | Region-context, recommendation, and search articles, resort blurbs (vector semantic search) endpoints |
| 9 | The main chat brain: routes the question, enforces token (word) budgets, streams answers, runs all five **guardrail layers** (safety filters that keep the bot on-topic and prevent abuse) |
| 10 | Tracking endpoint, automatic indexing of articles + resort overviews, expand corpus to top 50 resorts |

**Gate at end of Week 10:** every endpoint behaves to spec; jailbreak test suite passes 100% on critical-severity attacks.

### 4.2 Phase B — Chat UI + smart cards (Weeks 11–14)

This is where the user sees the product. The chat panel is straightforward; the **smart cards** (entity highlighting) is the differentiating feature.

When the bot mentions Copper Mountain, a resort card appears next to the chat with current conditions, lift status, an upcoming event, a relevant article, and a sponsor card — all sourced from existing SnoCountry endpoints. Like clicking a hyperlink that becomes a dashboard.

| Week | What ships |
|---|---|
| 11 | Chat widget skeleton; first end-to-end "answer streams to the screen"; Pick smart-card strategy (the AI emits structured data vs. we post-process its text)  |
| 12 | Resort card + article card; live data hydration |
| 13 | Sponsor card (reuses existing `/api/ads`); event card (curated content for v1) |
| 14 | Polish: keyboard accessibility, screen-reader labels, mobile bottom-sheet UX; deploy to one canary page (e.g. `/snow-report/colorado/copper-mountain/`) |

### 4.3 Phase C — Stress test + hardware decision (Weeks 16–18)

Run in parallel with the last two weeks of Phase B.

| Week | What ships |
|---|---|
| 16 | Stress-test scripts (k6, a load-testing tool) — ramp, peak burst, steady-state, single-resort flood |
| 17 | Run all four scenarios on Together AI; **and** run them against a RunPod (dedicated hardware) deployment with our fine-tuned model loaded |
| 18 | Decision: stay pay-per-use (default for v1) or move to dedicated hardware. Document instant kill-switch and rehearse rollback. |

**Default decision:** stay on the pay-per-use API for v1; revisit 90 days post-launch with real traffic. Dedicated hardware only wins above ~250k turns/month sustained.

### 4.4 Phase D — Soft launch (Weeks 19–20)

Soft launch is **not** a feature freeze. It's a controlled traffic ramp.

| When | Action |
|---|---|
| Week 19, day 1 | Live on 1 canary page (`/snow-report/colorado/copper-mountain/`). Internal team only. Slack alerts on every error. |
| Week 19, day 2–3 | Open to 10% of organic traffic via cookie flag. Monitor cost, latency, blocked-question rate. |
| Week 19, day 4–5 | If healthy, open to 100% of canary page. |
| Week 20 | Add 2 more canary pages (different traffic profiles). |
| End of Week 20 | Public launch decision. |

**Rollback:** a feature flag (`window.__SNO_CHAT_ENABLED`) lets ops disable the chat instantly without a deploy. Tested in Week 18.

---

## 5. Cost model (post-POC)

(From full plan §9. Assumes pay-per-use API path. Numbers are conservative.)

### 5.1 Year-1 monthly run rate

| Component | Low (5k turns/mo) | Mid (50k turns/mo) | High (250k turns/mo) |
|---|---|---|---|
| Together AI inference (the AI doing the work) | $15 | $150 | $750 |
| Together AI embeddings (refreshing what the AI can search through) | $1 | $5 | $20 |
| Convex usage (database + backend) | $0 | $25 | $100 |
| Continual fine-tuning (monthly polish) | $0–$50 | $50 | $50 |
| Engineering sustaining (½ FTE) | included | included | included |
| **Monthly total (cloud only)** | **~$20** | **~$230** | **~$920** |

At 250k turns/month sustained, dedicated hardware breaks even with the API. We re-test then.

### 5.1.1 What these traffic tiers mean in users

The cost table is denominated in *turns* (one user question + one bot answer). Translating that to actual headcount needs a couple of behavior assumptions:

- **Avg turns per session: ~3** (many *"how's Vail today?"* one-shots, balanced by 4–8-turn trip-planning sessions).
- **Avg sessions per user per month: ~2** (casual planners do 1; regulars do 4–8).
- **→ ~6 turns per user per month** (3 × 2).
- **Chat opt-in rate: ~10%** of total site visitors actually open the chat (the other 90% just browse). Industry-typical for embedded chatbots on content sites.
- **Peak-season skew: ~2×** the monthly average during Dec–Mar.

#### Central estimate

| Metric | Low (5k turns/mo) | Mid (50k turns/mo) | High (250k turns/mo) |
|---|---|---|---|
| **Chat users per month (MAU)** | **~830** | **~8,300** | **~42,000** |
| Chat users per day (avg) | ~28 | ~280 | ~1,400 |
| Chat users per day (peak ski season) | ~55 | ~550 | ~2,800 |
| **Implied total site MAU** (chat ≈ 10% of visitors) | ~8,300 | ~83,000 | ~420,000 |
| Sessions per month | ~1,700 | ~17,000 | ~83,000 |

#### Sensitivity — engagement is the biggest unknown

The numbers above assume 6 turns/user/month. If real engagement differs:

| Engagement profile | Turns/user/mo | Low MAU | Mid MAU | High MAU |
|---|---|---|---|---|
| **Mostly drive-by checkers** (1-turn sessions) | 3 | 1,700 | 17,000 | 83,000 |
| **Central estimate** *(used above)* | 6 | **830** | **8,300** | **42,000** |
| **Engaged trip-planners + power users** | 10 | 500 | 5,000 | 25,000 |

Real MAU at 50k turns/mo is somewhere between **5,000 and 17,000**, central guess **~8,300**. Tighten after the first month of soft-launch data lands.

#### Plain-English read

| Scenario | What this looks like in real life |
|---|---|
| **Low** (~800 chat MAU) | Beta / launch month. A few hundred curious visitors per week. Easy to read every conversation manually. |
| **Mid** (~8k chat MAU) | Established niche product. Real product feedback signal; daily monitoring becomes a job. |
| **High** (~42k chat MAU) | Mainstream feature. Sampling-based review only; full LLM ops discipline (alerting, on-call, cost controls) is mandatory. |

### 5.2 One-time costs

- **POC:** ~$700 (Section 3)
- **Production build labor:** ~18 dev-weeks at internal rate
- **Initial corpus build** (50 resort overviews): ~80 hours of content authoring
- **Legal review** (Terms of Service / privacy update): ~$250 outside counsel or in-house equivalent
- **Brand / UX design pass:** ~2 designer-weeks

---

## 6. Things you might be missing — one-liners

(From full plan §7. Each item is one easy-to-forget thing that bites later.)

1. **Embeddable widget for partners** — Resort partners may want this on their own sites — plan a partner widget for v1.x with a `partnerId` parameter for tracking and ad attribution.
2. **Legal / compliance** — Update Terms of Service and privacy policy; build a "forget my chat data" endpoint for EU/CA users (GDPR/CCPA); verify resort-data and news-article licenses allow AI use.
3. **Brand & content review** — Have the content lead manually review 100 chat responses before launch; explicitly ban medical, avalanche-safety, and gambling questions; workshop the canned refusal copy (it'll be seen thousands of times).
4. **Accessibility (a11y — screen readers, keyboard users)** — Keyboard navigation through the chat and cards; screen-reader labels on streamed text; verify color contrast; respect reduced-motion preferences.
5. **SEO (Google ranking)** — Make sure chat conversations don't end up in Google's index; add Schema.org markup if you display an FAQ block; sitemap stays unchanged.
6. **Internal tooling** — Build a "chat replay" admin tool (given a request ID, show the full prompt, sources, response, metrics) — half a day, indispensable for debugging user reports; also a corpus-health dashboard.
7. **Partner / content relationships** — Notify the top 30 resort partners before launch; mark sponsor cards clearly as "Sponsored"; plan a soft-launch press post that frames the bot as an *assistant*, not an *oracle*.
8. **Observability** — Wire Sentry (an error-tracking service) for chat-widget JS errors; detect and fall back when streaming connections fail; tag every conversation with which page launched it.
9. **Personalization (defer, but design for it)** — Browser geolocation enables *"you're in Denver — try A-Basin"*; integrate the existing bookmarks feature into chat suggestions; plan server-side chat history once user accounts ship.
10. **Multi-language** — English-only for v1, but Spanish/French is plausible for v1.5 with mostly system-prompt work.
11. **Mobile UX** — Bottom-sheet pattern instead of side panel; voice input via the browser's speech API (a big UX win, low effort); tap-to-fold cards so they don't dominate the screen.
12. **Disaster recovery** — Convex snapshots → weekly export to S3/R2 (cloud storage); resort-overview source files live in git; fine-tune adapters mirrored to two providers.
13. **Internal LLM gateway (post-v1)** — Once 2+ surfaces use AI (e.g., chat + an editor "summarize this resort" tool), centralize through a single AI-provider module with rate limits, retries, and per-surface cost ceilings — about a dev-week of work.

---

*Companion documents:*

- `concepts/deployment-plan.md` — full technical plan.
- `concepts/rag-plan.md` — architecture and API specs.
- `concepts/rag-jailbreak-tests.md` — adversarial test suite.

*Document version: v1 — drafted 2026-05-08*
