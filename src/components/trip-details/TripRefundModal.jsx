import { useEffect, useState } from "react";
import { useToast } from "../../lib/toast";
import AppModal, { ModalField, ModalActions, modalInputClass } from "../ui/AppModal";
import { createTripRefundRequest } from "../../services/refundService";

const REFUND_METHODS = ["تحويل بنكي", "نقدي", "محفظة إلكترونية"];

const emptyForm = () => ({
  amount: "",
  method: "",
  accountName: "",
  iban: "",
  bankTo: "",
  bankName: "",
  reason: "",
});

function fmtMoney(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("ar-SA") : String(v);
}

function buildBankDetails(form) {
  const parts = [
    form.accountName && `صاحب الحساب: ${form.accountName}`,
    form.iban && `IBAN ${form.iban.replace(/^IBAN\s*/i, "")}`,
    form.bankTo && `البنك المحول له: ${form.bankTo}`,
    form.bankName && `اسم البنك: ${form.bankName}`,
  ].filter(Boolean);
  return parts.join(" | ");
}

/**
 * إنشاء طلب استرداد من التفاصيل المالية (أدمن) — POST /trip-refund/request
 */
export default function TripRefundModal({ isOpen, onClose, tripId, driverId, amountPaid, onSuccess }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) setForm(emptyForm());
  }, [isOpen, tripId]);

  const isBank = form.method === "تحويل بنكي";

  const handleSubmit = async () => {
    if (!driverId) {
      toast.error("لا يوجد سائق مرتبط بهذه الرحلة");
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("أدخل مبلغ الاسترداد");
      return;
    }
    if (!form.method) {
      toast.error("اختر طريقة الاسترداد");
      return;
    }
    if (!form.reason.trim()) {
      toast.error("أدخل سبب الاسترداد");
      return;
    }
    if (isBank && !form.iban.trim() && !form.accountName.trim()) {
      toast.error("أدخل بيانات التحويل البنكي");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTripRefundRequest({
        tripId,
        driverId,
        proposedRefundAmount: amount,
        refundMethod: form.method,
        refundReason: form.reason.trim(),
        bankTransferDetails: isBank ? buildBankDetails(form) : form.method,
      });
      toast.success("تم إرسال طلب الاسترداد بنجاح");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message || "فشل طلب الاسترداد");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="معالجة طلب استرداد"
      subtitle="أدخل تفاصيل المبلغ المراد استرداده"
      isSubmitting={isSubmitting}
      size="md"
    >
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-right">
          <p className="text-xs font-bold text-amber-800 mb-0.5">ملاحظة مهمة</p>
          <p className="text-sm text-amber-900">
            المبلغ الإجمالي المدفوع: <span className="font-bold">{fmtMoney(amountPaid)}</span> ريال
          </p>
        </div>

        <ModalField label="المبلغ المسترد (ريال)">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="ادخل المبلغ"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className={modalInputClass}
            disabled={isSubmitting}
            dir="ltr"
          />
        </ModalField>

        <ModalField label="طريقة الاسترداد">
          <select
            value={form.method}
            onChange={(e) => setForm({ ...form, method: e.target.value })}
            className={modalInputClass}
            disabled={isSubmitting}
          >
            <option value="">اختر طريقة الاسترداد</option>
            {REFUND_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </ModalField>

        {isBank && (
          <>
            <ModalField label="بيانات التحويل البنكي">
              <input
                type="text"
                placeholder="اسم صاحب الحساب"
                value={form.accountName}
                onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                className={modalInputClass}
                disabled={isSubmitting}
              />
            </ModalField>
            <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
              <p className="text-xs font-semibold text-[#c9a84c] text-right">إضافة حساب بنكي</p>
              <input
                type="text"
                placeholder="رقم الآيبان"
                value={form.iban}
                onChange={(e) => setForm({ ...form, iban: e.target.value })}
                className={modalInputClass}
                disabled={isSubmitting}
                dir="ltr"
              />
              <input
                type="text"
                placeholder="البنك المحول له"
                value={form.bankTo}
                onChange={(e) => setForm({ ...form, bankTo: e.target.value })}
                className={modalInputClass}
                disabled={isSubmitting}
              />
              <input
                type="text"
                placeholder="اسم البنك"
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                className={modalInputClass}
                disabled={isSubmitting}
              />
            </div>
          </>
        )}

        <ModalField label="سبب الاسترداد">
          <textarea
            rows={3}
            placeholder="ادخل سبب الاسترداد أو أي ملاحظات إضافية"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className={`${modalInputClass} resize-none`}
            disabled={isSubmitting}
          />
        </ModalField>
      </div>

      <div className="mt-5">
        <ModalActions
          primaryLabel="معالجة الاسترداد"
          onPrimary={handleSubmit}
          onSecondary={onClose}
          isSubmitting={isSubmitting}
        />
      </div>
    </AppModal>
  );
}
