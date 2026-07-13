import { useEffect, useState } from "react";
import AppModal from "../ui/AppModal";
import { fetchCustomerDetails, formatGenderLabel } from "../../services/customerService.js";

function Field({ label, value, dir }) {
  return (
    <div className="text-right">
      <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800" dir={dir}>{value ?? "—"}</p>
    </div>
  );
}

function fmtDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("ar-SA");
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

    fetchCustomerDetails(customerId)
      .then((data) => {
        if (!cancelled) setCustomer(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "حدث خطأ");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, customerId]);

  const trips = customer?.tripHistory ?? [];

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="الملف الشخصي للعميل"
      subtitle={customer?.name ? String(customer.name) : undefined}
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
        <div className="space-y-5 text-right" dir="rtl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="الاسم الكامل" value={customer.full_name ?? customer.name} />
            <Field label="رقم الهاتف" value={customer.phone} dir="ltr" />
            <Field label="الجنسية" value={customer.nationality} />
            <Field label="النوع" value={formatGenderLabel(customer.gender)} />
            <Field label="العنوان" value={customer.address} />
            <Field label="إجمالي الرحلات" value={customer.trips?.total ?? customer.total_trips ?? 0} />
          </div>

          {customer.trips && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "نشطة", val: customer.trips.active },
                { label: "مكتملة", val: customer.trips.completed },
                { label: "ملغية", val: customer.trips.cancelled },
                { label: "معلقة", val: customer.trips.paused },
              ].map((s) => (
                <div key={s.label} className="bg-[#faf7f0] rounded-xl py-2 px-3 text-center">
                  <p className="text-[10px] text-gray-400">{s.label}</p>
                  <p className="text-sm font-bold text-gray-800">{s.val ?? 0}</p>
                </div>
              ))}
            </div>
          )}

          {trips.length > 0 ? (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-700 mb-3">سجل الرحلات ({trips.length})</p>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {trips.map((t, index) => (
                  <div
                    key={`${t.id}-${index}`}
                    className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
                  >
                    <div className="text-right min-w-0">
                      <p className="text-sm font-bold text-[#b88121]">{t.id}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(t.date)}</p>
                    </div>
                    <div className="text-left text-xs text-gray-600 space-y-0.5">
                      {(t.from !== "—" || t.to !== "—") && (
                        <p>{t.from} ← {t.to}</p>
                      )}
                      <p>{t.status}</p>
                      {t.totalPrice != null && (
                        <p className="font-semibold text-gray-800">{Number(t.totalPrice).toLocaleString("ar-SA")} ر.س</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-xs text-gray-400 py-4">لا يوجد سجل رحلات</p>
          )}
        </div>
      )}
    </AppModal>
  );
}
