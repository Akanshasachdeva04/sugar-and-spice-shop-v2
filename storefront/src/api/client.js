const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.detail || "Something went wrong. Please try again.");
  }
  return data;
}

export const api = {
  // catalog
  getCategories: () => request("/categories"),
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/products${qs ? `?${qs}` : ""}`);
  },
  // filter options + live counts; pass the same params as getProducts to get counts for the current selection
  getFilters: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/filters${qs ? `?${qs}` : ""}`);
  },
  getProduct: (slug) => request(`/products/${slug}`),
  getRelatedProducts: (slug, limit = 4) => request(`/products/${slug}/related?limit=${limit}`),

  // auth
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me"),
  sendOtp: (phone, purpose) => request("/auth/otp/send", { method: "POST", body: JSON.stringify({ phone, purpose }) }),
  verifyOtp: (phone, otp, purpose) => request("/auth/otp/verify", { method: "POST", body: JSON.stringify({ phone, otp, purpose }) }),

  // orders
  createOrder: (payload) => request("/orders", { method: "POST", body: JSON.stringify(payload) }),
  getMyOrders: () => request("/orders"),
  getOrder: (id) => request(`/orders/${id}`),
  // customer closed the payment popup -> release the reserved stock, order never reaches the admin
  abortOrder: (id) => request(`/orders/${id}/abort`, { method: "POST" }),

  // payments
  createRazorpayOrder: (orderId) => request(`/payments/create/${orderId}`, { method: "POST" }),
  verifyPayment: (payload) => request("/payments/verify", { method: "POST", body: JSON.stringify(payload) }),
};
