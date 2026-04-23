"""RSS feed sources for crypto fundraising news."""

FEEDS = [
    # The Block
    "https://www.theblock.co/rss.xml",
    # CoinDesk
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    # CoinTelegraph
    "https://cointelegraph.com/rss",
    # Decrypt
    "https://decrypt.co/feed",
    # Blockworks
    "https://blockworks.co/feed",
    # DLNews
    "https://www.dlnews.com/rss/",
    # Crypto Briefing
    "https://cryptobriefing.com/feed/",
    # The Defiant
    "https://thedefiant.io/feed",
]

FUNDRAISING_KEYWORDS = [
    "raises", "raised", "funding", "fundraise", "round", "seed", "series a",
    "series b", "series c", "investment", "investors", "backed", "valuation",
    "pre-seed", "grant", "capital", "million", "billion",
]


def is_fundraising_item(title: str, summary: str) -> bool:
    text = (title + " " + summary).lower()
    return any(kw in text for kw in FUNDRAISING_KEYWORDS)
