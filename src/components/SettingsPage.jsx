import { useAuthContext } from "../lib/AuthContext";

const ROLE_LABEL = {
  admin:      "مدير النظام",
  support:    "خدمة عملاء",
  accountant: "محاسب",
};

const LockIcon = () => (
  <svg className="w-4 h-4 text-[#c9a84c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const TrendIcon = () => (
  <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

export default function SettingsPage() {
  const { user } = useAuthContext();

  const firstName = user?.firstName || (user?.email?.split('@')[0] ?? "");
  const lastName  = user?.lastName  ?? "";
  const fullName  = [firstName, lastName].filter(Boolean).join(" ") || user?.displayName || "مستخدم";
  const email     = user?.email ?? "";
  const avatar    = user?.imageUrl ?? user?.photoURL;
  const role      = user?.role ?? "support";
  const roleLabel = ROLE_LABEL[role] ?? role;

  // Stats — these would come from API; shown as static for now
  const stats = [
    { label: "سرعة الاستجابة",      value: "88%", sub: "هذا الشهر" },
    { label: "مستوى النشاط",        value: "70%", sub: "هذا الشهر" },
    { label: "سرعة حل المشكلات",   value: "45%", sub: "هذا الشهر" },
    { label: "كفاءة إدارة الحالات", value: "50%", sub: "هذا الشهر" },
  ];

  const progress = 70;
  const current  = 127;
  const target   = 150;

  return (
    <div className="w-full space-y-4" dir="rtl">

      {/* Profile Card */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1" />
          <div className="flex flex-col items-center gap-2 text-center">
            {/* Avatar */}
            <div className="relative">
              {avatar ? (
                <img src={avatar} alt={fullName} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#9C6402] to-[#E6C76A] flex items-center justify-center text-3xl text-white font-bold shadow border-4 border-white">
                  {firstName?.[0] ?? "U"}
                </div>
              )}
              <button className="absolute bottom-0 left-0 w-6 h-6 bg-[#c9a84c] rounded-full flex items-center justify-center shadow" title="تعديل الصورة">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">{fullName}</h2>
              {email && <p className="text-xs text-gray-400 mt-0.5">{email}</p>}
              <span className="inline-block mt-1 border border-[#c9a84c] text-[#c9a84c] text-xs px-3 py-0.5 rounded-full">
                {roleLabel}
              </span>
            </div>
          </div>
          <div className="flex-1" />
        </div>

        {/* Monthly Goal */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">{progress}%</span>
            <span className="text-sm font-semibold text-gray-700">الهدف الشهري</span>
          </div>
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-l from-[#9C6402] to-[#E6C76A] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-8 mt-4">
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-gray-800">{target}</span>
              <span className="text-xs text-gray-400">الهدف المطلوب</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-center">
              <span className="text-xl font-bold text-gray-800">{current}</span>
              <span className="text-xs text-gray-400">الانجاز الحالي</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#c9a84c]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#c9a84c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between"><LockIcon /><span className="text-xs text-gray-500 font-medium">{s.label}</span></div>
            <p className="text-2xl font-bold text-gray-800 text-right">{s.value}</p>
            <div className="flex items-center justify-end gap-1 text-xs text-amber-600"><span>{s.sub}</span><TrendIcon /></div>
          </div>
        ))}
      </div>

    </div>
  );
}
