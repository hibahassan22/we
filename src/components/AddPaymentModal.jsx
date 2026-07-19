import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Upload } from "lucide-react";
import { toast } from "../lib/toast";
import AppModal, { ModalField, modalInputClass } from "./ui/AppModal";
import { addTripPayment, fetchTripDetailsById } from "../services/tripService.js";
import { fetchAllDrivers } from "../services/driverSaleChatService.js";
import { fetchBanks, applyBankSelection, getActiveBanks } from "../services/bankService.js";
import BankReadOnlyFields from "./ui/BankReadOnlyFields.jsx";
import DriverFormModal from "./drivers/DriverFormModal.jsx";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { getDriverBankAccount } from "../lib/driverUtils.js";
import { getDriverBankingData, saveDriverBankingData } from "../lib/driverBanking.js";

const readOnlyInputClass = `${modalInputClass} bg-gray-50 text-gray-600 cursor-not-allowed`;

const createEmptyForm = (totalPrice = "") => ({
  total_price: totalPrice,
  amount_paid: "",
  recipient_type: "",
  transfer_method: "",
  driver_id: "",
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
  payment_note: "",
  transfer_image: null,
  driver_balance: "",
  driver_banking_status: "",
});

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
    if (selected) {
      setQuery(selectedLabel);
    } else if (!open) {
      setQuery("");
    }
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

  const handleInputChange = (e) => {
    const next = e.target.value;
    setQuery(next);
    setOpen(true);
    if (selected && next !== selectedLabel) {
      onChange("");
    }
  };

  const handleSelect = (driver) => {
    onChange(String(driver.id));
    setQuery(getDriverName(driver));
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="flex gap-2 items-stretch">
      <div className="relative flex-1 min-w-0">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => !disabled && setOpen(true)}
          disabled={disabled || loading}
          placeholder={loading ? "جاري تحميل السائقين..." : placeholder}
          className={modalInputClass}
          autoComplete="off"
        />
        <div className="absolute left-3 top-3 pointer-events-none text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
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
                    onClick={() => handleSelect(driver)}
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

  const openPicker = (e) => {
    if (disabled) return;
    const el = inputRef.current;
    if (!el) return;
    try {
      el.showPicker?.();
    } catch {
      /* fallback: native date input still works on focus */
    }
    if (e?.target !== el) el.focus();
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
 * AddPaymentModal — إضافة دفعة لرحلة من سجل الرحلات
 *
 * التدفق:
 * 1. السعر الكلي (من الرحلة، قابل للتعديل) + المبلغ المدفوع
 * 2. نوع المستلم: حسابنا | غير
 * 3. لو حسابنا → طريقة الدفع: تحويل بنكي | كاش | بوابة دفع
 * 4. تحويل بنكي → تاريخ + اسم المرسل (بحث سائق) + بنك مستلم + ملاحظات
 */
export default function AddPaymentModal({ isOpen, onClose, tripId, tripTotalPrice, onSuccess }) {
  const { can } = usePermissions();
  const canAddDriver = can(PERMISSIONS.DRIVERS_CREATE);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(createEmptyForm);
  const [drivers, setDrivers] = useState([]);
  const [banks, setBanks] = useState([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [banksLoading, setBanksLoading] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [useOtherSender, setUseOtherSender] = useState(false);
  const [assignedDriver, setAssignedDriver] = useState(null);
  const pendingDriverSelectRef = useRef(null);
  const wasOpenRef = useRef(false);

  const isOurAccount = formData.recipient_type === "حسابنا";
  const isBalanceRecipient = formData.recipient_type === "رصيد";
  const isBankTransfer = isOurAccount && formData.transfer_method === "تحويل بنكي";
  const isCash = isOurAccount && formData.transfer_method === "كاش";
  const isPaymentGateway = isOurAccount && formData.transfer_method === "بوابة دفع";

  const loadDrivers = useCallback(async (signal) => {
    setDriversLoading(true);
    try {
      const list = await fetchAllDrivers(signal);
      setDrivers(list);
    } catch {
      setDrivers([]);
    } finally {
      setDriversLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const ctrl = new AbortController();
    loadDrivers(ctrl.signal);
    setBanksLoading(true);
    fetchBanks(ctrl.signal)
      .then(setBanks)
      .catch(() => setBanks([]))
      .finally(() => setBanksLoading(false));

    if (tripId) {
      fetchTripDetailsById(tripId)
        .then(({ trip }) => {
          const price = trip?.total_price ?? trip?.price ?? tripTotalPrice;
          const driver = trip?.driver ?? null;
          const driverId = driver?.id ?? trip?.driver_id ?? null;
          if (driver || driverId) {
            setAssignedDriver(driver ?? { id: driverId });
          } else {
            setAssignedDriver(null);
          }
          setFormData((p) => ({
            ...p,
            total_price: p.total_price || (price != null && price !== "" ? String(price) : ""),
            sender_driver_id:
              p.sender_driver_id || (driverId != null ? String(driverId) : ""),
          }));
        })
        .catch(() => setAssignedDriver(null));
    } else {
      setAssignedDriver(null);
    }

    return () => ctrl.abort();
  }, [isOpen, tripId, loadDrivers, tripTotalPrice]);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const seed =
        tripTotalPrice != null && tripTotalPrice !== ""
          ? String(tripTotalPrice)
          : "";
      setFormData(createEmptyForm(seed));
      setUseOtherSender(false);
      setAssignedDriver(null);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, tripId, tripTotalPrice]);

  const resolvedAssignedDriver = useMemo(() => {
    if (!assignedDriver) return null;
    return drivers.find((d) => String(d.id) === String(assignedDriver.id)) || assignedDriver;
  }, [assignedDriver, drivers]);

  const tripSenderName = resolvedAssignedDriver ? getDriverName(resolvedAssignedDriver) : "";

  useEffect(() => {
    if (!isOpen || !resolvedAssignedDriver) return;
    const banking = getDriverBankingData(resolvedAssignedDriver);
    setFormData((current) => ({
      ...current,
      driver_balance: String(banking.balance),
      driver_banking_status: banking.bankingStatus,
    }));
  }, [isOpen, resolvedAssignedDriver]);

  const handleAssignedBalanceChange = (value) => {
    const balance = Math.max(0, Number(value) || 0);
    setFormData((current) => ({
      ...current,
      driver_balance: value,
      driver_banking_status: balance > 0 ? "غير مؤهل" : "مؤهل",
    }));
  };

  const selectedSender = useMemo(
    () => drivers.find((d) => String(d.id) === String(formData.sender_driver_id)),
    [drivers, formData.sender_driver_id]
  );

  const selectedCashDriver = useMemo(
    () => drivers.find((d) => String(d.id) === String(formData.driver_id)),
    [drivers, formData.driver_id]
  );

  const selectedRecipient = useMemo(
    () => drivers.find((d) => String(d.id) === String(formData.recipient_driver_id)),
    [drivers, formData.recipient_driver_id]
  );

  const isOtherRecipient = formData.recipient_type === "غير";

  const selectedBank = useMemo(
    () => banks.find((b) => String(b.id) === String(formData.bank_id)),
    [banks, formData.bank_id],
  );

  useEffect(() => {
    if (!isOpen || !isBankTransfer || banksLoading) return;
    const activeBanks = getActiveBanks(banks);
    if (!activeBanks.length) return;
    setFormData((current) => {
      if (current.bank_id && activeBanks.some((b) => String(b.id) === String(current.bank_id))) {
        return current;
      }
      return { ...current, ...applyBankSelection(activeBanks[0]) };
    });
  }, [isOpen, isBankTransfer, banks, banksLoading]);

  // املأ سائق الرحلة تلقائياً في: تحويل بنكي / بوابة دفع / كاش / غير — إن لم يُفعَّل «مرسل آخر»
  useEffect(() => {
    if (!isOpen || useOtherSender || !resolvedAssignedDriver?.id) return;
    const needsTripSender = isBankTransfer || isPaymentGateway || isCash || isOtherRecipient;
    if (!needsTripSender) return;
    const id = String(resolvedAssignedDriver.id);
    const account = getDriverBankAccount(resolvedAssignedDriver) || "";
    setFormData((p) => ({
      ...p,
      sender_driver_id: id,
      driver_id: isCash ? id : p.driver_id,
      account_number: account || p.account_number,
      custom_sender_name: "",
    }));
  }, [
    isOpen,
    isBankTransfer,
    isPaymentGateway,
    isCash,
    isOtherRecipient,
    useOtherSender,
    resolvedAssignedDriver,
  ]);

  const set = (key, val) => setFormData((p) => ({ ...p, [key]: val }));

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
      const pickId =
        createdId && list.some((d) => String(d.id) === createdId)
          ? createdId
          : createdId ?? null;
      if (pickId && selectFn) selectFn(pickId);
    } catch {
      if (createdId && selectFn) selectFn(createdId);
    } finally {
      pendingDriverSelectRef.current = null;
      setShowAddDriver(false);
    }
  };

  const resetMethodFields = (extra = {}) => ({
    sender_driver_id: "",
    driver_id: "",
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
    ...extra,
  });

  const handleRecipientTypeChange = (type) => {
    setUseOtherSender(false);
    setFormData((p) => ({
      ...p,
      recipient_type: type,
      transfer_method: "",
      ...resetMethodFields(),
    }));
  };

  const handleTransferMethodChange = (method) => {
    setUseOtherSender(false);
    const tripIdStr = resolvedAssignedDriver?.id != null ? String(resolvedAssignedDriver.id) : "";
    const usesTripSender =
      method === "تحويل بنكي" || method === "بوابة دفع" || method === "كاش";
    setFormData((p) => ({
      ...p,
      transfer_method: method,
      ...resetMethodFields({
        sender_driver_id: usesTripSender ? tripIdStr : "",
        driver_id: method === "كاش" ? tripIdStr : "",
        account_number:
          usesTripSender && resolvedAssignedDriver
            ? getDriverBankAccount(resolvedAssignedDriver)
            : "",
      }),
    }));
  };

  const handleSenderChange = (driverId) => {
    const driver = drivers.find((d) => String(d.id) === String(driverId));
    setFormData((p) => ({
      ...p,
      sender_driver_id: driverId,
      driver_id: isCash ? driverId : p.driver_id,
      custom_sender_name: driver ? getDriverName(driver) : p.custom_sender_name,
      account_number: driver ? getDriverBankAccount(driver) : "",
    }));
  };

  const enableOtherSender = () => {
    setUseOtherSender(true);
    setFormData((p) => ({
      ...p,
      sender_driver_id: "",
      driver_id: isCash ? "" : p.driver_id,
      custom_sender_name: "",
      account_number: "",
    }));
  };

  const restoreTripSender = () => {
    setUseOtherSender(false);
    if (resolvedAssignedDriver?.id) {
      const id = String(resolvedAssignedDriver.id);
      setFormData((p) => ({
        ...p,
        sender_driver_id: id,
        driver_id: isCash ? id : p.driver_id,
        custom_sender_name: "",
        account_number: getDriverBankAccount(resolvedAssignedDriver) || "",
      }));
    }
  };

  const handleRecipientModeChange = (mode) => {
    setFormData((p) => ({
      ...p,
      recipient_mode: mode,
      recipient_driver_id: "",
    }));
  };

  const handleClose = useCallback(() => {
    setFormData(createEmptyForm());
    setUseOtherSender(false);
    setAssignedDriver(null);
    pendingDriverSelectRef.current = null;
    setShowAddDriver(false);
    onClose();
  }, [onClose]);

  const resolveSenderName = () => {
    if (isBankTransfer || isPaymentGateway || isCash || isOtherRecipient) {
      if (useOtherSender) {
        return (
          formData.custom_sender_name.trim() ||
          (selectedSender ? getDriverName(selectedSender) : "") ||
          (selectedCashDriver ? getDriverName(selectedCashDriver) : "")
        );
      }
      return tripSenderName;
    }
    return "";
  };

  const validateTripOrOtherSender = (label = "المرسل") => {
    if (useOtherSender) {
      const hasCustom = formData.custom_sender_name.trim();
      const hasDriver = formData.sender_driver_id || (isCash && formData.driver_id);
      if (!hasCustom && !hasDriver) {
        toast.error(`اختر أو اكتب اسم ${label}`);
        return false;
      }
      return true;
    }
    if (!resolvedAssignedDriver && !formData.sender_driver_id && !(isCash && formData.driver_id)) {
      toast.error("لا يوجد سائق مسند للرحلة");
      return false;
    }
    return true;
  };

  const handleRecipientDriverChange = (driverId) => {
    setFormData((p) => ({
      ...p,
      recipient_driver_id: driverId,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tripId) {
      toast.error("معرّف الرحلة غير متوفر");
      return;
    }
    if (!formData.amount_paid || isSubmitting) return;

    if (!formData.recipient_type) {
      toast.error("اختر نوع المستلم");
      return;
    }

    if (isOurAccount && !formData.transfer_method) {
      toast.error("اختر طريقة الدفع");
      return;
    }

    if (isBankTransfer) {
      if (!formData.commission_transfer_date) {
        toast.error("اختر تاريخ التحويل");
        return;
      }
      if (!validateTripOrOtherSender()) return;
      if (!formData.bank_id) {
        toast.error("اختر اسم البنك المستلم");
        return;
      }
    }

    if (isPaymentGateway) {
      if (!formData.commission_transfer_date) {
        toast.error("اختر تاريخ التحويل");
        return;
      }
      if (!validateTripOrOtherSender()) return;
    }

    if (isCash) {
      if (!formData.commission_transfer_date) {
        toast.error("اختر تاريخ الاستلام");
        return;
      }
      if (!validateTripOrOtherSender("السائق")) return;
      if (!formData.cash_recipient_name.trim()) {
        toast.error("أدخل اسم المستلم");
        return;
      }
    }

    if (isOtherRecipient) {
      if (!validateTripOrOtherSender("المرسل")) return;
      if (!formData.recipient_mode) {
        toast.error("اختر استرداد أو بعمولة");
        return;
      }
      if (!formData.recipient_driver_id) {
        toast.error("اختر اسم المستلم");
        return;
      }
    }

    const senderAccount = formData.account_number?.trim() || "";
    const recipientAccount = isCash
      ? formData.cash_recipient_name.trim()
      : isOtherRecipient
        ? (selectedRecipient ? getDriverName(selectedRecipient) : "")
        : formData.recipient_account?.trim() || formData.bank_name || "";

    const payload = {
      ...formData,
      account_number: senderAccount,
      from_account: senderAccount,
      recipient_account: recipientAccount,
      to_account: recipientAccount,
      sender_driver_id: formData.sender_driver_id || undefined,
      driver_id: formData.driver_id || formData.sender_driver_id || undefined,
      recipient_driver_id: formData.recipient_driver_id || undefined,
      recipient_mode: formData.recipient_mode || undefined,
      sender_name: resolveSenderName() || undefined,
      recipient_name: isOtherRecipient
        ? (selectedRecipient ? getDriverName(selectedRecipient) : undefined)
        : formData.cash_recipient_name || undefined,
    };

    setIsSubmitting(true);
    try {
      const json = await addTripPayment(tripId, payload);

      const driverId = resolvedAssignedDriver?.id ?? formData.sender_driver_id ?? formData.driver_id;
      if (driverId) {
        saveDriverBankingData(driverId, {
          balance: formData.driver_balance,
          bankingStatus: formData.driver_banking_status,
        });
      }

      toast.success(json.message || "تمت إضافة الدفعة بنجاح");
      onSuccess?.(json, {
        amount_paid: formData.amount_paid,
        total_price: formData.total_price,
        transfer_method: formData.transfer_method,
        account_number: senderAccount,
        sender_name: resolveSenderName(),
        recipient_type: formData.recipient_type,
        sender_driver_id: formData.sender_driver_id,
        driver_id: formData.driver_id,
        driver_name: selectedCashDriver ? getDriverName(selectedCashDriver) : "",
        recipient_name: isOtherRecipient
          ? (selectedRecipient ? getDriverName(selectedRecipient) : "")
          : formData.cash_recipient_name,
        recipient_driver_id: formData.recipient_driver_id,
        recipient_account: recipientAccount,
        bank_name: formData.bank_name,
        commission_transfer_date: formData.commission_transfer_date,
        recipient_mode: formData.recipient_mode,
        transfer_image: formData.transfer_image,
        payment_note: formData.payment_note,
      });
      setFormData(createEmptyForm());
      setUseOtherSender(false);
      setAssignedDriver(null);
      onClose();
    } catch (err) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const driverSelectProps = {
    drivers,
    loading: driversLoading,
    disabled: isSubmitting,
    canAddDriver,
  };

  return (
    <>
      <AppModal
        isOpen={isOpen}
        onClose={handleClose}
        title="إضافة دفعة جديدة"
        isSubmitting={isSubmitting}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <ModalField label="السعر الكلي للرحلة">
            <input
              type="number"
              placeholder="السعر الكلي"
              value={formData.total_price}
              onChange={(e) => set("total_price", e.target.value)}
              className={modalInputClass}
              disabled={isSubmitting}
            />
          </ModalField>

          <ModalField label="المبلغ المدفوع" required>
            <input
              type="number"
              required
              placeholder="ادخل المبلغ"
              value={formData.amount_paid}
              onChange={(e) => set("amount_paid", e.target.value)}
              className={modalInputClass}
              disabled={isSubmitting}
            />
          </ModalField>

          {resolvedAssignedDriver && (
            <ModalField label="رصيد السائق الحالي">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  value={formData.driver_balance}
                  onChange={(e) => handleAssignedBalanceChange(e.target.value)}
                  className={`${modalInputClass} flex-1`}
                  placeholder="0"
                  disabled={isSubmitting}
                />
                <span className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${
                  formData.driver_banking_status === "غير مؤهل"
                    ? "bg-red-50 text-red-600"
                    : "bg-green-50 text-green-600"
                }`}>
                  {formData.driver_banking_status === "غير مؤهل" ? "غير مؤهل" : "مؤهل"}
                </span>
              </div>
            </ModalField>
          )}

          <ModalField label="نوع المستلم" required>
            <select
              value={formData.recipient_type}
              onChange={(e) => handleRecipientTypeChange(e.target.value)}
              className={modalInputClass}
              disabled={isSubmitting}
              required
            >
              <option value="" disabled hidden>اختر</option>
              <option value="حسابنا">حسابنا</option>
              <option value="رصيد">رصيد</option>
              <option value="غير">غير</option>
            </select>
          </ModalField>

          {isOurAccount && (
            <ModalField label="طريقة الدفع" required>
              <select
                value={formData.transfer_method}
                onChange={(e) => handleTransferMethodChange(e.target.value)}
                className={modalInputClass}
                disabled={isSubmitting}
                required
              >
                <option value="" disabled hidden>اختر</option>
                <option value="تحويل بنكي">تحويل بنكي</option>
                <option value="كاش">كاش</option>
                <option value="بوابة دفع">بوابة دفع</option>
              </select>
            </ModalField>
          )}

          {(isBankTransfer || isPaymentGateway) && (
            <div className="space-y-4">
              <ModalField label="تاريخ التحويل" required>
                <DateField
                  value={formData.commission_transfer_date}
                  onChange={(v) => set("commission_transfer_date", v)}
                  disabled={isSubmitting}
                />
              </ModalField>

              <ModalField label="اسم المرسل" required>
                {!useOtherSender ? (
                  <div className="flex gap-2 items-stretch">
                    <input
                      type="text"
                      value={tripSenderName || "—"}
                      readOnly
                      className={`${readOnlyInputClass} flex-1`}
                      placeholder="لا يوجد سائق مسند للرحلة"
                    />
                    <button
                      type="button"
                      onClick={enableOtherSender}
                      disabled={isSubmitting}
                      className="shrink-0 px-3 py-2 rounded-xl border border-[#c9a84c] text-[#c9a84c] text-xs font-bold hover:bg-amber-50 transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      مرسل آخر
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center justify-between">
                      <button
                        type="button"
                        onClick={restoreTripSender}
                        disabled={isSubmitting || !resolvedAssignedDriver}
                        className="text-[11px] text-[#c9a84c] font-semibold hover:underline disabled:opacity-40"
                      >
                        الرجوع لسائق الرحلة
                      </button>
                      <span className="text-[11px] text-gray-400">مرسل آخر</span>
                    </div>
                    <input
                      type="text"
                      value={formData.custom_sender_name}
                      onChange={(e) => set("custom_sender_name", e.target.value)}
                      placeholder="اكتب اسم المرسل..."
                      className={modalInputClass}
                      disabled={isSubmitting}
                    />
                    <DriverSearchSelect
                      {...driverSelectProps}
                      value={formData.sender_driver_id}
                      onChange={handleSenderChange}
                      placeholder="أو ابحث واختر سائق..."
                      onAddDriver={() => openAddDriver(handleSenderChange)}
                    />
                  </div>
                )}
              </ModalField>

              {isBankTransfer && (
                <ModalField label="بيانات البنك المستلم" required>
                  <BankReadOnlyFields
                    bank={selectedBank}
                    loading={banksLoading}
                    inputClass={modalInputClass}
                    readOnlyInputClass={readOnlyInputClass}
                  />
                </ModalField>
              )}

              <ModalField label="صورة التحويل">
                <label className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors ${isSubmitting ? "opacity-50 pointer-events-none" : ""}`}>
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span>{formData.transfer_image ? formData.transfer_image.name : "اختر الملف"}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    disabled={isSubmitting}
                    onChange={(e) => set("transfer_image", e.target.files?.[0] ?? null)}
                  />
                </label>
              </ModalField>
            </div>
          )}

          {isCash && (
            <div className="space-y-4">
              <ModalField label="تاريخ الاستلام" required>
                <DateField
                  value={formData.commission_transfer_date}
                  onChange={(v) => set("commission_transfer_date", v)}
                  disabled={isSubmitting}
                />
              </ModalField>

              <ModalField label="اسم السائق" required>
                {!useOtherSender ? (
                  <div className="flex gap-2 items-stretch">
                    <input
                      type="text"
                      value={tripSenderName || "—"}
                      readOnly
                      className={`${readOnlyInputClass} flex-1`}
                      placeholder="لا يوجد سائق مسند للرحلة"
                    />
                    <button
                      type="button"
                      onClick={enableOtherSender}
                      disabled={isSubmitting}
                      className="shrink-0 px-3 py-2 rounded-xl border border-[#c9a84c] text-[#c9a84c] text-xs font-bold hover:bg-amber-50 transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      مرسل آخر
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center justify-between">
                      <button
                        type="button"
                        onClick={restoreTripSender}
                        disabled={isSubmitting || !resolvedAssignedDriver}
                        className="text-[11px] text-[#c9a84c] font-semibold hover:underline disabled:opacity-40"
                      >
                        الرجوع لسائق الرحلة
                      </button>
                      <span className="text-[11px] text-gray-400">مرسل آخر</span>
                    </div>
                    <input
                      type="text"
                      value={formData.custom_sender_name}
                      onChange={(e) => set("custom_sender_name", e.target.value)}
                      placeholder="اكتب اسم السائق..."
                      className={modalInputClass}
                      disabled={isSubmitting}
                    />
                    <DriverSearchSelect
                      {...driverSelectProps}
                      value={formData.driver_id}
                      onChange={handleSenderChange}
                      placeholder="أو ابحث واختر سائق..."
                      onAddDriver={() => openAddDriver(handleSenderChange)}
                    />
                  </div>
                )}
              </ModalField>

              <ModalField label="اسم المستلم" required>
                <input
                  type="text"
                  value={formData.cash_recipient_name}
                  onChange={(e) => set("cash_recipient_name", e.target.value)}
                  placeholder="ادخل اسم المستلم"
                  className={modalInputClass}
                  disabled={isSubmitting}
                  required
                />
              </ModalField>
            </div>
          )}

          {isOtherRecipient && (
            <div className="space-y-4">
              <ModalField label="اسم المرسل" required>
                {!useOtherSender ? (
                  <div className="flex gap-2 items-stretch">
                    <input
                      type="text"
                      value={tripSenderName || "—"}
                      readOnly
                      className={`${readOnlyInputClass} flex-1`}
                      placeholder="لا يوجد سائق مسند للرحلة"
                    />
                    <button
                      type="button"
                      onClick={enableOtherSender}
                      disabled={isSubmitting}
                      className="shrink-0 px-3 py-2 rounded-xl border border-[#c9a84c] text-[#c9a84c] text-xs font-bold hover:bg-amber-50 transition-colors whitespace-nowrap disabled:opacity-50"
                    >
                      مرسل آخر
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center justify-between">
                      <button
                        type="button"
                        onClick={restoreTripSender}
                        disabled={isSubmitting || !resolvedAssignedDriver}
                        className="text-[11px] text-[#c9a84c] font-semibold hover:underline disabled:opacity-40"
                      >
                        الرجوع لسائق الرحلة
                      </button>
                      <span className="text-[11px] text-gray-400">مرسل آخر</span>
                    </div>
                    <input
                      type="text"
                      value={formData.custom_sender_name}
                      onChange={(e) => set("custom_sender_name", e.target.value)}
                      placeholder="اكتب اسم المرسل..."
                      className={modalInputClass}
                      disabled={isSubmitting}
                    />
                    <DriverSearchSelect
                      {...driverSelectProps}
                      value={formData.sender_driver_id}
                      onChange={handleSenderChange}
                      placeholder="أو ابحث واختر سائق..."
                      onAddDriver={() => openAddDriver(handleSenderChange)}
                    />
                  </div>
                )}
              </ModalField>

              <ModalField label="اسم المستلم" required>
                <div className="flex gap-2 mb-2">
                  {["استرداد", "بعمولة"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => handleRecipientModeChange(mode)}
                      disabled={isSubmitting}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${
                        formData.recipient_mode === mode
                          ? "bg-[#c9a84c] text-white shadow-sm"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
                {formData.recipient_mode ? (
                  <DriverSearchSelect
                    drivers={drivers}
                    loading={driversLoading}
                    disabled={isSubmitting}
                    canAddDriver={false}
                    value={formData.recipient_driver_id}
                    onChange={handleRecipientDriverChange}
                    placeholder={`ابحث عن مستلم (${formData.recipient_mode})...`}
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
              placeholder="أضف ملاحظة (اختياري)"
              value={formData.payment_note}
              onChange={(e) => set("payment_note", e.target.value)}
              className={`${modalInputClass} resize-none`}
              disabled={isSubmitting}
            />
          </ModalField>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#4a4746] py-3 text-sm font-semibold text-white hover:bg-[#383534] active:scale-[0.99] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          >
            {isSubmitting ? "جاري الحفظ..." : "حفظ"}
          </button>
        </form>
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
