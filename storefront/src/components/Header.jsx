import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

const NAV_LINKS = [
  { label: "Shop All", to: "/shop" },
  { label: "Bra", to: "/shop?category_slug=bra" },
  { label: "Panty", to: "/shop?category_slug=panty" },
  { label: "Thongs", to: "/shop?category_slug=thongs" },
  { label: "Nightwear", to: "/shop?category_slug=nightwear" },
  { label: "Bodysuit", to: "/shop?category_slug=bodysuit" },
  { label: "Swimsuit", to: "/shop?category_slug=swimsuit" },
  { label: "Set", to: "/shop?category_slug=sets" },
  { label: "Clothes", to: "/shop?category_slug=clothes" },
  { label: "Accessories", to: "/shop?category_slug=accessories" },
  { label: "Goodies", to: "/shop?category_slug=goodies" },
  { label: "New In", to: "/shop?sort=newest" },
  { label: "Sale", to: "/shop?on_sale=true", className: "nav-sale" },
];

export default function Header() {
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [hideSearch, setHideSearch] = useState(false);
  const navigate = useNavigate();

  // phones: hide the search row while scrolling down, bring it back on scroll up (saves screen space)
  useEffect(() => {
    let last = window.scrollY;
    function onScroll() {
      const y = window.scrollY;
      if (y > 90 && y > last + 6) setHideSearch(true);
      else if (y < last - 6 || y <= 90) setHideSearch(false);
      last = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // lock page scroll while the side menu is open
  useEffect(() => {
    if (!menuOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [menuOpen]);

  function handleSearch(e) {
    e.preventDefault();
    navigate(search.trim() ? `/shop?search=${encodeURIComponent(search.trim())}` : "/shop");
    setMenuOpen(false);
    document.activeElement?.blur?.(); // closes the phone keyboard
  }

  return (
    <>
    <div className="announce-bar">
      <button className="announce-arrow" aria-label="Previous">‹</button>
      <span className="announce-long">Free shipping on orders above ₹999&nbsp;&nbsp;•&nbsp;&nbsp;Discreet packaging&nbsp;&nbsp;•&nbsp;&nbsp;Secure payments</span>
      <span className="announce-short">Free shipping above ₹999 • Discreet packaging</span>
      <span className="announce-region">India (INR ₹) ⌄</span>
    </div>

    <header className={`site-header ${hideSearch ? "search-hidden" : ""}`}>
      <div className="header-row container">
        <button className="hamburger-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <span /><span /><span />
        </button>

        <Link to="/" className="wordmark-block">
          <span className="wordmark">Sugar &amp; Spice</span>
          <span className="wordmark-tag">Confidence Everyday</span>
        </Link>

        <nav className="main-nav">
          {NAV_LINKS.map((l) => (
            <Link key={l.label} to={l.to} className={l.className}>{l.label}</Link>
          ))}
        </nav>

        <form className="search-form" onSubmit={handleSearch}>
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Search for bras, nightwear, sets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
        </form>

        <div className="header-actions">
          {user ? (
            <div className="account-menu">
              <Link to="/orders" className="icon-btn account-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                <span className="icon-label">{user.name?.split(" ")[0]}</span>
              </Link>
              <button onClick={logout} className="logout-link">Sign out</button>
            </div>
          ) : (
            <Link to="/login" className="icon-btn account-link">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              <span className="icon-label">Sign in</span>
            </Link>
          )}

          <Link to="/wishlist" className="icon-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 10-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 000-7.8z" />
            </svg>
            {wishCount > 0 && <span className="icon-count">{wishCount}</span>}
            <span className="icon-label">Wishlist</span>
          </Link>

          <Link to="/cart" className="icon-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
            </svg>
            {count > 0 && <span className="icon-count">{count}</span>}
            <span className="icon-label">Bag</span>
          </Link>
        </div>
      </div>

      <div className="mobile-search-row">
        <form className="mobile-search-form" onSubmit={handleSearch} role="search">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            enterKeyHint="search"
            placeholder="Search for bras, nightwear, sets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
        </form>
      </div>

      {menuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-head">
              <span className="wordmark">Sugar &amp; Spice</span>
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu">✕</button>
            </div>
            <nav className="mobile-menu-nav">
              {NAV_LINKS.map((l) => (
                <Link key={l.label} to={l.to} onClick={() => setMenuOpen(false)}>{l.label}</Link>
              ))}
              <Link to="/wishlist" onClick={() => setMenuOpen(false)}>Wishlist</Link>
              {user ? (
                <>
                  <Link to="/orders" onClick={() => setMenuOpen(false)}>My orders</Link>
                  <button className="mobile-menu-signout" onClick={() => { logout(); setMenuOpen(false); }}>Sign out</button>
                </>
              ) : (
                <Link to="/login" onClick={() => setMenuOpen(false)}>Sign in</Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
    </>
  );
}
