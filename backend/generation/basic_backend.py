import ollama
import json
from generation.base import Base

MODEL = "llama3.2"
#size of the model's working memory in tokens
CONTEXT_WINDOW= 4096 #sized for gtx1650


def _grab(response, key: str) -> int:
    try:
        value = response[key]
    except (KeyError, TypeError, IndexError):
        value = None
    return int(value) if value else 0

class BasicBackend(Base):
    def generate(self, query: str, chunks: list[str]) -> dict:
        context = "\n\n".join(f"[{i + 1}] {c}" for i, c in enumerate(chunks))

        prompt = (
            "You are a fraud-detection assistant analyzing a document.\n"
            "Perform TWO separate tasks using ONLY the context below:\n"
            "1. SUMMARY: Answer the user's question. If the question is unrelated "
            "to fraud, just answer it plainly.\n"
            "2. RISK SCAN: INDEPENDENTLY of the question, scan the context for fraud "
            "indicators — artificial urgency/pressure, changed or offshore bank "
            "details, missing/verbal-only approvals, amounts just under approval "
            "thresholds, duplicate invoices, missing deliverables, unverified or "
            "newly-added vendors, requests not to verify. Always perform this scan "
            "even if the question is not about fraud.\n"
            "Respond with a JSON object EXACTLY in this shape:\n"
            "{\n"
            '  "summary": "<answer to the user question, plain text>",\n'
            '  "risk_level": "<one of: low, medium, high>",\n'
            '  "risk_score": <integer 0-100>,\n'
            '  "factors": [\n'
            '    {"name": "<short risk factor>", "weight": <integer 0-100>}\n'
            "  ]\n"
            "}\n"
            "If the context genuinely contains no fraud indicators, use low risk, "
            "score 0, and an empty factors list.\n\n"
            f"Context:\n{context}\n\nQuestion: {query}"
        )


        response = ollama.chat(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            format="json",
            options={"temperature": 0, "num_ctx": CONTEXT_WINDOW},
        )

        raw = response["message"]["content"]

        try:
            data = json.loads(raw)
            finding = data.get("summary", raw)
            risk_level = data.get("risk_level", "unknown")
            risk_score = int(data.get("risk_score", 0))
            factors = data.get("factors", [])

        except (json.JSONDecodeError, ValueError, TypeError):
            finding = raw
            risk_level = "unknown"
            risk_score = 0
            factors = []

        prompt_tokens = _grab(response, "prompt_eval_count")
        completion_tokens = _grab(response, "eval_count")

        return {
            "finding": finding,
            "sources": chunks,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "factors": factors,
            "confidence": 0.0,
            "mode": "basic (structured risk)",
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens,
                "context_window": CONTEXT_WINDOW
            }
        }