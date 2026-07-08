import { useEffect, useState, useMemo } from "react";
import { useToast } from "../lib/toast";
import { useAuthContext } from "../context/AuthContext.jsx";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { filterByGlobalSearch } from "../lib/searchUtils";
import AppModal, { ModalField, ModalActions, modalInputClass, ConfirmModal } from "./ui/AppModal";
import AddClientModal from "./clients/AddClientModal";
import { bannerImage } from "../lib/images.js";

const API_BASE = "https://drivo1.elmoroj.com";

// ======= Star Rating =======
const StarRating = ({ value }) => (
  <span className="flex items-center justify-end gap-0.5 text-xs text-amber-500 font-medium">
    <svg className="w-3.5 h-3.5 fill-amber-400" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
    {value}
  </span>
);

// ======= Client Details Modal (عرض التفاصيل) =======
const ClientDetailsModal = ({ isOpen, onClose, client, onUpdateClient, onAddNote }) => {
  const { can } = usePermissions();
  const canEdit = can(PERMISSIONS.CLIENTS_EDIT);
  const canExport = can(PERMISSIONS.CLIENTS_EXPORT);
  const [activeTab, setActiveTab] = useState("basic"); // basic | notes | trips
  const [editedClient, setEditedClient] = useState(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    if (isOpen && client) {
      setEditedClient(client);
      setNoteText("");
      setActiveTab("basic");
    }
  }, [client, isOpen]);

  if (!editedClient) return null;

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    const success = await onUpdateClient(editedClient);
    if (success) onClose();
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    const success = await onAddNote(editedClient.id, noteText.trim());
    if (success) setNoteText("");
  };

  return (
    <AppModal isOpen={isOpen} onClose={onClose} title="معلومات العميل" size="lg">
        <div className="pt-1 pb-4 text-right">
          <div className="bg-[#F5F4F0] p-1 rounded-2xl flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("basic")}
              className={`flex-1 text-center py-2 text-sm font-medium rounded-xl transition-all duration-200 ${activeTab === "basic" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              المعلومات الأساسية
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("notes")}
              className={`flex-1 text-center py-2 text-sm font-medium rounded-xl transition-all duration-200 ${activeTab === "notes" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              الملاحظات
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("trips")}
              className={`flex-1 text-center py-2 text-sm font-medium rounded-xl transition-all duration-200 ${activeTab === "trips" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              سجل الرحلات
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto -mx-1 px-1 text-right">
          
          {/* 1. المعلومات الأساسية Tab */}
          {activeTab === "basic" && (
            <form onSubmit={handleSaveChanges} className="space-y-4">
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-medium text-gray-400 block">الاسم بالكامل</label>
                <input
                  type="text"
                  value={editedClient.name}
                  onChange={(e) => setEditedClient({ ...editedClient, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-gray-700 text-sm focus:outline-none focus:border-amber-500 text-right"
                  readOnly={!canEdit}
                />
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-medium text-gray-400 block">رقم الهاتف</label>
                <input
                  type="text"
                  value={editedClient.phone}
                  onChange={(e) => setEditedClient({ ...editedClient, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-gray-700 text-sm focus:outline-none focus:border-amber-500 text-left"
                  dir="ltr"
                  readOnly={!canEdit}
                />
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-medium text-gray-400 block">العنوان</label>
                <input
                  type="text"
                  value={editedClient.address}
                  onChange={(e) => setEditedClient({ ...editedClient, address: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-gray-700 text-sm focus:outline-none focus:border-amber-500 text-right"
                  readOnly={!canEdit}
                />
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-xs font-medium text-gray-400 block">النوع</label>
                <select
                  value={editedClient.gender}
                  onChange={(e) => setEditedClient({ ...editedClient, gender: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 text-gray-700 text-sm focus:outline-none focus:border-amber-500 text-right bg-white"
                  disabled={!canEdit}
                >
                  <option value="ذكر">ذكر</option>
                  <option value="أنثى">أنثى</option>
                </select>
              </div>

              {/* التقييم بالنجوم */}
              <div className="space-y-1.5 text-right pt-2">
                <label className="text-xs font-medium text-gray-400 block">التقييم</label>
                <div className="flex items-center gap-2 justify-end" dir="ltr">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        onClick={() => canEdit && setEditedClient({ ...editedClient, rating: star })}
                        className={`w-5 h-5 ${canEdit ? "cursor-pointer" : "cursor-default"} ${star <= Math.round(editedClient.rating) ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-200"}`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-gray-600 mt-0.5">{editedClient.rating}/5</span>
                </div>
              </div>

              {canEdit && (
                <button type="submit" className="w-full mt-6 bg-[#4A4A4A] text-white font-medium py-3 rounded-xl hover:bg-[#3d3d3d] transition-colors text-center shadow-sm">
                  حفظ التغييرات
                </button>
              )}
            </form>
          )}

          {/* 2. الملاحظات Tab */}
          {activeTab === "notes" && (
            <div className="space-y-4 text-right">
              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="أضف ملاحظة جديدة"
                  className="w-full rounded-2xl border border-gray-200 p-4 text-sm text-gray-700 text-right focus:outline-none focus:border-amber-500 resize-none"
                />
                <button
                  type="button"
                  onClick={handleAddNote}
                  className="w-full bg-[#4A4A4A] text-white font-medium py-3 rounded-xl hover:bg-[#3d3d3d] transition-colors text-center shadow-sm"
                >
                  إضافة ملاحظة
                </button>
              </div>

              {editedClient.notes && editedClient.notes.length > 0 ? (
                editedClient.notes.map((note) => (
                  <div key={note.id} className="bg-[#FAF8F5] border border-[#E9E4DB] rounded-2xl p-4 text-right">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                        <span>{note.author}</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <span dir="ltr">{note.date}</span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{note.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-gray-400 py-4">لا توجد ملاحظات حالياً</p>
              )}
            </div>
          )}

          {/* 3. سجل الرحلات Tab */}
          {activeTab === "trips" && (
            <div className="space-y-3 text-right" dir="rtl">
              {editedClient.tripHistory && editedClient.tripHistory.length > 0 ? (
                <>
                  {editedClient.tripHistory.map((trip, idx) => (
                    <div key={idx} className="bg-[#FAF8F5] border border-gray-100 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[#b88121]">{trip.id}</span>
                          <span className={`${trip.statusColor || "bg-gray-500"} text-white text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0`}>
                            {trip.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-800 flex-wrap">
                          <span className="text-gray-400 text-xs font-normal">من</span>
                          <span className="font-semibold">{trip.from}</span>
                          <span className="text-gray-400">←</span>
                          <span className="text-gray-400 text-xs font-normal">إلى</span>
                          <span>{trip.to}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 block mt-1.5 text-right">
                        {trip.date
                          ? new Date(trip.date).toLocaleDateString("ar-SA")
                          : "—"}
                      </span>
                    </div>
                  ))}
                  {canExport && (
                  <button
                    onClick={() => {
                      const rows = editedClient.tripHistory.map(t =>
                        `${t.id}\t${t.from}\t${t.to}\t${t.date}\t${t.status}`
                      ).join("\n");
                      const header = "رقم الرحلة\tمن\tإلى\tالتاريخ\tالحالة\n";
                      const blob = new Blob(["\uFEFF" + header + rows], { type: "text/plain;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url; a.download = `رحلات_${editedClient.name}.txt`;
                      a.click(); URL.revokeObjectURL(url);
                    }}
                    className="w-full border border-gray-200 text-gray-500 text-sm py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-center mt-4 flex items-center justify-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    تصدير
                  </button>
                  )}
                </>
              ) : (
                <p className="text-center text-sm text-gray-400 py-4">لا يوجد سجل رحلات لهذا العميل</p>
              )}
            </div>
          )}

        </div>
    </AppModal>
  );
};

// ======= Main Page Component =======
export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedClientDetails, setSelectedClientDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalClients, setTotalClients] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, name: "" });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const toast = useToast();
  const { user } = useAuthContext();
  const { can } = usePermissions();
  const canCreate = can(PERMISSIONS.CLIENTS_CREATE);
  const canEdit = can(PERMISSIONS.CLIENTS_EDIT);
  const canDelete = can(PERMISSIONS.CLIENTS_DELETE);
  const { searchQuery } = useGlobalSearch();

  const filteredClients = useMemo(
    () => filterByGlobalSearch(clients, searchQuery, (c) => [
      c.name,
      c.phone,
      c.address,
      c.nationality,
      c.status,
      c.id,
    ]),
    [clients, searchQuery]
  );

  const mapApiNote = (note) => ({
    id: note.id?.toString() || `${Date.now()}-${Math.random()}`,
    author: note.author || "إداري",
    date: note.note_date || note.created_at || "",
    content: note.message || note.content || "",
  });

  const mapCustomerToClient = (item) => ({
    id: item.id,
    name: item.full_name || item.name || item.customer_name || "--",
    phone: item.phone || "--",
    address: item.address || "--",
    gender: item.gender || "--",
    nationality: item.nationality || item.customer_nationality || "--",
    rating: Number(item.rating || 5),
    status: "نشط",
    trips: {
      total: Number(item.total_trips || item.totalTrips || 0),
      active: Number(item.active_trips || item.activeTrips || 0),
      completed: Number(item.completed_trips || item.completedTrips || 0),
      cancelled: Number(item.cancelled_trips || item.cancelledTrips || 0),
      paused: Number(item.pending_trips || item.pausedTrips || 0),
    },
    notes: Array.isArray(item.notes) ? item.notes.map(mapApiNote) : [],
    tripHistory: [],
  });

  const fetchCustomerNotes = async (customerId) => {
    try {
      const response = await fetch(`${API_BASE}/api/customer-notes/${customerId}`);
      if (!response.ok) throw new Error(`فشل جلب ملاحظات العميل: ${response.status}`);
      const data = await response.json();
      return Array.isArray(data.notes) ? data.notes.map(mapApiNote) : [];
    } catch (err) {
      console.warn(err);
      return [];
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/Allcustomers`);
      if (!response.ok) throw new Error(`فشل جلب العملاء: ${response.status}`);
      const data = await response.json();
      const apiClients = Array.isArray(data.customers) ? data.customers.map(mapCustomerToClient) : [];
      setClients(apiClients);
      setTotalClients(data.total_customers || apiClients.length || 0);
    } catch (err) {
      setError(err.message || "حدث خطأ أثناء تحميل العملاء");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDetails = async (clientId) => {
    setDetailLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/customers-details/${clientId}`);
      if (!response.ok) throw new Error(`فشل جلب بيانات العميل: ${response.status}`);
      const data = await response.json();
      if (!data.customer) throw new Error("العميل غير موجود");
      const customer = mapCustomerToClient(data.customer);
      customer.notes = await fetchCustomerNotes(clientId);
      // map trips from API
      const statusColorMap = {
        completed:  "bg-emerald-500",
        pending:    "bg-blue-500",
        cancelled:  "bg-red-500",
        suspended:  "bg-gray-400",
        in_progress:"bg-blue-600",
      };
      const statusLabelMap = {
        completed:  "مكتملة",
        pending:    "موقوفة",
        cancelled:  "ملغية",
        suspended:  "موقوفة",
        in_progress:"قيد التنفيذ",
      };
      customer.tripHistory = Array.isArray(data.customer.trips)
        ? data.customer.trips.map(t => ({
            id: `#${t.id}`,
            from: t.from || "—",
            to:   t.to   || "—",
            date: t.trip_date || t.start_date || "",
            status:      statusLabelMap[t.status] || t.status,
            statusColor: statusColorMap[t.status] || "bg-gray-400",
          }))
        : [];
      setSelectedClientDetails(customer);
    } catch (err) {
      setError(err.message || "حدث خطأ أثناء تحميل بيانات العميل");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleDelete = async (id, name) => {
    setDeleteConfirm({ open: true, id, name: name || "هذا العميل" });
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/customers/${deleteConfirm.id}`, {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) throw new Error(`فشل حذف العميل: ${response.status}`);
      setClients((prev) => {
        const updated = prev.filter((c) => c.id !== deleteConfirm.id);
        setTotalClients(p => Math.max(0, p - 1));
        return updated;
      });
      if (selectedClientDetails && String(selectedClientDetails.id) === String(deleteConfirm.id)) {
        setSelectedClientDetails(null);
        setSelectedClient(null);
      }
    } catch (err) {
      console.error(err.message);
    } finally {
      setDeleteLoading(false);
      setDeleteConfirm({ open: false, id: null, name: "" });
    }
  };
  
  const handleAddClient = (created) => {
    const clientItem = {
      id: created.id,
      name: created.name,
      phone: created.phone,
      address: created.address ?? "",
      gender: created.gender,
      nationality: created.nationality,
      rating: 5.0,
      status: "نشط",
      trips: { total: 0, active: 0, completed: 0, cancelled: 0, paused: 0 },
      notes: [],
      tripHistory: [],
    };
    setClients((prev) => [clientItem, ...prev]);
    setTotalClients((p) => p + 1);
  };

  const handleUpdateClient = async (updatedClient) => {
    try {
      const response = await fetch(`${API_BASE}/api/customers/update/${updatedClient.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: updatedClient.name,
          phone: updatedClient.phone,
          address: updatedClient.address,
          customer_nationality: updatedClient.nationality,
          gender: updatedClient.gender,
        }),
      });

      if (!response.ok) throw new Error(`فشل تحديث العميل: ${response.status}`);
      const data = await response.json();
      const customer = data.customer || {};
      const updated = {
        ...updatedClient,
        name: customer.full_name || updatedClient.name,
        phone: customer.phone || updatedClient.phone,
        address: customer.address || updatedClient.address,
        gender: customer.gender || updatedClient.gender,
        nationality: customer.customer_nationality || updatedClient.nationality,
      };
      setClients((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      if (selectedClientDetails && String(selectedClientDetails.id) === String(updated.id)) {
        setSelectedClientDetails((prev) => prev ? { ...prev, ...updated } : prev);
      }
      toast.success("تم تحديث بيانات العميل");
      return true;
    } catch (err) {
      toast.error(err.message || "حدث خطأ أثناء تحديث العميل");
      return false;
    }
  };

  const handleAddNote = async (customerId, noteMessage) => {
    if (!noteMessage) return false;
    try {
      const date = new Date().toISOString().split("T")[0];
      const response = await fetch(`${API_BASE}/api/customer-notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: customerId,
          sales_id: user?.uid ?? "",
          message: noteMessage,
          type: "ملاحظة",
          note_date: date,
        }),
      });
      if (!response.ok) throw new Error(`فشل إضافة الملاحظة: ${response.status}`);
      const data = await response.json();
      const note = mapApiNote(data.data || {});
      setSelectedClientDetails((prev) => ({
        ...prev,
        notes: prev?.notes ? [note, ...prev.notes] : [note],
      }));
      toast.success("تمت إضافة الملاحظة");
      return true;
    } catch (err) {
      toast.error(err.message || "حدث خطأ أثناء إضافة الملاحظة");
      return false;
    }
  };

  const handleOpenDetails = async (client) => {
    setSelectedClient(client);
    setSelectedClientDetails(null);
    await fetchClientDetails(client.id);
  };

  const handleCloseDetails = () => {
    setSelectedClient(null);
    setSelectedClientDetails(null);
    setDetailLoading(false);
  };

  return (
    <div className="w-full space-y-4 p-4 md:p-6" dir="rtl">

      {/* Header */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-right text-sm text-red-700">
          {error}
        </div>
      )}
      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-right text-sm text-gray-600">
          جارٍ تحميل بيانات العملاء...
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-sm p-4 text-right">
        <h1 className="text-xl font-bold text-[#c9a84c]">قائمة العملاء</h1>
        <p className="text-xs text-gray-400 mt-0.5">تابع كل بيانات العملاء بسهولة</p>
      </div>

      {/* Banner */}
      <div
        className="relative bg-gradient-to-l from-[#b88121] to-[#dca43b] rounded-2xl overflow-hidden min-h-[160px] flex items-stretch shadow-sm"
        dir="ltr"
      >
        <div className="w-36 md:w-44 shrink-0 flex items-end px-4 pointer-events-none">
          <img
            src={bannerImage}
            alt="clients"
            className="max-h-[140px] w-full object-contain object-bottom drop-shadow-md"
          />
        </div>

        <div className="flex-1 flex flex-col items-end justify-center text-white text-right py-5 px-6 md:px-10">
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight">
            {totalClients}{" "}
            <span className="text-xl md:text-2xl font-normal">عميل</span>
          </h2>
          <p className="text-xs md:text-sm opacity-90 mt-1">عدد العملاء المسجلين لدينا</p>
          <button
            onClick={() => canCreate && setIsAddModalOpen(true)}
            disabled={!canCreate}
            className="mt-4 inline-flex items-center gap-2 bg-white text-[#b88121] text-xs md:text-sm font-semibold px-5 py-2 rounded-full shadow hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            إضافة عميل جديد
          </button>
        </div>
      </div>

      {/* Client Cards */}
      <div className="space-y-4">
        {!loading && !error && filteredClients.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-sm text-gray-400">
            {clients.length === 0 ? "لا يوجد عملاء مسجّلون حالياً" : "لا توجد نتائج تطابق البحث"}
          </div>
        )}
        {filteredClients.map((client) => (
          <div key={client.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-right">

            {/* Top row — الاسم يمين، الحالة يسار */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-gray-800 truncate">{client.name}</p>
                  <StarRating value={client.rating} />
                </div>
              </div>

              <span className="bg-blue-500 text-white text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 shrink-0">
                <span>{client.status}</span>
                {client.trips.active}
              </span>
            </div>

            {/* Info row */}
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-gray-600 mb-4 justify-start">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span dir="ltr">{client.phone}</span>
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                الجنس: {client.gender}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {client.address}
              </span>
            </div>

            {/* Trip stats */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-4 justify-start border-t border-gray-50 pt-3">
              <span>إجمالي الرحلات: <strong className="text-gray-700">{client.trips.total}</strong></span>
              <span>رحلات قيد التنفيذ: <strong className="text-gray-700">{client.trips.active}</strong></span>
              <span>رحلات مكتملة: <strong className="text-gray-700">{client.trips.completed}</strong></span>
              <span>رحلات ملغية: <strong className="text-gray-700">{client.trips.cancelled}</strong></span>
              <span>رحلات موقوفة: <strong className="text-gray-700">{client.trips.paused}</strong></span>
            </div>

            {/* Actions — من اليمين لليسار */}
            <div className="flex items-center gap-2 justify-start">
              <button 
                onClick={() => handleOpenDetails(client)}
                className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                عرض التفاصيل
              </button>
              {canEdit && (
                <button 
                  onClick={() => handleOpenDetails(client)}
                  className="p-2 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors"
                  title="تعديل"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => handleDelete(client.id, client.name)}
                  className="p-2 border border-red-200 text-red-400 rounded-lg hover:bg-red-50 transition-colors"
                  title="حذف"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>

          </div>
        ))}
      </div>

      {/* المودال الخاص بإضافة العميل */}
      <AddClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddClient}
      />

      {/* المودال الجديد الخاص بعرض التفاصيل (تعديل وتفاصيل كاملة) */}
      {(selectedClient || selectedClientDetails) && (
        <ClientDetailsModal
          isOpen={!!(selectedClient || selectedClientDetails)}
          onClose={handleCloseDetails}
          client={selectedClientDetails || selectedClient}
          onUpdateClient={handleUpdateClient}
          onAddNote={handleAddNote}
        />
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open:false, id:null, name:"" })}
        onConfirm={confirmDelete}
        title="تأكيد الحذف"
        message={<>هل أنت متأكد من حذف <span className="font-bold text-gray-800">{deleteConfirm.name}</span>؟</>}
        confirmLabel="حذف العميل"
        isSubmitting={deleteLoading}
        variant="danger"
      />

    </div>
  );
}