import "./Footer.css";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-wordmark">Sugar & Spice</div>
          <p className="footer-tag">Considered lingerie, made for everyday comfort.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <ul>
            <li>Bras</li>
            <li>Nightwear</li>
            <li>Sets</li>
            <li>New arrivals</li>
          </ul>
        </div>
        <div>
          <h4>Help</h4>
          <ul>
            <li>Size guide</li>
            <li>Shipping &amp; returns</li>
            <li>Track your order</li>
            <li>Contact us</li>
          </ul>
        </div>
        <div>
          <h4>Get updates</h4>
          <p className="footer-tag">New drops and offers, occasionally.</p>
          <form className="footer-form" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Email address" aria-label="Email address" />
            <button type="submit" className="btn btn-outline">Join</button>
          </form>
        </div>
      </div>
      <div className="footer-bottom container">
        <span>© {new Date().getFullYear()} Sugar & Spice. All rights reserved.</span>
      </div>
    </footer>
  );
}
