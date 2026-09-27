import { Link } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";
import "./ProductCard.css";

export default function ProductCard({ product }) {
  const { isWishlisted, toggle } = useWishlist();
  const primaryImage = product.images?.find((i) => i.is_primary) || product.images?.[0];
  const hasDiscount = product.discount_price && product.discount_price < product.price;
  const pct = hasDiscount
    ? Math.round(((product.price - product.discount_price) / product.price) * 100)
    : 0;
  const wishlisted = isWishlisted(product.id);

  function handleWishlist(e) {
    e.preventDefault();
    e.stopPropagation();
    toggle(product.id);
  }

  return (
    <Link to={`/product/${product.slug}`} className="product-card">
      <div className="product-card-image">
        {primaryImage ? (
          <img src={primaryImage.image_url} alt={product.name} loading="lazy" />
        ) : (
          <div className="product-card-placeholder" aria-hidden="true" />
        )}
        <button
          className={`wishlist-btn ${wishlisted ? "active" : ""}`}
          onClick={handleWishlist}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 10-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 000-7.8z" />
          </svg>
        </button>
        {hasDiscount && <span className="product-card-badge">{pct}% OFF</span>}
      </div>
      <div className="product-card-body">
        {product.brand && <div className="product-card-brand">{product.brand}</div>}
        <div className="product-card-name">{product.name}</div>
        <div className="product-card-price">
          <span className="price-now">₹{Math.round(product.discount_price || product.price)}</span>
          {hasDiscount && (
            <>
              <span className="price-was">₹{Math.round(product.price)}</span>
              <span className="price-pct">({pct}% OFF)</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
