import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "../lib/AuthContext";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { fetchSalesList } from "../services/salesService.js";

const BASE = "https://drivo1.elmoroj.com/api";

async function fetchAllSales() {
  return fetchSalesList();
}

async function fetchAllDrivers() {
  const res = await fetch(`${BASE}/drivers`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data?.data ?? []);
}

// ======= Action type → Arabic label & style =======
const ACTION_CONFIG = {
  create_trip:        { label: "إنشاء رحلة",    bg: "bg-blue-50",   icon: "text-blue-500",   d: "M12 4v16m8-8H4" },
  trip_payment:       { label: "دفعة",           bg: "bg-green-50",  icon: "text-green-500",  d: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  edit_trip:          { label: "تعديل رحلة",    bg: "bg-purple-50", icon: "text-purple-500", d: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
  driver_violation:   { label: "شكوى سائق",     bg: "bg-red-50",    icon: "text-red-400",    d: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" },
  delete_trip:        { label: "حذف رحلة",       bg: "bg-red-50",    icon: "text-red-400",    d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" },
  approve_trip:       { label: "موافقة رحلة",    bg: "bg-green-50",  icon: "text-green-500",  d: "M5 13l4 4L19 7" },
  reject_trip:        { label: "رفض رحلة",       bg: "bg-red-50",    icon: "text-red-400",    d: "M6 18L18 6M6 6l12 12" },
  default:            { label: "نشاط",           bg: "bg-gray-50",   icon: "text-gray-400",   d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
};

// Role display config
const ROLE_CONFIG = {
  admin:  { label: "أدمن",   color: "bg-amber-100 text-amber-700" },
  sales:  { label: "سيلز",   color: "bg-blue-100 text-blue-700" },
  driver: { label: "سائق",   color: "bg-green-100 text-green-700" },
};

const ROLE_TABS = [
  { key: "admin",  label: "الأدمن" },
  { key: "sales",  label: "السيلز" },
  { key: "driver", label: "السائق" },
];

function getActionConfig(action_type) {
  return ACTION_CONFIG[action_type] || ACTION_CONFIG.default;
}

function formatDateTime(raw) {
  if (!raw) return { date: "—", time: "" };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { date: String(raw), time: "" };
  return {
    date: d.toLocaleDateString("ar-EG"),
    time: d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
  };
}

function parseList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.logs)) return data.logs;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function buildUrl(role, userId) {
  if (role === "admin")  return `${BASE}/logs/admin`;
  if (role === "sales")  return `${BASE}/logs/sales/${encodeURIComponent(userId)}`;
  if (role === "driver") return `${BASE}/logs/driver/${encodeURIComponent(userId)}`;
  return `${BASE}/logs/admin`;
}

export default function ActivityLogPage() {
  const { user } = useAuthContext();

  // Determine current user's role from Firebase custom claims
  const currentRole = user?.role ?? "admin";
  const currentUserId = user?.uid ?? "";

  // If admin → can switch between all tabs; otherwise locked to own role
  const isAdmin = currentRole === "admin";

  // Active tab: admin can pick any, others are locked to their own role
  const [activeTab, setActiveTab] = useState(() => {
    if (currentRole === "sales")  return "sales";
    if (currentRole === "driver") return "driver";
    return "admin";
  });

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sales list (for admin sales tab)
  const [salesList, setSalesList] = useState([]);
  const [selectedSalesId, setSelectedSalesId] = useState("");

  // Drivers list (for admin driver tab)
  const [driversList, setDriversList] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");

  const { searchQuery, setSearchQuery } = useGlobalSearch();

  // Filters
  const [actionFilter, setActionFilter] = useState("الكل");

  const fetchLogs = useCallback(async () => {
    // For admin sales tab: require a selected sales id
    if (activeTab === "sales" && isAdmin && !selectedSalesId) return;
    // For admin driver tab: require a selected driver id
    if (activeTab === "driver" && isAdmin && !selectedDriverId) return;

    setLoading(true);
    setError("");
    setLogs([]);
    try {
      const userId = isAdmin
        ? (activeTab === "sales" ? selectedSalesId : activeTab === "driver" ? selectedDriverId : "")
        : currentUserId;
      const url = buildUrl(activeTab, userId);
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(parseList(data));
    } catch (err) {
      console.error("fetchLogs error:", err);
      setError("حدث خطأ أثناء تحميل السجل. تحقق من الاتصال بالشبكة.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, isAdmin, currentUserId, selectedSalesId, selectedDriverId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Load BOTH lists on mount so name resolution works everywhere
  useEffect(() => {
    if (!isAdmin) return;
    fetchAllSales()
      .then((list) => setSalesList(list))
      .catch((err) => console.error("fetchAllSales error:", err));
    fetchAllDrivers()
      .then((list) => setDriversList(list))
      .catch((err) => console.error("fetchAllDrivers error:", err));
  }, [isAdmin]);

  // Load sales list when admin switches to sales tab (pre-select first item)
  useEffect(() => {
    if (activeTab === "sales" && isAdmin && salesList.length > 0 && !selectedSalesId) {
      setSelectedSalesId(salesList[0].id);
    }
  }, [activeTab, isAdmin, salesList, selectedSalesId]);

  // Load drivers list when admin switches to driver tab (pre-select first item)
  useEffect(() => {
    if (activeTab === "driver" && isAdmin && driversList.length > 0 && !selectedDriverId) {
      setSelectedDriverId(driversList[0].id);
    }
  }, [activeTab, isAdmin, driversList, selectedDriverId]);

  // Reset filters on tab change
  useEffect(() => {
    setActionFilter("الكل");
    setSelectedSalesId("");
    setSelectedDriverId("");
    setLogs([]);
  }, [activeTab]);

  // Unique action types from current logs
  const actionTypes = ["الكل", ...new Set(logs.map((l) => l.action_type).filter(Boolean))];

  // Lookup maps: id → name
  const driverNameMap = Object.fromEntries(
    driversList.map((d) => [d.id, [d.name, d.last_name].filter(Boolean).join(" ")])
  );
  const salesNameMap = Object.fromEntries(
    salesList.map((s) => [s.id, s.name])
  );

  const filtered = logs.filter((log) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      q === "" ||
      String(log.id ?? "").toLowerCase().includes(q) ||
      String(log.trip_id ?? "").toLowerCase().includes(q) ||
      (log.title ?? "").toLowerCase().includes(q) ||
      (log.description ?? "").toLowerCase().includes(q) ||
      (log.driver?.name ?? "").toLowerCase().includes(q) ||
      (log.sales_user?.name ?? "").toLowerCase().includes(q);
    const matchAction = actionFilter === "الكل" || log.action_type === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <div className="w-full space-y-5 pb-8" dir="rtl">

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
        <h1 className="text-2xl font-semibold text-[#c9a84c] text-right">سجل النشاطات</h1>
        <p className="text-xs text-gray-400 mt-0.5 text-right">تتبع جميع العمليات والتغييرات التي تمت على النظام</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">

        {/* Role Tabs — only admin sees all tabs */}
        {isAdmin && (
          <div className="flex gap-2 bg-gray-50 rounded-xl p-1">
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.key
                    ? "bg-white shadow text-[#c9a84c]"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Current tab badge (non-admin) */}
        {!isAdmin && (
          <div className="flex justify-end">
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${ROLE_CONFIG[currentRole]?.color ?? "bg-gray-100 text-gray-500"}`}>
              {ROLE_CONFIG[currentRole]?.label ?? currentRole}
            </span>
          </div>
        )}

        {/* Sales selector — admin sales tab only */}
        {isAdmin && activeTab === "sales" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 text-right">اختر السيلز</label>
            <select
              value={selectedSalesId}
              onChange={(e) => setSelectedSalesId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-600 text-right"
            >
              <option value="">-- اختر سيلز --</option>
              {salesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Driver selector — admin driver tab only */}
        {isAdmin && activeTab === "driver" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 text-right">اختر السائق</label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-600 text-right"
            >
              <option value="">-- اختر سائق --</option>
              {driversList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}{d.last_name ? ` ${d.last_name}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 text-right">نوع النشاط</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-600 text-right"
            >
              {actionTypes.map((t) => (
                <option key={t}>{getActionConfig(t).label !== "نشاط" ? getActionConfig(t).label : t}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 text-right">بحث</label>
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم الرحلة أو الوصف..."
                className="bg-transparent text-sm outline-none w-full placeholder-gray-300 text-right"
                dir="rtl"
              />
            </div>
          </div>
        </div>

        {/* Refresh button */}
        <div className="flex justify-start">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#c9a84c] transition-colors disabled:opacity-40"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            تحديث
          </button>
        </div>

        {/* Content */}
        {isAdmin && activeTab === "sales" && !selectedSalesId ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            اختر سيلز من القائمة أعلاه لعرض سجل نشاطاته
          </div>
        ) : isAdmin && activeTab === "driver" && !selectedDriverId ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            اختر سائق من القائمة أعلاه لعرض سجل نشاطاته
          </div>
        ) : loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-10 space-y-3 bg-[#faf7f0] rounded-xl border border-gray-100">
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-[#c9a84c] hover:bg-[#b8973d] text-white text-xs font-medium rounded-xl transition-colors"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {filtered.map((log) => {
              const cfg = getActionConfig(log.action_type);
              const { date, time } = formatDateTime(log.created_at);

              // Determine who performed the action — prefer name over raw id
              const actor =
                log.driver?.name ??
                log.sales_user?.name ??
                log.performed_by ??
                (log.driver_id ? (driverNameMap[log.driver_id] ?? log.driver_id) : null) ??
                (log.sales_id  ? (salesNameMap[log.sales_id]   ?? log.sales_id)  : null) ??
                "—";

              // Replace raw IDs in description with names
              let description = log.description ?? "";
              Object.entries(driverNameMap).forEach(([id, name]) => {
                description = description.replaceAll(id, name);
              });
              Object.entries(salesNameMap).forEach(([id, name]) => {
                description = description.replaceAll(id, name);
              });

              return (
                <div
                  key={log.id}
                  className="border border-gray-100 rounded-xl p-4 flex items-start gap-4 hover:bg-gray-50/50 transition-colors"
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <svg className={`w-4 h-4 ${cfg.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cfg.d} />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      {/* Date/time */}
                      <p className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                        {date}<br />{time}
                      </p>
                      {/* Title + actor */}
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800">{log.title ?? cfg.label}</p>
                          {log.trip_id && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                              رحلة #{log.trip_id}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">بواسطة: {actor}</p>
                      </div>
                    </div>
                    {description && (
                      <p className="text-xs text-gray-400 text-right mt-1.5 leading-relaxed">
                        {description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && !loading && (
              <p className="text-center text-gray-400 text-sm py-8">لا توجد نشاطات</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
