import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { api } from "../api/client";
import ProductCard from "../components/ProductCard";
import { FilterSidebar, FilterSheet } from "../components/FilterPanel";
import Seo from "../components/Seo";
import useMediaQuery from "../lib/useMediaQuery";
import {
  SORT_LABELS, EMPTY_VALUES, readValues, valuesToParams, valuesToSearchParams, activeCount,
} from "../lib/filters";
import "./Shop.css";

// Loads filter options + live counts for a given selection (null = don't load)
function useFacets(params) {
  const [facets, setFacets] = useState(null);
  const key = params ? JSON.stringify(params) : "";
  useEffect(() => {
    if (!params) return undefined;
    let cancelled = false;
    const t = setTimeout(() => {
      api.getFilters(params).then((d) => { if (!cancelled) setFacets(d); }).catch(() => {});
    }, 150);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return facets;
}

function SortIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
    </svg>
  );
}
function FilterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h18M6 12h12M10 19h4" />
    </svg>
  );
}

function SkeletonGrid() {
  return (
    <div className="product-grid shop-grid" aria-busy="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="sk-card">
          <div className="sk-img" />
          <div className="sk-line" />
          <div className="sk-line sk-short" />
        </div>
      ))}
    </div>
  );
}

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useMediaQuery("(max-width: 900px)");

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sortOpen, setSortOpen] = useState(false);       // desktop dropdown
  const [sortSheet, setSortSheet] = useState(false);     // mobile bottom sheet
  const [filterSheet, setFilterSheet] = useState(false); // mobile full-screen filters
  const [draft, setDraft] = useState(EMPTY_VALUES);
  const sortRef = useRef(null);

  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "newest";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const paramsKey = searchParams.toString();
  const values = useMemo(() => readValues(searchParams), [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const filterCount = activeCount(values);

  // facets: desktop sidebar follows the URL; the mobile sheet follows the draft selection
  const sidebarFacets = useFacets(!isMobile ? { ...valuesToParams(values), ...(search ? { search } : {}) } : null);
  const sheetFacets = useFacets(filterSheet ? { ...valuesToParams(draft), ...(search ? { search } : {}) } : null);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { page_size: 24, sort, page, ...valuesToParams(values) };
    if (search) params.search = search;
    api.getProducts(params)
      .then((res) => {
        if (cancelled) return;
        setProducts(res.items); setTotal(res.total); setTotalPages(res.total_pages);
      })
      .catch(() => { if (!cancelled) { setProducts([]); setTotal(0); setTotalPages(1); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // close desktop sort dropdown on outside click
  useEffect(() => {
    if (!sortOpen) return undefined;
    const close = (e) => { if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [sortOpen]);

  // tells the footer to leave room for the fixed bottom bar
  useEffect(() => {
    document.body.classList.toggle("has-bottombar", isMobile);
    return () => document.body.classList.remove("has-bottombar");
  }, [isMobile]);

  // lock page scroll behind the sort sheet
  useEffect(() => {
    if (!sortSheet) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [sortSheet]);

  /* ---------- actions ---------- */
  function applyValues(next) {
    setSearchParams(valuesToSearchParams(next, searchParams));
  }
  function setSort(key) {
    const next = new URLSearchParams(searchParams);
    if (key === "newest") next.delete("sort"); else next.set("sort", key);
    next.delete("page");
    setSearchParams(next);
    setSortOpen(false); setSortSheet(false);
  }
  function goToPage(p) {
    const next = new URLSearchParams(searchParams);
    next.set("page", p);
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function openFilterSheet() {
    setDraft(values);
    setFilterSheet(true);
  }
  function applyDraft() {
    applyValues(draft);
    setFilterSheet(false);
    window.scrollTo({ top: 0 });
  }
  const clearAll = () => applyValues(EMPTY_VALUES);

  /* ---------- labels ---------- */
  const catName = (slug) => categories.find((c) => c.slug === slug)?.name || slug;
  const activeCategory = values.cats.length === 1 ? categories.find((c) => c.slug === values.cats[0]) : null;
  const pageTitle = search
    ? `"${search}"`
    : activeCategory ? activeCategory.name
    : values.onSale && filterCount === 1 ? "Sale"
    : "Shop All";

  // "applied filters" chips (each has its own remove action)
  const chips = [];
  values.cats.forEach((c) => chips.push({ key: `c-${c}`, label: catName(c), remove: () => applyValues({ ...values, cats: values.cats.filter((x) => x !== c) }) }));
  values.brands.forEach((b) => chips.push({ key: `b-${b}`, label: b, remove: () => applyValues({ ...values, brands: values.brands.filter((x) => x !== b) }) }));
  values.sizes.forEach((s) => chips.push({ key: `s-${s}`, label: `Size: ${s}`, remove: () => applyValues({ ...values, sizes: values.sizes.filter((x) => x !== s) }) }));
  values.colors.forEach((c) => chips.push({ key: `col-${c}`, label: c, remove: () => applyValues({ ...values, colors: values.colors.filter((x) => x !== c) }) }));
  if (values.min !== "" || values.max !== "") {
    const label = values.min !== "" && values.max !== "" ? `₹${values.min} – ₹${values.max}` : values.max !== "" ? `Under ₹${values.max}` : `₹${values.min}+`;
    chips.push({ key: "price", label, remove: () => applyValues({ ...values, min: "", max: "" }) });
  }
  if (values.discount) chips.push({ key: "disc", label: `${values.discount}% and above`, remove: () => applyValues({ ...values, discount: "" }) });
  if (values.inStock) chips.push({ key: "stock", label: "In stock", remove: () => applyValues({ ...values, inStock: false }) });
  if (values.onSale) chips.push({ key: "sale", label: "On sale", remove: () => applyValues({ ...values, onSale: false }) });

  return (
    <div className="shop-page">
      <Seo
        title={pageTitle}
        description={`Shop ${pageTitle.toLowerCase()} at Sugar & Spice — comfortable everyday lingerie with secure checkout.`}
        path={`/shop${values.cats.length === 1 ? `?category_slug=${values.cats[0]}` : ""}`}
      />

      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Home</Link> <span>/</span>{" "}
          <span className="breadcrumb-current">{activeCategory ? activeCategory.name : "Shop All"}</span>
        </nav>

        <div className="shop-toolbar">
          <div>
            <h1>{pageTitle}</h1>
            <p className="result-count">{loading ? "Loading…" : `${total} item${total === 1 ? "" : "s"}`}</p>
          </div>

          {!isMobile && (
            <div className="sort-wrap" ref={sortRef}>
              <button className="toolbar-btn" onClick={() => setSortOpen((s) => !s)} aria-haspopup="listbox" aria-expanded={sortOpen}>
                Sort by: <strong>{SORT_LABELS[sort]}</strong> <span aria-hidden="true">⌄</span>
              </button>
              {sortOpen && (
                <div className="sort-dropdown" role="listbox">
                  {Object.entries(SORT_LABELS).map(([key, label]) => (
                    <button key={key} role="option" aria-selected={sort === key}
                      className={sort === key ? "active" : ""} onClick={() => setSort(key)}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* mobile: swipeable category pills, like Myntra */}
        {isMobile && categories.length > 0 && (
          <div className="cat-pills" role="tablist" aria-label="Categories">
            <button className={values.cats.length === 0 ? "is-on" : ""} onClick={() => applyValues({ ...values, cats: [] })}>All</button>
            {categories.map((c) => (
              <button key={c.id}
                className={values.cats.length === 1 && values.cats[0] === c.slug ? "is-on" : ""}
                onClick={() => applyValues({ ...values, cats: [c.slug] })}>
                {c.name}
              </button>
            ))}
          </div>
        )}

        {chips.length > 0 && (
          <div className="applied-row">
            {chips.map((c) => (
              <button key={c.key} className="applied-chip" onClick={c.remove} aria-label={`Remove filter ${c.label}`}>
                {c.label} <span aria-hidden="true">✕</span>
              </button>
            ))}
            <button className="applied-clear" onClick={clearAll}>Clear all</button>
          </div>
        )}

        <div className="shop-layout">
          {!isMobile && (
            <aside className="shop-filters" aria-label="Filters">
              <FilterSidebar
                facets={sidebarFacets}
                values={values}
                onChange={(patch) => applyValues({ ...values, ...patch })}
                onClear={clearAll}
              />
            </aside>
          )}

          <div className="shop-results">
            {loading ? (
              <SkeletonGrid />
            ) : products.length === 0 ? (
              <div className="grid-empty">
                <p>No products match these filters.</p>
                {filterCount > 0 && <button className="btn btn-outline" onClick={clearAll}>Clear all filters</button>}
              </div>
            ) : (
              <>
                <div className="product-grid shop-grid">
                  {products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>

                {totalPages > 1 && (
                  <div className="pagination">
                    <button disabled={page <= 1} onClick={() => goToPage(page - 1)}>Prev</button>
                    <span>Page {page} of {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => goToPage(page + 1)}>Next</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* mobile: sticky SORT | FILTER bar */}
      {isMobile && (
        <div className="shop-bottombar">
          <button onClick={() => setSortSheet(true)}>
            <SortIcon /> <span>Sort</span>
          </button>
          <span className="shop-bottombar-sep" aria-hidden="true" />
          <button onClick={openFilterSheet}>
            <FilterIcon /> <span>Filter</span>
            {filterCount > 0 && <b className="shop-bottombar-count">{filterCount}</b>}
          </button>
        </div>
      )}

      {sortSheet && (
        <div className="sheet-backdrop" onClick={() => setSortSheet(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Sort by" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab" aria-hidden="true" />
            <h3>Sort by</h3>
            {Object.entries(SORT_LABELS).map(([key, label]) => (
              <button key={key} className={`sheet-row ${sort === key ? "is-on" : ""}`} onClick={() => setSort(key)}>
                <span>{label}</span>
                <span className="sheet-radio" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      )}

      {filterSheet && (
        <FilterSheet
          facets={sheetFacets}
          values={draft}
          total={sheetFacets?.total}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          onClear={() => setDraft(EMPTY_VALUES)}
          onClose={() => setFilterSheet(false)}
          onApply={applyDraft}
        />
      )}
    </div>
  );
}
