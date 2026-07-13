import { useEffect, useState } from "react";
import { fetchCustomerDetails, formatGenderLabel } from "../../services/customerService.js";

export default function TripCustomerCard({ customerId, onOpenProfile }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!customerId) {
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
        if (!cancelled) setError(err.message || "فشل تحميل بيانات العميل");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [customerId]);

  return (
    <div className="bg-white border border-gray-200 rounded-[1.2rem] p-5 shadow-sm text-right h-full flex flex-col">
      <h4 className="font-bold text-gray-800 text-sm mb-4 border-b border-gray-100 pb-2 text-center">
        معلومات العميل
      </h4>

      {loading && (
        <div className="flex justify-center py-8 flex-1">
          <div className="w-8 h-8 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <p className="text-red-500 text-xs text-center py-6 flex-1">{error}</p>
      )}

      {!loading && !error && customer && (
        <div className="space-y-3 text-xs text-gray-600 mb-5 flex-1">
          <InfoRow label="الاسم" value={customer.full_name ?? customer.name} />
          <InfoRow label="الهاتف" value={customer.phone} dir="ltr" />
          <InfoRow label="الجنسية" value={customer.nationality} />
          <InfoRow label="النوع" value={formatGenderLabel(customer.gender)} />
          <InfoRow
            label="إجمالي الرحلات"
            value={customer.trips?.total ?? customer.total_trips ?? 0}
          />
        </div>
      )}

      {!loading && !error && customer && (
        <button
          type="button"
          onClick={onOpenProfile}
          className="w-full border border-gray-200 text-gray-500 rounded-xl py-2 text-xs font-semibold hover:bg-gray-50 transition-colors"
        >
          عرض الملف الشخصي
        </button>
      )}
    </div>
  );
}

function InfoRow({ label, value, dir }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-medium text-gray-800" dir={dir}>{value ?? "—"}</span>
      <span className="text-gray-400 shrink-0">{label}</span>
    </div>
  );
}
