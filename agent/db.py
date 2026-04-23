"""Database models. Uses Postgres in production (Supabase), SQLite locally."""

import os
from datetime import datetime
from typing import Optional

from sqlmodel import Field, Session, SQLModel, create_engine, select

_raw_url = os.getenv("DATABASE_URL", "sqlite:///fundraising.db")
# Supabase/Heroku Postgres URLs use postgres://, SQLAlchemy needs postgresql://
DATABASE_URL = _raw_url.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL, echo=False)


class Deal(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    company: str
    amount_usd: Optional[float] = None
    round_type: Optional[str] = None
    sector: Optional[str] = None
    lead_investors: Optional[str] = None
    deal_date: Optional[str] = None
    source_url: str = Field(index=True, unique=True)
    raw_title: str
    source_name: Optional[str] = None
    ingested_at: datetime = Field(default_factory=datetime.utcnow)
    extraction_raw: Optional[str] = None


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def url_exists(url: str) -> bool:
    with Session(engine) as session:
        return session.exec(select(Deal).where(Deal.source_url == url)).first() is not None


def save_deal(deal: Deal) -> None:
    with Session(engine) as session:
        session.add(deal)
        session.commit()
