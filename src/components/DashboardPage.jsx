import { useState, useEffect, useMemo, useCallback } from "react";
import { bannerImage } from "../lib/images.js";
import {
  mergeTripSources,
  getChartInterval,
  filterTripsInRange,
  buildMonthlyChartData,
  buildRollingMonthlyChartData,
  buildWeeklyChartData,
  buildWeeklyBreakdownForMonth,
  getNiceYTicks,
  tripListLabel,
  ARABIC_MONTHS,
} from "../lib/tripChartUtils.js";

// =================================================================
// 1. Helper Components & Functions
// =================================================================

const StatCardSkeleton = () => (
  <div className="bg-white rounded-2xl h-24 border border-gray-100 flex items-center justify-center animate-pulse">
    <div className="w-8 h-8 bg-gray-200 rounded-xl" />
    <div className="flex-1 mx-4 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-[230px] flex items-center justify-center animate-pulse">
    <div className="w-10 h-10 border-4 border-gray-200 border-t-transparent rounded-full animate-spin" />
  </div>
);

const StatCard = ({ icon, label, value, isLoading }) => {
  if (isLoading) return <StatCardSkeleton />;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
      <div className="text-right">
        <p className="text-2xl font-extrabold text-gray-800">{value ?? "—"}</p>
        <p className="text-xs font-semibold text-gray-600 mt-0.5">{label}</p>
      </div>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "linear-gradient(135deg,#9C6402,#E6C76A)" }}
      >
        {icon}
      </div>
    </div>
  );
};

const BarChart = ({ data, loading, selectedIndex, onSelect }) => {
  if (loading) return <div className="h-44 bg-gray-100 rounded-lg animate-pulse" />;

  const hasData = data.some((d) => d.value > 0);
  if (!hasData) {
    return (
      <div className="h-44 flex items-center justify-center text-sm text-gray-400">
        لا توجد رحلات في هذه الفترة
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const yTicks = getNiceYTicks(max);
  const yMax = yTicks[yTicks.length - 1] || 1;

  return (
    <div className="flex gap-3" dir="ltr">
      <div className="flex flex-col justify-between h-44 py-1 shrink-0 w-8">
        {[...yTicks].reverse().map((tick) => (
          <span key={tick} className="text-[10px] text-gray-400 leading-none text-right">
            {tick}
          </span>
        ))}
      </div>

      <div className="flex-1 min-w-0">
        <div className="relative h-44 border-r border-b border-gray-100">
          {yTicks.map((tick) => (
            <div
              key={`grid-${tick}`}
              className="absolute left-0 right-0 border-t border-dashed border-gray-100"
              style={{ bottom: `${(tick / yMax) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end justify-between gap-1 px-1">
            {data.map((d, i) => {
              const heightPct = (d.value / yMax) * 100;
              const isSelected = selectedIndex === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelect?.(i)}
                  className="flex flex-col items-center justify-end flex-1 h-full min-w-0 group"
                  title={`${d.label}: ${d.value} رحلة`}
                >
                  {d.value > 0 && (
                    <span className="text-[10px] font-bold text-[#9C6402] mb-1">
                      {d.value}
                    </span>
                  )}
                  <div
                    className={`w-full max-w-[28px] rounded-t-md transition-all cursor-pointer ${
                      isSelected ? "ring-2 ring-[#c9a84c] ring-offset-1" : ""
                    }`}
                    style={{
                      height: `${Math.max(heightPct, d.value > 0 ? 6 : 2)}%`,
                      background: isSelected
                        ? "linear-gradient(180deg,#f0d78c,#7a5200)"
                        : "linear-gradient(180deg,#E6C76A,#9C6402)",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between gap-1 mt-2 px-1">
          {data.map((d, i) => (
            <div key={i} className="flex-1 min-w-0 text-center">
              <span
                className={`block text-[10px] truncate ${
                  selectedIndex === i ? "text-[#9C6402] font-bold" : "text-gray-500"
                }`}
              >
                {d.label}
              </span>
              {d.subLabel && (
                <span className="block text-[9px] text-gray-400 truncate">{d.subLabel}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function TripBreakdownPanel({ title, weeks, onClose }) {
  if (!weeks?.length) return null;

  return (
    <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          إغلاق
        </button>
        <p className="text-sm font-bold text-gray-800">{title}</p>
      </div>

      {weeks.map((week, i) => (
        <div key={i} className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between gap-2 bg-gray-50/80 px-3 py-2">
            <span className="text-xs font-bold text-[#9C6402]">{week.value} رحلة</span>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-700">{week.label}</p>
              {week.subLabel && <p className="text-[10px] text-gray-400">{week.subLabel}</p>}
            </div>
          </div>

          {week.trips.length > 0 ? (
            <ul className="divide-y divide-gray-50 max-h-40 overflow-y-auto">
              {week.trips.map((trip) => {
                const info = tripListLabel(trip);
                return (
                  <li
                    key={`${info.id}-${info.dateStr}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                  >
                    <span className="text-gray-400 shrink-0">{info.dateStr}</span>
                    <div className="text-right min-w-0">
                      <span className="font-semibold text-gray-800">#{info.id}</span>
                      <span className="text-gray-500 mr-2 truncate">
                        {info.from} ← {info.to}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-center text-xs text-gray-400 py-3">لا توجد رحلات</p>
          )}
        </div>
      ))}
    </div>
  );
};

const DonutChart = ({ segments, loading }) => {
   if (loading) return <div className="w-28 h-28 bg-gray-200 rounded-full animate-pulse" />;

  const total = segments.reduce((s, c) => s + c.value, 0);
  if (total === 0) {
     return <div className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">No Data</div>;
  }

  const r = 36;
  const cx = 50;
  const cy = 50;
  const stroke = 16;
  const circ = 2 * Math.PI * r;
  let cum = 0;

  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const dashOffset = -(cum / total) * circ;
        cum += seg.value;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={dashOffset}
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
          />
        );
      })}
    </svg>
  );
};


const STATUS_COLORS = {
  'completed': "#22c55e", // green
  'progress': "#3b82f6",  // blue
  'pending': "#f97316",   // orange
  'cancelled': "#ef4444", // red
  'failed': "#6b7280",    // gray
  'مكتملة': "#22c55e",
  'قيد التنفيذ': "#3b82f6",
  'معلقة': '#f97316',
  'ملغية': '#ef4444',
  'مرفوضة': '#6b7280'
};

const ACTIVE_TRIP_STATUSES = new Set([
  "active",
  "شغال",
  "قيد التنفيذ",
  "in_progress",
  "progress",
]);

function tripStatusValue(trip) {
  return String(trip?.trip_status ?? trip?.status ?? "").trim();
}

function isActiveTrip(trip) {
  const status = tripStatusValue(trip);
  if (!status) return false;
  const lower = status.toLowerCase();
  return ACTIVE_TRIP_STATUSES.has(lower) || ACTIVE_TRIP_STATUSES.has(status);
}

function isActiveDriver(driver) {
  const raw = driver?.status ?? driver?.status_id ?? driver?.driver_status_id;
  if (raw == null || raw === "") return false;
  const n = Number(raw);
  if (n === 1) return true;
  const text = String(raw).trim().toLowerCase();
  return text === "نشط" || text === "active";
}

function countActiveTrips(tripList = []) {
  return tripList.filter(isActiveTrip).length;
}

function countActiveDrivers(driverList = []) {
  return driverList.filter(isActiveDriver).length;
}

// =================================================================
// 2. Main Component
// =================================================================
export default function DashboardPage() {
  const [counts, setCounts] = useState(null);
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState("thisYear");
  const [selectedBarIndex, setSelectedBarIndex] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [countsRes, logRes, offeredRes, driversRes] = await Promise.all([
        fetch("https://drivo1.elmoroj.com/api/dashboard-counts"),
        fetch("https://drivo1.elmoroj.com/api/trips"),
        fetch("https://drivo1.elmoroj.com/api/trip-without-drivers"),
        fetch("https://drivo1.elmoroj.com/api/drivers"),
      ]);

      const countsData = await countsRes.json();
      const logData = await logRes.json();
      const offeredData = await offeredRes.json();
      const driversData = await driversRes.json();

      const logTrips = Array.isArray(logData) ? logData : (logData.data ?? logData.value ?? []);
      const offeredTrips = Array.isArray(offeredData) ? offeredData : (offeredData.data ?? []);
      const driverList = Array.isArray(driversData) ? driversData : (driversData.data ?? driversData.drivers ?? []);

      setCounts(countsData.data);
      setTrips(mergeTripSources(logTrips, offeredTrips));
      setDrivers(driverList);
    } catch (e) {
      setError(e.message || "فشل تحميل بيانات لوحة التحكم.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setSelectedBarIndex(null);
  }, [dateFilter]);

  const chartInterval = useMemo(() => getChartInterval(dateFilter), [dateFilter]);

  const scopedTrips = useMemo(() => {
    if (!trips.length) return [];
    if (dateFilter === "allTime") return trips;
    return filterTripsInRange(trips, chartInterval);
  }, [trips, dateFilter, chartInterval]);

  const chartData = useMemo(() => {
    if (chartInterval.mode === "weeks") {
      return buildWeeklyChartData(scopedTrips, chartInterval.start, chartInterval.end);
    }
    if (dateFilter === "allTime") {
      return buildRollingMonthlyChartData(scopedTrips);
    }
    return buildMonthlyChartData(scopedTrips, chartInterval.year);
  }, [scopedTrips, chartInterval, dateFilter]);

  const selectedBreakdown = useMemo(() => {
    if (selectedBarIndex == null || !chartData[selectedBarIndex]) return null;

    const bucket = chartData[selectedBarIndex];

    if (chartInterval.mode === "weeks") {
      return {
        title: `${bucket.label} — ${bucket.subLabel ?? ""}`,
        weeks: [bucket],
      };
    }

    return {
      title: `تفاصيل ${bucket.label} ${bucket.year}`,
      weeks: buildWeeklyBreakdownForMonth(scopedTrips, bucket.year, bucket.monthIndex),
    };
  }, [selectedBarIndex, chartData, chartInterval.mode, scopedTrips]);
  const statusChartData = useMemo(() => {
    const statusCounts = {};
    scopedTrips.forEach((trip) => {
      const status = trip.trip_status || trip.status || "غير محدد";
      if (!statusCounts[status]) {
        statusCounts[status] = {
          label: status,
          value: 0,
          color: STATUS_COLORS[status.toLowerCase()] || STATUS_COLORS[status] || "#888",
        };
      }
      statusCounts[status].value++;
    });
    return Object.values(statusCounts);
  }, [scopedTrips]);

  const handlePrint = () => window.print();

  const totalTrips = counts?.total_trips ?? trips.length;

  const activeTripsCount = useMemo(() => countActiveTrips(trips), [trips]);
  const activeDriversCount = useMemo(() => countActiveDrivers(drivers), [drivers]);

  const stats = [
    {
      label: "إجمالي الرحلات",
      value: counts?.total_trips ?? trips.length,
      icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
    },
    {
      label: "الرحلات النشطة",
      value: activeTripsCount,
      icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
    },
    {
      label: "العملاء الجدد",
      value: counts?.total_customers,
      icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z"/></svg>
    },
    {
      label: "السائقين النشطين",
      value: activeDriversCount,
      icon: <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
    },
  ];

  return (
    <div className="w-full space-y-5 p-4" dir="rtl">
      {/* Header */}
      <div className="bg-white rounded-xl px-5 py-3 border border-gray-200/60 shadow-sm flex items-center justify-between">
        <div className="text-right">
          <h1 className="text-xl font-bold text-[#c9a84c]">لوحة التحليلات والإحصائيات</h1>
          <p className="text-xs text-gray-400">تحليلات شاملة لأداء النظام</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-xs px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          تصدير
        </button>
      </div>

      {/* Banner */}
      <div className="relative bg-gradient-to-l from-[#b88121] to-[#dca43b] rounded-2xl overflow-hidden min-h-[150px] flex items-center px-10 shadow-sm">
         <div className="absolute left-0 bottom-0 h-full w-56 pointer-events-none flex items-end">
          <img src={bannerImage} alt="" className="h-[95%] w-full object-contain object-bottom drop-shadow-md"/>
        </div>
        <div className="z-10 text-white text-right ml-auto">
          <h2 className="text-5xl font-extrabold flex items-baseline gap-2">
            {loading ? (
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{totalTrips}</span>
                <span className="text-2xl font-normal">رحلة</span>
              </>
            )}
          </h2>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s,i) => <StatCard key={i} {...s} isLoading={loading} />)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? <><ChartSkeleton /><ChartSkeleton /></> :
        <>
          {/* Bar chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:col-span-1">
            <div className="flex items-center justify-between mb-2 gap-2">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-xs text-gray-600 border border-gray-200 px-2 py-1 rounded-lg cursor-pointer hover:bg-gray-50 bg-white appearance-none"
              >
                <option value="thisYear">هذه السنة</option>
                <option value="thisMonth">هذا الشهر</option>
                <option value="lastMonth">الشهر الماضي</option>
                <option value="allTime">كل الوقت</option>
              </select>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-800">أداء الرحلات</p>
                <p className="text-[10px] text-gray-400">
                  سجل الرحلات + الرحلات المعروضة — اضغط على العمود لعرض التفاصيل
                </p>
              </div>
            </div>

            <BarChart
              data={chartData}
              loading={loading}
              selectedIndex={selectedBarIndex}
              onSelect={(i) => setSelectedBarIndex((prev) => (prev === i ? null : i))}
            />

            {selectedBreakdown && (
              <TripBreakdownPanel
                title={selectedBreakdown.title}
                weeks={selectedBreakdown.weeks}
                onClose={() => setSelectedBarIndex(null)}
              />
            )}
          </div>

          {/* Donut chart */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-gray-500">
                {scopedTrips.length} رحلة في الفترة المحددة
              </p>
              <p className="text-sm font-bold text-gray-800">حالات الرحلات</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                {statusChartData.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span>{s.label} ({s.value})</span>
                  </div>
                ))}
              </div>
              <DonutChart segments={statusChartData} loading={loading} />
            </div>
          </div>
        </>
        }
      </div>
    </div>
  );
}
