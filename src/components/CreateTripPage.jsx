import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Edit2,
  MapPin,
  Calendar,
} from "lucide-react";
import EditOfferedTripModal from "./EditOfferedTripModal";
import AssignTripModal from "./AssignTripModal";
import TripChatModal from "./TripChatModal";
import { ConfirmModal } from "./ui/AppModal";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { filterByGlobalSearch } from "../lib/searchUtils";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { bannerImage } from "../lib/images.js";
import { useToast } from "../lib/toast.jsx";
import {
  hasAssignedDriver,
  fetchTripsHasDriverMap,
  deleteTripWithoutDriver,
} from "../services/tripService.js";

const API_URL = "/api/trip-without-drivers";

const OFFERED_STATUS_MAP = {
  pending: { label: "معلقة", color: "bg-amber-600" },
  offered: { label: "معروضة", color: "bg-[#c9a84c]" },
  completed: { label: "تم", color: "bg-green-600" },
  cancelled: { label: "ملغية", color: "bg-red-600" },
};

function offeredStatus(trip) {
  const key = trip?.status ?? "pending";
  return OFFERED_STATUS_MAP[key] ?? { label: key, color: "bg-gray-500" };
}

function useOfferedTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_URL, { headers: { Accept: "application/json" }, signal: ctrl.signal });
      if (!res.ok) throw new Error(`فشل تحميل البيانات (${res.status})`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.data ?? []);
      if (!ctrl.signal.aborted) setTrips(list);
    } catch (err) {
      if (!ctrl.signal.aborted) {
        console.error("[OfferedTrips]", err);
        setError(err.message);
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); return () => abortRef.current?.abort(); }, [load]);
  return { trips, setTrips, loading, error, retry: load };
}

export default function CreateTripPage() {
  const navigate = useNavigate();
  const { trips, setTrips, loading, error, retry } = useOfferedTrips();
  const [assignModal, setAssignModal] = useState({ open: false, tripId: null });
  const [chatModal, setChatModal] = useState({ open: false, tripId: null, tripLabel: "" });
  const [editModal, setEditModal] = useState({ open: false, trip: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, trip: null });
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);
  const [driverStatusMap, setDriverStatusMap] = useState({});
  const { searchQuery } = useGlobalSearch();
  const { can } = usePermissions();
  const toast = useToast();
  const canCreate = can(PERMISSIONS.TRIPS_ADS_CREATE);
  const canEdit = can(PERMISSIONS.TRIPS_ADS_EDIT);
  const canDelete = can(PERMISSIONS.TRIPS_ADS_DELETE);
  const canPublish = can(PERMISSIONS.TRIPS_ADS_PUBLISH);
  const canAssign = can(PERMISSIONS.TRIPS_OFFERED_ASSIGN);
  const canChat = can(PERMISSIONS.TRIPS_OFFERED_CHAT);

  const filteredTrips = useMemo(
    () => filterByGlobalSearch(trips, searchQuery, (trip) => {
      const driverName = trip.driver ? `${trip.driver.name} ${trip.driver.last_name ?? ""}`.trim() : "";
      const salesNames = trip.sales?.map((s) => s.name).join(" ") ?? "";
      return [
        trip.id,
        trip.from,
        trip.to,
        trip.trip_type,
        trip.route_type,
        trip.route_direction,
        trip.subscription_type,
        trip.region,
        driverName,
        salesNames,
        trip.main_passenger?.full_name,
        trip.main_passenger?.phone,
        trip.total_price,
      ];
    }),
    [trips, searchQuery]
  );

  useEffect(() => {
    if (!trips.length) {
      setDriverStatusMap({});
      return;
    }
    const ctrl = new AbortController();
    fetchTripsHasDriverMap(
      trips.map((t) => t.id),
      ctrl.signal,
    )
      .then((map) => {
        if (!ctrl.signal.aborted) setDriverStatusMap(map);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") console.error("[OfferedTrips] has-driver", err);
      });
    return () => ctrl.abort();
  }, [trips]);

  /** بدون سائق = متاح، مع سائق = موقوف — من API ثم البيانات المحلية */
  const isTripAvailable = (trip) => {
    const key = String(trip.id);
    if (driverStatusMap[key] !== undefined) return !driverStatusMap[key];
    return !hasAssignedDriver(trip);
  };

  const deleteTrip = async () => {
    const tripId = deleteModal.trip?.id;
    if (!tripId) return;
    setIsDeletingTrip(true);
    try {
      await deleteTripWithoutDriver(tripId);
      setTrips((prev) => prev.filter((t) => String(t.id) !== String(tripId)));
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

  return (
    <div className="w-full space-y-4 p-4" dir="rtl">

      <div className="bg-white rounded-xl px-5 py-3 border border-gray-200/60 shadow-sm flex items-center justify-end">
        <div className="text-right">
          <h1 className="text-xl font-bold text-[#c9a84c]">قائمة الرحلات المعروضة</h1>
          <p className="text-xs text-gray-400">الرحلات للسائقين المسجلين بالتطبيق</p>
        </div>
      </div>

      <div className="relative bg-gradient-to-l from-[#b88121] to-[#dca43b] rounded-2xl overflow-hidden min-h-[160px] flex items-center px-10 shadow-sm">
        <div className="absolute left-0 bottom-0 h-full w-48 pointer-events-none flex items-end">
          <img src={bannerImage} alt="" className="h-[95%] w-full object-contain object-bottom drop-shadow-md"/>
        </div>
        <div className="z-10 text-white text-right ml-auto">
          <h2 className="text-5xl font-extrabold flex items-baseline gap-2"><span>{loading ? "…" : trips.length}</span><span className="text-2xl font-normal">رحلة</span></h2>
          <p className="text-sm opacity-90 mt-1">عدد الرحلات النشطة</p>
          {canCreate && (
          <button onClick={() => navigate("/new-trip")} className="mt-4 flex items-center gap-2 bg-white text-[#b88121] text-sm font-semibold px-5 py-2 rounded-full shadow hover:bg-amber-50 transition-colors">
            <Plus className="w-4 h-4" />
            إنشاء رحلة جديدة
          </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
            <div className="w-5 h-5 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
            جاري تحميل الرحلات...
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center justify-between" dir="rtl">
            <button onClick={retry} className="text-xs underline text-red-500">إعادة المحاولة</button>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && filteredTrips.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-10">
            {trips.length === 0 ? "لا توجد رحلات متاحة حالياً" : "لا توجد نتائج تطابق البحث"}
          </p>
        )}

        {!loading && !error && filteredTrips.map((trip) => {
          const st = offeredStatus(trip);
          const tripId = `#${trip.id}`;
          const totalPrice = trip.total_price
            ? `${Number(trip.total_price).toLocaleString("ar-SA")} ر.س`
            : "—";
          const commission = trip.our_commission
            ? `${Number(trip.our_commission).toLocaleString("ar-SA")} ر.س`
            : "—";
          const amountPaid = trip.amount_paid
            ? `${Number(trip.amount_paid).toLocaleString("ar-SA")} ر.س`
            : "—";
          const tripDate = trip.trip_date
            ? new Date(trip.trip_date).toLocaleDateString("ar-SA")
            : "—";
          const driverName = trip.driver
            ? `${trip.driver.name} ${trip.driver.last_name ?? ""}`.trim()
            : "—";
          const salesNames = trip.sales?.map((s) => s.name).join("، ") ?? "—";
          const customerPhone = trip.main_passenger?.phone ?? trip.customer_phone ?? "—";
          const region = trip.region ?? trip.city ?? "—";
          const available = isTripAvailable(trip);

          return (
            <div key={trip.id} className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row overflow-hidden">
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold text-gray-800">{tripId}</span>
                    <span className={`${st.color} text-white text-xs px-2.5 py-0.5 rounded-full font-medium`}>
                      {st.label}
                    </span>
                    {trip.trip_type && (
                      <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-0.5 rounded-md">
                        {trip.trip_type}
                      </span>
                    )}
                    {trip.subscription_type && (
                      <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-0.5 rounded-md">
                        {trip.subscription_type}
                      </span>
                    )}
                    {trip.route_type && (
                      <span className="bg-[#fffcf5] border border-[#c9a84c]/30 text-[#9C6402] text-xs px-2.5 py-0.5 rounded-md">
                        {trip.route_type}
                      </span>
                    )}
                  </div>
                  <div className="text-amber-700 font-bold text-xl">{totalPrice}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
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
                    {trip.route_direction && (
                      <div className="text-gray-400">{trip.route_direction}</div>
                    )}
                  </div>

                  <div className="flex flex-col justify-center space-y-1.5 md:ml-auto text-right min-w-[120px]">
                    <div className="text-gray-500">
                      العمولة: <span className="font-semibold text-amber-600">{commission}</span>
                    </div>
                    <div className="text-gray-500">
                      المدفوع: <span className="font-semibold text-amber-600">{amountPaid}</span>
                    </div>
                    {Array.isArray(trip.operation_days) && trip.operation_days.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-end">
                        {trip.operation_days.map((day) => (
                          <span key={day} className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded">
                            {day}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50/50 p-4 border-l border-gray-100 flex flex-col gap-2 justify-center w-full md:w-44 text-center">
                <span className="text-xs font-semibold text-gray-400 mb-1 block">الإجراءات</span>

                {canAssign && (
                  <button
                    type="button"
                    onClick={() => setAssignModal({ open: true, tripId: trip.id })}
                    className="flex items-center justify-center gap-1 bg-[#474747] text-white text-xs py-1.5 px-3 rounded hover:bg-black transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> إسناد رحلة
                  </button>
                )}

                {canPublish && (
                  <div
                    className="flex items-center justify-center gap-1.5 text-xs py-1.5 px-3 rounded border border-gray-300 bg-white text-gray-700"
                    title={available ? "الرحلة متاحة للسائقين" : "الرحلة موقوفة — تم إسناد سائق"}
                  >
                    <div className={`w-7 h-4 rounded-full flex items-center px-0.5 transition-colors ${available ? "bg-amber-500" : "bg-gray-300"}`}>
                      <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${available ? "translate-x-3" : "translate-x-0"}`}/>
                    </div>
                    <span>{available ? "متاح" : "موقوف"}</span>
                  </div>
                )}

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setEditModal({ open: true, trip })}
                    className="flex items-center justify-center gap-1 bg-white border border-gray-300 text-gray-700 text-xs py-1.5 px-3 rounded hover:bg-gray-50 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-400" /> تعديل
                  </button>
                )}

                {canChat && (
                <button
                  type="button"
                  onClick={() => setChatModal({
                    open: true,
                    tripId: trip.id,
                    tripLabel: `${trip.from} → ${trip.to}`,
                  })}
                  className="flex items-center justify-center gap-1 bg-white border border-gray-300 text-gray-700 text-xs py-1.5 px-3 rounded hover:bg-gray-50 transition-colors"
                >
                  المحادثات
                </button>
                )}

                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleteModal({ open: true, trip })}
                    className="flex items-center justify-center gap-1 bg-white border border-red-200 text-red-400 text-xs py-1.5 px-3 rounded hover:bg-red-50 transition-colors"
                  >
                    حذف
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AssignTripModal
        isOpen={assignModal.open}
        tripId={assignModal.tripId}
        onClose={() => setAssignModal({ open: false, tripId: null })}
        onSuccess={(result) => {
          const tripId = assignModal.tripId;
          const driverId = result?.driver_id ?? result?.data?.driver_id;
          const driver = result?.driver ?? result?.data?.driver;
          setDriverStatusMap((prev) => ({ ...prev, [String(tripId)]: true }));
          setTrips((prev) => prev.map((t) => {
            if (String(t.id) !== String(tripId)) return t;
            return {
              ...t,
              driver_id: driverId ?? driver?.id ?? t.driver_id,
              driver: driver ?? (driverId ? { id: driverId } : t.driver),
            };
          }));
          window.dispatchEvent(new CustomEvent("trips-list-refresh"));
        }}
      />

      <TripChatModal
        isOpen={chatModal.open}
        tripId={chatModal.tripId}
        tripLabel={chatModal.tripLabel}
        onClose={() => setChatModal({ open: false, tripId: null, tripLabel: "" })}
      />

      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => {
          if (isDeletingTrip) return;
          setDeleteModal({ open: false, trip: null });
        }}
        onConfirm={deleteTrip}
        title="حذف الرحلة المعروضة"
        message={deleteModal.trip ? `هل تريد حذف الرحلة #${deleteModal.trip.id}؟ لا يمكن التراجع عن هذا الإجراء.` : ""}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        isSubmitting={isDeletingTrip}
        variant="danger"
      />

      <EditOfferedTripModal
        isOpen={editModal.open}
        trip={editModal.trip}
        onClose={() => setEditModal({ open: false, trip: null })}
        onSuccess={(result) => {
          const updated = result?.trip ?? result;
          if (updated?.id) {
            setTrips((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
          } else {
            retry();
          }
        }}
      />
    </div>
  );
}
