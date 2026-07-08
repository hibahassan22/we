const BASE = "https://drivo1.elmoroj.com/api";

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data;
}

function asList(data) {
  if (Array.isArray(data)) return data;
  return data?.data ?? data?.sales ?? [];
}

export async function fetchAccountsSummary() {
  const [countsRes, expensesRes, refundsRes, salesRes, tripsRes] = await Promise.all([
    getJson(`${BASE}/dashboard-counts`).catch(() => ({})),
    getJson(`${BASE}/expenses`).catch(() => ({ data: [] })),
    getJson(`${BASE}/all-refunds`).catch(() => ({ data: [] })),
    getJson(`${BASE}/sales`).catch(() => []),
    getJson(`${BASE}/trips`).catch(() => []),
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
