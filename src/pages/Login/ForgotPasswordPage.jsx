import { Link } from "react-router-dom";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-7 text-center space-y-4">
          <div className="text-3xl">🔑</div>
          <h2 className="text-base font-bold text-gray-800">استعادة كلمة المرور</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            لإعادة تعيين كلمة المرور، تواصل مع مدير النظام لتحديثها من صفحة المستخدمين.
          </p>
          <Link
            to="/login"
            className="inline-block w-full bg-[#c9a84c] hover:bg-[#b8943f] text-white font-bold py-3 rounded-xl text-sm transition-colors"
          >
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
