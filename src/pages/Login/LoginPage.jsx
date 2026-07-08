import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuthContext } from "../../context/AuthContext.jsx";
import { assetUrl } from "../../lib/assetUrl.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoaded, isSignedIn } = useAuthContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = useMemo(
    () => location.state?.from?.pathname ?? "/dashboard",
    [location.state?.from?.pathname]
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    navigate(from, { replace: true });
  }, [isLoaded, isSignedIn, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg border-2 border-[#c9a84c]/30">
            <img src={assetUrl("judy.png")} alt="Drivo" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-[#c9a84c]">Drivo</h1>
            <p className="text-sm text-gray-500 mt-0.5">لوحة تحكم المشرفين</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-7">
          <h2 className="text-base font-bold text-gray-800 mb-5">تسجيل الدخول</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-3 py-2.5 text-right mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 block">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@domain.com"
                dir="ltr"
                autoComplete="email"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none placeholder-gray-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600 block">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                autoComplete="current-password"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none placeholder-gray-300"
              />
            </div>

            <div className="flex justify-start">
              <Link to="/forgot-password" className="text-xs text-[#c9a84c] hover:text-[#b8943f] font-medium">
                نسيت كلمة المرور؟
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c9a84c] hover:bg-[#b8943f] text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 shadow-sm"
            >
              {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
            </button>
          </form>

          <p className="text-[10px] text-gray-400 text-center mt-5">
            نظام داخلي — لا يمكن إنشاء حساب ذاتياً
          </p>
        </div>
      </div>
    </div>
  );
}
