import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuthContext } from "../context/AuthContext.jsx";
import { useToast } from "../lib/toast.jsx";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import SalesUserForm from "./users/SalesUserForm.jsx";
import UserTable from "./users/UserTable.jsx";
import AppModal from "./ui/AppModal";
import {
  fetchSalesList,
  salesRecordToUser,
  filterSalesUsers,
  createSalesRecord,
  updateSalesRecord,
  deleteSalesRecord,
  generateSalesId,
  findSalesByEmail,
  normalizeEmail,
} from "../services/salesService.js";
import { fetchStaffRolesMap } from "../services/staffRoleService.js";
import { fetchRoles } from "../services/roleService.js";
import { buildRoleOptions, getRoleLabel, getDefaultRoleId, resolveApiRoleId } from "../lib/roleUtils.js";
import { validateUserPhone } from "../lib/phoneValidation.js";
import { STATUS_LABELS, USER_STATUSES } from "../lib/roles.js";

const PAGE_SIZE = 10;

const selectCls = "h-11 w-full border border-gray-200 rounded-lg px-4 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right appearance-none";

function FilterSelect({ value, onChange, children, className }) {
  return (
    <div className={`relative ${className}`}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
        {children}
      </select>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

function SearchInput({ value, onChange, placeholder, className }){
    return (
        <div className={`relative ${className}`}>
            <input
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              className={`${selectCls} px-10`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
            </div>
        </div>
    )
}

function UsersPageContent() {
  const { user: currentUser } = useAuthContext();
  const toast = useToast();
  const { can } = usePermissions();
  const canCreate = can(PERMISSIONS.USERS_CREATE);
  const canEdit = can(PERMISSIONS.USERS_EDIT);

  const [salesUsers, setSalesUsers] = useState([]);
  const [roleMap, setRoleMap] = useState({});
  const [apiRoles, setApiRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { searchQuery, setSearchQuery } = useGlobalSearch();
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadSalesUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [list, roles] = await Promise.all([
        fetchSalesList(),
        fetchStaffRolesMap().catch(() => ({})),
      ]);
      setSalesUsers(list);
      setRoleMap(roles);
    } catch (err) {
      toast.error(err.message || "فشل تحميل المستخدمين");
      setSalesUsers([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    setRolesLoading(true);
    fetchRoles()
      .then(setApiRoles)
      .catch(() => setApiRoles([]))
      .finally(() => setRolesLoading(false));
    loadSalesUsers();
  }, [loadSalesUsers]);

  const roleOptions = useMemo(() => buildRoleOptions(apiRoles, { apiOnly: true }), [apiRoles]);

  const users = useMemo(
    () =>
      filterSalesUsers(
        salesUsers.map((sale) => salesRecordToUser(sale, roleMap[String(sale.id)])),
        { search: searchQuery, role: filterRole, status: filterStatus }
      ),
    [salesUsers, roleMap, searchQuery, filterRole, filterStatus]
  );

  const currentUserName = currentUser?.fullName ?? currentUser?.displayName ?? "مجهول";
  const currentUserPosition = getRoleLabel(currentUser?.role, apiRoles);

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const paged = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCreate = async (form) => {
    const email = normalizeEmail(form.email);
    const duplicate = findSalesByEmail(salesUsers, email);
    if (duplicate) {
      toast.error(
        `البريد «${email}» مسجّل مسبقاً للموظف «${duplicate.name || duplicate.id}» — استخدم بريداً آخر`
      );
      return;
    }

    const loginEmail = normalizeEmail(currentUser?.email);
    if (loginEmail && email === loginEmail) {
      toast.error("لا يمكن استخدام بريد تسجيل دخولك — أدخل بريداً آخر خاص بالموظف");
      return;
    }

    const roleId = resolveApiRoleId(form.role, roleOptions);
    if (!roleId) {
      toast.error("اختر دوراً صالحاً من القائمة");
      return;
    }

    const phoneCheck = validateUserPhone(form.phone);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.message);
      return;
    }

    if (!form.password || form.password.length < 8) {
      toast.error("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }

    setSubmitting(true);
    try {
      const id = generateSalesId();
      await createSalesRecord({
        id,
        name: form.fullName,
        phone: phoneCheck.normalized,
        email: form.email,
        password: form.password,
        role_id: roleId,
      });
      toast.success("تم إضافة الموظف بنجاح");
      setShowCreate(false);
      await loadSalesUsers();
    } catch (err) {
      toast.error(err.message || "فشل إضافة الموظف");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (form) => {
    if (!editUser) return;

    const phoneCheck = validateUserPhone(form.phone);
    if (!phoneCheck.valid) {
      toast.error(phoneCheck.message);
      return;
    }

    const roleId = resolveApiRoleId(form.role, roleOptions);
    if (!roleId) {
      toast.error("اختر دوراً صالحاً من القائمة");
      return;
    }

    setSubmitting(true);
    try {
      const staffId = editUser.uid ?? editUser.id;
      await updateSalesRecord(staffId, {
        name: form.fullName,
        phone: phoneCheck.normalized,
        email: editUser.email,
        role_id: roleId,
      });
      toast.success("تم تحديث بيانات الموظف");
      setEditUser(null);
      await loadSalesUsers();
    } catch (err) {
      toast.error(err.message || "فشل تحديث الموظف");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.uid ?? deleteTarget.id;
    setDeletingId(id);
    setDeleteTarget(null);
    try {
      await deleteSalesRecord(id);
      toast.success("تم حذف الموظف بنجاح");
      setSalesUsers((prev) => prev.filter((s) => String(s.id) !== String(id)));
    } catch (err) {
      toast.error(err.message || "فشل حذف الموظف");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full space-y-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm p-4 text-right">
        <h1 className="text-xl font-bold text-[#c9a84c]">المستخدمين</h1>
        <p className="text-xs text-gray-400 mt-0.5">
          إدارة موظفي خدمة العملاء من نظام المبيعات — <span className="font-mono">GET /api/sales</span>
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm font-bold text-gray-800">المستخدم الحالي</p>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-800 break-words">{currentUserName}</p>
          <span className="inline-block mt-1 text-xs font-normal text-[#c9a84c] bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
            {currentUserPosition}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-sm font-bold text-gray-800 text-right">
            إضافة موظف جديد
          </h2>
          <button
            type="button"
            onClick={() => canCreate && setShowCreate((v) => !v)}
            disabled={!canCreate}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-[#4a4644] text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {showCreate ? "إخفاء النموذج" : "إضافة موظف"}
          </button>
        </div>
        {showCreate && (
          <div className="pt-2 border-t border-gray-50">
            <SalesUserForm
              key={`create-${roleOptions.map((r) => r.id).join("-")}`}
              mode="create"
              existingSales={salesUsers}
              roles={roleOptions}
              rolesReady={!rolesLoading && roleOptions.length > 0}
              defaultRoleId={getDefaultRoleId(apiRoles)}
              onSubmit={handleCreate}
              loading={submitting}
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="text-base font-bold text-gray-800 text-right">
              سجل الموظفين
              <span className="mr-2 text-sm font-normal text-gray-400">({users.length})</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SearchInput
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="بحث بالاسم أو البريد أو الهاتف..."
              className="sm:col-span-1"
            />
            <FilterSelect 
              value={filterRole} 
              onChange={(v) => { setFilterRole(v); setPage(1); }}
              className="sm:col-span-1"
            >
              <option value="">جميع الأدوار</option>
              {roleOptions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </FilterSelect>
            <FilterSelect 
              value={filterStatus} 
              onChange={(v) => { setFilterStatus(v); setPage(1); }}
              className="sm:col-span-1"
            >
              <option value="">جميع الحالات</option>
              {Object.values(USER_STATUSES).map((key) => (
                <option key={key} value={key}>{STATUS_LABELS[key]}</option>
              ))}
            </FilterSelect>
          </div>
        </div>

        <UserTable
          users={paged}
          loading={loading}
          apiOnly
          firebaseRoles={apiRoles}
          onEdit={setEditUser}
          onDelete={setDeleteTarget}
          canEdit={canEdit}
          canDelete
          deletingId={deletingId}
        />

        {totalPages > 1 && (
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 py-3 px-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 disabled:opacity-40"
            >
              السابق
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`min-w-[2rem] h-8 px-2 rounded-lg text-xs font-bold border transition-colors ${
                  page === n
                    ? "bg-[#c9a84c] text-white border-[#c9a84c]"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 disabled:opacity-40"
            >
              التالي
            </button>
          </div>
        )}
      </div>

      <AppModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="حذف الموظف"
        size="sm"
      >
        <div className="space-y-4 text-right" dir="rtl">
          <p className="text-sm text-gray-600">
            هل أنت متأكد من حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="w-full sm:w-auto px-5 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="w-full sm:w-auto px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors"
            >
              حذف
            </button>
          </div>
        </div>
      </AppModal>

      <AppModal
        isOpen={!!editUser}
        onClose={() => setEditUser(null)}
        title="تعديل الموظف"
        isSubmitting={submitting}
        size="lg"
      >
        {editUser && (
          <SalesUserForm
            mode="edit"
            initial={editUser}
            roles={roleOptions}
            rolesReady={!rolesLoading && roleOptions.length > 0}
            onSubmit={handleEdit}
            onCancel={() => setEditUser(null)}
            loading={submitting}
          />
        )}
      </AppModal>
    </div>
  );
}

export default function UsersPage() {
  return <UsersPageContent />;
}
