"""FastAPI backend — serves deal data to the dashboard."""

import os
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, col, func, select

from agent.db import Deal, engine, init_db
from agent.scheduler import ingest_feeds


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Crypto Fundraising API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/deals")
def get_deals(
    sector: Optional[str] = None,
    round_type: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    limit: int = Query(50, le=200),
    offset: int = 0,
):
    with Session(engine) as session:
        q = select(Deal)
        if sector:
            q = q.where(Deal.sector == sector)
        if round_type:
            q = q.where(Deal.round_type == round_type)
        if min_amount is not None:
            q = q.where(Deal.amount_usd >= min_amount)
        if max_amount is not None:
            q = q.where(Deal.amount_usd <= max_amount)
        q = q.order_by(col(Deal.ingested_at).desc()).offset(offset).limit(limit)
        deals = session.exec(q).all()
        total = session.exec(select(func.count(col(Deal.id)))).one()
    return {"total": total, "offset": offset, "limit": limit, "deals": deals}


@app.get("/stats")
def get_stats():
    with Session(engine) as session:
        total_deals = session.exec(select(func.count(col(Deal.id)))).one()
        total_raised = session.exec(select(func.sum(Deal.amount_usd))).one() or 0.0

        sector_rows = session.exec(
            select(Deal.sector, func.count(col(Deal.id)), func.sum(Deal.amount_usd))
            .group_by(Deal.sector)
        ).all()
        by_sector = [
            {"sector": r[0] or "Unknown", "count": r[1], "total_usd_m": round(r[2] or 0, 2)}
            for r in sector_rows
        ]

        round_rows = session.exec(
            select(Deal.round_type, func.count(col(Deal.id)), func.sum(Deal.amount_usd))
            .group_by(Deal.round_type)
        ).all()
        by_round = [
            {"round_type": r[0] or "Unknown", "count": r[1], "total_usd_m": round(r[2] or 0, 2)}
            for r in round_rows
        ]

        month_rows = session.exec(
            select(
                func.to_char(Deal.ingested_at, "YYYY-MM") if "postgresql" in str(engine.url) else func.strftime("%Y-%m", Deal.ingested_at),
                func.count(col(Deal.id)),
                func.sum(Deal.amount_usd),
            ).group_by(
                func.to_char(Deal.ingested_at, "YYYY-MM") if "postgresql" in str(engine.url) else func.strftime("%Y-%m", Deal.ingested_at)
            )
        ).all()
        by_month = [
            {"month": r[0], "count": r[1], "total_usd_m": round(r[2] or 0, 2)}
            for r in month_rows
        ]

    avg_deal = round(total_raised / total_deals, 2) if total_deals else 0.0
    return {
        "total_deals": total_deals,
        "total_raised_usd_m": round(total_raised, 2),
        "avg_deal_size_usd_m": avg_deal,
        "by_sector": by_sector,
        "by_round": by_round,
        "by_month": by_month,
    }


@app.post("/refresh")
def manual_refresh():
    saved = ingest_feeds()
    return {"message": f"Ingestion complete — {saved} new deals saved"}


@app.get("/filters")
def get_filters():
    with Session(engine) as session:
        sector_rows = session.exec(select(Deal.sector).distinct()).all()
        round_rows = session.exec(select(Deal.round_type).distinct()).all()
    sectors = sorted([r for r in sector_rows if r])
    rounds = sorted([r for r in round_rows if r])
    return {"sectors": sectors, "round_types": rounds}
