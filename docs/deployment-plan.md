# SnoCountry AI Assistant — Deployment Plan

End-to-end plan from proof-of-concept through production launch and ongoing iteration. Pairs with `concepts/rag-plan.md` (architecture) and `concepts/rag-jailbreak-tests.md` (safety suite).

This plan covers:

- A **6-week proof of concept** on Together AI (with and without fine-tuning, limited RAG, portability testing).
- A **10–12-week production build** with full RAG, guardrails, chat UI, entity-highlighting integration (resort cards, articles, sponsors), stress testing, and the API-vs-dedicated-hardware decision.
- **Ongoing operations** — continual fine-tuning, monitoring, rollback, content review.
- **Items easy to forget** — legal, partner relationships, accessibility, SEO, vendor risk, etc. Section 11.

Total wall-clock: ~22 weeks from kickoff to public launch on canary pages, then iterate.

---

## 1. Executive summary

| Phase | Wall-clock | Headcount | Goal | Cost ceiling |
|---|---|---|---|---|
| **POC** | Weeks 1–6 | 1 dev + 1 designer + ¼ PM | Validate quality, latency, cost, portability with real SnoCountry data | $500 cloud + 1 fine-tune |
| **Production build** | Weeks 7–18 | 1 dev + 1 designer/FE + ¼ PM | Full RAG, guardrails, chat UI, entity highlighting, partner integrations | $800 cloud + ~$50 in fine-tunes |
| **Stress + infra decision** | Weeks 16–18 (overlaps prod) | 1 dev | Load test API; if costs justify, validate dedicated-hardware path | $200 (RunPod 1-week test) |
| **Soft launch** | Weeks 19–20 | full team + on-call rotation | Canary on home page and 1–3 resort pages | observed |
| **Iterate / scale** | Weeks 21+ | 1 dev sustaining | Continual learning, expand pages, partner widgets | model-driven |

**Key gates** (don't skip these):

1. **End of Week 3** — Stock-model RAG-only quality check. If 16/20 eval questions land at "good" or above, skip fine-tuning entirely for v1.
2. **End of Week 6** — POC verdict: ship to production build, pivot model/provider, or shelve.
3. **End of Week 17** — API-vs-dedicated hardware decision based on real traffic data.
4. **End of Week 20** — Public launch decision based on soft-launch metrics.

---

## 2. Phase 0 — POC (6 weeks, Together AI)

### 2.1 Objectives

The POC answers four binary questions:

| # | Question | Pass condition |
|---|---|---|
| Q1 | Does a stock 70B model + light RAG produce acceptable answers for SnoCountry's use cases? | ≥ 80% rated "good" on 20-question eval set |
| Q2 | Does fine-tuning meaningfully improve quality, tone, or cost? | ≥ 5 percentage-point quality bump OR ≥ 30% cost reduction by enabling 8B model swap |
| Q3 | Is the fine-tuned LoRA portable from Together AI to RunPod? | Same prompts produce comparable outputs on RunPod within ±5% quality |
| Q4 | Is the cost-per-conversation acceptable? | < $0.01/turn at projected v1 traffic |

If Q1 passes, Q2 may not be necessary at all. The POC explicitly tests this — fine-tuning is *not* assumed.

### 2.2 Scope deliberately limited

**In POC:**
- Stock + fine-tuned Llama on Together AI
- ~5 hand-authored resort overviews (Big Sky, Vail, A-Basin, Park City, Mammoth)
- Last 60 days of news articles in vector index
- Live data only via existing `/api/resort-data` (state/region not required yet)
- Minimal CLI + Postman-style chat client (no production UI)
- Single-layer guardrail (system prompt only)
- Tracking to a JSON log file (no Convex table yet)

**NOT in POC:**
- Production chat widget
- Entity highlighting UI
- Full guardrails suite
- Continual learning pipeline
- Rate limiting or abuse defense
- Partner integrations
- Stress test / load test
- Marketing rollout

**Reason for tight scope:** to answer Q1–Q4 cheaply. Most of the production work is not contingent on POC outcomes.

### 2.3 Week-by-week

#### Week 1 — Foundation & corpus

| Day | Task | Deliverable |
|---|---|---|
| 1–2 | Together AI account, `TOGETHER_API_KEY` in env, Convex dev deployment ready | Working `curl` against `/v1/chat/completions` |
| 3 | Author 5 resort-overview markdown files (~250 words each) | `data/resort-overviews/308001-big-sky.md` etc. |
| 4 | Build `scripts/rag/index-articles.js` against last 60 days of articles | ~150 chunks indexed |
| 5 | Build `scripts/rag/index-resorts.js` against the 5 overviews | ~10 chunks indexed |

#### Week 2 — Stock-model RAG baseline

| Day | Task | Deliverable |
|---|---|---|
| 1–2 | Build minimal `chat.js` CLI: question → retrieve → live data fetch → Together AI → print | Local CLI |
| 3 | Hard-code system prompt (loose, not yet hardened) | Repo |
| 4 | Author 20-question eval set covering U1–U4 use cases | `concepts/eval/poc-eval.json` |
| 5 | Run eval set against stock Llama-3.3-70B-Turbo; record latency, cost, manual quality score | First metrics row |

#### Week 3 — Iterate on retrieval & prompt

| Day | Task | Deliverable |
|---|---|---|
| 1–2 | Tune retrieval (top-K, filtering, chunk size); re-run eval | Improvement curve |
| 3 | Try Llama-3.1-8B-Turbo for cost comparison | Side-by-side metrics |
| 4 | Add basic guardrail (canonical system prompt v1) | Updated eval |
| 5 | **Decision gate**: if 70B + RAG ≥ 80% "good", skip fine-tuning. Otherwise proceed. | Memo to PM |

#### Week 4 — Fine-tuning experiment

| Day | Task | Deliverable |
|---|---|---|
| 1 | Generate ~1500 synthetic training examples using Claude/GPT against POC corpus | `data/training/poc-v1.jsonl` |
| 2 | Manual review of 150 samples; remove low-quality ones | Cleaned JSONL |
| 3 | Together AI fine-tune (`--lora-r 16 --weight-decay 0.01 --n-epochs 3`) on Llama-3.1-8B | Adapter ID |
| 4 | Re-run eval set against fine-tuned 8B | Comparison table |
| 5 | Compare: stock 70B vs fine-tuned 8B vs stock 8B | Decision artifact |

#### Week 5 — Portability test

| Day | Task | Deliverable |
|---|---|---|
| 1 | Download LoRA adapter from Together AI; push to private HuggingFace repo | HF URL |
| 2 | Spin up RunPod H100 pod, mount network volume, install vLLM | Live RunPod endpoint |
| 3 | Run vLLM with `--enable-lora` and your adapter; verify endpoint works | Curl-able URL |
| 4 | Run same 20-question eval against RunPod endpoint | Quality + perf comparison |
| 5 | Tear down pod (save weights to network volume); document the runbook | `docs/portability-runbook.md` |

#### Week 6 — POC report & decision

| Day | Task | Deliverable |
|---|---|---|
| 1 | Compile all metrics: quality, latency, cost, portability | Spreadsheet |
| 2 | Manual exploration of edge cases: jailbreak attempts (informal), bad questions, multi-turn | Notes |
| 3 | Cost projection: at expected traffic, what does each path cost monthly? | Table |
| 4 | Write POC report: Q1–Q4 answers, recommended path | `concepts/poc-report.md` |
| 5 | Stakeholder review meeting; go/no-go decision | Decision memo |

### 2.4 POC budget

| Item | Cost |
|---|---|
| Together AI tokens (eval, exploration, ~3M tokens) | ~$60 |
| Together AI fine-tune (1 LoRA, ~2M training tokens) | ~$8 |
| Together AI dedicated endpoint trial (Week 4–5) | ~$50 |
| RunPod H100 (5 days × 24 hrs × $2.50) | ~$300 |
| HuggingFace private repo | $0 |
| Embedding corpus (~3M tokens) | ~$60 |
| **Total** | **~$478** |

Round to **$500 ceiling**. If the POC blows past this, something is wrong.

### 2.5 POC success criteria (rubric)

The POC passes if **all** are true:

- [ ] Q1: ≥ 16/20 eval questions rated "good" or "excellent" by manual review with stock 70B + RAG.
- [ ] Q2: Fine-tuning experiment ran end-to-end and produced a valid adapter; quality measured.
- [ ] Q3: Portability test ran end-to-end on RunPod; output quality within ±5% of Together AI hosted version.
- [ ] Q4: Cost-per-turn under $0.01 at the chosen path.
- [ ] Latency: p95 first-token < 2 seconds on Together API for the chosen model.
- [ ] No critical hallucinations (invented snow numbers) on eval set.
- [ ] Team alignment: written go-decision from PM, eng lead, content lead.

If any item fails, the production plan does not start. Either pivot (different model, different provider) or defer.

---

## 3. Post-POC: production build (Weeks 7–18)

Four overlapping sub-phases. Built on top of the architecture spec in `concepts/rag-plan.md`.

### 3.1 Phase A — Foundation hardening (Weeks 7–10)

Goal: ship the architecture from `rag-plan.md` end-to-end at production quality, no public exposure yet.

| Week | Workstream | Detailed deliverables |
|---|---|---|
| 7 | **Endpoints + schema** | Implement Convex schema (`knowledge_chunks`, `rag_requests`); deploy `/api/resort-data?format=compact`; build N1 (`/api/rag/resort-context`) end-to-end |
| 8 | **Endpoints (continued)** | Build N2, N3, N4 (region-context, recommend, search). Activate `/api/region-data?region=` per `api-endpoints.md` |
| 9 | **Chat orchestrator** | Build N5 (`/api/rag/chat`) with intent classifier, token-budget enforcer, streaming SSE, all five guardrail layers |
| 10 | **Tracking + indexing** | Build N6 (`/api/track/rag-request`); production indexing crons (articles + resort overviews); expand corpus to top 50 resorts |

Acceptance gate end of Week 10: every endpoint in `rag-plan.md` Section 5 returns the documented shape; jailbreak suite from `rag-jailbreak-tests.md` passes 100% on critical-severity tests.

### 3.2 Phase B — Chat UI + entity highlighting (Weeks 11–14)

This is where the user-visible product comes together. The chat panel itself is straightforward; the **entity highlighting** is the differentiating feature and gets the most attention.

#### 3.2.1 Chat UI

Built as a vanilla-JS module that drops onto any njk page (your existing template stack). Three components:

```
src/assets/js/chat/
  chat-widget.js           Main entry; mounts on body, manages state
  chat-stream.js           SSE consumer
  entity-panel.js          Side panel for highlighted entities
  entity-cards/
    resort-card.js         One per entity type
    article-card.js
    sponsor-card.js
    event-card.js
src/assets/css/
  chat.css                 Standalone styles, prefixed `.sno-chat-`
```

UI states: collapsed FAB → expanded panel (left or bottom-sheet on mobile) → message thread with streamed assistant responses.

#### 3.2.2 Entity highlighting — the architecture

The chat answer streams text on the left; on the right (or below on mobile), context cards appear as the LLM mentions resorts, articles, or sponsors. Example flow:

```
User: "Tell me about Copper Mountain"
   ↓
[chat panel] "Copper Mountain in Summit County, Colorado is..." (streaming)
[entity panel — appears mid-stream]
   ┌─────────────────────────────────┐
   │ [resort card]                   │
   │ Copper Mountain                 │
   │ 4" new / 87" base / 23 lifts    │
   │ → View resort                   │
   ├─────────────────────────────────┤
   │ [event card]                    │
   │ Beach Party — Mar 22            │
   │ → Tickets                       │
   ├─────────────────────────────────┤
   │ [article card]                  │
   │ "Copper's expanded backcountry" │
   │ → Read                          │
   ├─────────────────────────────────┤
   │ [sponsor card]                  │
   │ Vail Resorts Epic Pass          │
   │ (from /api/ads?resortId=303009) │
   └─────────────────────────────────┘
```

**Two implementation strategies — pick by week 11:**

**Strategy A: structured output from the LLM (recommended).** The model emits JSON containing both prose and explicit entity references:

```json
{
  "answer": "Copper Mountain in Summit County, Colorado is a mid-sized resort known for...",
  "entities": [
    { "type": "resort", "id": "303009", "name": "Copper Mountain", "salience": 0.95 },
    { "type": "article", "id": "6512", "salience": 0.6 }
  ],
  "follow_up": "Try asking: How are conditions there today?"
}
```

The orchestrator extracts `entities` and tells the frontend which cards to render. Entity data is hydrated from existing endpoints (`/api/resort-data`, news-list, `/api/ads`).

Pros: deterministic, easy to track, handles ambiguity (model knows "Copper" means resortId 303009 because the retrieved overview tells it).

Cons: schema must be enforced — Llama can drift from JSON formatting under load. Use Together's `response_format: { type: "json_schema" }` (when available on the model you choose) or post-validate with a schema parser.

**Strategy B: post-process the response with NER + dictionary.** Stream prose normally; run a regex/NER step over the streamed text to detect resort names and link them.

Pros: simpler model output; no JSON parsing risk.

Cons: ambiguity (two resorts named "Eagle Point"), latency (must wait for tokens to arrive), miss rate.

**Recommendation: Strategy A.** It's deterministic and matches how real partners (Bing Chat, Perplexity, Claude.ai with tools) do it. Strategy B as fallback if the model can't reliably emit valid JSON.

#### 3.2.3 Sponsor / ads integration

You already have `/api/ads?region=` and `/api/ads?resortId=` on `affable-hummingbird-827.convex.site`. Reuse it.

Trigger: after each chat response, the orchestrator extracts the dominant `resort` entity (highest salience) and calls `/api/ads?resortId={id}`. The first ad becomes a sponsor card in the entity panel. If no resort entity, fall back to `/api/ads?region={region}` from `document.body.dataset.snowreport`.

Track via existing `/api/track/ad-impression` and `/api/track/ad-click` — already built. New `?source=chat` query param distinguishes chat impressions from organic.

#### 3.2.4 Events integration

You don't have an events feed today. Decide between:

- **(a) Inline in resort overview markdown.** Curated, slow-moving, manually updated weekly. Lowest cost; covers ~80% of value.
- **(b) New `/api/events?resortId=` endpoint** sourced from a structured spreadsheet or partner CMS. Keeps events in real time. Higher cost (build + maintain).
- **(c) Scrape resort sites.** Brittle. Skip.

Recommendation: **(a) for v1**, plan **(b) for v1.1** if user feedback shows demand.

#### 3.2.5 Week-by-week

| Week | Deliverable |
|---|---|
| 11 | Strategy decision (A vs B); chat widget skeleton + SSE consumer; first end-to-end "answer streams to UI" |
| 12 | Resort card + article card; entity hydration from existing endpoints |
| 13 | Sponsor card; integration with existing `/api/ads` and tracking; event card (Strategy (a) — inline content) |
| 14 | Polish; a11y pass (keyboard nav, screen reader labels); mobile bottom-sheet UX; embed on canary page (e.g. `/snow-report/colorado/copper-mountain/`) |

### 3.3 Phase C — Stress test + infra decision (Weeks 16–18)

Run in parallel with Phase B's last weeks.

#### 3.3.1 Stress test plan

Tool: **k6** (preferred; JavaScript-native, easy CI integration). Alternatives: Artillery, Locust.

Scripts in `scripts/stress/`:

- **Scenario 1: ramp** — 0 → 100 concurrent users over 5 min, hold 10 min, ramp down. Measures saturation point.
- **Scenario 2: peak burst** — 200 concurrent users for 90 seconds (Saturday-9am-during-storm pattern). Measures cold-path behavior.
- **Scenario 3: steady-state** — 30 concurrent users for 30 min. Measures cost-per-hour and stability.
- **Scenario 4: single resort flood** — 50 concurrent users all asking about Big Sky. Measures cache effectiveness and entity-card hydration under load.

Metrics captured per scenario:

| Metric | Target |
|---|---|
| TTFT p95 | < 1.5 s |
| Tokens/sec/user | > 15 |
| Error rate | < 1% |
| Total cost during run | within projected $/conversation |
| Convex action latency p95 | < 200 ms (excluding LLM) |
| Vector search p95 | < 80 ms |

Run on **two paths in parallel**:

| Path | Setup |
|---|---|
| **API** | Together AI hosted endpoint (whichever model the POC selected) |
| **Dedicated** | RunPod H100 pod with vLLM, your fine-tuned LoRA loaded |

#### 3.3.2 Decision: API vs dedicated hardware

After stress testing, project monthly cost at expected traffic:

```
Monthly cost (API)        = (turns/month) × ($/turn)
Monthly cost (dedicated)  = ($/hour × 24 × 30) + (cost of idle margin)
```

Break-even is roughly 5–10M tokens/day of sustained traffic. Below that, API wins on simplicity and elasticity. Above that, dedicated wins on cost and latency.

| Decision input | API path |  Dedicated path |
|---|---|---|
| Predicted traffic | < 30k turns/day | > 30k turns/day |
| Latency sensitivity | normal | very low TTFT required |
| Ops appetite | low | medium |
| Capex / cost predictability | variable | fixed monthly |

**Default: stay on API for v1.** Revisit at 90 days post-launch with real traffic.

If dedicated wins, plan for:

- Hot-spare pod (auto-failover via Caddy/Nginx in front of two RunPod regions).
- Network volume for weights so pods are stateless.
- Health checks + auto-restart.
- Separate model-serving Convex action that proxies to the dedicated endpoint.
- Doubled runbook for incident response.

### 3.4 Phase D — Soft launch (Weeks 19–20)

Soft launch is **not** a feature freeze. It's a capacity ramp.

| Week | Action |
|---|---|
| 19, day 1 | Deploy to 1 canary page: `/snow-report/colorado/copper-mountain/`. Internal team only. Slack alert on every error. Daily review of all `rag_requests` rows. |
| 19, day 2–3 | Open canary to 10% of organic traffic (cookie-flagged). Monitor cost, latency, blocked-rate. |
| 19, day 4–5 | If healthy, expand to 100% of canary page. |
| 20 | Add 2 more canary pages (varying traffic profiles: high-volume resort, niche resort, region page). |
| 20, end | Public launch decision. |

**Rollback plan**: feature flag (`window.__SNO_CHAT_ENABLED`) lets ops disable the widget instantly without a deploy. Document and rehearse this in week 18.

---

## 4. Continual learning pipeline

Once the chat is in production, the most valuable asset is **real conversations + feedback**. This pipeline turns those into model improvements over time.

### 4.1 Data collection

In every chat turn, include:

- Thumbs up / down inline (one click, anonymous).
- "Was this helpful?" follow-up after 3+ turns in a session.
- Implicit signals: did the user click the entity cards? Did they leave or keep chatting? Did they bookmark?

Store these in `rag_requests` as `feedback: "positive" | "negative" | null` and `feedbackAt`.

### 4.2 Continual fine-tuning cadence

| Frequency | Action |
|---|---|
| Daily | Append last 24 hours of `feedback="positive"` rows to a candidate dataset |
| Weekly | Manual review (~30 min): dedupe, redact PII, fix obvious errors, drop low-quality |
| Monthly | If ≥ 500 reviewed examples accumulated, run a **continual** LoRA fine-tune that builds on the current adapter |
| Quarterly | Full re-train from scratch; compare to continually-tuned version on eval set |

The "continual" approach (LoRA stacking, basically) avoids catastrophic forgetting. Together AI supports it; document the version history in `concepts/model-versions.md`.

### 4.3 Versioning

```
snocountry-chat-v1.0   = stock Llama-3.3-70B-Turbo + RAG only (POC outcome)
snocountry-chat-v1.1   = + first LoRA from initial training set
snocountry-chat-v1.2   = + 1 month of curated feedback
snocountry-chat-v2.0   = full retrain on accumulated dataset
```

Always keep the previous version deployable for instant rollback.

### 4.4 Shadow / A/B deploy

When promoting v1.x → v1.x+1:

1. Route 5% of traffic to the new version (`?model=v1.2` flag in chat endpoint).
2. Compare metrics for 1 week: feedback rate, blocked rate, latency, cost.
3. If new version is non-worse on all, ramp to 50% → 100% over 3 days.
4. Decommission old version.

Track all of this in `rag_requests.model` field already in the schema.

---

## 5. Monitoring & operations

### 5.1 Dashboards (Convex + simple)

Build at the end of Phase A. Keep them minimal:

| Panel | Source | Alarm |
|---|---|---|
| Turns / minute | `rag_requests` count | n/a |
| Error rate | `rag_requests` where `status="error"` | > 2% over 1 hour |
| Block rate | `status="blocked"` | > 15% over 1 hour (signal of attack) |
| p95 TTFT | client-reported | > 2.5 s |
| p95 total latency | server-side | > 6 s |
| Daily cost | sum of `costUsd` | > daily budget × 1.5 |
| Faithfulness fail rate | `blockReason="unfaithful_*"` | > 1% over 1 day |
| Retrieval coverage | rows with `retrievedSources.length=0` | > 5% over 1 day (corpus gap) |

### 5.2 On-call

For v1, pragmatic posture:

- One named engineer holds the pager (or its equivalent — Slack alerts to a dedicated channel).
- Two alarm tiers:
  - **P1**: cost runaway, error rate > 5%, or chat completely down → reach within 15 min.
  - **P2**: degraded latency, isolated bug, blocked-rate spike → next business day.
- Runbooks in `docs/runbooks/`: "rate-limit a session", "rollback to previous model version", "kill the widget", "rotate Together AI key".

### 5.3 Cost monitoring

Convex cron sums daily `costUsd`. If daily total exceeds **$X** (set in week 17 based on observed POC + soft-launch numbers):

- Slack alert.
- If 2 days in a row: auto-flip a feature flag to require auth or to apply stricter rate limits.

### 5.4 Vendor risk / failover

Together AI is a single point of failure. Mitigations:

| Risk | Mitigation |
|---|---|
| Together AI outage (hours) | The whole `together.ts` client is one file; abstract to a `LLMProvider` interface; switch to OpenAI / Fireworks fallback via env var. Plan but don't pre-build. |
| Together AI deprecates a model | Pin model version in env; subscribe to their changelog. |
| Together AI raises prices | Quarterly cost review; revisit dedicated-hardware path. |
| Convex outage | Static fallback page on resort pages; chat widget shows "temporarily unavailable" gracefully; existing site continues to work. |
| Embedding model deprecated | `embeddingVersion` field already in schema; re-index is a known-cost operation. |

---

## 6. Stress testing — the deeper picture

(Phase C above is the timeline. This section is the methodology.)

### 6.1 Synthetic question pool

Don't hammer with one question. Use a 200-question pool sampled across:

- Use cases U1–U4 in equal proportion.
- Resort coverage matching real traffic distribution (e.g., 30% Colorado, 15% Utah, etc.).
- Question lengths: 30%, 30%, 30%, 10% across short / medium / long / pathological-long.
- 5% jailbreak attempts to verify guardrails hold under load.

### 6.2 What to learn from each scenario

| Scenario | Question it answers |
|---|---|
| Ramp | At what concurrency does p95 TTFT cross 2 s? That's your "soft cap." |
| Peak burst | Does the system fail open (queue) or fail closed (5xx)? Closed is preferable to a 30-second-spinner. |
| Steady-state | What is the actual $/hour cost at sustained-real load? |
| Single resort flood | Does retrieval cache help? If not, build one. (Add a 5-min cache on `/api/rag/resort-context` keyed by `resortId`.) |

### 6.3 Caching layer (likely insertion point)

Before stress test, decide whether to add a Convex-level cache for `resort-context` and `region-context`. Recommended:

- TTL: 60 seconds for live-data-bearing endpoints.
- TTL: 600 seconds for vector-search results (questions cluster).
- Cache key: hash of `(endpoint, resortId|region, queryTextNormalized)`.
- Bypass on `cache=skip` query param for testing.

Probably halves your steady-state cost at modest hit rates.

---

## 7. Things you might be missing

These are easy to forget but bite later. Treat each as a checkbox during Phase A or Phase B.

### 7.1 Legal / compliance

- [ ] **Terms of Service update.** The chat is a new product surface. ToS should disclose AI assistance, no warranty on conditions, no medical/legal/financial advice.
- [ ] **Privacy policy update.** You're now logging questions. Disclose retention (90 days), what's logged, how to request deletion.
- [ ] **GDPR / CCPA compliance.** A "Forget my chat data" endpoint that wipes `rag_requests` for a `sessionId`. EU/CA visitors must see a consent banner before chat enables.
- [ ] **Resort data licensing.** Some resorts may license conditions data with restrictions on derivative use. Verify before passing snow numbers through an AI.
- [ ] **News article licensing.** Check that indexing your own articles for an AI is permitted by any photo-licensing or syndication agreements in the article bodies.

### 7.2 Partner / content relationships

- [ ] **Resort partner notification.** Tell the top ~30 resort partners: "we're launching an AI chat on snocountry.com that may answer questions about your resort." Offer to show drafts. They will appreciate it (and find issues you missed).
- [ ] **Sponsor disclosure.** Sponsor cards in the entity panel must be visually distinct ("Sponsored") and tracked separately. Existing `/api/track/ad-impression` already separates them; mirror for chat.
- [ ] **Press / launch comms.** Plan a soft-launch blog post that frames the AI chat correctly: "your snow-report assistant," not "AI that knows everything."

### 7.3 Brand & content review

- [ ] **Tone calibration.** Have your content lead manually review 100 chat responses before launch. Bot tone vs SnoCountry editorial tone is rarely a perfect match out of the gate.
- [ ] **Forbidden topics list (beyond off-topic).** Even within skiing: avoid medical advice ("can I ski with a knee injury?"), avalanche safety advice (legal liability), gambling on snow forecasts. Add to the system prompt's DO NOT list.
- [ ] **Refusal copy review.** The canned refusal message will be seen thousands of times. Workshop it.

### 7.4 SEO

- [ ] **Don't expose chat conversations in HTML.** Chat is client-rendered; conversations should not be in the static HTML emitted by Eleventy. Check that the canary page's rendered HTML does not contain user questions or AI responses (Google would index them, then complain).
- [ ] **Schema.org markup.** If you add an FAQ-style summary block alongside the chat, mark it up properly. The chat itself is not crawlable and that's fine.
- [ ] **Sitemap unchanged.** No new URLs from chat.

### 7.5 Accessibility (a11y)

- [ ] **Keyboard navigation.** Tab into the chat panel; arrow-key through entity cards; Esc to close.
- [ ] **Screen reader labels.** `aria-live="polite"` on the response region so SR users hear streamed tokens. Entity panel marked as `<aside aria-label="Mentioned in this answer">`.
- [ ] **Color contrast.** Especially on the streaming-token cursor and the sponsor "Sponsored" label.
- [ ] **Reduced motion.** Respect `prefers-reduced-motion` for typing animations.

### 7.6 Observability

- [ ] **Frontend errors.** Wire Sentry (or equivalent) to catch chat-widget JS errors. Many users will hit subtle UA-specific bugs you won't reproduce.
- [ ] **Streaming health.** Some networks/middleboxes mangle SSE. Detect and fall back to non-streaming. Log `streaming_failed` events.
- [ ] **Per-page chat usage.** Add a tag to `rag_requests` for which page the widget was launched from (`pageSource` field already in schema). Top-pages report = clear product input.

### 7.7 Personalization (defer, but design for it)

- [ ] **Geolocation hint.** Browser geolocation lets the model say "you're in Denver — try A-Basin." Opt-in, sessionStorage only, never logged.
- [ ] **Bookmarks integration.** The page already has the bookmarks feature in the saved doc. The same pattern can apply: "Resorts you've bookmarked" in the chat suggestions.
- [ ] **Logged-in users.** When SnoCountry adds accounts, persist chat history server-side. Plan the table now, build it later.

### 7.8 Multi-language

- [ ] **English-only for v1.** Document this in user-facing copy.
- [ ] **Spanish/French planned.** Together AI's Llama 3.3 supports both reasonably; main work is the system prompt + classifier. Plan as v1.5.

### 7.9 Mobile UX

- [ ] **Bottom-sheet pattern** instead of side panel — the entity cards stack below the chat thread.
- [ ] **Voice input.** `webkitSpeechRecognition` is widely supported; add a mic icon. Big UX win, low effort.
- [ ] **Tap-to-fold cards** so entity panel doesn't dominate the screen.

### 7.10 Embeddable widget for partners

- [ ] **Resort partners may want this on their own site.** v1.5 deliverable: a `<script>` snippet that mounts the chat against the SnoCountry endpoint with a `partnerId` parameter for tracking + ad attribution. Reuses the existing `widget.js` pattern.

### 7.11 Internal tooling

- [ ] **"Chat replay" admin tool.** Given a `requestId`, show the full prompt sent, retrieved sources, response, all metrics. Indispensable for debugging user reports. ~½ day to build.
- [ ] **Corpus health dashboard.** Last-indexed timestamp per source; chunk counts by source; flagged-by-sanitizer queue. ~½ day.

### 7.12 Disaster recovery

- [ ] **Backups.** Convex tables — use Convex's built-in snapshot feature; weekly export to S3/R2.
- [ ] **Resort-overview source files.** They live in the repo (`data/resort-overviews/`); git is the backup.
- [ ] **Fine-tune adapters.** Stored on HuggingFace private repo + local mirror. Two copies, two providers.

### 7.13 Internal LLM gateway (post-v1)

When you have 2+ surfaces using LLMs (chat + maybe a "summarize this resort" feature for editors), centralize:

- Single `LLMProvider` abstraction.
- Single Together AI key with rate limit + cost ceiling per surface.
- Single retry/backoff/circuit-breaker policy.
- Single token-counting middleware.

A small `convex/lib/llm.ts` module. ~1 dev-week to build properly.

---

## 8. Risk register

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| POC fails Q1 (quality not good enough) | Low | High | Pivot model: try Qwen-2.5-72B or Claude via API. Add 1 week to POC. | Eng lead |
| Fine-tuning doesn't help | Medium | Low | OK — keep stock 70B. Re-evaluate at 6 months with more training data. | Eng lead |
| Together AI service degrades during prod | Low | High | Provider abstraction; failover plan in Section 5.4. | Eng lead |
| Chat answers an off-topic question publicly | Medium | High (brand) | Five-layer guardrails; jailbreak suite gating; post-launch monitoring. | Eng + Content |
| Cost runaway from a viral moment | Low | Medium | Cost alarm; auto-flip stricter rate limits; max-tokens cap. | Eng |
| Resort partner objects to AI representation | Medium | Medium | Pre-launch outreach (Section 7.2); rapid response process. | PM + Content |
| User submits PII in chat | High | Medium | PII redactor before storage (v1.1); 90-day retention; deletion endpoint. | Eng |
| Indirect prompt injection via own articles | Low | High | Sanitizer at index time; fenced delimiters at runtime; jailbreak suite J012–J014. | Eng |
| Ad attribution for chat-driven revenue is wrong | Medium | Medium | Add `?source=chat` to ad endpoints; reconcile in analytics. | Eng + Sales |
| Feature flag fails open during incident | Low | High | Test the rollback in week 18. Quarterly fire drill. | Eng |

---

## 9. Cost model (post-POC)

Assumes the API path. Numbers conservative.

### 9.1 Year-1 monthly run rate

| Component | Low traffic (5k turns/mo) | Mid (50k turns/mo) | High (250k turns/mo) |
|---|---|---|---|
| Together AI inference | $15 | $150 | $750 |
| Together AI embeddings (corpus refresh) | $1 | $5 | $20 |
| Convex usage | $0 | $25 | $100 |
| Continual fine-tuning | $0–$50 | $50 | $50 |
| Engineering sustaining (½ FTE) | included | included | included |
| **Monthly total (cloud only)** | **~$20** | **~$230** | **~$920** |

At 250k turns/month sustained, dedicated hardware breaks even with API. Re-test then.

### 9.2 One-time

- POC: ~$500 (Section 2.4)
- Production build labor: ~12 dev-weeks at internal rate
- Initial corpus build (50 resort overviews): ~80 hours of content authoring
- Legal review (ToS / privacy update): ~$2000 outside counsel or in-house equivalent
- Brand/UX design pass: ~2 designer-weeks

---

## 10. Open decisions

Resolve before Phase A starts. Some carry over from `concepts/rag-plan.md` Section 16.

| # | Decision | Default | Owner |
|---|---|---|---|
| 1 | Convex deployment placement (RAG on `good-cormorant-17` vs new) | Co-locate | Eng lead |
| 2 | Chat orchestration (Convex action vs Netlify proxy) | Convex direct | Eng lead |
| 3 | Streaming protocol (SSE vs WS) | SSE | Eng lead |
| 4 | Resort overview source (hand-write 50 + LLM-draft rest, or defer narrative) | Hand-write 50, LLM-draft rest, human-review | Content lead |
| 5 | Primary model (Llama-3.3-70B vs Qwen-2.5-72B vs fine-tuned 8B) | Decide at POC end (Week 6) | Eng + PM |
| 6 | Public for v1 vs auth-only | Public, hCaptcha-on-abuse | PM |
| 7 | Privacy: log raw question vs redact at write | Log v1, redactor v1.1 | PM + Legal |
| 8 | Entity-highlighting strategy (A: structured output vs B: post-process NER) | A — structured output | Eng lead |
| 9 | Events feed source | (a) Inline in resort overviews for v1 | Content lead |
| 10 | Languages supported | English only v1 | PM |
| 11 | Mobile UX (bottom sheet vs side panel) | Bottom sheet | Designer |
| 12 | API vs dedicated hardware | Stay on API for v1; revisit at 90 days | Eng + Finance |

---

## 11. Hand-off summary

When this plan is acted on:

1. POC is owned by 1 engineer for 6 weeks against this document.
2. Production build picks up at Week 7, on Phase A in `rag-plan.md`'s phase list.
3. UI development picks up at Week 11 with the entity-highlighting decision (Open Decision #8).
4. Soft launch is gated by stress-test results and the public-launch criteria in Section 3.4.
5. Continual learning is a sustaining responsibility from launch day forward.

Three companion documents:

- `concepts/rag-plan.md` — architecture and endpoint specs.
- `concepts/rag-jailbreak-tests.md` — adversarial test suite.
- `concepts/api-endpoints.md` — current endpoint registry.

To-be-authored:

- `concepts/poc-report.md` — created at end of Week 6.
- `concepts/eval/poc-eval.json` — 20-question eval set, week 2.
- `concepts/eval/full-eval.json` — 100-question eval set, week 9.
- `concepts/model-versions.md` — version log, ongoing.
- `docs/runbooks/*.md` — operational runbooks, Phase A.
- `docs/portability-runbook.md` — Week 5 of POC.

---

*Document version: v1 — drafted 2026-05-08*
