import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setPayments(await api.getPayments());
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRefund(payment) {
    if (!window.confirm(`Mark payment for Order #${payment.order_id} as refunded?\n\nThis only updates our records — you still need to process the actual refund from your Razorpay dashboard.`)) return;
    await api.markRefunded(payment.id);
    load();
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Payments</h1>
          <p>All payment attempts and their status. Refunds must be issued from your Razorpay dashboard — this just tracks status here.</p>
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : payments.length === 0 ? (
        <div className="empty-state">No payments yet.</div>
      ) : (
        <div className="card table-responsive">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Amount</th>
                <th>Razorpay payment ID</th>
                <th>Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td data-label="Order">#{p.order_id}</td>
                  <td data-label="Amount">₹{Math.round(p.amount)}</td>
                  <td data-label="Razorpay payment ID" className="mono">{p.razorpay_payment_id || "—"}</td>
                  <td data-label="Date">{new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td data-label="Status"><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                  <td data-label="">
                    {p.status === "captured" && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleRefund(p)}>Mark refunded</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
