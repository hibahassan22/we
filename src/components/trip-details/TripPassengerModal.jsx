import { useState, useEffect } from "react";
import AppModal, { ModalField, ModalActions, modalInputClass } from "../ui/AppModal";
import MapPickerModal, { MapPointButton } from "../ui/MapPickerModal";
import { fetchCustomersList } from "../../services/customerService.js";
import { requestAddPassenger } from "../../services/tripService.js";
import { formatApiTime, mapOperationDays } from "../../lib/tripFormUtils.js";
import { useToast } from "../../lib/toast";

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
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [mapTarget, setMapTarget] = useState(null);

  const [customerId, setCustomerId] = useState("");
  const [fullName, setFullName] = useState("");
  const [nationality, setNationality] = useState("سعودي");
  const [gender, setGender] = useState("ذكر");
  const [activeDays, setActiveDays] = useState(defaultDays.length ? defaultDays : ["sat", "sun", "mon"]);
  const [departureTime, setDepartureTime] = useState("07:00");
  const [returnTime, setReturnTime] = useState("17:00");
  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords, setToCoords] = useState(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setLoadingCustomers(true);
    setError(null);
    setMapTarget(null);
    setFromCoords(null);
    setToCoords(null);
    setCustomerId("");
    setFullName("");
    setActiveDays(defaultDays.length ? defaultDays : ["sat", "sun", "mon"]);
    fetchCustomersList()
      .then(setCustomers)
      .catch(() => setCustomers([]))
      .finally(() => setLoadingCustomers(false));
  }, [isOpen, defaultDays]);

  const toggleDay = (id) => {
    setActiveDays((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  };

  const handleCustomerChange = (id) => {
    setCustomerId(id);
    const c = customers.find((x) => String(x.id) === String(id));
    if (c) {
      setFullName(c.name ?? c.full_name ?? "");
      setNationality(c.nationality ?? "سعودي");
      setGender(c.gender === "female" ? "أنثى" : c.gender === "male" ? "ذكر" : (c.gender ?? "ذكر"));
    }
  };

  const handleMapConfirm = (coords) => {
    if (mapTarget === "from") setFromCoords(coords);
    if (mapTarget === "to") setToCoords(coords);
    setMapTarget(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      setError("اختر العميل من القائمة");
      return;
    }
    if (!fromCoords || !toCoords) {
      setError("حدّد نقطة الانطلاق ونقطة الوصول من الخريطة");
      return;
    }
    if (!activeDays.length) {
      setError("اختر يوم تشغيل واحداً على الأقل");
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
        start_lat: fromCoords.lat,
        start_lng: fromCoords.lng,
        end_lat: toCoords.lat,
        end_lng: toCoords.lng,
        departure_time: formatApiTime(departureTime),
        return_time: formatApiTime(returnTime),
        notes: notes || undefined,
      });
      toast.success("تم إرسال طلب إضافة الراكب لمركز الموافقات");
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || "فشل إرسال طلب الإضافة");
    } finally {
      setSubmitting(false);
    }
  };

  const mapTitle = mapTarget === "from" ? "تحديد نقطة الانطلاق" : "تحديد نقطة الوصول";

  return (
    <>
      <AppModal
        isOpen={isOpen}
        onClose={onClose}
        title="إضافة راكب للرحلة"
        subtitle={`رحلة #${tripId} — يُرسل الطلب لمركز الموافقات`}
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
                  {c.name ?? c.full_name} — {c.phone || ""}
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

          <div>
            <p className="text-xs text-gray-500 mb-2 text-right">تحديد الموقع من الخريطة</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <MapPointButton
                label="نقطة الانطلاق"
                hasCoords={fromCoords}
                onClick={() => setMapTarget("from")}
              />
              <MapPointButton
                label="نقطة الوصول"
                hasCoords={toCoords}
                onClick={() => setMapTarget("to")}
              />
            </div>
          </div>

          <ModalField label="ملاحظات">
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${modalInputClass} resize-none`} disabled={submitting} />
          </ModalField>

          {error && (
            <p className="text-xs text-red-600 text-right bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
          )}

          <ModalActions
            primaryLabel="إرسال لمركز الموافقات"
            onPrimary={() => {}}
            primaryType="submit"
            onSecondary={onClose}
            isSubmitting={submitting}
          />
        </form>
      </AppModal>

      {mapTarget && (
        <MapPickerModal
          title={mapTitle}
          onClose={() => setMapTarget(null)}
          onConfirm={handleMapConfirm}
        />
      )}
    </>
  );
}
