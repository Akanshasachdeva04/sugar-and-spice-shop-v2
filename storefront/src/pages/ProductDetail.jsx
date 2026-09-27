import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import ProductCard from "../components/ProductCard";
import Seo from "../components/Seo";
import "./ProductDetail.css";

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isWishlisted, toggle } = useWishlist();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [added, setAdded] = useState(false);
  const touchX = useRef(null);

  useEffect(() => {
    setLoading(true);
    setAdded(false);
    setActiveImage(0);
    api.getProduct(slug)
      .then((p) => {
        setProduct(p);
        setSelectedVariant(p.variants?.[0] || null);
        api.getRelatedProducts(slug, 4).then(setRelated).catch(() => setRelated([]));
      })
      .catch(() => setError("This product could not be found."))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="container pd-status">Loading…</div>;
  if (error || !product) return <div className="container pd-status">{error || "Not found."}</div>;

  const hasDiscount = product.discount_price && product.discount_price < product.price;
  const pct = hasDiscount ? Math.round(((product.price - product.discount_price) / product.price) * 100) : 0;
  const images = product.images?.length ? product.images : [null];
  const outOfStock = !selectedVariant || selectedVariant.stock <= 0;
  const wishlisted = isWishlisted(product.id);
  const inStockAny = product.variants?.some((v) => v.stock > 0);

  // swipe left/right on the photo to change picture (phones)
  function onTouchStart(e) { touchX.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (touchX.current == null || images.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 40) return;
    setActiveImage((i) => (dx < 0 ? Math.min(i + 1, images.length - 1) : Math.max(i - 1, 0)));
  }

  function handleAddToCart() {
    if (!selectedVariant || outOfStock) return;
    addItem(product, selectedVariant, 1);
    setAdded(true);
  }

  function handleBuyNow() {
    if (!selectedVariant || outOfStock) return;
    addItem(product, selectedVariant, 1);
    navigate("/cart");
  }

  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.name,
    description: product.description || product.name,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    image: images.filter(Boolean).map((i) => i.image_url),
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.discount_price || product.price,
      availability: inStockAny ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="container pd-layout">
      <Seo
        title={product.name}
        description={product.description || `${product.name} — shop at Sugar & Spice.`}
        path={`/product/${product.slug}`}
        image={images[0]?.image_url}
        jsonLd={jsonLd}
      />

      <div className="pd-gallery">
        <div className="pd-main-image" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {images[activeImage] ? (
            <img src={images[activeImage].image_url} alt={product.name} />
          ) : (
            <div className="pd-placeholder" />
          )}
          <button
            className={`pd-wishlist-btn ${wishlisted ? "active" : ""}`}
            onClick={() => toggle(product.id)}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={wishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 10-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 000-7.8z" />
            </svg>
          </button>
          {images.length > 1 && (
            <div className="pd-dots" aria-hidden="true">
              {images.map((_, i) => <span key={i} className={i === activeImage ? "on" : ""} />)}
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="pd-thumbs">
            {images.map((img, i) => (
              <button
                key={i}
                className={i === activeImage ? "active" : ""}
                onClick={() => setActiveImage(i)}
                aria-label={`View image ${i + 1}`}
              >
                {img ? <img src={img.image_url} alt="" /> : <div className="pd-placeholder" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pd-info">
        {product.category && <Link to={`/shop?category_slug=${product.category.slug}`} className="pd-category">{product.category.name}</Link>}
        {product.brand && <div className="pd-brand">{product.brand}</div>}
        <h1>{product.name}</h1>

        <div className="pd-price">
          <span className="price-now">₹{Math.round(product.discount_price || product.price)}</span>
          {hasDiscount && (
            <>
              <span className="price-was">₹{Math.round(product.price)}</span>
              <span className="pd-off">{pct}% OFF</span>
            </>
          )}
        </div>

        {product.description && <p className="pd-desc">{product.description}</p>}

        {product.variants?.length > 0 && (
          <div className="pd-variants">
            <div className="pd-variants-label">Size{product.variants.some(v => v.color) ? " / Color" : ""}</div>
            <div className="pd-variant-list">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  className={`pd-variant-btn ${selectedVariant?.id === v.id ? "selected" : ""} ${v.stock <= 0 ? "disabled" : ""}`}
                  disabled={v.stock <= 0}
                  onClick={() => setSelectedVariant(v)}
                >
                  {v.size}{v.color ? ` / ${v.color}` : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        {outOfStock && <p className="pd-oos">This size is currently out of stock.</p>}
        {selectedVariant && !outOfStock && selectedVariant.stock <= 5 && (
          <p className="pd-low-stock">Only {selectedVariant.stock} left</p>
        )}

        <div className="pd-actions">
          <button className="btn btn-outline" onClick={handleAddToCart} disabled={outOfStock}>
            {added ? "Added to bag ✓" : "Add to bag"}
          </button>
          <button className="btn btn-primary" onClick={handleBuyNow} disabled={outOfStock}>
            Buy now
          </button>
        </div>

        <ul className="pd-trust">
          <li>Free shipping on orders above ₹999</li>
          <li>Discreet packaging</li>
          <li>100% secure checkout via Razorpay</li>
        </ul>
      </div>

      {related.length > 0 && (
        <div className="pd-related">
          <h2>You may also like</h2>
          <div className="product-grid pd-related-grid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
