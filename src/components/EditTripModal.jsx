import { useState, useEffect, useRef } from "react";
import { useToast } from "../lib/toast";
import AppModal, { ModalField, ModalActions, modalInputClass } from "./ui/AppModal";
import {
  buildTripEditForm,
  updateTrip,
  TRIP_STATUS_OPTIONS,
} from "../services/tripService.js";
import { fetchSalesList } from "../services/salesService.js";

function friendlyApiError(message) {
  if (!message) return "حدث خطأ أثناء التعديل";
  if (message.includes("محفظة") || message.includes("رصيد")) {
    return "تغيير السعر يتطلب رصيداً كافياً في محفظة شحن السائق.";
  }
  return message;
}

export default function EditTripModal({ isOpen, onClose, trip, onSuccess }) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(buildTripEditForm(null));
  const [salesOptions, setSalesOptions] = useState([]);
  const originalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchSalesList()
      .then((list) => setSalesOptions(Array.isArray(list) ? list : []))
      .catch(() => setSalesOptions([]));
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && trip) {
      const initial = buildTripEditForm(trip);
      setForm(initial);
      originalRef.current = initial;
    }
  }, [isOpen, trip]);

  if (!trip) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const toggleSalesId = (id) => {
    const sid = String(id);
    setForm((p) => {
      const ids = p.sales_ids ?? [];
      return {
        ...p,
        sales_ids: ids.includes(sid) ? ids.filter((x) => x !== sid) : [...ids, sid],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const freshTrip = await updateTrip(trip.id, form, originalRef.current);
      toast.success("تم تعديل بيانات الرحلة بنجاح");
      onSuccess?.(freshTrip);
      onClose();
    } catch (err) {
      toast.error(friendlyApiError(err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectionTitle = "text-xs font-bold text-[#c9a84c] mb-3";

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={`تعديل الرحلة #${trip.id}`}
      isSubmitting={isSubmitting}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
        <div>
          <h3 className={sectionTitle}>البيانات الأساسية</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ModalField label="تاريخ الرحلة">
              <input
                name="trip_date"
                type="date"
                value={form.trip_date}
                onChange={handleChange}
                className={modalInputClass}
                disabled={isSubmitting}
              />
            </ModalField>
            <ModalField label="حالة الرحلة">
              <select
                name="trip_status"
                value={form.trip_status}
                onChange={handleChange}
                className={modalInputClass}
                disabled={isSubmitting}
              >
                <option value="">اختر</option>
                {TRIP_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
                <option value="ملغى">ملغى</option>
              </select>
            </ModalField>
          </div>
        </div>

        <div>
          <h3 className={sectionTitle}>التفاصيل المالية</h3>
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
            لإضافة دفعة أو صورة إثبات استخدم «إضافة دفعة» من التفاصيل المالية.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ModalField label="السعر الكلي" hint="يُرسل فقط عند تغييره">
              <input
                name="total_price"
                type="number"
                value={form.total_price}
                onChange={handleChange}
                className={modalInputClass}
                disabled={isSubmitting}
              />
            </ModalField>
            <ModalField label="المبلغ المدفوع" hint="للعرض فقط — عدّله من إضافة دفعة">
              <input
                name="amount_paid"
                type="number"
                value={form.amount_paid}
                readOnly
                className={`${modalInputClass} bg-gray-50 text-gray-500 cursor-not-allowed`}
              />
            </ModalField>
            <ModalField label="طريقة التحويل">
              <input
                name="transfer_method"
                value={form.transfer_method}
                onChange={handleChange}
                className={modalInputClass}
                disabled={isSubmitting}
              />
            </ModalField>
            <ModalField label="اسم البنك">
              <input
                name="bank_name"
                value={form.bank_name}
                onChange={handleChange}
                className={modalInputClass}
                disabled={isSubmitting}
              />
            </ModalField>
            <ModalField label="رقم الحساب">
              <input
                name="account_number"
                value={form.account_number}
                onChange={handleChange}
                className={modalInputClass}
                disabled={isSubmitting}
                dir="ltr"
              />
            </ModalField>
            <ModalField label="تاريخ تحويل العمولة" hint="مثال: 22/7">
              <input
                name="commission_transfer_date"
                value={form.commission_transfer_date}
                onChange={handleChange}
                className={modalInputClass}
                disabled={isSubmitting}
              />
            </ModalField>
            <ModalField label="مساعدة بواسطة">
              <input
                name="assisted_by"
                value={form.assisted_by}
                onChange={handleChange}
                className={modalInputClass}
                disabled={isSubmitting}
              />
            </ModalField>
          </div>
        </div>

        <div>
          <h3 className={sectionTitle}>بيانات الإلغاء</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ModalField label="ألغيت بواسطة">
              <input
                name="cancel_by"
                value={form.cancel_by}
                onChange={handleChange}
                className={modalInputClass}
                disabled={isSubmitting}
              />
            </ModalField>
            <ModalField label="سبب الإلغاء">
              <input
                name="cancel_reason"
                value={form.cancel_reason}
                onChange={handleChange}
                className={modalInputClass}
                disabled={isSubmitting}
              />
            </ModalField>
            <ModalField label="تاريخ الإلغاء">
              <input
                name="cancel_date"
                type="date"
                value={form.cancel_date}
                onChange={handleChange}
                className={modalInputClass}
                disabled={isSubmitting}
              />
            </ModalField>
          </div>
        </div>

        <div>
          <h3 className={sectionTitle}>موظفو المبيعات</h3>
          <div className="flex flex-wrap gap-2">
            {salesOptions.length === 0 && (form.sales_ids ?? []).map((id) => (
              <span key={id} className="text-xs bg-amber-50 border border-amber-100 px-2 py-1 rounded-full">
                {id}
              </span>
            ))}
            {salesOptions.map((s) => {
              const sid = String(s.id);
              const checked = (form.sales_ids ?? []).includes(sid);
              return (
                <label
                  key={sid}
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border cursor-pointer ${
                    checked ? "border-[#c9a84c] bg-[#fffcf5] text-[#9C6402]" : "border-gray-200 text-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSalesId(sid)}
                    disabled={isSubmitting}
                    className="sr-only"
                  />
                  {s.name || sid}
                </label>
              );
            })}
          </div>
        </div>

        <ModalActions
          primaryLabel="حفظ التعديلات"
          primaryType="submit"
          onSecondary={onClose}
          isSubmitting={isSubmitting}
        />
      </form>
    </AppModal>
  );
}
