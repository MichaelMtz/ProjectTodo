"""
Runner — calls Together.ai for each model × question, saves raw outputs.

Usage:
    python runner.py                    # Run all models × all questions
    python runner.py --model 0          # Run only the first model (Llama 8B)
    python runner.py --question Q07     # Run only question Q07
    python runner.py --dry-run          # Show prompts without calling API
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone

import config

# ── Prompt assembly ─────────────────────────────────────────────


def load_system_prompt():
    path = os.path.join(config.FIXTURES_DIR, "system_prompt.txt")
    with open(path, "r") as f:
        return f.read().strip()


def load_questions():
    path = os.path.join(config.FIXTURES_DIR, "questions.json")
    with open(path, "r") as f:
        data = json.load(f)
    return data


def build_user_message(question_obj):
    """Assemble the user message with RAG context, mimicking production prompt template."""
    ctx = question_obj.get("context", {})
    parts = []

    # LIVE_DATA block
    live = ctx.get("live_data", [])
    if live:
        parts.append("<LIVE_DATA untrusted=\"true\">")
        parts.append(json.dumps(live, indent=2))
        parts.append("</LIVE_DATA>")

    # KNOWLEDGE block (vector-retrieved chunks)
    chunks = ctx.get("knowledge_chunks", [])
    if chunks:
        parts.append("<KNOWLEDGE untrusted=\"true\">")
        for i, chunk in enumerate(chunks, 1):
            parts.append(f"[{i}] {chunk}")
        parts.append("</KNOWLEDGE>")

    # NEWS block
    news = ctx.get("news", [])
    if news:
        parts.append("<NEWS untrusted=\"true\">")
        for article in news:
            parts.append(f"- {article}")
        parts.append("</NEWS>")

    # The actual user question
    parts.append("")
    parts.append(f"User question: {question_obj['question']}")

    return "\n".join(parts)


# ── API call ────────────────────────────────────────────────────


def call_together(model_id, system_prompt, user_message):
    """Call Together.ai chat completions API. Returns dict with response + metadata."""
    import urllib.request
    import urllib.error

    payload = {
        "model": model_id,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "temperature": config.TEMPERATURE,
        "max_tokens": config.MAX_TOKENS,
        "top_p": config.TOP_P,
        "stream": False,
    }

    if config.STOP_SEQUENCES:
        payload["stop"] = config.STOP_SEQUENCES

    headers = {
        "Authorization": f"Bearer {config.TOGETHER_API_KEY}",
        "Content-Type": "application/json",
    }

    req = urllib.request.Request(
        config.TOGETHER_BASE_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    start = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="replace")
        return {
            "error": True,
            "status": e.code,
            "message": error_body,
            "latency_ms": round((time.monotonic() - start) * 1000),
        }
    except Exception as e:
        return {
            "error": True,
            "status": 0,
            "message": str(e),
            "latency_ms": round((time.monotonic() - start) * 1000),
        }

    latency_ms = round((time.monotonic() - start) * 1000)

    # Extract response
    choice = body.get("choices", [{}])[0]
    message = choice.get("message", {})
    usage = body.get("usage", {})

    input_tokens = usage.get("prompt_tokens", 0)
    output_tokens = usage.get("completion_tokens", 0)

    return {
        "error": False,
        "content": message.get("content", ""),
        "finish_reason": choice.get("finish_reason", ""),
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": usage.get("total_tokens", 0),
        "latency_ms": latency_ms,
        "model_id": body.get("model", model_id),
    }


# ── Cost calculation ────────────────────────────────────────────


def calc_cost(model_cfg, input_tokens, output_tokens):
    """Calculate cost in USD for a single request."""
    in_cost = (input_tokens / 1_000_000) * model_cfg["cost_per_m_input"]
    out_cost = (output_tokens / 1_000_000) * model_cfg["cost_per_m_output"]
    return round(in_cost + out_cost, 6)


# ── Main ────────────────────────────────────────────────────────


def run_eval(model_filter=None, question_filter=None, dry_run=False):
    if not config.TOGETHER_API_KEY and not dry_run:
        print("ERROR: TOGETHER_API_KEY environment variable not set.")
        print("  export TOGETHER_API_KEY=tok_...")
        sys.exit(1)

    # Load fixtures
    system_prompt = load_system_prompt()
    eval_data = load_questions()
    questions = eval_data["questions"]

    # Filter
    models = config.MODELS
    if model_filter is not None:
        models = [models[model_filter]]

    if question_filter:
        questions = [q for q in questions if q["id"] == question_filter]
        if not questions:
            print(f"ERROR: Question '{question_filter}' not found.")
            sys.exit(1)

    # Ensure output dirs exist
    os.makedirs(config.RAW_DIR, exist_ok=True)

    total_calls = len(models) * len(questions)
    total_cost = 0.0
    total_tokens_in = 0
    total_tokens_out = 0
    results = []

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")

    print(f"\n{'='*70}")
    print(f"  SnoCountry Model Eval — {len(questions)} questions × {len(models)} models")
    print(f"  Timestamp: {timestamp}")
    print(f"  Temperature: {config.TEMPERATURE}  Max tokens: {config.MAX_TOKENS}")
    print(f"{'='*70}\n")

    call_num = 0
    for q in questions:
        user_message = build_user_message(q)

        for model in models:
            call_num += 1
            label = f"[{call_num}/{total_calls}] {q['id']} × {model['label']}"

            if dry_run:
                print(f"{label} — DRY RUN")
                print(f"  System prompt: {len(system_prompt)} chars")
                print(f"  User message:  {len(user_message)} chars")
                print(f"  Model: {model['id']}")
                print()
                continue

            print(f"{label} ...", end="", flush=True)

            response = call_together(model["id"], system_prompt, user_message)

            if response.get("error"):
                print(f" ERROR ({response.get('status')})")
                print(f"  {response.get('message', '')[:200]}")
            else:
                cost = calc_cost(model, response["input_tokens"], response["output_tokens"])
                total_cost += cost
                total_tokens_in += response["input_tokens"]
                total_tokens_out += response["output_tokens"]
                print(f" OK ({response['latency_ms']}ms, {response['input_tokens']}+{response['output_tokens']} tok, ${cost:.4f})")

            # Build result record
            record = {
                "timestamp": timestamp,
                "question_id": q["id"],
                "category": q["category"],
                "question": q["question"],
                "model_id": model["id"],
                "model_label": model["label"],
                "model_role": model["role"],
                "system_prompt_chars": len(system_prompt),
                "user_message_chars": len(user_message),
                "context": q.get("context", {}),
                "faithfulness_values": q.get("faithfulness_values", []),
                "expected_behavior": q.get("expected_behavior", ""),
                "fail_signals": q.get("fail_signals", []),
                "pass_signals": q.get("pass_signals", []),
                "constraints": q.get("constraints", []),
                "response": response,
            }

            if not response.get("error"):
                record["cost_usd"] = calc_cost(model, response["input_tokens"], response["output_tokens"])

            results.append(record)

            # Save individual raw file
            raw_path = os.path.join(
                config.RAW_DIR,
                f"{timestamp}_{q['id']}_{model['label'].replace(' ', '-')}.json"
            )
            with open(raw_path, "w") as f:
                json.dump(record, f, indent=2)

            # Rate limit courtesy — 200ms between calls
            time.sleep(0.2)

    if dry_run:
        print("Dry run complete — no API calls made.\n")
        return []

    # Save combined results
    combined_path = os.path.join(config.RESULTS_DIR, f"eval-{timestamp}.json")
    with open(combined_path, "w") as f:
        json.dump({
            "timestamp": timestamp,
            "config": {
                "models": [m["label"] for m in models],
                "questions": len(questions),
                "temperature": config.TEMPERATURE,
                "max_tokens": config.MAX_TOKENS,
            },
            "summary": {
                "total_calls": call_num,
                "total_cost_usd": round(total_cost, 4),
                "total_input_tokens": total_tokens_in,
                "total_output_tokens": total_tokens_out,
            },
            "results": results,
        }, f, indent=2)

    # Print summary
    print(f"\n{'='*70}")
    print(f"  COMPLETE")
    print(f"  Calls: {call_num}   Cost: ${total_cost:.4f}")
    print(f"  Tokens: {total_tokens_in:,} in + {total_tokens_out:,} out")
    print(f"  Results: {combined_path}")
    print(f"  Raw files: {config.RAW_DIR}/")
    print(f"{'='*70}\n")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SnoCountry Model Eval Runner")
    parser.add_argument("--model", type=int, default=None, help="Model index (0=Llama 8B, 1=Qwen 9B, 2=Llama 70B)")
    parser.add_argument("--question", type=str, default=None, help="Run only this question ID (e.g. Q07)")
    parser.add_argument("--dry-run", action="store_true", help="Show prompts without calling API")
    args = parser.parse_args()

    run_eval(model_filter=args.model, question_filter=args.question, dry_run=args.dry_run)
