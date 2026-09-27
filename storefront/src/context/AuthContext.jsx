import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }
    api.me()
      .then(setUser)
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  // Returns { otpRequired: true, phone } if the phone still needs OTP verification,
  // otherwise logs the user in and returns { otpRequired: false, user }.
  const login = useCallback(async (email, password) => {
    const data = await api.login({ email, password });
    if (data.status === "otp_required") {
      return { otpRequired: true, phone: data.phone };
    }
    if (!data.access_token) {
      throw new Error("Login failed. Please try again.");
    }
    localStorage.setItem("token", data.access_token);
    setUser(data.user);
    return { otpRequired: false, user: data.user };
  }, []);

  const register = useCallback(async (name, email, password, phone) => {
    const data = await api.register({ name, email, password, phone });
    localStorage.setItem("token", data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
