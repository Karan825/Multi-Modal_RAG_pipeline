import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import {
  AuthProvider,
  useAuth,
} from "./context/AuthContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Route Guard
function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  // Still checking session — show a branded spinner
  if (loading) {
    return (
      <div style={{
        height: "100vh", width: "100vw",
        background: "linear-gradient(135deg, #5865F2 0%, #3a3f9c 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "20px",
      }}>
        {/* W badge */}
        <div style={{
          width: "54px", height: "54px", background: "#fff", borderRadius: "14px",
          color: "#5865F2", display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: "900", fontSize: "32px", fontFamily: "Arial,sans-serif",
          transform: "rotate(-10deg)", boxShadow: "0 6px 24px rgba(0,0,0,0.2)",
          marginBottom: "4px",
        }}>W</div>

        {/* Spinner ring */}
        <div style={{
          width: "36px", height: "36px", borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.2)",
          borderTopColor: "#fff",
          animation: "spin 0.8s linear infinite",
        }} />

        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", fontWeight: "500", letterSpacing: "0.2px" }}>
          Connecting…
        </p>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in
  return children;
}


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Public Routes */}

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/signup"
            element={<Navigate to="/login" replace />}
          />

          {/* Protected Routes */}

          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;