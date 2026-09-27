import { useEffect, useState } from "react";
import { api } from "../api/client";
import "./Dashboard.css";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const cards = stats ? [
    { label: "Total revenue", value: `₹${stats.total_revenue.toLocaleString("en-IN")}`, tone: "primary" },
    { label: "Paid orders", value: stats.total_orders },
    { label: "New orders to ship", value: stats.pending_orders, tone: stats.pending_orders > 0 ? "amber" : null },
    { label: "Active products", value: stats.total_products },
    { label: "Customers", value: stats.total_users },
    { label: "Low stock variants", value: stats.low_stock_variants, tone: stats.low_stock_variants > 0 ? "red" : null },
  ] : [];

  return (
    <div>
      <div className="page-head">
        <h1>Dashboard</h1>
        <p>An overview of how the store is doing.</p>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="stats-grid">
          {cards.map((c) => (
            <div key={c.label} className={`stat-card ${c.tone ? `stat-${c.tone}` : ""}`}>
              <div className="stat-value">{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {stats?.pending_orders > 0 && (
        <div className="callout">
          You have {stats.pending_orders} order{stats.pending_orders > 1 ? "s" : ""} waiting to be packed and shipped —
          check the Orders tab.
        </div>
      )}
      {stats?.low_stock_variants > 0 && (
        <div className="callout callout-amber">
          {stats.low_stock_variants} product size{stats.low_stock_variants > 1 ? "s are" : " is"} running low on
          stock (5 or fewer left) — check the Products tab.
        </div>
      )}
    </div>
  );
}
