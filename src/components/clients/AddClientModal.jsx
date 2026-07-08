import { useState, useMemo } from "react";
import { useToast } from "../../lib/toast";
import AppModal, { ModalField, ModalActions, modalInputClass } from "../ui/AppModal";
import { createCustomer } from "../../services/customerService";
import { sanitizePhoneInput, validatePhoneTenDigits } from "../../lib/phoneValidation";

const EMPTY_FORM = { name: "", phone: "", address: "", gender: "أنثى", nationality: "سعودية" };

export default function AddClientModal({ isOpen, onClose, onSuccess }) {
  const toast = useToast();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const phoneValidation = useMemo(() => validatePhoneTenDigits(formData.phone), [formData.phone]);
  const phoneInvalid = formData.phone.length > 0 && !phoneValidation.valid;

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
      toast.error(phoneValidation.message || "أدخل رقم هاتف صحيح (10 أرقام)");
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
                onChange={(e) => setFormData({ ...formData, phone: sanitizePhoneInput(e.target.value) })}
                placeholder="05xxxxxxxx"
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
                  ? "10 أرقام — مثال: 05xxxxxxxx"
                  : "كود السعودية +966 — 10 أرقام"}
            </p>
          </div>
        </ModalField>
        <ModalField label="العنوان">
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className={modalInputClass}
            disabled={saving}
          />
        </ModalField>
        <ModalField label="الجنسية">
          <input
            type="text"
            value={formData.nationality}
            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
            className={modalInputClass}
            disabled={saving}
          />
        </ModalField>
        <ModalField label="النوع">
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className={`${modalInputClass} appearance-none`}
            disabled={saving}
          >
            <option value="أنثى">أنثى</option>
            <option value="ذكر">ذكر</option>
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
