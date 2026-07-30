"use client";

import { AlertTriangle, ArrowLeft, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { account, functions } from "../../lib/appwrite";

const STARTER_FUNCTION_ID = "6a5fc0df003d2d38b83a";

export default function DeleteAccountPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch (err) {
      // User is not logged in
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (deleteConfirmText !== "DELETE") {
      setError('Type "DELETE" to confirm');
      return;
    }

    if (!password) {
      setError("Enter your password to confirm");
      return;
    }

    if (!confirm("This will permanently delete your account, all staff accounts, and all sync data. This CANNOT be undone.")) {
      return;
    }

    setIsDeleting(true);

    try {
      // Verify credentials first by re-authenticating
      const userAccount = await account.get();
      try {
        // Delete current session first to avoid conflicts
        const sessions = await account.listSessions();
        if (sessions.total > 0) {
          await account.deleteSession('current');
        }
        // Create new session to verify password
        await account.createEmailPasswordSession(userAccount.email, password);
      } catch (error: any) {
        console.error('Password verification failed:', error);
        setError("Incorrect password. Account not deleted.");
        setIsDeleting(false);
        return;
      }

      const userId = userAccount.$id;

      // Call cloud function to hard-delete: staff, sync collection, Appwrite user
      const execution = await functions.createExecution(
        STARTER_FUNCTION_ID,
        JSON.stringify({ action: "deleteAccount", userId }),
      );

      let result: any = {};
      if (typeof execution?.responseBody === "string") {
        try { result = JSON.parse(execution.responseBody); } catch { /* ignore */ }
      }

      if (!result?.success) {
        setError(result?.error ?? "Account deletion failed on server");
        setIsDeleting(false);
        return;
      }

      setSuccess(true);
      
      // Redirect to home after successful deletion
      setTimeout(() => {
        window.location.href = "/";
      }, 3000);

    } catch (err: any) {
      console.error("Delete account error:", err);
      setError(err?.message ?? "Failed to delete account");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="login-page">
        <div style={{ color: "var(--text-muted)", textAlign: "center" }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: "3px solid var(--primary)",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p>Loading...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-page">
        <div className="login-glass-card slide-up">
          <div className="login-header">
            <div
              className="login-logo-circle"
              style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}
            >
              <AlertTriangle size={32} color="white" />
            </div>
            <h1 className="login-title">Not Logged In</h1>
            <p className="login-subtitle">
              You must be logged in to delete your account
            </p>
          </div>

          <button
            onClick={() => (window.location.href = "/")}
            className="btn btn-primary btn-lg"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "16px",
              marginTop: "24px",
            }}
          >
            <ArrowLeft size={20} style={{ marginRight: "8px" }} />
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="login-glass-card slide-up">
          <div className="login-header">
            <div
              className="login-logo-circle"
              style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
            >
              <Trash2 size={32} color="white" />
            </div>
            <h1 className="login-title">Account Deleted</h1>
            <p className="login-subtitle">
              Your account has been permanently deleted. Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-glass-card slide-up">
        <div className="login-header">
          <div
            className="login-logo-circle"
            style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}
          >
            <Trash2 size={32} color="white" />
          </div>
          <h1 className="login-title">Delete Account</h1>
          <p className="login-subtitle">
            Permanently delete your account and all data
          </p>
        </div>

        {error && (
          <div
            className="auth-error-alert"
            style={{
              marginBottom: "16px",
              padding: "12px 16px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "8px",
              color: "#EF4444",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <AlertTriangle size={20} color="#EF4444" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div>
              <p
                style={{
                  color: "#EF4444",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  marginBottom: "8px",
                }}
              >
                Warning: This action cannot be undone
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: "1.5" }}>
                This will permanently delete your account, all staff accounts, and all synced data.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleDeleteAccount} className="login-form">
          <div className="form-group">
            <label className="form-label">Type "DELETE" to confirm</label>
            <div className="input-wrapper">
              <input
                type="text"
                className="form-input"
                placeholder="Type DELETE here"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                style={{ color: "#EF4444" }}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-wrapper">
              <input
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-lg btn-login-submit"
            disabled={isDeleting || deleteConfirmText !== "DELETE" || !password}
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "16px",
              background: deleteConfirmText === "DELETE" && password 
                ? "linear-gradient(135deg, #EF4444, #DC2626)" 
                : "var(--text-muted)",
              cursor: deleteConfirmText === "DELETE" && password ? "pointer" : "not-allowed",
            }}
          >
            {isDeleting ? (
              "Deleting Account..."
            ) : (
              <>
                <Trash2 size={20} style={{ marginRight: "8px" }} />
                Delete Account Forever
              </>
            )}
          </button>
        </form>

        <button
          onClick={() => (window.location.href = "/")}
          className="btn"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "12px",
            marginTop: "16px",
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          <ArrowLeft size={18} style={{ marginRight: "8px" }} />
          Cancel
        </button>
      </div>
    </div>
  );
}