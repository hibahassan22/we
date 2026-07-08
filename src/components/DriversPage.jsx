import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useToast } from "../lib/toast";
import AppModal, { ModalField, ModalActions, modalInputClass, ConfirmModal } from "./ui/AppModal";
import DriverDetailsView from "./drivers/DriverDetailsView";
import AssignTripModal from "./AssignTripModal";
import { normalizeDriverMedia } from "../lib/driverMedia";
import { useDriverStatuses } from "../hooks/useDriverStatuses";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { updateDriverStatus, sendDriverNotification, statusButtonClass, isSameDriverStatus, normalizeDriverStatusFields, resolveDriverStatusId, getPauseStatusId, durationToStopUntil, fetchDriverById } from "../lib/driverStatuses";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { filterByGlobalSearch } from "../lib/searchUtils";
import { bannerImage } from "../lib/images.js";
import { useAuth } from "../hooks/useAuth.js";
import { createDriverViolation } from "../services/driverViolationsService.js";
import {
  sanitizePhoneInput,
  validatePhoneTenDigits,
  normalizeSaudiPhoneFromApi,
  validateEmail,
  sanitizeIbanInput,
  validateSaudiIban,
  SAUDI_IBAN_DIGITS,
} from "../lib/phoneValidation.js";

const BASE = "https://drivo1.elmoroj.com/api";
const DRIVER_ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const DRIVER_ID_LENGTH = 10;

const createDriverId = () => {
  const values = new Uint32Array(DRIVER_ID_LENGTH);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  } else {
    values.forEach((_, index) => {
      values[index] = Math.floor(Math.random() * DRIVER_ID_ALPHABET.length);
    });
  }

  return Array.from(values, value => DRIVER_ID_ALPHABET[value % DRIVER_ID_ALPHABET.length]).join("");
};

const createUniqueDriverId = (drivers = []) => {
  const usedIds = new Set(drivers.map(driver => String(driver.id)));
  let id = createDriverId();

  while (usedIds.has(id)) {
    id = createDriverId();
  }

  return id;
};

// ── Progress Bar ──────────────────────────────────────────────
const ProgressBar = ({ value }) => (
  <div className="flex items-center gap-1.5">
    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full bg-green-500" style={{ width: `${value}%` }} />
    </div>
    <span className="text-[10px] text-gray-500">{value}%</span>
  </div>
);

// ── Spinner ───────────────────────────────────────────────────
const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
  </div>
);

// ── Action Icons ──────────────────────────────────────────────
const ActionIcons = ({ onDelete, onEdit, onView, canDelete = true, canEdit = true }) => (
  <div className="flex items-center gap-1.5">
    {canDelete && (
    <button onClick={onDelete} className="p-1 text-red-400 hover:text-red-600" title="حذف">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
    </button>
    )}
    {canEdit && (
    <button onClick={onEdit} className="p-1 text-gray-400 hover:text-blue-600" title="تعديل">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
    </button>
    )}
    <button onClick={onView} className="p-1 text-gray-400 hover:text-gray-600" title="عرض">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
    </button>
  </div>
);

// ── Modals ────────────────────────────────────────────────────
const AlertModal = ({ isOpen, onClose, driverId, onSaved }) => {
  const toast = useToast();
  const [type, setType] = useState("تنبيه");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSend = async () => {
    if (!driverId || !msg.trim()) return;
    setLoading(true);
    try {
      await sendDriverNotification(driverId, type, msg.trim());
      toast.success("تم إرسال الإشعار بنجاح");
      setMsg("");
      onSaved?.();
      onClose();
    } catch (err) { toast.error(err.message || "فشل إرسال الإشعار"); }
    finally { setLoading(false); }
  };
  return (
    <AppModal isOpen={isOpen} onClose={onClose} title="إرسال إشعار / تنبيه" isSubmitting={loading} size="sm">
      <ModalField label="نوع الإشعار">
        <select value={type} onChange={e=>setType(e.target.value)} className={`${modalInputClass} text-right appearance-none`} disabled={loading}>
          <option>تنبيه</option><option>إنذار</option><option>رسالة عادية</option>
        </select>
      </ModalField>
      <ModalField label="الرسالة" required>
        <textarea rows={4} value={msg} onChange={e=>setMsg(e.target.value)} placeholder="اكتب رسالة التنبيه..." className={`${modalInputClass} resize-none`} dir="rtl" disabled={loading}/>
      </ModalField>
      <ModalActions primaryLabel="إرسال الإشعار" onPrimary={handleSend} onSecondary={onClose} isSubmitting={loading} primaryDisabled={!msg.trim()} />
    </AppModal>
  );
};

const PauseModal = ({ isOpen, onClose, driverId, onSaved, statusId, pauseStatusId, salesId }) => {
  const toast = useToast();
  const [duration, setDuration] = useState("24 ساعة");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDuration("24 ساعة");
      setReason("");
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!driverId || statusId == null) return;
    if (!reason.trim()) {
      toast.error("يرجى إدخال سبب الإيقاف");
      return;
    }
    setLoading(true);
    try {
      const stopUntil = durationToStopUntil(duration);
      const result = await updateDriverStatus(driverId, statusId, {
        pauseStatusId: pauseStatusId ?? statusId,
        stopUntil,
        stopReason: reason.trim(),
      });
      try {
        await createDriverViolation({
          driverId,
          salesId,
          type: "تنبيه",
          message: `إيقاف مؤقت (${duration}): ${reason.trim()}`,
        });
      } catch {
        // اختياري — لا يوقف نجاح تغيير الحالة
      }
      toast.success("تم إيقاف السائق مؤقتاً");
      onSaved?.(result);
      onClose();
    } catch (err) {
      toast.error(err.message || "فشل الإيقاف");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppModal isOpen={isOpen} onClose={onClose} title="إيقاف مؤقت للسائق" isSubmitting={loading} size="sm">
      <ModalField label="مدة الإيقاف" required>
        <select value={duration} onChange={(e) => setDuration(e.target.value)} className={`${modalInputClass} text-right appearance-none`} disabled={loading}>
          <option>24 ساعة</option><option>48 ساعة</option><option>أسبوع</option>
        </select>
      </ModalField>
      <ModalField label="السبب" required>
        <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="أدخل سبب الإيقاف..." className={`${modalInputClass} resize-none`} disabled={loading}/>
      </ModalField>
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-xs mb-2">
        <span className="text-base">⚠️</span>
        <p>خلال فترة الإيقاف، لن يتمكن السائق من استقبال رحلات جديدة</p>
      </div>
      <ModalActions primaryLabel="تأكيد الإيقاف" onPrimary={handleConfirm} onSecondary={onClose} isSubmitting={loading} primaryDisabled={!reason.trim()} />
    </AppModal>
  );
};

const FreezeModal = ({ isOpen, onClose, driverName, driverId, onSaved, statusId }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const handleConfirm = async () => {
    if (!driverId || statusId == null) return;
    setLoading(true);
    try {
      await updateDriverStatus(driverId, statusId);
      toast.success("تم تجميد حساب السائق");
      onSaved?.(statusId);
      onClose();
    } catch (err) { toast.error(err.message || "فشل التجميد"); }
    finally { setLoading(false); }
  };
  return (
    <AppModal isOpen={isOpen} onClose={onClose} title="تجميد حساب السائق" isSubmitting={loading} size="sm">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 space-y-2 text-right">
        <h4 className="font-bold">ماذا يعني التجميد؟</h4>
        <ul className="space-y-1 text-xs"><li>• منع استقبال رحلات جديدة</li><li>• السماح بتصفية الحسابات المالية فقط</li><li>• يمكن إلغاء التجميد في أي وقت</li></ul>
      </div>
      <p className="text-sm text-gray-700 text-center font-medium py-2">هل أنت متأكد من تجميد حساب {driverName}؟</p>
      <ModalActions primaryLabel="تأكيد التجميد" onPrimary={handleConfirm} onSecondary={onClose} isSubmitting={loading} />
    </AppModal>
  );
};

const BlockModal = ({ isOpen, onClose, driverName, driverId, onSaved, statusId }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const handleConfirm = async () => {
    if (!driverId || statusId == null) return;
    setLoading(true);
    try {
      await updateDriverStatus(driverId, statusId);
      toast.success("تم حظر السائق نهائياً");
      onSaved?.(statusId);
      onClose();
    } catch (err) { toast.error(err.message || "فشل الحظر"); }
    finally { setLoading(false); }
  };
  return (
    <AppModal isOpen={isOpen} onClose={onClose} title="حظر نهائي للسائق" isSubmitting={loading} size="sm">
      <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-800 space-y-2 text-right">
        <h4 className="font-bold flex items-center gap-1.5 justify-end">⚠️ تحذير: إجراء نهائي</h4>
        <ul className="space-y-1 text-xs"><li>• منع تسجيل الدخول نهائياً</li><li>• لن يتمكن من استخدام التطبيق</li><li>• سيظهر في النظام كـ "محظور"</li></ul>
      </div>
      <p className="text-sm text-gray-700 text-center leading-relaxed py-2">هل أنت متأكد من حظر {driverName} نهائياً؟ هذا الإجراء لا يمكن التراجع عنه بسهولة.</p>
      <ModalActions primaryLabel="تأكيد الحظر النهائي" onPrimary={handleConfirm} onSecondary={onClose} isSubmitting={loading} />
    </AppModal>
  );
};

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, driverName, loading }) => (
  <ConfirmModal
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title="تأكيد الحذف"
    message={<>هل أنت متأكد أنك تريد حذف <span className="font-bold text-gray-800">{driverName}</span>؟</>}
    confirmLabel="حذف السائق"
    isSubmitting={loading}
    variant="danger"
  />
);

// ── Driver Form Modal (Add / Edit) ───────────────────────────
const GENDER_OPTIONS = ["ذكر", "أنثى"];
const normalizeGender = (gender) => {
  const value = String(gender ?? "").trim().toLowerCase();
  if (value === "ذكر" || value === "male" || value === "m") return "ذكر";
  if (value === "أنثى" || value === "انثى" || value === "female" || value === "f") return "أنثى";
  return "";
};
const genderToApiValue = (gender) => {
  if (gender === "ذكر") return "male";
  if (gender === "أنثى") return "female";
  return "";
};

const ibanDigitsFromApi = (iban) => {
  const raw = String(iban ?? "").trim().toUpperCase();
  if (raw.startsWith("SA")) return sanitizeIbanInput(raw.slice(2));
  return sanitizeIbanInput(raw);
};

const DRIVER_REQUIRED_FIELDS = [
  ["name", "اسم السائق"],
  ["address", "المدينة"],
  ["nationality", "الجنسية"],
  ["bank_name", "اسم البنك"],
  ["account_owner", "اسم صاحب الحساب"],
  ["car_type", "نوع السيارة"],
  ["car_model", "موديل السيارة"],
];

const DRIVER_REQUIRED_FILES = [
  ["identity_image", "صورة الهوية"],
  ["car_image", "صورة السيارة"],
  ["license_image", "صورة الرخصة"],
];

// Field helper — خارج المودال عشان ميتعملش re-mount كل render
const FormField = ({ label, value, onChange, type = "text", placeholder = "", required, dir, invalid, hint, maxLength, inputMode }) => (
  <div className="space-y-1.5">
    <label className="text-xs text-gray-500 block text-right">
      {label}{required ? " *" : ""}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder || label}
      required={required}
      dir={dir}
      maxLength={maxLength}
      inputMode={inputMode}
      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none bg-white text-right placeholder-gray-300 ${
        invalid ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-[#c9a84c]"
      }`}
    />
    {hint && (
      <p className={`text-[11px] text-right ${invalid ? "text-red-600" : "text-gray-400"}`}>{hint}</p>
    )}
  </div>
);

const SaudiPhoneField = ({ value, onChange, invalid, hint }) => (
  <div className="space-y-1.5">
    <label className="text-xs text-gray-500 block text-right">رقم الهاتف *</label>
    <div className="flex gap-2" dir="ltr">
      <span className="shrink-0 flex items-center px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 font-medium">
        +966
      </span>
      <input
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(sanitizePhoneInput(e.target.value))}
        placeholder="05xxxxxxxx"
        maxLength={10}
        required
        className={`flex-1 rounded-xl border px-3 py-2.5 text-sm focus:outline-none bg-white text-left placeholder-gray-300 ${
          invalid ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-[#c9a84c]"
        }`}
      />
    </div>
    {hint && (
      <p className={`text-[11px] text-right ${invalid ? "text-red-600" : "text-gray-400"}`}>{hint}</p>
    )}
  </div>
);

const SaudiIbanField = ({ value, onChange, invalid, hint }) => (
  <div className="space-y-1.5">
    <label className="text-xs text-gray-500 block text-right">الآيبان *</label>
    <div className="flex gap-2" dir="ltr">
      <span className="shrink-0 flex items-center px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 font-medium">
        SA
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(sanitizeIbanInput(e.target.value))}
        placeholder={"0".repeat(SAUDI_IBAN_DIGITS)}
        maxLength={SAUDI_IBAN_DIGITS}
        required
        className={`flex-1 rounded-xl border px-3 py-2.5 text-sm focus:outline-none bg-white text-left placeholder-gray-300 tracking-wider ${
          invalid ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-[#c9a84c]"
        }`}
      />
    </div>
    {hint && (
      <p className={`text-[11px] text-right ${invalid ? "text-red-600" : "text-gray-400"}`}>{hint}</p>
    )}
  </div>
);

const GenderSelect = ({ value, onChange }) => (
  <div className="space-y-1.5">
    <label className="text-xs text-gray-500 block text-right">الجنس *</label>
    <select
      value={value}
      onChange={onChange}
      required
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#c9a84c] bg-white text-right appearance-none"
    >
      <option value="">اختر الجنس</option>
      {GENDER_OPTIONS.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  </div>
);

const FileUpload = ({ label, name, files, onFileChange }) => (
  <div className="space-y-1.5">
    <label className="text-xs text-gray-500 block text-right">{label}</label>
    <label className="flex flex-col items-center justify-center gap-1 w-full border-2 border-dashed border-gray-200 rounded-xl py-4 cursor-pointer hover:bg-gray-50 text-gray-400 text-xs transition-colors">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
      {files?.[name]?.name
        ? <span className="text-[#c9a84c] font-medium">{files[name].name}</span>
        : <span>اختر ملف الصورة او سحبها هنا</span>
      }
      <input type="file" className="hidden" accept="image/*" onChange={e => onFileChange(name, e.target.files[0])}/>
    </label>
  </div>
);

const DriverFormModal = ({ isOpen, onClose, driverData, onSaved, onToast }) => {
  const isEditing = Boolean(driverData);
  const [form, setForm] = useState({
    name:"", phone:"", address:"", nationality:"", gender:"", email:"",
    bank_name:"", account_owner:"", iban:"",
    car_type:"", car_model:"", vehicle_size:""
  });
  const [fileMap, setFileMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSuccess(false);
    setFileMap({});
    if (driverData) {
      setForm({
        name: driverData.name||"", phone: normalizeSaudiPhoneFromApi(driverData.phone||""),
        address: driverData.address||"", nationality: driverData.nationality||"",
        gender: normalizeGender(driverData.gender), email: driverData.email||"",
        bank_name:"", account_owner:"", iban: ibanDigitsFromApi(driverData.iban),
        car_type: driverData.car_type||"", car_model: driverData.car_model||"",
        vehicle_size: driverData.vehicle_size||""
      });
    } else {
      setForm({ name:"", phone:"", address:"", nationality:"", gender:"", email:"", bank_name:"", account_owner:"", iban:"", car_type:"", car_model:"", vehicle_size:"" });
    }
  }, [isOpen, driverData?.id]);

  const u = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}));
  const setPhone = (phone) => setForm((f) => ({ ...f, phone }));
  const setIban = (iban) => setForm((f) => ({ ...f, iban }));
  const onFileChange = (k, file) => setFileMap(f => ({...f, [k]: file}));
  const isGenderSelected = GENDER_OPTIONS.includes(form.gender);

  const phoneValidation = useMemo(() => validatePhoneTenDigits(form.phone), [form.phone]);
  const emailValidation = useMemo(() => validateEmail(form.email), [form.email]);
  const ibanValidation = useMemo(() => validateSaudiIban(form.iban), [form.iban]);

  const phoneInvalid = form.phone.length > 0 && !phoneValidation.valid;
  const emailInvalid = form.email.trim().length > 0 && !emailValidation.valid;
  const ibanInvalid = form.iban.length > 0 && !ibanValidation.valid;

  const isCreateFormValid = useMemo(() => {
    if (!isGenderSelected || !phoneValidation.valid || !emailValidation.valid) return false;
    if (isEditing) return true;
    const textsOk = DRIVER_REQUIRED_FIELDS.every(([key]) => String(form[key] ?? "").trim());
    const filesOk = DRIVER_REQUIRED_FILES.every(([key]) => Boolean(fileMap[key]));
    return textsOk && filesOk && Boolean(form.vehicle_size) && ibanValidation.valid;
  }, [isEditing, form, fileMap, isGenderSelected, phoneValidation.valid, emailValidation.valid, ibanValidation.valid]);

  const validateBeforeSubmit = () => {
    if (!isGenderSelected) {
      onToast?.("error", "يرجى اختيار الجنس");
      return false;
    }
    if (!phoneValidation.valid) {
      onToast?.("error", phoneValidation.message || "رقم الهاتف غير صحيح");
      return false;
    }
    if (!emailValidation.valid) {
      onToast?.("error", emailValidation.message || "البريد الإلكتروني غير صحيح");
      return false;
    }
    if (!isEditing && !ibanValidation.valid) {
      onToast?.("error", ibanValidation.message || "رقم الآيبان غير صحيح");
      return false;
    }
    if (!isEditing) {
      for (const [key, label] of DRIVER_REQUIRED_FIELDS) {
        if (!String(form[key] ?? "").trim()) {
          onToast?.("error", `${label} مطلوب`);
          return false;
        }
      }
      if (!form.vehicle_size) {
        onToast?.("error", "حجم السيارة مطلوب");
        return false;
      }
      for (const [key, label] of DRIVER_REQUIRED_FILES) {
        if (!fileMap[key]) {
          onToast?.("error", `${label} مطلوبة`);
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateBeforeSubmit()) return;
    setSaving(true);
    try {
      let url;
      const apiForm = {
        ...form,
        phone: phoneValidation.normalized ?? form.phone,
        email: emailValidation.normalized ?? form.email,
        iban: ibanValidation.normalized ?? form.iban,
        gender: genderToApiValue(form.gender),
      };

      if (isEditing) {
        // تعديل سائق — FormData عشان الصور
        url = `${BASE}/driverstest/update/${driverData.id}`;
        const fd = new FormData();
        Object.entries(apiForm).forEach(([k,v]) => { if(v) fd.append(k, v); });
        Object.entries(fileMap).forEach(([k,file]) => { if(file) fd.append(k, file); });
        const res = await fetch(url, { method: "POST", body: fd });
        if (res.ok || res.status < 500) {
          setSuccess(true);
          onSaved();
          onToast?.("success", "تم تعديل بيانات السائق بنجاح");
          setTimeout(() => { setSuccess(false); onClose(); }, 800);
        }
      } else {
        url = `${BASE}/drivers`;

        const existingRes = await fetch(url, { headers: { Accept: "application/json" } });
        if (!existingRes.ok) throw new Error("فشل تحميل السائقين للتحقق من معرف جديد");

        const existingDrivers = await existingRes.json().catch(() => []);
        const driverId = createUniqueDriverId(Array.isArray(existingDrivers) ? existingDrivers : []);

        const payload = {
          id:        driverId,
          fcm_token: `web_${driverId}`,
          city_id:   1,
          region:    1,
          ...apiForm,
        };

        // Always use FormData so the server accepts the request
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (v !== "" && v !== null && v !== undefined) fd.append(k, v);
        });
        Object.entries(fileMap).forEach(([k, file]) => {
          if (file) fd.append(k, file);
        });

        const res = await fetch(url, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: fd,
        });

        if (res.ok) {
          const refreshedRes = await fetch(url, { headers: { Accept: "application/json" } });
          const refreshedDrivers = refreshedRes.ok ? await refreshedRes.json().catch(() => []) : [];
          const driverExists = Array.isArray(refreshedDrivers) && refreshedDrivers.some(driver => String(driver.id) === driverId);

          if (!driverExists) {
            onToast?.("error", "تم إرسال الطلب لكن لم يظهر السائق في القائمة");
            return;
          }

          setSuccess(true);
          onSaved();
          onToast?.("success", "تم إضافة السائق بنجاح");
          setTimeout(() => { setSuccess(false); onClose(); }, 800);
        } else {
          const err = await res.json().catch(() => ({}));
          const msg =
            (typeof err?.errors === "object"
              ? Object.values(err.errors).flat().join(" — ")
              : null) ||
            err?.message ||
            "حدث خطأ أثناء الإضافة";
          onToast?.("error", msg);
        }
      }
    } catch (err) { console.error(err); onToast?.("error", err.message || "حدث خطأ، حاول مجدداً"); }
    finally { setSaving(false); }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "تعديل بيانات السائق" : "إضافة سائق جديد"}
      isSubmitting={saving}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50/40 -mx-1 px-1">

          {/* المعلومات الشخصية */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 shadow-sm">
            <h4 className="text-sm font-bold text-[#c9a84c] text-right">$ المعلومات الشخصية</h4>
            <div className="grid grid-cols-2 gap-3">
              <SaudiPhoneField
                value={form.phone}
                onChange={setPhone}
                invalid={phoneInvalid}
                hint={
                  phoneInvalid
                    ? phoneValidation.message
                    : form.phone
                      ? "10 أرقام — مثال: 05xxxxxxxx"
                      : "كود السعودية +966"
                }
              />
              <FormField label="اسم السائق" value={form.name} onChange={u("name")} placeholder="ادخل اسم السائق" required />
              <FormField label="الجنسية" value={form.nationality} onChange={u("nationality")} placeholder="ادخل جنسية السائق" required />
              <FormField label="المدينه" value={form.address} onChange={u("address")} placeholder="ادخل مدينة السائق" required />
              <GenderSelect value={form.gender} onChange={u("gender")}/>
              <FormField
                label="البريد الإلكتروني"
                value={form.email}
                onChange={u("email")}
                type="email"
                placeholder="example@email.com"
                required
                dir="ltr"
                invalid={emailInvalid}
                hint={emailInvalid ? emailValidation.message : "مثال: name@domain.com"}
              />
            </div>
            <FileUpload label="صورة الهوية *" name="identity_image" files={fileMap} onFileChange={onFileChange}/>
          </div>

          {/* المعلومات المالية */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 shadow-sm">
            <h4 className="text-sm font-bold text-[#c9a84c] text-right">$ المعلومات المالية</h4>
            <FormField label="اسم البنك" value={form.bank_name} onChange={u("bank_name")} placeholder="ادخل اسم البنك" required={!isEditing} />
            <FormField label="اسم صاحب الحساب" value={form.account_owner} onChange={u("account_owner")} placeholder="ادخل اسم صاحب الحساب" required={!isEditing} />
            <p className="text-[10px] text-gray-400 text-right">لابد ان يتطابق مع اسم السائق</p>
            <SaudiIbanField
              value={form.iban}
              onChange={setIban}
              invalid={ibanInvalid}
              hint={
                ibanInvalid
                  ? ibanValidation.message
                  : `أرقام فقط — ${SAUDI_IBAN_DIGITS} رقماً بعد SA`
              }
            />
          </div>

          {/* معلومات السيارة */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 shadow-sm">
            <h4 className="text-sm font-bold text-[#c9a84c] text-right">$ معلومات السيارة</h4>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="موديل السيارة" value={form.car_model} onChange={u("car_model")} placeholder="ادخل موديل السيارة" required={!isEditing} />
              <FormField label="نوع السيارة" value={form.car_type} onChange={u("car_type")} placeholder="ادخل نوع السيارة" required={!isEditing} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-gray-500 block text-right">حجم السيارة *</label>
              <select value={form.vehicle_size} onChange={u("vehicle_size")} required={!isEditing}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#c9a84c] bg-white text-right appearance-none">
                <option value="">اختر حجم السيارة</option>
                <option value="صغيرة">صغيرة (4 ركاب)</option>
                <option value="متوسطه">متوسطة (5-6 ركاب)</option>
                <option value="كبيرة">كبيرة (7+ ركاب)</option>
              </select>
            </div>
            <FileUpload label={`صورة السيارة${isEditing ? "" : " *"}`} name="car_image" files={fileMap} onFileChange={onFileChange}/>
            <FileUpload label={`صورة الرخصة${isEditing ? "" : " *"}`} name="license_image" files={fileMap} onFileChange={onFileChange}/>
          </div>

          <button type="submit" disabled={saving || success || !isCreateFormValid}
            className={`w-full font-bold py-3 rounded-xl text-sm transition-colors ${success ? "bg-green-600 text-white" : "bg-[#4a4644] text-white hover:bg-black disabled:opacity-60"}`}>
            {success ? "✓ تم الحفظ بنجاح" : saving ? "جارٍ الحفظ..." : isEditing ? "حفظ التعديلات" : "إضافة سائق"}
          </button>
        </form>
    </AppModal>
  );
};

// ── Add Note Modal ────────────────────────────────────────────
const AddNoteModal = ({ isOpen, onClose, driverId, salesId, onSaved }) => {
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) setMessage("");
  }, [isOpen]);

  const submit = async () => {
    if (!message.trim()) return;
    setSaving(true);
    try {
      await createDriverViolation({
        driverId,
        salesId,
        message: message.trim(),
        type: "ملاحظه",
      });
      toast.success("تمت إضافة الملاحظة بنجاح");
      setMessage("");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || "فشل إضافة الملاحظة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal isOpen={isOpen} onClose={onClose} title="إضافة ملاحظة" isSubmitting={saving} size="md">
      <ModalField label="ملاحظة" required>
        <textarea
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="... أضف ملاحظتك هنا"
          className={`${modalInputClass} resize-none`}
          disabled={saving}
        />
      </ModalField>
      <ModalActions primaryLabel="حفظ" onPrimary={submit} onSecondary={onClose} isSubmitting={saving} primaryDisabled={!message.trim()} />
    </AppModal>
  );
};

// ── Driver Details Page ───────────────────────────────────────
const DriverDetailsPage = ({
  driverId,
  basicDriver,
  onBack,
  onEditRequest,
  onDeleteRequest,
  onDriverUpdated,
  statusLabel,
  statusColor,
  statuses = [],
}) => {
  const toast = useToast();
  const { user } = useAuth();
  const salesId = user?.uid ?? "";
  const [activeModal, setActiveModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [statusChanging, setStatusChanging] = useState(false);
  const [violRefreshKey, setViolRefreshKey] = useState(0);
  const [tripsRefreshKey, setTripsRefreshKey] = useState(0);
  const closeModal = () => setActiveModal(null);
  const basicDriverRef = useRef(basicDriver);
  basicDriverRef.current = basicDriver;

  const loadDriverDetail = useCallback(async (showLoading = true) => {
    if (!driverId) return null;
    if (showLoading) setLoadingDetail(true);
    try {
      const raw = await fetchDriverById(driverId);
      const patch = normalizeDriverStatusFields(normalizeDriverMedia(raw), statuses);
      setDetail(patch);
      return patch;
    } catch {
      const fallback = normalizeDriverStatusFields(normalizeDriverMedia(basicDriverRef.current), statuses);
      setDetail(fallback);
      return fallback;
    } finally {
      if (showLoading) setLoadingDetail(false);
    }
  }, [driverId, statuses]);

  useEffect(() => {
    loadDriverDetail(true);
  }, [loadDriverDetail]);

  const syncDriverProfile = useCallback(async () => {
    const patch = await loadDriverDetail(false);
    if (patch) onDriverUpdated?.({ id: driverId, ...patch });
    return patch;
  }, [driverId, loadDriverDetail, onDriverUpdated]);

  const applyStatusUpdate = useCallback(async () => {
    await syncDriverProfile();
  }, [syncDriverProfile]);

  const handleStatusChange = async (statusId) => {
    if (!driverId || statusId == null || statusChanging) return;
    const currentStatus = resolveDriverStatusId(detail ?? basicDriver, statuses);
    if (isSameDriverStatus(currentStatus, statusId)) return;

    const pauseId = getPauseStatusId(statuses);
    if (Number(statusId) === Number(pauseId)) {
      setActiveModal("pause");
      return;
    }

    setStatusChanging(true);
    try {
      const result = await updateDriverStatus(driverId, statusId, { pauseStatusId: pauseId });
      await applyStatusUpdate();
      toast.success(`تم تغيير الحالة إلى ${statusLabel(result?.status ?? statusId)}`);
    } catch (err) {
      toast.error(err.message || "فشل تغيير الحالة");
    } finally {
      setStatusChanging(false);
    }
  };

  const driver = normalizeDriverStatusFields(normalizeDriverMedia(detail || basicDriver), statuses);
  const fullName = [driver?.name, driver?.last_name].filter(Boolean).join(" ");

  return (
    <>
      <DriverDetailsView
        driver={driver}
        driverId={driverId}
        loading={loadingDetail}
        onBack={onBack}
        onEditRequest={onEditRequest}
        onDeleteRequest={onDeleteRequest}
        onOpenModal={setActiveModal}
        statusLabel={statusLabel}
        statusColor={statusColor}
        statuses={statuses}
        onStatusChange={handleStatusChange}
        statusChanging={statusChanging}
        violRefreshKey={violRefreshKey}
        tripsRefreshKey={tripsRefreshKey}
      />
      <AlertModal
        isOpen={activeModal === "alert"}
        onClose={closeModal}
        driverId={driverId}
        onSaved={() => setViolRefreshKey((k) => k + 1)}
      />
      <PauseModal
        isOpen={activeModal === "pause"}
        onClose={closeModal}
        driverId={driverId}
        salesId={salesId}
        statusId={getPauseStatusId(statuses)}
        pauseStatusId={getPauseStatusId(statuses)}
        onSaved={async (result) => {
          await applyStatusUpdate();
          setViolRefreshKey((k) => k + 1);
        }}
      />
      <AssignTripModal
        isOpen={activeModal === "assignTrip"}
        onClose={closeModal}
        driverId={driverId}
        driverName={fullName}
        onSuccess={() => setTripsRefreshKey((k) => k + 1)}
      />
      <AddNoteModal
        isOpen={activeModal === "addNote"}
        onClose={closeModal}
        driverId={driverId}
        salesId={salesId}
        onSaved={() => setViolRefreshKey((k) => k + 1)}
      />
    </>
  );
};

// ── Main DriversPage ──────────────────────────────────────────
const ITEMS_PER_PAGE = 6;

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [modalState, setModalState] = useState({ type: null, driver: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const closeGlobalModal = () => setModalState({ type: null, driver: null });
  const toast = useToast();
  const { statusLabel, statusColor, statuses } = useDriverStatuses();
  const { searchQuery } = useGlobalSearch();
  const { can } = usePermissions();
  const canCreate = can(PERMISSIONS.DRIVERS_CREATE);
  const canEdit = can(PERMISSIONS.DRIVERS_EDIT);
  const canDelete = can(PERMISSIONS.DRIVERS_DELETE);

  const filteredDrivers = useMemo(
    () => filterByGlobalSearch(drivers, searchQuery, (d) => [
      d.name,
      d.last_name,
      d.phone,
      d.address,
      d.car_type,
      d.id,
      statusLabel(d.status),
    ]),
    [drivers, searchQuery, statusLabel]
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const fetchDrivers = useCallback(() => {
    setLoading(true);
    fetch(`${BASE}/drivers`)
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : [];
        setDrivers(list.map((drv) => normalizeDriverStatusFields(drv, statuses)));
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); toast.error("فشل تحميل السائقين"); });
  }, [statuses, toast]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const executeDelete = async () => {
    if (!modalState.driver) return;
    setDeleteLoading(true);
    try {
      await fetch(`${BASE}/drivers/${modalState.driver.id}`, { method: "DELETE" });
      if (selectedDriver?.id === modalState.driver.id) setSelectedDriver(null);
      fetchDrivers();
      toast.success(`تم حذف السائق بنجاح`);
    } catch (e) { toast.error("فشل حذف السائق"); }
    setDeleteLoading(false);
    closeGlobalModal();
  };

  const totalPages = Math.max(1, Math.ceil(filteredDrivers.length / ITEMS_PER_PAGE));
  const paginated = filteredDrivers.slice((page-1)*ITEMS_PER_PAGE, page*ITEMS_PER_PAGE);

  const handleDriverUpdated = useCallback((updated) => {
    if (!updated) return;
    const normalized = normalizeDriverStatusFields(updated, statuses);
    setSelectedDriver((prev) => (prev ? { ...prev, ...normalized } : prev));
    const id = normalized.id;
    if (id != null) {
      setDrivers((prev) =>
        prev.map((d) => (String(d.id) === String(id) ? { ...d, ...normalized } : d))
      );
    }
  }, [statuses]);

  if (selectedDriver) return (
    <>
      <DriverDetailsPage
        driverId={selectedDriver.id}
        basicDriver={selectedDriver}
        onBack={()=>setSelectedDriver(null)}
        onEditRequest={d=>setModalState({type:"edit",driver:d})}
        onDeleteRequest={d=>setModalState({type:"delete",driver:d})}
        onDriverUpdated={handleDriverUpdated}
        statusLabel={statusLabel}
        statusColor={statusColor}
        statuses={statuses}
      />
      <DriverFormModal isOpen={modalState.type==="edit"} onClose={closeGlobalModal} driverData={modalState.driver} onSaved={fetchDrivers} onToast={(t,m)=>toast[t](m)}/>
      <DeleteConfirmModal isOpen={modalState.type==="delete"} onClose={closeGlobalModal} onConfirm={executeDelete} driverName={modalState.driver?.name} loading={deleteLoading}/>
    </>
  );

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-xl px-5 py-3 border border-gray-200/60 shadow-sm text-right">
        <h1 className="text-xl font-bold text-[#c9a84c]">قائمة السائقين</h1>
        <p className="text-xs text-gray-400 mt-0.5">إدارة ومتابعة السائقين والمهام بلحظة</p>
      </div>

      {/* Banner */}
      <div className="relative bg-gradient-to-l from-[#b88121] to-[#dca43b] rounded-2xl overflow-hidden min-h-[150px] flex items-center justify-between px-8 shadow-sm">
        <div className="absolute left-4 bottom-0 h-[90%] w-1/3 max-w-[160px] pointer-events-none flex items-end">
          <img src={bannerImage} alt="" className="h-full w-full object-contain object-bottom drop-shadow-md"/>
        </div>
        <div className="z-10 text-white text-right">
          <h2 className="text-5xl font-extrabold">{filteredDrivers.length} <span className="text-2xl font-normal">سائق</span></h2>
          <p className="text-sm opacity-80 mt-1">عدد السائقين المسجلين</p>
          <button onClick={()=>canCreate && setModalState({type:"add",driver:null})} disabled={!canCreate} className="mt-4 flex items-center gap-2 bg-white text-[#b88121] text-sm font-semibold px-5 py-2 rounded-full shadow hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            إضافة سائق جديد
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? <Spinner/> : error ? (
          <p className="text-center text-red-500 text-sm py-10">{error}</p>
        ) : paginated.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">لا توجد نتائج تطابق البحث</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="bg-[#f9f6f0] border-b border-gray-100">
                  {["الاسم","رقم الهاتف","المدينة","نوع السيارة","حالة الحساب","عدد الرحلات","المستحقات","اكتمال الملف","إجراءات"].map(h=>(
                    <th key={h} className="px-4 py-3.5 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(driver=>(
                  <tr key={driver.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-gray-800">{[driver.name, driver.last_name].filter(Boolean).join(" ")}</td>
                    <td className="px-4 py-3.5 text-gray-600" dir="ltr">{driver.phone}</td>
                    <td className="px-4 py-3.5 text-gray-600">{driver.address||"—"}</td>
                    <td className="px-4 py-3.5 text-gray-600">{driver.car_type||"—"}</td>
                    <td className="px-4 py-3.5"><span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${statusColor(driver.status)}`}>{statusLabel(driver.status)}</span></td>
                    <td className="px-4 py-3.5 text-gray-700 font-medium">{driver.trips_count||0}</td>
                    <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">{driver.total_dues||0} ر.س</td>
                    <td className="px-4 py-3.5"><ProgressBar value={driver.profile_completion||0}/></td>
                    <td className="px-4 py-3.5">
                      <ActionIcons
                        canDelete={canDelete}
                        canEdit={canEdit}
                        onDelete={()=>setModalState({type:"delete",driver})}
                        onEdit={()=>setModalState({type:"edit",driver})}
                        onView={()=>setSelectedDriver(driver)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex justify-center items-center gap-1 py-4 text-xs text-gray-600" dir="ltr">
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            </button>
            {Array.from({length:totalPages},(_,i)=>i+1).map(n=>(
              <button key={n} onClick={()=>setPage(n)} className={`w-7 h-7 rounded font-bold transition-colors ${page===n?"bg-amber-500 text-white shadow-sm":"bg-white border border-gray-200 hover:bg-gray-50"}`}>{n}</button>
            ))}
            <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="p-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        )}
      </div>

      <DriverFormModal isOpen={modalState.type==="add"||modalState.type==="edit"} onClose={closeGlobalModal} driverData={modalState.driver} onSaved={fetchDrivers} onToast={(t,m)=>toast[t](m)}/>
      <DeleteConfirmModal isOpen={modalState.type==="delete"} onClose={closeGlobalModal} onConfirm={executeDelete} driverName={modalState.driver?.name} loading={deleteLoading}/>
    </div>
  );
}

