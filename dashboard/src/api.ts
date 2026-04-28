// In production (Vercel), set VITE_API_URL to your Render backend URL.
// Locally, the Vite proxy forwards /api → localhost:8000.
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

export interface Deal {
  id: number;
  company: string;
  amount_usd: number | null;
  round_type: string | null;
  sector: string | null;
  lead_investors: string | null;
  deal_date: string | null;
  source_url: string;
  raw_title: string;
  source_name: string | null;
  ingested_at: string;
}

export interface DealsResponse {
  total: number;
  offset: number;
  limit: number;
  deals: Deal[];
}

export interface Stats {
  total_deals: number;
  total_raised_usd_m: number;
  avg_deal_size_usd_m: number;
  by_sector: { sector: string; count: number; total_usd_m: number }[];
  by_round: { round_type: string; count: number; total_usd_m: number }[];
  by_month: { month: string; count: number; total_usd_m: number }[];
  top_investors: { fund: string; deals: number }[];
}

export interface Filters {
  sectors: string[];
  round_types: string[];
}

export async function fetchStats(): Promise<Stats> {
  const r = await fetch(`${BASE}/stats`);
  return r.json();
}

export async function fetchDeals(params: {
  sector?: string;
  round_type?: string;
  min_amount?: number;
  limit?: number;
  offset?: number;
}): Promise<DealsResponse> {
  const q = new URLSearchParams();
  if (params.sector) q.set("sector", params.sector);
  if (params.round_type) q.set("round_type", params.round_type);
  if (params.min_amount != null) q.set("min_amount", String(params.min_amount));
  q.set("limit", String(params.limit ?? 50));
  q.set("offset", String(params.offset ?? 0));
  const r = await fetch(`${BASE}/deals?${q}`);
  return r.json();
}

export async function fetchFilters(): Promise<Filters> {
  const r = await fetch(`${BASE}/filters`);
  return r.json();
}

export async function triggerRefresh(): Promise<{ message: string }> {
  const r = await fetch(`${BASE}/refresh`, { method: "POST" });
  return r.json();
}
