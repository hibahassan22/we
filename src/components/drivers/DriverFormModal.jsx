import { useState, useEffect, useMemo } from "react";
import AppModal from "../ui/AppModal";
import {
  sanitizePhoneInputFiveStart,
  validatePhoneTenDigitsFiveStart,
  normalizeSaudiPhoneForInputFiveStart,
  validateEmail,
  sanitizeIbanInput,
  validateSaudiIban,
  SAUDI_IBAN_DIGITS,
} from "../../lib/phoneValidation.js";
import { fetchCities, NATIONALITY_OPTIONS } from "../../services/cityService.js";
import { getDriverBankingData, saveDriverBankingData } from "../../lib/driverBanking.js";

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
  ["bank_account_number", "رقم حساب السائق"],
  ["car_type", "نوع السيارة"],
  ["car_model", "موديل السيارة"],
];

const DRIVER_REQUIRED_FILES = [
  ["identity_image", "صورة الهوية"],
  ["car_image", "صورة السيارة"],
  ["license_image", "صورة الرخصة"],
];

// Field helper — خارج المودال عشان ميتعملش re-mount كل render
const FormField = ({ label, value, onChange, type = "text", placeholder = "", required, dir, invalid, hint, maxLength, inputMode, disabled = false }) => (
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
      disabled={disabled}
      className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none bg-white text-right placeholder-gray-300 disabled:bg-gray-50 disabled:text-gray-400 ${
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
        onChange={(e) => onChange(sanitizePhoneInputFiveStart(e.target.value))}
        placeholder="5xxxxxxxxx"
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
      <option value="" disabled hidden>
        اختر الجنس
      </option>
      {GENDER_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

const SelectField = ({ label, value, onChange, options, placeholder, required, loading, extraOption }) => (
  <div className="space-y-1.5">
    <label className="text-xs text-gray-500 block text-right">
      {label}
      {required ? " *" : ""}
    </label>
    <select
      value={value}
      onChange={onChange}
      required={required}
      disabled={loading}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#c9a84c] bg-white text-right appearance-none disabled:opacity-60"
    >
      <option value="" disabled hidden>
        {placeholder}
      </option>
      {extraOption && !options.some((o) => o === extraOption || o?.name === extraOption) && (
        <option value={extraOption}>{extraOption}</option>
      )}
      {options.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.name;
        const key = typeof opt === "string" ? opt : opt.id ?? opt.name;
        return (
          <option key={key} value={val}>
            {val}
          </option>
        );
      })}
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

export default function DriverFormModal({ isOpen, onClose, driverData, onSaved, onToast, stackAbove = false }) {
  const isEditing = Boolean(driverData);
  const [form, setForm] = useState({
    name:"", phone:"", address:"", nationality:"", gender:"", email:"",
    bank_name:"", account_owner:"", bank_account_number:"", iban:"",
    banking_status:"مؤهل", balance:"0",
    car_type:"", car_model:"", vehicle_size:""
  });
  const [fileMap, setFileMap] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSuccess(false);
    setFileMap({});
    if (driverData) {
      const banking = getDriverBankingData(driverData);
      setForm({
        name: driverData.name||"", phone: normalizeSaudiPhoneForInputFiveStart(driverData.phone||""),
        address: driverData.address||"", nationality: driverData.nationality||"",
        gender: normalizeGender(driverData.gender), email: driverData.email||"",
        bank_name: driverData.bank_name || driverData.bank_status || "",
        account_owner: driverData.account_owner || driverData.account_holder_name || "",
        bank_account_number:
          driverData.bank_account_number
          || driverData.driver_bank_account_number
          || "",
        iban: ibanDigitsFromApi(driverData.iban),
        banking_status: banking.bankingStatus,
        balance: String(
          banking.balance ?? driverData.wallet_balance ?? driverData.balance ?? 0
        ),
        car_type: driverData.car_type||"", car_model: driverData.car_model||"",
        vehicle_size: driverData.vehicle_size||""
      });
    } else {
      setForm({ name:"", phone:"", address:"", nationality:"", gender:"", email:"", bank_name:"", account_owner:"", bank_account_number:"", iban:"", banking_status:"مؤهل", balance:"0", car_type:"", car_model:"", vehicle_size:"" });
    }
  }, [isOpen, driverData?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const ctrl = new AbortController();
    setCitiesLoading(true);
    fetchCities(ctrl.signal)
      .then(setCities)
      .catch(() => setCities([]))
      .finally(() => setCitiesLoading(false));
    return () => ctrl.abort();
  }, [isOpen]);

  const u = (k) => (e) => setForm(f => ({...f, [k]: e.target.value}));
  const setPhone = (phone) => setForm((f) => ({ ...f, phone }));
  const setIban = (iban) => setForm((f) => ({ ...f, iban }));
  const onFileChange = (k, file) => setFileMap(f => ({...f, [k]: file}));
  const isGenderSelected = GENDER_OPTIONS.includes(form.gender);

  const phoneValidation = useMemo(() => validatePhoneTenDigitsFiveStart(form.phone), [form.phone]);
  const emailValidation = useMemo(() => validateEmail(form.email ?? ""), [form.email]);
  const ibanValidation = useMemo(() => validateSaudiIban(form.iban), [form.iban]);

  const phoneInvalid = String(form.phone ?? "").length > 0 && !phoneValidation.valid;
  const emailInvalid = String(form.email ?? "").trim().length > 0 && !emailValidation.valid;
  const ibanInvalid = String(form.iban ?? "").length > 0 && !ibanValidation.valid;
  const bankingValid =
    form.banking_status === "مؤهل" ||
    (form.banking_status === "غير مؤهل" && Number(form.balance) > 0);

  const isCreateFormValid = useMemo(() => {
    if (!isGenderSelected || !phoneValidation.valid || !emailValidation.valid || !bankingValid) return false;
    if (isEditing) return true;
    const textsOk = DRIVER_REQUIRED_FIELDS.every(([key]) => String(form[key] ?? "").trim());
    const filesOk = DRIVER_REQUIRED_FILES.every(([key]) => Boolean(fileMap[key]));
    return textsOk && filesOk && Boolean(form.vehicle_size) && ibanValidation.valid;
  }, [isEditing, form, fileMap, isGenderSelected, phoneValidation.valid, emailValidation.valid, ibanValidation.valid, bankingValid]);

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
    if (!bankingValid) {
      onToast?.("error", "يرجى إدخال رصيد المديونية");
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
      const { banking_status: bankingStatus, balance, account_owner, bank_account_number, ...driverFields } = form;
      const walletBalance = bankingStatus === "غير مؤهل" ? Number(balance) || 0 : Number(balance) || 0;
      const apiForm = {
        ...driverFields,
        phone: phoneValidation.normalized ?? form.phone,
        email: emailValidation.normalized ?? form.email,
        iban: ibanValidation.normalized ?? form.iban,
        gender: genderToApiValue(form.gender),
        // الحقول المالية حسب الـ API (create / update)
        account_owner,
        account_holder_name: account_owner,
        bank_account_number,
        driver_bank_account_number: bank_account_number,
        wallet_balance: walletBalance,
        bank_status: bankingStatus,
        banking_status: bankingStatus,
        balance: walletBalance,
      };

      if (isEditing) {
        // تعديل سائق — FormData عشان الصور + الحقول المالية
        url = `${BASE}/driverstest/update/${driverData.id}`;
        const fd = new FormData();
        // الحقول المالية لازم تتبعت حتى لو الرصيد 0
        const financialKeys = new Set([
          "wallet_balance",
          "balance",
          "bank_status",
          "banking_status",
          "account_owner",
          "account_holder_name",
          "bank_account_number",
          "driver_bank_account_number",
          "bank_name",
          "iban",
        ]);
        Object.entries(apiForm).forEach(([k, v]) => {
          if (financialKeys.has(k)) {
            fd.append(k, v == null ? "" : String(v));
            return;
          }
          if (v !== "" && v !== null && v !== undefined) fd.append(k, v);
        });
        Object.entries(fileMap).forEach(([k, file]) => { if (file) fd.append(k, file); });
        const res = await fetch(url, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: fd,
        });
        if (res.ok || res.status < 500) {
          saveDriverBankingData(driverData.id, {
            bankingStatus,
            balance: walletBalance,
          });
          setSuccess(true);
          onSaved({
            ...(driverData || {}),
            ...apiForm,
            id: driverData.id,
            wallet_balance: walletBalance,
            bank_status: bankingStatus,
            banking_status: bankingStatus,
            account_holder_name: account_owner,
            driver_bank_account_number: bank_account_number,
          });
          onToast?.("success", "تم تعديل بيانات السائق بنجاح");
          setTimeout(() => { setSuccess(false); onClose(); }, 800);
        } else {
          const err = await res.json().catch(() => ({}));
          const msg =
            (typeof err?.errors === "object"
              ? Object.values(err.errors).flat().join(" — ")
              : null) ||
            err?.message ||
            "حدث خطأ أثناء التعديل";
          onToast?.("error", msg);
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

          const createdDriver = refreshedDrivers.find((driver) => String(driver.id) === driverId);

          saveDriverBankingData(driverId, {
            bankingStatus,
            balance: walletBalance,
          });
          setSuccess(true);
          onSaved(createdDriver ?? { id: driverId, name: form.name, phone: apiForm.phone });
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
      zIndex={stackAbove ? 10050 : 9999}
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
                      ? "10 أرقام تبدأ بـ 5 — مثال: 5xxxxxxxxx"
                      : "كود السعودية +966 — 10 أرقام تبدأ بـ 5"
                }
              />
              <FormField label="اسم السائق" value={form.name} onChange={u("name")} placeholder="ادخل اسم السائق" required />
              <SelectField
                label="الجنسية"
                value={form.nationality}
                onChange={u("nationality")}
                options={NATIONALITY_OPTIONS}
                placeholder="اختر الجنسية"
                required
                extraOption={form.nationality}
              />
              <SelectField
                label="المدينه"
                value={form.address}
                onChange={u("address")}
                options={cities}
                placeholder={citiesLoading ? "جاري تحميل المدن..." : "اختر المدينة"}
                required
                loading={citiesLoading}
                extraOption={form.address}
              />
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
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="الحالة البنكية"
                value={form.banking_status}
                onChange={(e) => {
                  const status = e.target.value;
                  setForm((current) => ({
                    ...current,
                    banking_status: status,
                  }));
                }}
                options={["مؤهل", "غير مؤهل"]}
                placeholder="اختر الحالة البنكية"
                required
              />
              <FormField
                label="رصيد المحفظة"
                value={form.balance}
                onChange={u("balance")}
                type="number"
                placeholder="0"
                required={form.banking_status === "غير مؤهل"}
                inputMode="decimal"
                invalid={form.banking_status === "غير مؤهل" && Number(form.balance) <= 0}
                hint={form.banking_status === "غير مؤهل" ? "أدخل قيمة المديونية / الرصيد" : "رصيد المحفظة (wallet_balance)"}
              />
            </div>
            <FormField label="اسم البنك" value={form.bank_name} onChange={u("bank_name")} placeholder="ادخل اسم البنك" required={!isEditing} />
            <FormField label="اسم صاحب الحساب" value={form.account_owner} onChange={u("account_owner")} placeholder="ادخل اسم صاحب الحساب" required={!isEditing} />
            <p className="text-[10px] text-gray-400 text-right">لابد ان يتطابق مع اسم السائق</p>
            <FormField
              label="رقم حساب السائق"
              value={form.bank_account_number}
              onChange={u("bank_account_number")}
              placeholder="ادخل رقم الحساب"
              required={!isEditing}
              dir="ltr"
              inputMode="numeric"
            />
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
                <option value="" disabled hidden>اختر حجم السيارة</option>
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
}
