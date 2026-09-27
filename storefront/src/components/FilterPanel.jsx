import { useEffect, useMemo, useState } from "react";
import { colorHex, toggle, activeCount } from "../lib/filters";
import "./FilterPanel.css";

/* ---------- small building blocks ---------- */

function CheckRow({ checked, onChange, label, count, swatch }) {
  return (
    <label className={`fp-check ${checked ? "is-checked" : ""}`}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="fp-box" aria-hidden="true" />
      {swatch !== undefined && (
        <span
          className={`fp-swatch ${swatch ? "" : "fp-swatch-unknown"}`}
          style={swatch ? { background: swatch } : undefined}
          aria-hidden="true"
        />
      )}
      <span className="fp-label">{label}</span>
      {count != null && <span className="fp-count">({count})</span>}
    </label>
  );
}

function ExpandList({ children, limit = 6 }) {
  const [open, setOpen] = useState(false);
  const items = Array.isArray(children) ? children : [children];
  const shown = open ? items : items.slice(0, limit);
  return (
    <>
      {shown}
      {items.length > limit && (
        <button type="button" className="fp-more" onClick={() => setOpen((o) => !o)}>
          {open ? "Show less" : `+ ${items.length - limit} more`}
        </button>
      )}
    </>
  );
}

/* ---------- price slider (two thumbs) ---------- */
function PriceSlider({ bounds, min, max, onCommit }) {
  const lo0 = bounds.min;
  const hi0 = bounds.max;
  const curLo = min === "" ? lo0 : Math.max(lo0, Number(min));
  const curHi = max === "" ? hi0 : Math.min(hi0, Number(max));
  const [lo, setLo] = useState(curLo);
  const [hi, setHi] = useState(curHi);
  const [loTxt, setLoTxt] = useState(String(curLo));
  const [hiTxt, setHiTxt] = useState(String(curHi));

  useEffect(() => {
    setLo(curLo); setHi(curHi); setLoTxt(String(curLo)); setHiTxt(String(curHi));
  }, [curLo, curHi]);

  const range = Math.max(1, hi0 - lo0);
  const step = Math.max(1, Math.round(range / 100));
  const pct = (v) => ((v - lo0) / range) * 100;

  // "" means "no limit" so the URL stays clean when the slider is at its ends
  function commit(l, h) {
    onCommit(l <= lo0 ? "" : String(Math.round(l)), h >= hi0 ? "" : String(Math.round(h)));
  }

  function commitText() {
    let l = Number(loTxt);
    let h = Number(hiTxt);
    if (Number.isNaN(l)) l = lo0;
    if (Number.isNaN(h)) h = hi0;
    l = Math.min(Math.max(l, lo0), hi0);
    h = Math.min(Math.max(h, lo0), hi0);
    if (l > h) [l, h] = [h, l];
    setLo(l); setHi(h); setLoTxt(String(l)); setHiTxt(String(h));
    commit(l, h);
  }

  return (
    <div className="fp-price">
      <div className="ps-range">
        <div className="ps-track">
          <div className="ps-fill" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
        </div>
        <input
          type="range" min={lo0} max={hi0} step={step} value={lo}
          aria-label="Minimum price"
          style={{ zIndex: lo > lo0 + range / 2 ? 5 : 3 }}
          onChange={(e) => { const v = Math.min(Number(e.target.value), hi - step); setLo(v); setLoTxt(String(v)); }}
          onPointerUp={() => commit(lo, hi)}
          onKeyUp={() => commit(lo, hi)}
        />
        <input
          type="range" min={lo0} max={hi0} step={step} value={hi}
          aria-label="Maximum price"
          style={{ zIndex: 4 }}
          onChange={(e) => { const v = Math.max(Number(e.target.value), lo + step); setHi(v); setHiTxt(String(v)); }}
          onPointerUp={() => commit(lo, hi)}
          onKeyUp={() => commit(lo, hi)}
        />
      </div>
      <div className="fp-price-inputs">
        <label>
          <span>₹</span>
          <input
            inputMode="numeric" value={loTxt} aria-label="Minimum price in rupees"
            onChange={(e) => setLoTxt(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={commitText}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        </label>
        <em>to</em>
        <label>
          <span>₹</span>
          <input
            inputMode="numeric" value={hiTxt} aria-label="Maximum price in rupees"
            onChange={(e) => setHiTxt(e.target.value.replace(/[^\d]/g, ""))}
            onBlur={commitText}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        </label>
      </div>
    </div>
  );
}

/* ---------- which groups exist + how many values are picked in each ---------- */
export function getGroups(facets) {
  if (!facets) return [];
  const g = [];
  if (facets.categories?.length) g.push({ id: "category", label: "Category" });
  if (facets.brands?.length) g.push({ id: "brand", label: "Brand" });
  if (facets.min_price != null && facets.max_price != null && facets.max_price > facets.min_price)
    g.push({ id: "price", label: "Price" });
  if (facets.sizes?.length) g.push({ id: "size", label: "Size" });
  if (facets.colors?.length) g.push({ id: "color", label: "Color" });
  if (facets.discounts?.length) g.push({ id: "discount", label: "Discount" });
  g.push({ id: "more", label: "Availability" });
  return g;
}

export function groupSelectedCount(id, v) {
  switch (id) {
    case "category": return v.cats.length;
    case "brand": return v.brands.length;
    case "price": return v.min !== "" || v.max !== "" ? 1 : 0;
    case "size": return v.sizes.length;
    case "color": return v.colors.length;
    case "discount": return v.discount ? 1 : 0;
    case "more": return (v.inStock ? 1 : 0) + (v.onSale ? 1 : 0);
    default: return 0;
  }
}

/* ---------- the options of one group ---------- */
function GroupBody({ id, facets, values, onChange }) {
  const cats = useMemo(() => {
    const opts = facets.categories || [];
    const have = new Set(opts.map((o) => o.slug));
    return [...opts, ...values.cats.filter((c) => !have.has(c)).map((c) => ({ slug: c, name: c, count: 0 }))];
  }, [facets, values.cats]);
  const brands = useMemo(() => {
    const opts = facets.brands || [];
    const have = new Set(opts.map((o) => o.name.toLowerCase()));
    return [...opts, ...values.brands.filter((b) => !have.has(b.toLowerCase())).map((b) => ({ name: b, count: 0 }))];
  }, [facets, values.brands]);
  const sizes = useMemo(() => {
    const opts = facets.sizes || [];
    const have = new Set(opts.map((o) => o.name.toLowerCase()));
    return [...opts, ...values.sizes.filter((s) => !have.has(s.toLowerCase())).map((s) => ({ name: s, count: 0 }))];
  }, [facets, values.sizes]);
  const colors = useMemo(() => {
    const opts = facets.colors || [];
    const have = new Set(opts.map((o) => o.name.toLowerCase()));
    return [...opts, ...values.colors.filter((c) => !have.has(c.toLowerCase())).map((c) => ({ name: c, count: 0 }))];
  }, [facets, values.colors]);

  const has = (arr, item) => arr.some((x) => x.toLowerCase() === item.toLowerCase());
  const flip = (arr, item) => (has(arr, item) ? arr.filter((x) => x.toLowerCase() !== item.toLowerCase()) : [...arr, item]);

  if (id === "category") {
    return (
      <ExpandList>
        {cats.map((c) => (
          <CheckRow key={c.slug} label={c.name} count={c.count}
            checked={values.cats.includes(c.slug)}
            onChange={() => onChange({ cats: toggle(values.cats, c.slug) })} />
        ))}
      </ExpandList>
    );
  }
  if (id === "brand") {
    return (
      <ExpandList>
        {brands.map((b) => (
          <CheckRow key={b.name} label={b.name} count={b.count}
            checked={has(values.brands, b.name)}
            onChange={() => onChange({ brands: flip(values.brands, b.name) })} />
        ))}
      </ExpandList>
    );
  }
  if (id === "price") {
    return (
      <PriceSlider
        bounds={{ min: facets.min_price, max: facets.max_price }}
        min={values.min} max={values.max}
        onCommit={(min, max) => onChange({ min, max })}
      />
    );
  }
  if (id === "size") {
    return (
      <div className="fp-size-grid">
        {sizes.map((s) => (
          <button key={s.name} type="button"
            className={`fp-size ${has(values.sizes, s.name) ? "is-on" : ""} ${s.count === 0 ? "is-empty" : ""}`}
            aria-pressed={has(values.sizes, s.name)}
            onClick={() => onChange({ sizes: flip(values.sizes, s.name) })}>
            {s.name}
          </button>
        ))}
      </div>
    );
  }
  if (id === "color") {
    return (
      <ExpandList limit={8}>
        {colors.map((c) => (
          <CheckRow key={c.name} label={c.name} count={c.count} swatch={colorHex(c.name)}
            checked={has(values.colors, c.name)}
            onChange={() => onChange({ colors: flip(values.colors, c.name) })} />
        ))}
      </ExpandList>
    );
  }
  if (id === "discount") {
    return (
      <div className="fp-radio-list">
        {(facets.discounts || []).map((d) => (
          <label key={d.value} className={`fp-radio ${String(values.discount) === String(d.value) ? "is-checked" : ""}`}>
            <input type="radio" name="fp-discount"
              checked={String(values.discount) === String(d.value)}
              onChange={() => onChange({ discount: String(d.value) })} />
            <span className="fp-dot" aria-hidden="true" />
            <span className="fp-label">{d.value}% and above</span>
            <span className="fp-count">({d.count})</span>
          </label>
        ))}
        {values.discount && (
          <button type="button" className="fp-more" onClick={() => onChange({ discount: "" })}>Clear discount</button>
        )}
      </div>
    );
  }
  if (id === "more") {
    return (
      <>
        <CheckRow label="In stock only" count={facets.in_stock_count}
          checked={values.inStock} onChange={() => onChange({ inStock: !values.inStock })} />
        <CheckRow label="On sale" count={facets.on_sale_count}
          checked={values.onSale} onChange={() => onChange({ onSale: !values.onSale })} />
      </>
    );
  }
  return null;
}

/* ---------- DESKTOP: sidebar with collapsible sections ---------- */
export function FilterSidebar({ facets, values, onChange, onClear }) {
  if (!facets) return <div className="fp-loading">Loading filters…</div>;
  const groups = getGroups(facets);
  const n = activeCount(values);
  return (
    <div className="fp-sidebar">
      <div className="fp-sidebar-head">
        <h3>Filters</h3>
        {n > 0 && <button type="button" onClick={onClear}>Clear all</button>}
      </div>
      {groups.map((g) => (
        <details key={g.id} className="fp-group" open>
          <summary>
            {g.label}
            {groupSelectedCount(g.id, values) > 0 && <span className="fp-badge">{groupSelectedCount(g.id, values)}</span>}
          </summary>
          <div className="fp-group-body">
            <GroupBody id={g.id} facets={facets} values={values} onChange={onChange} />
          </div>
        </details>
      ))}
    </div>
  );
}

/* ---------- MOBILE: full-screen sheet with left rail (like the Myntra app) ---------- */
export function FilterSheet({ facets, values, onChange, onClear, onClose, onApply, total }) {
  const groups = getGroups(facets);
  const [active, setActive] = useState("category");

  // lock page scroll behind the sheet
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // make sure the highlighted group exists (e.g. no categories on this page)
  const current = groups.find((g) => g.id === active) ? active : groups[0]?.id;

  return (
    <div className="fs-overlay" role="dialog" aria-modal="true" aria-label="Filters">
      <div className="fs-head">
        <h3>Filters</h3>
        <button type="button" className="fs-clear" onClick={onClear} disabled={activeCount(values) === 0}>Clear all</button>
      </div>

      {!facets ? (
        <div className="fp-loading">Loading filters…</div>
      ) : (
        <div className="fs-body">
          <nav className="fs-rail" aria-label="Filter groups">
            {groups.map((g) => {
              const c = groupSelectedCount(g.id, values);
              return (
                <button key={g.id} type="button"
                  className={`fs-rail-btn ${current === g.id ? "is-active" : ""}`}
                  onClick={() => setActive(g.id)}>
                  {g.label}
                  {c > 0 && <span className="fs-dot" aria-label={`${c} selected`} />}
                </button>
              );
            })}
          </nav>
          <div className="fs-pane">
            {current && <GroupBody id={current} facets={facets} values={values} onChange={onChange} />}
          </div>
        </div>
      )}

      <div className="fs-foot">
        <button type="button" className="fs-btn fs-btn-ghost" onClick={onClose}>Close</button>
        <button type="button" className="fs-btn fs-btn-main" onClick={onApply} disabled={total === 0}>
          {total != null ? (total === 0 ? "No items found" : `Show ${total} item${total === 1 ? "" : "s"}`) : "Apply"}
        </button>
      </div>
    </div>
  );
}
