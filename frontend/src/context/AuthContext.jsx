import {
  createContext,
  useState,
  useEffect,
  useContext
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in when the app loads
  useEffect(() => {
    const checkSession = async () => {
      // Restore guest session from sessionStorage
      const savedGuest = sessionStorage.getItem("guest_user");
      if (savedGuest) {
        setUser(JSON.parse(savedGuest));
        setLoading(false);
        return;
      }
      try {
        const response = await api.get("/api/auth/me");
        setUser(response.data);
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // Login
  const login = async (email, password) => {
    await api.post("/api/auth/login", {
      email,
      password,
    });

    const response = await api.get("/api/auth/me");
    setUser(response.data);
  };

  // Guest mode — no backend call, instant access
  const loginAsGuest = () => {
    const guestUser = { user_id: "guest", email: "Guest", isGuest: true };
    sessionStorage.setItem("guest_user", JSON.stringify(guestUser));
    setUser(guestUser);
  };

  // Logout
  const logout = async () => {
    sessionStorage.removeItem("guest_user");
    if (!user?.isGuest) {
      try { await api.post("/api/auth/logout"); } catch (_) {}
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom Hook
export function useAuth() {
  return useContext(AuthContext);
}