import { useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg({ type: "", text: "" });
    if (next.length < 6) return setMsg({ type: "error", text: "New password must be at least 6 characters." });
    if (next !== confirm) return setMsg({ type: "error", text: "New password and confirm password don't match." });
    setBusy(true);
    try {
      await api.changePassword({ current_password: current, new_password: next });
      setMsg({ type: "ok", text: "Password changed. Use the new password next time you sign in." });
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Signed in as {user?.email}</p>
        </div>
      </div>

      <form className="card" onSubmit={handleSubmit} style={{ padding: 24, maxWidth: 420 }}>
        <h3 style={{ marginTop: 0 }}>Change password</h3>
        <div className="form-field">
          <label>Current password</label>
          <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="form-field">
          <label>New password</label>
          <input type="password" required value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Confirm new password</label>
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {msg.text && <p className={msg.type === "ok" ? "" : "form-error"} style={msg.type === "ok" ? { color: "#2e7d32" } : {}}>{msg.text}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Change password"}</button>
      </form>
    </div>
  );
}
