import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useToast } from "../lib/toast";
import AppModal, { ModalField, ModalActions, modalInputClass, ConfirmModal } from "./ui/AppModal";
import DriverDetailsView from "./drivers/DriverDetailsView";
import DriverFormModal from "./drivers/DriverFormModal.jsx";
import AssignTripModal from "./AssignTripModal";
import { normalizeDriverMedia } from "../lib/driverMedia";
import { useDriverStatuses } from "../hooks/useDriverStatuses";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { updateDriverStatus, sendDriverNotification, statusButtonClass, isSameDriverStatus, normalizeDriverStatusFields, resolveDriverStatusId, getPauseStatusId, durationToStopUntil, fetchDriverById } from "../lib/driverStatuses";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { filterByGlobalSearch } from "../lib/searchUtils";
import { bannerImage } from "../lib/images.js";
import { exportToExcel } from "../lib/exportExcel.js";
import { useAuth } from "../hooks/useAuth.js";
import { getCurrentSale } from "../services/authService.js";
import { createDriverViolation } from "../services/driverViolationsService.js";
import { fetchBrokers } from "../services/brokerService.js";
import { getDriverBankingData } from "../lib/driverBanking.js";
const BASE = "https://drivo1.elmoroj.com/api";

function phoneDigits(phone) {
  return String(phone || "").replace(/\D/g, "").slice(-10);
}

function isDriverBroker(driver, brokerIds, brokerPhones) {
  if (!driver) return false;
  if (driver.is_broker === true || driver.isBroker === true || driver.is_broker === 1) return true;
  if (String(driver.role || "").toLowerCase() === "broker") return true;
  if (brokerIds?.has(String(driver.id))) return true;
  const ph = phoneDigits(driver.phone);
  if (ph && brokerPhones?.has(ph)) return true;
  return false;
}

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
const ActionIcons = ({ onDelete, onEdit, onView, canDelete = true, canEdit = true, canView = true }) => (
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
    {canView && (
    <button onClick={onView} className="p-1 text-gray-400 hover:text-gray-600" title="عرض">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
    </button>
    )}
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

// ── Add Note Modal ────────────────────────────────────────────
const AddNoteModal = ({ isOpen, onClose, driverId, salesId, onSaved }) => {
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [violationDate, setViolationDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMessage("");
      setRating(5);
      setViolationDate(new Date().toISOString().split("T")[0]);
    }
  }, [isOpen]);

  const submit = async () => {
    if (!message.trim()) return;
    if (!driverId) {
      toast.error("معرّف السائق غير متوفر");
      return;
    }
    setSaving(true);
    try {
      await createDriverViolation({
        driverId,
        salesId,
        message: message.trim(),
        type: "ملاحظه",
        rating,
        violationDate,
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ModalField label="تاريخ الملاحظة">
          <input
            type="date"
            value={violationDate}
            onChange={(e) => setViolationDate(e.target.value)}
            className={modalInputClass}
            disabled={saving}
          />
        </ModalField>
        <ModalField label="التقييم (اختياري)">
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className={`${modalInputClass} appearance-none`}
            disabled={saving}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>{n} / 5</option>
            ))}
          </select>
        </ModalField>
      </div>
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
  const salesId = user?.uid ?? user?.id ?? getCurrentSale()?.id ?? "";
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
const PAGE_SIZE_OPTIONS = [6, 10, 25, 50, 100, 200, 500, 1000];

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [modalState, setModalState] = useState({ type: null, driver: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [brokerDriverIds, setBrokerDriverIds] = useState(() => new Set());
  const [brokerPhones, setBrokerPhones] = useState(() => new Set());
  const closeGlobalModal = () => setModalState({ type: null, driver: null });
  const toast = useToast();
  const { statusLabel, statusColor, statuses } = useDriverStatuses();
  const { searchQuery } = useGlobalSearch();
  const { can } = usePermissions();
  const canCreate = can(PERMISSIONS.DRIVERS_CREATE);
  const canView = can(PERMISSIONS.DRIVERS_READ);
  const canEdit = can(PERMISSIONS.DRIVERS_EDIT);
  const canDelete = can(PERMISSIONS.DRIVERS_DELETE);

  const filteredDrivers = useMemo(
    () => filterByGlobalSearch(drivers, searchQuery, (d) => {
      const banking = getDriverBankingData(d);
      return [
        d.name,
        d.last_name,
        d.phone,
        d.address,
        d.car_type,
        d.id,
        statusLabel(d.status),
        banking.balance,
        banking.bankingStatus,
        isDriverBroker(d, brokerDriverIds, brokerPhones) ? "وسيط" : "",
      ];
    }),
    [drivers, searchQuery, statusLabel, brokerDriverIds, brokerPhones]
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

  useEffect(() => {
    let cancelled = false;
    fetchBrokers()
      .then((list) => {
        if (cancelled) return;
        const ids = new Set();
        const phones = new Set();
        for (const b of list || []) {
          if (b.driver_id != null && b.driver_id !== "") ids.add(String(b.driver_id));
          const ph = phoneDigits(b.phone);
          if (ph) phones.add(ph);
        }
        setBrokerDriverIds(ids);
        setBrokerPhones(phones);
      })
      .catch(() => {
        if (!cancelled) {
          setBrokerDriverIds(new Set());
          setBrokerPhones(new Set());
        }
      });
    return () => { cancelled = true; };
  }, []);

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

  const totalPages = Math.max(1, Math.ceil(filteredDrivers.length / pageSize));
  const paginated = filteredDrivers.slice((page-1)*pageSize, page*pageSize);

  const handleExport = () => {
    if (!filteredDrivers.length) {
      toast.error("لا توجد بيانات للتصدير");
      return;
    }
    try {
      const rows = filteredDrivers.map((d) => {
        const banking = getDriverBankingData(d);
        return {
          "الاسم": [d.name, d.last_name].filter(Boolean).join(" ") || "—",
          "رقم الهاتف": d.phone || "—",
          "المدينة": d.address || "—",
          "نوع السيارة": d.car_type || "—",
          "وسيط": isDriverBroker(d, brokerDriverIds, brokerPhones) ? "وسيط" : "—",
          "حالة الحساب": statusLabel(d.status),
          "الرصيد (ر.س)": banking.balance,
          "الحالة البنكية": banking.bankingStatus,
          "عدد الرحلات": d.trips_count ?? 0,
          "اكتمال الملف (%)": d.profile_completion ?? 0,
        };
      });
      exportToExcel(rows, "قائمة_السائقين", "السائقين");
      toast.success("تم تصدير البيانات بنجاح");
    } catch (err) {
      toast.error(err.message || "فشل التصدير");
    }
  };

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
      <DriverFormModal
        isOpen={modalState.type==="edit"}
        onClose={closeGlobalModal}
        driverData={modalState.driver}
        onSaved={(updated) => {
          if (updated?.id) handleDriverUpdated(updated);
          fetchDrivers();
        }}
        onToast={(t,m)=>toast[t](m)}
      />
      <DeleteConfirmModal isOpen={modalState.type==="delete"} onClose={closeGlobalModal} onConfirm={executeDelete} driverName={modalState.driver?.name} loading={deleteLoading}/>
    </>
  );

  return (
    <div className="w-full space-y-4" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-xl px-5 py-3 border border-gray-200/60 shadow-sm text-right flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#c9a84c]">قائمة السائقين</h1>
          <p className="text-xs text-gray-400 mt-0.5">إدارة ومتابعة السائقين والمهام بلحظة</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <span>عرض</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 focus:border-[#c9a84c] focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>سائق</span>
          </label>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading || !filteredDrivers.length}
            className="px-4 py-2 bg-[#c9a84c] hover:bg-[#b8973d] rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            تصدير
          </button>
        </div>
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
                  {["الاسم","رقم الهاتف","المدينة","نوع السيارة","وسيط","حالة الحساب","الرصيد","الحالة البنكية","عدد الرحلات","اكتمال الملف","إجراءات"].map(h=>(
                    <th key={h} className="px-4 py-3.5 text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map(driver=>{
                  const banking = getDriverBankingData(driver);
                  return (
                  <tr key={driver.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-gray-800">{[driver.name, driver.last_name].filter(Boolean).join(" ")}</td>
                    <td className="px-4 py-3.5 text-gray-600" dir="ltr">{driver.phone}</td>
                    <td className="px-4 py-3.5 text-gray-600">{driver.address||"—"}</td>
                    <td className="px-4 py-3.5 text-gray-600">{driver.car_type||"—"}</td>
                    <td className="px-4 py-3.5">
                      {isDriverBroker(driver, brokerDriverIds, brokerPhones) ? (
                        <span className="text-xs px-2.5 py-1 rounded-lg font-medium bg-amber-50 text-[#b88121]">وسيط</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5"><span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${statusColor(driver.status)}`}>{statusLabel(driver.status)}</span></td>
                    <td className={`px-4 py-3.5 font-semibold whitespace-nowrap ${banking.isDebtor ? "text-red-600" : "text-green-600"}`}>
                      {banking.balance.toLocaleString("ar-SA")} ر.س
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold ${banking.isDebtor ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                        {banking.bankingStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700 font-medium">{driver.trips_count||0}</td>
                    <td className="px-4 py-3.5"><ProgressBar value={driver.profile_completion||0}/></td>
                    <td className="px-4 py-3.5">
                      <ActionIcons
                        canView={canView}
                        canDelete={canDelete}
                        canEdit={canEdit}
                        onDelete={()=>setModalState({type:"delete",driver})}
                        onEdit={()=>setModalState({type:"edit",driver})}
                        onView={()=>setSelectedDriver(driver)}
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Results count */}
        {!loading && !error && filteredDrivers.length > 0 && (
          <div className="px-4 pt-3 text-center text-xs text-gray-500">
            عرض {paginated.length} من إجمالي {filteredDrivers.length} سائق
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

