import { useState, useEffect } from "react";
import AppModal, { ModalField, ModalActions, modalInputClass } from "../ui/AppModal";
import { fetchCustomersList } from "../../services/customerService.js";
import { requestAddPassenger } from "../../services/tripService.js";
import { formatApiTime, mapOperationDays } from "../../lib/tripFormUtils.js";

const DAY_OPTIONS = [
  { id: "sat", label: "السبت" },
  { id: "sun", label: "الأحد" },
  { id: "mon", label: "الاثنين" },
  { id: "tue", label: "الثلاثاء" },
  { id: "wed", label: "الأربعاء" },
  { id: "thu", label: "الخميس" },
  { id: "fri", label: "الجمعة" },
];

export default function TripPassengerModal({ isOpen, onClose, tripId, defaultDays = [], onSuccess }) {
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [customerId, setCustomerId] = useState("");
  const [fullName, setFullName] = useState("");
  const [nationality, setNationality] = useState("سعودي");
  const [gender, setGender] = useState("ذكر");
  const [activeDays, setActiveDays] = useState(defaultDays.length ? defaultDays : ["sat", "sun", "mon"]);
  const [departureTime, setDepartureTime] = useState("07:00");
  const [returnTime, setReturnTime] = useState("17:00");
  const [startLat, setStartLat] = useState("");
  const [startLng, setStartLng] = useState("");
  const [endLat, setEndLat] = useState("");
  const [endLng, setEndLng] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setLoadingCustomers(true);
    fetchCustomersList()
      .then(setCustomers)
      .catch(() => setCustomers([]))
      .finally(() => setLoadingCustomers(false));
  }, [isOpen]);

  const toggleDay = (id) => {
    setActiveDays((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  };

  const handleCustomerChange = (id) => {
    setCustomerId(id);
    const c = customers.find((x) => String(x.id) === String(id));
    if (c) {
      setFullName(c.name ?? "");
      setNationality(c.nationality ?? "سعودي");
      setGender(c.gender ?? "ذكر");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      setError("اختر العميل من القائمة");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await requestAddPassenger({
        trip_id: Number(tripId),
        customer_id: Number(customerId),
        full_name: fullName,
        nationality,
        gender,
        operation_days: mapOperationDays(activeDays),
        start_lat: startLat ? Number(startLat) : undefined,
        start_lng: startLng ? Number(startLng) : undefined,
        end_lat: endLat ? Number(endLat) : undefined,
        end_lng: endLng ? Number(endLng) : undefined,
        departure_time: formatApiTime(departureTime),
        return_time: formatApiTime(returnTime),
        notes: notes || undefined,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "فشل إضافة الراكب");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title="إضافة راكب للرحلة"
      subtitle={`رحلة #${tripId}`}
      isSubmitting={submitting}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ModalField label="العميل" required>
          <select
            value={customerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className={`${modalInputClass} appearance-none`}
            disabled={submitting || loadingCustomers}
            required
          >
            <option value="">{loadingCustomers ? "جاري التحميل..." : "اختر العميل"}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.phone || ""}
              </option>
            ))}
          </select>
        </ModalField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ModalField label="الاسم">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={modalInputClass} disabled={submitting} />
          </ModalField>
          <ModalField label="الجنسية">
            <input value={nationality} onChange={(e) => setNationality(e.target.value)} className={modalInputClass} disabled={submitting} />
          </ModalField>
        </div>

        <ModalField label="الجنس">
          <select value={gender} onChange={(e) => setGender(e.target.value)} className={`${modalInputClass} appearance-none`} disabled={submitting}>
            <option value="ذكر">ذكر</option>
            <option value="أنثى">أنثى</option>
          </select>
        </ModalField>

        <div>
          <p className="text-xs text-gray-500 mb-2 text-right">أيام التشغيل</p>
          <div className="flex flex-wrap gap-1.5 justify-end">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDay(d.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] border transition-colors ${
                  activeDays.includes(d.id)
                    ? "bg-[#c9a84c] border-[#c9a84c] text-white"
                    : "border-gray-200 text-gray-600 hover:border-[#c9a84c]"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ModalField label="وقت الانطلاق">
            <input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} className={modalInputClass} disabled={submitting} />
          </ModalField>
          <ModalField label="وقت العودة">
            <input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className={modalInputClass} disabled={submitting} />
          </ModalField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ModalField label="خط العرض — انطلاق">
            <input type="number" step="any" value={startLat} onChange={(e) => setStartLat(e.target.value)} className={modalInputClass} dir="ltr" disabled={submitting} />
          </ModalField>
          <ModalField label="خط الطول — انطلاق">
            <input type="number" step="any" value={startLng} onChange={(e) => setStartLng(e.target.value)} className={modalInputClass} dir="ltr" disabled={submitting} />
          </ModalField>
          <ModalField label="خط العرض — وصول">
            <input type="number" step="any" value={endLat} onChange={(e) => setEndLat(e.target.value)} className={modalInputClass} dir="ltr" disabled={submitting} />
          </ModalField>
          <ModalField label="خط الطول — وصول">
            <input type="number" step="any" value={endLng} onChange={(e) => setEndLng(e.target.value)} className={modalInputClass} dir="ltr" disabled={submitting} />
          </ModalField>
        </div>

        <ModalField label="ملاحظات">
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${modalInputClass} resize-none`} disabled={submitting} />
        </ModalField>

        {error && (
          <p className="text-xs text-red-600 text-right bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
        )}

        <ModalActions
          primaryLabel="إرسال طلب الإضافة"
          onPrimary={() => {}}
          primaryType="submit"
          onSecondary={onClose}
          isSubmitting={submitting}
        />
      </form>
    </AppModal>
  );
}
