"use client";

import { Query } from "appwrite";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart2,
  BookOpen,
  Box,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Eye,
  FileSpreadsheet,
  FolderTree,
  Layers,
  LayoutDashboard,
  LogOut,
  Minus,
  Package,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShoppingBag,
  Star,
  Trash2,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import client, {
  account,
  appwriteConfig,
  databases,
  executeAppwriteFunction,
  getOwnerSyncCollectionId,
} from "../lib/appwrite";
import {
  deleteProductImage,
  getProductImageUrl,
  uploadProductImage,
} from "../lib/imageStorage";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface SyncDoc {
  $id: string;
  owner_uuid: string;
  entity_type: string;
  payload: string;
  deleted?: boolean;
}
interface TableOrder {
  uuid: string;
  table_id: string | null;
  order_type: string;
  customer_name: string | null;
  status: "paid" | "cancelled" | "open";
  created_at: string;
  paid_at: string | null;
  payment_method: string | null;
  staff_name: string | null;
}
interface OrderItem {
  uuid: string;
  order_id: string;
  product_id: string;
  qty: number;
  unit_price: number;
  sell_price_snapshot: number;
  notes: string | null;
  product_name?: string;
}
interface Product {
  uuid: string;
  name: string;
  sku: string;
  category_id: string | null;
  sell_price: number;
  buy_price: number | null;
  use_hpp?: number;
  recipe_id?: string | null;
  image_uri?: string | null;
}
interface Category {
  uuid: string;
  parent_id?: string;
  name: string;
  color?: string;
}
interface CategoryParent {
  uuid: string;
  name: string;
}
interface Supplier {
  uuid: string;
  name: string;
  contact: string | null;
}
interface Employee {
  uuid: string;
  name: string;
  contact: string | null;
  role: "Owner" | "Admin" | "Staff" | "Cashier";
  pin: string;
  username?: string;
}
interface StaffDoc {
  $id: string;
  name: string;
  role: string;
  username: string;
  owner_uuid: string;
  pin?: string;
}
interface Ingredient {
  uuid: string;
  supplier_id: string | null;
  name: string;
  cost_type: "per_gram_manual" | "per_gram_auto" | "per_pcs";
  buy_price: number | null;
  item_qty: number | null;
  item_unit: "ml" | "l" | "g" | "kg" | "pcs" | null;
  cost_per_gram: number | null;
  current_stock: number;
  restock_threshold?: number | null;
}
interface Recipe {
  uuid: string;
  name: string;
  ingredients?: RecipeIngredient[];
  extras?: RecipeExtra[];
  linked_product_names?: string[];
}
interface RecipeIngredient {
  uuid: string;
  recipe_id: string;
  ingredient_id: string;
  qty_used: number;
  unit?: string;
  ingredient_name?: string;
  item_unit?: string | null;
  cost_per_gram?: number | null;
}
interface RecipeExtra {
  uuid: string;
  recipe_id: string;
  extra_name: string;
  value_type: "flat" | "percentage";
  value: number;
}

type Tab =
  | "overview"
  | "transactions"
  | "employees"
  | "inventory"
  | "recipes"
  | "categories"
  | "products"
  | "suppliers"
  | "account"
  | "subscribe";
type DateRange = "today" | "week" | "month" | "year" | "all";
type ToastType = {
  id: number;
  msg: string;
  kind: "success" | "error" | "info";
};

// ─── Constants ─────────────────────────────────────────────────────────────────
const CHART_COLORS = [
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#F97316",
  "#EF4444",
  "#F59E0B",
  "#EC4899",
  "#14B8A6",
];
const PRIMARY = "#10B981";
const ITEM_UNITS = ["g", "kg", "ml", "l", "pcs"];

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmtCurrency = (n: number) =>
  `Rp ${Math.round(n || 0).toLocaleString("id-ID")}`;
const fmtDate = (s: string) =>
  s
    ? new Date(s).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const fmtShort = (s: string) =>
  s
    ? new Date(s).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
      })
    : "—";
const fmt = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}K`
      : String(Math.round(n));

// ─── Ingredient cost calculation (matches mobile app) ────────────────────────
function normaliseQty(qty: number, unit: string): number {
  if (unit === "kg") return qty * 1000; // → grams
  if (unit === "l") return qty * 1000; // → ml
  return qty; // g, ml, pcs unchanged
}

function getDisplayUnit(unit: string | null): string {
  if (!unit) return "g";
  // Convert to smaller unit for display (same logic as mobile app)
  return unit === "kg" ? "g" : unit === "l" ? "ml" : unit;
}

function formatCostPerUnit(ingredient: Ingredient): string {
  if (ingredient.cost_type === "per_pcs") {
    const val = ingredient.cost_per_gram ?? ingredient.buy_price ?? 0;
    return `${fmtCurrency(val)}/pcs`;
  }
  const val = ingredient.cost_per_gram ?? 0;
  const unit = ingredient.item_unit ?? "g";
  // Convert to smaller unit for display
  const displayUnit = unit === "kg" ? "g" : unit === "l" ? "ml" : unit;
  return `${fmtCurrency(val)}/${displayUnit}`;
}

function computeCostPerGram(
  costType: string,
  buyPrice: number | null,
  itemQty: number | null,
  itemUnit: string | null,
): number | null {
  if (costType === "per_gram_manual") return null; // user supplies directly
  if (costType === "per_pcs") return buyPrice;
  if (
    costType === "per_gram_auto" &&
    buyPrice != null &&
    itemQty != null &&
    itemUnit != null
  ) {
    const normalised = normaliseQty(itemQty, itemUnit);
    return normalised > 0 ? buyPrice / normalised : null;
  }
  return null;
}

function genUuid(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`.slice(0, 36);
}

function inRange(dateStr: string, range: DateRange) {
  if (!dateStr) return false;
  const d = new Date(dateStr),
    now = new Date();
  if (range === "all") return true;
  if (range === "today") return d.toDateString() === now.toDateString();
  if (range === "week") {
    const w = new Date(now);
    w.setDate(now.getDate() - 7);
    return d >= w;
  }
  if (range === "month")
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  if (range === "year") return d.getFullYear() === now.getFullYear();
  return true;
}

function getPreviousRange(range: DateRange): DateRange {
  if (range === "today") return "today";
  if (range === "week") return "week";
  if (range === "month") return "month";
  if (range === "year") return "year";
  return "all";
}

function inPrevRange(dateStr: string, range: DateRange) {
  if (!dateStr || range === "all") return false;
  const d = new Date(dateStr),
    now = new Date();
  if (range === "today") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return d.toDateString() === yesterday.toDateString();
  }
  if (range === "week") {
    const w2 = new Date(now);
    w2.setDate(now.getDate() - 14);
    const w1 = new Date(now);
    w1.setDate(now.getDate() - 7);
    return d >= w2 && d < w1;
  }
  if (range === "month") {
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return (
      d.getFullYear() === prevMonth.getFullYear() &&
      d.getMonth() === prevMonth.getMonth()
    );
  }
  if (range === "year") return d.getFullYear() === now.getFullYear() - 1;
  return false;
}

function calcChange(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

// ─── Export to Excel ────────────────────────────────────────────────────────────
function exportXlsx(
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const wb = XLSX.utils.book_new();
  const wsData = [headers, ...rows.map((r) => r.map((v) => v ?? ""))];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Style header row
  const headerRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[cellAddr]) continue;
    ws[cellAddr].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "10B981" } },
      alignment: { horizontal: "center" },
    };
  }

  // Auto column widths
  const colWidths = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => String(r[i] ?? "").length),
    );
    return { wch: Math.min(maxLen + 4, 40) };
  });
  ws["!cols"] = colWidths;

  // Freeze header row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── Multi-sheet Excel export ──────────────────────────────────────────────────
function exportXlsxMultiSheet(
  filename: string,
  sheets: {
    name: string;
    headers: string[];
    rows: (string | number | null | undefined)[][];
  }[],
) {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const wsData = [
      sheet.headers,
      ...sheet.rows.map((r) => r.map((v) => v ?? "")),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const colWidths = sheet.headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...sheet.rows.map((r) => String(r[i] ?? "").length),
      );
      return { wch: Math.min(maxLen + 4, 40) };
    });
    ws["!cols"] = colWidths;
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
let toastSeq = 0;
function useToast() {
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const show = useCallback(
    (msg: string, kind: ToastType["kind"] = "success") => {
      const id = ++toastSeq;
      setToasts((p) => [...p, { id, msg, kind }]);
      setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
    },
    [],
  );
  return { toasts, show };
}

// ─── Appwrite Helpers ───────────────────────────────────────────────────────────
async function fetchAllSync(
  ownerUuid: string,
  entityType: string,
): Promise<SyncDoc[]> {
  const all: SyncDoc[] = [];
  let cursor: string | undefined;
  const collectionId = getOwnerSyncCollectionId(ownerUuid);
  for (;;) {
    const q = [Query.equal("entity_type", entityType), Query.limit(100)];
    if (cursor) q.push(Query.cursorAfter(cursor));
    const res = await databases.listDocuments(
      appwriteConfig.databaseId!,
      collectionId,
      q,
    );
    all.push(...(res.documents as unknown as SyncDoc[]));
    if (res.documents.length < 100) break;
    cursor = res.documents[res.documents.length - 1].$id;
  }
  return all.filter((d) => !d.deleted);
}

function parseSync<T>(docs: SyncDoc[]): T[] {
  return docs.flatMap((d) => {
    try {
      return [JSON.parse(d.payload) as T];
    } catch {
      return [];
    }
  });
}

async function fetchStaffDocs(ownerUuid: string): Promise<StaffDoc[]> {
  const q = [Query.equal("owner_uuid", ownerUuid), Query.limit(200)];
  const res = await databases.listDocuments(
    appwriteConfig.databaseId!,
    appwriteConfig.staffCollectionId,
    q,
  );
  return res.documents as unknown as StaffDoc[];
}

async function upsertSyncDoc(
  documentId: string,
  entityType: string,
  ownerUuid: string,
  payload: Record<string, any>,
) {
  const docId = documentId.slice(0, 36);
  const now = new Date().toISOString();
  const collectionId = getOwnerSyncCollectionId(ownerUuid);
  const data = {
    entity_type: entityType,
    payload: JSON.stringify({ ...payload, updated_at: now }),
    updated_at: now,
    deleted: false,
  };
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId!,
      collectionId,
      docId,
      data,
    );
  } catch {
    await databases.createDocument(
      appwriteConfig.databaseId!,
      collectionId,
      docId,
      data,
    );
  }
}

async function deleteSyncDoc(documentId: string, ownerUuid: string) {
  const docId = documentId.slice(0, 36);
  const now = new Date().toISOString();
  const collectionId = getOwnerSyncCollectionId(ownerUuid);
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId!,
      collectionId,
      docId,
      {
        deleted: true,
        updated_at: now,
        payload: "{}",
      },
    );
  } catch (err) {
    console.error("[deleteSyncDoc] Failed:", err);
  }
}

async function upsertStaffDoc(
  documentId: string,
  ownerUuid: string,
  name: string,
  pin: string,
  role: string,
  username: string,
) {
  const docId = documentId.slice(0, 36);
  const data = {
    name,
    username: username.toLowerCase().replace(/\s+/g, ""),
    pin: String(pin),
    role,
    owner_uuid: ownerUuid,
  };
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId!,
      appwriteConfig.staffCollectionId,
      docId,
      data,
    );
  } catch {
    await databases.createDocument(
      appwriteConfig.databaseId!,
      appwriteConfig.staffCollectionId,
      docId,
      data,
    );
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// REUSABLE COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

/** Consistent page header used in every tab */
const PageHeader = memo(function PageHeader({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div className="page-title-group">
        <div
          className="page-icon"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
});

/** Unified filter bar with search + optional pills/selects */
const FilterBar = memo(function FilterBar({
  search,
  onSearch,
  placeholder,
  children,
}: {
  search: string;
  onSearch: (v: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="filter-bar">
      <div className="search-wrap">
        <Search size={14} className="search-icon" />
        <input
          className="form-input search-input"
          placeholder={placeholder || "Search…"}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      {children && <div className="filter-divider" />}
      {children}
    </div>
  );
});

/** Stat card with comparison badge */
const StatCard = memo(function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  bg,
  change,
  changeLabel,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  change?: number;
  changeLabel?: string;
}) {
  const valLen = value.length;
  const sizeClass = valLen > 12 ? "sm" : valLen > 8 ? "md" : "";
  return (
    <div className="stat-card">
      <div className="stat-card-accent" style={{ background: color }} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div className="stat-card-icon" style={{ background: bg, color }}>
          {icon}
        </div>
        {change !== undefined && (
          <span
            className={`compare-badge ${change > 0 ? "up" : change < 0 ? "down" : "flat"}`}
          >
            {change > 0 ? (
              <ArrowUp size={9} />
            ) : change < 0 ? (
              <ArrowDown size={9} />
            ) : (
              <Minus size={9} />
            )}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="stat-card-label">{label}</div>
      <div className={`stat-card-value ${sizeClass}`}>{value}</div>
      {(sub || changeLabel) && (
        <div className="stat-card-sub">
          <span style={{ color: "var(--text-muted)" }}>
            {sub || changeLabel}
          </span>
        </div>
      )}
    </div>
  );
});

/** Empty state component */
const EmptyState = memo(function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "56px 24px",
        gap: 10,
        color: "var(--text-muted)",
      }}
    >
      {icon && <div className="empty-icon">{icon}</div>}
      <div
        style={{
          fontWeight: 600,
          fontSize: "0.9375rem",
          color: "var(--text-3)",
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{ fontSize: "0.8125rem", textAlign: "center", maxWidth: 280 }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
});

/** Export button */
const ExportBtn = memo(function ExportBtn({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button className="btn btn-secondary btn-sm" onClick={onClick}>
      <FileSpreadsheet size={13} />
      Export Excel
    </button>
  );
});

/** Metric row for summary panels */
const MetricRow = memo(function MetricRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="metric-row">
      <span className="metric-label">{label}</span>
      <span className="metric-value" style={{ color: accent || "var(--text)" }}>
        {value}
      </span>
    </div>
  );
});

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [loading, setLoading] = useState(true);
  const { toasts, show } = useToast();

  const fetchUser = async () => {
    const u = await account.get();
    const prefs = await account.getPrefs();
    return { ...u, prefs };
  };

  useEffect(() => {
    fetchUser()
      .then((u) => setUser(u))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErr("");
    setLoading(true);
    try {
      try {
        await account.deleteSession("current");
      } catch {}
      await account.createEmailPasswordSession(email, pass);
      setUser(await fetchUser());
    } catch (err: any) {
      setAuthErr(err?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await account.deleteSession("current").catch(() => {});
    setUser(null);
  };

  const reloadUser = async () => {
    try {
      setUser(await fetchUser());
    } catch {}
  };

  if (loading)
    return (
      <div className="login-page">
        <div style={{ color: "var(--text-muted)", textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid var(--primary)",
              borderRightColor: "transparent",
              borderRadius: "50%",
              animation: "spin .7s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <div style={{ fontWeight: 600 }}>Loading Drip POS…</div>
        </div>
      </div>
    );

  if (!user)
    return (
      <>
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
              <div className="form-group" style={{ marginBottom: 24 }}>
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
          </div>
        </div>
        <Toasts toasts={toasts} />
      </>
    );

  return (
    <Dashboard
      user={user}
      onLogout={logout}
      showToast={show}
      toasts={toasts}
      reloadUser={reloadUser}
    />
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD SHELL
// ══════════════════════════════════════════════════════════════════════════════
function Dashboard({
  user,
  onLogout,
  showToast,
  toasts,
  reloadUser,
}: {
  user: any;
  onLogout: () => void;
  showToast: (m: string, k?: any) => void;
  toasts: ToastType[];
  reloadUser: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const isSubscribed =
    user?.prefs?.isSubs?.isSubscribed === true ||
    user?.prefs?.isSubscribed === "true";
  const isExpired = user?.prefs?.isSubs?.expDate
    ? new Date() > new Date(user.prefs.isSubs.expDate)
    : false;
  const hasActiveSub = isSubscribed && !isExpired;
  const [busy, setBusy] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const [orders, setOrders] = useState<TableOrder[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryParents, setCategoryParents] = useState<CategoryParent[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [staff, setStaff] = useState<StaffDoc[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setBusy(true);
      try {
        const uid = user.$id;
        const [oD, iD, pD, cD, cpD, ingD, supD, rD, riD, reD, staffList] =
          await Promise.all([
            fetchAllSync(uid, "table_order"),
            fetchAllSync(uid, "order_item"),
            fetchAllSync(uid, "product"),
            fetchAllSync(uid, "category"),
            fetchAllSync(uid, "category_parent"),
            fetchAllSync(uid, "ingredient"),
            fetchAllSync(uid, "supplier"),
            fetchAllSync(uid, "recipe"),
            fetchAllSync(uid, "recipe_ingredient"),
            fetchAllSync(uid, "recipe_extra"),
            fetchStaffDocs(uid).catch(() => [] as StaffDoc[]),
          ]);
        const prods = parseSync<Product>(pD);
        const prodMap = Object.fromEntries(prods.map((p) => [p.uuid, p]));
        const ings = parseSync<Ingredient>(ingD);
        const ingMap = Object.fromEntries(ings.map((i) => [i.uuid, i]));
        const items = parseSync<OrderItem>(iD).map((it) => ({
          ...it,
          product_name: prodMap[it.product_id]?.name ?? "Unknown",
        }));
        const rawRecipes = parseSync<Recipe>(rD);
        const rawRIngreds = parseSync<RecipeIngredient>(riD).map((ri) => ({
          ...ri,
          ingredient_name: ingMap[ri.ingredient_id]?.name ?? "Unknown",
          item_unit: ingMap[ri.ingredient_id]?.item_unit ?? "g",
          unit: ri.unit || ingMap[ri.ingredient_id]?.item_unit || "g",
        }));
        const rawRExtras = parseSync<RecipeExtra>(reD);
        const rawCategoryParents = parseSync<CategoryParent>(cpD);
        const employees: Employee[] = staffList.map((s) => ({
          uuid: s.$id,
          name: s.name || "Unnamed Staff",
          username:
            s.username || (s.name || "").toLowerCase().replace(/\s+/g, ""),
          pin: s.pin || "••••",
          role: (s.role as Employee["role"]) || "Staff",
          contact: "",
        }));
        const fullRecipes = rawRecipes.map((r) => {
          const rIngs = rawRIngreds.filter((ri) => ri.recipe_id === r.uuid);
          const rExtras = rawRExtras.filter((re) => re.recipe_id === r.uuid);
          const linked = prods
            .filter((p) => p.recipe_id === r.uuid)
            .map((p) => p.name);
          return {
            ...r,
            name: r.name || "Unnamed Recipe",
            ingredients: rIngs,
            extras: rExtras,
            linked_product_names: linked,
          };
        });
        setOrders(parseSync<TableOrder>(oD));
        setOrderItems(items);
        setProducts(prods);
        setCategories(parseSync<Category>(cD));
        setCategoryParents(rawCategoryParents);
        setEmployees(employees);
        setStaff(staffList);
        setIngredients(ings);
        setSuppliers(parseSync<Supplier>(supD));
        setRecipes(fullRecipes);
        if (!silent) showToast("Data refreshed", "success");
      } catch (err: any) {
        if (!silent) showToast(`Load error: ${err?.message}`, "error");
      } finally {
        if (!silent) setBusy(false);
      }
    },
    [user.$id, showToast],
  );

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!appwriteConfig.databaseId || !user.$id) return;
    const collectionId = getOwnerSyncCollectionId(user.$id);
    const channelSync = `databases.${appwriteConfig.databaseId}.collections.${collectionId}.documents`;
    const channelStaff = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.staffCollectionId}.documents`;
    try {
      const unsubscribe = client.subscribe([channelSync, channelStaff], () => {
        setRealtimeActive(true);
        void load(true);
      });
      setRealtimeActive(true);
      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.warn("[Realtime]", err);
    }
  }, [user.$id, load]);

  const refresh = () => setRefreshKey((k) => k + 1);

  const NAV: {
    id: Tab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
    {
      id: "transactions",
      label: "Transactions",
      icon: <ShoppingBag size={16} />,
    },
    { id: "employees", label: "Employees", icon: <Users size={16} /> },
    {
      id: "inventory",
      label: "Inventory",
      icon: <Package size={16} />,
      badge:
        ingredients.filter((i) => i.current_stock <= (i.restock_threshold ?? 5))
          .length || undefined,
    },
    { id: "recipes", label: "Recipes", icon: <BookOpen size={16} /> },
    { id: "categories", label: "Categories", icon: <FolderTree size={16} /> },
    { id: "products", label: "Products", icon: <Box size={16} /> },
    { id: "suppliers", label: "Suppliers", icon: <Users size={16} /> },
    { id: "account", label: "Account", icon: <LayoutDashboard size={16} /> },
    { id: "subscribe", label: "Subscribe", icon: <CreditCard size={16} /> },
  ];

  const initials = (user.name || "O")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const currentNav = NAV.find((n) => n.id === tab);

  const tabSubtitle: Record<Tab, string> = {
    overview: "Realtime business performance & analytics",
    transactions: "Live transaction history & reports",
    employees: "Manage staff accounts & access",
    inventory: "Track ingredients & stock levels",
    recipes: "Product recipes & cost structures",
    categories: "Manage product categories",
    products: "Products, pricing & catalog",
    suppliers: "Manage vendors & supplier info",
    account: "Account & security settings",
    subscribe: "Manage your subscription plan",
  };

  return (
    <>
      <div className="shell">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-logo">
              <img
                src="/DP-Logo.png"
                alt="Drip POS Logo"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
            <div>
              <div className="brand-name">Drip POS</div>
              <div className="brand-sub">Management</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {NAV.map((n) => (
              <button
                key={n.id}
                className={`nav-item${tab === n.id ? " active" : ""}`}
                onClick={() => setTab(n.id)}
              >
                <span className="nav-icon">{n.icon}</span>
                <span className="nav-label">{n.label}</span>
                {n.badge ? <span className="nav-badge">{n.badge}</span> : null}
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-card" onClick={onLogout} title="Logout">
              <div className="user-avatar">{initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="user-name"
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.name}
                </div>
                <div className="user-role">Owner · Click to Logout</div>
              </div>
              <LogOut
                size={13}
                style={{ color: "var(--danger)", flexShrink: 0 }}
              />
            </div>
          </div>
        </aside>

        {/* ── Content ── */}
        <div className="content-area">
          {/* Top bar */}
          <div className="top-bar">
            <div className="top-bar-left">
              <span className="top-bar-breadcrumb">Drip POS /</span>
              <span className="top-bar-title">{currentNav?.label}</span>
            </div>
            <div className="top-bar-right">
              {realtimeActive && (
                <div className="live-badge">
                  <span className="live-dot" />
                  Live
                </div>
              )}
              <button
                className={`btn btn-secondary btn-sm${busy ? " btn-spin" : ""}`}
                onClick={refresh}
                disabled={busy}
              >
                {!busy && (
                  <>
                    <RefreshCw size={12} /> Refresh
                  </>
                )}
              </button>
            </div>
          </div>

          <main className="main">
            {busy ? (
              <Skeleton />
            ) : (
              <>
                {!hasActiveSub && tab !== "subscribe" ? (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 40,
                    }}
                  >
                    <EmptyState
                      icon={<CreditCard size={48} />}
                      title="Subscription Required"
                      subtitle="You need an active subscription to access management features, cloud syncing, and reports."
                    />
                  </div>
                ) : (
                  <>
                    {tab === "overview" && (
                      <OverviewTab
                        orders={orders}
                        orderItems={orderItems}
                        products={products}
                        categories={categories}
                        staff={staff}
                        ingredients={ingredients}
                      />
                    )}
                    {tab === "transactions" && (
                      <TxTab
                        orders={orders}
                        orderItems={orderItems}
                        ownerUuid={user.$id}
                        showToast={showToast}
                        onRefresh={refresh}
                      />
                    )}
                    {tab === "employees" && (
                      <EmpTab
                        employees={employees}
                        ownerUuid={user.$id}
                        showToast={showToast}
                        onRefresh={refresh}
                      />
                    )}
                    {tab === "inventory" && (
                      <InvTab
                        ingredients={ingredients}
                        suppliers={suppliers}
                        ownerUuid={user.$id}
                        showToast={showToast}
                        onRefresh={refresh}
                      />
                    )}
                    {tab === "recipes" && (
                      <RecipeTab
                        recipes={recipes}
                        products={products}
                        ingredients={ingredients}
                        ownerUuid={user.$id}
                        showToast={showToast}
                        onRefresh={refresh}
                      />
                    )}
                    {tab === "categories" && (
                      <CategoriesTab
                        categories={categories}
                        categoryParents={categoryParents}
                        ownerUuid={user.$id}
                        showToast={showToast}
                        onRefresh={refresh}
                      />
                    )}
                    {tab === "products" && (
                      <ProductsTab
                        products={products}
                        categories={categories}
                        recipes={recipes}
                        ownerUuid={user.$id}
                        showToast={showToast}
                        onRefresh={refresh}
                      />
                    )}
                    {tab === "suppliers" && (
                      <SuppliersTab
                        suppliers={suppliers}
                        ownerUuid={user.$id}
                        showToast={showToast}
                        onRefresh={refresh}
                      />
                    )}
                    {tab === "account" && (
                      <AccountTab
                        user={user}
                        showToast={showToast}
                        onRefresh={refresh}
                      />
                    )}
                  </>
                )}
                {tab === "subscribe" && (
                  <SubscribeTab
                    user={user}
                    showToast={showToast}
                    onRefresh={refresh}
                    reloadUser={reloadUser}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>
      <Toasts toasts={toasts} />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB — Rich analytics with comparisons
// ══════════════════════════════════════════════════════════════════════════════
const OverviewTab = memo(function OverviewTab({
  orders,
  orderItems,
  products,
  categories,
  staff,
  ingredients,
}: {
  orders: TableOrder[];
  orderItems: OrderItem[];
  products: Product[];
  categories: Category[];
  staff: StaffDoc[];
  ingredients: Ingredient[];
}) {
  const [range, setRange] = useState<DateRange>("month");

  const paid = useMemo(
    () =>
      orders.filter(
        (o) => o.status === "paid" && o.paid_at && inRange(o.paid_at, range),
      ),
    [orders, range],
  );

  const paidPrev = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === "paid" && o.paid_at && inPrevRange(o.paid_at, range),
      ),
    [orders, range],
  );

  const revenue = useMemo(
    () =>
      paid.reduce(
        (s, o) =>
          s +
          orderItems
            .filter((i) => i.order_id === o.uuid)
            .reduce((t, i) => t + i.qty * i.sell_price_snapshot, 0),
        0,
      ),
    [paid, orderItems],
  );

  const revenuePrev = useMemo(
    () =>
      paidPrev.reduce(
        (s, o) =>
          s +
          orderItems
            .filter((i) => i.order_id === o.uuid)
            .reduce((t, i) => t + i.qty * i.sell_price_snapshot, 0),
        0,
      ),
    [paidPrev, orderItems],
  );

  const avgOrder = paid.length > 0 ? revenue / paid.length : 0;
  const avgOrderPrev = paidPrev.length > 0 ? revenuePrev / paidPrev.length : 0;

  const cancelled = orders.filter(
    (o) => o.status === "cancelled" && inRange(o.created_at, range),
  ).length;
  const cancelledPrev = orders.filter(
    (o) => o.status === "cancelled" && inPrevRange(o.created_at, range),
  ).length;

  const lowStock = ingredients.filter(
    (i) => i.current_stock <= (i.restock_threshold ?? 5),
  );
  const cashierCount = staff.filter((s) => s.role !== "Owner").length;

  const revenueByDay = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of paid) {
      if (!o.paid_at) continue;
      const day = o.paid_at.slice(0, 10);
      const total = orderItems
        .filter((i) => i.order_id === o.uuid)
        .reduce((s, i) => s + i.qty * i.sell_price_snapshot, 0);
      m[day] = (m[day] ?? 0) + total;
    }
    return Object.entries(m)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([d, v]) => ({ date: fmtShort(d), revenue: v }));
  }, [paid, orderItems]);

  // Category revenue
  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.uuid, c.name])),
    [categories],
  );
  const catRevenue = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of paid) {
      for (const it of orderItems.filter((i) => i.order_id === o.uuid)) {
        const cat = it.product_id
          ? (catMap[
              products.find((p) => p.uuid === it.product_id)?.category_id || ""
            ] ?? "Uncategorized")
          : "Uncategorized";
        m[cat] = (m[cat] ?? 0) + it.qty * it.sell_price_snapshot;
      }
    }
    return Object.entries(m)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [paid, orderItems, catMap, products]);

  // Payment methods
  const payMethods = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of paid) {
      const k = o.payment_method ?? "Unknown";
      m[k] = (m[k] ?? 0) + 1;
    }
    return Object.entries(m)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [paid]);

  // Top products
  const topProds = useMemo(() => {
    const m: Record<string, { name: string; qty: number; revenue: number }> =
      {};
    for (const o of paid) {
      for (const it of orderItems.filter((i) => i.order_id === o.uuid)) {
        if (!m[it.product_id])
          m[it.product_id] = {
            name: it.product_name ?? "?",
            qty: 0,
            revenue: 0,
          };
        m[it.product_id].qty += it.qty;
        m[it.product_id].revenue += it.qty * it.sell_price_snapshot;
      }
    }
    return Object.values(m)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [paid, orderItems]);

  // Staff performance
  const staffPerf = useMemo(() => {
    const m: Record<string, { name: string; orders: number; revenue: number }> =
      {};
    for (const o of paid) {
      const k = o.staff_name ?? "Unknown";
      if (!m[k]) m[k] = { name: k, orders: 0, revenue: 0 };
      m[k].orders += 1;
      m[k].revenue += orderItems
        .filter((i) => i.order_id === o.uuid)
        .reduce((s, i) => s + i.qty * i.sell_price_snapshot, 0);
    }
    return Object.values(m)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [paid, orderItems]);

  // Order type breakdown
  const orderTypes = useMemo(() => {
    const m: Record<string, number> = {};
    for (const o of paid) {
      const k = o.order_type || "Unknown";
      m[k] = (m[k] ?? 0) + 1;
    }
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [paid]);

  // Hourly Sales Trend
  const hourlyTrend = useMemo(() => {
    const m = Array(24).fill(0);
    for (const o of paid) {
      if (!o.paid_at) continue;
      const hour = new Date(o.paid_at).getHours();
      const total = orderItems
        .filter((i) => i.order_id === o.uuid)
        .reduce((s, i) => s + i.qty * i.sell_price_snapshot, 0);
      m[hour] += total;
    }
    return m.map((revenue, hour) => ({
      time: `${hour.toString().padStart(2, "0")}:00`,
      revenue,
    }));
  }, [paid, orderItems]);

  // Recent Transactions
  const recentOrders = useMemo(() => {
    return [...paid]
      .sort((a, b) => (b.paid_at || "").localeCompare(a.paid_at || ""))
      .slice(0, 5);
  }, [paid]);

  const maxQty = topProds[0]?.qty ?? 1;

  const RANGES: [DateRange, string][] = [
    ["today", "Today"],
    ["week", "7 Days"],
    ["month", "Month"],
    ["year", "Year"],
    ["all", "All"],
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-title-group">
          <div
            className="page-icon"
            style={{
              background: "var(--primary-xlight)",
              color: "var(--primary)",
            }}
          >
            <LayoutDashboard size={22} />
          </div>
          <div>
            <h1 className="page-title">Business Overview</h1>
            <p className="page-subtitle">Analytics & performance insights</p>
          </div>
        </div>
        <div className="page-actions">
          <div className="date-pills">
            {RANGES.map(([v, l]) => (
              <button
                key={v}
                className={`date-pill${range === v ? " active" : ""}`}
                onClick={() => setRange(v)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <StatCard
          label="Total Revenue"
          value={fmtCurrency(revenue)}
          icon={<TrendingUp size={18} />}
          color="#10B981"
          bg="#ECFDF5"
          sub={`${paid.length} paid orders`}
          change={
            range !== "all" ? calcChange(revenue, revenuePrev) : undefined
          }
          changeLabel="vs previous period"
        />
        <StatCard
          label="Orders"
          value={fmt(paid.length)}
          icon={<ShoppingBag size={18} />}
          color="#3B82F6"
          bg="#EFF6FF"
          sub={`Avg ${fmtCurrency(Math.round(avgOrder))}`}
          change={
            range !== "all"
              ? calcChange(paid.length, paidPrev.length)
              : undefined
          }
        />
        <StatCard
          label="Avg Order Value"
          value={fmtCurrency(Math.round(avgOrder))}
          icon={<CreditCard size={18} />}
          color="#8B5CF6"
          bg="#F5F3FF"
          sub="per transaction"
          change={
            range !== "all"
              ? calcChange(Math.round(avgOrder), Math.round(avgOrderPrev))
              : undefined
          }
        />
        <StatCard
          label="Staff Members"
          value={String(cashierCount)}
          icon={<Users size={18} />}
          color="#F97316"
          bg="#FFF7ED"
          sub={`${staff.length} total in system`}
        />
        <StatCard
          label="Products"
          value={String(products.length)}
          icon={<Box size={18} />}
          color="#14B8A6"
          bg="#F0FDFA"
          sub={`${categories.length} categories`}
        />
        <StatCard
          label="Low Stock"
          value={String(lowStock.length)}
          icon={<AlertTriangle size={18} />}
          color="#EF4444"
          bg="#FEF2F2"
          sub={`${cancelled} cancelled orders`}
          change={
            range !== "all" ? calcChange(cancelled, cancelledPrev) : undefined
          }
        />
      </div>

      {/* Charts row 1 */}
      <div className="g2">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <TrendingUp size={16} style={{ color: "var(--primary)" }} />{" "}
                Revenue Over Time
              </div>
              <div className="card-subtitle">
                {revenueByDay.length} data points
              </div>
            </div>
          </div>
          <div className="card-body">
            {revenueByDay.length === 0 ? (
              <EmptyState
                icon={<BarChart2 size={36} />}
                title="No data"
                subtitle="No paid orders in this period"
              />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={revenueByDay}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={PRIMARY} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(v: any) => [fmtCurrency(Number(v)), "Revenue"]}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={PRIMARY}
                    strokeWidth={2}
                    fill="url(#rg)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Layers size={16} style={{ color: "var(--purple)" }} /> Revenue
                by Category
              </div>
              <div className="card-subtitle">
                {catRevenue.length} categories
              </div>
            </div>
          </div>
          <div className="card-body">
            {catRevenue.length === 0 ? (
              <EmptyState icon={<Layers size={36} />} title="No data" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={catRevenue}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {catRevenue.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => fmtCurrency(Number(v))}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="g2">
        {/* Top Products */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Star size={16} style={{ color: "var(--warning)" }} /> Top
                Products
              </div>
              <div className="card-subtitle">By revenue</div>
            </div>
          </div>
          <div className="card-body" style={{ padding: "12px 20px" }}>
            {topProds.length === 0 ? (
              <EmptyState icon={<Box size={36} />} title="No data" />
            ) : (
              topProds.map((p, i) => (
                <div key={p.name} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          background: CHART_COLORS[i % CHART_COLORS.length],
                          borderRadius: 5,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.5625rem",
                          fontWeight: 800,
                          color: "#fff",
                        }}
                      >
                        {i + 1}
                      </span>
                      {p.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-3)",
                        textAlign: "right",
                      }}
                    >
                      <span style={{ fontWeight: 700, color: "var(--text)" }}>
                        {fmtCurrency(p.revenue)}
                      </span>
                      <span style={{ marginLeft: 6, opacity: 0.7 }}>
                        ({p.qty} sold)
                      </span>
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(p.qty / maxQty) * 100}%`,
                        background: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <CreditCard size={16} style={{ color: "var(--info)" }} />{" "}
                Payment Methods
              </div>
              <div className="card-subtitle">{payMethods.length} methods</div>
            </div>
          </div>
          <div className="card-body">
            {payMethods.length === 0 ? (
              <EmptyState icon={<CreditCard size={36} />} title="No data" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={payMethods}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "var(--text-2)" }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" name="Orders" radius={[0, 4, 4, 0]}>
                    {payMethods.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Staff Performance + Order Types */}
      <div className="g2">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Users size={16} style={{ color: "var(--purple)" }} /> Staff
                Performance
              </div>
              <div className="card-subtitle">Revenue generated per staff</div>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {staffPerf.length === 0 ? (
              <EmptyState icon={<Users size={36} />} title="No staff data" />
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      background: "var(--bg)",
                      borderBottom: "2px solid var(--border)",
                    }}
                  >
                    <th
                      style={{
                        padding: "10px 16px",
                        textAlign: "left",
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        color: "var(--text-muted)",
                      }}
                    >
                      Staff
                    </th>
                    <th
                      style={{
                        padding: "10px 16px",
                        textAlign: "right",
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        color: "var(--text-muted)",
                      }}
                    >
                      Orders
                    </th>
                    <th
                      style={{
                        padding: "10px 16px",
                        textAlign: "right",
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: ".06em",
                        color: "var(--text-muted)",
                      }}
                    >
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {staffPerf.map((s, i) => (
                    <tr
                      key={s.name}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td
                        style={{
                          padding: "11px 16px",
                          fontSize: "0.8125rem",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            background: CHART_COLORS[i % CHART_COLORS.length],
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: "0.625rem",
                            fontWeight: 700,
                          }}
                        >
                          {i + 1}
                        </span>
                        <span style={{ fontWeight: 600 }}>{s.name}</span>
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          textAlign: "right",
                          fontSize: "0.8125rem",
                        }}
                      >
                        {s.orders}
                      </td>
                      <td
                        style={{
                          padding: "11px 16px",
                          textAlign: "right",
                          fontSize: "0.8125rem",
                          fontWeight: 700,
                          color: "var(--primary-dark)",
                        }}
                      >
                        {fmtCurrency(s.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">
                <Zap size={16} style={{ color: "var(--orange)" }} /> Order
                Summary
              </div>
              <div className="card-subtitle">Breakdown for selected period</div>
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <MetricRow
                label="Total Paid Orders"
                value={String(paid.length)}
                accent="var(--primary-dark)"
              />
              <MetricRow
                label="Total Revenue"
                value={fmtCurrency(revenue)}
                accent="var(--primary-dark)"
              />
              <MetricRow
                label="Average Order Value"
                value={fmtCurrency(Math.round(avgOrder))}
              />
              <MetricRow
                label="Cancelled Orders"
                value={String(cancelled)}
                accent={cancelled > 0 ? "var(--danger)" : undefined}
              />
              <MetricRow
                label="Total Products"
                value={String(products.length)}
              />
              <MetricRow
                label="Total Categories"
                value={String(categories.length)}
              />
              <MetricRow label="Active Staff" value={String(cashierCount)} />
              <MetricRow
                label="Low Stock Items"
                value={String(lowStock.length)}
                accent={lowStock.length > 0 ? "var(--danger)" : undefined}
              />
            </div>
            {orderTypes.length > 0 && (
              <>
                <hr />
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.8125rem",
                    marginBottom: 8,
                    color: "var(--text-2)",
                  }}
                >
                  Order Types
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {orderTypes.map((t) => (
                    <span
                      key={t.name}
                      className="chip"
                      style={{ fontSize: "0.75rem" }}
                    >
                      {t.name}:{" "}
                      <strong style={{ marginLeft: 3 }}>{t.value}</strong>
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="info-panel red">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <AlertTriangle size={16} style={{ color: "var(--danger)" }} />
            <span
              style={{
                fontWeight: 700,
                fontSize: "0.9375rem",
                color: "var(--danger)",
              }}
            >
              Low Stock Alert — {lowStock.length} items need restocking
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {lowStock.map((i) => (
              <span
                key={i.uuid}
                className="badge badge-red"
                style={{ fontSize: "0.75rem", padding: "4px 10px" }}
              >
                {i.name} — {i.current_stock} {i.item_unit ?? "units"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// TRANSACTIONS TAB
// ══════════════════════════════════════════════════════════════════════════════
const TxTab = memo(function TxTab({
  orders,
  orderItems,
  ownerUuid,
  showToast,
  onRefresh,
}: {
  orders: TableOrder[];
  orderItems: OrderItem[];
  ownerUuid: string;
  showToast: (m: string, k?: any) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<DateRange>("month");
  const [status, setStatus] = useState<"all" | "paid" | "cancelled">("all");
  const [selected, setSelected] = useState<TableOrder | null>(null);

  const getTotal = useCallback(
    (id: string) =>
      orderItems
        .filter((i) => i.order_id === id)
        .reduce((s, i) => s + i.qty * i.sell_price_snapshot, 0),
    [orderItems],
  );

  const filtered = useMemo(
    () =>
      orders
        .filter((o) => {
          const dateOk = inRange(o.paid_at || o.created_at, range);
          const statusOk = status === "all" || o.status === status;
          const q = search.toLowerCase();
          const searchOk =
            !q ||
            (o.uuid || "").toLowerCase().includes(q) ||
            (o.customer_name ?? "").toLowerCase().includes(q) ||
            (o.staff_name ?? "").toLowerCase().includes(q) ||
            (o.payment_method ?? "").toLowerCase().includes(q);
          return dateOk && statusOk && searchOk;
        })
        .sort((a, b) =>
          (b.paid_at || b.created_at || "").localeCompare(
            a.paid_at || a.created_at || "",
          ),
        ),
    [orders, range, status, search],
  );

  // Summary stats for filtered
  const paidFiltered = filtered.filter((o) => o.status === "paid");
  const totalRev = paidFiltered.reduce((s, o) => s + getTotal(o.uuid), 0);
  const avgVal = paidFiltered.length > 0 ? totalRev / paidFiltered.length : 0;
  const cancelledCount = filtered.filter(
    (o) => o.status === "cancelled",
  ).length;

  // Payment method breakdown
  const payBreakdown = useMemo(() => {
    const m: Record<string, { count: number; revenue: number }> = {};
    for (const o of paidFiltered) {
      const k = o.payment_method ?? "Unknown";
      if (!m[k]) m[k] = { count: 0, revenue: 0 };
      m[k].count++;
      m[k].revenue += getTotal(o.uuid);
    }
    return Object.entries(m).sort(([, a], [, b]) => b.revenue - a.revenue);
  }, [paidFiltered, getTotal]);

  const doExport = () => {
    exportXlsxMultiSheet(
      `transactions_${range}_${new Date().toISOString().slice(0, 10)}`,
      [
        {
          name: "Transactions",
          headers: [
            "Order ID",
            "Date",
            "Status",
            "Customer",
            "Staff",
            "Payment Method",
            "Order Type",
            "Total (Rp)",
          ],
          rows: filtered.map((o) => [
            o.uuid,
            fmtDate(o.paid_at || o.created_at),
            o.status,
            o.customer_name ?? "",
            o.staff_name ?? "",
            o.payment_method ?? "",
            o.order_type,
            getTotal(o.uuid),
          ]),
        },
        {
          name: "Summary",
          headers: ["Metric", "Value"],
          rows: [
            ["Period", range],
            ["Total Transactions", filtered.length],
            ["Paid Orders", paidFiltered.length],
            ["Cancelled Orders", cancelledCount],
            ["Total Revenue (Rp)", totalRev],
            ["Average Order Value (Rp)", Math.round(avgVal)],
          ],
        },
        {
          name: "Payment Methods",
          headers: ["Payment Method", "Orders", "Revenue (Rp)"],
          rows: payBreakdown.map(([k, v]) => [k, v.count, v.revenue]),
        },
      ],
    );
    showToast("Excel report exported", "success");
  };

  const RANGES: [DateRange, string][] = [
    ["today", "Today"],
    ["week", "7d"],
    ["month", "Month"],
    ["year", "Year"],
    ["all", "All"],
  ];

  return (
    <div className="page-container">
      <PageHeader
        icon={<ShoppingBag size={22} />}
        iconBg="var(--info-light)"
        iconColor="var(--info)"
        title="Transactions"
        subtitle={`${filtered.length} transactions found`}
      >
        <ExportBtn onClick={doExport} />
      </PageHeader>

      {/* Summary stats */}
      <div className="stats-grid">
        <StatCard
          label="Total Revenue"
          value={fmtCurrency(totalRev)}
          icon={<TrendingUp size={18} />}
          color="#10B981"
          bg="#ECFDF5"
          sub={`${paidFiltered.length} paid orders`}
        />
        <StatCard
          label="Paid Orders"
          value={String(paidFiltered.length)}
          icon={<CheckCircle2 size={18} />}
          color="#3B82F6"
          bg="#EFF6FF"
          sub={`Avg ${fmtCurrency(Math.round(avgVal))}`}
        />
        <StatCard
          label="Cancelled"
          value={String(cancelledCount)}
          icon={<X size={18} />}
          color="#EF4444"
          bg="#FEF2F2"
          sub={
            paidFiltered.length > 0
              ? `${Math.round((cancelledCount / filtered.length) * 100)}% cancel rate`
              : "—"
          }
        />
        <StatCard
          label="Avg Order"
          value={fmtCurrency(Math.round(avgVal))}
          icon={<CreditCard size={18} />}
          color="#8B5CF6"
          bg="#F5F3FF"
          sub="per transaction"
        />
      </div>

      {/* Filter bar */}
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search order ID, customer, staff, payment…"
      >
        <div className="date-pills">
          {RANGES.map(([v, l]) => (
            <button
              key={v}
              className={`date-pill${range === v ? " active" : ""}`}
              onClick={() => setRange(v)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="filter-divider" />
        <select
          className="form-input form-select"
          style={{ width: "auto" }}
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </FilterBar>

      {/* Payment breakdown cards */}
      {payBreakdown.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {payBreakdown.map(([k, v]) => (
            <div
              key={k}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "10px 16px",
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    color: "var(--text-muted)",
                  }}
                >
                  {k}
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                  {fmtCurrency(v.revenue)}
                </div>
                <div style={{ fontSize: "0.6875rem", color: "var(--text-3)" }}>
                  {v.count} orders
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Staff</th>
              <th>Payment</th>
              <th>Type</th>
              <th>Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    icon={<ShoppingBag size={36} />}
                    title="No transactions found"
                    subtitle="Try adjusting your date range or search"
                  />
                </td>
              </tr>
            ) : (
              filtered.slice(0, 300).map((o) => (
                <tr key={o.uuid}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {fmtDate(o.paid_at || o.created_at)}
                  </td>
                  <td className="td-mono">{(o.uuid || "").slice(0, 8)}…</td>
                  <td>{o.customer_name ?? <Dash />}</td>
                  <td>{o.staff_name ?? <Dash />}</td>
                  <td>{o.payment_method ?? <Dash />}</td>
                  <td>
                    <span className="chip">{o.order_type}</span>
                  </td>
                  <td className="td-num">{fmtCurrency(getTotal(o.uuid))}</td>
                  <td>
                    <span
                      className={`badge ${o.status === "paid" ? "badge-green" : o.status === "cancelled" ? "badge-red" : "badge-yellow"}`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => setSelected(o)}
                    >
                      <Eye size={13} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <TxDetailModal
          order={selected}
          items={orderItems.filter((i) => i.order_id === selected.uuid)}
          onClose={() => setSelected(null)}
          onCancelOrder={async () => {
            try {
              if (selected.status !== "paid") return;
              const ok = window.confirm(
                "Are you sure you want to cancel this order? This cannot be undone.",
              );
              if (!ok) return;

              const updated = { ...selected, status: "cancelled" };
              await upsertSyncDoc(
                updated.uuid,
                "table_order",
                ownerUuid,
                updated,
              );
              showToast("Order cancelled successfully", "success");
              setSelected(null);
              onRefresh();
            } catch (err: any) {
              showToast(err.message || "Failed to cancel order", "error");
            }
          }}
        />
      )}
    </div>
  );
});

const TxDetailModal = memo(function TxDetailModal({
  order,
  items,
  onClose,
  onCancelOrder,
}: {
  order: TableOrder;
  items: OrderItem[];
  onClose: () => void;
  onCancelOrder: () => void;
}) {
  const total = items.reduce((s, i) => s + i.qty * i.sell_price_snapshot, 0);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="modal-title">Transaction Detail</span>
            {order.status === "paid" && (
              <button className="btn btn-danger btn-sm" onClick={onCancelOrder}>
                Cancel Order
              </button>
            )}
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <div className="modal-body">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px 24px",
              marginBottom: 20,
            }}
          >
            {[
              ["Order ID", order.uuid],
              ["Date", fmtDate(order.paid_at || order.created_at)],
              ["Status", order.status],
              ["Type", order.order_type],
              ["Customer", order.customer_name || "—"],
              ["Staff", order.staff_name || "—"],
              ["Payment", order.payment_method || "—"],
              ["Total", fmtCurrency(total)],
            ].map(([k, v]) => (
              <div key={k}>
                <div
                  style={{
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: ".06em",
                    color: "var(--text-muted)",
                    marginBottom: 3,
                  }}
                >
                  {k}
                </div>
                <div
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    wordBreak: "break-all",
                  }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>
          <hr />
          <h4
            style={{ marginBottom: 12, fontSize: "0.875rem", fontWeight: 700 }}
          >
            Items ({items.length})
          </h4>
          {items.length === 0 ? (
            <EmptyState title="No items found" />
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.uuid}>
                      <td className="td-name">{it.product_name}</td>
                      <td>{it.qty}</td>
                      <td>{fmtCurrency(it.sell_price_snapshot)}</td>
                      <td style={{ fontWeight: 700 }}>
                        {fmtCurrency(it.qty * it.sell_price_snapshot)}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td
                      colSpan={3}
                      style={{ textAlign: "right", fontWeight: 700 }}
                    >
                      Total
                    </td>
                    <td
                      style={{
                        fontWeight: 800,
                        fontSize: "1.0625rem",
                        color: "var(--primary-dark)",
                      }}
                    >
                      {fmtCurrency(total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// EMPLOYEES TAB
// ══════════════════════════════════════════════════════════════════════════════
const EmpTab = memo(function EmpTab({
  employees,
  ownerUuid,
  showToast,
  onRefresh,
}: {
  employees: Employee[];
  ownerUuid: string;
  showToast: (m: string, k?: any) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Employee | null | "new">(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(
    () =>
      (employees || []).filter((e) => {
        const q = search.toLowerCase();
        return (
          String(e?.name ?? "")
            .toLowerCase()
            .includes(q) ||
          String(e?.username ?? "")
            .toLowerCase()
            .includes(q) ||
          String(e?.role ?? "")
            .toLowerCase()
            .includes(q)
        );
      }),
    [employees, search],
  );

  // Role breakdown
  const roleBreakdown = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of employees) {
      m[e.role] = (m[e.role] ?? 0) + 1;
    }
    return Object.entries(m);
  }, [employees]);

  const ROLE_BADGE: Record<string, string> = {
    Owner: "badge-purple",
    Cashier: "badge-blue",
    Staff: "badge-green",
    Admin: "badge-yellow",
  };

  const doSave = async (data: Partial<Employee>) => {
    setSaving(true);
    try {
      const uuid = form !== "new" && form ? form.uuid : genUuid("emp");
      const name = data.name || "Unnamed Staff";
      const pin = String(data.pin || "1234");
      const role = (data.role as Employee["role"]) || "Staff";
      const username = (data.username || name)
        .toLowerCase()
        .replace(/\s+/g, "");
      const contact = data.contact ?? "";

      if (form === "new") {
        const existingStaff = await databases.listDocuments(
          appwriteConfig.databaseId!,
          appwriteConfig.staffCollectionId,
          [
            Query.equal("owner_uuid", ownerUuid),
            Query.equal("username", username),
          ],
        );
        if (existingStaff.documents.length > 0) {
          showToast("Employee with this name already exists", "error");
          setSaving(false);
          return;
        }
        const existingPin = await databases.listDocuments(
          appwriteConfig.databaseId!,
          appwriteConfig.staffCollectionId,
          [Query.equal("owner_uuid", ownerUuid), Query.equal("pin", pin)],
        );
        if (existingPin.documents.length > 0) {
          showToast("Employee with this PIN already exists", "error");
          setSaving(false);
          return;
        }
      }

      await upsertSyncDoc(uuid, "employee", ownerUuid, {
        uuid,
        name,
        username,
        pin,
        role,
        contact,
      });
      await upsertStaffDoc(uuid, ownerUuid, name, pin, role, username);
      showToast(
        form === "new" ? "Employee added" : "Employee updated",
        "success",
      );
      setForm(null);
      onRefresh();
    } catch (e: any) {
      showToast(`Save failed: ${e?.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await deleteSyncDoc(deleting.uuid, ownerUuid);
      try {
        await databases.deleteDocument(
          appwriteConfig.databaseId!,
          appwriteConfig.staffCollectionId,
          deleting.uuid.slice(0, 36),
        );
      } catch {}
      showToast("Employee removed", "success");
      setDeleting(null);
      onRefresh();
    } catch (e: any) {
      showToast(`Delete failed: ${e?.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const doExport = () => {
    exportXlsxMultiSheet(`employees_${new Date().toISOString().slice(0, 10)}`, [
      {
        name: "Employees",
        headers: ["Name", "Username", "Role", "Contact"],
        rows: filtered.map((e) => [
          e.name,
          e.username ?? e.name,
          e.role,
          e.contact ?? "",
        ]),
      },
      {
        name: "Role Summary",
        headers: ["Role", "Count"],
        rows: roleBreakdown.map(([r, c]) => [r, c]),
      },
    ]);
    showToast("Excel report exported", "success");
  };

  return (
    <div className="page-container">
      <PageHeader
        icon={<Users size={22} />}
        iconBg="var(--purple-light)"
        iconColor="var(--purple)"
        title="Employees"
        subtitle={`${employees.length} staff members`}
      >
        <ExportBtn onClick={doExport} />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setForm("new")}
        >
          <Plus size={13} />
          Add Employee
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Total Staff"
          value={String(employees.length)}
          icon={<Users size={18} />}
          color="#8B5CF6"
          bg="#F5F3FF"
          sub="registered accounts"
        />
        <StatCard
          label="Cashiers"
          value={String(employees.filter((e) => e.role === "Cashier").length)}
          icon={<CreditCard size={18} />}
          color="#3B82F6"
          bg="#EFF6FF"
          sub="cashier accounts"
        />
        <StatCard
          label="Staff"
          value={String(employees.filter((e) => e.role === "Staff").length)}
          icon={<Users size={18} />}
          color="#10B981"
          bg="#ECFDF5"
          sub="staff accounts"
        />
        <StatCard
          label="Admins"
          value={String(employees.filter((e) => e.role === "Admin").length)}
          icon={<Zap size={18} />}
          color="#F59E0B"
          bg="#FFFBEB"
          sub="admin accounts"
        />
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search name, username, or role…"
      />

      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Contact</th>
              <th>PIN</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={<Users size={36} />}
                    title={
                      employees.length === 0 ? "No employees yet" : "No results"
                    }
                    subtitle="Click 'Add Employee' to create one"
                  />
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.uuid || Math.random()}>
                  <td className="td-name">{e.name || "Unnamed Staff"}</td>
                  <td className="td-mono">
                    {e.username ||
                      (e.name || "").toLowerCase().replace(/\s+/g, "")}
                  </td>
                  <td>
                    <span
                      className={`badge ${ROLE_BADGE[e.role] ?? "badge-gray"}`}
                    >
                      {e.role || "Staff"}
                    </span>
                  </td>
                  <td>{e.contact || <Dash />}</td>
                  <td>
                    <span className="chip">
                      {"•".repeat(e.pin?.length || 4)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setForm(e)}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="btn btn-danger btn-icon btn-sm"
                        onClick={() => setDeleting(e)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {form !== null && (
        <EmpFormModal
          employee={form === "new" ? null : form}
          onSave={doSave}
          onClose={() => setForm(null)}
          saving={saving}
        />
      )}
      {deleting && (
        <Confirm
          title="Remove Employee"
          msg={`Remove "${deleting.name || "this employee"}"?`}
          onOk={doDelete}
          onCancel={() => setDeleting(null)}
          loading={saving}
        />
      )}
    </div>
  );
});

const EmpFormModal = memo(function EmpFormModal({
  employee,
  onSave,
  onClose,
  saving,
}: {
  employee: Employee | null;
  onSave: (d: Partial<Employee>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(employee?.name ?? "");
  const [username, setUsername] = useState(
    employee?.username ??
      (employee?.name ?? "").toLowerCase().replace(/\s+/g, ""),
  );
  const [pin, setPin] = useState(employee?.pin ?? "");
  const [role, setRole] = useState<Employee["role"]>(employee?.role ?? "Staff");
  const [contact, setContact] = useState(employee?.contact ?? "");

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">
            {employee ? "Edit Employee" : "Add Employee"}
          </span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              className="form-input"
              value={name}
              placeholder="Full name"
              onChange={(e) => {
                setName(e.target.value);
                if (!employee)
                  setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""));
              }}
            />
          </div>
          <div className="g2">
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input
                className="form-input"
                value={username}
                placeholder="username"
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">PIN *</label>
              <input
                className="form-input"
                type="password"
                value={pin}
                placeholder="••••"
                maxLength={4}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
              />
            </div>
          </div>
          <div className="g2">
            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-input form-select"
                value={role}
                onChange={(e) => setRole(e.target.value as Employee["role"])}
              >
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
                <option value="Owner">Owner</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Contact</label>
              <input
                className="form-input"
                value={contact}
                placeholder="+62…"
                onChange={(e) => setContact(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn btn-primary btn-sm${saving ? " btn-spin" : ""}`}
            onClick={() => onSave({ name, username, pin, role, contact })}
            disabled={saving || !name || !pin}
          >
            {!saving && (employee ? "Save Changes" : "Add Employee")}
          </button>
        </div>
      </div>
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// INVENTORY TAB
// ══════════════════════════════════════════════════════════════════════════════
const InvTab = memo(function InvTab({
  ingredients,
  suppliers,
  ownerUuid,
  showToast,
  onRefresh,
}: {
  ingredients: Ingredient[];
  suppliers: Supplier[];
  ownerUuid: string;
  showToast: (m: string, k?: any) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "ok">("all");
  const [form, setForm] = useState<Ingredient | null | "new">(null);
  const [deleting, setDeleting] = useState<Ingredient | null>(null);
  const [saving, setSaving] = useState(false);

  const isLow = (i: Ingredient) =>
    (i?.current_stock ?? 0) <= (i?.restock_threshold ?? 5);
  const lowItems = ingredients.filter(isLow);
  const okItems = ingredients.filter((i) => !isLow(i));

  const filtered = useMemo(
    () =>
      (ingredients || []).filter((i) => {
        const sq = (i?.name ?? "").toLowerCase().includes(search.toLowerCase());
        const fq =
          stockFilter === "all" ||
          (stockFilter === "low" && isLow(i)) ||
          (stockFilter === "ok" && !isLow(i));
        return sq && fq;
      }),
    [ingredients, search, stockFilter],
  );

  const supMap = Object.fromEntries(
    (suppliers || []).map((s) => [s.uuid, s.name]),
  );

  // Cost analysis
  const totalInventoryValue = useMemo(
    () =>
      ingredients.reduce(
        (s, i) => s + (i.buy_price ?? 0) * (i.current_stock ?? 0),
        0,
      ),
    [ingredients],
  );

  const doSave = async (data: Partial<Ingredient>) => {
    setSaving(true);
    try {
      const uuid = form !== "new" && form ? form.uuid : genUuid("ing");
      const cost_per_gram = computeCostPerGram(
        data.cost_type ?? "per_gram_auto",
        data.buy_price ?? null,
        data.item_qty ?? null,
        data.item_unit ?? null,
      );
      await upsertSyncDoc(uuid, "ingredient", ownerUuid, {
        uuid,
        ...data,
        cost_per_gram,
      });
      showToast(
        form === "new" ? "Ingredient added" : "Ingredient updated",
        "success",
      );
      setForm(null);
      onRefresh();
    } catch (e: any) {
      showToast(`Save failed: ${e?.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await deleteSyncDoc(deleting.uuid, ownerUuid);
      showToast("Ingredient removed", "success");
      setDeleting(null);
      onRefresh();
    } catch (e: any) {
      showToast(`Delete failed: ${e?.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const doExport = () => {
    exportXlsxMultiSheet(`inventory_${new Date().toISOString().slice(0, 10)}`, [
      {
        name: "Ingredients",
        headers: [
          "Name",
          "Status",
          "Stock",
          "Unit",
          "Threshold",
          "Cost Type",
          "Buy Price (Rp)",
          "Qty/Pack",
          "Cost/Unit (Rp)",
          "Supplier",
        ],
        rows: filtered.map((i) => [
          i.name,
          isLow(i) ? "Low Stock" : "OK",
          i.current_stock,
          i.item_unit ?? "",
          i.restock_threshold ?? 5,
          i.cost_type,
          i.buy_price ?? 0,
          i.item_qty ?? "",
          i.cost_per_gram ? Math.round(i.cost_per_gram * 100) / 100 : "",
          i.supplier_id ? (supMap[i.supplier_id] ?? "") : "",
        ]),
      },
      {
        name: "Summary",
        headers: ["Metric", "Value"],
        rows: [
          ["Total Ingredients", ingredients.length],
          ["Low Stock Items", lowItems.length],
          ["OK Stock Items", okItems.length],
          ["Estimated Inventory Value (Rp)", Math.round(totalInventoryValue)],
        ],
      },
      {
        name: "Low Stock Alert",
        headers: ["Name", "Current Stock", "Unit", "Threshold", "Supplier"],
        rows: lowItems.map((i) => [
          i.name,
          i.current_stock,
          i.item_unit ?? "",
          i.restock_threshold ?? 5,
          i.supplier_id ? (supMap[i.supplier_id] ?? "") : "",
        ]),
      },
    ]);
    showToast("Excel report exported", "success");
  };

  const STOCK_BTNS: ["all" | "low" | "ok", string][] = [
    ["all", "All"],
    ["low", "Low Stock"],
    ["ok", "OK"],
  ];

  return (
    <div className="page-container">
      <PageHeader
        icon={<Package size={22} />}
        iconBg="var(--warning-light)"
        iconColor="var(--warning)"
        title="Inventory"
        subtitle={`${ingredients.length} ingredients tracked`}
      >
        <ExportBtn onClick={doExport} />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setForm("new")}
        >
          <Plus size={13} />
          Add Ingredient
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Total Ingredients"
          value={String(ingredients.length)}
          icon={<Package size={18} />}
          color="#F59E0B"
          bg="#FFFBEB"
          sub="all tracked items"
        />
        <StatCard
          label="Low Stock"
          value={String(lowItems.length)}
          icon={<AlertTriangle size={18} />}
          color="#EF4444"
          bg="#FEF2F2"
          sub="need restocking"
        />
        <StatCard
          label="OK Stock"
          value={String(okItems.length)}
          icon={<CheckCircle2 size={18} />}
          color="#10B981"
          bg="#ECFDF5"
          sub="sufficient stock"
        />
        <StatCard
          label="Est. Value"
          value={fmtCurrency(totalInventoryValue)}
          icon={<TrendingUp size={18} />}
          color="#8B5CF6"
          bg="#F5F3FF"
          sub="total inventory value"
        />
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search ingredients…"
      >
        <div className="stock-filter-row">
          {STOCK_BTNS.map(([v, l]) => (
            <button
              key={v}
              className={`stock-filter-btn${stockFilter === v ? " active" : ""}`}
              onClick={() => setStockFilter(v)}
            >
              {l}
              <span
                className={`badge ${v === "low" ? "badge-red" : v === "ok" ? "badge-green" : "badge-gray"}`}
              >
                {v === "all"
                  ? ingredients.length
                  : v === "low"
                    ? lowItems.length
                    : okItems.length}
              </span>
            </button>
          ))}
        </div>
      </FilterBar>

      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Cost Type</th>
              <th>Stock</th>
              <th>Unit</th>
              <th>Cost/Unit</th>
              <th>Buy Price</th>
              <th>Qty/Pack</th>
              <th>Supplier</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <EmptyState
                    icon={<Package size={36} />}
                    title={
                      ingredients.length === 0
                        ? "No ingredients yet"
                        : "No results"
                    }
                    subtitle="Click 'Add Ingredient' to get started"
                  />
                </td>
              </tr>
            ) : (
              filtered.map((i) => (
                <tr key={i.uuid}>
                  <td className="td-name">{i.name}</td>
                  <td>
                    <span className="chip">
                      {i.cost_type === "per_gram_auto" && "Auto Calc"}
                      {i.cost_type === "per_gram_manual" && "Manual/g"}
                      {i.cost_type === "per_pcs" && "Per Pcs"}
                      {!i.cost_type && "Auto Calc"}
                    </span>
                  </td>
                  <td
                    style={{
                      fontWeight: 700,
                      color: isLow(i) ? "var(--danger)" : "var(--primary-dark)",
                    }}
                  >
                    {i.current_stock}
                  </td>
                  <td>{getDisplayUnit(i.item_unit)}</td>
                  <td style={{ fontWeight: 600, color: "var(--primary-dark)" }}>
                    {formatCostPerUnit(i)}
                  </td>
                  <td>
                    {i.buy_price != null ? fmtCurrency(i.buy_price) : "—"}
                  </td>
                  <td>{i.item_qty ?? "—"}</td>
                  <td>
                    {i.supplier_id ? (supMap[i.supplier_id] ?? "—") : "—"}
                  </td>
                  <td>
                    <span
                      className={`badge ${isLow(i) ? "badge-red" : "badge-green"}`}
                    >
                      {isLow(i) ? "Low" : "OK"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => setForm(i)}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="btn btn-danger btn-icon btn-sm"
                        onClick={() => setDeleting(i)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {form !== null && (
        <InvFormModal
          ingredient={form === "new" ? null : form}
          suppliers={suppliers}
          onSave={doSave}
          onClose={() => setForm(null)}
          saving={saving}
        />
      )}
      {deleting && (
        <Confirm
          title="Remove Ingredient"
          msg={`Remove "${deleting.name}"?`}
          onOk={doDelete}
          onCancel={() => setDeleting(null)}
          loading={saving}
        />
      )}
    </div>
  );
});

const InvFormModal = memo(function InvFormModal({
  ingredient,
  suppliers,
  onSave,
  onClose,
  saving,
}: {
  ingredient: Ingredient | null;
  suppliers: Supplier[];
  onSave: (d: Partial<Ingredient>) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(ingredient?.name ?? "");
  const [costType, setCostType] = useState<Ingredient["cost_type"]>(
    ingredient?.cost_type ?? "per_gram_auto",
  );
  const [buyPrice, setBuyPrice] = useState(String(ingredient?.buy_price ?? ""));
  const [itemQty, setItemQty] = useState(String(ingredient?.item_qty ?? ""));
  const [unit, setUnit] = useState<Ingredient["item_unit"]>(
    ingredient?.item_unit ?? "g",
  );
  const [costPerGram, setCostPerGram] = useState(
    String(ingredient?.cost_per_gram ?? ""),
  );
  const [stock, setStock] = useState(String(ingredient?.current_stock ?? 0));
  const [threshold, setThreshold] = useState(
    String(ingredient?.restock_threshold ?? 5),
  );
  const [supId, setSupId] = useState(ingredient?.supplier_id ?? "");

  // Live computed cost for per_gram_auto
  const computedCost = useMemo(() => {
    if (costType !== "per_gram_auto") return null;
    const bp = parseFloat(buyPrice);
    const iq = parseFloat(itemQty);
    if (isNaN(bp) || isNaN(iq)) return null;
    return computeCostPerGram(costType, bp, iq, unit);
  }, [costType, buyPrice, itemQty, unit]);

  return (
    <div className="modal-overlay">
      <div className="modal modal-wide">
        <div className="modal-header">
          <span className="modal-title">
            {ingredient ? "Edit Ingredient" : "Add Ingredient"}
          </span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <div className="modal-body">
          <div className="g2">
            <div className="form-group">
              <label className="form-label">Ingredient Name *</label>
              <input
                className="form-input"
                value={name}
                placeholder="e.g. Arabica Beans"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Supplier</label>
              <select
                className="form-input form-select"
                value={supId}
                onChange={(e) => setSupId(e.target.value)}
              >
                <option value="">No supplier</option>
                {suppliers.map((s) => (
                  <option key={s.uuid} value={s.uuid}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Cost Calculation Type</label>
            <select
              className="form-input form-select"
              value={costType}
              onChange={(e) =>
                setCostType(e.target.value as Ingredient["cost_type"])
              }
            >
              <option value="per_gram_auto">
                Auto Calc (Buy Price / Qty per Pack)
              </option>
              <option value="per_gram_manual">Manual Cost per Unit</option>
              <option value="per_pcs">Per Piece / Item</option>
            </select>
          </div>

          {/* Conditional fields based on cost type */}
          {costType === "per_gram_manual" && (
            <div className="form-group">
              <label className="form-label">Cost per gram (Rp)</label>
              <input
                className="form-input"
                type="number"
                min={0}
                step="0.01"
                value={costPerGram}
                placeholder="e.g. 0.05"
                onChange={(e) => setCostPerGram(e.target.value)}
              />
            </div>
          )}

          {costType === "per_gram_auto" && (
            <>
              <div className="g2">
                <div className="form-group">
                  <label className="form-label">Buy Price (Rp)</label>
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    value={buyPrice}
                    placeholder="e.g. 15000"
                    onChange={(e) => setBuyPrice(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Qty per Pack</label>
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    value={itemQty}
                    placeholder="e.g. 1000"
                    onChange={(e) => setItemQty(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select
                  className="form-input form-select"
                  value={unit ?? "g"}
                  onChange={(e) =>
                    setUnit(e.target.value as Ingredient["item_unit"])
                  }
                >
                  {ITEM_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              {computedCost != null && (
                <div
                  style={{
                    background: "var(--primary-xlight)",
                    border: "1px solid var(--primary)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: "600" }}>
                    Cost per{" "}
                    {unit === "kg" ? "g" : unit === "l" ? "ml" : (unit ?? "g")}{" "}
                    ≈
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "var(--primary)",
                    }}
                  >
                    {fmtCurrency(computedCost)}
                  </span>
                </div>
              )}
            </>
          )}

          {costType === "per_pcs" && (
            <div className="form-group">
              <label className="form-label">Buy Price per piece (Rp)</label>
              <input
                className="form-input"
                type="number"
                min={0}
                value={buyPrice}
                placeholder="e.g. 500"
                onChange={(e) => setBuyPrice(e.target.value)}
              />
            </div>
          )}

          <div className="g2">
            <div className="form-group">
              <label className="form-label">Current Stock *</label>
              <input
                className="form-input"
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Low Stock Alert Threshold</label>
              <input
                className="form-input"
                type="number"
                min={0}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn btn-primary btn-sm${saving ? " btn-spin" : ""}`}
            onClick={() => {
              const data: Partial<Ingredient> = {
                name,
                cost_type: costType,
                buy_price: buyPrice ? Number(buyPrice) : null,
                item_qty: itemQty ? Number(itemQty) : null,
                item_unit: unit,
                current_stock: Number(stock),
                restock_threshold: Number(threshold),
                supplier_id: supId || null,
              };
              // Add cost_per_gram for manual mode
              if (costType === "per_gram_manual") {
                data.cost_per_gram = costPerGram ? Number(costPerGram) : null;
              }
              onSave(data);
            }}
            disabled={saving || !name}
          >
            {!saving && (ingredient ? "Save Changes" : "Add Ingredient")}
          </button>
        </div>
      </div>
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// RECIPES TAB
// ══════════════════════════════════════════════════════════════════════════════
const RecipeTab = memo(function RecipeTab({
  recipes,
  products,
  ingredients,
  ownerUuid,
  showToast,
  onRefresh,
}: {
  recipes: Recipe[];
  products: Product[];
  ingredients: Ingredient[];
  ownerUuid: string;
  showToast: (m: string, k?: any) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<Recipe | null | "new">(null);
  const [deleting, setDeleting] = useState<Recipe | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(
    () =>
      (recipes || []).filter(
        (r) =>
          (r?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (r?.linked_product_names ?? []).some((p) =>
            (p || "").toLowerCase().includes(search.toLowerCase()),
          ),
      ),
    [recipes, search],
  );

  const doSave = async (data: {
    name: string;
    product_ids: string[];
    items: { ingredient_id: string; qty_used: number; unit: string }[];
    extras: {
      extra_name: string;
      value_type: "flat" | "percentage";
      value: number;
    }[];
  }) => {
    setSaving(true);
    try {
      const recipeUuid = form !== "new" && form ? form.uuid : genUuid("rec");
      await upsertSyncDoc(recipeUuid, "recipe", ownerUuid, {
        uuid: recipeUuid,
        name: data.name,
      });
      if (form !== "new" && form) {
        const existingIng = recipes
          .flatMap((r) => r.ingredients || [])
          .filter((ri) => ri.recipe_id === recipeUuid);
        const existingEx = recipes
          .flatMap((r) => r.extras || [])
          .filter((re) => re.recipe_id === recipeUuid);
        await Promise.all([
          ...existingIng.map((ri) => deleteSyncDoc(ri.uuid, ownerUuid)),
          ...existingEx.map((re) => deleteSyncDoc(re.uuid, ownerUuid)),
        ]);
      }
      await Promise.all(
        data.items.map(async (item) => {
          const riUuid = genUuid("ri");
          await upsertSyncDoc(riUuid, "recipe_ingredient", ownerUuid, {
            uuid: riUuid,
            recipe_id: recipeUuid,
            ingredient_id: item.ingredient_id,
            qty_used: item.qty_used,
            unit: item.unit,
          });
        }),
      );
      await Promise.all(
        data.extras.map(async (extra) => {
          const reUuid = genUuid("re");
          await upsertSyncDoc(reUuid, "recipe_extra", ownerUuid, {
            uuid: reUuid,
            recipe_id: recipeUuid,
            extra_name: extra.extra_name,
            value_type: extra.value_type,
            value: extra.value,
          });
        }),
      );
      await Promise.all(
        products.map(async (p) => {
          const shouldLink = data.product_ids.includes(p.uuid);
          if (shouldLink && p.recipe_id !== recipeUuid)
            await upsertSyncDoc(p.uuid, "product", ownerUuid, {
              ...p,
              recipe_id: recipeUuid,
              use_hpp: 1,
            });
          else if (!shouldLink && p.recipe_id === recipeUuid)
            await upsertSyncDoc(p.uuid, "product", ownerUuid, {
              ...p,
              recipe_id: null,
              use_hpp: 0,
            });
        }),
      );
      showToast(
        form === "new" ? "Recipe created" : "Recipe updated",
        "success",
      );
      setForm(null);
      onRefresh();
    } catch (e: any) {
      showToast(`Save failed: ${e?.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await deleteSyncDoc(deleting.uuid, ownerUuid);
      const linked = products.filter((p) => p.recipe_id === deleting.uuid);
      await Promise.all(
        linked.map((p) =>
          upsertSyncDoc(p.uuid, "product", ownerUuid, {
            ...p,
            recipe_id: null,
            use_hpp: 0,
          }),
        ),
      );
      showToast("Recipe removed", "success");
      setDeleting(null);
      onRefresh();
    } catch (e: any) {
      showToast(`Delete failed: ${e?.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const doExport = () => {
    const rows: any[][] = [];
    for (const r of filtered) {
      for (const it of r.ingredients ?? []) {
        rows.push([
          r.name,
          (r.linked_product_names ?? []).join("; "),
          it.ingredient_name,
          it.qty_used,
          it.item_unit ?? "g",
        ]);
      }
    }
    exportXlsxMultiSheet(`recipes_${new Date().toISOString().slice(0, 10)}`, [
      {
        name: "Recipe Ingredients",
        headers: [
          "Recipe Name",
          "Linked Products",
          "Ingredient",
          "Qty Used",
          "Unit",
        ],
        rows,
      },
      {
        name: "Summary",
        headers: ["Recipe", "Ingredients", "Extras", "Linked Products"],
        rows: filtered.map((r) => [
          r.name,
          (r.ingredients ?? []).length,
          (r.extras ?? []).length,
          (r.linked_product_names ?? []).join(", "),
        ]),
      },
    ]);
    showToast("Excel report exported", "success");
  };

  const recipesWithProducts = recipes.filter(
    (r) => (r.linked_product_names ?? []).length > 0,
  ).length;

  return (
    <div className="page-container">
      <PageHeader
        icon={<BookOpen size={22} />}
        iconBg="var(--teal-light)"
        iconColor="var(--teal)"
        title="Recipes"
        subtitle={`${recipes.length} recipes configured`}
      >
        <ExportBtn onClick={doExport} />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setForm("new")}
        >
          <Plus size={13} />
          Add Recipe
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Total Recipes"
          value={String(recipes.length)}
          icon={<BookOpen size={18} />}
          color="#14B8A6"
          bg="#F0FDFA"
          sub="configured recipes"
        />
        <StatCard
          label="Linked to Products"
          value={String(recipesWithProducts)}
          icon={<Box size={18} />}
          color="#3B82F6"
          bg="#EFF6FF"
          sub="recipes with products"
        />
        <StatCard
          label="Ingredients Used"
          value={String(
            new Set(
              recipes.flatMap(
                (r) => r.ingredients?.map((i) => i.ingredient_id) ?? [],
              ),
            ).size,
          )}
          icon={<Package size={18} />}
          color="#F97316"
          bg="#FFF7ED"
          sub="unique ingredients"
        />
        <StatCard
          label="With Extra Costs"
          value={String(
            recipes.filter((r) => (r.extras ?? []).length > 0).length,
          )}
          icon={<Zap size={18} />}
          color="#8B5CF6"
          bg="#F5F3FF"
          sub="recipes with extras"
        />
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search recipe or linked product…"
      />

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<BookOpen size={36} />}
            title={recipes.length === 0 ? "No recipes yet" : "No results"}
            subtitle="Click 'Add Recipe' to create one"
          />
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {filtered.map((r, idx) => (
            <div
              key={r.uuid}
              style={{
                borderBottom:
                  idx < filtered.length - 1
                    ? "1px solid var(--border)"
                    : "none",
              }}
            >
              <div
                className="recipe-card-row"
                onClick={() => setExpanded(expanded === r.uuid ? null : r.uuid)}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    background: "var(--teal-light)",
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <BookOpen size={16} style={{ color: "var(--teal)" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.875rem" }}>
                    {r.name || "Unnamed Recipe"}
                  </div>
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--text-3)",
                      marginTop: 3,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <span>{(r.ingredients ?? []).length} ingredients</span>
                    {(r.extras ?? []).length > 0 && (
                      <span>· {(r.extras ?? []).length} extras</span>
                    )}
                    {(r.linked_product_names ?? []).length > 0 && (
                      <span
                        className="chip"
                        style={{ fontSize: "0.5625rem", padding: "1px 7px" }}
                      >
                        {(r.linked_product_names ?? []).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setForm(r);
                    }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="btn btn-danger btn-icon btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleting(r);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                  <ChevronDown
                    size={14}
                    style={{
                      color: "var(--text-muted)",
                      transition: "transform .2s",
                      transform:
                        expanded === r.uuid ? "rotate(180deg)" : "none",
                      marginLeft: 4,
                    }}
                  />
                </div>
              </div>
              {expanded === r.uuid && (
                <div style={{ padding: "0 20px 16px 72px" }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      color: "var(--text-2)",
                      marginBottom: 8,
                    }}
                  >
                    Ingredients
                  </div>
                  {(r.ingredients ?? []).length === 0 ? (
                    <div
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      No ingredients added.
                    </div>
                  ) : (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        marginBottom: 12,
                      }}
                    >
                      <thead>
                        <tr>
                          {["Ingredient", "Qty Used", "Unit"].map((h) => (
                            <th
                              key={h}
                              style={{
                                textAlign: "left",
                                fontSize: "0.625rem",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: ".05em",
                                color: "var(--text-muted)",
                                padding: "5px 8px",
                                borderBottom: "1px solid var(--border)",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(r.ingredients ?? []).map((it) => (
                          <tr key={it.uuid}>
                            <td
                              style={{
                                padding: "7px 8px",
                                fontSize: "0.8125rem",
                                fontWeight: 600,
                              }}
                            >
                              {it.ingredient_name}
                            </td>
                            <td
                              style={{
                                padding: "7px 8px",
                                fontSize: "0.8125rem",
                              }}
                            >
                              {it.qty_used}
                            </td>
                            <td
                              style={{
                                padding: "7px 8px",
                                fontSize: "0.8125rem",
                                color: "var(--text-3)",
                              }}
                            >
                              {it.unit || it.item_unit || "g"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {(r.extras ?? []).length > 0 && (
                    <>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          color: "var(--text-2)",
                          marginBottom: 6,
                          marginTop: 12,
                        }}
                      >
                        Extra Costs
                      </div>
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                      >
                        {(r.extras ?? []).map((ex) => (
                          <span
                            key={ex.uuid}
                            className="chip"
                            style={{ fontSize: "0.75rem", padding: "3px 10px" }}
                          >
                            {ex.extra_name}:{" "}
                            {ex.value_type === "percentage"
                              ? `${ex.value}%`
                              : fmtCurrency(ex.value)}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {form !== null && (
        <RecipeFormModal
          recipe={form === "new" ? null : form}
          products={products}
          ingredients={ingredients}
          onSave={doSave}
          onClose={() => setForm(null)}
          saving={saving}
        />
      )}
      {deleting && (
        <Confirm
          title="Remove Recipe"
          msg={`Remove recipe "${deleting.name}"?`}
          onOk={doDelete}
          onCancel={() => setDeleting(null)}
          loading={saving}
        />
      )}
    </div>
  );
});

const RecipeFormModal = memo(function RecipeFormModal({
  recipe,
  products,
  ingredients,
  onSave,
  onClose,
  saving,
}: {
  recipe: Recipe | null;
  products: Product[];
  ingredients: Ingredient[];
  onSave: (d: {
    name: string;
    product_ids: string[];
    items: { ingredient_id: string; qty_used: number; unit: string }[];
    extras: {
      extra_name: string;
      value_type: "flat" | "percentage";
      value: number;
    }[];
  }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(recipe?.name ?? "");
  const [prodIds, setProdIds] = useState<string[]>(
    products.filter((p) => p.recipe_id === recipe?.uuid).map((p) => p.uuid),
  );
  const [items, setItems] = useState<
    { ingredient_id: string; qty_used: number; unit: string }[]
  >(
    (recipe?.ingredients ?? []).map((i) => ({
      ingredient_id: i.ingredient_id,
      qty_used: i.qty_used,
      unit: i.item_unit ?? "g",
    })),
  );
  const [extras, setExtras] = useState<
    { extra_name: string; value_type: "flat" | "percentage"; value: number }[]
  >(
    (recipe?.extras ?? []).map((e) => ({
      extra_name: e.extra_name,
      value_type: e.value_type,
      value: e.value,
    })),
  );

  return (
    <div className="modal-overlay">
      <div className="modal modal-wide" style={{ maxHeight: "90vh" }}>
        <div className="modal-header">
          <span className="modal-title">
            {recipe ? "Edit Recipe" : "New Recipe"}
          </span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Recipe Name *</label>
            <input
              className="form-input"
              value={name}
              placeholder="e.g. Espresso Base"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Link to Products (Optional)</label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                maxHeight: 110,
                overflowY: "auto",
                padding: 10,
                background: "var(--bg)",
                borderRadius: "var(--radius-sm)",
                border: "1.5px solid var(--border)",
              }}
            >
              {products.length === 0 ? (
                <span
                  style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                >
                  No products yet.
                </span>
              ) : (
                products.map((p) => (
                  <button
                    type="button"
                    key={p.uuid}
                    onClick={() =>
                      setProdIds((prev) =>
                        prev.includes(p.uuid)
                          ? prev.filter((x) => x !== p.uuid)
                          : [...prev, p.uuid],
                      )
                    }
                    className={`btn btn-sm ${prodIds.includes(p.uuid) ? "btn-primary" : "btn-outline"}`}
                  >
                    {p.name}
                  </button>
                ))
              )}
            </div>
          </div>
          <hr />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <h4 style={{ fontSize: "0.875rem", fontWeight: 700 }}>
              Ingredients ({items.length})
            </h4>
            <button
              className="btn btn-outline btn-sm"
              onClick={() =>
                setItems((p) => [
                  ...p,
                  {
                    ingredient_id: ingredients[0]?.uuid ?? "",
                    qty_used: 1,
                    unit: ingredients[0]?.item_unit ?? "g",
                  },
                ])
              }
            >
              <Plus size={11} />
              Add Ingredient
            </button>
          </div>
          {items.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: 16,
                color: "var(--text-muted)",
                fontSize: "0.8125rem",
                background: "var(--bg)",
                borderRadius: "var(--radius-sm)",
                border: "1.5px dashed var(--border)",
                marginBottom: 14,
              }}
            >
              Click "Add Ingredient" to add components.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 90px 60px 28px",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <select
                    className="form-input form-select"
                    value={item.ingredient_id}
                    onChange={(e) => {
                      const ni = ingredients.find(
                        (i) => i.uuid === e.target.value,
                      );
                      setItems((p) =>
                        p.map((r, j) =>
                          j === idx
                            ? {
                                ...r,
                                ingredient_id: e.target.value,
                                unit: ni?.item_unit ?? "g",
                              }
                            : r,
                        ),
                      );
                    }}
                  >
                    {ingredients.map((i) => (
                      <option key={i.uuid} value={i.uuid}>
                        {i.name} ({i.item_unit ?? "g"})
                      </option>
                    ))}
                  </select>
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    step="0.1"
                    value={item.qty_used}
                    onChange={(e) =>
                      setItems((p) =>
                        p.map((r, j) =>
                          j === idx
                            ? { ...r, qty_used: Number(e.target.value) }
                            : r,
                        ),
                      )
                    }
                  />
                  <select
                    className="form-input form-select"
                    value={item.unit}
                    onChange={(e) =>
                      setItems((p) =>
                        p.map((r, j) =>
                          j === idx ? { ...r, unit: e.target.value } : r,
                        ),
                      )
                    }
                  >
                    {ITEM_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn-danger btn-icon btn-sm"
                    onClick={() =>
                      setItems((p) => p.filter((_, j) => j !== idx))
                    }
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <hr />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <h4 style={{ fontSize: "0.875rem", fontWeight: 700 }}>
              Extra Costs ({extras.length})
            </h4>
            <button
              className="btn btn-outline btn-sm"
              onClick={() =>
                setExtras((p) => [
                  ...p,
                  { extra_name: "", value_type: "flat", value: 0 },
                ])
              }
            >
              <Plus size={11} />
              Add Extra
            </button>
          </div>
          {extras.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {extras.map((ex, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 100px 80px 28px",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <input
                    className="form-input"
                    placeholder="e.g. Paper Cup & Lid"
                    value={ex.extra_name}
                    onChange={(e) =>
                      setExtras((p) =>
                        p.map((r, j) =>
                          j === idx ? { ...r, extra_name: e.target.value } : r,
                        ),
                      )
                    }
                  />
                  <select
                    className="form-input form-select"
                    value={ex.value_type}
                    onChange={(e) =>
                      setExtras((p) =>
                        p.map((r, j) =>
                          j === idx
                            ? { ...r, value_type: e.target.value as any }
                            : r,
                        ),
                      )
                    }
                  >
                    <option value="flat">Flat (Rp)</option>
                    <option value="percentage">Percent (%)</option>
                  </select>
                  <input
                    className="form-input"
                    type="number"
                    min={0}
                    value={ex.value}
                    onChange={(e) =>
                      setExtras((p) =>
                        p.map((r, j) =>
                          j === idx
                            ? { ...r, value: Number(e.target.value) }
                            : r,
                        ),
                      )
                    }
                  />
                  <button
                    className="btn btn-danger btn-icon btn-sm"
                    onClick={() =>
                      setExtras((p) => p.filter((_, j) => j !== idx))
                    }
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn btn-primary btn-sm${saving ? " btn-spin" : ""}`}
            onClick={() =>
              onSave({ name, product_ids: prodIds, items, extras })
            }
            disabled={saving || !name}
          >
            {!saving && (recipe ? "Save Changes" : "Create Recipe")}
          </button>
        </div>
      </div>
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORIES TAB
// ══════════════════════════════════════════════════════════════════════════════
const CategoriesTab = memo(function CategoriesTab({
  categories,
  categoryParents,
  ownerUuid,
  showToast,
  onRefresh,
}: {
  categories: Category[];
  categoryParents: CategoryParent[];
  ownerUuid: string;
  showToast: (m: string, k?: any) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<
    "parent" | "child" | CategoryParent | Category | null
  >(null);
  const [deleting, setDeleting] = useState<{
    type: "parent" | "child";
    uuid: string;
    name: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [parentForm, setParentForm] = useState("");
  const [childForm, setChildForm] = useState({
    name: "",
    color: "#10B981",
    parent_id: "",
  });

  const filteredParents = useMemo(
    () =>
      categoryParents.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [categoryParents, search],
  );
  const filteredChildren = useMemo(
    () =>
      categories.filter((c) => {
        const parent = categoryParents.find((p) => p.uuid === c.parent_id);
        return (
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (parent?.name || "").toLowerCase().includes(search.toLowerCase())
        );
      }),
    [categories, categoryParents, search],
  );

  const doSaveParent = async () => {
    if (!parentForm.trim()) return;
    setSaving(true);
    try {
      if (
        form &&
        typeof form !== "string" &&
        "name" in form &&
        !("color" in form)
      ) {
        await upsertSyncDoc(
          (form as CategoryParent).uuid,
          "category_parent",
          ownerUuid,
          { uuid: (form as CategoryParent).uuid, name: parentForm },
        );
        showToast("Parent category updated", "success");
      } else {
        const uuid = genUuid("cp");
        await upsertSyncDoc(uuid, "category_parent", ownerUuid, {
          uuid,
          name: parentForm,
        });
        showToast("Parent category added", "success");
      }
      setParentForm("");
      setForm(null);
      onRefresh();
    } catch (e: any) {
      showToast(`Save failed: ${e?.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const doSaveChild = async () => {
    if (!childForm.name.trim()) return;
    setSaving(true);
    try {
      if (form && typeof form !== "string" && "color" in form) {
        await upsertSyncDoc((form as Category).uuid, "category", ownerUuid, {
          uuid: (form as Category).uuid,
          name: childForm.name,
          color: childForm.color,
          parent_id: childForm.parent_id || null,
        });
        showToast("Category updated", "success");
      } else {
        const uuid = genUuid("cat");
        await upsertSyncDoc(uuid, "category", ownerUuid, {
          uuid,
          name: childForm.name,
          color: childForm.color,
          parent_id: childForm.parent_id || null,
        });
        showToast("Category added", "success");
      }
      setChildForm({ name: "", color: "#10B981", parent_id: "" });
      setForm(null);
      onRefresh();
    } catch (e: any) {
      showToast(`Save failed: ${e?.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await deleteSyncDoc(deleting.uuid, ownerUuid);
      showToast(
        `${deleting.type === "parent" ? "Parent category" : "Category"} removed`,
        "success",
      );
      setDeleting(null);
      onRefresh();
    } catch (e: any) {
      showToast(`Delete failed: ${e?.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const doExport = () => {
    exportXlsxMultiSheet(
      `categories_${new Date().toISOString().slice(0, 10)}`,
      [
        {
          name: "Parent Categories",
          headers: ["ID", "Name", "Child Categories"],
          rows: filteredParents.map((p) => [
            p.uuid,
            p.name,
            categories
              .filter((c) => c.parent_id === p.uuid)
              .map((c) => c.name)
              .join(", "),
          ]),
        },
        {
          name: "Categories",
          headers: ["ID", "Name", "Color", "Parent Category"],
          rows: filteredChildren.map((c) => [
            c.uuid,
            c.name,
            c.color ?? "",
            categoryParents.find((p) => p.uuid === c.parent_id)?.name ?? "None",
          ]),
        },
      ],
    );
    showToast("Excel report exported", "success");
  };

  return (
    <div className="page-container">
      <PageHeader
        icon={<FolderTree size={22} />}
        iconBg="var(--orange-light)"
        iconColor="var(--orange)"
        title="Categories"
        subtitle={`${categoryParents.length} parent categories, ${categories.length} categories`}
      >
        <ExportBtn onClick={doExport} />
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setParentForm("");
            setForm("parent");
          }}
        >
          <Plus size={13} />
          Add Parent
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setChildForm({ name: "", color: "#10B981", parent_id: "" });
            setForm("child");
          }}
        >
          <Plus size={13} />
          Add Category
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Parent Categories"
          value={String(categoryParents.length)}
          icon={<FolderTree size={18} />}
          color="#F97316"
          bg="#FFF7ED"
          sub="top-level groups"
        />
        <StatCard
          label="Total Categories"
          value={String(categories.length)}
          icon={<Layers size={18} />}
          color="#8B5CF6"
          bg="#F5F3FF"
          sub="product categories"
        />
        <StatCard
          label="Uncategorized"
          value={String(categories.filter((c) => !c.parent_id).length)}
          icon={<Box size={18} />}
          color="#64748B"
          bg="#F8FAFC"
          sub="no parent assigned"
        />
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search categories…"
      />

      <div className="g2">
        {/* Parents */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <FolderTree size={15} /> Parent Categories
            </div>
            <span className="badge badge-orange">{filteredParents.length}</span>
          </div>
          {filteredParents.length === 0 ? (
            <EmptyState
              icon={<FolderTree size={32} />}
              title="No parent categories"
              subtitle="Add parent categories to organize your products"
            />
          ) : (
            filteredParents.map((p) => (
              <div
                key={p.uuid}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "11px 16px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                    {p.name}
                  </div>
                  <div
                    style={{
                      fontSize: "0.6875rem",
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {categories.filter((c) => c.parent_id === p.uuid).length}{" "}
                    sub-categories
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => {
                      setForm(p);
                      setParentForm(p.name);
                    }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    className="btn btn-danger btn-icon btn-sm"
                    onClick={() =>
                      setDeleting({
                        type: "parent",
                        uuid: p.uuid,
                        name: p.name,
                      })
                    }
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Children */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Layers size={15} /> Categories
            </div>
            <span className="badge badge-purple">
              {filteredChildren.length}
            </span>
          </div>
          {filteredChildren.length === 0 ? (
            <EmptyState
              icon={<Layers size={32} />}
              title="No categories"
              subtitle="Add categories to organize your products"
            />
          ) : (
            filteredChildren.map((c) => {
              const parent = categoryParents.find(
                (p) => p.uuid === c.parent_id,
              );
              return (
                <div
                  key={c.uuid}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "11px 16px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        backgroundColor: c.color || "#10B981",
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                        {c.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.6875rem",
                          color: "var(--text-3)",
                          marginTop: 1,
                        }}
                      >
                        {parent?.name || "No parent"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => {
                        setForm(c);
                        setChildForm({
                          name: c.name,
                          color: c.color || "#10B981",
                          parent_id: c.parent_id || "",
                        });
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      className="btn btn-danger btn-icon btn-sm"
                      onClick={() =>
                        setDeleting({
                          type: "child",
                          uuid: c.uuid,
                          name: c.name,
                        })
                      }
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Parent modal */}
      {(form === "parent" ||
        (form &&
          typeof form !== "string" &&
          "name" in form &&
          !("color" in form))) && (
        <div className="modal-overlay" onClick={() => setForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {form === "parent"
                  ? "Add Parent Category"
                  : "Edit Parent Category"}
              </span>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setForm(null)}
              >
                <X size={15} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Parent Name *</label>
                <input
                  className="form-input"
                  value={parentForm}
                  onChange={(e) => setParentForm(e.target.value)}
                  placeholder="e.g. Beverages"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setForm(null)}
              >
                Cancel
              </button>
              <button
                className={`btn btn-primary btn-sm${saving ? " btn-spin" : ""}`}
                onClick={doSaveParent}
                disabled={saving || !parentForm}
              >
                {!saving && (form === "parent" ? "Add Parent" : "Save Changes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Child modal */}
      {(form === "child" ||
        (form && typeof form !== "string" && "color" in form)) && (
        <div className="modal-overlay" onClick={() => setForm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {form === "child" ? "Add Category" : "Edit Category"}
              </span>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setForm(null)}
              >
                <X size={15} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input
                  className="form-input"
                  value={childForm.name}
                  onChange={(e) =>
                    setChildForm({ ...childForm, name: e.target.value })
                  }
                  placeholder="e.g. Coffee"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Parent Category</label>
                <select
                  className="form-input form-select"
                  value={childForm.parent_id}
                  onChange={(e) =>
                    setChildForm({ ...childForm, parent_id: e.target.value })
                  }
                >
                  <option value="">No parent</option>
                  {categoryParents.map((p) => (
                    <option key={p.uuid} value={p.uuid}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="color"
                    value={childForm.color}
                    onChange={(e) =>
                      setChildForm({ ...childForm, color: e.target.value })
                    }
                    style={{
                      width: 52,
                      height: 38,
                      padding: 3,
                      border: "1.5px solid var(--border)",
                      borderRadius: "var(--radius-xs)",
                      cursor: "pointer",
                    }}
                  />
                  <span
                    style={{ fontSize: "0.8125rem", color: "var(--text-3)" }}
                  >
                    {childForm.color}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setForm(null)}
              >
                Cancel
              </button>
              <button
                className={`btn btn-primary btn-sm${saving ? " btn-spin" : ""}`}
                onClick={doSaveChild}
                disabled={saving || !childForm.name}
              >
                {!saving &&
                  (form === "child" ? "Add Category" : "Save Changes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <Confirm
          title={`Remove ${deleting.type === "parent" ? "Parent Category" : "Category"}`}
          msg={`Remove "${deleting.name}"?`}
          onOk={doDelete}
          onCancel={() => setDeleting(null)}
          loading={saving}
        />
      )}
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTS TAB
// ══════════════════════════════════════════════════════════════════════════════
const ProductsTab = memo(function ProductsTab({
  products,
  categories,
  recipes,
  ownerUuid,
  showToast,
  onRefresh,
}: {
  products: Product[];
  categories: Category[];
  recipes: Recipe[];
  ownerUuid: string;
  showToast: (m: string, k?: any) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [form, setForm] = useState<Product | "new" | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const catMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.uuid, c])),
    [categories],
  );

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase())) &&
          (!categoryFilter || p.category_id === categoryFilter),
      ),
    [products, search, categoryFilter],
  );

  // Stats
  const avgPrice =
    products.length > 0
      ? products.reduce((s, p) => s + p.sell_price, 0) / products.length
      : 0;
  const withImages = products.filter((p) => p.image_uri).length;
  const withRecipes = products.filter((p) => p.recipe_id).length;

  const doSave = async (data: Partial<Product> & { imageFile?: File }) => {
    setSaving(true);
    try {
      const uuid = form === "new" || !form ? genUuid("prod") : form.uuid;
      let imageUri = data.image_uri || null;
      if (data.imageFile) {
        imageUri = await uploadProductImage(data.imageFile, uuid);
      } else if (form !== "new" && form && form.image_uri && !data.image_uri) {
        await deleteProductImage(form.uuid);
        imageUri = null;
      }
      const payload = {
        uuid,
        name: data.name || "Unnamed Product",
        sku: data.sku || (await getNextSku()),
        category_id: data.category_id || null,
        sell_price: data.sell_price || 0,
        buy_price: data.buy_price || null,
        use_hpp: data.use_hpp || 0,
        recipe_id: data.recipe_id || null,
        image_uri: imageUri,
      };
      await upsertSyncDoc(uuid, "product", ownerUuid, payload);
      showToast(
        form === "new" ? "Product added" : "Product updated",
        "success",
      );
      setForm(null);
      onRefresh();
    } catch (e: any) {
      showToast(`Save failed: ${e?.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await deleteSyncDoc(deleting.uuid, ownerUuid);
      showToast("Product removed", "success");
      setDeleting(null);
      onRefresh();
    } catch (e: any) {
      showToast(`Delete failed: ${e?.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const getNextSku = async (): Promise<string> => {
    const maxSku = products.reduce((max, p) => {
      const num = parseInt(p.sku, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    return String(maxSku + 1).padStart(10, "0");
  };

  const doExport = () => {
    exportXlsxMultiSheet(`products_${new Date().toISOString().slice(0, 10)}`, [
      {
        name: "Products",
        headers: [
          "SKU",
          "Name",
          "Category",
          "Sell Price (Rp)",
          "Buy Price (Rp)",
          "Margin (Rp)",
          "Recipe",
          "Has Image",
        ],
        rows: filtered.map((p) => {
          const cat = catMap[p.category_id || ""];
          const rec = recipes.find((r) => r.uuid === p.recipe_id);
          const margin = p.buy_price ? p.sell_price - p.buy_price : "";
          return [
            p.sku,
            p.name,
            cat?.name ?? "",
            p.sell_price,
            p.buy_price ?? "",
            margin,
            rec?.name ?? "",
            p.image_uri ? "Yes" : "No",
          ];
        }),
      },
      {
        name: "Summary",
        headers: ["Metric", "Value"],
        rows: [
          ["Total Products", products.length],
          ["Products with Images", withImages],
          ["Products with Recipe", withRecipes],
          ["Average Sell Price (Rp)", Math.round(avgPrice)],
        ],
      },
    ]);
    showToast("Excel report exported", "success");
  };

  return (
    <div className="page-container">
      <PageHeader
        icon={<Box size={22} />}
        iconBg="var(--primary-xlight)"
        iconColor="var(--primary)"
        title="Products"
        subtitle={`${products.length} products in catalog`}
      >
        <ExportBtn onClick={doExport} />
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setForm("new")}
        >
          <Plus size={13} />
          Add Product
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard
          label="Total Products"
          value={String(products.length)}
          icon={<Box size={18} />}
          color="#10B981"
          bg="#ECFDF5"
          sub="in catalog"
        />
        <StatCard
          label="Avg Sell Price"
          value={fmtCurrency(Math.round(avgPrice))}
          icon={<TrendingUp size={18} />}
          color="#3B82F6"
          bg="#EFF6FF"
          sub="average price"
        />
        <StatCard
          label="With Recipe"
          value={String(withRecipes)}
          icon={<BookOpen size={18} />}
          color="#14B8A6"
          bg="#F0FDFA"
          sub="using HPP costing"
        />
        <StatCard
          label="With Images"
          value={String(withImages)}
          icon={<Star size={18} />}
          color="#F97316"
          bg="#FFF7ED"
          sub={`${products.length - withImages} missing`}
        />
      </div>

      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search by name or SKU…"
      >
        <select
          className="form-input form-select"
          style={{ width: "auto", minWidth: 160 }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.uuid} value={c.uuid}>
              {c.name}
            </option>
          ))}
        </select>
      </FilterBar>

      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Recipe</th>
              <th style={{ textAlign: "right" }}>Sell Price</th>
              <th style={{ textAlign: "right" }}>Buy Price</th>
              <th style={{ textAlign: "right" }}>Margin</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    icon={<Box size={36} />}
                    title={
                      products.length === 0 ? "No products yet" : "No results"
                    }
                    subtitle="Click 'Add Product' to create one"
                  />
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const cat = catMap[p.category_id || ""];
                const recipe = recipes.find((r) => r.uuid === p.recipe_id);
                const imgUrl = getProductImageUrl(
                  p.uuid,
                  p.image_uri,
                  (p as any).updated_at,
                );
                const margin = p.buy_price ? p.sell_price - p.buy_price : null;
                return (
                  <tr key={p.uuid}>
                    <td>
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={p.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                          style={{
                            width: 42,
                            height: 42,
                            objectFit: "cover",
                            borderRadius: 8,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            background: "var(--surface-3)",
                            borderRadius: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--text-muted)",
                            fontSize: "0.5625rem",
                            fontWeight: 700,
                          }}
                        >
                          IMG
                        </div>
                      )}
                    </td>
                    <td className="td-mono">{p.sku}</td>
                    <td className="td-name">{p.name}</td>
                    <td>
                      {cat ? (
                        <span
                          className="chip"
                          style={{
                            background: `${cat.color}20`,
                            borderColor: `${cat.color}40`,
                            color: cat.color,
                          }}
                        >
                          {cat.name}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {recipe ? (
                        <span className="chip">{recipe.name}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="td-num">{fmtCurrency(p.sell_price)}</td>
                    <td className="td-num">
                      {p.buy_price ? fmtCurrency(p.buy_price) : "—"}
                    </td>
                    <td
                      className="td-num"
                      style={{
                        color:
                          margin !== null
                            ? margin >= 0
                              ? "var(--primary-dark)"
                              : "var(--danger)"
                            : "var(--text-muted)",
                      }}
                    >
                      {margin !== null ? fmtCurrency(margin) : "—"}
                    </td>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          gap: 4,
                          justifyContent: "flex-end",
                        }}
                      >
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => setForm(p)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="btn btn-danger btn-icon btn-sm"
                          onClick={() => setDeleting(p)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {form !== null && (
        <ProductFormModal
          product={form === "new" ? null : form}
          categories={categories}
          recipes={recipes}
          onSave={doSave}
          onClose={() => setForm(null)}
          saving={saving}
        />
      )}
      {deleting && (
        <Confirm
          title="Remove Product"
          msg={`Remove "${deleting.name}"?`}
          onOk={doDelete}
          onCancel={() => setDeleting(null)}
          loading={saving}
        />
      )}
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// ACCOUNT TAB
// ══════════════════════════════════════════════════════════════════════════════
const AccountTab = memo(function AccountTab({
  user,
  showToast,
  onRefresh,
}: {
  user: any;
  showToast: (m: string, k?: any) => void;
  onRefresh: () => void;
}) {
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleUpdateEmail = async () => {
    if (!email || !email.includes("@")) {
      showToast("Please enter a valid email", "error");
      return;
    }
    setSaving(true);
    try {
      await account.updateEmail(email, currentPassword);
      showToast("Email updated", "success");
      setCurrentPassword("");
      onRefresh();
    } catch (e: any) {
      showToast(`Failed: ${e?.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      showToast("Enter your current password", "error");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      showToast("New password must be ≥ 8 characters", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    setSaving(true);
    try {
      await account.updatePassword(newPassword, currentPassword);
      showToast("Password updated", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      showToast(`Failed: ${e?.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const initials = (user.name || "O")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="page-container">
      <PageHeader
        icon={<LayoutDashboard size={22} />}
        iconBg="var(--primary-xlight)"
        iconColor="var(--primary)"
        title="Account Settings"
        subtitle="Manage your account and security"
      />

      <div className="g2">
        {/* Profile card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Profile Information</div>
          </div>
          <div className="card-body">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 24,
                padding: 16,
                background: "var(--surface-2)",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  background:
                    "linear-gradient(135deg, var(--primary), var(--primary-dark))",
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: "#fff",
                }}
              >
                {initials}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.0625rem" }}>
                  {user?.name || "Owner"}
                </div>
                <div
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--text-3)",
                    marginTop: 2,
                  }}
                >
                  {user?.email}
                </div>
                <span className="badge badge-purple" style={{ marginTop: 6 }}>
                  Owner
                </span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input className="form-input" value={user?.name || ""} disabled />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@example.com"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Current Password (required to change email)
              </label>
              <input
                className="form-input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter password to confirm"
              />
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleUpdateEmail}
              disabled={saving}
            >
              {saving ? "Updating…" : "Update Email"}
            </button>
          </div>
        </div>

        {/* Password card */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Change Password</div>
          </div>
          <div className="card-body">
            <div className="info-panel blue" style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "0.8125rem", color: "var(--info-dark)" }}>
                🔒 Your password must be at least 8 characters long. Use a mix
                of letters, numbers, and symbols for best security.
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Current Password *</label>
              <input
                className="form-input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="form-group">
              <label className="form-label">New Password *</label>
              <input
                className="form-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password *</label>
              <input
                className="form-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleUpdatePassword}
              disabled={saving}
            >
              {saving ? "Updating…" : "Change Password"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCT FORM MODAL
// ══════════════════════════════════════════════════════════════════════════════
const ProductFormModal = memo(function ProductFormModal({
  product,
  categories,
  recipes,
  onSave,
  onClose,
  saving,
}: {
  product: Product | null;
  categories: Category[];
  recipes: Recipe[];
  onSave: (d: Partial<Product> & { imageFile?: File }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [sellPrice, setSellPrice] = useState(String(product?.sell_price ?? ""));
  const [buyPrice, setBuyPrice] = useState(String(product?.buy_price ?? ""));
  const [recipeId, setRecipeId] = useState(product?.recipe_id ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    product?.image_uri ?? null,
  );

  // Auto-calculate buy price when recipe is selected
  const handleRecipeChange = (newRecipeId: string) => {
    setRecipeId(newRecipeId);
    if (newRecipeId) {
      const recipe = recipes.find((r) => r.uuid === newRecipeId);
      if (recipe) {
        // Calculate HPP from recipe ingredients and extras
        const ingredientCost =
          recipe.ingredients?.reduce((sum, ri) => {
            const cpg = ri.cost_per_gram ?? 0;
            return sum + cpg * ri.qty_used;
          }, 0) ?? 0;

        const extrasFlat =
          recipe.extras
            ?.filter((e) => e.value_type === "flat")
            .reduce((sum, e) => sum + e.value, 0) ?? 0;

        const extrasPercent =
          recipe.extras
            ?.filter((e) => e.value_type === "percentage")
            .reduce((sum, e) => sum + ingredientCost * (e.value / 100), 0) ?? 0;

        const hpp =
          Math.round((ingredientCost + extrasFlat + extrasPercent) * 100) / 100;
        setBuyPrice(String(hpp));
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size exceeds 5MB limit");
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">
            {product ? "Edit Product" : "Add Product"}
          </span>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <X size={15} />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Product Image</label>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{
                    width: 80,
                    height: 80,
                    objectFit: "cover",
                    borderRadius: 10,
                    border: "2px solid var(--border)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 80,
                    height: 80,
                    background: "var(--surface-3)",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                    fontSize: "0.6875rem",
                    border: "2px dashed var(--border)",
                  }}
                >
                  No image
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: "none" }}
                  id="product-image-upload"
                />
                <label
                  htmlFor="product-image-upload"
                  className="btn btn-outline btn-sm"
                  style={{ cursor: "pointer", textAlign: "center" }}
                >
                  {imagePreview ? "Change Image" : "Upload Image"}
                </label>
                {imagePreview && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    style={{ color: "var(--danger)" }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Iced Americano"
            />
          </div>
          <div className="g2">
            <div className="form-group">
              <label className="form-label">SKU *</label>
              <input
                className="form-input"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. 0000000001"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-input form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.uuid} value={c.uuid}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Recipe (Optional)</label>
            <select
              className="form-input form-select"
              value={recipeId}
              onChange={(e) => handleRecipeChange(e.target.value)}
            >
              <option value="">No recipe</option>
              {recipes.map((r) => (
                <option key={r.uuid} value={r.uuid}>
                  {r.name}
                </option>
              ))}
            </select>
            <div className="form-hint">
              Selecting a recipe will auto-calculate the buy price (HPP)
            </div>
          </div>
          <div className="g2">
            <div className="form-group">
              <label className="form-label">Sell Price (Rp) *</label>
              <input
                className="form-input"
                type="number"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Buy Price (Rp)</label>
              <input
                className="form-input"
                type="number"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          {sellPrice && buyPrice && Number(sellPrice) && Number(buyPrice) && (
            <div className="info-panel green" style={{ marginTop: -8 }}>
              <div
                style={{
                  fontSize: "0.8125rem",
                  color: "var(--primary-dark)",
                  fontWeight: 600,
                }}
              >
                Margin: {fmtCurrency(Number(sellPrice) - Number(buyPrice))} (
                {Math.round(
                  ((Number(sellPrice) - Number(buyPrice)) / Number(sellPrice)) *
                    100,
                )}
                %)
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button
            className={`btn btn-primary btn-sm${saving ? " btn-spin" : ""}`}
            onClick={() =>
              onSave({
                name,
                sku,
                category_id: categoryId || null,
                sell_price: parseFloat(sellPrice) || 0,
                buy_price: parseFloat(buyPrice) || null,
                recipe_id: recipeId || null,
                imageFile: imageFile || undefined,
                image_uri: imagePreview || null,
              })
            }
            disabled={saving || !name || !sku}
          >
            {!saving && (product ? "Save Changes" : "Add Product")}
          </button>
        </div>
      </div>
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// SHARED UTILITY COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════
const Confirm = memo(function Confirm({
  title,
  msg,
  onOk,
  onCancel,
  loading,
}: {
  title: string;
  msg: string;
  onOk: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 380 }}>
        <div
          className="modal-body"
          style={{ textAlign: "center", paddingTop: 32 }}
        >
          <div className="confirm-icon confirm-danger">
            <AlertTriangle size={24} />
          </div>
          <h3 style={{ marginBottom: 8, fontSize: "1.0625rem" }}>{title}</h3>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-3)" }}>{msg}</p>
        </div>
        <div className="modal-footer" style={{ justifyContent: "center" }}>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`btn btn-danger btn-sm${loading ? " btn-spin" : ""}`}
            onClick={onOk}
            disabled={loading}
          >
            {!loading && "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
});

const Toasts = memo(function Toasts({ toasts }: { toasts: ToastType[] }) {
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {t.kind === "success" && (
            <CheckCircle2 size={14} style={{ color: "var(--primary)" }} />
          )}
          {t.kind === "error" && (
            <AlertTriangle size={14} style={{ color: "var(--danger)" }} />
          )}
          {t.kind === "info" && (
            <Radio size={14} style={{ color: "var(--info)" }} />
          )}
          {t.msg}
        </div>
      ))}
    </div>
  );
});

const Skeleton = memo(function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{ height: 60, borderRadius: "var(--radius-lg)" }}
        className="skeleton"
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 14,
        }}
      >
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{ height: 100, borderRadius: "var(--radius-lg)" }}
          />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{ height: 260, borderRadius: "var(--radius-lg)" }}
          />
        ))}
      </div>
      <div
        className="skeleton"
        style={{ height: 300, borderRadius: "var(--radius-lg)" }}
      />
    </div>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// SUBSCRIBE TAB
// ══════════════════════════════════════════════════════════════════════════════
const SubscribeTab = memo(function SubscribeTab({
  user,
  showToast,
  onRefresh,
  reloadUser,
}: {
  user: any;
  showToast: (m: string, k?: any) => void;
  onRefresh: () => void;
  reloadUser: () => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const isSub =
    user?.prefs?.isSubs?.isSubscribed === true ||
    user?.prefs?.isSubscribed === "true";
  const expDate = user?.prefs?.isSubs?.expDate
    ? new Date(user.prefs.isSubs.expDate).toLocaleDateString()
    : "";
  const subMonths = user?.prefs?.isSubs?.months || 0;

  const PLANS = [
    {
      id: "basic",
      name: "1 Month",
      price: "Rp 150.000",
      months: 1,
      desc: "Perfect for small shops",
      color: "var(--info)",
      features: [
        "Cloud Sync",
        "Web Management",
        "Reports & Analytics",
        "Employees Management",
      ],
    },
    {
      id: "pro",
      name: "3 Months",
      price: "Rp 400.000",
      months: 3,
      desc: "For growing businesses",
      color: "var(--primary)",
      features: [
        "Cloud Sync",
        "Web Management",
        "Reports & Analytics",
        "Employees Management",
      ],
    },
    {
      id: "enterprise",
      name: "12 Months",
      price: "Rp 1.500.000",
      months: 12,
      desc: "Full power for large stores",
      color: "var(--purple)",
      features: [
        "Cloud Sync",
        "Web Management",
        "Reports & Analytics",
        "Employees Management",
      ],
    },
  ];

  const handlePay = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    try {
      const d = new Date();
      d.setMonth(d.getMonth() + selectedPlan.months);

      const res = await executeAppwriteFunction({
        action: "updateUserPlan",
        targetUserId: user.$id,
        isSubscribed: true,
        months: selectedPlan.months,
        startDate: new Date().toISOString(),
        expDate: d.toISOString(),
      });
      if (res.success) {
        showToast("Payment successful! Plan updated.", "success");
        setSelectedPlan(null);
        await reloadUser();
      } else {
        throw new Error(res.error || "Payment failed");
      }
    } catch (err: any) {
      showToast(err.message || "Payment failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="page-container"
      style={{ maxWidth: 1000, margin: "0 auto" }}
    >
      <PageHeader
        icon={<CreditCard size={22} />}
        iconBg="var(--purple-light)"
        iconColor="var(--purple)"
        title="Subscription Plans"
        subtitle="Upgrade to unlock premium features and cloud syncing"
      />

      {isSub && (
        <div
          style={{
            background: "var(--primary-xlight)",
            border: "1px solid var(--primary)",
            borderRadius: "var(--radius)",
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 24,
            color: "var(--primary-dark)",
          }}
        >
          <CheckCircle2 size={24} style={{ color: "var(--primary)" }} />
          <div>
            <h4 style={{ fontWeight: 700, fontSize: "1rem", margin: 0 }}>
              Active Subscription
            </h4>
            <p style={{ margin: 0, fontSize: "0.875rem", opacity: 0.9 }}>
              Your {subMonths}-month plan is active. It will expire on{" "}
              <strong>{expDate}</strong>.
            </p>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24,
          marginTop: 24,
        }}
      >
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl)",
              padding: 32,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              position: "relative",
              boxShadow: "var(--shadow-sm)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: plan.color,
              }}
            />
            <div>
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  color: "var(--text)",
                }}
              >
                {plan.name}
              </h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                {plan.desc}
              </p>
            </div>
            <div
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: "var(--text)",
                letterSpacing: "-.04em",
              }}
            >
              {plan.price}
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "var(--text-3)",
                  letterSpacing: "0",
                }}
              >
                {" "}
                / {plan.months} mo
              </span>
            </div>
            <div style={{ marginTop: 16 }}>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {plan.features.map((feature, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: "0.8125rem",
                      color: "var(--text-2)",
                    }}
                  >
                    <CheckCircle2 size={14} style={{ color: plan.color }} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <button
              className="btn btn-primary"
              style={{
                marginTop: "auto",
                justifyContent: "center",
                background: isSub ? "var(--border-2)" : plan.color,
                color: isSub ? "var(--text-muted)" : "#fff",
                cursor: isSub ? "not-allowed" : "pointer",
              }}
              onClick={() => !isSub && setSelectedPlan(plan)}
              disabled={isSub}
            >
              {isSub ? "Already Subscribed" : "Subscribe Now"}
            </button>
          </div>
        ))}
      </div>

      {selectedPlan && (
        <div
          className="modal-overlay"
          onClick={() => !loading && setSelectedPlan(null)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 450 }}
          >
            <div className="modal-header">
              <span className="modal-title">Order via WhatsApp</span>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => !loading && setSelectedPlan(null)}
                disabled={loading}
              >
                <X size={15} />
              </button>
            </div>
            <div
              className="modal-body"
              style={{ textAlign: "center", padding: "32px 24px" }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: "#25D366",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                <CreditCard size={32} />
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800 }}>
                {selectedPlan.name} Plan
              </h3>
              <p
                style={{
                  color: "var(--text-3)",
                  fontSize: "0.875rem",
                  marginBottom: 24,
                }}
              >
                {selectedPlan.price} / {selectedPlan.months} months
              </p>

              <div
                style={{
                  background: "var(--surface-2)",
                  borderRadius: "var(--radius)",
                  padding: 24,
                  marginBottom: 24,
                }}
              >
                <p
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                    marginBottom: 16,
                    color: "var(--text)",
                  }}
                >
                  Scan QR Code or Tap Link
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      background: "#fff",
                      padding: 16,
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                        `https://wa.me/62887777656364?text=${encodeURIComponent(
                          `Hello, I would like to subscribe to the ${selectedPlan.name} plan (${selectedPlan.price}/${selectedPlan.months} months). User ID: ${user.$id}`,
                        )}`,
                      )}`}
                      alt="WhatsApp QR"
                      style={{ width: 150, height: 150 }}
                    />
                  </div>
                  <a
                    href={`https://wa.me/62887777656364?text=${encodeURIComponent(
                      `Hello, I would like to subscribe to the ${selectedPlan.name} plan (${selectedPlan.price}/${selectedPlan.months} months). User ID: ${user.$id}`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      background: "#25D366",
                      color: "#fff",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>Open WhatsApp</span>
                  </a>
                </div>
              </div>

              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-3)",
                  lineHeight: 1.5,
                }}
              >
                Contact: 087777656364
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

function Dash() {
  return <span style={{ color: "var(--text-muted)" }}>—</span>;
}

// ══════════════════════════════════════════════════════════════════════════════
// SUPPLIERS TAB
// ══════════════════════════════════════════════════════════════════════════════
const SuppliersTab = memo(function SuppliersTab({
  suppliers,
  ownerUuid,
  showToast,
  onRefresh,
}: {
  suppliers: Supplier[];
  ownerUuid: string;
  showToast: (m: string, k?: any) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    let list = suppliers;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.contact && s.contact.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [suppliers, search]);

  const openAdd = () => {
    setEditingUuid(null);
    setName("");
    setContact("");
    setIsModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingUuid(s.uuid);
    setName(s.name);
    setContact(s.contact || "");
    setIsModalOpen(true);
  };

  const save = async () => {
    if (!name) return showToast("Name is required", "error");
    setSaving(true);
    try {
      const docId = editingUuid || genUuid("sup");
      await upsertSyncDoc(docId, "supplier", ownerUuid, {
        uuid: docId,
        name,
        contact: contact || null,
      });
      showToast(editingUuid ? "Supplier updated" : "Supplier added", "success");
      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      showToast(`Failed: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    try {
      await deleteSyncDoc(id, ownerUuid);
      showToast("Supplier deleted", "success");
      onRefresh();
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`, "error");
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        icon={<Users size={20} />}
        iconBg="var(--primary-light)"
        iconColor="var(--primary)"
        title="Suppliers"
        subtitle="Manage vendors and supplier information"
      >
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add Supplier
        </button>
      </PageHeader>

      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search suppliers..."
      />

      <div className="card" style={{ marginTop: 20 }}>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users size={32} />}
            title="No suppliers found"
            subtitle="Add suppliers to keep track of vendors."
          />
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.uuid}>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td style={{ color: "var(--text-muted)" }}>
                      {s.contact || "—"}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn-icon" onClick={() => openEdit(s)}>
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn-icon danger"
                        onClick={() => remove(s.uuid)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => !saving && setIsModalOpen(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {editingUuid ? "Edit Supplier" : "Add Supplier"}
              </span>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
              >
                <X size={15} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. PT Sari Rasa"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Info</label>
                <input
                  className="form-input"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Phone, email, or address"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className={`btn btn-primary btn-sm${saving ? " btn-spin" : ""}`}
                onClick={save}
                disabled={saving || !name}
              >
                {!saving && (editingUuid ? "Save Changes" : "Add Supplier")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
