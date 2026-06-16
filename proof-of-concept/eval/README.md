# SnoCountry RAG eval suite

Quality-evaluation question sets for the SnoCountry chat assistant. Distinct from `concepts/rag-jailbreak-tests.md` (which is *adversarial* — every test must be blocked). The eval set asks the chat endpoint normal user questions and grades the **quality** of its answers.

Two files:

| File | Size | When to run | Purpose |
|---|---|---|---|
| `poc-eval.json` | 20 questions | Weeks 2, 3, 4 of POC | Validates the four POC questions (Q1–Q4) in `concepts/deployment-plan.md` Section 2.1. Pass bar: ≥ 80% rated "good" or "excellent". |
| `full-eval.json` | ~30 questions to start, expand to 100 | Week 9, then on every model swap or prompt change | Comprehensive coverage. Pass bar: ≥ 90% rated "good" or "excellent". |

---

## 1. JSON schema

```jsonc
{
  "name": "...",
  "version": "1.0.0",
  "description": "...",
  "useCases": {                  // From rag-plan.md Section 2
    "U1": "Single-resort conditions",
    "U2": "State / region conditions",
    "U3": "Recommendation",
    "U4": "Relevant news"
  },
  "scoring": {                   // See Section 2 below for the rubric
    "rubric": { "excellent": "...", "good": "...", "fair": "...", "poor": "..." },
    "passThreshold": 0.80,
    "criticalCriteria": ["faithfulness", "no_invented_numbers"]
  },
  "questions": [
    {
      "id":             "E001",                 // Stable, never reused
      "useCase":        "U1",
      "question":       "How is Big Sky today?",
      "context":        {
        "resortId":   "308001",                 // Optional — page context
        "region":     null,
        "pageSource": "resort"                  // resort | region | home | article
      },
      "expected": {
        "intent":              "resort_status",          // What the classifier should pick
        "sourcesUsed":         ["live", "overview"],     // Which retrieval sources should appear in retrievedSources
        "mustContainOneOf":    ["Big Sky", "lifts", "trails", "base"],
        "mustNotContain":      [],
        "maxWords":            250,
        "minWords":            30
      },
      "rubricNotes": "Faithfulness critical: any number must come from LIVE_DATA. No-data scenarios should result in graceful 'I don't have current data' response.",
      "tags": ["live_data", "single_resort", "simple_phrasing"]
    }
  ]
}
```

---

## 2. Scoring rubric

Each response is rated by a human reviewer (or a separate strong LLM in a "judge" role) on this 4-level rubric:

| Rating | Definition |
|---|---|
| **excellent** | All `mustContainOneOf` matched, none of `mustNotContain` present, faithful to retrieved data, on-brand tone, ends with the "Try asking:" follow-up, length within bounds. |
| **good** | All hard criteria met (containment, faithfulness, no off-topic content), minor tone or formatting issues acceptable. |
| **fair** | Answer is on-topic and not factually wrong, but misses key information from `mustContainOneOf` or runs over `maxWords`. |
| **poor** | Wrong answer, hallucinated number, off-topic, or guardrail-blocked when it should not have been. |

Pass condition: **(excellent + good) / total ≥ passThreshold**.

Critical criteria override:
- **Any answer with an invented number not present in `LIVE_DATA` is automatically `poor`** regardless of other quality signals.
- **Any answer that violates the system prompt's explicit DO NOT list** is automatically `poor`.

---

## 3. Tags

Used to filter the suite for targeted runs. Conventions:

| Tag | Meaning |
|---|---|
| `live_data` | Question requires hitting a live endpoint |
| `single_resort` / `multi_resort` | Number of resorts referenced |
| `region` / `state` | Geographic scope |
| `time_specific` | Phrases like "yesterday", "this weekend", "right now" |
| `numeric_ask` | User wants specific numbers |
| `comparison` | Compare A to B |
| `recommendation` | Asks for a suggestion |
| `news` | News lookup |
| `border_case` | On-the-edge of the topic policy |
| `simple_phrasing` / `casual_phrasing` / `formal_phrasing` | Style of question |
| `multi_turn` | Requires conversation context (full-eval only) |
| `empty_result` | Tests graceful handling of missing data |
| `faithfulness_stress` | Designed to tempt model into inventing facts |

---

## 4. Harness sketch

A future task; reference shape only. Lives at `scripts/eval/run-eval.js`.

```ts
import poc from "../../concepts/eval/poc-eval.json" assert { type: "json" };

for (const q of poc.questions) {
  const r = await fetch(`${BASE}/api/rag/chat`, {
    method: "POST",
    body: JSON.stringify({
      question: q.question,
      sessionId: `eval-${q.id}-${Date.now()}`,
      context: q.context,
      stream: false,
    }),
  }).then(r => r.json());

  const result = await scoreAnswer(q, r);   // Either manual queue or LLM-judge
  recordResult(q.id, result);
}

printSummary();
```

The "judge" pattern: a separate, stronger model (e.g. GPT-5 or Claude 4.6 Opus) is asked to rate the answer against the rubric. Cheaper than human review for iteration; human review remains the source of truth for go-decisions.

---

## 5. Adding new questions

1. Pick the next unused ID. POC eval uses `E001`–`E099`; full eval starts at `E100`.
2. Pick the use case (U1/U2/U3/U4) — or label it as `cross_use_case` for genuinely multi-intent questions.
3. Write the question as a real user would phrase it. Vary phrasing across questions; don't all be "How is X?".
4. Add tags to support filtering.
5. Define `expected` carefully:
   - `mustContainOneOf` is OR (one match passes). Don't make it impossibly specific.
   - `mustNotContain` should include words that signal hallucination or off-topic creep.
   - `maxWords` enforces concision; default 300 except for recommendations (350).
6. Document any subtle expectation in `rubricNotes`.

---

## 6. Maintenance cadence

| Cadence | Action |
|---|---|
| Every POC iteration (weekly during POC) | Run `poc-eval.json` |
| Every prompt change | Run `poc-eval.json` |
| Every model swap or fine-tune update | Run `full-eval.json` |
| Every quarter post-launch | Add 5–10 new questions from real user logs (anonymized) |
| When a real user reports a bad answer | Add it as a new test (regression case) |

Results recorded to `concepts/eval/results/{YYYY-MM-DD}-{model-id}.md` with summary table and any failure notes.
