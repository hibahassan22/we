import { useEffect, useRef, useState } from "react";
import { Clock, CheckCircle2, XCircle, PauseCircle, Ban, Tag } from "lucide-react";
import { useToast } from "../../lib/toast";
import AppModal, { ModalField, ModalActions, modalInputClass } from "../ui/AppModal";
import {
  TRIP_STATUS_OPTIONS,
  OFFERED_STATUS_OPTIONS,
  updateTripStatus,
  updateOfferedTrip,
  buildOfferedTripEditForm,
  resolveTripEditStatus,
} from "../../services/tripService.js";

const STATUS_ICONS = {
  "قيد التنفيذ": { icon: Clock, color: "text-blue-600" },
  تم: { icon: CheckCircle2, color: "text-emerald-500" },
  ملغية: { icon: XCircle, color: "text-red-500" },
  معلقة: { icon: PauseCircle, color: "text-amber-600" },
  موقوفة: { icon: Ban, color: "text-gray-500" },
  معروضة: { icon: Tag, color: "text-purple-500" },
};

const OFFERED_STATUS_ICONS = {
  pending: STATUS_ICONS.معلقة,
  offered: STATUS_ICONS.معروضة,
  completed: STATUS_ICONS.تم,
  cancelled: STATUS_ICONS.ملغية,
};

/**
 * TripChangeStatusModal
 * Props:
 *   isOpen       {boolean}
 *   onClose      {() => void}
 *   trip         {Object}
 *   onSuccess    {(updatedTrip) => void}
 */
export default function TripChangeStatusModal({ isOpen, onClose, trip, onSuccess }) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selected, setSelected] = useState("قيد التنفيذ");
  const [reason, setReason] = useState("");
  const originalRef = useRef(null);

  const isOfferedTrip = Boolean(trip?._supportsAddPayment);

  useEffect(() => {
    if (!isOpen || !trip) return;
    originalRef.current = buildOfferedTripEditForm(trip);

    if (isOfferedTrip) {
      setSelected(resolveTripEditStatus(trip));
    } else {
      const current = trip.trip_status ?? trip.status ?? "قيد التنفيذ";
      const known = TRIP_STATUS_OPTIONS.some((o) => o.value === current);
      setSelected(known ? current : "قيد التنفيذ");
    }
    setReason("");
  }, [isOpen, trip, isOfferedTrip]);

  const handleSubmit = async () => {
    if (!trip?.id) return;
    setIsSubmitting(true);
    try {
      if (isOfferedTrip) {
        const result = await updateOfferedTrip(
          trip.id,
          { ...originalRef.current, status: selected },
          originalRef.current,
        );
        toast.success(result?.message || "تم تغيير حالة الرحلة بنجاح");
        onSuccess?.(result?.trip ?? result);
      } else {
        const updated = await updateTripStatus(trip, selected, reason);
        toast.success("تم تغيير حالة الرحلة بنجاح");
        onSuccess?.(updated);
      }
      onClose();
    } catch (err) {
      toast.error(err.message || "فشل تغيير الحالة");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!trip) return null;

  const statusOptions = isOfferedTrip ? OFFERED_STATUS_OPTIONS : TRIP_STATUS_OPTIONS;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="تغيير حالة الرحلة"
      subtitle="اختر الحالة الجديدة وأدخل سبب التغيير"
      isSubmitting={isSubmitting}
      size="md"
    >
      <div className="space-y-2 mb-4">
        {statusOptions.map(({ value, label }) => {
          const meta = isOfferedTrip
            ? (OFFERED_STATUS_ICONS[value] ?? STATUS_ICONS["قيد التنفيذ"])
            : (STATUS_ICONS[value] ?? STATUS_ICONS["قيد التنفيذ"]);
          const Icon = meta.icon;
          const isActive = selected === value;
          return (
            <button
              key={value}
              type="button"
              disabled={isSubmitting}
              onClick={() => setSelected(value)}
              className={`w-full flex items-center gap-3 border rounded-xl p-3 text-right transition-colors disabled:opacity-50 ${
                isActive ? "border-[#c9a84c] bg-[#fffcf5]" : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  isActive ? "border-[#4a4746]" : "border-gray-300"
                }`}
              >
                {isActive && <span className="w-2 h-2 bg-[#4a4746] rounded-full" />}
              </span>
              <Icon className={`w-5 h-5 ${meta.color}`} />
              <span className="text-sm font-medium text-gray-700">{label}</span>
            </button>
          );
        })}
      </div>
      {!isOfferedTrip && (
        <ModalField label="سبب التغيير">
          <textarea
            rows={3}
            placeholder="سبب التغيير (اختياري)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={`${modalInputClass} resize-none`}
            disabled={isSubmitting}
          />
        </ModalField>
      )}
      <div className="mt-5">
        <ModalActions
          primaryLabel="تأكيد التغيير"
          onPrimary={handleSubmit}
          onSecondary={onClose}
          isSubmitting={isSubmitting}
        />
      </div>
    </AppModal>
  );
}
