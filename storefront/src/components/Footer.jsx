import { Link } from "react-router-dom"; import "./Footer.css";

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
            <li><Link to="/shop?category_slug=bra">Bras</Link></li>
            <li><Link to="/shop?category_slug=nightwear">Nightwear</Link></li>
            <li><Link to="/shop?category_slug=sets">Sets</Link></li>
            <li><Link to="/shop?sort=newest">New arrivals</Link></li>
          </ul>
        </div>
        <div>
          <h4>Help</h4>
          <ul>
            <li><Link to="/size-guide">Size guide</Link></li>
            <li><Link to="/shipping-returns">Shipping &amp; returns</Link></li>
            <li><Link to="/orders">Track your order</Link></li>
            <li><Link to="/contact">Contact us</Link></li>
          </ul>
          <ul className="footer-contact">
            <li>
              <a href="tel:+919990909239">+91 99909 09239</a>
            </li>
            <li>
              <a href="mailto:Meiinukk@gmail.com">Meiinukk@gmail.com</a>
            </li>
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
        <span>&copy; {new Date().getFullYear()} Sugar &amp; Spice. All rights reserved.</span>
      </div>
    </footer>
  );
}
