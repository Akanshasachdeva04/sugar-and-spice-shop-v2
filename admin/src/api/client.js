const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const token = localStorage.getItem("admin_token");
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.detail || "Something went wrong.");
  }
  return data;
}

export const api = {
  API_BASE,
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me"),
  changePassword: (payload) => request("/auth/change-password", { method: "POST", body: JSON.stringify(payload) }),

  getAnalytics: () => request("/admin/analytics/summary"),

  getCategories: () => request("/categories"),
  createCategory: (payload) => request("/admin/categories", { method: "POST", body: JSON.stringify(payload) }),
  deleteCategory: (id) => request(`/admin/categories/${id}`, { method: "DELETE" }),

  getAllProducts: () => request("/admin/products"),
  createProduct: (payload) => request("/admin/products", { method: "POST", body: JSON.stringify(payload) }),
  updateProduct: (id, payload) => request(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteProduct: (id) => request(`/admin/products/${id}`, { method: "DELETE" }),
  updateStock: (productId, variantId, stock) =>
    request(`/admin/products/${productId}/stock/${variantId}?stock=${stock}`, { method: "PATCH" }),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/admin/upload", { method: "POST", body: formData });
  },

  getAllOrders: (status) => request(`/admin/orders${status ? `?status=${status}` : ""}`),
  updateOrderStatus: (id, status) => request(`/admin/orders/${id}/status?status=${status}`, { method: "PATCH" }),

  getPayments: () => request("/admin/payments"),
  markRefunded: (id) => request(`/admin/payments/${id}/refund`, { method: "PATCH" }),

  getUsers: () => request("/admin/users"),
  getUserDetail: (id) => request(`/admin/users/${id}`),
  setUserActive: (id, active) => request(`/admin/users/${id}/active?active=${active}`, { method: "PATCH" }),

  getBanners: () => request("/admin/banners"),
  createBanner: (payload) => request("/admin/banners", { method: "POST", body: JSON.stringify(payload) }),
  updateBanner: (id, payload) => request(`/admin/banners/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteBanner: (id) => request(`/admin/banners/${id}`, { method: "DELETE" }),

  async exportOrdersCsv(status) {
    const token = localStorage.getItem("admin_token");
    const res = await fetch(`${API_BASE}/admin/orders/export${status ? `?status=${status}` : ""}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Could not export orders.");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "orders_export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
