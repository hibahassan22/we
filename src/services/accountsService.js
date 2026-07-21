const API_BASE = "/api";

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** GET /api/dashboard/monthly-report */
export async function fetchMonthlyReport() {
  const json = await getJson(`${API_BASE}/dashboard/monthly-report`);
  const data = json?.data ?? json;
  return {
    totalIncome: Number(data.total_income ?? 0),
    totalExpenses: Number(data.total_expenses_sar ?? 0),
    totalRefunds: Number(data.total_refunds ?? 0),
    netProfit: Number(data.net_profit ?? 0),
    month: data.month,
    year: data.year,
  };
}

function asList(data) {
  if (Array.isArray(data)) return data;
  return data?.data ?? data?.sales ?? data?.trips ?? data?.expenses ?? [];
}

export async function fetchAccountsSummary() {
  const [countsRes, expensesRes, refundsRes, salesRes, tripsRes] = await Promise.all([
    getJson(`${API_BASE}/dashboard-counts`).catch(() => ({})),
    getJson(`${API_BASE}/expenses`).catch(() => ({ data: [] })),
    getJson(`${API_BASE}/all-refunds`).catch(() => ({ data: [] })),
    getJson(`${API_BASE}/sales`).catch(() => []),
    getJson(`${API_BASE}/trips`).catch(() => []),
  ]);

  const counts = countsRes?.data ?? countsRes ?? {};
  const expenses = asList(expensesRes);
  const refunds = asList(refundsRes);
  const sales = asList(salesRes);
  const trips = asList(tripsRes);

  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount_sar) || 0), 0);
  const totalRefunds = refunds.reduce(
    (s, r) => s + (Number(r.proposed_refund_amount ?? r.proposedAmount ?? r.amount) || 0),
    0
  );

  let totalIncome = Number(counts.total_income ?? counts.totalIncome ?? counts.income ?? 0);
  if (!totalIncome) {
    trips.forEach((trip) => {
      const payments =
        trip.payment_history ?? trip.payments ?? trip.trip_payments ?? [];
      payments.forEach((p) => {
        totalIncome += Number(p.amount ?? p.payment_amount ?? 0);
      });
    });
  }

  const netProfit = totalIncome - totalExpenses - totalRefunds;

  return {
    totalIncome,
    totalExpenses,
    totalRefunds,
    netProfit,
    expenses,
    refunds,
    sales,
    trips,
    counts,
  };
}

export function extractTripPayments(trips = []) {
  const rows = [];
  trips.forEach((trip) => {
    const payments = trip.payment_history ?? trip.payments ?? trip.trip_payments ?? [];
    payments.forEach((p, idx) => {
      rows.push({
        id: `${trip.id ?? trip.trip_id}-${idx}`,
        tripId: trip.id ?? trip.trip_id,
        customerName: trip.customer_name ?? trip.client_name ?? trip.name ?? "—",
        phone: trip.customer_phone ?? trip.phone ?? trip.client_phone ?? "—",
        amount: Number(p.amount ?? p.payment_amount ?? 0),
        date: p.payment_date ?? p.date ?? p.created_at ?? trip.created_at,
        method: p.transfer_method ?? p.method ?? p.payment_method ?? "—",
        note: p.payment_note ?? p.note ?? "",
        registered: Boolean(p.transfer_image ?? p.image ?? p.proof_image),
        status: p.status ?? (p.transfer_image ? "registered" : "pending"),
        raw: p,
      });
    });
  });
  return rows.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

function salesIdsOnTrip(trip) {
  const ids = new Set();
  if (trip?.sales_id != null && trip.sales_id !== "") ids.add(String(trip.sales_id));
  const arr = trip?.sales_ids ?? trip?.salesIds;
  if (Array.isArray(arr)) {
    arr.forEach((id) => {
      if (id != null && id !== "") ids.add(String(typeof id === "object" ? id.id ?? id.sales_id : id));
    });
  }
  if (Array.isArray(trip?.sales)) {
    trip.sales.forEach((s) => {
      const id = typeof s === "object" ? s?.id ?? s?.sales_id : s;
      if (id != null && id !== "") ids.add(String(id));
    });
  }
  return [...ids];
}

export function tripHasSales(trip, salesId) {
  if (salesId == null || salesId === "") return false;
  return salesIdsOnTrip(trip).includes(String(salesId));
}

/** own | shared — و broker يتراكب عبر hasBroker */
export function classifyTripForSales(trip, salesId) {
  const ids = salesIdsOnTrip(trip);
  const sid = String(salesId);
  if (!ids.includes(sid)) return null;
  const ownership = ids.length > 1 ? "shared" : "own";
  const hasBroker = Boolean(trip?.broker_id ?? trip?.brokerId);
  return { ownership, hasBroker };
}

function tripPaidAmount(trip) {
  return Number(trip?.amount_paid ?? trip?.paid_amount ?? 0) || 0;
}

function tripBrokerCommission(trip) {
  return Number(trip?.broker_commission ?? trip?.brokerCommission ?? 0) || 0;
}

function normalizeTripStatus(raw) {
  const s = String(raw ?? "").toLowerCase().trim();
  if (!s) return "pending";
  if (s === "تم" || s === "completed" || s === "done" || s === "finished" || s === "complete") return "completed";
  if (s === "cancelled" || s === "canceled" || s === "ملغاة" || s === "ملغي" || s === "ملغية") return "cancelled";
  if (s === "cancel" || s.includes("cancel") || s.includes("الغاء") || s.includes("إلغاء")) return "cancelled";
  if (s === "in_progress" || s === "progress" || s === "جارية" || s === "قيد التنفيذ") return "in_progress";
  if (s === "offered" || s === "معروضة") return "offered";
  if (s === "pending" || s === "معلق" || s === "معلقة" || s === "بانتظار") return "pending";
  return s;
}

export const TRIP_STATUS_LABELS = {
  الكل: "الكل",
  completed: "تمت",
  cancelled: "ملغاة",
  pending: "معلّقة",
  in_progress: "جارية",
  offered: "معروضة",
};

function refundAmount(r) {
  return Number(r?.proposed_refund_amount ?? r?.proposedAmount ?? r?.confirmed_refund_amount ?? r?.amount ?? 0) || 0;
}

function refundHasSales(r, salesId) {
  const sid = String(salesId);
  const list = Array.isArray(r?.sales) ? r.sales : [];
  if (list.some((s) => String(s?.id ?? s?.sales_id ?? s) === sid)) return true;
  if (r?.sales_id != null && String(r.sales_id) === sid) return true;
  return false;
}

/**
 * بناء ملخص مالي لكل موظف من الرحلات والاستردادات.
 */
export function buildEmployeeFinance(sales = [], trips = [], refunds = []) {
  return (Array.isArray(sales) ? sales : []).map((emp) => {
    const salesId = emp.id;
    const empTrips = [];
    let revenue = 0;
    let ownMoney = 0;
    let sharedMoney = 0;
    let brokerMoney = 0;
    const tripsByStatus = {};

    (Array.isArray(trips) ? trips : []).forEach((trip) => {
      const cls = classifyTripForSales(trip, salesId);
      if (!cls) return;
      const paid = tripPaidAmount(trip);
      const brokerComm = cls.hasBroker ? tripBrokerCommission(trip) : 0;
      const statusKey = normalizeTripStatus(trip.trip_status ?? trip.status);
      tripsByStatus[statusKey] = (tripsByStatus[statusKey] || 0) + 1;

      if (cls.ownership === "own") ownMoney += paid;
      else sharedMoney += paid;
      revenue += paid;
      if (cls.hasBroker) brokerMoney += brokerComm;

      empTrips.push({
        id: trip.id ?? trip.trip_id,
        from: trip.from ?? trip.pickup_location ?? "",
        to: trip.to ?? trip.dropoff_location ?? "",
        status: statusKey,
        statusRaw: trip.trip_status ?? trip.status,
        amountPaid: paid,
        totalPrice: Number(trip.total_price ?? trip.price ?? 0) || 0,
        ownership: cls.ownership,
        hasBroker: cls.hasBroker,
        brokerCommission: brokerComm,
        date: trip.start_date ?? trip.trip_date ?? trip.created_at,
        raw: trip,
      });
    });

    const empRefunds = (Array.isArray(refunds) ? refunds : [])
      .filter((r) => refundHasSales(r, salesId))
      .map((r) => ({
        id: r.id,
        tripId: r.tripId ?? r.trip_id ?? r.tripNumber,
        amount: refundAmount(r),
        reason: r.reason ?? r.refund_reason ?? "",
        status: r.status ?? "",
        date: r.date ?? r.created_at,
        raw: r,
      }));

    const refundsTotal = empRefunds.reduce((s, r) => s + r.amount, 0);

    return {
      ...emp,
      revenue,
      refundsTotal,
      net: revenue - refundsTotal,
      tripsCount: empTrips.length,
      trips: empTrips.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
      tripsByStatus,
      moneyByCategory: {
        own: ownMoney,
        shared: sharedMoney,
        broker: brokerMoney,
        refunds: refundsTotal,
      },
      refunds: empRefunds,
    };
  });
}
