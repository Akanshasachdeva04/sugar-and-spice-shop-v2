import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null); // detail object or null
  const [detailLoading, setDetailLoading] = useState(false);

  function load() {
    setLoading(true);
    api.getUsers().then(setUsers).catch(() => setUsers([])).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function openDetail(u) {
    setDetailLoading(true);
    try {
      setSelected(await api.getUserDetail(u.id));
    } catch {
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function toggleActive(u) {
    await api.setUserActive(u.id, !u.is_active);
    if (selected && selected.id === u.id) openDetail(u);
    load();
  }

  const visibleUsers = search.trim()
    ? users.filter((u) => {
        const q = search.trim().toLowerCase();
        return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || (u.phone || "").includes(q);
      })
    : users;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Customers</h1>
          <p>Everyone who has created an account on the store.</p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search by name, email or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ margin: "0 0 16px", padding: "8px 12px", width: "100%", maxWidth: 320, borderRadius: 8, border: "1px solid #ddd" }}
      />

      {loading ? (
        <p className="muted">Loading…</p>
      ) : visibleUsers.length === 0 ? (
        <div className="empty-state">No customers match.</div>
      ) : (
        <div className="card table-responsive">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => (
                <tr key={u.id}>
                  <td data-label="Name">{u.name}</td>
                  <td data-label="Email">{u.email}</td>
                  <td data-label="Phone">{u.phone || "—"}</td>
                  <td data-label="Status">{u.is_active === false ? "Blocked" : "Active"}</td>
                  <td data-label="">
                    <button className="btn btn-outline btn-sm" onClick={() => openDetail(u)}>View orders</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="card" style={{ marginTop: 20, padding: 20 }}>
          {detailLoading ? (
            <p className="muted">Loading…</p>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h3 style={{ margin: "0 0 4px" }}>{selected.name}</h3>
                  <p className="muted" style={{ margin: 0 }}>{selected.email} · {selected.phone || "no phone"}</p>
                  <p className="muted" style={{ margin: "4px 0 0" }}>
                    {selected.total_orders} order{selected.total_orders === 1 ? "" : "s"} · ₹{selected.total_spent.toLocaleString("en-IN")} spent
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className={`btn btn-sm ${selected.is_active === false ? "btn-primary" : "btn-danger"}`}
                    onClick={() => toggleActive(selected)}
                  >
                    {selected.is_active === false ? "Unblock" : "Block"}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => setSelected(null)}>Close</button>
                </div>
              </div>

              {selected.orders.length === 0 ? (
                <p className="muted" style={{ marginTop: 16 }}>No paid orders yet.</p>
              ) : (
                <div className="table-responsive">
                <table style={{ marginTop: 16 }}>
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.orders.map((o) => (
                      <tr key={o.id}>
                        <td data-label="Order">#{o.id}</td>
                        <td data-label="Date">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                        <td data-label="Items">{o.item_count}</td>
                        <td data-label="Total">₹{Math.round(o.total_amount)}</td>
                        <td data-label="Status">{o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
