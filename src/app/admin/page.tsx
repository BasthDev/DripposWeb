"use client";

/**
 * Admin panel for managing user plans and subscriptions
 * Supports new Basic/Pro plan system with 30-day free trials
 */

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
  const [planTier, setPlanTier] = useState<"basic" | "pro">("basic");
  const [planDuration, setPlanDuration] = useState<1 | 3 | 6 | 12>(1);
  const [planStartDate, setPlanStartDate] = useState("");
  const [planEndDate, setPlanEndDate] = useState("");
  const [isFreeTrial, setIsFreeTrial] = useState(false);
  const [isLegacyUser, setIsLegacyUser] = useState(false);
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
    const planPrefs = prefs.planPreferences || {};
    const userPlan = planPrefs.plan || {};
    const legacy = planPrefs.isLegacyUser || false;

    // Set plan details from new system
    setPlanTier(userPlan.tier || "basic");
    setPlanDuration(userPlan.duration || 1);
    setIsFreeTrial(userPlan.isFreeTrial || false);
    setIsLegacyUser(legacy);

    // Set dates
    if (userPlan.startDate) {
      setPlanStartDate(new Date(userPlan.startDate).toISOString().split("T")[0]);
    } else {
      setPlanStartDate(new Date().toISOString().split("T")[0]);
    }

    if (userPlan.endDate) {
      setPlanEndDate(new Date(userPlan.endDate).toISOString().split("T")[0]);
    } else {
      const d = new Date();
      d.setMonth(d.getMonth() + (userPlan.duration || 1));
      setPlanEndDate(d.toISOString().split("T")[0]);
    }
  };

  const saveSubscription = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await executeAppwriteFunction({
        action: "updateUserPlan",
        targetUserId: selectedUser.$id,
        plan: {
          tier: planTier,
          duration: planDuration,
          startDate: planStartDate ? new Date(planStartDate).toISOString() : new Date().toISOString(),
          endDate: planEndDate ? new Date(planEndDate).toISOString() : null,
          isActive: true,
          isFreeTrial: isFreeTrial,
          isLegacyUser: isLegacyUser,
        },
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

  // Stats calculation with new plan system
  const activeSubs = users.filter((u) => {
    const plan = u.prefs?.planPreferences?.plan;
    return plan && plan.isActive && plan.endDate && new Date(plan.endDate) > new Date();
  }).length;
  const expiredSubs = users.filter((u) => {
    const plan = u.prefs?.planPreferences?.plan;
    return plan && !plan.isActive && plan.endDate && new Date(plan.endDate) <= new Date();
  }).length;
  const trialUsers = users.filter((u) => {
    const plan = u.prefs?.planPreferences?.plan;
    return plan && plan.isFreeTrial && plan.isActive;
  }).length;
  const proUsers = users.filter((u) => {
    const plan = u.prefs?.planPreferences?.plan;
    return plan && plan.tier === "pro" && plan.isActive;
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
              <div className="stat-card-label">Active Plans</div>
              <div className="stat-card-value">{activeSubs}</div>
            </div>

            <div className="stat-card">
              <div
                className="stat-card-accent"
                style={{ background: "var(--warning)" }}
              />
              <div
                className="stat-card-icon"
                style={{
                  background: "var(--warning-light)",
                  color: "var(--warning)",
                }}
              >
                <FiStar size={20} />
              </div>
              <div className="stat-card-label">Free Trials</div>
              <div className="stat-card-value">{trialUsers}</div>
            </div>

            <div className="stat-card">
              <div
                className="stat-card-accent"
                style={{ background: "var(--success)" }}
              />
              <div
                className="stat-card-icon"
                style={{
                  background: "var(--success-light)",
                  color: "var(--success)",
                }}
              >
                <FiShield size={20} />
              </div>
              <div className="stat-card-label">Pro Users</div>
              <div className="stat-card-value">{proUsers}</div>
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
                    filteredUsers.map((singleUser) => {
                      // Process user plan and display status
                      const prefs = singleUser.prefs || {};
                      const planPrefs = prefs.planPreferences || {};
                      const userPlan = planPrefs.plan || {};
                      const legacy = planPrefs.isLegacyUser || false;

                      let statusBadge = (
                        <span className="badge badge-gray">No Plan</span>
                      );
                      
                      if (legacy) {
                        statusBadge = (
                          <span className="badge badge-purple">Legacy</span>
                        );
                      } else if (userPlan.isActive) {
                        if (userPlan.isFreeTrial) {
                          statusBadge = (
                            <span className="badge badge-blue">Free Trial</span>
                          );
                        } else if (userPlan.tier === "pro") {
                          statusBadge = (
                            <span className="badge badge-green">Pro Active</span>
                          );
                        } else {
                          statusBadge = (
                            <span className="badge badge-info">Basic Active</span>
                          );
                        }
                      } else if (userPlan.endDate && new Date(userPlan.endDate) < new Date()) {
                        statusBadge = (
                          <span className="badge badge-red">Expired</span>
                        );
                      } else {
                        statusBadge = (
                            <span className="badge badge-green">Active</span>
                          );
                        }
                      

                      return (
                        <tr key={singleUser.$id}>
                          <td>
                            <div className="td-name">
                              {singleUser.name || "Unnamed User"}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--text-muted)",
                              }}
                            >
                              {singleUser.email}
                            </div>
                          </td>
                          <td>
                            <span className="td-mono">{singleUser.$id}</span>
                          </td>
                          <td>
                            {singleUser.status ? (
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
                              {userPlan.endDate && (
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  {userPlan.isActive ? "Expires: " : "Expired: "}
                                  {new Date(userPlan.endDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openManageModal(singleUser)}
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
                  id="isLegacy"
                  checked={isLegacyUser}
                  onChange={(e) => setIsLegacyUser(e.target.checked)}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: "var(--primary)",
                  }}
                />
                <label
                  htmlFor="isLegacy"
                  style={{ fontWeight: 600, fontSize: 14, cursor: "pointer" }}
                >
                  Legacy User (Grandfathered)
                </label>
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
                  id="isTrial"
                  checked={isFreeTrial}
                  onChange={(e) => setIsFreeTrial(e.target.checked)}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: "var(--primary)",
                  }}
                />
                <label
                  htmlFor="isTrial"
                  style={{ fontWeight: 600, fontSize: 14, cursor: "pointer" }}
                >
                  Free Trial (30 days)
                </label>
              </div>

              <div
                style={{
                  opacity: isLegacyUser ? 0.5 : 1,
                  pointerEvents: isLegacyUser ? "none" : "auto",
                }}
              >
                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">Plan Tier</label>
                  <select
                    className="form-input form-select"
                    value={planTier}
                    onChange={(e) => setPlanTier(e.target.value as "basic" | "pro")}
                    disabled={isLegacyUser}
                  >
                    <option value="basic">Basic (Offline Only)</option>
                    <option value="pro">Pro (Full Features)</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: 16 }}>
                  <label className="form-label">Duration (Months)</label>
                  <select
                    className="form-input form-select"
                    value={planDuration}
                    onChange={(e) => setPlanDuration(parseInt(e.target.value) as 1 | 3 | 6 | 12)}
                    disabled={isLegacyUser || isFreeTrial}
                  >
                    <option value={1}>1 Month</option>
                    <option value={3}>3 Months (10% savings)</option>
                    <option value={6}>6 Months (15% savings)</option>
                    <option value={12}>12 Months (20% savings)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={planStartDate}
                    onChange={(e) => setPlanStartDate(e.target.value)}
                    disabled={isLegacyUser}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={planEndDate}
                    onChange={(e) => setPlanEndDate(e.target.value)}
                    disabled={isLegacyUser}
                  />
                  <div className="form-hint">
                    Users lose access to Pro features after this date.
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