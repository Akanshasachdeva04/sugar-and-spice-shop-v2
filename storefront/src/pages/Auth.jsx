import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import Seo from "../components/Seo";
import "./Auth.css";

export default function Auth() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  // step: "form" (email/password or signup details) -> "otp" (enter the code)
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") || "/";

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function switchMode(newMode) {
    setMode(newMode);
    setStep("form");
    setError("");
    setInfo("");
    setOtp("");
  }

  // Step 1 for login: try email+password. If the account needs phone OTP,
  // backend replies { status: "otp_required" } instead of a token — send the
  // OTP right away and move to the OTP screen instead of "logging in" blindly.
  // Step 1 for register: phone must be OTP-verified before we can create the account.
  async function handleFormSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        const result = await login(form.email, form.password);
        if (result.otpRequired) {
          await api.sendOtp(result.phone, "login");
          setInfo(`We've sent a code to your registered mobile number.`);
          setStep("otp");
        } else {
          navigate(next);
        }
      } else {
        if (!form.phone.trim()) {
          throw new Error("Phone number is required to create an account");
        }
        await api.sendOtp(form.phone, "signup");
        setInfo(`OTP sent to ${form.phone}`);
        setStep("otp");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await api.verifyOtp(form.phone, otp, "login");
        // OTP is now verified on the server — retry the same login call,
        // which will succeed this time since consume_verified_phone passes.
        const result = await login(form.email, form.password);
        if (result.otpRequired) {
          throw new Error("OTP verification did not go through. Please try again.");
        }
        navigate(next);
      } else {
        await api.verifyOtp(form.phone, otp, "signup");
        await register(form.name, form.email, form.password, form.phone);
        navigate(next);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setError("");
    setBusy(true);
    try {
      await api.sendOtp(form.phone, mode === "login" ? "login" : "signup");
      setInfo("A new code has been sent.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container auth-page">
      <Seo title="Sign In" noindex />
      <div className="auth-card">
        {step === "form" ? (
          <>
            <h1>{mode === "login" ? "Sign in" : "Create your account"}</h1>
            <p className="auth-sub">
              {mode === "login" ? "New here?" : "Already have an account?"}{" "}
              <button className="auth-toggle" onClick={() => switchMode(mode === "login" ? "register" : "login")}>
                {mode === "login" ? "Create an account" : "Sign in"}
              </button>
            </p>

            <form onSubmit={handleFormSubmit} className="auth-form">
              {mode === "register" && (
                <label>
                  Full name
                  <input type="text" required value={form.name} onChange={(e) => update("name", e.target.value)} />
                </label>
              )}
              <label>
                Email
                <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} />
              </label>
              {mode === "register" && (
                <label>
                  Phone number
                  <input type="tel" required placeholder="10-digit mobile number" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                </label>
              )}
              <label>
                Password
                <input type="password" required minLength={6} value={form.password} onChange={(e) => update("password", e.target.value)} />
              </label>

              {error && <p className="auth-error">{error}</p>}

              <button className="btn btn-primary auth-submit" disabled={busy}>
                {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Send OTP"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1>Verify OTP</h1>
            <p className="auth-sub">{info || `Enter the code sent to ${form.phone}`}</p>

            <form onSubmit={handleOtpSubmit} className="auth-form">
              <label>
                Enter OTP
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                />
              </label>

              {error && <p className="auth-error">{error}</p>}

              <button className="btn btn-primary auth-submit" disabled={busy || otp.length < 4}>
                {busy ? "Please wait…" : "Verify & Continue"}
              </button>
              <button type="button" className="auth-toggle" onClick={handleResend} disabled={busy}>
                Resend OTP
              </button>
              <button type="button" className="auth-toggle" onClick={() => { setStep("form"); setError(""); }}>
                ← Change details
              </button>
            </form>
          </>
        )}

        <Link to="/" className="auth-back">← Back to shop</Link>
      </div>
    </div>
  );
}
