import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Layout.css";

const links = [
  { to: "/", label: "Dashboard", icon: "◱" },
  { to: "/products", label: "Products", icon: "▤" },
  { to: "/categories", label: "Categories", icon: "▦" },
  { to: "/orders", label: "Orders", icon: "▥" },
  { to: "/payments", label: "Payments", icon: "◎" },
  { to: "/banners", label: "Banners", icon: "▭" },
  { to: "/users", label: "Customers", icon: "◍" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // phone menu closes after you pick a page
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <button className="topbar-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu">
          <span /><span /><span />
        </button>
        <div className="topbar-brand">Sugar & Spice <span>Admin</span></div>
      </header>
      {menuOpen && <div className="admin-backdrop" onClick={() => setMenuOpen(false)} />}
      <aside className={`admin-sidebar ${menuOpen ? "is-open" : ""}`}>
        <div className="sidebar-brand">Sugar & Spice <span>Admin</span></div>
        <nav className="sidebar-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            >
              <span className="sidebar-icon">{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">{user?.name}</div>
          <button onClick={handleLogout} className="sidebar-logout">Sign out</button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
