// Shared helpers for the Myntra-style filters (URL <-> filter values <-> API params)

export const SORT_LABELS = {
  newest: "What's New",
  discount: "Better Discount",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  name_asc: "Name: A to Z",
};

const list = (v) => (v ? v.split(",").filter(Boolean) : []);

export const EMPTY_VALUES = {
  cats: [],
  brands: [],
  sizes: [],
  colors: [],
  min: "",
  max: "",
  discount: "",
  inStock: false,
  onSale: false,
};

export function readValues(sp) {
  return {
    cats: list(sp.get("category_slug")),
    brands: list(sp.get("brand")),
    sizes: list(sp.get("sizes")),
    colors: list(sp.get("colors")),
    min: sp.get("min_price") || "",
    max: sp.get("max_price") || "",
    discount: sp.get("discount") || "",
    inStock: sp.get("in_stock") === "true",
    onSale: sp.get("on_sale") === "true",
  };
}

// values -> query params using the backend's names (empty ones are left out)
export function valuesToParams(v) {
  const p = {};
  if (v.cats.length) p.category_slug = v.cats.join(",");
  if (v.brands.length) p.brand = v.brands.join(",");
  if (v.sizes.length) p.sizes = v.sizes.join(",");
  if (v.colors.length) p.colors = v.colors.join(",");
  if (v.min !== "" && v.min != null) p.min_price = v.min;
  if (v.max !== "" && v.max != null) p.max_price = v.max;
  if (v.discount) p.discount = v.discount;
  if (v.inStock) p.in_stock = "true";
  if (v.onSale) p.on_sale = "true";
  return p;
}

// Build the browser URL from filter values, keeping search + sort
export function valuesToSearchParams(v, sp) {
  const next = new URLSearchParams();
  const search = sp.get("search");
  const sort = sp.get("sort");
  if (search) next.set("search", search);
  if (sort) next.set("sort", sort);
  Object.entries(valuesToParams(v)).forEach(([k, val]) => next.set(k, val));
  return next;
}

export function activeCount(v) {
  return (
    v.cats.length + v.brands.length + v.sizes.length + v.colors.length +
    (v.min !== "" || v.max !== "" ? 1 : 0) +
    (v.discount ? 1 : 0) + (v.inStock ? 1 : 0) + (v.onSale ? 1 : 0)
  );
}

export function toggle(arr, item) {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}

const COLOR_MAP = [
  ["black", "#1c1c1c"], ["white", "#ffffff"], ["ivory", "#f6f1e4"], ["cream", "#f3e9d2"],
  ["nude", "#e3bc9a"], ["skin", "#e8c3a3"], ["beige", "#dcc7a4"], ["peach", "#f6b998"],
  ["red", "#d0312d"], ["maroon", "#7b1e2b"], ["wine", "#6d1a36"], ["burgundy", "#6d1a36"],
  ["pink", "#ef8fb0"], ["rose", "#e0788f"], ["magenta", "#c2185b"], ["orange", "#f08a24"],
  ["yellow", "#f5cf3b"], ["gold", "#c9a24a"], ["green", "#3a9a5b"], ["olive", "#7b7d3a"],
  ["mint", "#a9dcc3"], ["teal", "#1f8a8a"], ["blue", "#2f6fdd"], ["navy", "#1d2a55"],
  ["sky", "#8ec9f0"], ["purple", "#7a4fb5"], ["lavender", "#c4b3e6"], ["violet", "#7a4fb5"],
  ["brown", "#7a5238"], ["coffee", "#5c4033"], ["grey", "#9a9a9a"], ["gray", "#9a9a9a"],
  ["silver", "#c0c0c0"], ["leopard", "#b8892c"], ["animal", "#b8892c"],
];

// Returns a CSS colour for a colour name, or null when we don't recognise it
export function colorHex(name) {
  const n = (name || "").toLowerCase();
  const hit = COLOR_MAP.find(([k]) => n.includes(k));
  return hit ? hit[1] : null;
}
