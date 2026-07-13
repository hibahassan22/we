import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Upload } from "lucide-react";
import { toast } from "../lib/toast";
import AppModal, { ModalField, modalInputClass } from "./ui/AppModal";
import { addTripPayment, fetchTripDetailsById } from "../services/tripService.js";
import { fetchAllDrivers } from "../services/driverSaleChatService.js";
import { fetchBanks } from "../services/bankService.js";
import DriverFormModal from "./drivers/DriverFormModal.jsx";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { getDriverBankAccount } from "../lib/driverUtils.js";

const readOnlyInputClass = `${modalInputClass} bg-gray-50 text-gray-600 cursor-not-allowed`;

const createEmptyForm = (totalPrice = "") => ({
  total_price: totalPrice,
  amount_paid: "",
  transfer_method: "تحويل بنكي",
  account_number: "",
  recipient_type: "غير",
  driver_id: "",
  sender_driver_id: "",
  recipient_driver_id: "",
  cash_recipient_name: "",
  recipient_account: "",
  bank_id: "",
  bank_name: "",
  commission_transfer_date: "",
  payment_note: "",
  transfer_image: null,
});

function getDriverName(driver) {
  return [driver?.name, driver?.last_name].filter(Boolean).join(" ").trim() || "—";
}

function getDriverAccount(driver) {
  return getDriverBankAccount(driver);
}

function DriverSearchSelect({
  drivers,
  value,
  onChange,
  loading,
  disabled,
  placeholder = "ابحث عن سائق...",
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
    const q = query.trim().toLowerCase();
    if (!q || (selected && query === selectedLabel)) {
      return drivers;
    }
    return drivers.filter((d) => getDriverName(d).toLowerCase().includes(q));
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
                    {getDriverName(driver)}
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

/**
 * AddPaymentModal — إضافة دفعة لرحلة من سجل الرحلات
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
  const [assignedDriver, setAssignedDriver] = useState(null);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [pendingDriverSelect, setPendingDriverSelect] = useState(null);
  const wasOpenRef = useRef(false);

  const isCash = formData.transfer_method === "كاش";

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
          const driver = trip?.driver ?? null;
          const driverId = driver?.id ?? trip?.driver_id ?? null;
          if (driver || driverId) {
            setAssignedDriver(driver ?? { id: driverId });
          }
        })
        .catch(() => setAssignedDriver(null));
    } else {
      setAssignedDriver(null);
    }

    return () => ctrl.abort();
  }, [isOpen, tripId, loadDrivers]);

  const tripDriverAccount = useMemo(() => {
    if (!assignedDriver) return "";
    const fromList = drivers.find((d) => String(d.id) === String(assignedDriver.id));
    return getDriverAccount(fromList || assignedDriver);
  }, [assignedDriver, drivers]);

  const resolvedAssignedDriver = useMemo(() => {
    if (!assignedDriver) return null;
    return drivers.find((d) => String(d.id) === String(assignedDriver.id)) || assignedDriver;
  }, [assignedDriver, drivers]);

  const tripDriverName = resolvedAssignedDriver ? getDriverName(resolvedAssignedDriver) : "";

  const selectedDriver = useMemo(
    () => drivers.find((d) => String(d.id) === String(formData.driver_id)),
    [drivers, formData.driver_id]
  );

  const selectedRecipient = useMemo(
    () => drivers.find((d) => String(d.id) === String(formData.recipient_driver_id)),
    [drivers, formData.recipient_driver_id]
  );

  useEffect(() => {
    if (!isOpen || !resolvedAssignedDriver?.id) return;
    setFormData((p) => ({
      ...p,
      sender_driver_id: String(resolvedAssignedDriver.id),
    }));
  }, [isOpen, resolvedAssignedDriver?.id]);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setFormData(createEmptyForm(tripTotalPrice != null && tripTotalPrice !== "" ? String(tripTotalPrice) : ""));
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, tripId, tripTotalPrice]);

  useEffect(() => {
    if (!isOpen) return;
    setFormData((p) => ({
      ...p,
      account_number: tripDriverAccount || p.account_number,
    }));
  }, [isOpen, tripDriverAccount]);

  const set = (key, val) => setFormData((p) => ({ ...p, [key]: val }));

  const openAddDriver = (onSelect) => {
    setPendingDriverSelect(onSelect);
    setShowAddDriver(true);
  };

  const handleDriverCreated = async (created) => {
    const createdId = created?.id != null ? String(created.id) : created != null ? String(created) : null;
    try {
      const list = await fetchAllDrivers();
      setDrivers(list);
      const pickId = createdId && list.some((d) => String(d.id) === createdId)
        ? createdId
        : (createdId ?? null);
      if (pickId && pendingDriverSelect) {
        pendingDriverSelect(pickId);
      }
    } catch {
      if (createdId && pendingDriverSelect) pendingDriverSelect(createdId);
    } finally {
      setPendingDriverSelect(null);
      setShowAddDriver(false);
    }
  };

  const handleTransferMethodChange = (method) => {
    setFormData((p) => ({
      ...p,
      transfer_method: method,
      recipient_type: method === "كاش" ? "غير" : p.recipient_type,
      driver_id: method === "كاش" ? "" : p.driver_id,
      recipient_driver_id: method === "كاش" ? "" : p.recipient_driver_id,
      cash_recipient_name: method === "كاش" ? "" : p.cash_recipient_name,
      recipient_account: method === "كاش" ? "" : p.recipient_account,
      bank_name: method === "كاش" ? "" : p.bank_name,
      bank_id: method === "كاش" ? "" : p.bank_id,
    }));
  };

  const handleCashRecipientTypeChange = (type) => {
    setFormData((p) => ({
      ...p,
      recipient_type: type,
      cash_recipient_name: "",
      recipient_driver_id: "",
    }));
  };

  const handleRecipientTypeChange = (type) => {
    setFormData((p) => ({
      ...p,
      recipient_type: type,
      bank_name: type === "حسابنا" ? p.bank_name : "",
      bank_id: type === "حسابنا" ? p.bank_id : "",
      driver_id: type === "غير" ? p.driver_id : "",
      recipient_account: "",
    }));
  };

  const handleBankChange = (bankId) => {
    const bank = banks.find((b) => String(b.id) === String(bankId));
    setFormData((p) => ({
      ...p,
      bank_id: bankId,
      bank_name: bank?.name ?? "",
      recipient_account: bank?.bank_number ?? "",
    }));
  };

  const handleDriverChange = (driverId) => {
    const driver = drivers.find((d) => String(d.id) === String(driverId));
    setFormData((p) => ({
      ...p,
      driver_id: driverId,
      recipient_account: driver ? getDriverAccount(driver) : "",
    }));
  };

  const buildRecipientAccount = () => {
    if (isCash) {
      if (formData.recipient_type === "حسابنا") {
        return formData.cash_recipient_name.trim();
      }
      return selectedRecipient ? getDriverName(selectedRecipient) : "";
    }
    if (formData.recipient_type === "حسابنا") {
      return formData.recipient_account.trim();
    }
    if (selectedDriver) {
      const account = getDriverAccount(selectedDriver);
      return account || getDriverName(selectedDriver);
    }
    return formData.recipient_account;
  };

  const buildSenderAccount = () => formData.account_number.trim();

  const handleClose = useCallback(() => {
    setFormData(createEmptyForm());
    setAssignedDriver(null);
    setPendingDriverSelect(null);
    setShowAddDriver(false);
    onClose();
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tripId) {
      toast.error("معرّف الرحلة غير متوفر");
      return;
    }
    if (!formData.amount_paid || isSubmitting) return;

    if (isCash) {
      if (!resolvedAssignedDriver) {
        toast.error("لا يوجد سائق مسند للرحلة");
        return;
      }
      if (formData.recipient_type === "حسابنا" && !formData.cash_recipient_name.trim()) {
        toast.error("أدخل اسم المستلم");
        return;
      }
      if (formData.recipient_type === "غير" && !formData.recipient_driver_id) {
        toast.error("اختر اسم المستلم");
        return;
      }
    } else if (formData.transfer_method === "تحويل بنكي") {
      if (formData.recipient_type === "حسابنا" && !formData.bank_id) {
        toast.error("اختر البنك");
        return;
      }
      if (formData.recipient_type === "حسابنا" && !formData.recipient_account.trim()) {
        toast.error("أدخل رقم الحساب المستلم");
        return;
      }
      if (formData.recipient_type === "غير" && !formData.driver_id) {
        toast.error("اختر السائق");
        return;
      }
    }

    const senderAccount = buildSenderAccount();
    const recipientAccount = buildRecipientAccount();
    const payload = {
      ...formData,
      account_number: senderAccount,
      from_account: senderAccount,
      recipient_account: recipientAccount,
      to_account: recipientAccount,
      driver_id: isCash ? undefined : formData.driver_id || undefined,
      sender_driver_id: formData.sender_driver_id || undefined,
      recipient_driver_id: formData.recipient_driver_id || undefined,
    };

    setIsSubmitting(true);
    try {
      const json = await addTripPayment(tripId, payload);

      toast.success(json.message || "تمت إضافة الدفعة بنجاح");
      onSuccess?.(json, {
        amount_paid: formData.amount_paid,
        transfer_method: formData.transfer_method,
        account_number: senderAccount,
        sender_name: tripDriverName,
        recipient_type: formData.recipient_type,
        driver_id: formData.driver_id,
        driver_name: selectedDriver ? getDriverName(selectedDriver) : "",
        driver_phone: selectedDriver?.phone ?? "",
        sender_driver_id: resolvedAssignedDriver?.id ?? formData.sender_driver_id,
        recipient_driver_id: formData.recipient_driver_id,
        recipient_name: isCash
          ? (formData.recipient_type === "حسابنا"
            ? formData.cash_recipient_name
            : (selectedRecipient ? getDriverName(selectedRecipient) : ""))
          : (selectedRecipient ? getDriverName(selectedRecipient) : ""),
        recipient_account: recipientAccount,
        bank_name: formData.bank_name,
        commission_transfer_date: formData.commission_transfer_date,
        payment_note: formData.payment_note,
        transfer_image: formData.transfer_image,
      });
      setFormData(createEmptyForm());
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

          <ModalField label="طريقة التحويل">
            <select
              value={formData.transfer_method}
              onChange={(e) => handleTransferMethodChange(e.target.value)}
              className={modalInputClass}
              disabled={isSubmitting}
            >
              <option value="تحويل بنكي">تحويل بنكي</option>
              <option value="كاش">كاش</option>
              <option value="محفظة إلكترونية">محفظة إلكترونية</option>
            </select>
          </ModalField>

          <ModalField label="رقم الحساب (السائق المسند للرحلة)">
            <input
              type="text"
              value={formData.account_number || (assignedDriver ? "—" : "")}
              readOnly
              className={readOnlyInputClass}
              dir="ltr"
              placeholder={assignedDriver ? "—" : "لا يوجد سائق مسند للرحلة"}
            />
          </ModalField>

          {isCash ? (
            <div className="space-y-3">
              <ModalField label="اسم المرسل (سائق الرحلة)">
                <input
                  type="text"
                  value={tripDriverName}
                  readOnly
                  className={readOnlyInputClass}
                  placeholder="لا يوجد سائق مسند للرحلة"
                />
              </ModalField>

              <ModalField label="نوع المستلم">
                <select
                  value={formData.recipient_type}
                  onChange={(e) => handleCashRecipientTypeChange(e.target.value)}
                  className={modalInputClass}
                  disabled={isSubmitting}
                >
                  <option value="حسابنا">حسابنا</option>
                  <option value="غير">غير</option>
                </select>
              </ModalField>

              {formData.recipient_type === "حسابنا" ? (
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
              ) : (
                <ModalField label="اسم المستلم" required>
                  <DriverSearchSelect
                    {...driverSelectProps}
                    value={formData.recipient_driver_id}
                    onChange={(id) => set("recipient_driver_id", id)}
                    placeholder="ابحث عن المستلم..."
                    onAddDriver={() => openAddDriver((id) => set("recipient_driver_id", id))}
                  />
                </ModalField>
              )}
            </div>
          ) : (
            <>
              {formData.transfer_method === "تحويل بنكي" && (
                <ModalField label="نوع حساب المستلم">
                  <select
                    value={formData.recipient_type}
                    onChange={(e) => handleRecipientTypeChange(e.target.value)}
                    className={modalInputClass}
                    disabled={isSubmitting}
                  >
                    <option value="حسابنا">حسابنا</option>
                    <option value="غير">غير</option>
                  </select>
                </ModalField>
              )}

              {formData.transfer_method === "تحويل بنكي" && (
                formData.recipient_type === "غير" ? (
                  <>
                    <ModalField label="اسم السائق" required>
                      <DriverSearchSelect
                        {...driverSelectProps}
                        value={formData.driver_id}
                        onChange={handleDriverChange}
                        placeholder="ابحث عن السائق..."
                        onAddDriver={() => openAddDriver(handleDriverChange)}
                      />
                    </ModalField>
                    {selectedDriver && (
                      <div className="grid grid-cols-2 gap-3">
                        <ModalField label="رقم الهاتف">
                          <input
                            type="text"
                            value={selectedDriver.phone || "—"}
                            readOnly
                            className={readOnlyInputClass}
                            dir="ltr"
                          />
                        </ModalField>
                        <ModalField label="رقم الحساب">
                          <input
                            type="text"
                            value={getDriverAccount(selectedDriver) || "—"}
                            readOnly
                            className={readOnlyInputClass}
                            dir="ltr"
                          />
                        </ModalField>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <ModalField label="البنك" required>
                      <select
                        value={formData.bank_id}
                        onChange={(e) => handleBankChange(e.target.value)}
                        className={modalInputClass}
                        disabled={isSubmitting || banksLoading}
                        required
                      >
                        <option value="">
                          {banksLoading ? "جاري تحميل البنوك..." : banks.length ? "اختر البنك" : "لا توجد بنوك — أضفها من إدارة النظام"}
                        </option>
                        {banks.map((bank) => (
                          <option key={bank.id} value={bank.id}>{bank.name}</option>
                        ))}
                      </select>
                    </ModalField>
                    <ModalField label="رقم الحساب المستلم" required>
                      <input
                        type="text"
                        placeholder="أدخل رقم الحساب"
                        value={formData.recipient_account}
                        onChange={(e) => set("recipient_account", e.target.value)}
                        className={modalInputClass}
                        disabled={isSubmitting}
                        dir="ltr"
                        required
                      />
                    </ModalField>
                  </>
                )
              )}
            </>
          )}

          <ModalField label={isCash ? "تاريخ الاستلام" : "تاريخ التحويل"}>
            <input
              type="date"
              value={formData.commission_transfer_date}
              onChange={(e) => set("commission_transfer_date", e.target.value)}
              className={modalInputClass}
              disabled={isSubmitting}
            />
          </ModalField>

          <ModalField label="صورة التحويل">
            <label className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors ${isSubmitting ? "opacity-50 pointer-events-none" : ""}`}>
              <Upload className="w-4 h-4 text-gray-400" />
              <span>{formData.transfer_image ? formData.transfer_image.name : "اختر الملف"}</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                disabled={isSubmitting}
                onChange={(e) => set("transfer_image", e.target.files[0])}
              />
            </label>
          </ModalField>

          <ModalField label="ملاحظة">
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
        onClose={() => { setShowAddDriver(false); setPendingDriverSelect(null); }}
        driverData={null}
        onSaved={handleDriverCreated}
        onToast={(type, message) => toast[type](message)}
        stackAbove
      />
    </>
  );
}
