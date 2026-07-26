"use client";

import { executeAppwriteFunction } from "@/lib/appwrite";
import {
    CheckCircle as FiCheckCircle,
    Shield as FiShield,
    Star as FiStar,
    Users as FiUsers,
    XCircle as FiXCircle
} from "lucide-react";
import { useEffect, useState } from "react";

export default function AdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  // Modal state
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subMonths, setSubMonths] = useState(1);
  const [subExpDate, setSubExpDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const auth = sessionStorage.getItem("adminAuth");
    if (auth === "true") {
      setIsAuthenticated(true);
      fetchUsers();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "basthdev" && password === "@Achmed04") {
      setIsAuthenticated(true);
      sessionStorage.setItem("adminAuth", "true");
      setLoginError("");
      fetchUsers();
    } else {
      setLoginError("Invalid credentials");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("adminAuth");
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await executeAppwriteFunction({ action: "listUsers" });
      if (res.success) {
        setUsers(res.users);
      } else {
        setError(res.error || "Failed to fetch users");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const openManageModal = (user: any) => {
    setSelectedUser(user);
    const prefs = user.prefs || {};
    const subs = prefs.isSubs || {};

    setIsSubscribed(Boolean(subs.isSubscribed));
    setSubMonths(subs.months || 1);

    if (subs.expDate) {
      setSubExpDate(new Date(subs.expDate).toISOString().split("T")[0]);
    } else {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      setSubExpDate(d.toISOString().split("T")[0]);
    }
  };

  const saveSubscription = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await executeAppwriteFunction({
        action: "updateUserPlan",
        targetUserId: selectedUser.$id,
        isSubscribed,
        months: subMonths,
        startDate: new Date().toISOString(),
        expDate: subExpDate ? new Date(subExpDate).toISOString() : null,
      });

      if (res.success) {
        setUsers(
          users.map((u) =>
            u.$id === selectedUser.$id ? { ...u, prefs: res.prefs } : u,
          ),
        );
        setSelectedUser(null);
      } else {
        alert("Failed to update: " + res.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Stats calculation
  const activeSubs = users.filter((u) => {
    const s = u.prefs?.isSubs;
    return s && s.isSubscribed && s.expDate && new Date(s.expDate) > new Date();
  }).length;
  const expiredSubs = users.filter((u) => {
    const s = u.prefs?.isSubs;
    return (
      s && s.isSubscribed && s.expDate && new Date(s.expDate) <= new Date()
    );
  }).length;

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.$id.toLowerCase().includes(search.toLowerCase()),
  );

  if (!isAuthenticated) {
    return (
      <div
        className="shell"
        style={{
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F8FAFC",
        }}
      >
        <div className="card" style={{ width: 380, padding: 32 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              style={{
                display: "inline-flex",
                padding: 12,
                borderRadius: 16,
                background: "var(--primary-xlight)",
                color: "var(--primary)",
                marginBottom: 12,
              }}
            >
              <FiShield size={32} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800 }}>Admin Portal</h2>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              Authorized personnel only
            </p>
          </div>

          {loginError && (
            <div
              className="info-panel red"
              style={{ marginBottom: 16, padding: "10px 14px" }}
            >
              <p
                style={{
                  color: "var(--danger-dark)",
                  fontSize: 13,
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                {loginError}
              </p>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
            >
              Secure Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className="shell"
      style={{
        backgroundColor: "#F8FAFC",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      {/* Top Header */}
      <header
        className="top-bar"
        style={{
          padding: "0 28px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: 64,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background:
                "linear-gradient(135deg, var(--primary), var(--primary-dark))",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src="/DP-Logo.png"
              alt="Drip POS Logo"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
          <div>
            <h1
              style={{
                fontSize: 16,
                fontWeight: 800,
                margin: 0,
                color: "var(--text)",
              }}
            >
              DripPOS Admin
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              System Management Portal
            </p>
          </div>
        </div>
        <div>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: 32, overflowY: "auto" }}>
        <div
          className="page-container"
          style={{ maxWidth: 1200, margin: "0 auto" }}
        >
          <div className="page-header">
            <div className="page-title-group">
              <div>
                <h1 className="page-title">Users & Subscriptions</h1>
                <p className="page-subtitle">
                  Manage system users, active plans, and billing states.
                </p>
              </div>
            </div>
            <div className="page-actions">
              <button
                className="btn btn-primary"
                onClick={fetchUsers}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>
          </div>

          {error && (
            <div className="info-panel red">
              <p style={{ color: "var(--danger-dark)", margin: 0 }}>{error}</p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div
                className="stat-card-accent"
                style={{ background: "var(--info)" }}
              />
              <div
                className="stat-card-icon"
                style={{
                  background: "var(--info-light)",
                  color: "var(--info)",
                }}
              >
                <FiUsers size={20} />
              </div>
              <div className="stat-card-label">Total Users</div>
              <div className="stat-card-value">{users.length}</div>
            </div>

            <div className="stat-card">
              <div
                className="stat-card-accent"
                style={{ background: "var(--primary)" }}
              />
              <div
                className="stat-card-icon"
                style={{
                  background: "var(--primary-xlight)",
                  color: "var(--primary)",
                }}
              >
                <FiCheckCircle size={20} />
              </div>
              <div className="stat-card-label">Active Subs</div>
              <div className="stat-card-value">{activeSubs}</div>
            </div>

            <div className="stat-card">
              <div
                className="stat-card-accent"
                style={{ background: "var(--danger)" }}
              />
              <div
                className="stat-card-icon"
                style={{
                  background: "var(--danger-light)",
                  color: "var(--danger)",
                }}
              >
                <FiXCircle size={20} />
              </div>
              <div className="stat-card-label">Expired Subs</div>
              <div className="stat-card-value">{expiredSubs}</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="search-wrap" style={{ flex: 1, minWidth: 250 }}>
              <FiStar
                className="search-icon"
                style={{ color: "var(--text-placeholder)" }}
              />
              <input
                type="text"
                className="form-input search-input"
                placeholder="Search by name, email, or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="card">
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User Details</th>
                    <th>Appwrite ID</th>
                    <th>Status</th>
                    <th>Subscription Plan</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="td-center">
                        Loading users...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="td-center">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const prefs = user.prefs || {};
                      const subs = prefs.isSubs || {};
                      const isSub = Boolean(subs.isSubscribed);

                      let statusBadge = (
                        <span className="badge badge-gray">No Plan</span>
                      );
                      if (isSub) {
                        const isExpired =
                          subs.expDate && new Date(subs.expDate) < new Date();
                        if (isExpired) {
                          statusBadge = (
                            <span className="badge badge-red">Expired</span>
                          );
                        } else {
                          statusBadge = (
                            <span className="badge badge-green">Active</span>
                          );
                        }
                      }

                      return (
                        <tr key={user.$id}>
                          <td>
                            <div className="td-name">
                              {user.name || "Unnamed User"}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--text-muted)",
                              }}
                            >
                              {user.email}
                            </div>
                          </td>
                          <td>
                            <span className="td-mono">{user.$id}</span>
                          </td>
                          <td>
                            {user.status ? (
                              <span className="badge badge-blue">Verified</span>
                            ) : (
                              <span className="badge badge-gray">
                                Unverified
                              </span>
                            )}
                          </td>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              {statusBadge}
                              {isSub && subs.expDate && (
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  Expires:{" "}
                                  {new Date(subs.expDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openManageModal(user)}
                            >
                              Manage Plan
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Manage Modal */}
      {selectedUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Manage Subscription</div>
              <button
                className="btn-icon"
                onClick={() => setSelectedUser(null)}
              >
                <FiXCircle size={20} color="var(--text-muted)" />
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 24,
                  padding: 16,
                  background: "var(--surface-2)",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    background: "var(--primary-xlight)",
                    color: "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {selectedUser.name?.charAt(0) || "U"}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {selectedUser.name}
                  </div>
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: 13,
                      fontFamily: "monospace",
                    }}
                  >
                    {selectedUser.email}
                  </div>
                </div>
              </div>

              <div
                className="form-group"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  paddingBottom: 16,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <input
                  type="checkbox"
                  id="isSub"
                  checked={isSubscribed}
                  onChange={(e) => setIsSubscribed(e.target.checked)}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: "var(--primary)",
                  }}
                />
                <label
                  htmlFor="isSub"
                  style={{ fontWeight: 600, fontSize: 14, cursor: "pointer" }}
                >
                  Enable Subscription Plan
                </label>
              </div>

              <div
                style={{
                  opacity: isSubscribed ? 1 : 0.5,
                  pointerEvents: isSubscribed ? "auto" : "none",
                }}
              >
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">Duration (Months)</label>
                  <select
                    className="form-input form-select"
                    value={subMonths}
                    onChange={(e) => {
                      const m = parseInt(e.target.value);
                      setSubMonths(m);
                      const d = new Date();
                      d.setMonth(d.getMonth() + m);
                      setSubExpDate(d.toISOString().split("T")[0]);
                    }}
                  >
                    <option value={1}>1 Month</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months (1 Year)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={subExpDate}
                    onChange={(e) => setSubExpDate(e.target.value)}
                  />
                  <div className="form-hint">
                    Users lose access to syncing after this date.
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setSelectedUser(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={saveSubscription}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
