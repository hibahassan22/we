import { useEffect, useState } from "react";
import AppModal from "../ui/AppModal";

const API_BASE = "/api";

function Field({ label, value, dir }) {
  return (
    <div className="text-right">
      <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800" dir={dir}>{value ?? "—"}</p>
    </div>
  );
}

export default function CustomerProfileModal({ isOpen, onClose, customerId }) {
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !customerId) {
      setCustomer(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/customers-details/${customerId}`, {
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`فشل تحميل بيانات العميل (${res.status})`);
        const data = await res.json();
        if (!cancelled) setCustomer(data.customer ?? data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "حدث خطأ");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, customerId]);

  const genderLabel =
    customer?.gender === "male" ? "ذكر" : customer?.gender === "female" ? "أنثى" : customer?.gender;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="الملف الشخصي للعميل"
      size="lg"
    >
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-center text-sm text-red-600 py-8">{error}</p>
      )}

      {!loading && !error && customer && (
        <div className="space-y-4 text-right" dir="rtl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="الاسم الكامل" value={customer.full_name ?? customer.name} />
            <Field label="رقم الهاتف" value={customer.phone} dir="ltr" />
            <Field label="الجنسية" value={customer.nationality} />
            <Field label="النوع" value={genderLabel} />
            <Field label="إجمالي الرحلات" value={customer.total_trips} />
          </div>

          {Array.isArray(customer.trips) && customer.trips.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-700 mb-2">آخر الرحلات ({customer.trips.length})</p>
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {customer.trips.slice(0, 5).map((t, index) => (
                  <li key={`${t.id}-${index}`} className="text-xs bg-gray-50 rounded-lg px-3 py-2 flex justify-between gap-2">
                    <span className="text-gray-400">#{t.id}</span>
                    <span className="text-gray-700 truncate">{t.from} ← {t.to}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </AppModal>
  );
}
