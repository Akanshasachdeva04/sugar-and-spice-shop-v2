import { useEffect, useState } from "react";
import { api } from "../api/client";
import ProductForm from "./ProductForm";
import "./Products.css";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // product being edited, or "new"
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([api.getAllProducts(), api.getCategories()]);
      setProducts(p);
      setCategories(c);
    } catch {
      // swallow — table will just show empty state
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const visibleProducts = search.trim()
    ? products.filter((p) => {
        const q = search.trim().toLowerCase();
        return p.name?.toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q);
      })
    : products;

  async function handleDelete(product) {
    if (!window.confirm(`Remove "${product.name}" from the store? It will no longer be visible to customers.`)) return;
    await api.deleteProduct(product.id);
    load();
  }

  async function handleCreateCategory(e) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const slug = newCategoryName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    await api.createCategory({ name: newCategoryName.trim(), slug });
    setNewCategoryName("");
    setShowCategoryForm(false);
    load();
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Products</h1>
          <p>Add new products, update stock, or remove items that are no longer sold.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-outline" onClick={() => setShowCategoryForm(true)}>+ New category</button>
          <button
            className="btn btn-primary"
            onClick={() => (categories.length ? setEditing("new") : alert("Create a category first."))}
          >
            + Add product
          </button>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search products by name or brand…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ margin: "0 0 16px", padding: "8px 12px", width: "100%", maxWidth: 320, borderRadius: 8, border: "1px solid #ddd" }}
      />

      {loading ? (
        <p className="muted">Loading…</p>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <p>No products yet. Click "Add product" to create your first one.</p>
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="empty-state"><p>No products match your search.</p></div>
      ) : (
        <div className="card table-responsive">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map((p) => {
                const totalStock = p.variants?.reduce((s, v) => s + v.stock, 0) || 0;
                const thumb = p.images?.[0]?.image_url;
                return (
                  <tr key={p.id}>
                    <td data-label="Product">
                      <div className="product-cell">
                        <div className="product-thumb">
                          {thumb ? <img src={thumb} alt="" /> : <div className="product-thumb-placeholder" />}
                        </div>
                        <div>
                          <div className="product-cell-name">{p.name}</div>
                          {p.brand && <div className="product-cell-brand">{p.brand}</div>}
                        </div>
                      </div>
                    </td>
                    <td data-label="Category">{p.category?.name || "—"}</td>
                    <td data-label="Price">
                      ₹{Math.round(p.discount_price || p.price)}
                      {p.discount_price && <span className="was-price">₹{Math.round(p.price)}</span>}
                    </td>
                    <td data-label="Stock">
                      <span className={totalStock <= 5 ? "stock-low" : ""}>{totalStock}</span>
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${p.is_active ? "badge-paid" : "badge-cancelled"}`}>
                        {p.is_active ? "Active" : "Hidden"}
                      </span>
                    </td>
                    <td data-label="">
                      <div className="row-actions">
                        <button className="btn btn-outline btn-sm" onClick={() => setEditing(p)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {showCategoryForm && (
        <div className="modal-overlay" onClick={() => setShowCategoryForm(false)}>
          <div className="modal-card modal-card-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>New category</h2>
              <button className="modal-close" onClick={() => setShowCategoryForm(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateCategory} className="modal-body">
              <div className="form-field">
                <label>Category name</label>
                <input autoFocus placeholder="e.g. Nightwear" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowCategoryForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
