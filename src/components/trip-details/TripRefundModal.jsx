import { useEffect, useState } from "react";
import { Wallet, Landmark, Users } from "lucide-react";
import { useToast } from "../../lib/toast";
import AppModal, { ModalField, ModalActions, modalInputClass } from "../ui/AppModal";
import { createTripRefundRequest } from "../../services/refundService";

const REFUND_METHODS = [
  {
    key: "تحويل من حسابنا",
    label: "تحويل من حسابنا",
    desc: "استرداد المبلغ من حساب الشركة",
    icon: Landmark,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    key: "إرجاع إلى المحفظة",
    label: "إرجاع إلى المحفظة",
    desc: "إضافة المبلغ إلى محفظة العميل",
    icon: Wallet,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
  },
  {
    key: "تحويل من سائق آخر",
    label: "تحويل من سائق آخر",
    desc: "خصم المبلغ من رصيد سائق آخر",
    icon: Users,
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
];

function fmtMoney(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("ar-SA") : String(v);
}

/**
 * إنشاء طلب استرداد من التفاصيل المالية (أدمن) — POST /trip-refund/request
 */
export default function TripRefundModal({ isOpen, onClose, tripId, driverId, amountPaid, tripPrice, onSuccess }) {
  const toast = useToast();
  const [method, setMethod] = useState(null);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMethod(null);
      setAmount("");
      setNotes("");
    }
  }, [isOpen, tripId]);

  const handleSubmit = async () => {
    if (!driverId) {
      toast.error("لا يوجد سائق مرتبط بهذه الرحلة");
      return;
    }
    if (!method) {
      toast.error("اختر طريقة الاسترداد");
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("أدخل المبلغ المسترد");
      return;
    }
    const paid = Number(amountPaid);
    if (Number.isFinite(paid) && value > paid) {
      toast.error("المبلغ المسترد لا يمكن أن يتجاوز المبلغ المدفوع");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTripRefundRequest({
        tripId,
        driverId,
        proposedRefundAmount: value,
        refundMethod: method,
        refundReason: notes,
        bankTransferDetails: notes,
        notes,
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
      subtitle="اختر طريقة الاسترداد"
      isSubmitting={isSubmitting}
      size="md"
    >
      <div className="space-y-4">
        <div className="grid gap-2.5">
          {REFUND_METHODS.map((m) => {
            const Icon = m.icon;
            const active = method === m.key;
            return (
              <button
                key={m.key}
                type="button"
                disabled={isSubmitting}
                onClick={() => setMethod(m.key)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-colors text-right disabled:opacity-50 ${
                  active
                    ? "border-[#c9a84c] bg-amber-50/60 ring-1 ring-[#c9a84c]/30"
                    : "border-gray-200 hover:border-[#c9a84c] hover:bg-amber-50/40"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${m.bg}`}>
                  <Icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{m.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
                </div>
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    active ? "border-[#c9a84c] bg-[#c9a84c]" : "border-gray-300"
                  }`}
                >
                  {active && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {method && (
          <>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-800 font-semibold">{fmtMoney(tripPrice)} ر.س</span>
                <span className="text-gray-500 shrink-0">سعر الرحلة</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm border-t border-gray-200 pt-2.5">
                <span className="text-green-700 font-semibold">{fmtMoney(amountPaid)} ر.س</span>
                <span className="text-gray-500 shrink-0">المبلغ المدفوع</span>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 text-right mb-3">معالجة استرداد</p>
              <ModalField label="المبلغ المسترد (ر.س)" required>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="ادخل المبلغ المسترد"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={modalInputClass}
                  disabled={isSubmitting}
                  dir="ltr"
                  autoFocus
                />
              </ModalField>
              <ModalField label="ملاحظات" hint="اختياري">
                <textarea
                  rows={2}
                  placeholder="أضف ملاحظة (اختياري)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${modalInputClass} resize-none`}
                  disabled={isSubmitting}
                />
              </ModalField>
            </div>
          </>
        )}
      </div>

      <div className="mt-5">
        <ModalActions
          primaryLabel="تم"
          onPrimary={handleSubmit}
          onSecondary={onClose}
          isSubmitting={isSubmitting}
          primaryDisabled={!method || !amount}
        />
      </div>
    </AppModal>
  );
}
