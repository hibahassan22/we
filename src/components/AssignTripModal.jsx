import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Upload } from "lucide-react";
import { useToast } from "../lib/toast";
import AppModal, { ModalField, modalInputClass } from "./ui/AppModal";
import { fetchTripDetailsById } from "../services/tripService.js";
import { fetchAllDrivers } from "../services/driverSaleChatService.js";
import { fetchBanks } from "../services/bankService.js";
import DriverFormModal from "./drivers/DriverFormModal.jsx";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { getDriverBankAccount } from "../lib/driverUtils.js";

const API_BASE = "https://drivo1.elmoroj.com/api";
const readOnlyInputClass = `${modalInputClass} bg-gray-50 text-gray-600 cursor-not-allowed`;

const EMPTY_FORM = {
  trip_id: "",
  driver_id: "",
  our_commission: "",
  total_price: "",
  paid_amount: "",
  recipient_type: "",
  transfer_method: "",
  sender_driver_id: "",
  recipient_driver_id: "",
  recipient_mode: "",
  cash_recipient_name: "",
  custom_sender_name: "",
  account_number: "",
  recipient_account: "",
  bank_id: "",
  bank_name: "",
  commission_transfer_date: "",
  notes: "",
  transfer_image: null,
};

function calcCommission15(priceVal) {
  const n = Number(priceVal);
  if (!Number.isFinite(n) || n < 0) return "";
  return String(Math.round(n * 0.15 * 100) / 100);
}

function getDriverName(driver) {
  return [driver?.name, driver?.last_name].filter(Boolean).join(" ").trim() || "—";
}

function getDriverPhone(driver) {
  return String(driver?.phone ?? "").trim();
}

function matchesDriverSearch(driver, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = getDriverName(driver).toLowerCase();
  const phone = getDriverPhone(driver).replace(/\s/g, "");
  const qDigits = q.replace(/\s/g, "");
  return name.includes(q) || (qDigits && phone.includes(qDigits));
}

function DriverSearchSelect({
  drivers,
  value,
  onChange,
  loading,
  disabled,
  placeholder = "ابحث بالاسم أو الرقم...",
  canAddDriver = false,
  onAddDriver,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = useMemo(
    () => drivers.find((d) => String(d.id) === String(value)),
    [drivers, value]
  );
  const selectedLabel = selected ? getDriverName(selected) : "";

  useEffect(() => {
    if (selected) setQuery(selectedLabel);
    else if (!open) setQuery("");
  }, [selected, selectedLabel, open]);

  const filtered = useMemo(() => {
    if (selected && query === selectedLabel) return drivers;
    return drivers.filter((d) => matchesDriverSearch(d, query));
  }, [drivers, query, selected, selectedLabel]);

  const isSearching = query.trim().length > 0 && (!selected || query !== selectedLabel);
  const showAddButton = canAddDriver && isSearching && filtered.length === 0 && !loading;

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
            if (selected && next !== selectedLabel) onChange("");
          }}
          onFocus={() => !disabled && setOpen(true)}
          disabled={disabled || loading}
          placeholder={loading ? "جاري تحميل السائقين..." : placeholder}
          className={modalInputClass}
          autoComplete="off"
        />
        {open && !disabled && !loading && (
          <ul className="absolute z-30 mt-1 w-full max-h-44 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2.5 text-xs text-gray-400 text-right">
                {isSearching ? "لا توجد نتائج" : "لا يوجد سائقون"}
              </li>
            ) : (
              filtered.map((driver) => (
                <li key={driver.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(String(driver.id));
                      setQuery(getDriverName(driver));
                      setOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 text-sm text-right hover:bg-amber-50 transition-colors ${
                      String(driver.id) === String(value) ? "bg-amber-50 text-[#c9a84c] font-medium" : "text-gray-700"
                    }`}
                  >
                    <span className="block">{getDriverName(driver)}</span>
                    {getDriverPhone(driver) && (
                      <span className="block text-[11px] text-gray-400 mt-0.5" dir="ltr">
                        {getDriverPhone(driver)}
                      </span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {showAddButton && (
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onAddDriver?.();
          }}
          className="shrink-0 px-3 py-2 rounded-xl border border-[#c9a84c] text-[#c9a84c] text-xs font-bold hover:bg-amber-50 transition-colors whitespace-nowrap"
        >
          + إضافة سائق
        </button>
      )}
    </div>
  );
}

function DateField({ value, onChange, disabled }) {
  const inputRef = useRef(null);
  const openPicker = () => {
    if (disabled) return;
    try {
      inputRef.current?.showPicker?.();
    } catch {
      /* ignore */
    }
    inputRef.current?.focus();
  };
  return (
    <div className="relative" onClick={openPicker}>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${modalInputClass} cursor-pointer`}
      />
    </div>
  );
}

/**
 * AssignTripModal — إسناد رحلة لسائق
 */
export default function AssignTripModal({
  isOpen,
  onClose,
  tripId: fixedTripId,
  driverId: fixedDriverId,
  driverName,
  tripTotalPrice,
  onSuccess,
}) {
  const toast = useToast();
  const { can } = usePermissions();
  const canAddDriver = can(PERMISSIONS.DRIVERS_CREATE);

  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [commissionManual, setCommissionManual] = useState(false);
  const [useOtherSender, setUseOtherSender] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const pendingDriverSelectRef = useRef(null);

  const fromDriverPage = Boolean(fixedDriverId);
  const fromTripPage = Boolean(fixedTripId);

  const isOurAccount = form.recipient_type === "حسابنا";
  const isOtherRecipient = form.recipient_type === "غير";
  const isBankTransfer = isOurAccount && form.transfer_method === "تحويل بنكي";
  const isCash = isOurAccount && form.transfer_method === "كاش";
  const isPaymentGateway = isOurAccount && form.transfer_method === "بوابة دفع";

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const applyPriceAndCommission = useCallback((priceVal, keepManual = false) => {
    setForm((p) => ({
      ...p,
      total_price: priceVal != null && priceVal !== "" ? String(priceVal) : "",
      our_commission: keepManual ? p.our_commission : calcCommission15(priceVal),
    }));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setShowConfirm(false);
    setCommissionManual(false);
    setUseOtherSender(false);
    setForm({
      ...EMPTY_FORM,
      trip_id: fixedTripId ? String(fixedTripId) : "",
      driver_id: fixedDriverId ? String(fixedDriverId) : "",
      transfer_image: null,
    });

    const ctrl = new AbortController();
    setDriversLoading(true);
    fetchAllDrivers(ctrl.signal)
      .then(setDrivers)
      .catch(() => setDrivers([]))
      .finally(() => setDriversLoading(false));

    setBanksLoading(true);
    fetchBanks(ctrl.signal)
      .then(setBanks)
      .catch(() => setBanks([]))
      .finally(() => setBanksLoading(false));

    const tripIdToLoad = fixedTripId;
    if (tripIdToLoad) {
      fetchTripDetailsById(tripIdToLoad)
        .then(({ trip }) => {
          const price = trip?.total_price ?? trip?.price ?? tripTotalPrice ?? "";
          applyPriceAndCommission(price);
        })
        .catch(() => {
          if (tripTotalPrice != null && tripTotalPrice !== "") {
            applyPriceAndCommission(tripTotalPrice);
          }
        });
    } else if (tripTotalPrice != null && tripTotalPrice !== "") {
      applyPriceAndCommission(tripTotalPrice);
    }

    return () => ctrl.abort();
  }, [isOpen, fixedTripId, fixedDriverId, tripTotalPrice, applyPriceAndCommission]);

  const selectedAssignDriver = useMemo(
    () => drivers.find((d) => String(d.id) === String(form.driver_id)),
    [drivers, form.driver_id]
  );

  const assignDriverName = fromDriverPage
    ? driverName || ""
    : selectedAssignDriver
      ? getDriverName(selectedAssignDriver)
      : "";

  const selectedSender = useMemo(
    () => drivers.find((d) => String(d.id) === String(form.sender_driver_id)),
    [drivers, form.sender_driver_id]
  );

  // المرسل الافتراضي = السائق المُسنَد
  useEffect(() => {
    if (!isOpen || useOtherSender) return;
    if (!(isBankTransfer || isPaymentGateway || isOtherRecipient)) return;
    const id = form.driver_id || (fixedDriverId ? String(fixedDriverId) : "");
    if (!id) return;
    const driver =
      drivers.find((d) => String(d.id) === String(id)) ||
      (fromDriverPage ? { id: fixedDriverId, name: driverName } : null);
    setForm((p) => ({
      ...p,
      sender_driver_id: id,
      account_number: driver ? getDriverBankAccount(driver) || p.account_number : p.account_number,
      custom_sender_name: "",
    }));
  }, [
    isOpen,
    useOtherSender,
    isBankTransfer,
    isPaymentGateway,
    isOtherRecipient,
    form.driver_id,
    fixedDriverId,
    drivers,
    fromDriverPage,
    driverName,
  ]);

  const openAddDriver = (onSelect) => {
    pendingDriverSelectRef.current = onSelect;
    setShowAddDriver(true);
  };

  const handleDriverCreated = async (created) => {
    const createdId =
      created?.id != null ? String(created.id) : created != null ? String(created) : null;
    const selectFn = pendingDriverSelectRef.current;
    try {
      const list = await fetchAllDrivers();
      setDrivers(list);
      if (createdId && selectFn) selectFn(createdId);
    } catch {
      if (createdId && selectFn) selectFn(createdId);
    } finally {
      pendingDriverSelectRef.current = null;
      setShowAddDriver(false);
    }
  };

  const handlePriceChange = (val) => {
    setForm((p) => ({
      ...p,
      total_price: val,
      our_commission: commissionManual ? p.our_commission : calcCommission15(val),
    }));
  };

  const handleCommissionChange = (val) => {
    setCommissionManual(true);
    set("our_commission", val);
  };

  const handleRecipientTypeChange = (type) => {
    setUseOtherSender(false);
    setForm((p) => ({
      ...p,
      recipient_type: type,
      transfer_method: "",
      sender_driver_id: "",
      recipient_driver_id: "",
      recipient_mode: "",
      cash_recipient_name: "",
      custom_sender_name: "",
      account_number: "",
      recipient_account: "",
      bank_id: "",
      bank_name: "",
      commission_transfer_date: "",
      transfer_image: null,
    }));
  };

  const handleTransferMethodChange = (method) => {
    setUseOtherSender(false);
    const tripDriverId = form.driver_id || (fixedDriverId ? String(fixedDriverId) : "");
    setForm((p) => ({
      ...p,
      transfer_method: method,
      sender_driver_id: method === "تحويل بنكي" || method === "بوابة دفع" ? tripDriverId : "",
      recipient_driver_id: "",
      recipient_mode: "",
      cash_recipient_name: "",
      custom_sender_name: "",
      bank_id: "",
      bank_name: "",
      recipient_account: "",
      commission_transfer_date: "",
      transfer_image: null,
    }));
  };

  const handleSenderChange = (driverId) => {
    const driver = drivers.find((d) => String(d.id) === String(driverId));
    setForm((p) => ({
      ...p,
      sender_driver_id: driverId,
      custom_sender_name: driver ? getDriverName(driver) : p.custom_sender_name,
      account_number: driver ? getDriverBankAccount(driver) : "",
    }));
  };

  const enableOtherSender = () => {
    setUseOtherSender(true);
    setForm((p) => ({
      ...p,
      sender_driver_id: "",
      custom_sender_name: "",
      account_number: "",
    }));
  };

  const restoreTripSender = () => {
    setUseOtherSender(false);
    const id = form.driver_id || (fixedDriverId ? String(fixedDriverId) : "");
    if (!id) return;
    const driver =
      drivers.find((d) => String(d.id) === String(id)) ||
      (fromDriverPage ? { id: fixedDriverId, name: driverName } : null);
    setForm((p) => ({
      ...p,
      sender_driver_id: id,
      custom_sender_name: "",
      account_number: driver ? getDriverBankAccount(driver) || "" : "",
    }));
  };

  const handleBankChange = (bankId) => {
    const bank = banks.find((b) => String(b.id) === String(bankId));
    setForm((p) => ({
      ...p,
      bank_id: bankId,
      bank_name: bank?.name ?? "",
      recipient_account: bank?.bank_number ?? p.recipient_account,
    }));
  };

  const resolvedTripId = fromTripPage ? String(fixedTripId) : form.trip_id.trim();
  const resolvedDriverId = fromDriverPage ? String(fixedDriverId) : form.driver_id;

  const resolveSenderName = () => {
    if (useOtherSender) {
      return (
        form.custom_sender_name.trim() ||
        (selectedSender ? getDriverName(selectedSender) : "")
      );
    }
    return assignDriverName || (selectedSender ? getDriverName(selectedSender) : "");
  };

  const handleSubmit = async () => {
    if (!resolvedTripId) {
      toast.error("يرجى إدخال رقم الرحلة");
      return;
    }
    if (!resolvedDriverId) {
      toast.error("يرجى اختيار السائق");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("driver_id", resolvedDriverId);
      if (form.our_commission) fd.append("our_commission", form.our_commission);
      if (form.total_price) fd.append("total_price", form.total_price);
      if (form.paid_amount) fd.append("paid_amount", form.paid_amount);
      if (form.recipient_type) fd.append("recipient_type", form.recipient_type);
      if (form.transfer_method) fd.append("transfer_method", form.transfer_method);
      if (form.sender_driver_id) fd.append("sender_driver_id", form.sender_driver_id);
      if (form.recipient_driver_id) fd.append("recipient_driver_id", form.recipient_driver_id);
      if (form.recipient_mode) fd.append("recipient_mode", form.recipient_mode);
      if (form.cash_recipient_name) fd.append("recipient_name", form.cash_recipient_name);
      if (form.bank_name) fd.append("bank_name", form.bank_name);
      if (form.bank_id) fd.append("bank_id", form.bank_id);
      if (form.account_number) fd.append("from_account", form.account_number);
      if (form.recipient_account) fd.append("to_account", form.recipient_account);
      if (form.commission_transfer_date) fd.append("payment_date", form.commission_transfer_date);
      const senderName = resolveSenderName();
      if (senderName) fd.append("sender_name", senderName);
      if (form.notes) fd.append("notes", form.notes);
      if (form.transfer_image) fd.append("transfer_image", form.transfer_image);

      const res = await fetch(`${API_BASE}/trips/${resolvedTripId}/assign-driver`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || json?.message || `خطأ ${res.status}`);

      toast.success(json.message || "تم إسناد الرحلة بنجاح");
      window.dispatchEvent(new CustomEvent("trips-list-refresh"));

      const selectedDriver = fromDriverPage
        ? { id: fixedDriverId, name: driverName }
        : drivers.find((d) => String(d.id) === resolvedDriverId);

      onSuccess?.({
        ...json,
        trip_id: resolvedTripId,
        driver_id: resolvedDriverId,
        driver: json?.driver ?? json?.data?.driver ?? selectedDriver ?? null,
      });
      onClose();
    } catch (err) {
      toast.error(err.message || "حدث خطأ أثناء الإسناد");
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const inputCls = `${modalInputClass} text-right`;
  const driverSelectProps = {
    drivers,
    loading: driversLoading,
    disabled: loading,
    canAddDriver,
  };

  const renderSenderField = (label = "اسم المرسل") => (
    <ModalField label={label} required>
      {!useOtherSender ? (
        <div className="flex gap-2 items-stretch">
          <input
            type="text"
            value={assignDriverName || "—"}
            readOnly
            className={`${readOnlyInputClass} flex-1`}
            placeholder="اختر السائق أولاً"
          />
          <button
            type="button"
            onClick={enableOtherSender}
            disabled={loading}
            className="shrink-0 px-3 py-2 rounded-xl border border-[#c9a84c] text-[#c9a84c] text-xs font-bold hover:bg-amber-50 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            مرسل آخر
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={restoreTripSender}
            disabled={loading || !(form.driver_id || fixedDriverId)}
            className="text-[11px] text-[#c9a84c] font-semibold hover:underline disabled:opacity-40"
          >
            الرجوع لسائق الإسناد
          </button>
          <input
            type="text"
            value={form.custom_sender_name}
            onChange={(e) => set("custom_sender_name", e.target.value)}
            placeholder="اكتب اسم المرسل..."
            className={inputCls}
            disabled={loading}
          />
          <DriverSearchSelect
            {...driverSelectProps}
            value={form.sender_driver_id}
            onChange={handleSenderChange}
            placeholder="أو ابحث واختر سائق..."
            onAddDriver={() => openAddDriver(handleSenderChange)}
          />
        </div>
      )}
    </ModalField>
  );

  if (showConfirm) {
    return (
      <AppModal
        isOpen={isOpen}
        onClose={() => setShowConfirm(false)}
        title="تأكيد الإسناد"
        isSubmitting={loading}
        size="sm"
      >
        <p className="text-sm text-gray-700 text-center py-2 leading-relaxed">
          هل تريد إسناد الرحلة #{resolvedTripId}
          {assignDriverName ? ` إلى السائق ${assignDriverName}` : ""}؟
        </p>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-[#4a4644] text-white text-sm font-semibold hover:bg-black transition-colors disabled:opacity-60"
          >
            {loading ? "جاري الإسناد..." : "نعم، تأكيد"}
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(false)}
            disabled={loading}
            className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </AppModal>
    );
  }

  return (
    <>
      <AppModal
        isOpen={isOpen}
        onClose={onClose}
        title="إسناد رحلة"
        subtitle={fromDriverPage && driverName ? `السائق: ${driverName}` : undefined}
        size="lg"
        footer={
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="w-full py-3 text-sm font-bold text-white rounded-xl bg-[#4a4644] hover:bg-black transition-colors"
          >
            إسناد الرحلة
          </button>
        }
      >
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 shadow-sm">
            <h4 className="text-sm font-bold text-[#c9a84c] text-right">معلومات الإسناد</h4>

            {fromDriverPage ? (
              <>
                <ModalField label="السائق">
                  <input type="text" value={driverName || fixedDriverId} readOnly className={`${inputCls} bg-gray-50`} />
                </ModalField>
                <ModalField label="رقم الرحلة" required>
                  <input
                    type="number"
                    placeholder="مثال: 297"
                    value={form.trip_id}
                    onChange={(e) => {
                      set("trip_id", e.target.value);
                    }}
                    onBlur={() => {
                      const id = form.trip_id.trim();
                      if (!id) return;
                      fetchTripDetailsById(id)
                        .then(({ trip }) => {
                          const price = trip?.total_price ?? trip?.price ?? "";
                          if (price !== "") applyPriceAndCommission(price, commissionManual);
                        })
                        .catch(() => {});
                    }}
                    className={inputCls}
                  />
                </ModalField>
              </>
            ) : (
              <>
                <ModalField label="رقم الرحلة">
                  <input type="text" value={`#${fixedTripId}`} readOnly className={`${inputCls} bg-gray-50`} />
                </ModalField>
                <ModalField label="اختر السائق" required>
                  <DriverSearchSelect
                    {...driverSelectProps}
                    value={form.driver_id}
                    onChange={(id) => set("driver_id", id)}
                    onAddDriver={() => openAddDriver((id) => set("driver_id", id))}
                  />
                </ModalField>
              </>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3 shadow-sm">
            <h4 className="text-sm font-bold text-[#c9a84c] text-right">التفاصيل المالية</h4>
            <div className="grid grid-cols-2 gap-3">
              <ModalField label="سعر الرحلة">
                <input
                  type="number"
                  placeholder="السعر الكامل"
                  value={form.total_price}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className={inputCls}
                />
              </ModalField>
              <ModalField label="عمولتنا (15%)">
                <input
                  type="number"
                  placeholder="تُحسب تلقائياً"
                  value={form.our_commission}
                  onChange={(e) => handleCommissionChange(e.target.value)}
                  className={inputCls}
                />
              </ModalField>
              <ModalField label="المبلغ المدفوع">
                <input
                  type="number"
                  placeholder="المدفوع"
                  value={form.paid_amount}
                  onChange={(e) => set("paid_amount", e.target.value)}
                  className={inputCls}
                />
              </ModalField>
              <ModalField label="نوع المستلم">
                <select
                  value={form.recipient_type}
                  onChange={(e) => handleRecipientTypeChange(e.target.value)}
                  className={`${inputCls} appearance-none`}
                >
                  <option value="">اختر</option>
                  <option value="حسابنا">حسابنا</option>
                  <option value="غير">غير</option>
                </select>
              </ModalField>
            </div>

            {isOurAccount && (
              <ModalField label="طريقة الدفع">
                <select
                  value={form.transfer_method}
                  onChange={(e) => handleTransferMethodChange(e.target.value)}
                  className={`${inputCls} appearance-none`}
                >
                  <option value="">اختر</option>
                  <option value="تحويل بنكي">تحويل بنكي</option>
                  <option value="كاش">كاش</option>
                  <option value="بوابة دفع">بوابة دفع</option>
                </select>
              </ModalField>
            )}

            {(isBankTransfer || isPaymentGateway) && (
              <div className="space-y-3">
                <ModalField label="تاريخ التحويل">
                  <DateField
                    value={form.commission_transfer_date}
                    onChange={(v) => set("commission_transfer_date", v)}
                    disabled={loading}
                  />
                </ModalField>
                {renderSenderField()}
                {isBankTransfer && (
                  <ModalField label="اسم البنك المستلم">
                    <select
                      value={form.bank_id}
                      onChange={(e) => handleBankChange(e.target.value)}
                      className={`${inputCls} appearance-none`}
                      disabled={loading || banksLoading}
                    >
                      <option value="">
                        {banksLoading
                          ? "جاري تحميل البنوك..."
                          : banks.length
                            ? "اختر البنك"
                            : "لا توجد بنوك — أضفها من إدارة النظام"}
                      </option>
                      {banks.map((bank) => (
                        <option key={bank.id} value={bank.id}>
                          {bank.name}
                        </option>
                      ))}
                    </select>
                  </ModalField>
                )}
                <ModalField label="صورة التحويل">
                  <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50">
                    <Upload className="w-4 h-4 text-gray-400" />
                    <span>{form.transfer_image ? form.transfer_image.name : "اختر الملف"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => set("transfer_image", e.target.files?.[0] ?? null)}
                    />
                  </label>
                </ModalField>
              </div>
            )}

            {isCash && (
              <div className="space-y-3">
                <ModalField label="تاريخ الاستلام">
                  <DateField
                    value={form.commission_transfer_date}
                    onChange={(v) => set("commission_transfer_date", v)}
                    disabled={loading}
                  />
                </ModalField>
                <ModalField label="اسم السائق">
                  <div className="flex gap-2 items-stretch">
                    <input
                      type="text"
                      value={assignDriverName || "—"}
                      readOnly
                      className={`${readOnlyInputClass} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={enableOtherSender}
                      disabled={loading}
                      className="shrink-0 px-3 py-2 rounded-xl border border-[#c9a84c] text-[#c9a84c] text-xs font-bold hover:bg-amber-50 transition-colors whitespace-nowrap"
                    >
                      مرسل آخر
                    </button>
                  </div>
                  {useOtherSender && (
                    <div className="mt-2 space-y-2">
                      <button
                        type="button"
                        onClick={restoreTripSender}
                        className="text-[11px] text-[#c9a84c] font-semibold hover:underline"
                      >
                        الرجوع لسائق الإسناد
                      </button>
                      <DriverSearchSelect
                        {...driverSelectProps}
                        value={form.sender_driver_id}
                        onChange={handleSenderChange}
                        onAddDriver={() => openAddDriver(handleSenderChange)}
                      />
                    </div>
                  )}
                </ModalField>
                <ModalField label="اسم المستلم">
                  <input
                    type="text"
                    value={form.cash_recipient_name}
                    onChange={(e) => set("cash_recipient_name", e.target.value)}
                    placeholder="ادخل اسم المستلم"
                    className={inputCls}
                  />
                </ModalField>
              </div>
            )}

            {isOtherRecipient && (
              <div className="space-y-3">
                {renderSenderField("اسم المرسل")}
                <ModalField label="اسم المستلم">
                  <div className="flex gap-2 mb-2">
                    {["استرداد", "بعمولة"].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            recipient_mode: mode,
                            recipient_driver_id: "",
                          }))
                        }
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                          form.recipient_mode === mode
                            ? "bg-[#c9a84c] text-white shadow-sm"
                            : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  {form.recipient_mode ? (
                    <DriverSearchSelect
                      drivers={drivers}
                      loading={driversLoading}
                      disabled={loading}
                      canAddDriver={false}
                      value={form.recipient_driver_id}
                      onChange={(id) => set("recipient_driver_id", id)}
                      placeholder={`ابحث عن مستلم (${form.recipient_mode})...`}
                    />
                  ) : (
                    <p className="text-xs text-gray-400 text-right">اختر استرداد أو بعمولة أولاً</p>
                  )}
                </ModalField>
              </div>
            )}

            <ModalField label="ملاحظات" hint="اختياري">
              <textarea
                rows={2}
                placeholder="ملاحظة (اختياري)"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </ModalField>
          </div>
        </div>
      </AppModal>

      <DriverFormModal
        isOpen={showAddDriver}
        onClose={() => {
          setShowAddDriver(false);
          pendingDriverSelectRef.current = null;
        }}
        driverData={null}
        onSaved={handleDriverCreated}
        onToast={(type, message) => toast[type](message)}
        stackAbove
      />
    </>
  );
}
