import { Navigate, useLocation } from "react-router-dom";

import { useAuthContext } from "../context/AuthContext.jsx";
import { STATUS_LABELS } from "../lib/roles.js";

const INACTIVE_STATUSES = new Set(["inactive", "suspended", "blocked", "disabled"]);

function AuthMessageScreen({ title, message, onLogout }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#f5f0e8] p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center space-y-4">
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={onLogout}
          className="w-full bg-[#c9a84c] hover:bg-[#b8943f] text-white font-bold py-3 rounded-xl text-sm transition-colors"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}

/**
 * حماية المسارات حسب صلاحيات الدور فقط.
 * Admin = وصول كامل. باقي الأدوار = ما يحدده المدير في صفحة الصلاحيات.
 */
export default function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn, profile, logout, access } = useAuthContext();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#f5f0e8]" dir="rtl">
        <div className="w-14 h-14 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-500 font-medium">جاري تحميل النظام...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profile === null) {
    return (
      <AuthMessageScreen
        title="الحساب غير مكتمل"
        message="تم تسجيل الدخول في Firebase لكن ملف المستخدم غير موجود في قاعدة البيانات. اطلب من مدير النظام إعادة إنشاء حسابك أو مزامنة بياناتك."
        onLogout={() => logout()}
      />
    );
  }

  if (INACTIVE_STATUSES.has(profile.status)) {
    return (
      <AuthMessageScreen
        title="الحساب غير مفعّل"
        message={`حالة حسابك: ${STATUS_LABELS[profile.status] ?? profile.status}. تواصل مع مدير النظام.`}
        onLogout={() => logout()}
      />
    );
  }

  if (location.pathname === "/change-password") {
    return children;
  }

  if (!access.canRoute(location.pathname)) {
    const fallback = access.firstRoute();
    if (location.pathname === fallback) {
      return (
        <AuthMessageScreen
          title="لا توجد صلاحيات"
          message="حسابك لا يملك صلاحية الوصول لأي قسم. تواصل مع مدير النظام لتعيين دور وصلاحيات."
          onLogout={() => logout()}
        />
      );
    }
    return <Navigate to={fallback} replace />;
  }

  return children;
}
