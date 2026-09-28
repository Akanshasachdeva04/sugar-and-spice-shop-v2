import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import ProductCard from "../components/ProductCard";
import Seo from "../components/Seo";
import heroPhoto from "../assets/hero-photo.jpg";
import catBra from "../assets/categories/cat_bra.jpg";
import catNightwear from "../assets/categories/cat_nightwear.jpg";
import catThongs from "../assets/categories/cat_thongs.jpg";
import catPanty from "../assets/categories/cat_panty.jpg";
import catBodysuit from "../assets/categories/cat_bodysuit.jpg";
import catSwimsuit from "../assets/categories/cat_swimsuit.jpg";
import catBikini from "../assets/categories/cat_bikini.jpg";
import catSet from "../assets/categories/cat_set.jpg";
import catGoodies from "../assets/categories/cat_goodies.png";
import catAccessories from "../assets/categories/cat_accessories.png";
import catClothes from "../assets/categories/cat_clothes.jpg";
import catNewIn from "../assets/categories/cat_newin.jpg";
import "./Home.css";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProducts({ page_size: 8, sort: "newest" })
      .then((res) => setProducts(res.items))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const CATEGORIES = [
    { label: "Bra", to: "/shop?category_slug=bra", img: catBra },
    { label: "Nightwear", to: "/shop?category_slug=nightwear", img: catNightwear },
    { label: "Thongs", to: "/shop?category_slug=thongs", img: catThongs },
    { label: "Panty", to: "/shop?category_slug=panty", img: catPanty },
    { label: "Bodysuit", to: "/shop?category_slug=bodysuit", img: catBodysuit },
    { label: "Swimsuit", to: "/shop?category_slug=swimsuit", img: catSwimsuit },
    { label: "Bikini", to: "/shop?category_slug=bikini", img: catBikini },
    { label: "Set", to: "/shop?category_slug=sets", img: catSet },
    { label: "Clothes", to: "/shop?category_slug=clothes", img: catClothes },
    { label: "Accessories", to: "/shop?category_slug=accessories", img: catAccessories },
    { label: "Goodies", to: "/shop?category_slug=goodies", img: catGoodies },
    { label: "New In", to: "/shop?sort=newest", img: catNewIn },
  ];

  return (
    <div>
      <Seo path="/" />
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>
              Find Your Confidence.<br />Everyday Elegance.
            </h1>
            <p className="hero-sub">
              Discover our new collection of ethically sourced, comfortable, and beautiful lingerie.
            </p>
            <div className="hero-actions">
              <Link to="/shop?sort=newest" className="btn btn-pill">Shop The New Collection →</Link>
            </div>
            <div className="hero-trust">
              <div className="trust-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="1" y="6" width="14" height="11" rx="1"/><path d="M15 9h4l3 3v5h-7z"/><circle cx="6" cy="19" r="1.6"/><circle cx="17.5" cy="19" r="1.6"/></svg>
                <p>Free Shipping<br />above ₹999</p>
              </div>
              <div className="trust-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>
                <p>Secure<br />Payments</p>
              </div>
              <div className="trust-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/></svg>
                <p>Discreet<br />Packaging</p>
              </div>
            </div>
          </div>
          <div className="hero-image" aria-hidden="true">
            <img src={heroPhoto} alt="Woman in lingerie and robe reading a book" />
          </div>
        </div>
      </section>

      <section className="container category-section">
        <p className="category-eyebrow">Explore our collections</p>
        <h2 className="category-title">Shop by Category</h2>
        <div className="category-grid">
          {CATEGORIES.map((c) => (
            <Link key={c.label} to={c.to} className="category-card">
              <div className="category-card-img">
                <img src={c.img} alt={c.label} />
              </div>
              <div className="category-card-label">
                <span>{c.label}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container product-section">
        <div className="section-head">
          <h2>Recently added</h2>
          <Link to="/shop" className="section-link">See all</Link>
        </div>
        {loading ? (
          <div className="grid-loading">Loading productsâ€¦</div>
        ) : products.length === 0 ? (
          <div className="grid-empty">No products yet â€” check back soon.</div>
        ) : (
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <button className="help-bubble" type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
        Need Help?
      </button>
    </div>
  );
}
