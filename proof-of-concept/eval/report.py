"""
Report generator — creates side-by-side HTML comparison from eval results.

Usage:
    python report.py results/eval-TIMESTAMP.json
"""

import argparse
import html
import json
import os
import sys

import config


# ── Category metadata ───────────────────────────────────────────

CATEGORY_INFO = {
    "C1": {"name": "Live conditions", "color": "#0d9488", "weight": "25%"},
    "C2": {"name": "Resort comparison", "color": "#2563eb", "weight": "15%"},
    "C3": {"name": "Narrative & trip planning", "color": "#7c3aed", "weight": "25%"},
    "C4": {"name": "Edge cases", "color": "#dc2626", "weight": "15%"},
    "C5": {"name": "Conversational quality", "color": "#ca8a04", "weight": "5%"},
    "C6": {"name": "Out-of-scope", "color": "#64748b", "weight": "5%"},
    "C7": {"name": "Prompt injection", "color": "#be123c", "weight": "10%"},
}

MODEL_COLORS = {
    "Llama 3.1 8B": "#2563eb",
    "Qwen 3.5 9B": "#7c3aed",
    "Llama 3.3 70B": "#c2410c",
}


def build_html(results, summary):
    """Build the comparison HTML report."""

    # Group results by question
    by_question = {}
    for r in results:
        qid = r["question_id"]
        if qid not in by_question:
            by_question[qid] = {
                "question": r["question"],
                "category": r["category"],
                "expected": r.get("expected_behavior", ""),
                "constraints": r.get("constraints", []),
                "models": {},
            }
        by_question[qid]["models"][r["model_label"]] = r

    # Sort by question ID
    sorted_questions = sorted(by_question.items(), key=lambda x: x[0])

    # Model order
    model_order = [m["label"] for m in config.MODELS]

    # Build HTML
    parts = []
    parts.append("""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Model Eval Comparison — SnoCountry</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #f7f8fa; color: #1f2937; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 15px; line-height: 1.5; }
  .header { background: linear-gradient(135deg, #1e293b, #0f172a); color: #fff; padding: 24px; }
  .header h1 { margin: 0 0 6px; font-size: 1.4rem; }
  .header .meta { opacity: 0.8; font-size: 0.85rem; }
  .container { max-width: 1100px; margin: 0 auto; padding: 20px; }
  .summary-bar { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
  .summary-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 16px; flex: 1; min-width: 180px; }
  .summary-card .label { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .summary-card .value { font-size: 1.3rem; font-weight: 700; color: #1f2937; margin-top: 2px; }
  .q-section { margin-bottom: 28px; }
  .q-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
  .q-badge { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; font-weight: 700; font-size: 0.85rem; color: #fff; flex-shrink: 0; }
  .q-text { font-size: 1.05rem; font-weight: 600; font-style: italic; color: #1f2937; }
  .q-cat { font-size: 0.78rem; font-weight: 600; padding: 2px 8px; border-radius: 12px; color: #fff; }
  .q-meta { font-size: 0.82rem; color: #6b7280; margin-bottom: 10px; }
  .models-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; }
  .model-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; border-top: 3px solid #e5e7eb; }
  .model-card .m-name { font-weight: 700; font-size: 0.92rem; margin-bottom: 8px; }
  .model-card .m-role { font-size: 0.72rem; font-weight: 600; padding: 1px 6px; border-radius: 10px; margin-left: 6px; }
  .model-card .m-response { font-size: 0.88rem; color: #374151; white-space: pre-wrap; word-break: break-word; background: #f8fafc; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; max-height: 300px; overflow-y: auto; line-height: 1.55; }
  .model-card .m-stats { display: flex; gap: 12px; flex-wrap: wrap; font-size: 0.78rem; color: #6b7280; }
  .model-card .m-stats .stat { display: flex; align-items: center; gap: 4px; }
  .model-card .m-stats .stat-val { font-weight: 600; color: #1f2937; }
  .faith-ok { color: #15803d; }
  .faith-warn { color: #a16207; }
  .faith-bad { color: #b91c1c; }
  .signal-pass { background: #dcfce7; color: #15803d; padding: 1px 6px; border-radius: 8px; font-size: 0.75rem; font-weight: 600; }
  .signal-fail { background: #fee2e2; color: #b91c1c; padding: 1px 6px; border-radius: 8px; font-size: 0.75rem; font-weight: 600; }
  .signal-review { background: #fef9c3; color: #a16207; padding: 1px 6px; border-radius: 8px; font-size: 0.75rem; font-weight: 600; }
  .unverified { margin-top: 6px; font-size: 0.78rem; color: #b91c1c; }
  hr { border: none; border-top: 1px dashed #cbd5e1; margin: 24px 0; }
  .footer { text-align: center; color: #6b7280; font-size: 0.78rem; margin: 30px 0 16px; }
</style>
</head>
<body>
""")

    # Header
    parts.append(f"""
<div class="header">
  <h1>Model Eval Comparison &mdash; SnoCountry RAG Chat</h1>
  <div class="meta">{summary.get('timestamp', '')} &bull; {len(sorted_questions)} questions &times; {len(model_order)} models &bull; Total cost: ${summary.get('total_cost_usd', 0):.4f}</div>
</div>
<div class="container">
""")

    # Summary bar
    parts.append('<div class="summary-bar">')
    for m in config.MODELS:
        label = m["label"]
        model_results = [r for r in results if r["model_label"] == label and not r.get("response", {}).get("error")]
        total_cost = sum(r.get("cost_usd", 0) for r in model_results)
        avg_latency = sum(r.get("response", {}).get("latency_ms", 0) for r in model_results) / max(len(model_results), 1)
        color = MODEL_COLORS.get(label, "#64748b")
        parts.append(f"""
  <div class="summary-card" style="border-top: 3px solid {color};">
    <div class="label">{html.escape(label)} ({m['role']})</div>
    <div class="value">${total_cost:.4f}</div>
    <div class="label" style="margin-top:4px;">Avg latency: {avg_latency:.0f}ms</div>
  </div>""")
    parts.append('</div>')

    # Questions
    for qid, qdata in sorted_questions:
        cat = qdata["category"]
        cat_info = CATEGORY_INFO.get(cat, {"name": cat, "color": "#64748b", "weight": "?"})

        parts.append(f"""
<div class="q-section">
  <div class="q-header">
    <div class="q-badge" style="background:{cat_info['color']};">{html.escape(qid)}</div>
    <div class="q-text">&ldquo;{html.escape(qdata['question'])}&rdquo;</div>
    <span class="q-cat" style="background:{cat_info['color']};">{html.escape(cat_info['name'])} ({cat_info['weight']})</span>
  </div>
  <div class="q-meta">
    <strong>Expected:</strong> {html.escape(qdata['expected'])}
""")
        if qdata.get("constraints"):
            parts.append(f"    &bull; <strong>Constraints:</strong> {', '.join(qdata['constraints'])}")
        parts.append("  </div>")

        parts.append('  <div class="models-grid">')

        for model_label in model_order:
            r = qdata["models"].get(model_label)
            if not r:
                continue

            resp = r.get("response", {})
            color = MODEL_COLORS.get(model_label, "#64748b")
            role = r.get("model_role", "")
            role_bg = {"benchmark": "#fef3c7", "fine-tune-target": "#dbeafe", "contender": "#ede9fe"}.get(role, "#f1f5f9")
            role_color = {"benchmark": "#92400e", "fine-tune-target": "#1d4ed8", "contender": "#6d28d9"}.get(role, "#64748b")

            if resp.get("error"):
                content_html = f"<em>ERROR: {html.escape(str(resp.get('message', ''))[:200])}</em>"
                stats_html = ""
            else:
                content = resp.get("content", "")
                content_html = html.escape(content)

                # Faithfulness
                from scorer import check_faithfulness, check_signals
                faith = check_faithfulness(content, r.get("faithfulness_values", []))
                signals = check_signals(content, r.get("fail_signals", []), r.get("pass_signals", []))

                faith_class = "faith-ok" if faith["ratio"] >= 0.9 else ("faith-warn" if faith["ratio"] >= 0.7 else "faith-bad")

                stats_parts = []
                stats_parts.append(f'<span class="stat"><span class="stat-val">{len(content.split())}</span> words</span>')
                stats_parts.append(f'<span class="stat"><span class="stat-val">{resp.get("latency_ms", 0)}</span>ms</span>')
                stats_parts.append(f'<span class="stat"><span class="stat-val">${r.get("cost_usd", 0):.4f}</span></span>')
                stats_parts.append(f'<span class="stat"><span class="stat-val">{resp.get("input_tokens", 0)}+{resp.get("output_tokens", 0)}</span> tok</span>')

                if faith["total_checked"] > 0:
                    stats_parts.append(f'<span class="stat {faith_class}">faith: <span class="stat-val">{faith["ratio"]*100:.0f}%</span></span>')

                if signals["status"] == "PASS":
                    stats_parts.append('<span class="signal-pass">PASS</span>')
                elif signals["status"] == "FAIL":
                    stats_parts.append('<span class="signal-fail">FAIL</span>')
                elif signals["status"] == "REVIEW":
                    stats_parts.append('<span class="signal-review">REVIEW</span>')

                stats_html = f'<div class="m-stats">{"".join(stats_parts)}</div>'

                # Unverified numbers warning
                if faith["unverified"]:
                    stats_html += f'<div class="unverified">Unverified numbers: {", ".join(faith["unverified"])}</div>'

            parts.append(f"""
    <div class="model-card" style="border-top-color:{color};">
      <div class="m-name" style="color:{color};">{html.escape(model_label)}<span class="m-role" style="background:{role_bg};color:{role_color};">{role}</span></div>
      <div class="m-response">{content_html}</div>
      {stats_html}
    </div>""")

        parts.append('  </div>')
        parts.append('</div>')
        parts.append('<hr>')

    parts.append("""
<div class="footer">
  Model Eval Comparison &bull; SnoCountry AI Chat Concept &bull; Generated by eval/report.py
</div>
</div>
</body>
</html>""")

    return "\n".join(parts)


# ── Main ────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="SnoCountry Eval Report Generator")
    parser.add_argument("results_file", help="Path to eval results JSON")
    args = parser.parse_args()

    if not os.path.exists(args.results_file):
        print(f"ERROR: File not found: {args.results_file}")
        sys.exit(1)

    with open(args.results_file, "r") as f:
        data = json.load(f)

    results = data.get("results", [])
    summary = data.get("summary", {})
    summary["timestamp"] = data.get("timestamp", "")

    if not results:
        print("No results found in file.")
        sys.exit(1)

    report_html = build_html(results, summary)

    output_path = args.results_file.replace(".json", "-comparison.html")
    with open(output_path, "w") as f:
        f.write(report_html)

    print(f"\nComparison report: {output_path}")
    print(f"Open in browser to review side-by-side model responses.\n")


if __name__ == "__main__":
    main()
