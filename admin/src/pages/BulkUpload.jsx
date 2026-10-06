import { useEffect, useRef, useState, useMemo } from "react";
import { api } from "../api/client";
import "./BulkUpload.css";

const EXTS = ["jpg", "jpeg", "png", "webp"];

function naturalCompare(a, b) {
  const re = /(\d+)|(\D+)/g;
  const pa = a.match(re) || [];
  const pb = b.match(re) || [];
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || "", y = pb[i] || "";
    const nx = Number(x), ny = Number(y);
    if (!isNaN(nx) && !isNaN(ny) && x !== "" && y !== "") {
      if (nx !== ny) return nx - ny;
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

function titleCase(s) {
  return s.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim()
    .replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
}

function slugify(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "product";
}

/** Mirrors the folder-scanning logic of the CLI script, in the browser. */
function parseFiles(fileList, categoryNameMap, pair) {
  const byDir = new Map();
  for (const file of fileList) {
    const relPath = file.webkitRelativePath || file.name;
    const parts = relPath.split("/");
    if (parts.length < 2) continue;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!EXTS.includes(ext)) continue;
    const dirParts = parts.slice(1, -1); // drop the picked root folder + filename
    const dirKey = dirParts.join("/");
    if (!byDir.has(dirKey)) byDir.set(dirKey, { dirParts, files: [] });
    byDir.get(dirKey).files.push(file);
  }

  const groups = new Map();
  for (const [, { dirParts, files }] of byDir) {
    let parts = [...dirParts];
    let cat = "", catId = null, price = "";
    for (let i = 0; i < 2 && parts.length; i++) {
      const seg = parts[0].toLowerCase();
      if (!cat && categoryNameMap.has(seg)) {
        cat = parts[0]; catId = categoryNameMap.get(seg); parts = parts.slice(1);
      } else if (!price && /^\d+(\.\d+)?$/.test(parts[0])) {
        price = parts[0]; parts = parts.slice(1);
      } else break;
    }
    files.sort((a, b) => naturalCompare(a.name, b.name));

    if (pair && parts.length === 0) {
      for (let i = 0; i < files.length; i += 2) {
        const chunk = files.slice(i, i + 2);
        const key = (cat ? cat + "/" : "") + (price ? price + "/" : "") + chunk[0].name.replace(/\.[^.]+$/, "");
        groups.set(key, { cat, catId, price, files: chunk });
      }
    } else if (parts.length > 0) {
      const key = (cat ? cat + "/" : "") + (price ? price + "/" : "") + parts.join("/");
      groups.set(key, { cat, catId, price, files });
    } else {
      for (const f of files) {
        const stem = f.name.replace(/\.[^.]+$/, "");
        const baseKey = stem.replace(/[\s_-]*\(?\d+\)?$/, "") || stem;
        const key = (cat ? cat + "/" : "") + (price ? price + "/" : "") + baseKey;
        if (!groups.has(key)) groups.set(key, { cat, catId, price, files: [] });
        groups.get(key).files.push(f);
      }
    }
  }
  for (const g of groups.values()) g.files.sort((a, b) => naturalCompare(a.name, b.name));
  return groups;
}

export default function BulkUpload() {
  const folderInputRef = useRef(null);
  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState([]); // {key,name,category_id,price,discount_price,sizes,stock,color,files,thumb,status,error,productId}
  const [uploading, setUploading] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkSizes, setBulkSizes] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [pairMode, setPairMode] = useState(false);

  useEffect(() => { api.getCategories().then(setCategories).catch(() => {}); }, []);

  useEffect(() => {
    return () => rows.forEach((r) => r.thumb && URL.revokeObjectURL(r.thumb));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryNameMap = useMemo(() => {
    const m = new Map();
    for (const c of categories) { m.set(c.name.toLowerCase(), c.id); m.set(c.slug.toLowerCase(), c.id); }
    return m;
  }, [categories]);

  function handleFolderButton() { folderInputRef.current?.click(); }

  function handleFolderSelect(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const groups = parseFiles(files, categoryNameMap, pairMode);
    const newRows = [];
    for (const [key, g] of groups) {
      const lastSeg = key.split("/").pop();
      newRows.push({
        key,
        name: titleCase(lastSeg),
        category_id: g.catId || "",
        price: g.price || "",
        discount_price: "",
        sizes: "",
        stock: "",
        color: "",
        files: g.files,
        thumb: g.files[0] ? URL.createObjectURL(g.files[0]) : null,
        status: "pending", // pending | uploading | done | error
        error: "",
        productId: null,
      });
    }
    newRows.sort((a, b) => naturalCompare(a.key, b.key));
    setRows(newRows);
  }

  function updateRow(idx, field, value) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function removeRow(idx) {
    setRows((prev) => {
      const r = prev[idx];
      if (r?.thumb) URL.revokeObjectURL(r.thumb);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function applyToAllEmpty() {
    setRows((prev) => prev.map((r) => {
      if (r.status === "done") return r;
      return {
        ...r,
        category_id: r.category_id || bulkCategory || r.category_id,
        sizes: r.sizes || bulkSizes,
        stock: r.stock || bulkStock,
      };
    }));
  }

  const pendingCount = rows.filter((r) => r.status === "pending" || r.status === "error").length;
  const doneCount = rows.filter((r) => r.status === "done").length;

  async function uploadOne(row, idx) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, status: "uploading", error: "" } : r)));
    try {
      if (!row.name.trim()) throw new Error("Name is required");
      if (!row.category_id) throw new Error("Category is required");
      const price = parseFloat(row.price);
      if (isNaN(price) || price <= 0) throw new Error("Price is required");
      const sizeList = (row.sizes || "").split(/[,;/]/).map((s) => s.trim()).filter(Boolean);
      if (!sizeList.length) throw new Error("Sizes are required (e.g. S,M,L)");
      const stock = parseInt(row.stock, 10);
      if (isNaN(stock) || stock < 0) throw new Error("Stock is required");

      const urls = [];
      for (const file of row.files) {
        const result = await api.uploadImage(file);
        urls.push(result.url);
      }

      const payload = {
        name: row.name.trim(),
        slug: slugify(row.name) + "-" + Date.now().toString().slice(-6) + Math.floor(Math.random() * 90 + 10),
        description: null,
        price,
        discount_price: row.discount_price ? parseFloat(row.discount_price) : null,
        category_id: parseInt(row.category_id, 10),
        brand: null,
        image_urls: urls,
        variants: sizeList.map((sz) => ({ size: sz, color: row.color.trim() || null, stock })),
      };
      const created = await api.createProduct(payload);
      setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, status: "done", productId: created.id, productCode: created.product_code } : r)));
    } catch (err) {
      setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, status: "error", error: err.message } : r)));
    }
  }

  async function startUpload(onlyFailed = false) {
    setUploading(true);
    const targets = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => (onlyFailed ? r.status === "error" : r.status === "pending" || r.status === "error"));
    for (const { r, i } of targets) {
      // eslint-disable-next-line no-await-in-loop
      await uploadOne(r, i);
    }
    setUploading(false);
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Bulk upload</h1>
          <p>Select a folder of product photos, fill in the details, then upload everything in one go.</p>
        </div>
      </div>

      <div className="card bulk-instructions">
        <strong>How to arrange your photos folder (optional but saves typing):</strong>
        <ul>
          <li>One subfolder per category — name it exactly like your category (e.g. <code>Bra</code>, <code>Panty</code>, <code>Goodies</code>) — category fills in automatically.</li>
          <li>Inside that, a subfolder named just a number (e.g. <code>299</code>) — price fills in automatically.</li>
          <li>Inside that: either one folder per product (2 photos inside), or files named like <code>name_1.jpg</code> / <code>name_2.jpg</code>.</li>
          <li>Camera-style names (IMG_001, IMG_002…)? Tick "Pair photos" below — every 2 photos become one product.</li>
        </ul>
        <label className="bulk-pair-toggle">
          <input type="checkbox" checked={pairMode} onChange={(e) => setPairMode(e.target.checked)} />
          Pair photos (every 2 photos in a folder = 1 product)
        </label>
      </div>

      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        style={{ display: "none" }}
        onChange={handleFolderSelect}
      />
      <button className="btn btn-primary" onClick={handleFolderButton} disabled={uploading}>
        Select photos folder
      </button>

      {rows.length > 0 && (
        <>
          <div className="card bulk-apply-all">
            <strong>Apply to all (fills only empty rows):</strong>
            <div className="bulk-apply-row">
              <select value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)}>
                <option value="">Category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input placeholder="Sizes e.g. S,M,L" value={bulkSizes} onChange={(e) => setBulkSizes(e.target.value)} />
              <input placeholder="Stock" type="number" value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} />
              <button className="btn btn-outline btn-sm" onClick={applyToAllEmpty}>Apply</button>
            </div>
          </div>

          <div className="bulk-summary">
            <span>{rows.length} products found</span>
            <span className="muted">· {doneCount} uploaded</span>
            {rows.length > 300 && <span className="muted">· large batch — this may take a while, keep this tab open</span>}
          </div>

          <div className="card table-responsive bulk-table-wrap">
            <table className="bulk-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Discount</th>
                  <th>Sizes</th>
                  <th>Stock</th>
                  <th>Color</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.key} className={r.status === "done" ? "row-done" : r.status === "error" ? "row-error" : ""}>
                    <td>{r.thumb ? <img src={r.thumb} alt="" className="bulk-thumb" /> : <div className="bulk-thumb-placeholder" />}</td>
                    <td><input value={r.name} disabled={r.status === "done"} onChange={(e) => updateRow(idx, "name", e.target.value)} /></td>
                    <td>
                      <select value={r.category_id} disabled={r.status === "done"} onChange={(e) => updateRow(idx, "category_id", e.target.value)}>
                        <option value="">—</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td><input value={r.price} disabled={r.status === "done"} onChange={(e) => updateRow(idx, "price", e.target.value)} style={{ width: 70 }} /></td>
                    <td><input value={r.discount_price} disabled={r.status === "done"} onChange={(e) => updateRow(idx, "discount_price", e.target.value)} style={{ width: 70 }} /></td>
                    <td><input value={r.sizes} disabled={r.status === "done"} placeholder="S,M,L" onChange={(e) => updateRow(idx, "sizes", e.target.value)} style={{ width: 90 }} /></td>
                    <td><input value={r.stock} disabled={r.status === "done"} onChange={(e) => updateRow(idx, "stock", e.target.value)} style={{ width: 60 }} /></td>
                    <td><input value={r.color} disabled={r.status === "done"} onChange={(e) => updateRow(idx, "color", e.target.value)} style={{ width: 80 }} /></td>
                    <td>
                      {r.status === "pending" && <span className="muted">—</span>}
                      {r.status === "uploading" && <span>Uploading…</span>}
                      {r.status === "done" && <span className="ok">Done {r.productCode}</span>}
                      {r.status === "error" && <span className="err" title={r.error}>{r.error}</span>}
                    </td>
                    <td>{r.status !== "done" && <button className="btn btn-danger btn-sm" onClick={() => removeRow(idx)}>✕</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bulk-actions">
            <button className="btn btn-primary" disabled={uploading || pendingCount === 0} onClick={() => startUpload(false)}>
              {uploading ? "Uploading…" : `Upload all (${pendingCount})`}
            </button>
            {rows.some((r) => r.status === "error") && (
              <button className="btn btn-outline" disabled={uploading} onClick={() => startUpload(true)}>
                Retry failed only
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
