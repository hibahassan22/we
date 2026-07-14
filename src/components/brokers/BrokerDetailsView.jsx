import { useState } from "react";

function fmtMoney(n) {
  const num = Number(n) || 0;
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

function InfoRow({ label, value, ltr }) {
  return (
    <div className="flex justify-between border-b border-gray-50 pb-2 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-700 font-medium" dir={ltr ? "ltr" : undefined}>
        {value || "—"}
      </span>
    </div>
  );
}

function BrokerTripsTab({ broker }) {
  const rows = [
    { label: "الرحلات المكتملة", value: broker?.completed_trips ?? 0, tone: "text-green-600 bg-green-50" },
    { label: "الرحلات النشطة", value: broker?.active_trips ?? 0, tone: "text-[#b88121] bg-amber-50" },
    { label: "إجمالي الرحلات", value: broker?.trips_count ?? 0, tone: "text-sky-600 bg-sky-50" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4" dir="rtl">
      <h3 className="text-sm font-bold text-[#c9a84c] text-right">سجل الرحلات</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {rows.map((r) => (
          <div key={r.label} className={`rounded-xl px-4 py-4 text-center ${r.tone}`}>
            <p className="text-2xl font-extrabold">{r.value}</p>
            <p className="text-xs mt-1 opacity-80">{r.label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 text-right">
        تفاصيل رحلات الوسيط ستظهر هنا عند ربطها من النظام.
      </p>
    </div>
  );
}

/**
 * BrokerDetailsView — مثل صفحة السائقين (بدون ملاحظات / تنبيهات / تقييمات)
 */
export default function BrokerDetailsView({ broker, onBack, onEdit, onDelete }) {
  const [activeTab, setActiveTab] = useState("personal");

  if (!broker) return null;

  const tabs = [
    { id: "personal", label: "المعلومات الشخصية" },
    { id: "trips", label: "سجل الرحلات" },
  ];

  const commissionLabel =
    broker.commission_type === "نقدي"
      ? `${Number(broker.commission).toLocaleString("en-US")} SR`
      : `${broker.commission}%`;

  const statusLabel = broker.status === "active" ? "نشط" : broker.status || "—";

  return (
    <div dir="rtl" className="w-full space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-[#c9a84c] text-sm font-semibold hover:opacity-80"
      >
        <span>العودة إلى الوسطاء</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Profile Card — مثل السائقين */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onEdit?.(broker)}
            className="border border-gray-200 text-gray-600 px-3 py-2 rounded-xl hover:bg-gray-50"
          >
            تعديل
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(broker)}
            className="border border-red-200 text-red-500 px-3 py-2 rounded-xl hover:bg-red-50"
          >
            حذف
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-800">{broker.name}</h2>
            <p className="text-xs text-gray-400 mt-1" dir="ltr">{broker.phone || "—"}</p>
            <div className="flex gap-2 mt-2 justify-end">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 font-semibold">
                {statusLabel}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-[#b88121] font-semibold" dir="ltr">
                {broker.broker_code}
              </span>
            </div>
          </div>
          {broker.photo_url ? (
            <img
              src={broker.photo_url}
              alt={broker.name}
              className="w-14 h-14 rounded-full object-cover border border-gray-200 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gray-700 text-white flex items-center justify-center text-2xl font-bold shrink-0">
              {(broker.name || "?")[0]}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm flex gap-4 text-sm font-semibold text-gray-400 overflow-x-auto">
        {tabs.map((tab) => (
          <span
            key={tab.id}
            role="button"
            tabIndex={0}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => e.key === "Enter" && setActiveTab(tab.id)}
            className={`px-3 py-1 cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "text-[#c9a84c] border-b-2 border-[#c9a84c]"
                : "hover:text-gray-700"
            }`}
          >
            {tab.label}
          </span>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-2">
        {activeTab === "personal" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-[#c9a84c]">البيانات الأساسية</h3>
              <InfoRow label="الاسم" value={broker.name} />
              <InfoRow label="كود الوسيط" value={broker.broker_code} ltr />
              <InfoRow label="الهاتف" value={broker.phone} ltr />
              <InfoRow label="رقم الهوية" value={broker.identity_number} ltr />
              <InfoRow label="المدينة" value={broker.address} />
              <InfoRow label="إجمالي العملاء" value={String(broker.clients_count ?? 0)} />
              <InfoRow label="رحلات" value={String(broker.trips_count ?? 0)} />
              <InfoRow label="الحالة" value={statusLabel} />
            </div>

            <div className="space-y-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-[#c9a84c]">العمولات والأرباح</h3>
                <InfoRow label="نوع العمولة" value={broker.commission_type || "نسبة مئوية"} />
                <InfoRow label="قيمة العمولة" value={commissionLabel} />
                <InfoRow label="الرصيد" value={fmtMoney(broker.balance)} />
                <InfoRow label="الرحلات المكتملة" value={String(broker.completed_trips ?? 0)} />
                <InfoRow label="الرحلات النشطة" value={String(broker.active_trips ?? 0)} />
              </div>

              {broker.photo_url && (
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-[#c9a84c]">صورة الهوية</h3>
                  <img
                    src={broker.photo_url}
                    alt="صورة الهوية"
                    className="w-full max-h-56 object-contain rounded-xl bg-gray-50"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "trips" && <BrokerTripsTab broker={broker} />}
      </div>
    </div>
  );
}
