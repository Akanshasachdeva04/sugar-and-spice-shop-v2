import { useState, useRef } from "react";
import { api } from "../api/client";
import "./ProductForm.css";

const emptyVariant = () => ({ size: "", color: "", stock: 0 });

export default function ProductForm({ product, categories, onClose, onSaved }) {
  const isEdit = !!product;
  const fileInputRef = useRef(null);

  const [name, setName] = useState(product?.name || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product?.price || "");
  const [discountPrice, setDiscountPrice] = useState(product?.discount_price || "");
  const [categoryId, setCategoryId] = useState(product?.category?.id || categories[0]?.id || "");
  const [images, setImages] = useState(product?.images?.map((i) => i.image_url) || []);
  const [variants, setVariants] = useState(
    product?.variants?.length ? product.variants.map((v) => ({ size: v.size, color: v.color || "", stock: v.stock })) : [emptyVariant()]
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function slugify(text) {
    return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const result = await api.uploadImage(file);
        setImages((prev) => [...prev, result.url]);
      }
    } catch (err) {
      setError("Photo upload failed: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(idx) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateVariant(idx, field, value) {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  }

  function addVariant() {
    setVariants((prev) => [...prev, emptyVariant()]);
  }

  function removeVariant(idx) {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name.trim() || !price || !categoryId) {
      setError("Please fill in the product name, price, and category.");
      return;
    }
    if (variants.some((v) => !v.size.trim())) {
      setError("Every size row needs a size value (e.g. S, M, L, 34B).");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: isEdit ? product.slug : slugify(name) + "-" + Date.now().toString().slice(-5),
        description: description.trim() || null,
        price: parseFloat(price),
        discount_price: discountPrice ? parseFloat(discountPrice) : null,
        category_id: parseInt(categoryId, 10),
        brand: brand.trim() || null,
        image_urls: images,
        variants: variants.map((v) => ({
          size: v.size.trim(),
          color: v.color.trim() || null,
          stock: parseInt(v.stock, 10) || 0,
        })),
      };

      if (isEdit) {
        await api.updateProduct(product.id, payload);
      } else {
        await api.createProduct(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{isEdit ? "Edit product" : "Add new product"}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-field">
            <label>Product name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Lace Trim Bralette" />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Brand (optional)</label>
              <input value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-field">
            <label>Description (optional)</label>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Price (₹)</label>
              <input type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Discount price (₹, optional)</label>
              <input type="number" min="0" step="1" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} />
            </div>
          </div>

          <div className="form-field">
            <label>Photos</label>
            <div className="image-list">
              {images.map((url, idx) => (
                <div key={idx} className="image-thumb">
                  <img src={url} alt="" />
                  <button type="button" onClick={() => removeImage(idx)} aria-label="Remove photo">✕</button>
                </div>
              ))}
              <button type="button" className="image-upload-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? "Uploading…" : "+ Add photo"}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <p className="field-hint">Click "Add photo" and select images from your computer or phone. First photo is shown first.</p>
          </div>

          <div className="form-field">
            <label>Sizes &amp; stock</label>
            {variants.map((v, idx) => (
              <div key={idx} className="variant-row">
                <input placeholder="Size (e.g. S, 34B)" value={v.size} onChange={(e) => updateVariant(idx, "size", e.target.value)} />
                <input placeholder="Color (optional)" value={v.color} onChange={(e) => updateVariant(idx, "color", e.target.value)} />
                <input type="number" min="0" placeholder="Stock" value={v.stock} onChange={(e) => updateVariant(idx, "stock", e.target.value)} />
                {variants.length > 1 && (
                  <button type="button" className="variant-remove" onClick={() => removeVariant(idx)} aria-label="Remove size">✕</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-outline btn-sm" onClick={addVariant} style={{ marginTop: 4 }}>
              + Add another size
            </button>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Add product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
