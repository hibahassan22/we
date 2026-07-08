import { useState, useEffect, useMemo } from "react";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { filterByGlobalSearch } from "../lib/searchUtils";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import AppModal, { ModalField, ModalActions, modalInputClass, ConfirmModal } from "./ui/AppModal";

const BASE = "https://drivo1.elmoroj.com/api";

// ── Helpers ───────────────────────────────────────────────────
const STATUS_MAP = {
  open:        { label:"مفتوحة",      cls:"bg-red-600 text-white" },
  closed:      { label:"مغلقة",       cls:"bg-gray-400 text-white" },
  in_progress: { label:"قيد المعالجة",cls:"bg-blue-600 text-white" },
  resolved:    { label:"محلولة",      cls:"bg-emerald-600 text-white" },
};
const PRIORITY_MAP = {
  high:   { label:"عالية",   cls:"bg-red-600 text-white" },
  medium: { label:"متوسطة",  cls:"bg-amber-100 text-amber-600 border border-amber-200" },
  low:    { label:"منخفضة",  cls:"bg-gray-100 text-gray-500 border border-gray-200" },
};
const statusInfo  = (s) => STATUS_MAP[s]   || { label: s||"—",  cls:"bg-gray-100 text-gray-500" };
const priorityInfo= (p) => PRIORITY_MAP[p] || { label: p||"—",  cls:"bg-gray-100 text-gray-500" };
const fmtDate     = (d) => d ? new Date(d).toLocaleDateString("ar-EG") + " " + new Date(d).toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"}) : "—";

const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-8 h-8 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin"/>
  </div>
);

// ── Add Note Modal ────────────────────────────────────────────
const NoteModal = ({ isOpen, onClose, ticketId, onSaved }) => {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await fetch(`${BASE}/tickets/${ticketId}/note`, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ note })
      });
      setNote(""); onSaved(); onClose();
    } catch(e){ console.error(e); }
    finally { setSaving(false); }
  };
  return (
    <AppModal isOpen={isOpen} onClose={onClose} title="إضافة ملاحظة" isSubmitting={saving} size="md">
      <ModalField label="ملاحظة">
        <textarea rows={5} value={note} onChange={e=>setNote(e.target.value)} placeholder="أضف ملاحظتك هنا ..." className={`${modalInputClass} resize-none`} disabled={saving}/>
      </ModalField>
      <ModalActions primaryLabel="حفظ" onPrimary={submit} onSecondary={onClose} isSubmitting={saving} />
    </AppModal>
  );
};

// ── Reusable form helpers (outside modal to avoid remount) ───
const TicketField = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="block text-sm text-gray-700 text-right font-medium">{label}</label>
    {children}
  </div>
);
const TicketSelWrap = ({ children }) => (
  <div className="relative">{children}
    <div className="absolute left-3 top-3 pointer-events-none text-gray-400">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
    </div>
  </div>
);
const selCls = "w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none bg-white text-right appearance-none placeholder-gray-300";

// ── Create/Edit Ticket Modal ──────────────────────────────────
const TicketModal = ({ isOpen, onClose, ticket, onSaved, drivers }) => {
  const isEditing = Boolean(ticket);
  const [driverId, setDriverId]         = useState("");
  const [tripId, setTripId]             = useState("");
  const [issueType, setIssueType]       = useState("");
  const [priority, setPriority]         = useState("");
  const [description, setDescription]   = useState("");
  const [createdType, setCreatedType]   = useState("");
  const [status, setStatus]             = useState("open");
  const [attachment, setAttachment]     = useState(null);
  const [saving, setSaving]             = useState(false);
  const [allTrips, setAllTrips]         = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (ticket) {
      setDriverId(ticket.driver_id||""); setTripId(ticket.trip_id||"");
      const rawType = (ticket.issue_type||"").replace(/\s+/g,"_");
      setIssueType(rawType); setPriority(ticket.priority||"");
      setDescription(ticket.description||""); setCreatedType(ticket.created_type||"");
      setStatus(ticket.status||"open");
    } else {
      setDriverId(""); setTripId(""); setIssueType(""); setPriority("");
      setDescription(""); setCreatedType(""); setStatus("open");
    }
    setAttachment(null);
  }, [isOpen, ticket?.id]);

  // جيب كل الرحلات مرة واحدة عند فتح الـ modal
  useEffect(() => {
    if (!isOpen) return;
    if (allTrips.length > 0) return; // already loaded
    setLoadingTrips(true);
    fetch(`${BASE}/trips`, { headers: { Accept: "application/json" } })
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
        setAllTrips(list);
      })
      .catch(() => {})
      .finally(() => setLoadingTrips(false));
  }, [isOpen]);

  // فلتر الرحلات حسب السائق المختار client-side
  const driverTrips = driverId
    ? allTrips.filter(t => String(t.driver_id) === String(driverId))
    : [];

  const submit = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(
        isEditing ? `${BASE}/tickets/${ticket.id}` : `${BASE}/tickets`,
        {
          method:  isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: isEditing
            ? JSON.stringify({
                issue_type:  issueType,
                priority,
                description,
                status,
              })
            : JSON.stringify({
                driver_id:    driverId,
                trip_id:      tripId || null,
                issue_type:   issueType,
                priority,
                description,
                created_type: createdType || undefined,
                status,
              }),        }
      );
      // بعض الـ servers بتبعت 200/201 مع body، وبعضها بتقفل الـ connection
      // نعتبره نجاح لو الـ status < 500
      if (res.ok || res.status < 500) {
        onClose();
        setTimeout(() => onSaved(), 100);
      }
    } catch (_) {
      onClose();
      setTimeout(() => onSaved(), 100);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "تعديل التذكرة" : "إنشاء تذكرة جديدة"}
      isSubmitting={saving}
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
          <TicketField label="السائق">
            <TicketSelWrap>
              <select className={selCls} value={driverId} onChange={e=>setDriverId(e.target.value)} required>
                <option value="">اختر السائق</option>
                {(drivers||[]).map(d=><option key={d.id} value={d.id}>{d.name} {d.last_name||""}</option>)}
              </select>
            </TicketSelWrap>
          </TicketField>
          <TicketField label="الرحلة المرتبطة (اختياري)">
            <TicketSelWrap>
              <select className={selCls} value={tripId} onChange={e=>setTripId(e.target.value)} disabled={!driverId || loadingTrips}>
                <option value="">
                  {loadingTrips ? "جارٍ التحميل..." : !driverId ? "اختر السائق أولاً" : driverTrips.length === 0 ? "لا توجد رحلات لهذا السائق" : "اختر الرحلة"}
                </option>
                {driverTrips.map(t=>(
                  <option key={t.id} value={t.id}>
                    #{t.id} {t.from ? `— ${t.from}` : ""} {t.to ? `← ${t.to}` : ""}
                  </option>
                ))}
              </select>
            </TicketSelWrap>
          </TicketField>
          <div className="grid grid-cols-2 gap-3">
            <TicketField label="الأولوية">
              <TicketSelWrap>
                <select className={selCls} value={priority} onChange={e=>setPriority(e.target.value)} required>
                  <option value="">اختر الأولوية</option>
                  <option value="high">عالية</option>
                  <option value="medium">متوسطة</option>
                  <option value="low">منخفضة</option>
                </select>
              </TicketSelWrap>
            </TicketField>
            <TicketField label="نوع المشكلة">
              <TicketSelWrap>
                <select className={selCls} value={issueType} onChange={e=>setIssueType(e.target.value)} required>
                  <option value="">اختر النوع</option>
                  <option value="driver_late">تأخر السائق</option>
                  <option value="payment">مشكلة مالية</option>
                  <option value="accident">حادث</option>
                  <option value="behavior">سلوك السائق</option>
                  <option value="other">أخرى</option>
                </select>
              </TicketSelWrap>
            </TicketField>
          </div>
          <TicketField label="نوع المنشئ">
            <TicketSelWrap>
              <select className={selCls} value={createdType} onChange={e=>setCreatedType(e.target.value)}>
                <option value="">اختر النوع</option>
                <option value="خدمة عملاء">خدمة عملاء</option>
                <option value="أدمن">أدمن</option>
                <option value="سائق">سائق</option>
              </select>
            </TicketSelWrap>
          </TicketField>

          <TicketField label="وصف المشكلة">
            <textarea rows="4" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none bg-white text-right resize-none placeholder-gray-300" value={description} onChange={e=>setDescription(e.target.value)} placeholder="اشرح المشكلة بالتفصيل..."/>
          </TicketField>
          <TicketField label="المرفقات">
            <label className="flex items-center justify-center gap-2 w-full border border-gray-200 rounded-xl py-3 cursor-pointer hover:bg-gray-50 text-gray-500 text-sm transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              {attachment ? <span className="text-[#c9a84c] font-medium">{attachment.name}</span> : <span>اختر الملف</span>}
              <input type="file" className="hidden" onChange={e=>setAttachment(e.target.files[0])}/>
            </label>
          </TicketField>
          {isEditing && (
            <TicketField label="الحالة">
              <TicketSelWrap>
                <select className={selCls} value={status} onChange={e=>setStatus(e.target.value)}>
                  <option value="open">مفتوحة</option>
                  <option value="in_progress">قيد المعالجة</option>
                  <option value="resolved">محلولة</option>
                  <option value="closed">مغلقة</option>
                </select>
              </TicketSelWrap>
            </TicketField>
          )}
          <button type="submit" disabled={saving} className="w-full bg-[#4a4644] text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60 hover:bg-black transition-colors">
            {saving ? "جارٍ الحفظ..." : isEditing ? "حفظ التعديلات" : "إنشاء تذكرة"}
          </button>
        </form>
    </AppModal>
  );
};

// ── Delete Confirm ────────────────────────────────────────────
const DeleteModal = ({ isOpen, onClose, onConfirm, loading }) => (
  <ConfirmModal
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onConfirm}
    title="تأكيد الحذف"
    message="هل أنت متأكد من حذف هذه التذكرة؟"
    confirmLabel="حذف"
    isSubmitting={loading}
    variant="danger"
  />
);

// ── Chat mock data ────────────────────────────────────────────
const driversChats = [
  { id:1, name:"محمد العتيبي", message:"شكراً سأكون جاهز للرحلة", time:"2:30 AM", avatar:"https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" },
  { id:2, name:"فهد الشهري",   message:"شكراً سأكون جاهز للرحلة", time:"2:30 AM", avatar:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" },
  { id:3, name:"سعود الغامدي", message:"شكراً سأكون جاهز للرحلة", time:"2:30 AM", avatar:"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" },
];
const chatMessages = [
  { id:1, sender:"user", text:"السلام عليكم، أنا مهتم بالرحلة رقم 35", time:"2:30 AM" },
  { id:2, sender:"me",   text:"وعليكم السلام، هل ترغب في تأكيد الاستلام؟",  time:"2:30 AM" },
  { id:3, sender:"user", text:"نعم، أحتاج تفاصيل أكثر عن وقت الرحلة",     time:"2:30 AM" },
];

// ── Main Component ────────────────────────────────────────────
export default function SupportPage() {
  const [activeTab, setActiveTab]   = useState("tickets");
  const [tickets, setTickets]       = useState([]);
  const [drivers, setDrivers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedChat, setSelectedChat] = useState(1);
  const [msgText, setMsgText]       = useState("");

  // modals
  const [noteModal, setNoteModal]         = useState({ open:false, ticketId:null });
  const [ticketModal, setTicketModal]     = useState({ open:false, ticket:null });
  const [deleteModal, setDeleteModal]     = useState({ open:false, ticketId:null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { searchQuery, setSearchQuery } = useGlobalSearch();
  const { can } = usePermissions();
  const canReply = can(PERMISSIONS.SUPPORT_TICKETS_REPLY);
  const canDelete = can(PERMISSIONS.SUPPORT_TICKETS_DELETE);
  const canEscalate = can(PERMISSIONS.SUPPORT_TICKETS_ESCALATE);

  const filteredTickets = useMemo(
    () => filterByGlobalSearch(tickets, searchQuery, (t) => [
      t.id,
      t.description,
      t.issue_type,
      t.driver?.name,
      t.driver?.last_name,
      statusInfo(t.status).label,
      priorityInfo(t.priority).label,
    ]),
    [tickets, searchQuery]
  );

  const filteredChats = useMemo(
    () => filterByGlobalSearch(driversChats, searchQuery, (c) => [c.name, c.message]),
    [searchQuery]
  );

  const fetchTickets = () => {
    setLoading(true);
    return fetch(`${BASE}/tickets`, { headers: { Accept: "application/json" } })
      .then(r => r.json())
      .then(d => {
        setTickets(Array.isArray(d.tickets) ? d.tickets : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };
  useEffect(() => {
    fetchTickets();
    fetch(`${BASE}/drivers`).then(r=>r.json()).then(d=>setDrivers(Array.isArray(d)?d:[])).catch(()=>{});
  }, []);

  const handleDelete = async () => {
    setDeleteLoading(true);
    const ticketId = deleteModal.ticketId;
    try {
      // DELETE endpoint not implemented on backend — use PUT status=closed as workaround
      await fetch(`${BASE}/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
    } catch(_) {}
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    setDeleteLoading(false);
    setDeleteModal({ open: false, ticketId: null });
    setTimeout(() => fetchTickets(), 100);
  };

  return (
    <div className="w-full min-h-screen p-6 font-sans flex flex-col" dir="rtl">

      {/* ── Row 1: title + buttons ── */}
      <div className="flex items-center justify-between mb-3 bg-white px-4 py-3 rounded-xl border border-gray-200/60 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800">الدعم الفني والتذاكر</h2>
        <div className="flex items-center gap-2">
          <button className="border border-gray-200 bg-white text-gray-600 text-xs px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/></svg>
            تصفية
          </button>
          {canEscalate && (
          <button onClick={()=>setTicketModal({open:true,ticket:null})} className="bg-[#4a4644] text-white text-xs px-4 py-2 rounded-lg hover:bg-black flex items-center gap-1.5 font-medium shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            إنشاء تذكرة
          </button>
          )}
        </div>
      </div>

      {/* ── Row 2: tabs ── */}
      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm mb-5 p-1 flex">
        <button onClick={()=>setActiveTab("live")} className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab==="live" ? "bg-gray-100 text-gray-800" : "text-gray-400 hover:text-gray-700"}`}>المحادثات المباشرة</button>
        <button onClick={()=>setActiveTab("tickets")} className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab==="tickets" ? "bg-gray-100 text-gray-800" : "text-gray-400 hover:text-gray-700"}`}>التذاكر</button>
      </div>

      {/* ── Tickets Tab ── */}
      {activeTab === "tickets" && (
        <div className="space-y-4">
          {loading ? <Spinner/> : filteredTickets.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">{tickets.length === 0 ? "لا توجد تذاكر" : "لا توجد نتائج للبحث"}</p>
          ) : filteredTickets.map(t => {
            const st = statusInfo(t.status);
            const pr = priorityInfo(t.priority);
            return (
              <div key={t.id} className="bg-white border border-gray-200/70 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden" dir="rtl">
                <div className="p-5 space-y-3 text-right">
                  <div className="flex items-center justify-start gap-1.5 flex-wrap">
                    <span className={`text-[11px] px-3 py-0.5 rounded-full font-bold ${st.cls}`}>{st.label}</span>
                    <span className={`text-[11px] px-3 py-0.5 rounded-full font-medium ${pr.cls}`}>{pr.label}</span>
                  </div>

                  {t.driver && (
                    <div className="flex items-center justify-start gap-2 text-xs text-gray-600">
                      <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                      <span className="font-semibold text-gray-700">{t.driver.name} {t.driver.last_name || ""}</span>
                    </div>
                  )}

                  <h3 className="text-sm font-bold text-gray-800 leading-relaxed">{t.description || t.issue_type}</h3>

                  <div className="flex items-center justify-start flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
                    <span>تم الإنشاء: {fmtDate(t.created_at)}</span>
                    <span className="text-gray-300">•</span>
                    <span>آخر تحديث: {fmtDate(t.updated_at)}</span>
                    {t.attachment && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                          مرفق
                        </span>
                      </>
                    )}
                    {t.notes?.length > 0 && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span>{t.notes.length} ملاحظة</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-100 mx-5" />

                <div className="px-5 py-3 flex items-center justify-start gap-5 text-xs text-gray-500">
                  {canReply && (
                  <button onClick={()=>setNoteModal({open:true,ticketId:t.id})} className="flex items-center gap-1 hover:text-[#b58f37] transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                    إضافة ملاحظة
                  </button>
                  )}
                  {canDelete && (
                  <button onClick={()=>setDeleteModal({open:true,ticketId:t.id})} className="flex items-center gap-1 hover:text-red-600 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    حذف
                  </button>
                  )}
                  {canReply && (
                  <button onClick={()=>setTicketModal({open:true,ticket:t})} className="flex items-center gap-1 hover:text-amber-600 transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    تعديل
                  </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Live Chat Tab ── */}
      {activeTab === "live" && (
        <div className="flex-1 flex bg-white border border-gray-200/70 rounded-2xl shadow-sm overflow-hidden min-h-[580px]">
          {/* Right: chat list */}
          <section className="w-80 flex flex-col bg-white border-l border-gray-100">
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث هنا......"
                  className="w-full bg-white border border-gray-200 rounded-xl py-2 pr-9 pl-4 text-xs text-right focus:outline-none focus:border-gray-300"
                />
                <span className="absolute right-3 top-2.5 text-gray-400 text-xs">🔍</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {filteredChats.map(chat => {
                const isSel = selectedChat === chat.id;
                return (
                  <div key={chat.id} onClick={()=>setSelectedChat(chat.id)} className={`flex items-center justify-between p-4 cursor-pointer transition-all ${isSel ? "bg-[#fcfaf7] border-r-4 border-[#b58f37]" : "hover:bg-gray-50"}`}>
                    <span className="text-[10px] text-gray-400 self-start shrink-0 pt-0.5">{chat.time}</span>
                    <div className="flex-1 text-right px-3 overflow-hidden">
                      <h5 className="text-xs font-bold text-gray-800 mb-1">{chat.name}</h5>
                      <p className={`text-[11px] truncate ${isSel?"text-gray-500":"text-gray-400"}`}>{chat.message}</p>
                    </div>
                    <img src={chat.avatar} alt={chat.name} className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-100"/>
                  </div>
                );
              })}
            </div>
          </section>
          {/* Left: chat window */}
          <section className="flex-1 flex flex-col bg-white">
            <header className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white">
              <img src={driversChats[selectedChat-1]?.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-gray-200"/>
              <div className="text-right"><h4 className="text-sm font-bold text-gray-800">{driversChats[selectedChat-1]?.name}</h4></div>
            </header>
            <div className="flex-1 p-6 overflow-y-auto bg-gray-50/30 space-y-4 flex flex-col">
              {chatMessages.map(msg => {
                const isMe = msg.sender === "me";
                return (
                  <div key={msg.id} className={`flex flex-col max-w-[70%] ${isMe?"self-end items-end":"self-start items-start"}`}>
                    <div className={`p-4 rounded-[22px] text-xs leading-relaxed shadow-sm ${isMe?"bg-[#575351] text-white rounded-bl-none text-right":"bg-[#f4f3f1] text-gray-700 rounded-br-none text-right"}`}>
                      <p className="font-medium">{msg.text}</p>
                      <div className={`text-[9px] mt-2 flex items-center gap-0.5 ${isMe?"text-gray-300 justify-end":"text-gray-400 justify-start"}`}>
                        <span>{msg.time}</span>{isMe&&<span className="text-emerald-400">✓✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <footer className="p-4 bg-white border-t border-gray-100">
              <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2">
                <button className="bg-[#b58f37] text-white p-2.5 rounded-lg hover:bg-[#9a762b] transition-all shrink-0 shadow-sm">
                  <svg className="w-4 h-4 transform rotate-180" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/></svg>
                </button>
                <input type="text" value={msgText} onChange={e=>setMsgText(e.target.value)} placeholder="اكتب رسالتك......" className="flex-1 bg-transparent border-none text-xs text-gray-700 focus:outline-none text-right"/>
                <div className="flex items-center gap-3 text-gray-400 shrink-0 border-r border-gray-200 pr-3">
                  <button className="hover:text-gray-600 text-sm">🖼️</button>
                  <button className="hover:text-gray-600 text-sm">📎</button>
                  <button className="hover:text-gray-600 text-sm">🎙️</button>
                </div>
              </div>
            </footer>
          </section>
        </div>
      )}

      {/* ── Modals ── */}
      <NoteModal isOpen={noteModal.open} ticketId={noteModal.ticketId} onClose={()=>setNoteModal({open:false,ticketId:null})} onSaved={fetchTickets}/>
      <TicketModal isOpen={ticketModal.open} ticket={ticketModal.ticket} drivers={drivers} onClose={()=>setTicketModal({open:false,ticket:null})} onSaved={fetchTickets}/>
      <DeleteModal isOpen={deleteModal.open} loading={deleteLoading} onClose={()=>setDeleteModal({open:false,ticketId:null})} onConfirm={handleDelete}/>
    </div>
  );
}

