import {
  startOfMonth,
  endOfMonth,
  endOfWeek,
  eachWeekOfInterval,
  isWithinInterval,
  getMonth,
  getYear,
  subMonths,
  format,
} from "date-fns";

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

/** تاريخ بداية الرحلة */
export function getTripStartDate(trip) {
  const raw =
    trip?.start_date ??
    trip?.startdate ??
    trip?.trip_date ??
    trip?.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** تاريخ نهاية الرحلة */
export function getTripEndDate(trip) {
  const raw =
    trip?.end_date ??
    trip?.enddate ??
    trip?.trip_date ??
    trip?.start_date ??
    trip?.startdate;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** دمج سجل الرحلات + الرحلات المعروضة بدون تكرار */
export function mergeTripSources(logTrips = [], offeredTrips = []) {
  const map = new Map();
  for (const trip of [...logTrips, ...offeredTrips]) {
    const id = trip?.id ?? trip?.trip_id;
    if (id == null) continue;
    const key = String(id);
    if (!map.has(key)) map.set(key, trip);
  }
  return [...map.values()];
}

export function getChartInterval(dateFilter, now = new Date()) {
  switch (dateFilter) {
    case "thisMonth":
      return { start: startOfMonth(now), end: endOfMonth(now), mode: "weeks" };
    case "lastMonth": {
      const m = subMonths(now, 1);
      return { start: startOfMonth(m), end: endOfMonth(m), mode: "weeks" };
    }
    case "allTime":
      return { start: null, end: null, mode: "months", year: getYear(now) };
    case "thisYear":
    default:
      return {
        start: new Date(getYear(now), 0, 1),
        end: new Date(getYear(now), 11, 31, 23, 59, 59),
        mode: "months",
        year: getYear(now),
      };
  }
}

export function filterTripsInRange(trips, interval) {
  if (!interval.start || !interval.end) return trips;
  return trips.filter((trip) => {
    const d = getTripStartDate(trip);
    if (!d) return false;
    return isWithinInterval(d, { start: interval.start, end: interval.end });
  });
}

export function buildMonthlyChartData(trips, year) {
  const counts = Array(12).fill(0);
  const buckets = Array.from({ length: 12 }, () => []);

  trips.forEach((trip) => {
    const d = getTripStartDate(trip);
    if (!d || getYear(d) !== year) return;
    const idx = getMonth(d);
    counts[idx]++;
    buckets[idx].push(trip);
  });

  return ARABIC_MONTHS.map((label, index) => ({
    label,
    value: counts[index],
    monthIndex: index,
    year,
    trips: buckets[index],
  }));
}

/** آخر 12 شهر — لعرض «كل الوقت» */
export function buildRollingMonthlyChartData(trips, now = new Date()) {
  const months = Array.from({ length: 12 }, (_, i) => subMonths(startOfMonth(now), 11 - i));

  return months.map((monthStart) => {
    const monthEnd = endOfMonth(monthStart);
    const monthTrips = trips.filter((trip) => {
      const d = getTripStartDate(trip);
      return d && isWithinInterval(d, { start: monthStart, end: monthEnd });
    });
    const label = format(monthStart, "MMM yy");

    return {
      label,
      value: monthTrips.length,
      monthIndex: getMonth(monthStart),
      year: getYear(monthStart),
      trips: monthTrips,
    };
  });
}

export function buildWeeklyChartData(trips, rangeStart, rangeEnd) {
  const weeks = eachWeekOfInterval(
    { start: rangeStart, end: rangeEnd },
    { weekStartsOn: 6 }
  );

  return weeks.map((weekStart, index) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 6 });
    const interval = {
      start: weekStart < rangeStart ? rangeStart : weekStart,
      end: weekEnd > rangeEnd ? rangeEnd : weekEnd,
    };
    const weekTrips = trips.filter((trip) => {
      const d = getTripStartDate(trip);
      return d && isWithinInterval(d, interval);
    });
    const fromLabel = interval.start.toLocaleDateString("ar-SA", { day: "numeric", month: "short" });
    const toLabel = interval.end.toLocaleDateString("ar-SA", { day: "numeric", month: "short" });

    return {
      label: `أسبوع ${index + 1}`,
      subLabel: `${fromLabel} – ${toLabel}`,
      value: weekTrips.length,
      trips: weekTrips,
      interval,
    };
  });
}

export function buildWeeklyBreakdownForMonth(trips, year, monthIndex) {
  const rangeStart = new Date(year, monthIndex, 1);
  const rangeEnd = endOfMonth(rangeStart);
  const monthTrips = trips.filter((trip) => {
    const d = getTripStartDate(trip);
    return d && getYear(d) === year && getMonth(d) === monthIndex;
  });
  return buildWeeklyChartData(monthTrips, rangeStart, rangeEnd);
}

export function getNiceYTicks(maxValue, steps = 4) {
  if (maxValue <= 0) return [0];
  const step = Math.max(1, Math.ceil(maxValue / steps));
  const top = Math.ceil(maxValue / step) * step;
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return ticks.length > 1 ? ticks : [0, maxValue || 1];
}

export function tripListLabel(trip) {
  const id = trip.id ?? trip.trip_id ?? "—";
  const from = trip.from ?? "—";
  const to = trip.to ?? "—";
  const start = getTripStartDate(trip);
  const dateStr = start
    ? start.toLocaleDateString("ar-SA", { day: "numeric", month: "short", year: "numeric" })
    : "—";
  return { id, from, to, dateStr };
}

export { ARABIC_MONTHS };
