import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword } from "../../services/authService.js";
import { useAuthContext } from "../../context/AuthContext.jsx";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { refreshUser, logout } = useAuthContext();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      await refreshUser();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-7">
          <h2 className="text-base font-bold text-gray-800 mb-1">تغيير كلمة المرور</h2>
          <p className="text-xs text-gray-500 mb-5">يمكنك تغيير كلمة المرور الحالية إذا رغبت</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-3 py-2.5 text-right mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-gray-600 block">كلمة المرور الحالية</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                dir="ltr"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-600 block">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                dir="ltr"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-600 block">تأكيد كلمة المرور</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                dir="ltr"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c9a84c] text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60"
            >
              {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="w-full text-xs text-gray-400 hover:text-gray-600"
            >
              تسجيل الخروج
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
