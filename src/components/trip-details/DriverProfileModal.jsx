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

export default function DriverProfileModal({ isOpen, onClose, driverId }) {
  const [loading, setLoading] = useState(false);
  const [driver, setDriver] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !driverId) {
      setDriver(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/drivers/${driverId}`, {
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`فشل تحميل بيانات السائق (${res.status})`);
        const data = await res.json();
        if (!cancelled) setDriver(data.driver ?? data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "حدث خطأ");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, driverId]);

  const fullName = driver
    ? [driver.name, driver.last_name].filter(Boolean).join(" ")
    : null;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="الملف الشخصي للسائق"
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

      {!loading && !error && driver && (
        <div className="space-y-4 text-right" dir="rtl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="الاسم" value={fullName} />
            <Field label="الهاتف" value={driver.phone} dir="ltr" />
            <Field label="الجنسية" value={driver.nationality} />
            <Field label="العنوان" value={driver.address} />
            <Field label="نوع السيارة" value={driver.car_type} />
            <Field label="موديل السيارة" value={driver.car_model} />
            <Field label="حجم المركبة" value={driver.vehicle_size} />
            <Field label="عدد الرحلات" value={driver.trips_count} />
            <Field label="التقييم" value={driver.rating} />
            <Field label="رصيد المحفظة" value={driver.wallet_balance?.toLocaleString?.("ar-SA") ?? driver.wallet_balance} />
            <Field label="رصيد المكافآت" value={driver.rewards_balance?.toLocaleString?.("ar-SA") ?? driver.rewards_balance} />
          </div>
        </div>
      )}
    </AppModal>
  );
}
