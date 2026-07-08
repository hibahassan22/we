import { useState } from "react";
import { Link } from "react-router-dom";
import { sendResetEmail } from "../../services/authService.js";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("يرجى إدخال بريدك الإلكتروني");
      return;
    }
    setLoading(true);
    try {
      await sendResetEmail(email);
      setSent(true);
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
          <h2 className="text-base font-bold text-gray-800 mb-1">استعادة كلمة المرور</h2>
          <p className="text-xs text-gray-500 mb-5">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين</p>

          {sent ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center space-y-2">
              <div className="text-2xl">✅</div>
              <p className="text-sm font-semibold text-green-700">تم إرسال رابط الاستعادة</p>
              <Link to="/login" className="text-xs text-[#c9a84c] font-semibold hover:underline block mt-2">
                العودة لتسجيل الدخول
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-3 py-2.5 text-right">
                  {error}
                </div>
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@domain.com"
                dir="ltr"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#c9a84c] text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60"
              >
                {loading ? "جارٍ الإرسال..." : "إرسال رابط الاستعادة"}
              </button>
              <Link to="/login" className="block text-center text-xs text-gray-400 hover:text-gray-600">
                العودة لتسجيل الدخول
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
