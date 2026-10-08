import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import "./Info.css";

export default function ShippingReturns() {
  return (
    <div className="info-page">
      <Seo title="Shipping & Returns" path="/shipping-returns" description="Shipping charges, delivery time, returns and exchanges at Sugar & Spice." />
      <div className="info-wrap">
        <p className="info-eyebrow">Help</p>
        <h1 className="info-title">Shipping &amp; Returns</h1>
        <p className="info-lead">Everything you need to know about getting your order and what to do if something is not right.</p>

        <section className="info-section">
          <h2>Shipping</h2>
          <div className="info-grid">
            <div className="info-card"><h3>Free shipping</h3><p>On all orders of ₹999 and above.</p></div>
            <div className="info-card"><h3>Shipping fee</h3><p>A flat ₹119 on orders below ₹999.</p></div>
            <div className="info-card"><h3>Packing time</h3><p>Orders are packed and handed to the courier within 1–2 working days.</p></div>
            <div className="info-card"><h3>Delivery time</h3><p>Usually 4–7 working days, depending on your location.</p></div>
          </div>
          <p style={{ marginTop: 14 }}>Every order is sent in discreet packaging, with no product details on the outside.</p>
          <p>You can follow the status of your order anytime in <Link to="/orders" className="info-link" style={{ color: "var(--rose-deep)", fontWeight: 600 }}>My orders</Link>.</p>
        </section>

        <section className="info-section">
          <h2>Returns &amp; exchanges</h2>
          <ul>
            <li>Because lingerie and swimwear are hygiene-sensitive, we cannot accept returns or exchanges on items that are worn, washed or altered, or that have the tags removed.</li>
            <li>Received the wrong, damaged or defective item? Contact us within 48 hours of delivery with clear photos (an unboxing video helps) and we will arrange a replacement or refund.</li>
            <li>Size does not fit? Contact us within 7 days of delivery. Unworn, unwashed items with tags intact can be exchanged for another size, subject to availability.</li>
          </ul>
          <p className="info-note" style={{ marginTop: 10 }}>Not sure which size to pick? Our <Link to="/size-guide" style={{ color: "var(--rose-deep)", fontWeight: 600 }}>size guide</Link> will help.</p>
        </section>

        <section className="info-section">
          <h2>Refunds &amp; cancellations</h2>
          <ul>
            <li>Approved refunds go back to your original payment method within 5–7 working days.</li>
            <li>You can cancel an order any time before it is shipped. Contact us as soon as possible.</li>
          </ul>
        </section>

        <section className="info-section">
          <h2>Payments</h2>
          <p>All payments are processed securely by Razorpay. You can pay with UPI, cards or net banking. We never see or store your card details.</p>
        </section>

        <div className="info-cta">
          <p>Still have a question?</p>
          <div className="info-links">
            <Link to="/contact" className="btn btn-pill">Contact us</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
