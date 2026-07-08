import { useState, useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import AppModal from './ui/AppModal';

const BASE_URL = 'https://drivo1.elmoroj.com/api';

const fmt = (v) => (v != null && v !== '') ? Number(v).toLocaleString('ar-SA') : null;

const Row = ({ label, value }) => (
  value != null && value !== '' && value !== '—' ? (
    <div className="flex justify-between border-b border-gray-50 pb-2 text-xs last:border-0 last:pb-0">
      <span className="text-gray-400 shrink-0 ml-4">{label}</span>
      <span className="text-gray-700 font-medium text-right">{value}</span>
    </div>
  ) : null
);

const Section = ({ title, children }) => {
  const hasContent = Array.isArray(children)
    ? children.some(Boolean)
    : Boolean(children);
  if (!hasContent) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2.5">
      <p className="text-xs font-bold text-[#c9a84c] mb-3">{title}</p>
      {children}
    </div>
  );
};

const statusLabels = {
  suspended: 'معلقة',
  pending: 'معلقة',
  offered: 'معروضة',
  completed: 'مكتملة',
  cancelled: 'ملغية',
  progress: 'قيد التنفيذ',
  in_progress: 'قيد التنفيذ',
  تم: 'مكتملة',
  'قيد التنفيذ': 'قيد التنفيذ',
};
const statusStyles = {
  suspended: 'bg-amber-100 text-amber-700',
  pending: 'bg-amber-100 text-amber-700',
  offered: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
  progress: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-blue-100 text-blue-700',
  تم: 'bg-emerald-100 text-emerald-700',
  'قيد التنفيذ': 'bg-blue-100 text-blue-700',
};

async function fetchTripDetails(tripId) {
  const res = await fetch(`${BASE_URL}/trips-without-driver/${tripId}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`فشل تحميل البيانات (${res.status})`);
  const data = await res.json();
  return data?.data ?? data?.trip ?? data;
}

/**
 * TripDetailModal
 * Props: isOpen {boolean} | onClose {Function} | tripId {string|number}
 */
export default function TripDetailModal({ isOpen, onClose, tripId }) {
  const [trip, setTrip]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!isOpen || !tripId) return;
    setTrip(null);
    setError(null);
    setLoading(true);
    fetchTripDetails(tripId)
      .then(setTrip)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isOpen, tripId]);

  const d = trip;
  const st = d?.trip_status ?? d?.status ?? '';
  const remaining = d
    ? Number(d.remaining_amount ?? 0) || Math.max(0, Number(d.total_price ?? 0) - Number(d.amount_paid ?? 0))
    : 0;
  const isFullyPaid = d && Number(d.total_price ?? 0) > 0 && remaining <= 0;
  const driverName = d?.driver ? [d.driver.name, d.driver.last_name].filter(Boolean).join(' ') : (d?.driver_name ?? null);

  const subtitle = d && st ? (statusLabels[st] ?? st) : undefined;

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={d ? `تفاصيل الرحلة #${d.id}` : 'تفاصيل الرحلة'}
      subtitle={subtitle}
      isSubmitting={false}
      size="xl"
    >
      <div className="space-y-3 -mx-1">
        {d && isFullyPaid && (
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-3 h-3" /> مدفوع بالكامل
            </span>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 text-right">
            {error}
          </div>
        )}

        {!loading && !error && !d && (
          <p className="text-center text-sm text-gray-400 py-10">لا توجد بيانات</p>
        )}

        {!loading && !error && d && (
          <>
            <Section title="$ معلومات الرحلة">
              <Row label="رقم الرحلة"        value={`#${d.id}`} />
              <Row label="تاريخ الرحلة"       value={d.trip_date} />
              <Row label="تاريخ البداية"      value={d.start_date} />
              <Row label="تاريخ النهاية"      value={d.end_date} />
              <Row label="نوع الرحلة"          value={d.trip_type} />
              <Row label="نوع المسار"          value={d.route_type} />
              <Row label="اتجاه المسار"        value={d.route_direction} />
              <Row label="نوع الاشتراك"        value={d.subscription_type} />
              <Row label="عدد أيام الرحلة"     value={d.trip_days_count} />
              <Row label="أيام التشغيل"        value={Array.isArray(d.operation_days) ? d.operation_days.join('، ') : null} />
              <Row label="وقت الانطلاق"        value={d.departure_time} />
              <Row label="وقت العودة"          value={d.return_time} />
              <Row label="من"                  value={d.from} />
              <Row label="إلى"                 value={d.to} />
              <Row label="المنطقة"             value={d.region ?? d.city} />
              <Row label="عدد الركاب"          value={d.passengers_count} />
              <Row label="حجم المركبة"         value={d.vehicle_size} />
              <Row label="هاتف العميل"         value={d.customer_phone} />
              <Row label="حالة الرحلة"         value={statusLabels[st] ?? st} />
              <Row label="حالة الدفع"          value={d.payment_status ?? (isFullyPaid ? 'مدفوع بالكامل' : 'دفع جزئي')} />
              <Row label="بواسطة"              value={d.assisted_by} />
              <Row label="نقاط المكافأة"       value={d.reward_points ?? d.rewards_used} />
              <Row label="تاريخ الإنشاء"       value={d.created_at} />
              <Row label="آخر تحديث"           value={d.updated_at} />
            </Section>

            {(driverName || d.driver) && (
              <Section title="👤 معلومات السائق">
                <Row label="الاسم"        value={driverName} />
                <Row label="الهاتف"       value={d.driver?.phone} />
                <Row label="الجنسية"      value={d.driver?.nationality} />
                <Row label="العنوان"      value={d.driver?.address} />
                <Row label="نوع السيارة"  value={d.driver?.car_type} />
                <Row label="موديل السيارة" value={d.driver?.car_model} />
                <Row label="حجم السيارة"  value={d.driver?.vehicle_size} />
              </Section>
            )}

            <Section title="$ التفاصيل المالية">
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-blue-500 font-bold mb-1">إجمالي السعر</p>
                  <p className="text-sm font-bold text-blue-700">{fmt(d.total_price) ?? '—'} ر.س</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-emerald-500 font-bold mb-1">المدفوع</p>
                  <p className="text-sm font-bold text-emerald-700">{fmt(d.amount_paid) ?? '—'} ر.س</p>
                </div>
                <div className={`border rounded-xl p-3 text-center ${isFullyPaid ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  <p className={`text-[10px] font-bold mb-1 ${isFullyPaid ? 'text-emerald-500' : 'text-red-500'}`}>المتبقي</p>
                  <p className={`text-sm font-bold ${isFullyPaid ? 'text-emerald-700' : 'text-red-700'}`}>
                    {isFullyPaid ? '0' : (fmt(remaining) ?? '—')} ر.س
                  </p>
                </div>
              </div>
              <Row label="نسبة العمولة"         value={d.commission_rate ? `${d.commission_rate}%` : null} />
              <Row label="مبلغ العمولة"          value={d.commission_amount ? `${fmt(d.commission_amount)} ر.س` : null} />
              <Row label="عمولتنا"               value={d.our_commission ? `${fmt(d.our_commission)} ر.س` : null} />
              <Row label="طريقة التحويل"         value={d.transfer_method} />
              <Row label="اسم البنك"             value={d.bank_name} />
              <Row label="رقم الحساب"            value={d.account_number} />
              <Row label="تاريخ تحويل العمولة"   value={d.commission_transfer_date} />
              {d.transfer_image && (
                <div className="pt-2">
                  <p className="text-xs text-gray-400 mb-1.5">صورة إثبات التحويل</p>
                  <img src={d.transfer_image} alt="إثبات التحويل"
                    className="w-full max-h-48 object-contain rounded-xl border border-gray-100 bg-gray-50" />
                </div>
              )}
            </Section>

            {Array.isArray(d.sales) && d.sales.length > 0 && (
              <Section title="👥 مندوبو المبيعات">
                {d.sales.map((s, i) => (
                  <div key={s.id ?? i} className="bg-gray-50 rounded-xl p-3 space-y-1">
                    <Row label="الاسم"          value={s.name} />
                    <Row label="الهاتف"         value={s.phone} />
                    <Row label="البريد"         value={s.email} />
                    <Row label="الحالة"         value={s.status} />
                  </div>
                ))}
              </Section>
            )}

            {(d.refund_request_status || d.refund_amount) && (
              <Section title="↩️ معلومات الاسترداد">
                <Row label="حالة طلب الاسترداد" value={d.refund_request_status} />
                <Row label="المبلغ المسترد"      value={d.refund_amount ? `${fmt(d.refund_amount)} ر.س` : null} />
                <Row label="سبب الاسترداد"       value={d.refund_reason} />
                <Row label="تاريخ الاسترداد"     value={d.refunded_at} />
              </Section>
            )}

            {d.cancellation_reason && (
              <Section title="❌ معلومات الإلغاء">
                <Row label="سبب الإلغاء"  value={d.cancellation_reason} />
                <Row label="تاريخ الإلغاء" value={d.cancelled_at} />
              </Section>
            )}

            {(d.trip_notes || d.notes) && (
              <Section title="📝 ملاحظات">
                <p className="text-xs text-gray-700 leading-relaxed">{d.trip_notes ?? d.notes}</p>
              </Section>
            )}
          </>
        )}
      </div>
    </AppModal>
  );
}
