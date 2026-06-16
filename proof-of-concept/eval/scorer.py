"""
Scorer — mechanical faithfulness checks, signal detection, score aggregation.

Usage:
    python scorer.py results/eval-TIMESTAMP.json
    python scorer.py results/eval-TIMESTAMP.json --verbose
"""

import argparse
import json
import os
import re
import sys

import config


# ── Faithfulness checker ────────────────────────────────────────


def extract_numbers(text):
    """Extract all numeric values from text. Returns set of string representations."""
    # Match integers and decimals, but not inside words
    matches = re.findall(r'\b(\d+(?:\.\d+)?)\b', text)
    return set(matches)


def check_faithfulness(response_text, allowed_values, ignore_set=None):
    """
    Check that every number in the response exists in the allowed values.

    Returns:
        dict with 'verified', 'unverified', 'ignored', 'ratio'
    """
    if ignore_set is None:
        ignore_set = config.FAITHFULNESS_IGNORE

    response_numbers = extract_numbers(response_text)
    allowed_strings = {str(v) for v in allowed_values}

    verified = []
    unverified = []
    ignored = []

    for num in sorted(response_numbers):
        if num in ignore_set:
            ignored.append(num)
        elif num in allowed_strings:
            verified.append(num)
        else:
            unverified.append(num)

    total_checked = len(verified) + len(unverified)
    ratio = len(verified) / total_checked if total_checked > 0 else 1.0

    return {
        "verified": verified,
        "unverified": unverified,
        "ignored": ignored,
        "ratio": round(ratio, 3),
        "total_checked": total_checked,
    }


# ── Signal detection ────────────────────────────────────────────


def check_signals(response_text, fail_signals, pass_signals):
    """
    Check for fail/pass signal phrases in the response.

    Returns:
        dict with 'status' ('PASS', 'FAIL', 'REVIEW'), 'found_fail', 'found_pass'
    """
    text_lower = response_text.lower()

    found_fail = [s for s in fail_signals if s.lower() in text_lower]
    found_pass = [s for s in pass_signals if s.lower() in text_lower]

    if found_fail:
        status = "FAIL"
    elif found_pass:
        status = "PASS"
    elif fail_signals or pass_signals:
        # Signals were defined but none matched
        status = "REVIEW"
    else:
        # No signals defined for this question
        status = "N/A"

    return {
        "status": status,
        "found_fail": found_fail,
        "found_pass": found_pass,
    }


# ── Word count ──────────────────────────────────────────────────


def word_count(text):
    return len(text.split())


# ── Score a single result ───────────────────────────────────────


def score_result(result):
    """Score a single model × question result. Returns score dict."""
    response = result.get("response", {})

    if response.get("error"):
        return {
            "question_id": result["question_id"],
            "model_label": result["model_label"],
            "status": "ERROR",
            "error": response.get("message", "Unknown error"),
        }

    content = response.get("content", "")
    faithfulness_values = result.get("faithfulness_values", [])
    fail_signals = result.get("fail_signals", [])
    pass_signals = result.get("pass_signals", [])

    # Faithfulness
    faith = check_faithfulness(content, faithfulness_values)

    # Signal detection
    signals = check_signals(content, fail_signals, pass_signals)

    # Word count
    wc = word_count(content)

    return {
        "question_id": result["question_id"],
        "category": result["category"],
        "model_label": result["model_label"],
        "model_role": result["model_role"],
        "status": "OK",
        "word_count": wc,
        "faithfulness": faith,
        "signals": signals,
        "input_tokens": response.get("input_tokens", 0),
        "output_tokens": response.get("output_tokens", 0),
        "latency_ms": response.get("latency_ms", 0),
        "cost_usd": result.get("cost_usd", 0),
        "response_preview": content[:150].replace("\n", " "),
    }


# ── Generate CSV template for human scoring ─────────────────────


def generate_csv(scores, output_path):
    """Generate a CSV template with auto-scored columns + blank human-score columns."""
    import csv

    fieldnames = [
        "question_id", "category", "model_label", "model_role",
        "word_count", "faithfulness_ratio", "faithfulness_unverified",
        "signal_status", "signal_fail_found", "signal_pass_found",
        "latency_ms", "cost_usd",
        "faithfulness_human", "relevance_human", "tone_human",
        "guardrail_human", "notes",
        "response_preview",
    ]

    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for s in scores:
            if s["status"] == "ERROR":
                writer.writerow({
                    "question_id": s["question_id"],
                    "model_label": s["model_label"],
                    "response_preview": f"ERROR: {s.get('error', '')}",
                })
                continue

            writer.writerow({
                "question_id": s["question_id"],
                "category": s["category"],
                "model_label": s["model_label"],
                "model_role": s["model_role"],
                "word_count": s["word_count"],
                "faithfulness_ratio": s["faithfulness"]["ratio"],
                "faithfulness_unverified": "; ".join(s["faithfulness"]["unverified"]),
                "signal_status": s["signals"]["status"],
                "signal_fail_found": "; ".join(s["signals"]["found_fail"]),
                "signal_pass_found": "; ".join(s["signals"]["found_pass"]),
                "latency_ms": s["latency_ms"],
                "cost_usd": s["cost_usd"],
                "faithfulness_human": "",
                "relevance_human": "",
                "tone_human": "",
                "guardrail_human": "",
                "notes": "",
                "response_preview": s["response_preview"],
            })

    return output_path


# ── Print summary ───────────────────────────────────────────────


def print_summary(scores, verbose=False):
    """Print a formatted summary of auto-scores."""

    # Group by model
    models = {}
    for s in scores:
        if s["status"] == "ERROR":
            continue
        label = s["model_label"]
        if label not in models:
            models[label] = {"scores": [], "cost": 0, "tokens_in": 0, "tokens_out": 0}
        models[label]["scores"].append(s)
        models[label]["cost"] += s.get("cost_usd", 0)
        models[label]["tokens_in"] += s.get("input_tokens", 0)
        models[label]["tokens_out"] += s.get("output_tokens", 0)

    print(f"\n{'='*70}")
    print("  AUTO-SCORE SUMMARY")
    print(f"{'='*70}\n")

    for label, data in models.items():
        ss = data["scores"]
        avg_wc = sum(s["word_count"] for s in ss) / len(ss) if ss else 0
        avg_latency = sum(s["latency_ms"] for s in ss) / len(ss) if ss else 0

        # Faithfulness: only for questions that have faithfulness_values
        faith_scores = [s for s in ss if s["faithfulness"]["total_checked"] > 0]
        avg_faith = sum(s["faithfulness"]["ratio"] for s in faith_scores) / len(faith_scores) if faith_scores else None

        # Signals
        signal_scores = [s for s in ss if s["signals"]["status"] != "N/A"]
        pass_count = sum(1 for s in signal_scores if s["signals"]["status"] == "PASS")
        fail_count = sum(1 for s in signal_scores if s["signals"]["status"] == "FAIL")
        review_count = sum(1 for s in signal_scores if s["signals"]["status"] == "REVIEW")

        print(f"  {label}")
        print(f"  {'─'*50}")
        print(f"  Avg word count:    {avg_wc:.0f}")
        print(f"  Avg latency:       {avg_latency:.0f} ms")
        if avg_faith is not None:
            pct = avg_faith * 100
            indicator = "OK" if pct >= 90 else ("WARN" if pct >= 70 else "FAIL")
            print(f"  Faithfulness avg:  {pct:.0f}% [{indicator}]")
        if signal_scores:
            print(f"  Signals:           {pass_count} pass / {fail_count} fail / {review_count} review")
        print(f"  Total cost:        ${data['cost']:.4f}")
        print(f"  Tokens:            {data['tokens_in']:,} in + {data['tokens_out']:,} out")
        print()

    # Flagged issues
    flagged = [s for s in scores if s["status"] == "OK" and (
        s["faithfulness"].get("unverified") or
        s["signals"].get("status") == "FAIL"
    )]

    if flagged:
        print(f"  {'!'*3} FLAGGED ISSUES ({len(flagged)})")
        print(f"  {'─'*50}")
        for s in flagged:
            reasons = []
            if s["faithfulness"].get("unverified"):
                reasons.append(f"unverified numbers: {s['faithfulness']['unverified']}")
            if s["signals"].get("status") == "FAIL":
                reasons.append(f"fail signals: {s['signals']['found_fail']}")
            print(f"  {s['question_id']} × {s['model_label']}: {'; '.join(reasons)}")
        print()

    if verbose:
        print(f"\n  DETAILED RESULTS")
        print(f"  {'─'*50}")
        for s in scores:
            if s["status"] == "ERROR":
                print(f"\n  {s['question_id']} × {s['model_label']}: ERROR")
                continue
            print(f"\n  {s['question_id']} × {s['model_label']}:")
            print(f"    Words: {s['word_count']}  Latency: {s['latency_ms']}ms  Cost: ${s.get('cost_usd', 0):.4f}")
            f = s["faithfulness"]
            if f["total_checked"] > 0:
                print(f"    Faithfulness: {f['ratio']*100:.0f}% — verified={f['verified']} unverified={f['unverified']}")
            sig = s["signals"]
            if sig["status"] != "N/A":
                print(f"    Signals: {sig['status']} — fail={sig['found_fail']} pass={sig['found_pass']}")
            print(f"    Preview: {s['response_preview'][:100]}...")


# ── Main ────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="SnoCountry Eval Scorer")
    parser.add_argument("results_file", help="Path to eval results JSON")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed per-question results")
    args = parser.parse_args()

    if not os.path.exists(args.results_file):
        print(f"ERROR: File not found: {args.results_file}")
        sys.exit(1)

    with open(args.results_file, "r") as f:
        data = json.load(f)

    results = data.get("results", [])
    if not results:
        print("No results found in file.")
        sys.exit(1)

    # Score each result
    scores = [score_result(r) for r in results]

    # Print summary
    print_summary(scores, verbose=args.verbose)

    # Generate CSV
    csv_path = args.results_file.replace(".json", "-scores.csv")
    generate_csv(scores, csv_path)
    print(f"  Score CSV: {csv_path}")
    print(f"  Open in Google Sheets, fill in human scores, then run report.py\n")

    # Save scored JSON
    scored_path = args.results_file.replace(".json", "-scored.json")
    with open(scored_path, "w") as f:
        json.dump({"scores": scores}, f, indent=2)
    print(f"  Scored JSON: {scored_path}\n")


if __name__ == "__main__":
    main()
