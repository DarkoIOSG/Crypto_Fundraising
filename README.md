# Crypto Fundraising Tracker

Automated dashboard that monitors crypto project fundraising news from 8 RSS feeds, extracts structured deal data using an LLM, stores it in PostgreSQL, and displays it in a live web dashboard.

---

## How it works

```
RSS Feeds (8 sources)
      ↓
Keyword filter (raises, seed, series A, etc.)
      ↓
Groq LLM → extracts company, amount, round type, sector, investors
      ↓
Supabase PostgreSQL (stores deals)
      ↓
FastAPI (serves data via REST)
      ↓
React Dashboard (Vercel)
```

### 1. Ingestion Agent (`agent/`)

- **`feeds.py`** — list of 8 RSS feed URLs (The Block, CoinDesk, CoinTelegraph, Decrypt, Blockworks, DLNews, Crypto Briefing, The Defiant) and a keyword filter that pre-screens articles before sending to the LLM
- **`extractor.py`** — sends article title + summary to Groq (llama-3.1-8b-instant) and returns structured JSON: company name, amount in USD millions, round type, sector, lead investors, deal date
- **`db.py`** — SQLModel schema for the `deal` table; supports SQLite locally and PostgreSQL in production
- **`scheduler.py`** — runs the full ingestion pipeline; deduplicates by URL so articles are never processed twice

### 2. API (`api/`)

FastAPI backend with four endpoints:

| Endpoint | Description |
|---|---|
| `GET /deals` | Paginated deal list, filterable by sector / round type / amount |
| `GET /stats` | Aggregates: total raised, deals by sector, by round type, by month |
| `GET /filters` | Distinct sector and round type values for dropdown filters |
| `POST /refresh` | Manually trigger an ingestion run |

### 3. Dashboard (`dashboard/`)

React + Vite + Recharts single-page app with:
- KPI cards: total deals, total raised, average deal size, sectors tracked
- Bar chart: deal count by sector
- Line chart: capital raised by month
- Bar chart: capital raised by round type
- Filterable table: all deals with sector / round type dropdowns
- Auto-refreshes every 5 minutes

---

## Tech stack

| Layer | Technology |
|---|---|
| LLM extraction | Groq API (llama-3.1-8b-instant) — free tier |
| Database | Supabase PostgreSQL — free tier |
| API | FastAPI + Uvicorn |
| ORM | SQLModel (SQLAlchemy) |
| Frontend | React + Vite + Recharts |
| API hosting | Render — free tier |
| Dashboard hosting | Vercel — free tier |
| Scheduled ingestion | GitHub Actions — free tier |

---

## Running locally

```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Set environment variables
cp .env.example .env   # fill in GROQ_API_KEY and DATABASE_URL

# 3. Run ingestion manually
python3 -m agent.scheduler

# 4. Start API + dashboard
./run.sh
# API:       http://localhost:8000
# Docs:      http://localhost:8000/docs
# Dashboard: http://localhost:5173
```

---

## Deployment

### Environment variables

| Variable | Where to set | Value |
|---|---|---|
| `GROQ_API_KEY` | Render + GitHub Secrets | Groq API key |
| `DATABASE_URL` | Render + GitHub Secrets | Supabase connection string |
| `VITE_API_URL` | Vercel | Render service URL |

### Automated ingestion (GitHub Actions)

The workflow in `.github/workflows/ingest.yml` runs `python3 -m agent.scheduler` four times per day (00:00, 06:00, 12:00, 18:00 UTC). It reads `GROQ_API_KEY` and `DATABASE_URL` from GitHub repository secrets.

To trigger manually: GitHub repo → Actions → Ingest RSS Feeds → Run workflow.

### Switching from Groq to Anthropic Claude

1. Replace `GROQ_API_KEY` with `ANTHROPIC_API_KEY` in all env vars
2. Update `agent/extractor.py` — swap the Groq client for the Anthropic SDK
3. Recommended model: `claude-haiku-4-5` (fast and cheap for extraction tasks)

---

## RSS Feed Sources

- The Block
- CoinDesk
- CoinTelegraph
- Decrypt
- Blockworks
- DLNews
- Crypto Briefing
- The Defiant
