import { useEffect, useState } from "react";
import AppModal from "../ui/AppModal";
import { fetchSalesById } from "../../services/salesService.js";
import { getRoleLabel } from "../../lib/roleUtils.js";
import { STATUS_LABELS } from "../../lib/roles.js";

function Field({ label, value, dir }) {
  return (
    <div className="text-right space-y-1">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5" dir={dir}>
        {value ?? "—"}
      </p>
    </div>
  );
}

export default function UserDetailsModal({ isOpen, onClose, userId, roles = [], onEdit }) {
  const [loading, setLoading] = useState(false);
  const [sale, setSale] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !userId) {
      setSale(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSalesById(userId)
      .then((data) => {
        if (!cancelled) setSale(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "فشل تحميل بيانات الموظف");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, userId]);

  const roleLabel = getRoleLabel(sale?.role_id, roles);
  const statusLabel = STATUS_LABELS[sale?.status] ?? sale?.status ?? "—";

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="تفاصيل الموظف"
      subtitle={sale?.name}
      size="lg"
    >
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <p className="text-center text-sm text-red-600 py-10">{error}</p>
      )}

      {!loading && !error && sale && (
        <div className="space-y-4 text-right" dir="rtl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="المعرّف" value={sale.id} dir="ltr" />
            <Field label="الاسم" value={sale.name} />
            <Field label="البريد الإلكتروني" value={sale.email} dir="ltr" />
            <Field label="رقم الهاتف" value={sale.phone} dir="ltr" />
            <Field label="الدور" value={roleLabel} />
            <Field label="الحالة" value={statusLabel} />
            <Field label="الهدف" value={sale.target ?? sale.main_target} />
            <Field label="هدف الإدارة" value={sale.admin_target} />
            <Field label="تاريخ الإنشاء" value={sale.created_at} dir="ltr" />
            <Field label="آخر تحديث" value={sale.updated_at} dir="ltr" />
          </div>

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(sale)}
              className="w-full mt-2 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              تعديل البيانات
            </button>
          )}
        </div>
      )}
    </AppModal>
  );
}
