import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginPage, { Username, Password, Submit, Title, Logo } from '@react-login-page/page5';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  
  const { login, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to log in. Please check your credentials.");
    }
  };

  const handleGuest = () => {
    loginAsGuest();
    navigate("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit} style={{ height: "100vh" }}>
      <LoginPage>
        <Logo>
          <div style={{
            width: "45px",
            height: "45px",
            backgroundColor: "#fff",
            borderRadius: "12px",
            color: "#5865F2", 
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "900",
            fontSize: "28px",
            fontFamily: "Arial, sans-serif",
            transform: "rotate(-10deg)",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
          }}>
            W
          </div>
        </Logo>
        <Title>Login</Title>
        <Username 
          name="email" 
          placeholder="Email Address" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Password 
          name="password" 
          placeholder="Password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        
        {error && (
          <div style={{ color: "red", textAlign: "center", margin: "10px 0", fontSize: "14px" }}>
            {error}
          </div>
        )}

        <Submit>Sign In</Submit>

        {/* Guest mode — skip login entirely */}
        <div style={{ textAlign: "center", marginTop: "15px" }}>
          <button
            type="button"
            onClick={handleGuest}
            style={{
              background: "none",
              border: "1.5px solid rgba(255,255,255,0.5)",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "13px",
              fontWeight: "600",
              padding: "7px 18px",
              cursor: "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.2px",
              transition: "border-color .2s, background .2s",
            }}
            onMouseOver={e => { e.target.style.background = "rgba(255,255,255,0.1)"; }}
            onMouseOut={e => { e.target.style.background = "none"; }}
          >
            👤 Continue as Guest
          </button>
        </div>

      </LoginPage>
    </form>
  );
}
