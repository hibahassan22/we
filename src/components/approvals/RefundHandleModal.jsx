import { useEffect, useState } from "react";
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

export default function RefundHandleModal({ isOpen, onClose, refund, onSuccess }) {
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(null);

  useEffect(() => {
    if (isOpen && refund) {
      setAmount(String(refund.proposedAmount ?? ""));
    }
  }, [isOpen, refund]);

  if (!refund) return null;

  const tripId = refund.tripId ?? refund.tripNumber;

  const submit = async (status) => {
    const confirmed = Number(amount);
    if (status === "تم القبول" && (!Number.isFinite(confirmed) || confirmed < 0)) {
      toast.error("أدخل مبلغ الاسترداد المؤكد");
      return;
    }

    setSubmitting(status);
    try {
      await handleTripRefund(tripId, {
        confirmedRefundAmount: status === "تم الرفض" ? 0 : confirmed,
        status,
      });
      toast.success(status === "تم القبول" ? "تم قبول طلب الاسترداد" : "تم رفض طلب الاسترداد");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message || "حدث خطأ أثناء المعالجة");
    } finally {
      setSubmitting(null);
    }
  };

  const salesNames = (refund.sales ?? []).map((s) => s.name).filter(Boolean).join("، ");

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="معالجة طلب استرداد"
      subtitle={`رحلة #${tripId}`}
      isSubmitting={!!submitting}
      size="lg"
      footer={
        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            type="button"
            disabled={!!submitting}
            onClick={() => submit("تم الرفض")}
            className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {submitting === "تم الرفض" ? "جارٍ الرفض..." : "رفض الطلب"}
          </button>
          <button
            type="button"
            disabled={!!submitting}
            onClick={() => submit("تم القبول")}
            className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {submitting === "تم القبول" ? "جارٍ القبول..." : "قبول الطلب"}
          </button>
        </div>
      }
    >
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

        <ModalField label="المبلغ المؤكد للاسترداد (ر.س)">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="ادخل المبلغ المؤكد"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={modalInputClass}
            disabled={!!submitting}
            dir="ltr"
          />
        </ModalField>
      </div>
    </AppModal>
  );
}
