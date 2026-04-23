"""Feed ingestion — called directly by GitHub Actions or the /refresh endpoint."""

import logging
import time

import feedparser
from dotenv import load_dotenv

load_dotenv()

from agent.db import Deal, deal_exists, init_db, save_deal, url_exists
from agent.extractor import extract
from agent.feeds import FEEDS, is_fundraising_item

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

GROQ_DELAY_SECONDS = 2.5  # stay under 30 req/min free tier limit


def ingest_feeds() -> int:
    """Fetch all RSS feeds, extract deals, persist new ones. Returns count saved."""
    saved = 0
    for feed_url in FEEDS:
        try:
            parsed = feedparser.parse(feed_url)
            source_name = parsed.feed.get("title", feed_url)
            for entry in parsed.entries:
                url = entry.get("link", "")
                if not url or url_exists(url):
                    continue

                title = entry.get("title", "")
                summary = entry.get("summary", entry.get("description", ""))
                pub_date = entry.get("published", "")

                if not is_fundraising_item(title, summary):
                    continue

                data = extract(title, summary, pub_date)
                time.sleep(GROQ_DELAY_SECONDS)  # respect rate limit
                if not data:
                    continue

                company = data.get("company", "Unknown")
                amount = data.get("amount_usd")
                round_type = data.get("round_type")
                deal_date = data.get("deal_date")

                if deal_exists(company, deal_date):
                    logger.info("Skipped duplicate: %s on %s", company, deal_date)
                    continue

                deal = Deal(
                    company=company,
                    amount_usd=amount,
                    round_type=round_type,
                    sector=data.get("sector"),
                    lead_investors=data.get("lead_investors"),
                    deal_date=deal_date,
                    source_url=url,
                    raw_title=title,
                    source_name=source_name,
                    extraction_raw=data.get("_raw"),
                )
                save_deal(deal)
                saved += 1
                logger.info("Saved: %s — $%sM (%s)", company, amount, round_type)
        except Exception as e:
            logger.error("Failed feed %s: %s", feed_url, e)

    logger.info("Done — %d new deals saved", saved)
    return saved


if __name__ == "__main__":
    init_db()
    ingest_feeds()
