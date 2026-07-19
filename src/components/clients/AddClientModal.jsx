import { useState, useMemo, useEffect } from "react";
import { useToast } from "../../lib/toast";
import AppModal, { ModalField, ModalActions, modalInputClass } from "../ui/AppModal";
import { createCustomer } from "../../services/customerService";
import {
  sanitizePhoneInputFiveStart,
  validatePhoneTenDigitsFiveStart,
} from "../../lib/phoneValidation";
import { fetchCities, NATIONALITY_OPTIONS } from "../../services/cityService.js";

const EMPTY_FORM = { name: "", phone: "", address: "", gender: "", nationality: "" };

export default function AddClientModal({ isOpen, onClose, onSuccess }) {
  const toast = useToast();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const phoneValidation = useMemo(
    () => validatePhoneTenDigitsFiveStart(formData.phone),
    [formData.phone]
  );
  const phoneInvalid = formData.phone.length > 0 && !phoneValidation.valid;

  useEffect(() => {
    if (!isOpen) return;
    setFormData(EMPTY_FORM);
    const ctrl = new AbortController();
    setCitiesLoading(true);
    fetchCities(ctrl.signal)
      .then(setCities)
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false));
    return () => ctrl.abort();
  }, [isOpen]);

  const handleClose = () => {
    if (saving) return;
    setFormData(EMPTY_FORM);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("الرجاء إدخال الاسم");
      return;
    }
    if (!phoneValidation.valid) {
      toast.error(phoneValidation.message || "أدخل رقم هاتف صحيح (10 أرقام تبدأ بـ 5)");
      return;
    }
    if (!formData.gender) {
      toast.error("اختر الجنس");
      return;
    }
    setSaving(true);
    try {
      const created = await createCustomer({
        name: formData.name.trim(),
        phone: phoneValidation.normalized,
        address: formData.address.trim(),
        gender: formData.gender,
        nationality: formData.nationality,
      });
      toast.success("تم إضافة العميل بنجاح");
      setFormData(EMPTY_FORM);
      onSuccess?.(created);
      onClose();
    } catch (err) {
      toast.error(err.message || "حدث خطأ أثناء إضافة العميل");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal isOpen={isOpen} onClose={handleClose} title="إضافة عميل جديد" isSubmitting={saving} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <ModalField label="الاسم بالكامل" required>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={modalInputClass}
            disabled={saving}
          />
        </ModalField>
        <ModalField label="رقم الهاتف" required>
          <div className="space-y-1">
            <div className="flex gap-2" dir="ltr">
              <span className="shrink-0 flex items-center px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 font-medium">
                +966
              </span>
              <input
                type="tel"
                inputMode="numeric"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: sanitizePhoneInputFiveStart(e.target.value) })
                }
                placeholder="5xxxxxxxxx"
                maxLength={10}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm focus:outline-none bg-white text-left placeholder-gray-300 disabled:opacity-60 ${
                  phoneInvalid ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-[#c9a84c]"
                }`}
                dir="ltr"
                disabled={saving}
              />
            </div>
            <p className={`text-[11px] text-right ${phoneInvalid ? "text-red-600" : "text-gray-400"}`}>
              {phoneInvalid
                ? phoneValidation.message
                : formData.phone.length > 0
                  ? "10 أرقام تبدأ بـ 5 — مثال: 5xxxxxxxxx"
                  : "كود السعودية +966 — 10 أرقام تبدأ بـ 5"}
            </p>
          </div>
        </ModalField>
        <ModalField label="المدينة">
          <select
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className={`${modalInputClass} appearance-none`}
            disabled={saving || citiesLoading}
          >
            <option value="" disabled hidden>
              {citiesLoading ? "جاري تحميل المدن..." : "اختر المدينة"}
            </option>
            {formData.address && !cities.some((c) => c.name === formData.address) && (
              <option value={formData.address}>{formData.address}</option>
            )}
            {cities.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </ModalField>
        <ModalField label="الجنسية">
          <select
            value={formData.nationality}
            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
            className={`${modalInputClass} appearance-none`}
            disabled={saving}
          >
            <option value="" disabled hidden>
              اختر الجنسية
            </option>
            {formData.nationality && !NATIONALITY_OPTIONS.includes(formData.nationality) && (
              <option value={formData.nationality}>{formData.nationality}</option>
            )}
            {NATIONALITY_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </ModalField>
        <ModalField label="الجنس" required>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className={`${modalInputClass} appearance-none`}
            disabled={saving}
            required
          >
            <option value="" disabled hidden>
              اختر الجنس
            </option>
            <option value="ذكر">ذكر</option>
            <option value="أنثى">أنثى</option>
            <option value="طفل">طفل</option>
          </select>
        </ModalField>
        <ModalActions
          primaryLabel="إضافة عميل"
          onPrimary={() => {}}
          primaryType="submit"
          onSecondary={handleClose}
          isSubmitting={saving}
        />
      </form>
    </AppModal>
  );
}
