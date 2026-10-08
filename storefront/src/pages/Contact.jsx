import { Link } from "react-router-dom";
import Seo from "../components/Seo";
import { SITE } from "../lib/siteInfo";
import "./Info.css";

export default function Contact() {
  const wa = (SITE.whatsapp || "").replace(/\D/g, "");
  const hasAny = SITE.email || SITE.phone || wa || SITE.instagram;

  return (
    <div className="info-page">
      <Seo title="Contact us" path="/contact" description="Get in touch with Sugar & Spice for help with sizes, orders and shipping." />
      <div className="info-wrap">
        <p className="info-eyebrow">We are here to help</p>
        <h1 className="info-title">Contact us</h1>
        <p className="info-lead">Questions about sizes, your order or delivery? Reach out and we will get back to you.</p>

        <section className="info-section">
          {hasAny ? (
            <div className="info-grid">
              {wa && (
                <div className="info-card">
                  <h3>WhatsApp</h3>
                  <p><a className="info-link" href={`https://wa.me/${wa}?text=${encodeURIComponent("Hi Sugar & Spice, I need help with ")}`} target="_blank" rel="noopener noreferrer">Chat with us</a></p>
                </div>
              )}
              {SITE.phone && (
                <div className="info-card">
                  <h3>Phone</h3>
                  <p><a className="info-link" href={`tel:${SITE.phone.replace(/\s/g, "")}`}>{SITE.phone}</a></p>
                </div>
              )}
              {SITE.email && (
                <div className="info-card">
                  <h3>Email</h3>
                  <p><a className="info-link" href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
                </div>
              )}
              {SITE.instagram && (
                <div className="info-card">
                  <h3>Instagram</h3>
                  <p><a className="info-link" href={SITE.instagram} target="_blank" rel="noopener noreferrer">Message us</a></p>
                </div>
              )}
              {SITE.hours && (
                <div className="info-card">
                  <h3>Support hours</h3>
                  <p>{SITE.hours}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="info-card"><p>Our contact details are being added. Please check back shortly.</p></div>
          )}
        </section>

        <section className="info-section">
          <h2>Quick help</h2>
          <div className="info-grid">
            <div className="info-card"><h3>Track your order</h3><p>See the status of your orders in <Link to="/orders" className="info-link">My orders</Link>.</p></div>
            <div className="info-card"><h3>Find your size</h3><p>Check our <Link to="/size-guide" className="info-link">size guide</Link> before you order.</p></div>
            <div className="info-card"><h3>Shipping &amp; returns</h3><p>Read our <Link to="/shipping-returns" className="info-link">shipping and returns</Link> information.</p></div>
          </div>
        </section>
      </div>
    </div>
  );
}
