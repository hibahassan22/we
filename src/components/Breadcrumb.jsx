import { useLocation } from "react-router-dom";

const ROUTE_LABELS = {
  "/dashboard":     { label: "لوحة التحكم",      icon: "📊" },
  "/trips":         { label: "سجل الرحلات",       icon: "🗂" },
  "/create-trip":   { label: "إنشاء رحلة",        icon: "➕" },
  "/clients":       { label: "العملاء",             icon: "👥" },
  "/drivers":       { label: "السائقين",            icon: "🚗" },
  "/rewards":       { label: "إدارة المكافآت",    icon: "🎁" },
  "/support":       { label: "الدعم الفني",        icon: "🎧" },
  "/notifications": { label: "إدارة الاشعارات",   icon: "🔔" },
  "/alerts":        { label: "الاشعارات",           icon: "🔔" },
  "/activity":      { label: "سجل النشاطات",      icon: "🕐" },
  "/approvals":     { label: "مركز الموافقات",    icon: "✅" },
  "/permissions":   { label: "الصلاحيات",          icon: "🔒" },
  "/users":         { label: "المستخدمين",         icon: "👤" },
  "/system":        { label: "إدارة النظام",       icon: "⚙" },
  "/accounts":      { label: "الحسابات",           icon: "💳" },
  "/settings":      { label: "الإعدادات",          icon: "🛠" },
  "/new-trip":      { label: "نموذج رحلة جديدة",  icon: "📝" },
};

export default function Breadcrumb() {
  const location = useLocation();

  // Match longest prefix
  const matched = Object.keys(ROUTE_LABELS)
    .filter(r => location.pathname === r || location.pathname.startsWith(r + "/"))
    .sort((a, b) => b.length - a.length)[0];

  const page = ROUTE_LABELS[matched];
  if (!page) return null;

  return (
    <div className="flex items-center gap-2" dir="rtl">
      <span className="text-base">{page.icon}</span>
      <span className="text-sm font-semibold text-gray-700">{page.label}</span>
      <span className="text-gray-300 text-xs">|</span>
      <span className="text-xs text-gray-400">Drivo Admin</span>
    </div>
  );
}