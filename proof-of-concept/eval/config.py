"""
Eval configuration — API keys, model IDs, token limits.

Set TOGETHER_API_KEY as an environment variable before running.
"""

import os

# ── Together.ai API ──────────────────────────────────────────────
TOGETHER_API_KEY = os.environ.get("TOGETHER_API_KEY", "")
TOGETHER_BASE_URL = "https://api.together.xyz/v1/chat/completions"

# ── Models under evaluation ─────────────────────────────────────
MODELS = [
    {
        "id": "meta-llama/Meta-Llama-3.1-8B-Instruct-Reference",
        "label": "Llama 3.1 8B",
        "role": "fine-tune-target",
        "cost_per_m_input": 0.14,
        "cost_per_m_output": 0.14,
    },
    {
        "id": "Qwen/Qwen3.5-9B",
        "label": "Qwen 3.5 9B",
        "role": "contender",
        "cost_per_m_input": 0.17,
        "cost_per_m_output": 0.25,
    },
    {
        "id": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        "label": "Llama 3.3 70B",
        "role": "benchmark",
        "cost_per_m_input": 1.04,
        "cost_per_m_output": 1.04,
    },
]

# ── Generation parameters (fixed across all models) ─────────────
TEMPERATURE = 0          # Deterministic for reproducibility
MAX_TOKENS = 350         # Matches production token budget
TOP_P = 1.0
STOP_SEQUENCES = []      # Let the model finish naturally

# ── Paths ────────────────────────────────────────────────────────
EVAL_DIR = os.path.dirname(os.path.abspath(__file__))
FIXTURES_DIR = os.path.join(EVAL_DIR, "fixtures")
RESULTS_DIR = os.path.join(EVAL_DIR, "results")
RAW_DIR = os.path.join(RESULTS_DIR, "raw")

# ── Scoring ──────────────────────────────────────────────────────
# Numbers to ignore in faithfulness checking (years, common qualifiers)
FAITHFULNESS_IGNORE = {
    "0", "1", "2", "3", "4", "5",                # ordinals / counts
    "2024", "2025", "2026", "2027",               # years
    "24", "48", "72",                             # hour windows
    "100",                                        # "100%" or "over 100"
}
