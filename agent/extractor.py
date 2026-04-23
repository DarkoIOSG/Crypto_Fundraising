"""LLM-based structured extraction from fundraising article titles/summaries.

Uses Groq (free tier). Swap GROQ_API_KEY → ANTHROPIC_API_KEY and update the
client call to switch to Claude later.
"""

import json
import logging
import os

from groq import Groq

logger = logging.getLogger(__name__)

_client = Groq(api_key=os.environ["GROQ_API_KEY"])
_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

_SYSTEM_PROMPT = """You are a financial data extractor specialised in crypto fundraising.
Given the title and summary of a news article, return ONLY a JSON object with these fields:
{
  "company": "<company or project name, string>",
  "amount_usd": <amount raised in USD millions as a float, or null>,
  "round_type": "<Seed | Pre-Seed | Series A | Series B | Series C | Strategic | Grant | Other | null>",
  "sector": "<DeFi | Infrastructure | NFT | Gaming | CeFi | Layer 1 | Layer 2 | Privacy | AI | Other | null>",
  "lead_investors": "<comma-separated investor names, or null>",
  "deal_date": "<YYYY-MM-DD if mentioned, else null>"
}
If the article is NOT about a fundraising/investment event, return {"skip": true}.
Return ONLY valid JSON, no markdown, no explanation."""


def extract(title: str, summary: str, pub_date: str = "") -> dict | None:
    """Return extracted deal dict, or None if not a fundraising article."""
    user_msg = f"Title: {title}\nSummary: {summary[:800]}\nPublished: {pub_date}"
    try:
        resp = _client.chat.completions.create(
            model=_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            temperature=0,
            max_tokens=256,
        )
        raw = resp.choices[0].message.content.strip()
        data = json.loads(raw)
        if data.get("skip"):
            return None
        data["_raw"] = raw
        return data
    except (json.JSONDecodeError, Exception) as e:
        logger.warning("Extraction failed for '%s': %s", title, e)
        return None
