import { useEffect, useState } from "react";
import AppModal from "../ui/AppModal";
import { fetchSalesById } from "../../services/salesService.js";

function Field({ label, value, dir }) {
  return (
    <div className="text-right">
      <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-800" dir={dir}>{value ?? "—"}</p>
    </div>
  );
}

const STATUS_LABELS = {
  active: "نشط",
  inactive: "غير نشط",
  suspended: "موقوف",
};

export default function SalesProfileModal({ isOpen, onClose, salesId }) {
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !salesId) {
      setSales(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSalesById(salesId)
      .then((data) => {
        if (!cancelled) setSales(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "حدث خطأ");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, salesId]);

  const statusLabel = STATUS_LABELS[sales?.status] ?? sales?.status;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="الملف الشخصي لموظف المبيعات"
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

      {!loading && !error && sales && (
        <div className="space-y-4 text-right" dir="rtl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="الاسم" value={sales.name} />
            <Field label="رقم الهاتف" value={sales.phone} dir="ltr" />
            <Field label="البريد الإلكتروني" value={sales.email} dir="ltr" />
            <Field label="الحالة" value={statusLabel} />
            <Field label="الهدف" value={sales.target ?? sales.main_target} />
            <Field label="هدف الإدارة" value={sales.admin_target} />
            <Field label="تاريخ الإنشاء" value={sales.created_at} />
            <Field label="آخر تحديث" value={sales.updated_at} />
          </div>
        </div>
      )}
    </AppModal>
  );
}
