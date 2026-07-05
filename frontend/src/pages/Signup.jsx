import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/* ── Pixel-match of react-login-page/page5 card look ── */
export default function Signup() {
  const [email, setEmail]                     = useState("");
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError]                     = useState(null);
  const [success, setSuccess]                 = useState(false);
  const [loading, setLoading]                 = useState(false);

  const { signup, login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await signup(email, password);
      setSuccess(true);
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap');

        .p5-wrap {
          height: 100vh; width: 100vw;
          background: #5865F2;
          display: flex; flex-direction: column;
          align-items: center; justify-content: flex-start;
          padding-top: 60px;
          font-family: 'Inter', Arial, sans-serif;
        }

        /* ── Title row (matches page5 header above the card) ── */
        .p5-header {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 20px;
        }
        .p5-badge {
          width: 38px; height: 38px;
          background: #fff; border-radius: 10px;
          color: #5865F2; font-weight: 900; font-size: 22px;
          font-family: Arial, sans-serif;
          display: flex; align-items: center; justify-content: center;
          transform: rotate(-10deg);
          box-shadow: 0 2px 5px rgba(0,0,0,0.15);
        }
        .p5-title {
          color: #fff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;
        }

        /* ── Card ── */
        .p5-card {
          background: #fff;
          border-radius: 14px;
          width: 340px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          position: relative;
        }

        /* teal decorative shape in top-right corner (matches page5) */
        .p5-deco {
          position: absolute; top: 0; right: 0;
          width: 120px; height: 140px;
          background: linear-gradient(135deg, #b2dfdb 0%, #80cbc4 100%);
          border-radius: 0 14px 0 60%;
          z-index: 0; pointer-events: none;
        }

        /* ── Field rows ── */
        .p5-fields { padding: 28px 22px 10px; position: relative; z-index: 1; }

        .p5-row {
          display: flex; align-items: center;
          border-bottom: 1px solid #e8e8e8;
          padding: 8px 0;
          gap: 0;
        }
        .p5-row:last-of-type { border-bottom: none; }

        .p5-label {
          width: 110px; flex-shrink: 0;
          font-size: 13px; font-weight: 500; color: #666;
        }

        .p5-input {
          flex: 1; border: none; outline: none;
          font-size: 13px; color: #222;
          background: transparent;
          font-family: inherit;
          padding: 4px 0;
        }
        .p5-input::placeholder { color: #bbb; }

        /* ── Button row ── */
        .p5-footer { padding: 14px 22px 22px; position: relative; z-index: 1; }

        .p5-btn {
          background: #5865F2;
          color: #fff;
          border: none; border-radius: 6px;
          padding: 9px 22px;
          font-size: 13px; font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          transition: background .2s;
        }
        .p5-btn:hover:not(:disabled) { background: #4752c4; }
        .p5-btn:disabled { opacity: 0.6; cursor: default; }

        /* ── Messages ── */
        .p5-error   { color: #d9534f; font-size: 12px; margin: 6px 22px 0; }
        .p5-success { color: #3a7d44; font-size: 12px; margin: 6px 22px 0; }

        /* ── Bottom link ── */
        .p5-link-row {
          text-align: center; margin-top: 18px;
          font-size: 13px; color: rgba(255,255,255,0.85);
        }
        .p5-link-row a {
          color: #fff; font-weight: 700; text-decoration: underline;
        }
      `}</style>

      <form onSubmit={handleSubmit} className="p5-wrap">
        {/* Header */}
        <div className="p5-header">
          <div className="p5-badge">W</div>
          <span className="p5-title">Sign Up</span>
        </div>

        {/* Card */}
        <div className="p5-card">
          <div className="p5-deco" />

          <div className="p5-fields">
            <div className="p5-row">
              <span className="p5-label">Email Address</span>
              <input
                className="p5-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="p5-row">
              <span className="p5-label">Password</span>
              <input
                className="p5-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="p5-row">
              <span className="p5-label">Confirm</span>
              <input
                className="p5-input"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error   && <div className="p5-error">{error}</div>}
          {success && <div className="p5-success">Account created! Redirecting…</div>}

          <div className="p5-footer">
            <button className="p5-btn" type="submit" disabled={loading}>
              {loading ? "Creating…" : "Sign Up"}
            </button>
          </div>
        </div>

        {/* Bottom link */}
        <div className="p5-link-row">
          Already have an account?{" "}
          <Link to="/login">Sign In</Link>
        </div>
      </form>
    </>
  );
}
