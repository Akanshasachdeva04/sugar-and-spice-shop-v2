import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import Seo from "../components/Seo";
import "./Cart.css";

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal, count } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const shipping = subtotal >= 999 || subtotal === 0 ? 0 : 119;
  const total = subtotal + shipping;

  const FREE_SHIPPING_AT = 999;
  const progress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_AT) * 100));

  function goToCheckout() {
    navigate(user ? "/checkout" : "/login?next=/checkout");
  }

  if (items.length === 0) {
    return (
      <div className="container cart-empty">
        <Seo title="Your Bag" noindex />
        <h1>Your bag is empty</h1>
        <p>Everything you add will show up here.</p>
        <Link to="/shop" className="btn btn-primary">Start shopping</Link>
      </div>
    );
  }

  return (
    <div className="container cart-page">
      <Seo title="Your Bag" noindex />
      <h1>Your bag ({count})</h1>

      {subtotal < FREE_SHIPPING_AT ? (
        <div className="ship-progress">
          <p>Add <strong>₹{Math.round(FREE_SHIPPING_AT - subtotal)}</strong> more for <strong>free shipping</strong></p>
          <div className="ship-progress-bar"><span style={{ width: `${progress}%` }} /></div>
        </div>
      ) : (
        <div className="ship-progress ship-progress-done"><p>🎉 You've unlocked <strong>free shipping</strong></p></div>
      )}

      <div className="cart-layout">
        <ul className="cart-items">
          {items.map((item) => (
            <li key={item.variantId} className="cart-item">
              <div className="cart-item-image">
                {item.image ? <img src={item.image} alt={item.name} /> : <div className="pd-placeholder" />}
              </div>
              <div className="cart-item-info">
                <div className="cart-item-name">{item.name}</div>
                <div className="cart-item-variant">
                  Size {item.size}{item.color ? ` · ${item.color}` : ""}
                </div>
                <div className="cart-item-price">₹{Math.round(item.price)}</div>

                <div className="cart-item-controls">
                  <div className="qty-control">
                    <button onClick={() => updateQuantity(item.variantId, item.quantity - 1)} aria-label="Decrease quantity">−</button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.variantId, Math.min(item.quantity + 1, item.maxStock))}
                      disabled={item.quantity >= item.maxStock}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button className="cart-remove" onClick={() => removeItem(item.variantId)}>Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="cart-summary">
          <h3>Order summary</h3>
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
          <button className="btn btn-primary summary-cta" onClick={goToCheckout}>
            Checkout
          </button>
        </aside>
      </div>

      {/* phones: total + checkout always within thumb reach */}
      <div className="cart-mobile-bar">
        <div>
          <span>Total</span>
          <strong>₹{Math.round(total)}</strong>
        </div>
        <button className="btn btn-primary" onClick={goToCheckout}>Checkout</button>
      </div>
    </div>
  );
}
