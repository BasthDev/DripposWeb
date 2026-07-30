"use client";

import { AlertTriangle, Shield, FileText } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import client, { account } from "../../lib/appwrite";

export const metadata = {
  title: "Login - DripPOS",
  description: "Sign in to your DripPOS dashboard",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErr("");
    setLoading(true);
    try {
      try {
        await account.deleteSession("current");
      } catch {}
      await account.createEmailPasswordSession(email, pass);
      router.push("/dashboard");
    } catch (err: any) {
      setAuthErr(err?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-glass-card slide-up">
        <div className="login-header">
          <div className="login-logo-circle">
            <img
              src="/DP-Logo.png"
              alt="Drip POS Logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>
          <h1 className="login-title">
            Drip<span style={{ color: "var(--primary)" }}>POS</span>
          </h1>
          <p className="login-subtitle">Owner Management Portal</p>
        </div>
        {authErr && (
          <div className="auth-error-alert">
            <AlertTriangle size={14} />
            {authErr}
          </div>
        )}
        <form onSubmit={login} className="login-form">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-wrapper">
              <input
                className="form-input"
                type="email"
                placeholder="owner@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-lg btn-login-submit"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In to Dashboard"}
          </button>
        </form>
        
        {/* Legal Links */}
        <div className="login-legal-links">
          <a href="/privacy-policy" className="login-legal-link">
            <Shield size={14} />
            <span>Privacy Policy</span>
          </a>
          <span className="login-legal-separator">•</span>
          <a href="/terms-of-service" className="login-legal-link">
            <FileText size={14} />
            <span>Terms of Service</span>
          </a>
        </div>
      </div>
    </div>
  );
}