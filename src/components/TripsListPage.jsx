import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus,
    RefreshCw,
    Eye,
    Edit2,
    Download,
    MapPin,
    Calendar,
    Car,
    Sparkles,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import AddPaymentModal from './AddPaymentModal';
import AssignTripModal from './AssignTripModal';
import EditOfferedTripModal from './EditOfferedTripModal';
import TripChangeStatusModal from './trip-details/TripChangeStatusModal';
import TripChatModal from './TripChatModal';
import { ConfirmModal } from './ui/AppModal';
import { useGlobalSearch } from '../hooks/useGlobalSearch';
import { bannerImage } from '../lib/images.js';
import { filterByGlobalSearch } from '../lib/searchUtils';
import { saveTripPayment } from "../lib/tripPaymentProofs.js";
import { useToast } from '../lib/toast.jsx';
import { fetchAllTripsForList, fetchOfferedTripsList, normalizeWithoutDriverTrip, fetchTripsHasDriverMap, hasAssignedDriver, deleteTripWithoutDriver } from "../services/tripService.js";
import { usePermissions } from '../hooks/usePermissions.js';
import { PERMISSIONS } from '../lib/permissions.js';
import { exportToExcel, tripToExportRow } from '../lib/exportExcel.js';

const OFFERED_STATUS_MAP = {
    pending: { label: "معلقة", color: "bg-amber-600" },
    offered: { label: "معروضة", color: "bg-[#c9a84c]" },
    completed: { label: "تم", color: "bg-green-600" },
    cancelled: { label: "ملغية", color: "bg-red-600" },
};

function TripTypeTabs({ active, onChange, driverCount, offeredCount, showDriver, showOffered }) {
    const tabs = [
        showOffered && { id: "offered", label: "الرحلات المعروضة", count: offeredCount, icon: Sparkles },
        showDriver && { id: "driver", label: "رحلات مسندة لسائق", count: driverCount, icon: Car },
    ].filter(Boolean);

    if (!tabs.length) return null;

    const handleClick = (id) => {
        onChange(active === id ? null : id);
    };

    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-6" dir="rtl">
            {tabs.map((tab) => {
                const isActive = active === tab.id;
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => handleClick(tab.id)}
                        className={`group relative flex-1 overflow-hidden rounded-2xl px-5 py-4 transition-all duration-300 ${
                            isActive
                                ? "bg-gradient-to-l from-[#a87218] via-[#c9922e] to-[#e0b04a] text-white shadow-xl shadow-[#c9922e]/35 scale-[1.02] ring-2 ring-[#f0d78a]/60"
                                : "bg-white text-[#8a5f12] border-2 border-[#e8d5a8] shadow-sm hover:shadow-lg hover:border-[#d4a84a] hover:-translate-y-0.5"
                        }`}
                    >
                        {isActive && (
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none" />
                        )}
                        <div className="relative flex items-center justify-between gap-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                isActive
                                    ? "bg-white/25 text-white backdrop-blur-sm"
                                    : "bg-[#fffcf5] text-[#9C6402] border border-[#f0e4c8]"
                            }`}>
                                {tab.count}
                            </span>
                            <div className="flex items-center gap-2.5">
                                <span className="text-base font-bold tracking-tight">{tab.label}</span>
                                <span className={`flex items-center justify-center w-9 h-9 rounded-xl ${
                                    isActive
                                        ? "bg-white/20 text-white"
                                        : "bg-gradient-to-br from-[#fffcf5] to-[#f5e6c8] text-[#bd8b2a] group-hover:scale-110 transition-transform"
                                }`}>
                                    <Icon className="w-5 h-5" strokeWidth={2.25} />
                                </span>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

// ==========================================
// 2. المكون الأساسي لصفحة سجل الرحلات
// ==========================================
const TripsLog = () => {
    const location = useLocation();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [assignModal, setAssignModal] = useState({ open: false, tripId: null, tripTotalPrice: "" });
    const [chatModal, setChatModal] = useState({ open: false, tripId: null, tripLabel: "", trip: null });
    const [deleteModal, setDeleteModal] = useState({ open: false, trip: null });
    const [isDeletingTrip, setIsDeletingTrip] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [statusTrip, setStatusTrip] = useState(null);
    const [selectedTripId, setSelectedTripId] = useState(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState(null);

    const [trips, setTrips] = useState([]);
    const [offeredTrips, setOfferedTrips] = useState([]);
    const [tripsLoading, setTripsLoading] = useState(false);
    const [tripsError, setTripsError] = useState(null);
    const [activeList, setActiveList] = useState(null);
    const [driverStatusMap, setDriverStatusMap] = useState({});
    const { searchQuery } = useGlobalSearch();
    const { can } = usePermissions();
    const toast = useToast();
    const canEdit = can(PERMISSIONS.TRIPS_EDIT);
    const canExport = can(PERMISSIONS.TRIPS_EXPORT);
    const canAddPayment = can(PERMISSIONS.TRIPS_PAYMENT_ADD);
    const canChangeStatus = can(PERMISSIONS.TRIPS_STATUS_CHANGE);
    const canViewDetails = can(PERMISSIONS.TRIPS_VIEW_DETAILS);
    const canDriverTab = can(PERMISSIONS.TRIPS_DRIVER_TAB);
    const canOfferedTab = can(PERMISSIONS.TRIPS_OFFERED_TAB);
    const canAdsEdit = can(PERMISSIONS.TRIPS_ADS_EDIT);
    const canAdsPublish = can(PERMISSIONS.TRIPS_ADS_PUBLISH);
    const canAdsDelete = can(PERMISSIONS.TRIPS_ADS_DELETE);
    const canOfferedAssign = can(PERMISSIONS.TRIPS_OFFERED_ASSIGN);
    const canOfferedChat = can(PERMISSIONS.TRIPS_OFFERED_CHAT);
    const canOfferedEdit = canAdsEdit;
    const canOfferedPublish = canAdsPublish;

    const filteredTrips = useMemo(
        () => filterByGlobalSearch(trips, searchQuery, (trip) => {
            const driverName = trip.driver ? `${trip.driver.name} ${trip.driver.last_name ?? ''}`.trim() : '';
            const salesNames = trip.sales?.map((s) => s.name).join(' ') ?? '';
            const passengerName = trip.main_passenger?.full_name ?? '';
            return [
                trip.id,
                trip.from,
                trip.to,
                trip.trip_status,
                trip.trip_type,
                trip.region,
                driverName,
                salesNames,
                passengerName,
                trip.total_price,
                trip.our_commission,
            ];
        }),
        [trips, searchQuery]
    );

    const filteredOfferedTrips = useMemo(
        () => filterByGlobalSearch(offeredTrips, searchQuery, (trip) => {
            const driverName = trip.driver ? `${trip.driver.name} ${trip.driver.last_name ?? ''}`.trim() : '';
            const salesNames = trip.sales?.map((s) => s.name).join(' ') ?? '';
            const passengerName = trip.main_passenger?.full_name ?? '';
            return [
                trip.id,
                trip.from,
                trip.to,
                trip.trip_type,
                trip.region,
                driverName,
                salesNames,
                passengerName,
                trip.total_price,
            ];
        }),
        [offeredTrips, searchQuery]
    );

    const totalTripsCount = useMemo(
        () => filteredTrips.length + filteredOfferedTrips.length,
        [filteredTrips, filteredOfferedTrips]
    );

    // جلب الرحلات من API
    const fetchTrips = async ({ silent = false } = {}) => {
        if (!silent) setTripsLoading(true);
        setTripsError(null);
        try {
            const [list, offered] = await Promise.all([
                fetchAllTripsForList(),
                fetchOfferedTripsList().catch(() => []),
            ]);
            setTrips(list);
            setOfferedTrips(offered);
        } catch (err) {
            setTripsError(err.message);
        } finally {
            if (!silent) setTripsLoading(false);
        }
    };

    // أعد الـ fetch كل ما تُفتح الصفحة
    useEffect(() => {
        fetchTrips();
    }, [location.key]);

    // Refresh when a trip is assigned from CreateTripPage
    useEffect(() => {
        const handler = () => fetchTrips();
        window.addEventListener('trips-list-refresh', handler);
        return () => window.removeEventListener('trips-list-refresh', handler);
    }, []);

    useEffect(() => {
        if (!offeredTrips.length) {
            setDriverStatusMap({});
            return;
        }
        const ctrl = new AbortController();
        fetchTripsHasDriverMap(
            offeredTrips.map((t) => t.id),
            ctrl.signal,
        )
            .then((map) => {
                if (!ctrl.signal.aborted) setDriverStatusMap(map);
            })
            .catch((err) => {
                if (err?.name !== "AbortError") console.error("[TripsList] has-driver", err);
            });
        return () => ctrl.abort();
    }, [offeredTrips]);

    const isTripAvailable = (trip) => {
        const key = String(trip.id);
        if (driverStatusMap[key] !== undefined) return !driverStatusMap[key];
        return !hasAssignedDriver(trip);
    };

    const deleteOfferedTrip = async () => {
        const tripId = deleteModal.trip?.id;
        if (!tripId) return;
        setIsDeletingTrip(true);
        try {
            await deleteTripWithoutDriver(tripId);
            setOfferedTrips((prev) => prev.filter((t) => String(t.id) !== String(tripId)));
            setDriverStatusMap((prev) => {
                const next = { ...prev };
                delete next[String(tripId)];
                return next;
            });
            setDeleteModal({ open: false, trip: null });
            toast.success("تم حذف الرحلة المعروضة بنجاح");
        } catch (err) {
            toast.error(err.message || "فشل حذف الرحلة المعروضة");
        } finally {
            setIsDeletingTrip(false);
        }
    };

    const handleEditClick = (trip) => {
        setSelectedTrip(trip);
        setIsEditModalOpen(true);
    };

    const renderTripCard = (trip, index, { variant = "driver" } = {}) => {
        const tripId = `#${trip.id}`;
        const statusColorMap = {
            'تم': 'bg-green-600',
            'قيد التنفيذ': 'bg-blue-600',
            'ملغية': 'bg-red-600',
            'معلقة': 'bg-amber-600',
            'موقوفة': 'bg-gray-400',
            'معروضة': 'bg-purple-600',
        };
        const offeredSt = OFFERED_STATUS_MAP[trip.status] ?? { label: trip.status ?? "—", color: "bg-gray-500" };
        const status = variant === "offered"
            ? offeredSt.label
            : (trip.trip_status ?? "—");
        const statusColor = variant === "offered"
            ? offeredSt.color
            : (statusColorMap[status] ?? "bg-gray-500");
        const tripType = trip.trip_type ?? "—";
        const driverName = trip.driver ? `${trip.driver.name} ${trip.driver.last_name ?? ""}`.trim() : "—";
        const totalPrice = trip.total_price ? `${Number(trip.total_price).toLocaleString("ar-SA")} ر.س` : "—";
        const commissionVal = trip.our_commission ?? trip.commission_amount;
        const commission = commissionVal ? `${Number(commissionVal).toLocaleString("ar-SA")} ر.س` : "—";
        const amountPaid = trip.amount_paid ? `${Number(trip.amount_paid).toLocaleString("ar-SA")} ر.س` : "—";
        const tripDate = trip.trip_date ? new Date(trip.trip_date).toLocaleDateString("ar-SA") : "—";
        const salesNames = trip.sales?.map((s) => s.name).join("، ") ?? "—";
        const region = trip.region ?? "—";
        const customerPhone = trip.customer_phone ?? trip.main_passenger?.phone ?? "—";
        const available = variant === "offered" ? isTripAvailable(trip) : false;

        return (
            <div key={`${variant}-${trip.id ?? index}`} className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row overflow-hidden min-h-[190px]">
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base font-bold text-gray-800">{tripId}</span>
                            <span className={`${statusColor} text-white text-xs px-2.5 py-0.5 rounded-full font-medium`}>
                                {status}
                            </span>
                            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-0.5 rounded-md">
                                {tripType}
                            </span>
                        </div>
                        <div className="text-amber-700 font-bold text-xl">{totalPrice}</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600 mt-2">
                        <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                <span className="font-semibold text-gray-800">{trip.from ?? "—"}</span>
                                {trip.to && (
                                    <>
                                        <span className="text-gray-400">←</span>
                                        <span className="text-gray-500">{trip.to}</span>
                                    </>
                                )}
                            </div>
                            <div className="flex items-center gap-2 pr-5">
                                <span className="bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0.5 rounded">المنطقة</span>
                                <span>{region}</span>
                            </div>
                            <div className="pr-5 text-gray-500">
                                السائق: <span className="font-medium text-gray-800">{driverName}</span>
                            </div>
                        </div>

                        <div className="space-y-1.5 md:border-r md:border-l border-gray-100 md:px-4">
                            <div className="flex items-center gap-1.5 text-gray-500">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                <span>{tripDate}</span>
                            </div>
                            <div className="text-gray-500">
                                هاتف العميل: <span className="font-medium text-gray-800">{customerPhone}</span>
                            </div>
                            <div className="text-gray-500">
                                السيلز: <span className="font-medium text-gray-800">{salesNames}</span>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center space-y-1.5 md:ml-auto text-right min-w-[120px]">
                            <div className="text-gray-500">
                                العمولة: <span className="font-semibold text-amber-600">{commission}</span>
                            </div>
                            <div className="text-gray-500">
                                المدفوع: <span className="font-semibold text-amber-600">{amountPaid}</span>
                            </div>
                            {trip.transfer_method && (
                                <div className="text-gray-400">{trip.transfer_method}</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50/50 p-4 border-l border-gray-100 flex flex-col gap-2 justify-center w-full md:w-44 text-center">
                    <span className="text-xs font-semibold text-gray-400 mb-1 block">الإجراءات</span>

                    {variant === "driver" && canAddPayment && (
                            <button
                                onClick={() => { setSelectedTripId(trip.id); setIsPaymentModalOpen(true); }}
                                className="flex items-center justify-center gap-1 bg-[#474747] text-white text-xs py-1.5 px-3 rounded hover:bg-black transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> اضافة دفعه
                            </button>
                    )}
                    {variant === "driver" && canChangeStatus && (
                            <button
                                onClick={() => { setStatusTrip(trip); setIsStatusModalOpen(true); }}
                                className="flex items-center justify-center gap-1 bg-white border border-gray-300 text-gray-700 text-xs py-1.5 px-3 rounded hover:bg-gray-50 transition-colors"
                            >
                                <RefreshCw className="w-3.5 h-3.5 text-gray-400" /> تغيير الحالة
                            </button>
                    )}
                    {variant === "driver" && canEdit && (
                            <button
                                onClick={() => handleEditClick(trip)}
                                className="flex items-center justify-center gap-1 bg-white border border-gray-300 text-gray-700 text-xs py-1.5 px-3 rounded hover:bg-gray-50 transition-colors"
                            >
                                <Edit2 className="w-3.5 h-3.5 text-gray-400" /> تعديل
                            </button>
                    )}

                    {variant === "offered" && (
                        <>
                            {canOfferedAssign && (
                                <button
                                    type="button"
                                    onClick={() => setAssignModal({ open: true, tripId: trip.id, tripTotalPrice: trip.total_price ?? trip.price ?? "" })}
                                    className="flex items-center justify-center gap-1 bg-[#474747] text-white text-xs py-1.5 px-3 rounded hover:bg-black transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" /> إسناد رحلة
                                </button>
                            )}

                            {canOfferedPublish && (
                                <div
                                    className="flex items-center justify-center gap-1.5 text-xs py-1.5 px-3 rounded border border-gray-300 bg-white text-gray-700"
                                    title={available ? "الرحلة متاحة للسائقين" : "الرحلة موقوفة — تم إسناد سائق"}
                                >
                                    <div className={`w-7 h-4 rounded-full flex items-center px-0.5 transition-colors ${available ? "bg-amber-500" : "bg-gray-300"}`}>
                                        <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${available ? "translate-x-3" : "translate-x-0"}`} />
                                    </div>
                                    <span>{available ? "متاح" : "موقوف"}</span>
                                </div>
                            )}

                            {canOfferedEdit && (
                                <button
                                    type="button"
                                    onClick={() => handleEditClick(normalizeWithoutDriverTrip(trip))}
                                    className="flex items-center justify-center gap-1 bg-white border border-gray-300 text-gray-700 text-xs py-1.5 px-3 rounded hover:bg-gray-50 transition-colors"
                                >
                                    <Edit2 className="w-3.5 h-3.5 text-gray-400" /> تعديل
                                </button>
                            )}

                            {canOfferedChat && (
                            <button
                                type="button"
                                onClick={() => setChatModal({
                                    open: true,
                                    tripId: trip.id,
                                    tripLabel: `${trip.from} → ${trip.to}`,
                                    trip,
                                })}
                                className="flex items-center justify-center gap-1 bg-white border border-gray-300 text-gray-700 text-xs py-1.5 px-3 rounded hover:bg-gray-50 transition-colors"
                            >
                                المحادثات
                            </button>
                            )}

                            {canAdsDelete && (
                                <button
                                    type="button"
                                    onClick={() => setDeleteModal({ open: true, trip })}
                                    className="flex items-center justify-center gap-1 bg-white border border-red-200 text-red-400 text-xs py-1.5 px-3 rounded hover:bg-red-50 transition-colors"
                                >
                                    حذف
                                </button>
                            )}
                        </>
                    )}

                    {variant === "driver" && canViewDetails && (
                        <Link
                            to={`/trips/${trip.id}`}
                            className="flex items-center justify-center gap-1 bg-white border border-gray-300 text-gray-700 text-xs py-1.5 px-3 rounded hover:bg-gray-50 transition-colors no-underline"
                        >
                            <Eye className="w-3.5 h-3.5 text-gray-400" /> تفاصيل
                        </Link>
                    )}
                </div>
            </div>
        );
    };

    const handleExport = () => {
        let rows = [];
        if (activeList === "driver") {
            rows = filteredTrips.map((t) => tripToExportRow(t, "driver"));
        } else if (activeList === "offered") {
            rows = filteredOfferedTrips.map((t) => tripToExportRow(t, "offered"));
        } else {
            rows = [
                ...filteredTrips.map((t) => tripToExportRow(t, "driver")),
                ...filteredOfferedTrips.map((t) => tripToExportRow(t, "offered")),
            ];
        }

        if (!rows.length) {
            toast.error("لا توجد بيانات للتصدير");
            return;
        }

        try {
            exportToExcel(rows, "سجل_الرحلات", "الرحلات");
            toast.success("تم تصدير البيانات بنجاح");
        } catch (err) {
            toast.error(err.message || "فشل التصدير");
        }
    };

    return (
        <div className="w-full font-sans text-right" dir="rtl">
            {/* عنوان الصفحة وأزرار التحكم */}
            <div className="bg-white rounded-2xl shadow-sm px-5 py-4 flex justify-between items-center mb-5">
                <div className="text-right">
                    <h1 className="text-xl font-bold text-[#bd8b2a]">سجل الرحلات</h1>
                    <p className="text-sm text-gray-500 mt-0.5">إدارة ومتابعة الرحلات بجميع تفاصيلها</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchTrips}
                        disabled={tripsLoading}
                        className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${tripsLoading ? 'animate-spin' : ''}`} />
                        تحديث
                    </button>
                    {canExport && (
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <Download className="w-3.5 h-3.5 text-gray-500" />
                        تصدير
                    </button>
                    )}
                </div>

            </div>

            {/* البانر الإعلاني */}
            {/* البانر الإعلاني */}
            <div className="relative bg-gradient-to-l from-[#b88121] to-[#dca43b] rounded-xl mb-6 shadow-sm overflow-hidden h-[150px] md:h-[180px] flex items-center px-6 md:px-12">

                <div className="absolute top-0 bottom-0 left-0 flex items-end justify-start pointer-events-none md:left-4 pl-4 md:pl-0">
                    <img
                        src={bannerImage}
                        alt="توصيل ورحلات"
                        className="max-h-[90%] md:max-h-[95%] w-auto object-contain"
                    />
                </div>

                <div className="z-10 text-white text-right ml-auto">
                    <h2 className="text-5xl font-bold flex items-center justify-end gap-3">
                        {totalTripsCount} <span className="text-3xl font-medium pt-1">رحلة</span>
                    </h2>
                </div>
            </div>

            {/* قائمة كروت الرحلات */}
            {tripsLoading && (
                <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    جاري تحميل الرحلات...
                </div>
            )}

            {tripsError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 text-right flex items-center justify-between">
                    <button onClick={fetchTrips} className="text-xs underline text-red-500">إعادة المحاولة</button>
                    <span>{tripsError}</span>
                </div>
            )}

            {!tripsLoading && !tripsError && (
                <>
                    <TripTypeTabs
                        active={activeList}
                        onChange={setActiveList}
                        driverCount={filteredTrips.length}
                        offeredCount={filteredOfferedTrips.length}
                        showDriver={canDriverTab}
                        showOffered={canOfferedTab}
                    />

                    {activeList && (
                        <div className="space-y-4 w-full">
                            {activeList === "driver" && (
                                filteredTrips.length === 0 ? (
                                    <p className="text-center text-gray-400 text-sm py-10 bg-white rounded-xl border border-gray-100">
                                        {trips.length === 0 ? "لا توجد رحلات مسندة لسائق" : "لا توجد نتائج تطابق البحث"}
                                    </p>
                                ) : (
                                    filteredTrips.map((trip, index) => renderTripCard(trip, index, { variant: "driver" }))
                                )
                            )}

                            {activeList === "offered" && (
                                filteredOfferedTrips.length === 0 ? (
                                    <p className="text-center text-gray-400 text-sm py-10 bg-white rounded-xl border border-gray-100">
                                        {offeredTrips.length === 0 ? "لا توجد رحلات معروضة" : "لا توجد نتائج تطابق البحث"}
                                    </p>
                                ) : (
                                    filteredOfferedTrips.map((trip, index) => renderTripCard(trip, index, { variant: "offered" }))
                                )
                            )}
                        </div>
                    )}
                </>
            )}


            <AssignTripModal
                isOpen={assignModal.open}
                tripId={assignModal.tripId}
                tripTotalPrice={assignModal.tripTotalPrice}
                onClose={() => setAssignModal({ open: false, tripId: null, tripTotalPrice: "" })}
                onSuccess={(result) => {
                    const tripId = assignModal.tripId;
                    const driverId = result?.driver_id ?? result?.data?.driver_id;
                    const driver = result?.driver ?? result?.data?.driver;
                    setAssignModal({ open: false, tripId: null, tripTotalPrice: "" });
                    setDriverStatusMap((prev) => ({ ...prev, [String(tripId)]: true }));
                    setOfferedTrips((prev) => prev.map((t) => {
                        if (String(t.id) !== String(tripId)) return t;
                        return {
                            ...t,
                            driver_id: driverId ?? driver?.id ?? t.driver_id,
                            driver: driver ?? (driverId ? { id: driverId } : t.driver),
                        };
                    }));
                    fetchTrips({ silent: true });
                }}
            />

            <TripChatModal
                isOpen={chatModal.open}
                tripId={chatModal.tripId}
                tripLabel={chatModal.tripLabel}
                trip={chatModal.trip}
                onClose={() => setChatModal({ open: false, tripId: null, tripLabel: "", trip: null })}
                onTripUpdated={(result) => {
                    const updated = result?.trip ?? result;
                    const tripId = chatModal.tripId;
                    const driverId = result?.driver_id ?? result?.data?.driver_id ?? updated?.driver_id;
                    const driver = result?.driver ?? result?.data?.driver ?? updated?.driver;
                    if (driverId || driver) {
                        setDriverStatusMap((prev) => ({ ...prev, [String(tripId)]: true }));
                        setOfferedTrips((prev) => prev.map((t) => {
                            if (String(t.id) !== String(tripId)) return t;
                            return {
                                ...t,
                                driver_id: driverId ?? driver?.id ?? t.driver_id,
                                driver: driver ?? (driverId ? { id: driverId } : t.driver),
                            };
                        }));
                    }
                    if (updated?.id) {
                        const normalized = normalizeWithoutDriverTrip(updated);
                        setTrips((prev) =>
                            prev.map((t) => (t.id === updated.id ? { ...t, ...normalized } : t))
                        );
                        setOfferedTrips((prev) =>
                            prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
                        );
                    } else {
                        fetchTrips({ silent: true });
                    }
                }}
            />

            <ConfirmModal
                isOpen={deleteModal.open}
                onClose={() => {
                    if (isDeletingTrip) return;
                    setDeleteModal({ open: false, trip: null });
                }}
                onConfirm={deleteOfferedTrip}
                title="حذف الرحلة المعروضة"
                message={deleteModal.trip ? `هل تريد حذف الرحلة #${deleteModal.trip.id}؟ لا يمكن التراجع عن هذا الإجراء.` : ""}
                confirmLabel="حذف"
                cancelLabel="إلغاء"
                isSubmitting={isDeletingTrip}
                variant="danger"
            />

            <AddPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => { setIsPaymentModalOpen(false); setSelectedTripId(null); }}
                tripId={selectedTripId}
                onSuccess={async (data, meta) => {
                    await saveTripPayment(selectedTripId, {
                        id: `local-${Date.now()}`,
                        amount: meta?.amount_paid ?? data?.amount_paid,
                        amount_paid: meta?.amount_paid ?? data?.amount_paid,
                        date: meta?.commission_transfer_date,
                        transfer_method: meta?.transfer_method,
                        account_number: meta?.account_number,
                        recipient_account: meta?.recipient_account,
                        note: meta?.payment_note,
                        transfer_image: data?.transfer_image,
                    }, meta?.transfer_image);
                    setTrips(prev => prev.map(t =>
                        t.id === selectedTripId
                            ? { ...t, total_price: data.total_price, amount_paid: data.amount_paid, remaining_amount: data.remaining_amount, transfer_image: data.transfer_image }
                            : t
                    ));
                }}
            />

            <TripChangeStatusModal
                isOpen={isStatusModalOpen}
                onClose={() => { setIsStatusModalOpen(false); setStatusTrip(null); }}
                trip={statusTrip}
                onSuccess={(updated) => {
                    const trip = updated?.trip ?? updated;
                    if (trip?.id) {
                        const normalized = normalizeWithoutDriverTrip(trip);
                        setTrips((prev) =>
                            prev.map((t) => (t.id === trip.id ? { ...t, ...normalized } : t))
                        );
                        setOfferedTrips((prev) =>
                            prev.map((t) => (t.id === trip.id ? { ...t, ...trip } : t))
                        );
                    } else {
                        fetchTrips({ silent: true });
                    }
                }}
            />

            <EditOfferedTripModal
                isOpen={isEditModalOpen}
                trip={selectedTrip}
                onClose={() => { setIsEditModalOpen(false); setSelectedTrip(null); }}
                onSuccess={(result) => {
                    const updated = result?.trip ?? result;
                    if (updated?.id) {
                        const normalized = normalizeWithoutDriverTrip(updated);
                        setTrips((prev) =>
                            prev.map((t) => (t.id === updated.id ? { ...t, ...normalized } : t))
                        );
                        setOfferedTrips((prev) =>
                            prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
                        );
                    } else {
                        fetchTrips({ silent: true });
                    }
                }}
            />
        </div>
    );
};

export default TripsLog;
