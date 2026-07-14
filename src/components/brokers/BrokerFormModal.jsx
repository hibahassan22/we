import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Upload } from "lucide-react";
import AppModal, { ModalField, modalInputClass } from "../ui/AppModal";
import {
  sanitizePhoneInput,
  validatePhoneTenDigits,
  normalizeSaudiPhoneFromApi,
} from "../../lib/phoneValidation.js";
import { createBroker, updateBroker, generateBrokerCode } from "../../services/brokerService.js";
import { fetchAllDrivers } from "../../services/driverSaleChatService.js";

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  address: "",
  broker_code: "",
  commission: "5",
  commission_type: "نقدي",
  nationality: "سعودي",
  identity_number: "",
  driver_id: "",
  notes: "",
  photo: null,
};

function getDriverName(d) {
  return [d?.name, d?.last_name].filter(Boolean).join(" ").trim() || "—";
}

function getDriverIdentity(d) {
  return String(d?.identity_number ?? d?.national_id ?? d?.id_number ?? d?.iqama ?? "").trim();
}

function driverToForm(d) {
  return {
    name: getDriverName(d),
    phone: normalizeSaudiPhoneFromApi(d?.phone || ""),
    email: d?.email || "",
    address: d?.address || "",
    nationality: d?.nationality || "سعودي",
    identity_number: getDriverIdentity(d),
    driver_id: d?.id != null ? String(d.id) : "",
  };
}

/** بحث سائق بالاسم أو الرقم — لإضافة وسيط */
function DriverPhoneSearch({
  drivers,
  loading,
  disabled,
  onSelect,
  onAddBroker,
  selectedId,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = useMemo(
    () => drivers.find((d) => String(d.id) === String(selectedId)),
    [drivers, selectedId]
  );
  const selectedLabel = selected
    ? `${getDriverName(selected)} — ${normalizeSaudiPhoneFromApi(selected.phone || "")}`
    : "";

  useEffect(() => {
    if (selected) setQuery(selectedLabel);
    else if (!open) setQuery("");
  }, [selected, selectedLabel, open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && query === selectedLabel)) return drivers.slice(0, 30);
    const qDigits = q.replace(/\D/g, "");
    return drivers.filter((d) => {
      const name = getDriverName(d).toLowerCase();
      const phone = String(d.phone || "").replace(/\D/g, "");
      const idNum = getDriverIdentity(d).replace(/\D/g, "");
      return (
        name.includes(q) ||
        (qDigits && (phone.includes(qDigits) || idNum.includes(qDigits)))
      );
    });
  }, [drivers, query, selected, selectedLabel]);

  const isSearching = query.trim().length > 0 && (!selected || query !== selectedLabel);
  const showAdd = isSearching && filtered.length === 0 && !loading;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        if (selected) setQuery(selectedLabel);
        else setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selected, selectedLabel]);

  return (
    <div ref={containerRef} className="flex gap-2 items-stretch">
      <div className="relative flex-1 min-w-0">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setOpen(true);
            if (selected && next !== selectedLabel) onSelect(null);
          }}
          onFocus={() => !disabled && setOpen(true)}
          disabled={disabled || loading}
          placeholder={loading ? "جاري تحميل السائقين..." : "ابحث برقم الهاتف أو الاسم..."}
          className={modalInputClass}
          autoComplete="off"
        />
        <div className="absolute left-3 top-3 pointer-events-none text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {open && !disabled && !loading && (
          <ul className="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 text-xs text-gray-400 text-right">
                {isSearching ? "لا يوجد سائق بهذا الرقم" : "لا يوجد سائقون"}
              </li>
            ) : (
              filtered.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect(d);
                      setQuery(`${getDriverName(d)} — ${normalizeSaudiPhoneFromApi(d.phone || "")}`);
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-sm text-right hover:bg-amber-50 transition-colors ${
                      String(d.id) === String(selectedId) ? "bg-amber-50 text-[#c9a84c] font-medium" : "text-gray-700"
                    }`}
                  >
                    <span className="block">{getDriverName(d)}</span>
                    <span className="block text-[11px] text-gray-400 mt-0.5" dir="ltr">
                      {normalizeSaudiPhoneFromApi(d.phone || "") || "—"}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {showAdd && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onAddBroker?.(query);
          }}
          className="shrink-0 px-3 py-2 rounded-xl border border-[#c9a84c] text-[#c9a84c] text-xs font-bold hover:bg-amber-50 transition-colors whitespace-nowrap"
        >
          + إضافة وسيط
        </button>
      )}
    </div>
  );
}

function CommissionCard({ type, value, onTypeChange, onValueChange, disabled }) {
  const isCash = type === "نقدي";
  return (
    <div className="rounded-2xl bg-[#f7f2e8] border border-[#efe6d4] p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          {[
            { id: "نقدي", label: "نقدي" },
            { id: "نسبة مئوية", label: "نسبة مئوية" },
          ].map((opt) => (
            <label key={opt.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onTypeChange(opt.id)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  type === opt.id ? "border-[#c9a84c]" : "border-gray-300"
                }`}
                aria-pressed={type === opt.id}
              >
                {type === opt.id && <span className="w-2.5 h-2.5 rounded-full bg-[#c9a84c]" />}
              </button>
              <span className={type === opt.id ? "font-semibold text-gray-800" : ""}>{opt.label}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
          <span>العمولات والأرباح</span>
          <svg className="w-4 h-4 text-[#c9a84c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
      </div>
      <div className="relative">
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="أدخل قيمة العمولة"
          className={`${modalInputClass} pl-12 bg-white`}
          disabled={disabled}
          required
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
          {isCash ? "SR" : "%"}
        </span>
      </div>
    </div>
  );
}

export default function BrokerFormModal({ isOpen, onClose, brokerData, onSaved, onToast }) {
  const isEditing = Boolean(brokerData);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(false);
  /** search | form */
  const [step, setStep] = useState("search");
  const [fromDriver, setFromDriver] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");

  const resetAll = useCallback(() => {
    setForm({ ...EMPTY_FORM, broker_code: generateBrokerCode(), commission_type: "نقدي" });
    setStep("search");
    setFromDriver(false);
    setPhotoPreview("");
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (brokerData) {
      setForm({
        name: brokerData.name || "",
        phone: normalizeSaudiPhoneFromApi(brokerData.phone || ""),
        email: brokerData.email || "",
        address: brokerData.address || "",
        broker_code: brokerData.broker_code || "",
        commission: String(brokerData.commission ?? 5),
        commission_type: brokerData.commission_type || "نسبة مئوية",
        nationality: brokerData.nationality || "سعودي",
        identity_number: brokerData.identity_number || "",
        driver_id: brokerData.driver_id ? String(brokerData.driver_id) : "",
        notes: brokerData.notes || "",
        photo: null,
      });
      setPhotoPreview(brokerData.photo_url || "");
      setStep("form");
      setFromDriver(Boolean(brokerData.driver_id));
    } else {
      resetAll();
    }
  }, [isOpen, brokerData, resetAll]);

  useEffect(() => {
    if (!isOpen || isEditing) return;
    const ctrl = new AbortController();
    setDriversLoading(true);
    fetchAllDrivers(ctrl.signal)
      .then(setDrivers)
      .catch(() => setDrivers([]))
      .finally(() => setDriversLoading(false));
    return () => ctrl.abort();
  }, [isOpen, isEditing]);

  const phoneValidation = useMemo(() => validatePhoneTenDigits(form.phone), [form.phone]);
  const phoneInvalid = form.phone.length > 0 && !phoneValidation.valid;

  const u = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const fillFromDriver = (driver) => {
    if (!driver) {
      setFromDriver(false);
      setForm((p) => ({ ...p, driver_id: "" }));
      return;
    }
    const mapped = driverToForm(driver);
    setFromDriver(true);
    setStep("form");
    setPhotoPreview("");
    setForm((p) => ({
      ...p,
      ...mapped,
      photo: null,
      broker_code: p.broker_code || generateBrokerCode(),
      commission: p.commission || "5",
      commission_type: p.commission_type || "نقدي",
    }));
  };

  const startManualAdd = (queryHint = "") => {
    const digits = String(queryHint).replace(/\D/g, "").slice(-10);
    setFromDriver(false);
    setStep("form");
    setForm((p) => ({
      ...EMPTY_FORM,
      broker_code: generateBrokerCode(),
      commission_type: "نقدي",
      commission: "5",
      phone: digits.startsWith("5") ? sanitizePhoneInput(digits) : "",
    }));
  };

  const handlePhoto = (file) => {
    setForm((p) => ({ ...p, photo: file || null }));
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    } else {
      setPhotoPreview("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      onToast?.("error", "أدخل اسم الوسيط");
      return;
    }
    if (!form.broker_code.trim()) {
      onToast?.("error", "أدخل كود الوسيط");
      return;
    }
    if (!phoneValidation.valid) {
      onToast?.("error", phoneValidation.message || "رقم الهاتف غير صالح");
      return;
    }
    if (!form.identity_number.trim()) {
      onToast?.("error", "أدخل رقم الهوية");
      return;
    }
    if (form.commission === "" || Number(form.commission) < 0) {
      onToast?.("error", "أدخل قيمة العمولة");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        commission: Number(form.commission) || 0,
        commission_type: form.commission_type,
        identity_number: form.identity_number.trim(),
      };
      let saved;
      if (isEditing) {
        saved = await updateBroker(brokerData.id, payload);
        onToast?.("success", "تم تحديث بيانات الوسيط");
      } else {
        saved = await createBroker(payload);
        onToast?.("success", "تمت إضافة الوسيط بنجاح");
      }
      onSaved?.(saved);
      onClose();
    } catch (err) {
      onToast?.("error", err.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const showSearchStep = !isEditing && step === "search";

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "تعديل بيانات الوسيط" : "إضافة وسيط جديد"}
      isSubmitting={saving}
      size="lg"
    >
      {showSearchStep ? (
        <div className="space-y-4">
          <ModalField label="بحث عن سائق" hint="اكتب رقم الهاتف أو الاسم — لو موجود هتتملى البيانات">
            <DriverPhoneSearch
              drivers={drivers}
              loading={driversLoading}
              disabled={saving}
              selectedId={form.driver_id}
              onSelect={fillFromDriver}
              onAddBroker={startManualAdd}
            />
          </ModalField>
          <p className="text-xs text-gray-400 text-right leading-relaxed">
            لو لقيتِ سائق هيتملي الاسم والهاتف ورقم الهوية تلقائي، وتكمّلي الكود والعمولة والصورة.
            لو مفيش نتائج هيظهر زر «إضافة وسيط» عشان تدخلي البيانات يدوي.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={resetAll}
                className="text-xs text-[#c9a84c] font-semibold hover:underline"
              >
                رجوع للبحث
              </button>
              {fromDriver && (
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-50 text-[#c9a84c] font-semibold">
                  من بيانات سائق
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <ModalField label="اسم الوسيط" required>
              <input
                value={form.name}
                onChange={u("name")}
                placeholder="ادخل الاسم"
                className={modalInputClass}
                required
                disabled={saving}
              />
            </ModalField>
            <ModalField label="كود الوسيط" required>
              <input
                value={form.broker_code}
                onChange={u("broker_code")}
                placeholder="MED-0000#"
                className={modalInputClass}
                required
                disabled={saving}
                dir="ltr"
              />
            </ModalField>
            <ModalField label="رقم الهاتف" required>
              <div className="flex gap-2" dir="ltr">
                <span className="shrink-0 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600">+966</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: sanitizePhoneInput(e.target.value) }))}
                  placeholder="5xxxxxxxxx"
                  maxLength={10}
                  className={`${modalInputClass} ${phoneInvalid ? "border-red-300" : ""}`}
                  disabled={saving}
                />
              </div>
            </ModalField>
            <ModalField label="رقم الهوية" required>
              <input
                value={form.identity_number}
                onChange={u("identity_number")}
                placeholder="رقم الهوية"
                className={modalInputClass}
                required
                disabled={saving}
                dir="ltr"
              />
            </ModalField>
          </div>

          <CommissionCard
            type={form.commission_type}
            value={form.commission}
            onTypeChange={(t) => setForm((p) => ({ ...p, commission_type: t }))}
            onValueChange={(v) => setForm((p) => ({ ...p, commission: v }))}
            disabled={saving}
          />

          {!fromDriver && (
            <ModalField label="صورة الهوية">
              <label className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors ${saving ? "opacity-50 pointer-events-none" : ""}`}>
                {photoPreview ? (
                  <img src={photoPreview} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Upload className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                <span className="flex-1 text-right">{form.photo?.name || (photoPreview ? "تغيير صورة الهوية" : "اختر صورة الهوية")}</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  disabled={saving}
                  onChange={(e) => handlePhoto(e.target.files?.[0] ?? null)}
                />
              </label>
            </ModalField>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[#4a4746] py-3 text-sm font-semibold text-white hover:bg-[#383534] transition-all disabled:opacity-50"
          >
            {saving ? "جاري الحفظ..." : isEditing ? "حفظ التعديلات" : "إضافة وسيط"}
          </button>
        </form>
      )}
    </AppModal>
  );
}
