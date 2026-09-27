import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import "./OrderSuccess.css";

export default function OrderSuccess() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api.getOrder(orderId).then(setOrder).catch(() => {});
  }, [orderId]);

  return (
    <div className="container order-success">
      <div className="success-icon">✓</div>
      <h1>Order confirmed</h1>
      <p>
        Thank you — your order {order ? <strong>#{order.id}</strong> : ""} has been placed
        successfully. A confirmation will be sent to your registered email.
      </p>
      {order && (
        <div className="success-details">
          <div><span>Order total</span><span>₹{Math.round(order.total_amount)}</span></div>
          <div><span>Delivery to</span><span>{order.shipping_address}</span></div>
          <div><span>Status</span><span className="status-pill">{order.status}</span></div>
        </div>
      )}
      <div className="success-actions">
        <Link to="/orders" className="btn btn-outline">View my orders</Link>
        <Link to="/shop" className="btn btn-primary">Continue shopping</Link>
      </div>
    </div>
  );
}
