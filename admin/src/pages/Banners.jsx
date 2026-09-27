import { useEffect, useState, useRef } from "react";
import { api } from "../api/client";
import "./Banners.css";

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      setBanners(await api.getBanners());
    } catch {
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await api.uploadImage(file);
      setImageUrl(result.url);
    } catch (err) {
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!imageUrl) {
      alert("Please upload a banner image first.");
      return;
    }
    if (editingId) {
      const current = banners.find((b) => b.id === editingId);
      await api.updateBanner(editingId, {
        title: title.trim() || null,
        image_url: imageUrl,
        link_url: linkUrl.trim() || null,
        display_order: current ? current.display_order : 0,
      });
    } else {
      await api.createBanner({ title: title.trim() || null, image_url: imageUrl, link_url: linkUrl.trim() || null, display_order: banners.length });
    }
    resetForm();
    load();
  }

  function resetForm() {
    setTitle(""); setLinkUrl(""); setImageUrl(""); setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleEdit(b) {
    setEditingId(b.id);
    setTitle(b.title || "");
    setLinkUrl(b.link_url || "");
    setImageUrl(b.image_url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (!window.confirm("Remove this banner?")) return;
    await api.deleteBanner(id);
    if (editingId === id) resetForm();
    load();
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Banners</h1>
          <p>Promotional images shown on the storefront homepage.</p>
        </div>
      </div>

      <div className="card banner-form-card">
        <h3>{editingId ? "Edit banner" : "Add a banner"}</h3>
        <form onSubmit={handleAdd}>
          <div className="form-row">
            <div className="form-field">
              <label>Title (optional)</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. End of season sale" />
            </div>
            <div className="form-field">
              <label>Link (optional)</label>
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="e.g. /shop?category_slug=sets" />
            </div>
          </div>
          <div className="form-field">
            <label>Banner image</label>
            {imageUrl && (
              <div className="banner-preview"><img src={imageUrl} alt="" /></div>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" disabled={uploading}>
              {uploading ? "Uploading…" : editingId ? "Save changes" : "Add banner"}
            </button>
            {editingId && (
              <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
            )}
          </div>
        </form>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : banners.length > 0 && (
        <div className="banner-grid">
          {banners.map((b) => (
            <div key={b.id} className="banner-item">
              <img src={b.image_url} alt="" />
              <div className="banner-item-info">
                <span>{b.title || "Untitled"}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-sm" onClick={() => handleEdit(b)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b.id)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
