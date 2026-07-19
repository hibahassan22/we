import { useState, useEffect, useCallback, useMemo } from "react";
import { useToast } from "../lib/toast";
import { ConfirmModal } from "./ui/AppModal";
import BrokerFormModal from "./brokers/BrokerFormModal.jsx";
import BrokerDetailsView from "./brokers/BrokerDetailsView.jsx";
import { fetchBrokers, fetchBrokerById, deleteBroker } from "../services/brokerService.js";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { filterByGlobalSearch } from "../lib/searchUtils";
import { bannerImage } from "../lib/images.js";
import { exportToExcel } from "../lib/exportExcel.js";

const PAGE_SIZE = 4;

const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
  </div>
);

function Avatar({ name }) {
  const letter = (name || "و").trim().charAt(0) || "و";
  return (
    <div className="w-9 h-9 rounded-full bg-[#c9a84c]/15 text-[#c9a84c] flex items-center justify-center text-sm font-bold shrink-0">
      {letter}
    </div>
  );
}

function fmtMoney(n) {
  const num = Number(n) || 0;
  return `${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
}

const ActionIcons = ({ onDelete, onEdit, onView, canDelete, canEdit, canView }) => (
  <div className="flex items-center gap-1.5 justify-start">
    {canView && (
      <button type="button" onClick={onView} className="p-1.5 text-gray-400 hover:text-gray-700" title="عرض">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
    )}
    {canEdit && (
      <button type="button" onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600" title="تعديل">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    )}
    {canDelete && (
      <button type="button" onClick={onDelete} className="p-1.5 text-red-400 hover:text-red-600" title="حذف">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    )}
  </div>
);

export default function BrokersPage() {
  const toast = useToast();
  const { can } = usePermissions();
  const { searchQuery } = useGlobalSearch();

  const canView = can(PERMISSIONS.BROKERS_READ) || can(PERMISSIONS.DRIVERS_READ);
  const canCreate = can(PERMISSIONS.BROKERS_CREATE) || can(PERMISSIONS.DRIVERS_CREATE);
  const canEdit = can(PERMISSIONS.BROKERS_EDIT) || can(PERMISSIONS.DRIVERS_EDIT);
  const canDelete = can(PERMISSIONS.BROKERS_DELETE) || can(PERMISSIONS.DRIVERS_DELETE);

  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [selectedBroker, setSelectedBroker] = useState(null);
  const [modalState, setModalState] = useState({ type: null, broker: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchBrokers();
      setBrokers(list);
    } catch (e) {
      setError(e.message || "فشل تحميل الوسطاء");
      toast.error("فشل تحميل الوسطاء");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const filtered = useMemo(() => {
    return filterByGlobalSearch(brokers, searchQuery, (b) => [
      b.name,
      b.broker_code,
      b.phone,
      b.email,
      b.address,
    ]);
  }, [brokers, searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeFrom = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(page * PAGE_SIZE, filtered.length);

  const closeModal = () => setModalState({ type: null, broker: null });

  const handleExport = () => {
    const rows = filtered.map((b) => ({
      الاسم: b.name,
      "كود الوسيط": b.broker_code,
      العمولة: b.commission_type === "نقدي" ? `${b.commission} SR` : `${b.commission}%`,
      "نوع العمولة": b.commission_type,
      الرصيد: b.balance,
      "الرحلات المكتملة": b.completed_trips,
      "الرحلات النشطة": b.active_trips,
      رحلات: b.trips_count,
      "إجمالي العملاء": b.clients_count,
      الهاتف: b.phone,
      "رقم الهوية": b.identity_number,
    }));
    exportToExcel(rows, "قائمة_الوسطاء", "الوسطاء");
  };

  const openBrokerDetails = async (broker) => {
    if (!broker?.id) return;
    setSelectedBroker(broker);
    try {
      const detail = await fetchBrokerById(broker.id);
      if (detail) setSelectedBroker(detail);
    } catch (e) {
      toast.error(e.message || "فشل تحميل تفاصيل الوسيط");
    }
  };

  const executeDelete = async () => {
    if (!modalState.broker?.id) return;
    setDeleteLoading(true);
    try {
      await deleteBroker(modalState.broker.id);
      toast.success("تم حذف الوسيط");
      if (selectedBroker && String(selectedBroker.id) === String(modalState.broker.id)) {
        setSelectedBroker(null);
      }
      closeModal();
      fetchList();
    } catch (e) {
      toast.error(e.message || "فشل الحذف");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (selectedBroker) {
    return (
      <>
        <BrokerDetailsView
          broker={selectedBroker}
          onBack={() => setSelectedBroker(null)}
          onEdit={(b) => setModalState({ type: "edit", broker: b })}
          onDelete={(b) => setModalState({ type: "delete", broker: b })}
        />
        <BrokerFormModal
          isOpen={modalState.type === "edit"}
          onClose={closeModal}
          brokerData={modalState.broker}
          onSaved={(saved) => {
            fetchList();
            if (saved) setSelectedBroker((prev) => (prev ? { ...prev, ...saved } : saved));
          }}
          onToast={(t, m) => toast[t](m)}
        />
        <ConfirmModal
          isOpen={modalState.type === "delete"}
          onClose={closeModal}
          onConfirm={executeDelete}
          title="حذف الوسيط"
          message={`هل تريد حذف الوسيط «${modalState.broker?.name}»؟`}
          confirmLabel="حذف"
          isSubmitting={deleteLoading}
        />
      </>
    );
  }

  return (
    <div className="w-full space-y-4" dir="rtl">
      <div className="bg-white rounded-xl px-5 py-3 border border-gray-200/60 shadow-sm text-right flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#c9a84c]">إدارة الوسطاء</h1>
          <p className="text-xs text-gray-400 mt-0.5">إدارة ومتابعة الوسطاء والعمولات</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={loading || !filtered.length}
          className="shrink-0 px-4 py-2 bg-[#c9a84c] hover:bg-[#b8973d] rounded-xl text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          تصدير
        </button>
      </div>

      <div className="relative bg-gradient-to-l from-[#b88121] to-[#dca43b] rounded-2xl overflow-hidden min-h-[150px] flex items-center justify-between px-8 shadow-sm">
        <div className="absolute left-4 bottom-0 h-[90%] w-1/3 max-w-[160px] pointer-events-none flex items-end">
          <img src={bannerImage} alt="" className="h-full w-full object-contain object-bottom drop-shadow-md" />
        </div>
        <div className="z-10 text-white text-right">
          <h2 className="text-5xl font-extrabold">
            {filtered.length} <span className="text-2xl font-normal">وسيط</span>
          </h2>
          <p className="text-sm opacity-80 mt-1">عدد الوسطاء المسجلين</p>
          <button
            type="button"
            onClick={() => canCreate && setModalState({ type: "add", broker: null })}
            disabled={!canCreate}
            className="mt-4 flex items-center gap-2 bg-white text-[#b88121] text-sm font-semibold px-5 py-2 rounded-full shadow hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة وسيط جديد
          </button>
        </div>
      </div>

      <div className="bg-[#faf8f4] rounded-2xl shadow-sm overflow-hidden border border-[#f0e9dc]">
        {loading ? (
          <Spinner />
        ) : error ? (
          <p className="text-center text-red-500 text-sm py-10">{error}</p>
        ) : paginated.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">لا توجد نتائج تطابق البحث</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="bg-[#f3eee4] border-b border-[#e8dfd0]">
                  {[
                    "الاسم",
                    "كود الوسيط",
                    "العمولة",
                    "الرصيد",
                    "الرحلات المكتملة",
                    "الرحلات النشطة",
                    "رحلات",
                    "إجمالي العملاء",
                    "إجراءات",
                  ].map((h) => (
                    <th key={h} className="px-4 py-3.5 text-xs font-semibold text-gray-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((broker) => (
                  <tr key={broker.id} className="border-b border-[#f0e9dc] bg-white/70 hover:bg-white transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={broker.name} />
                        <span className="font-medium text-gray-800">{broker.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 font-mono text-xs" dir="ltr">
                      {broker.broker_code}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[#c9a84c] font-bold">
                        {broker.commission_type === "نقدي"
                          ? `${Number(broker.commission).toLocaleString("en-US")} SR`
                          : `${broker.commission}%`}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap font-medium">
                      {fmtMoney(broker.balance)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                        {broker.completed_trips} مكتملة
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full text-xs font-bold bg-amber-50 text-[#b88121]">
                        {broker.active_trips ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-sky-50 text-sky-600">
                        {broker.trips_count}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700 font-medium">{broker.clients_count}</td>
                    <td className="px-4 py-3.5">
                      <ActionIcons
                        canView={canView}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onView={() => openBrokerDetails(broker)}
                        onEdit={() => setModalState({ type: "edit", broker })}
                        onDelete={() => setModalState({ type: "delete", broker })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#e8dfd0] bg-[#faf8f4]">
            <p className="text-xs text-gray-500 order-2 sm:order-1">
              عرض {rangeFrom}-{rangeTo} من أصل {filtered.length} وسطاء
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-600 order-1 sm:order-2" dir="ltr">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`w-7 h-7 rounded font-bold transition-colors ${
                    page === n
                      ? "bg-[#b88121] text-white shadow-sm"
                      : "bg-white border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <BrokerFormModal
        isOpen={modalState.type === "add" || modalState.type === "edit"}
        onClose={closeModal}
        brokerData={modalState.type === "edit" ? modalState.broker : null}
        onSaved={fetchList}
        onToast={(t, m) => toast[t](m)}
      />
      <ConfirmModal
        isOpen={modalState.type === "delete"}
        onClose={closeModal}
        onConfirm={executeDelete}
        title="حذف الوسيط"
        message={`هل تريد حذف الوسيط «${modalState.broker?.name}»؟`}
        confirmLabel="حذف"
        isSubmitting={deleteLoading}
      />
    </div>
  );
}
