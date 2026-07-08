import { useState, useEffect, useCallback, useRef } from "react";
import { Upload } from "lucide-react";
import { toast } from "../lib/toast";
import AppModal, { ModalField, modalInputClass } from "./ui/AppModal";
import { addTripPayment } from "../services/tripService.js";

const createEmptyForm = (totalPrice = "") => ({
  total_price: totalPrice,
  amount_paid: "",
  transfer_method: "تحويل بنكي",
  account_number: "",
  recipient_account: "",
  commission_transfer_date: "",
  payment_note: "",
  transfer_image: null,
});

/**
 * AddPaymentModal — إضافة دفعة لرحلة من سجل الرحلات
 */
export default function AddPaymentModal({ isOpen, onClose, tripId, tripTotalPrice, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(createEmptyForm);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setFormData(createEmptyForm(tripTotalPrice != null && tripTotalPrice !== "" ? String(tripTotalPrice) : ""));
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, tripId, tripTotalPrice]);

  const set = (key, val) => setFormData((p) => ({ ...p, [key]: val }));

  const handleClose = useCallback(() => {
    setFormData(createEmptyForm());
    onClose();
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tripId) {
      toast.error("معرّف الرحلة غير متوفر");
      return;
    }
    if (!formData.amount_paid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const json = await addTripPayment(tripId, formData);

      toast.success(json.message || "تمت إضافة الدفعة بنجاح");
      onSuccess?.(json, {
        amount_paid: formData.amount_paid,
        transfer_method: formData.transfer_method,
        account_number: formData.account_number,
        recipient_account: formData.recipient_account,
        commission_transfer_date: formData.commission_transfer_date,
        payment_note: formData.payment_note,
        transfer_image: formData.transfer_image,
      });
      setFormData(createEmptyForm());
      onClose();
    } catch (err) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={handleClose}
      title="إضافة دفعة جديدة"
      isSubmitting={isSubmitting}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ModalField label="السعر الكلي للرحلة">
          <input
            type="number"
            placeholder="السعر الكلي"
            value={formData.total_price}
            onChange={(e) => set("total_price", e.target.value)}
            className={modalInputClass}
            disabled={isSubmitting}
          />
        </ModalField>

        <ModalField label="المبلغ المدفوع" required>
          <input
            type="number"
            required
            placeholder="ادخل المبلغ"
            value={formData.amount_paid}
            onChange={(e) => set("amount_paid", e.target.value)}
            className={modalInputClass}
            disabled={isSubmitting}
          />
        </ModalField>

        <ModalField label="طريقة التحويل">
          <select
            value={formData.transfer_method}
            onChange={(e) => set("transfer_method", e.target.value)}
            className={modalInputClass}
            disabled={isSubmitting}
          >
            <option value="تحويل بنكي">تحويل بنكي</option>
            <option value="كاش">كاش</option>
            <option value="محفظة إلكترونية">محفظة إلكترونية</option>
          </select>
        </ModalField>

        <div className="grid grid-cols-2 gap-3">
          <ModalField label="رقم الحساب">
            <input
              type="text"
              placeholder="123456"
              value={formData.account_number}
              onChange={(e) => set("account_number", e.target.value)}
              className={modalInputClass}
              disabled={isSubmitting}
            />
          </ModalField>
          <ModalField label="حساب المستلم">
            <input
              type="text"
              placeholder="78910111"
              value={formData.recipient_account}
              onChange={(e) => set("recipient_account", e.target.value)}
              className={modalInputClass}
              disabled={isSubmitting}
            />
          </ModalField>
        </div>

        <ModalField label="تاريخ التحويل">
          <input
            type="date"
            value={formData.commission_transfer_date}
            onChange={(e) => set("commission_transfer_date", e.target.value)}
            className={modalInputClass}
            disabled={isSubmitting}
          />
        </ModalField>

        <ModalField label="صورة التحويل">
          <label className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors ${isSubmitting ? "opacity-50 pointer-events-none" : ""}`}>
            <Upload className="w-4 h-4 text-gray-400" />
            <span>{formData.transfer_image ? formData.transfer_image.name : "اختر الملف"}</span>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              disabled={isSubmitting}
              onChange={(e) => set("transfer_image", e.target.files[0])}
            />
          </label>
        </ModalField>

        <ModalField label="ملاحظة">
          <textarea
            rows={2}
            placeholder="أضف ملاحظة (اختياري)"
            value={formData.payment_note}
            onChange={(e) => set("payment_note", e.target.value)}
            className={`${modalInputClass} resize-none`}
            disabled={isSubmitting}
          />
        </ModalField>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[#4a4746] py-3 text-sm font-semibold text-white hover:bg-[#383534] active:scale-[0.99] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-1"
        >
          {isSubmitting ? "جاري الحفظ..." : "حفظ"}
        </button>
      </form>
    </AppModal>
  );
}
