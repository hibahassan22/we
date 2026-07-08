import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="w-full min-h-screen bg-[#f5f0e8] flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm p-12 flex flex-col items-center gap-4 text-center max-w-sm border border-gray-100">
        <div className="text-7xl font-black text-[#c9a84c]">404</div>
        <h1 className="text-xl font-bold text-gray-800">الصفحة غير موجودة</h1>
        <p className="text-sm text-gray-400">الصفحة التي تبحث عنها غير موجودة أو تم نقلها.</p>
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-2 bg-[#4a4746] text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-black transition-colors"
        >
          العودة إلى لوحة التحكم
        </button>
      </div>
    </div>
  );
}
