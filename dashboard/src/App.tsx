import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { RefreshCw, TrendingUp, DollarSign, Hash, Zap } from "lucide-react";
import {
  fetchStats, fetchDeals, fetchFilters, triggerRefresh,
  type Stats, type Deal, type Filters,
} from "./api";

const COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e", "#a78bfa", "#34d399"];

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "#1a1d27", borderRadius: 12, padding: "20px 24px", border: "1px solid #2a2d3a" }}>
      <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function fmtM(v: number | null | undefined): string {
  if (v == null) return "—";
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}B`;
  return `$${v.toFixed(1)}M`;
}

const card: React.CSSProperties = { background: "#1a1d27", borderRadius: 12, border: "1px solid #2a2d3a", padding: 20 };
const th: React.CSSProperties = { padding: "10px 14px", color: "#94a3b8", fontWeight: 500, fontSize: 11, textAlign: "left", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "10px 14px", fontSize: 12, borderTop: "1px solid #1f2230" };

export default function App() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filters, setFilters] = useState<Filters>({ sectors: [], round_types: [] });
  const [sector, setSector] = useState("");
  const [roundType, setRoundType] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, d, f] = await Promise.all([
        fetchStats(),
        fetchDeals({ sector: sector || undefined, round_type: roundType || undefined, limit: 50 }),
        fetchFilters(),
      ]);
      setStats(s);
      setDeals(d.deals);
      setFilters(f);
    } finally {
      setLoading(false);
    }
  }, [sector, roundType]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshMsg("");
    const res = await triggerRefresh();
    setRefreshMsg(res.message);
    setRefreshing(false);
    load();
  }

  const selectStyle: React.CSSProperties = {
    fontSize: 12, background: "#0f1117", border: "1px solid #2a2d3a",
    borderRadius: 6, padding: "4px 8px", color: "#cbd5e1",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #2a2d3a", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Zap size={20} color="#818cf8" />
          <span style={{ fontWeight: 600, fontSize: 16, color: "#fff" }}>Crypto Fundraising Tracker</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 13,
            background: refreshing ? "#4338ca" : "#4f46e5", color: "#fff",
            border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer",
          }}
        >
          <RefreshCw size={13} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          {refreshing ? "Refreshing…" : "Refresh now"}
        </button>
      </header>

      {refreshMsg && (
        <div style={{ margin: "12px 24px 0", fontSize: 12, color: "#34d399", background: "#064e3b33", border: "1px solid #065f4633", borderRadius: 8, padding: "8px 12px" }}>
          {refreshMsg}
        </div>
      )}

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          <KpiCard label="Total Deals" value={stats ? String(stats.total_deals) : "—"} />
          <KpiCard label="Total Raised" value={stats ? fmtM(stats.total_raised_usd_m) : "—"} sub="across all tracked deals" />
          <KpiCard label="Avg Deal Size" value={stats ? fmtM(stats.avg_deal_size_usd_m) : "—"} />
          <KpiCard label="Sectors Tracked" value={stats ? String(stats.by_sector.length) : "—"} />
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={card}>
            <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingUp size={14} color="#818cf8" /> Deals by Sector
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats?.by_sector ?? []} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis type="number" stroke="#475569" tick={{ fontSize: 11 }} />
                <YAxis dataKey="sector" type="category" stroke="#475569" tick={{ fontSize: 11 }} width={90} />
                <Tooltip contentStyle={{ background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v} deals`, "Count"]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {(stats?.by_sector ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={card}>
            <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
              <DollarSign size={14} color="#34d399" /> Raised by Month ($M)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={stats?.by_month ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
                <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11 }} />
                <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`$${v}M`, "Raised"]} />
                <Line type="monotone" dataKey="total_usd_m" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Round type */}
        <div style={card}>
          <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
            <Hash size={14} color="#fbbf24" /> Capital Raised by Round Type ($M)
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats?.by_round ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3a" />
              <XAxis dataKey="round_type" stroke="#475569" tick={{ fontSize: 11 }} />
              <YAxis stroke="#475569" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#1a1d27", border: "1px solid #2a2d3a", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`$${v}M`, "Raised"]} />
              <Bar dataKey="total_usd_m" radius={[4, 4, 0, 0]}>
                {(stats?.by_round ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Deals table */}
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #2a2d3a", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 500 }}>Recent Deals</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <select style={selectStyle} value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="">All Sectors</option>
                {filters.sectors.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select style={selectStyle} value={roundType} onChange={(e) => setRoundType(e.target.value)}>
                <option value="">All Rounds</option>
                {filters.round_types.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b", fontSize: 13 }}>Loading…</div>
          ) : deals.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
              No deals yet — click <strong style={{ color: "#818cf8" }}>Refresh now</strong> to pull from RSS feeds.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#161820" }}>
                    {["Company", "Amount", "Round", "Sector", "Lead Investors", "Date", "Source"].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deals.map((d) => (
                    <tr key={d.id} style={{ transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#1f2230")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ ...td, fontWeight: 600, color: "#f1f5f9" }}>{d.company}</td>
                      <td style={{ ...td, color: "#34d399", fontFamily: "monospace" }}>{fmtM(d.amount_usd)}</td>
                      <td style={td}>
                        <span style={{ background: "#312e81", color: "#a5b4fc", padding: "2px 7px", borderRadius: 4, fontSize: 10 }}>
                          {d.round_type ?? "—"}
                        </span>
                      </td>
                      <td style={{ ...td, color: "#cbd5e1" }}>{d.sector ?? "—"}</td>
                      <td style={{ ...td, color: "#94a3b8", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.lead_investors ?? "—"}</td>
                      <td style={{ ...td, color: "#94a3b8", whiteSpace: "nowrap" }}>{d.deal_date ?? d.ingested_at.slice(0, 10)}</td>
                      <td style={td}>
                        <a href={d.source_url} target="_blank" rel="noopener noreferrer"
                          style={{ color: "#818cf8", textDecoration: "underline", fontSize: 11 }}>
                          {d.source_name ?? "link"}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
