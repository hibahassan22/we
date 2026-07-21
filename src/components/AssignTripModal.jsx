import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Upload } from "lucide-react";
import { useToast } from "../lib/toast";
import AppModal, { ModalField, modalInputClass } from "./ui/AppModal";
import { fetchTripDetailsById } from "../services/tripService.js";
import { fetchAllDrivers } from "../services/driverSaleChatService.js";
import { fetchBanks, applyBankSelection, getActiveBanks } from "../services/bankService.js";
import BankReadOnlyFields from "./ui/BankReadOnlyFields.jsx";
import { fetchSalesList } from "../services/salesService.js";
import DriverFormModal from "./drivers/DriverFormModal.jsx";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { getDriverBankAccount } from "../lib/driverUtils.js";
import { getDriverBankingData, saveDriverBankingData } from "../lib/driverBanking.js";
import { sendDriverNotification } from "../lib/driverStatuses.js";

const API_BASE = "https://drivo1.elmoroj.com/api";
const readOnlyInputClass = `${modalInputClass} bg-gray-50 text-gray-600 cursor-not-allowed`;

const EMPTY_FORM = {
  trip_id: "",
  driver_id: "",
  driver_balance: "",
  driver_banking_status: "",
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
  transferred_amount: "",
  notes: "",
  transfer_image: null,
  sales_id: "",
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
  const banking = getDriverBankingData(driver);
  const qDigits = q.replace(/\s/g, "");
  return name.includes(q)
    || (qDigits && phone.includes(qDigits))
    || banking.bankingStatus.includes(q);
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
              filtered.map((driver) => {
                const banking = getDriverBankingData(driver);
                return (
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
                    <span className="flex items-center justify-between gap-2">
                      <span>{getDriverName(driver)}</span>
                      <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                        banking.isDebtor ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                      }`}>
                        {banking.bankingStatus}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-2 text-[11px] text-gray-400 mt-0.5">
                      <span>{banking.balance.toLocaleString("ar-SA")} ر.س</span>
                      {getDriverPhone(driver) && <span dir="ltr">{getDriverPhone(driver)}</span>}
                    </span>
                  </button>
                </li>
                );
              })
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

function getSalesName(sale) {
  return String(sale?.name ?? sale?.fullName ?? "").trim() || "—";
}

function getSalesPhone(sale) {
  return String(sale?.phone ?? "").trim();
}

function formatSalesOption(sale) {
  const name = getSalesName(sale);
  const phone = getSalesPhone(sale);
  return phone ? `${name} — ${phone}` : name;
}

function matchesSalesSearch(sale, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = getSalesName(sale).toLowerCase();
  const email = String(sale?.email ?? "").toLowerCase();
  const phone = getSalesPhone(sale).replace(/\s/g, "");
  const qDigits = q.replace(/\s/g, "");
  return (
    name.includes(q) ||
    email.includes(q) ||
    (qDigits && phone.includes(qDigits))
  );
}

/** بحث واختيار مندوب من خدمة العملاء (/api/sales) */
function SalesSearchSelect({
  sales,
  value,
  onChange,
  loading,
  disabled,
  placeholder = "ابحث بالاسم أو الهاتف...",
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = useMemo(
    () => sales.find((s) => String(s.id) === String(value)),
    [sales, value]
  );
  const selectedLabel = selected ? formatSalesOption(selected) : "";

  useEffect(() => {
    if (selected) setQuery(selectedLabel);
    else if (!open) setQuery("");
  }, [selected, selectedLabel, open]);

  const filtered = useMemo(() => {
    if (selected && query === selectedLabel) return sales;
    return sales.filter((s) => matchesSalesSearch(s, query));
  }, [sales, query, selected, selectedLabel]);

  const isSearching = query.trim().length > 0 && (!selected || query !== selectedLabel);

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
    <div ref={containerRef} className="relative">
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
        placeholder={loading ? "جاري تحميل خدمة العملاء..." : placeholder}
        className={modalInputClass}
        autoComplete="off"
      />
      <div className="absolute left-3 top-3 pointer-events-none text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      {open && !disabled && !loading && (
        <ul className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg py-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-xs text-gray-400 text-right">
              {isSearching ? "لا توجد نتائج" : "لا يوجد مندوبون"}
            </li>
          ) : (
            filtered.map((sale) => (
              <li key={sale.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(String(sale.id));
                    setQuery(formatSalesOption(sale));
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 text-sm text-right hover:bg-amber-50 transition-colors ${
                    String(sale.id) === String(value) ? "bg-amber-50 text-[#c9a84c] font-medium" : "text-gray-700"
                  }`}
                >
                  <span className="block font-medium">{getSalesName(sale)}</span>
                  <span className="block text-[11px] text-gray-400 mt-0.5" dir="ltr">
                    {[getSalesPhone(sale), sale.email].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
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
  zIndex,
}) {
  const toast = useToast();
  const { can } = usePermissions();
  const canAddDriver = can(PERMISSIONS.DRIVERS_CREATE);

  const [loading, setLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [salesList, setSalesList] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [showOtherSales, setShowOtherSales] = useState(false);
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
    setShowOtherSales(false);
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

    setSalesLoading(true);
    fetchSalesList()
      .then(setSalesList)
      .catch(() => setSalesList([]))
      .finally(() => setSalesLoading(false));

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

  useEffect(() => {
    if (!selectedAssignDriver) return;
    const banking = getDriverBankingData(selectedAssignDriver);
    setForm((current) => ({
      ...current,
      driver_balance: String(banking.balance),
      driver_banking_status: banking.bankingStatus,
    }));
  }, [selectedAssignDriver]);

  const assignDriverName = fromDriverPage
    ? driverName || ""
    : selectedAssignDriver
      ? getDriverName(selectedAssignDriver)
      : "";

  const selectedSender = useMemo(
    () => drivers.find((d) => String(d.id) === String(form.sender_driver_id)),
    [drivers, form.sender_driver_id]
  );

  const selectedBank = useMemo(
    () => banks.find((b) => String(b.id) === String(form.bank_id)),
    [banks, form.bank_id]
  );

  useEffect(() => {
    if (!isOpen || !isBankTransfer || banksLoading) return;
    const activeBanks = getActiveBanks(banks);
    if (!activeBanks.length) return;
    setForm((current) => {
      if (current.bank_id && activeBanks.some((b) => String(b.id) === String(current.bank_id))) {
        return current;
      }
      return { ...current, ...applyBankSelection(activeBanks[0]) };
    });
  }, [isOpen, isBankTransfer, banks, banksLoading]);

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

  const handleAssignDriverChange = (driverId) => {
    const driver = drivers.find((item) => String(item.id) === String(driverId));
    const banking = driver ? getDriverBankingData(driver) : null;
    setForm((current) => ({
      ...current,
      driver_id: driverId,
      driver_balance: banking ? String(banking.balance) : "",
      driver_banking_status: banking?.bankingStatus ?? "",
    }));
  };

  const handleAssignedBalanceChange = (value) => {
    const balance = Math.max(0, Number(value) || 0);
    setForm((current) => ({
      ...current,
      driver_balance: value,
      driver_banking_status: balance > 0 ? "غير مؤهل" : "مؤهل",
    }));
  };

  const handleSendBalanceRequest = async () => {
    if (!resolvedDriverId || requestLoading) return;
    setRequestLoading(true);
    try {
      await sendDriverNotification(
        resolvedDriverId,
        "طلب سداد الرصيد",
        `يرجى سداد الرصيد المستحق بقيمة ${Number(form.driver_balance || 0).toLocaleString("ar-SA")} ر.س`,
      );
      toast.success("تم إرسال الطلب للسائق");
    } catch (err) {
      toast.error(err.message || "فشل إرسال الطلب");
    } finally {
      setRequestLoading(false);
    }
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
      if (form.transferred_amount) fd.append("transferred_amount", form.transferred_amount);
      if (form.notes) fd.append("notes", form.notes);
      if (form.transfer_image) fd.append("transfer_image", form.transfer_image);
      if (form.sales_id) fd.append("sales_id", form.sales_id);

      const res = await fetch(`${API_BASE}/trips/${resolvedTripId}/assign-driver`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || json?.message || `خطأ ${res.status}`);

      saveDriverBankingData(resolvedDriverId, {
        balance: form.driver_balance,
        bankingStatus: form.driver_banking_status,
      });
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

  const renderAssignedDriverBalance = () => {
    if (!resolvedDriverId) return null;
    const isDebtor = form.driver_banking_status === "غير مؤهل";
    return (
      <ModalField label="رصيد السائق الحالي">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={form.driver_balance}
            onChange={(e) => handleAssignedBalanceChange(e.target.value)}
            className={`${inputCls} flex-1`}
            placeholder="0"
            disabled={loading}
          />
          <span className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${
            isDebtor ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
          }`}>
            {isDebtor ? "غير مؤهل" : "مؤهل"}
          </span>
          {isDebtor && (
            <button
              type="button"
              onClick={handleSendBalanceRequest}
              disabled={loading || requestLoading}
              className="shrink-0 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {requestLoading ? "جاري الإرسال..." : "إرسال طلب"}
            </button>
          )}
        </div>
      </ModalField>
    );
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
        zIndex={zIndex}
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
        zIndex={zIndex}
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
                {renderAssignedDriverBalance()}
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
                    onChange={handleAssignDriverChange}
                    onAddDriver={() => openAddDriver(handleAssignDriverChange)}
                  />
                </ModalField>
                {renderAssignedDriverBalance()}
              </>
            )}

            <ModalField label="مندوب خدمة العملاء">
              {!showOtherSales ? (
                <button
                  type="button"
                  onClick={() => setShowOtherSales(true)}
                  disabled={loading}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#c9a84c] text-[#c9a84c] text-sm font-bold hover:bg-amber-50 transition-colors disabled:opacity-50"
                >
                  يوجد موظف آخر
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOtherSales(false);
                        set("sales_id", "");
                      }}
                      disabled={loading}
                      className="text-[11px] text-gray-400 font-semibold hover:text-red-500 disabled:opacity-40"
                    >
                      إلغاء
                    </button>
                    <p className="text-[11px] text-gray-500">اختر من خدمة العملاء</p>
                  </div>
                  <SalesSearchSelect
                    sales={salesList}
                    value={form.sales_id}
                    onChange={(id) => set("sales_id", id)}
                    loading={salesLoading}
                    disabled={loading}
                    placeholder="ابحث بالاسم أو الهاتف..."
                  />
                </div>
              )}
            </ModalField>
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
                  <option value="" disabled hidden>اختر</option>
                  <option value="حسابنا">حسابنا</option>
                  <option value="رصيد">رصيد</option>
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
                  <option value="" disabled hidden>اختر</option>
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
                  <ModalField label="بيانات البنك المستلم">
                    <BankReadOnlyFields
                      bank={selectedBank}
                      loading={banksLoading}
                      inputClass={inputCls}
                      readOnlyInputClass={readOnlyInputClass}
                    />
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
                    {[
                      { value: "استرداد", label: "استرداد" },
                      { value: "بعمولة", label: "عمولة وسيط" },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setForm((p) => ({
                            ...p,
                            recipient_mode: value,
                            recipient_driver_id: "",
                          }))
                        }
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                          form.recipient_mode === value
                            ? "bg-[#c9a84c] text-white shadow-sm"
                            : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {label}
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
                      placeholder={`ابحث عن مستلم (${form.recipient_mode === "بعمولة" ? "عمولة وسيط" : form.recipient_mode})...`}
                    />
                  ) : (
                    <p className="text-xs text-gray-400 text-right">اختر استرداد أو عمولة وسيط أولاً</p>
                  )}
                </ModalField>
              </div>
            )}

            <ModalField label="المبلغ المحول">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="ادخل المبلغ المحول"
                value={form.transferred_amount}
                onChange={(e) => set("transferred_amount", e.target.value)}
                className={inputCls}
                dir="ltr"
              />
            </ModalField>

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
