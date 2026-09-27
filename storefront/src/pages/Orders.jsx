import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import "./Orders.css";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMyOrders().then(setOrders).catch(() => setOrders([])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container pd-status">Loading…</div>;

  if (orders.length === 0) {
    return (
      <div className="container cart-empty">
        <h1>No orders yet</h1>
        <p>Your order history will show up here once you place one.</p>
        <Link to="/shop" className="btn btn-primary">Start shopping</Link>
      </div>
    );
  }

  return (
    <div className="container orders-page">
      <h1>My orders</h1>
      <ul className="orders-list">
        {orders.map((order) => (
          <li key={order.id} className="order-card">
            <div className="order-card-head">
              <div>
                <strong>Order #{order.id}</strong>
                <span className="order-date">{new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              <span className={`status-pill status-${order.status}`}>{order.status}</span>
            </div>
            <ul className="order-items">
              {order.items.map((item) => (
                <li key={item.id}>{item.product_name} × {item.quantity} — ₹{Math.round(item.price * item.quantity)}</li>
              ))}
            </ul>
            <div className="order-card-total">Total: ₹{Math.round(order.total_amount)}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
