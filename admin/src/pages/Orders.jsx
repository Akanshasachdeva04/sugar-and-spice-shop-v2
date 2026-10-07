import { Fragment, useEffect, useState } from "react";
import { api } from "../api/client";
import "./Orders.css";

// "paid" = customer has paid, order is waiting for you to pack and ship it.
// (Unpaid checkouts are never shown here — an order only appears after the payment succeeds.)
const STATUSES = ["paid", "shipped", "delivered", "cancelled", "refunded"];
const LABELS = {
  paid: "New (Paid)",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [exporting, setExporting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setOrders(await api.getAllOrders(filter || undefined));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filter]);

  async function handleStatusChange(order, status) {
    await api.updateOrderStatus(order.id, status);
    load();
  }

  async function handleExport() {
    setExporting(true);
    try {
      await api.exportOrdersCsv(filter || undefined);
    } catch {
      // silently ignore — button just stops spinning
    } finally {
      setExporting(false);
    }
  }

  const visibleOrders = search.trim()
    ? orders.filter((o) => {
        const q = search.trim().toLowerCase();
        return String(o.id).includes(q) || (o.phone || "").toLowerCase().includes(q);
      })
    : orders;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Orders</h1>
          <p>Orders appear here only after the customer has paid. Tap an order to see the address and items.</p>
        </div>
        <button className="btn btn-outline" onClick={handleExport} disabled={exporting}>
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <div className="filter-tabs">
        <button className={filter === "" ? "active" : ""} onClick={() => setFilter("")}>All</button>
        {STATUSES.map((s) => (
          <button key={s} className={filter === s ? "active" : ""} onClick={() => setFilter(s)}>
            {LABELS[s]}
          </button>
        ))}
      </div>

      <input
        className="orders-search"
        type="text"
        placeholder="Search by order ID or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ margin: "12px 0", padding: "8px 12px", width: "100%", maxWidth: 320, borderRadius: 8, border: "1px solid #ddd" }}
      />

      {loading ? (
        <p className="muted">Loading…</p>
      ) : visibleOrders.length === 0 ? (
        <div className="empty-state">No orders match.</div>
      ) : (
        <div className="card orders-card">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Items</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Update status</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order) => (
                <Fragment key={order.id}>
                  <tr className="order-row" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                    <td data-label="Order">#{order.id}</td>
                    <td data-label="Items">
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        {order.items.slice(0, 3).map((item) => (
                          <div key={item.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {item.image_url && <img src={item.image_url} alt="" style={{ width: 36, height: 44, objectFit: "cover", borderRadius: 4 }} />}
                            <div style={{ fontSize: 12, lineHeight: 1.3 }}>
                              <strong>{item.product_code || "-"}</strong>
                              <div>{[item.size, "x" + item.quantity].filter(Boolean).join(" ")}</div>
                            </div>
                          </div>
                        ))}
                        {order.items.length > 3 && <span className="muted">+{order.items.length - 3} more</span>}
                      </div>
                    </td>
                    <td data-label="Date">{new Date(order.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                    <td data-label="Total">₹{Math.round(order.total_amount)}</td>
                    <td data-label="Status"><span className={`badge badge-${order.status}`}>{LABELS[order.status] || order.status}</span></td>
                    <td data-label="Update status" onClick={(e) => e.stopPropagation()}>
                      <select value={order.status} onChange={(e) => handleStatusChange(order, e.target.value)}>
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  {expanded === order.id && (
                    <tr className="order-detail-row">
                      <td colSpan={6}>
                        <div className="order-detail">
                          <div><strong>Delivery address:</strong> {order.shipping_address}</div>
                          <div><strong>Phone:</strong> <a className="tel-link" href={`tel:${order.phone}`}>{order.phone}</a></div>
                          <div className="order-detail-items">
                            {order.items.map((item) => (
                              <div key={item.id} style={{ display: "flex", gap: 10, alignItems: "center", margin: "8px 0" }}>
                                {item.image_url && <img src={item.image_url} alt="" style={{ width: 56, height: 70, objectFit: "cover", borderRadius: 6 }} />}
                                <div>
                                  <div><strong>{item.product_name}</strong></div>
                                  <div>Code: {item.product_code || "-"}{item.size ? " | Size: " + item.size : ""}</div>
                                  <div>Qty: {item.quantity} | {"\u20B9"}{Math.round(item.price * item.quantity)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
