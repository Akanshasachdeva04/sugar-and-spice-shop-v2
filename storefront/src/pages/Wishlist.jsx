import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useWishlist } from "../context/WishlistContext";
import ProductCard from "../components/ProductCard";
import Seo from "../components/Seo";
import "./Wishlist.css";

export default function Wishlist() {
  const { ids } = useWishlist();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getProducts({ page_size: 100 })
      .then((res) => setProducts(res.items.filter((p) => ids.includes(p.id))))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [ids]);

  return (
    <div className="container wishlist-page">
      <Seo title="Wishlist" noindex />
      <h1>My Wishlist</h1>

      {loading ? (
        <p className="muted-text">Loading…</p>
      ) : products.length === 0 ? (
        <div className="wishlist-empty">
          <p>Nothing saved yet. Tap the heart on any product to add it here.</p>
          <Link to="/shop" className="btn btn-primary">Browse products</Link>
        </div>
      ) : (
        <div className="product-grid wishlist-grid">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
