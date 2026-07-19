import { useEffect, useState } from "react";
import { Wallet, Landmark, Users } from "lucide-react";
import { useToast } from "../../lib/toast";
import AppModal, { ModalField, modalInputClass } from "../ui/AppModal";
import { handleTripRefund } from "../../services/refundService";

function fmtMoney(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString("ar-SA") : String(v);
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-gray-800 text-left break-words">{value ?? "—"}</span>
      <span className="text-gray-500 shrink-0">{label}</span>
    </div>
  );
}

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
    key: "إرجاع للمحفظة",
    label: "إرجاع للمحفظة",
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

export default function RefundHandleModal({ isOpen, onClose, refund, onSuccess }) {
  const toast = useToast();
  const [step, setStep] = useState("details"); // details | method | process
  const [method, setMethod] = useState(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(null);

  useEffect(() => {
    if (isOpen && refund) {
      setStep("details");
      setMethod(null);
      setAmount(String(refund.proposedAmount ?? ""));
    }
  }, [isOpen, refund]);

  if (!refund) return null;

  const tripId = refund.tripId ?? refund.tripNumber;
  const salesNames = (refund.sales ?? []).map((s) => s.name).filter(Boolean).join("، ");

  const reject = async () => {
    setSubmitting("تم الرفض");
    try {
      await handleTripRefund(tripId, { confirmedRefundAmount: 0, status: "تم الرفض" });
      toast.success("تم رفض طلب الاسترداد");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message || "حدث خطأ أثناء المعالجة");
    } finally {
      setSubmitting(null);
    }
  };

  const confirm = async () => {
    const confirmed = Number(amount);
    if (!Number.isFinite(confirmed) || confirmed < 0) {
      toast.error("أدخل مبلغ الاسترداد المؤكد");
      return;
    }
    setSubmitting("تم القبول");
    try {
      await handleTripRefund(tripId, {
        confirmedRefundAmount: confirmed,
        status: "تم القبول",
        refundMethod: method,
      });
      toast.success("تم قبول طلب الاسترداد");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message || "حدث خطأ أثناء المعالجة");
    } finally {
      setSubmitting(null);
    }
  };

  const subtitle =
    step === "method"
      ? "اختر طريقة الاسترداد"
      : step === "process"
        ? method
        : `رحلة #${tripId}`;

  let footer = null;
  if (step === "details") {
    footer = (
      <div className="grid grid-cols-2 gap-3 w-full">
        <button
          type="button"
          disabled={!!submitting}
          onClick={reject}
          className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {submitting === "تم الرفض" ? "جارٍ الرفض..." : "رفض الطلب"}
        </button>
        <button
          type="button"
          disabled={!!submitting}
          onClick={() => setStep("method")}
          className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          موافق
        </button>
      </div>
    );
  } else if (step === "method") {
    footer = (
      <button
        type="button"
        onClick={() => setStep("details")}
        className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
      >
        رجوع
      </button>
    );
  } else {
    footer = (
      <div className="grid grid-cols-3 gap-3 w-full">
        <button
          type="button"
          disabled={!!submitting}
          onClick={() => setStep("method")}
          className="py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          رجوع
        </button>
        <button
          type="button"
          disabled={!!submitting}
          onClick={confirm}
          className="col-span-2 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
        >
          {submitting === "تم القبول" ? "جارٍ المعالجة..." : "تم"}
        </button>
      </div>
    );
  }

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="معالجة طلب استرداد"
      subtitle={subtitle}
      isSubmitting={!!submitting}
      size="lg"
      footer={footer}
    >
      {step === "details" && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
            <InfoRow label="السائق" value={refund.driverName} />
            <InfoRow label="هاتف السائق" value={refund.driverNumber} />
            <InfoRow
              label="المسار"
              value={[refund.from, refund.to].filter(Boolean).join(" → ")}
            />
            <InfoRow label="المبلغ المدفوع" value={`${fmtMoney(refund.amountPaid)} ر.س`} />
            <InfoRow label="إجمالي الرحلة" value={`${fmtMoney(refund.totalPrice)} ر.س`} />
            <InfoRow label="المبلغ المقترح" value={`${fmtMoney(refund.proposedAmount)} ر.س`} />
            {salesNames && <InfoRow label="المبيعات" value={salesNames} />}
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 text-right mb-1">سبب الاسترداد</p>
            <p className="text-sm text-gray-700 text-right leading-relaxed">{refund.reason || "—"}</p>
          </div>
        </div>
      )}

      {step === "method" && (
        <div className="space-y-3">
          {REFUND_METHODS.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => {
                  setMethod(m.key);
                  setStep("process");
                }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-[#c9a84c] hover:bg-amber-50/40 transition-colors text-right"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${m.bg}`}>
                  <Icon className={`w-5 h-5 ${m.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{m.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
                </div>
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            );
          })}
        </div>
      )}

      {step === "process" && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-gray-800 font-semibold">{fmtMoney(refund.totalPrice)} ر.س</span>
              <span className="text-gray-500 shrink-0">سعر الرحلة</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm border-t border-gray-200 pt-2.5">
              <span className="text-gray-800">{method}</span>
              <span className="text-gray-500 shrink-0">طريقة الاسترداد</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 text-right mb-3">معالجة استرداد</p>
            <ModalField label="المبلغ الذي سيتم معالجته (ر.س)">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="ادخل المبلغ"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={modalInputClass}
                disabled={!!submitting}
                dir="ltr"
                autoFocus
              />
            </ModalField>
          </div>
        </div>
      )}
    </AppModal>
  );
}
