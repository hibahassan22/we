import { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import { useToast } from "../lib/toast";
import AppModal, { ModalField, modalInputClass } from "./ui/AppModal";

const API_BASE = "https://drivo1.elmoroj.com/api";

const EMPTY_FORM = {
  trip_id: "",
  driver_id: "",
  our_commission: "",
  total_price: "",
  paid_amount: "",
  from_account: "",
  to_account: "",
  transfer_method: "تحويل بنكي",
  notes: "",
  transfer_image: null,
};

/**
 * AssignTripModal — إسناد رحلة لسائق
 *
 * Props:
 *   isOpen         {boolean}
 *   onClose        {Function}
 *   tripId         {string|number?}  — معرّف الرحلة (مُحدَّد مسبقاً من صفحة الرحلات)
 *   driverId       {string?}        — معرّف السائق (مُحدَّد مسبقاً من صفحة السائق)
 *   driverName     {string?}
 *   onSuccess      {Function?}
 */
export default function AssignTripModal({
  isOpen,
  onClose,
  tripId: fixedTripId,
  driverId: fixedDriverId,
  driverName,
  onSuccess,
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);

  const fromDriverPage = Boolean(fixedDriverId);
  const fromTripPage = Boolean(fixedTripId);

  useEffect(() => {
    if (!isOpen) return;
    setShowConfirm(false);
    setForm({
      ...EMPTY_FORM,
      trip_id: fixedTripId ? String(fixedTripId) : "",
      driver_id: fixedDriverId ? String(fixedDriverId) : "",
      transfer_image: null,
    });

    if (!fromDriverPage) {
      fetch(`${API_BASE}/drivers`, { headers: { Accept: "application/json" } })
        .then((r) => r.json())
        .then((d) => setDrivers(Array.isArray(d) ? d : d.data ?? []))
        .catch(() => setDrivers([]));
    }
  }, [isOpen, fixedTripId, fixedDriverId, fromDriverPage]);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const resolvedTripId = fromTripPage ? String(fixedTripId) : form.trip_id.trim();
  const resolvedDriverId = fromDriverPage ? String(fixedDriverId) : form.driver_id;

  const handleSubmit = async () => {
    if (!resolvedTripId) {
      toast.error("يرجى إدخال رقم الرحلة");
      return;
    }
    if (!resolvedDriverId) {
      toast.error("يرجى اختيار السائق");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("driver_id", resolvedDriverId);
      if (form.our_commission) fd.append("our_commission", form.our_commission);
      if (form.total_price) fd.append("total_price", form.total_price);
      if (form.paid_amount) fd.append("paid_amount", form.paid_amount);
      if (form.from_account) fd.append("from_account", form.from_account);
      if (form.to_account) fd.append("to_account", form.to_account);
      if (form.transfer_method) fd.append("transfer_method", form.transfer_method);
      if (form.notes) fd.append("notes", form.notes);
      if (form.transfer_image) fd.append("transfer_image", form.transfer_image);

      const res = await fetch(`${API_BASE}/trips/${resolvedTripId}/assign-driver`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || json?.message || `خطأ ${res.status}`);

      toast.success(json.message || "تم إسناد الرحلة بنجاح");
      window.dispatchEvent(new CustomEvent("trips-list-refresh"));

      const selectedDriver = fromDriverPage
        ? { id: fixedDriverId, name: driverName }
        : drivers.find((d) => String(d.id) === resolvedDriverId);

      onSuccess?.({
        ...json,
        trip_id: resolvedTripId,
        driver_id: resolvedDriverId,
        driver: json?.driver ?? json?.data?.driver ?? selectedDriver ?? null,
      });
      onClose();
    } catch (err) {
      toast.error(err.message || "حدث خطأ أثناء الإسناد");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const inputCls = `${modalInputClass} text-right`;

  if (showConfirm) {
    return (
      <AppModal
        isOpen={isOpen}
        onClose={() => setShowConfirm(false)}
        title="تأكيد الإسناد"
        isSubmitting={loading}
        size="sm"
      >
        <p className="text-sm text-gray-700 text-center py-2 leading-relaxed">
          هل تريد إسناد الرحلة #{resolvedTripId}
          {driverName ? ` إلى السائق ${driverName}` : ""}؟
        </p>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-[#4a4644] text-white text-sm font-semibold hover:bg-black transition-colors disabled:opacity-60"
          >
            {loading ? "جاري الإسناد..." : "نعم، تأكيد"}
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </AppModal>
    );
  }

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="إسناد رحلة"
      subtitle={fromDriverPage && driverName ? `السائق: ${driverName}` : undefined}
      size="lg"
      footer={
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="w-full py-3 text-sm font-bold text-white rounded-xl bg-[#4a4644] hover:bg-black transition-colors"
        >
          إسناد الرحلة
        </button>
      }
    >
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 shadow-sm">
          <h4 className="text-sm font-bold text-[#c9a84c] text-right">معلومات الإسناد</h4>

          {fromDriverPage ? (
            <>
              <ModalField label="السائق">
                <input type="text" value={driverName || fixedDriverId} readOnly className={`${inputCls} bg-gray-50`} />
              </ModalField>
              <ModalField label="رقم الرحلة" required>
                <input
                  type="number"
                  placeholder="مثال: 297"
                  value={form.trip_id}
                  onChange={(e) => set("trip_id", e.target.value)}
                  className={inputCls}
                />
              </ModalField>
            </>
          ) : (
            <>
              <ModalField label="رقم الرحلة">
                <input type="text" value={`#${fixedTripId}`} readOnly className={`${inputCls} bg-gray-50`} />
              </ModalField>
              <ModalField label="اختر السائق" required>
                <select
                  value={form.driver_id}
                  onChange={(e) => set("driver_id", e.target.value)}
                  className={`${inputCls} appearance-none`}
                >
                  <option value="">اختر السائق...</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {[d.name, d.last_name].filter(Boolean).join(" ")} — {d.phone}
                    </option>
                  ))}
                </select>
              </ModalField>
            </>
          )}

        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 shadow-sm">
          <h4 className="text-sm font-bold text-[#c9a84c] text-right">التفاصيل المالية (اختياري)</h4>
          <div className="grid grid-cols-2 gap-3">
            <ModalField label="عمولتنا">
              <input type="number" placeholder="العمولة" value={form.our_commission} onChange={(e) => set("our_commission", e.target.value)} className={inputCls} />
            </ModalField>
            <ModalField label="سعر الرحلة">
              <input type="number" placeholder="السعر الكامل" value={form.total_price} onChange={(e) => set("total_price", e.target.value)} className={inputCls} />
            </ModalField>
            <ModalField label="المبلغ المدفوع">
              <input type="number" placeholder="المدفوع" value={form.paid_amount} onChange={(e) => set("paid_amount", e.target.value)} className={inputCls} />
            </ModalField>
            <ModalField label="طريقة التحويل">
              <select value={form.transfer_method} onChange={(e) => set("transfer_method", e.target.value)} className={`${inputCls} appearance-none`}>
                <option value="تحويل بنكي">تحويل بنكي</option>
                <option value="كاش">كاش</option>
                <option value="محفظة إلكترونية">محفظة إلكترونية</option>
              </select>
            </ModalField>
            <ModalField label="من حساب">
              <input type="text" placeholder="من" value={form.from_account} onChange={(e) => set("from_account", e.target.value)} className={inputCls} />
            </ModalField>
            <ModalField label="إلى حساب">
              <input type="text" placeholder="إلى" value={form.to_account} onChange={(e) => set("to_account", e.target.value)} className={inputCls} />
            </ModalField>
          </div>
          <ModalField label="صورة التحويل">
            <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50">
              <Upload className="w-4 h-4 text-gray-400" />
              <span>{form.transfer_image ? form.transfer_image.name : "اختر الملف"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => set("transfer_image", e.target.files?.[0] ?? null)} />
            </label>
          </ModalField>
          <ModalField label="ملاحظات">
            <textarea rows={2} placeholder="ملاحظة (اختياري)" value={form.notes} onChange={(e) => set("notes", e.target.value)} className={`${inputCls} resize-none`} />
          </ModalField>
        </div>
      </div>
    </AppModal>
  );
}
