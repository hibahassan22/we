import { useState, useEffect, useRef } from "react";
import { useToast } from "../lib/toast";
import AppModal, { ModalField, ModalActions, modalInputClass } from "./ui/AppModal";
import {
  buildOfferedTripEditForm,
  updateOfferedTrip,
  OFFERED_STATUS_OPTIONS,
} from "../services/tripService.js";
import { fetchSalesList } from "../services/salesService.js";

const API_BASE = "/api";

export default function EditOfferedTripModal({ isOpen, onClose, trip, onSuccess, title }) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(buildOfferedTripEditForm(null));
  const [salesOptions, setSalesOptions] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const originalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    Promise.all([
      fetchSalesList().catch(() => []),
      fetch(`${API_BASE}/drivers`, { headers: { Accept: "application/json" } })
        .then((r) => r.json())
        .then((d) => (Array.isArray(d) ? d : d?.data ?? []))
        .catch(() => []),
    ]).then(([sales, driverList]) => {
      setSalesOptions(Array.isArray(sales) ? sales : []);
      setDrivers(Array.isArray(driverList) ? driverList : []);
    });
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && trip) {
      const initial = buildOfferedTripEditForm(trip);
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
      const result = await updateOfferedTrip(trip.id, form, originalRef.current);
      toast.success(result?.message || "تم تعديل الرحلة بنجاح");
      onSuccess?.(result);
      onClose();
    } catch (err) {
      toast.error(err.message || "حدث خطأ أثناء التعديل");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sectionTitle = "text-xs font-bold text-[#c9a84c] mb-3";

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={title ?? `تعديل الرحلة #${trip.id}`}
      isSubmitting={isSubmitting}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5" dir="rtl">
        <div>
          <h3 className={sectionTitle}>بيانات الرحلة</h3>
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
            <ModalField label="الحالة">
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className={modalInputClass}
                disabled={isSubmitting}
              >
                {OFFERED_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </ModalField>
            <ModalField label="السائق">
              <select
                name="driver_id"
                value={form.driver_id}
                onChange={handleChange}
                className={modalInputClass}
                disabled={isSubmitting}
              >
                <option value="">بدون سائق</option>
                {drivers.map((d) => {
                  const id = String(d.id);
                  const name = [d.name, d.last_name].filter(Boolean).join(" ").trim() || id;
                  return (
                    <option key={id} value={id}>{name}</option>
                  );
                })}
                {form.driver_id && !drivers.some((d) => String(d.id) === String(form.driver_id)) && (
                  <option value={form.driver_id}>
                    {trip.driver?.name ?? form.driver_id}
                  </option>
                )}
              </select>
            </ModalField>
            <ModalField label="من">
              <input name="from" value={form.from} onChange={handleChange} className={modalInputClass} disabled={isSubmitting} />
            </ModalField>
            <ModalField label="إلى">
              <input name="to" value={form.to} onChange={handleChange} className={modalInputClass} disabled={isSubmitting} />
            </ModalField>
            <ModalField label="نوع الرحلة">
              <input name="trip_type" value={form.trip_type} onChange={handleChange} className={modalInputClass} disabled={isSubmitting} />
            </ModalField>
            <ModalField label="نوع المسار">
              <input name="route_type" value={form.route_type} onChange={handleChange} className={modalInputClass} disabled={isSubmitting} />
            </ModalField>
            <ModalField label="اتجاه المسار">
              <input name="route_direction" value={form.route_direction} onChange={handleChange} className={modalInputClass} disabled={isSubmitting} />
            </ModalField>
            <ModalField label="نوع الاشتراك">
              <input name="subscription_type" value={form.subscription_type} onChange={handleChange} className={modalInputClass} disabled={isSubmitting} />
            </ModalField>
            <ModalField label="عدد الركاب">
              <input
                name="passengers_count"
                type="number"
                value={form.passengers_count}
                onChange={handleChange}
                className={modalInputClass}
                disabled={isSubmitting}
              />
            </ModalField>
            <ModalField label="أيام التشغيل" hint="افصل بين الأيام بفاصلة">
              <input
                name="operation_days_text"
                value={form.operation_days_text}
                onChange={handleChange}
                className={modalInputClass}
                disabled={isSubmitting}
                placeholder="السبت، الأحد، الاثنين"
              />
            </ModalField>
          </div>
        </div>

        <div>
          <h3 className={sectionTitle}>المواعيد والمالية</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ModalField label="وقت الانطلاق">
              <input name="departure_time" type="time" value={form.departure_time} onChange={handleChange} className={modalInputClass} disabled={isSubmitting} />
            </ModalField>
            <ModalField label="وقت العودة">
              <input name="return_time" type="time" value={form.return_time} onChange={handleChange} className={modalInputClass} disabled={isSubmitting} />
            </ModalField>
            <ModalField label="السعر الكلي">
              <input name="total_price" type="number" value={form.total_price} onChange={handleChange} className={modalInputClass} disabled={isSubmitting} />
            </ModalField>
            <ModalField label="عمولتنا">
              <input name="our_commission" type="number" value={form.our_commission} onChange={handleChange} className={modalInputClass} disabled={isSubmitting} />
            </ModalField>
          </div>
        </div>

        <div>
          <ModalField label="ملاحظات الرحلة">
            <textarea
              name="trip_notes"
              rows={2}
              value={form.trip_notes}
              onChange={handleChange}
              className={`${modalInputClass} resize-none`}
              disabled={isSubmitting}
            />
          </ModalField>
        </div>

        <div>
          <h3 className={sectionTitle}>موظفو المبيعات</h3>
          <div className="flex flex-wrap gap-2">
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
