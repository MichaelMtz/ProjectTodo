#!/usr/bin/env python3
"""
SnoCountry Model Evaluation — Main Entry Point

Runs the full eval pipeline:
  1. Call Together.ai for each model × question (runner.py)
  2. Score outputs mechanically (scorer.py)
  3. Generate comparison HTML report (report.py)

Usage:
    # Full run (all 3 models × 18 questions = 54 API calls, ~$0.50)
    export TOGETHER_API_KEY=tok_...
    python run_eval.py

    # Dry run — see prompts without calling the API
    python run_eval.py --dry-run

    # Single model test (0=Llama 8B, 1=Qwen 9B, 2=Llama 70B)
    python run_eval.py --model 0

    # Single question test
    python run_eval.py --question Q07

    # Score an existing results file
    python run_eval.py --score-only results/eval-TIMESTAMP.json

    # Generate report from existing results
    python run_eval.py --report-only results/eval-TIMESTAMP.json
"""

import argparse
import glob
import os
import sys

# Ensure eval/ is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
from runner import run_eval
from scorer import score_result, print_summary, generate_csv
from report import build_html


def find_latest_results():
    """Find the most recent eval results file."""
    pattern = os.path.join(config.RESULTS_DIR, "eval-*.json")
    files = sorted(glob.glob(pattern))
    # Exclude scored/comparison files
    files = [f for f in files if "-scored" not in f and "-comparison" not in f and "-scores" not in f]
    return files[-1] if files else None


def run_scorer(results_path, verbose=False):
    """Run the scorer on a results file."""
    import json

    with open(results_path, "r") as f:
        data = json.load(f)

    results = data.get("results", [])
    scores = [score_result(r) for r in results]

    print_summary(scores, verbose=verbose)

    csv_path = results_path.replace(".json", "-scores.csv")
    generate_csv(scores, csv_path)
    print(f"  Score CSV: {csv_path}")

    scored_path = results_path.replace(".json", "-scored.json")
    with open(scored_path, "w") as f:
        json.dump({"scores": scores}, f, indent=2)
    print(f"  Scored JSON: {scored_path}\n")

    return scores


def run_report(results_path):
    """Generate the comparison HTML report."""
    import json

    with open(results_path, "r") as f:
        data = json.load(f)

    results = data.get("results", [])
    summary = data.get("summary", {})
    summary["timestamp"] = data.get("timestamp", "")

    report_html = build_html(results, summary)

    output_path = results_path.replace(".json", "-comparison.html")
    with open(output_path, "w") as f:
        f.write(report_html)

    print(f"\n  Comparison report: {output_path}")
    print(f"  Open in browser to review side-by-side model responses.\n")


def main():
    parser = argparse.ArgumentParser(
        description="SnoCountry Model Evaluation Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--model", type=int, default=None,
                        help="Model index (0=Llama 8B, 1=Qwen 9B, 2=Llama 70B)")
    parser.add_argument("--question", type=str, default=None,
                        help="Run only this question ID (e.g. Q07)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show prompts without calling API")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Verbose scoring output")
    parser.add_argument("--score-only", type=str, default=None, metavar="FILE",
                        help="Score an existing results file (skip API calls)")
    parser.add_argument("--report-only", type=str, default=None, metavar="FILE",
                        help="Generate report from existing results (skip API calls + scoring)")

    args = parser.parse_args()

    # Score-only mode
    if args.score_only:
        if not os.path.exists(args.score_only):
            print(f"ERROR: File not found: {args.score_only}")
            sys.exit(1)
        run_scorer(args.score_only, verbose=args.verbose)
        return

    # Report-only mode
    if args.report_only:
        if not os.path.exists(args.report_only):
            print(f"ERROR: File not found: {args.report_only}")
            sys.exit(1)
        run_report(args.report_only)
        return

    # Full pipeline
    print("\n  Phase 1/3: Running model evaluations...\n")
    results = run_eval(
        model_filter=args.model,
        question_filter=args.question,
        dry_run=args.dry_run,
    )

    if args.dry_run:
        return

    if not results:
        print("No results produced.")
        return

    # Find the results file that was just created
    results_path = find_latest_results()
    if not results_path:
        print("ERROR: Could not find results file.")
        return

    print(f"\n  Phase 2/3: Scoring results...\n")
    run_scorer(results_path, verbose=args.verbose)

    print(f"\n  Phase 3/3: Generating comparison report...\n")
    run_report(results_path)

    print(f"{'='*70}")
    print(f"  ALL DONE")
    print(f"  ")
    print(f"  Next steps:")
    print(f"  1. Open the comparison HTML in your browser")
    print(f"  2. Open the scores CSV in Google Sheets")
    print(f"  3. Fill in human scores (faithfulness, relevance, tone: 1-5)")
    print(f"  4. Review flagged issues")
    print(f"  5. Pick your fine-tune target")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()
