import { useEffect, useState } from "react";
import { api } from "../api/client";
import "./Products.css";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([api.getCategories(), api.getAllProducts()]);
      setCategories(c);
      setProducts(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const countFor = (id) => products.filter((p) => p.category?.id === id && p.is_active).length;

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return;
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    try {
      await api.createCategory({ name: name.trim(), slug });
      setName("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(c) {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    setError("");
    try {
      await api.deleteCategory(c.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Categories</h1>
          <p>These appear in the shop menu and filters on your website.</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className="card" style={{ padding: 16, display: "flex", gap: 10, marginBottom: 18 }}>
        <input
          style={{ flex: 1 }}
          placeholder="New category name, e.g. Shapewear"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn btn-primary">+ Add category</button>
      </form>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="card table-responsive">
          <table>
            <thead>
              <tr><th>Name</th><th>Link name</th><th>Products</th><th></th></tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td data-label="Name"><strong>{c.name}</strong></td>
                  <td data-label="Link name" className="muted">{c.slug}</td>
                  <td data-label="Products">{countFor(c.id)}</td>
                  <td data-label="">
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
