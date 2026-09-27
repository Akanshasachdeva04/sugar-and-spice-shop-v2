import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import Seo from "../components/Seo";
import "./Checkout.css";

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const shipping = subtotal >= 999 || subtotal === 0 ? 0 : 119;
  const total = subtotal + shipping;

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  function loadRazorpayScript() {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function handlePay(e) {
    e.preventDefault();
    setError("");

    if (!address.trim() || !phone.trim()) {
      setError("Please fill in your delivery address and phone number.");
      return;
    }

    setBusy(true);
    let order = null;
    let paid = false;
    try {
      // 1. Create order in our backend. It stays "awaiting payment" (invisible to the admin,
      //    stock is held for a few minutes) until Razorpay confirms the payment.
      order = await api.createOrder({
        items: items.map((i) => ({
          product_id: i.productId,
          variant_id: i.variantId,
          quantity: i.quantity,
        })),
        shipping_address: address.trim(),
        phone: phone.trim(),
      });

      // 2. Create a Razorpay order for that order
      const rzpOrder = await api.createRazorpayOrder(order.id);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        api.abortOrder(order.id).catch(() => {});
        setError("Could not load the payment gateway. Please check your connection and try again.");
        setBusy(false);
        return;
      }

      // 3. Open Razorpay checkout modal
      const rzp = new window.Razorpay({
        key: rzpOrder.key_id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: "Sugar & Spice",
        description: `Order #${order.id}`,
        order_id: rzpOrder.razorpay_order_id,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: phone,
        },
        theme: { color: "#2E1A24" },
        handler: async function (response) {
          paid = true;
          try {
            await api.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_id: order.id,
            });
            clearCart();
            navigate(`/order-success/${order.id}`);
          } catch (err) {
            setError("Payment verification failed. If money was deducted, it will be refunded — contact support with your order ID: " + order.id);
          }
        },
        modal: {
          ondismiss: function () {
            // popup closed without paying -> cancel the unpaid order and give the stock back
            if (!paid) api.abortOrder(order.id).catch(() => {});
            setBusy(false);
          },
        },
      });

      rzp.on("payment.failed", function () {
        setError("Payment failed. Please try again or use a different payment method.");
        setBusy(false);
      });

      rzp.open();
    } catch (err) {
      if (order && !paid) api.abortOrder(order.id).catch(() => {});
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="container checkout-page">
      <Seo title="Checkout" noindex />
      <h1>Checkout</h1>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handlePay}>
          <h3>Delivery details</h3>
          <label>
            Full delivery address
            <textarea
              required
              autoComplete="street-address"
              rows={4}
              placeholder="House no, street, area, city, state, pincode"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>
          <label>
            Phone number
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          {error && <p className="checkout-error">{error}</p>}

          <button className="btn btn-primary checkout-pay-btn" disabled={busy}>
            {busy ? "Processing…" : `Pay ₹${Math.round(total)} with Razorpay`}
          </button>
          <p className="checkout-secure-note">🔒 Secure payment powered by Razorpay — cards, UPI &amp; netbanking accepted.</p>
        </form>

        <aside className="checkout-summary">
          <h3>Order summary</h3>
          <ul className="checkout-items">
            {items.map((item) => (
              <li key={item.variantId}>
                <span>{item.name} ({item.size}) × {item.quantity}</span>
                <span>₹{Math.round(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>₹{Math.round(subtotal)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>{shipping === 0 ? "Free" : `₹${shipping}`}</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>₹{Math.round(total)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
