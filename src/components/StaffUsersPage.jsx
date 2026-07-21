import { useCallback, useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { useAuthContext } from "../context/AuthContext.jsx";
import { useToast } from "../lib/toast.jsx";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { STATUS_LABELS, USER_STATUSES } from "../lib/roles.js";
import { buildRoleOptions, getDefaultRoleId, resolveApiRoleId } from "../lib/roleUtils.js";
import { validateUserPhone } from "../lib/phoneValidation.js";
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
import { fetchRoles } from "../services/roleService.js";
import SalesUserForm from "./users/SalesUserForm.jsx";
import UserDetailsModal from "./users/UserDetailsModal.jsx";
import UserTable from "./users/UserTable.jsx";
import AppModal from "./ui/AppModal";

const PAGE_SIZE = 10;

const selectCls =
  "h-10 w-full border border-gray-200 rounded-lg px-4 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right appearance-none";

function FilterSelect({ value, onChange, children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
        {children}
      </select>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export default function StaffUsersPage() {
  const { user: currentUser } = useAuthContext();
  const toast = useToast();
  const { can } = usePermissions();
  const canCreate = can(PERMISSIONS.USERS_CREATE);
  const canEdit = can(PERMISSIONS.USERS_EDIT);
  const canDelete = can(PERMISSIONS.USERS_DELETE);
  const canView = can(PERMISSIONS.USERS_READ);

  const [salesUsers, setSalesUsers] = useState([]);
  const [apiRoles, setApiRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(true);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [viewUserId, setViewUserId] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadSalesUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchSalesList();
      setSalesUsers(list);
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

  const users = useMemo(() => {
    return filterSalesUsers(
      salesUsers.map((sale) => salesRecordToUser(sale)),
      { search: searchQuery, role: filterRole, status: filterStatus },
    );
  }, [salesUsers, searchQuery, filterRole, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const paged = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageStart = users.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min(page * PAGE_SIZE, users.length);

  const paginationNumbers = useMemo(() => {
    const max = Math.min(totalPages, 5);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [totalPages]);

  const handleCreate = async (form) => {
    const email = normalizeEmail(form.email);
    const duplicate = findSalesByEmail(salesUsers, email);
    if (duplicate) {
      toast.error(`البريد «${email}» مسجّل مسبقاً`);
      return;
    }

    const loginEmail = normalizeEmail(currentUser?.email);
    if (loginEmail && email === loginEmail) {
      toast.error("لا يمكن استخدام بريد تسجيل دخولك");
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
      setCreateFormKey((k) => k + 1);
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
      toast.success("تم تحديث الموظف");
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

  const handleViewFromDetails = (sale) => {
    setViewUserId(null);
    setEditUser(salesRecordToUser(sale));
  };

  return (
    <div className="w-full space-y-5 pb-8" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Users className="w-6 h-6 text-[#9C6402]" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">المستخدمين</h1>
            <p className="text-xs text-gray-400 mt-0.5">إدارة موظفي خدمة العملاء من نظام المبيعات — GET /api/sales</p>
          </div>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="ابحث بالاسم أو البريد أو الهاتف..."
            className="w-full h-10 border border-gray-200 rounded-lg pr-10 pl-4 text-sm text-right focus:border-[#c9a84c] focus:outline-none bg-white"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {currentUser && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex items-center justify-between gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-400">المستخدم الحالي</p>
            <p className="text-sm font-semibold text-gray-800">{currentUser.fullName || currentUser.email}</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-[#9C6402] border border-amber-100">
            {currentUser.roleLabel || currentUser.role || "—"}
          </span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">إضافة موظف جديد</h2>
          <button
            type="button"
            onClick={() => {
              setShowCreate((v) => !v);
              setCreateFormKey((k) => k + 1);
            }}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg"
          >
            {showCreate ? "إخفاء النموذج" : "إظهار النموذج"}
          </button>
        </div>
        {showCreate && (
          <div className="p-5">
            {canCreate ? (
              <SalesUserForm
                key={`create-${createFormKey}-${roleOptions.map((r) => r.id).join("-")}`}
                mode="create"
                existingSales={salesUsers}
                roles={roleOptions}
                rolesReady={!rolesLoading && roleOptions.length > 0}
                defaultRoleId={getDefaultRoleId(apiRoles)}
                loading={submitting}
                onSubmit={handleCreate}
              />
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">ليس لديك صلاحية إضافة مستخدم</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-sm font-bold text-gray-800">
            سجل الموظفين
            <span className="mr-2 text-gray-400 font-normal">({users.length})</span>
          </h3>
          <div className="flex flex-col sm:flex-row gap-2 sm:max-w-xl w-full sm:w-auto">
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="بحث سريع..."
              className="h-10 border border-gray-200 rounded-lg px-4 text-sm text-right focus:border-[#c9a84c] focus:outline-none bg-white flex-1"
            />
            <FilterSelect value={filterRole} onChange={(v) => { setFilterRole(v); setPage(1); }} className="sm:w-40">
              <option value="">جميع الأدوار</option>
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </FilterSelect>
            <FilterSelect value={filterStatus} onChange={(v) => { setFilterStatus(v); setPage(1); }} className="sm:w-36">
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
          roles={roleOptions}
          onView={canView ? (user) => setViewUserId(user.uid ?? user.id) : undefined}
          onEdit={canEdit ? setEditUser : undefined}
          onDelete={canDelete ? setDeleteTarget : undefined}
          canEdit={canEdit}
          canDelete={canDelete}
          deletingId={deletingId}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/40">
          <p className="text-xs text-gray-500">
            إظهار {pageStart}–{pageEnd} من أصل {users.length} موظف
          </p>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {paginationNumbers.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={`min-w-[2rem] h-8 px-2 rounded text-xs font-bold transition-colors ${
                    page === n
                      ? "bg-[#9C6402] text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {n}
                </button>
              ))}
              {totalPages > 5 && <span className="text-xs text-gray-400 px-1">…</span>}
            </div>
          )}
        </div>
      </div>

      <UserDetailsModal
        isOpen={!!viewUserId}
        onClose={() => setViewUserId(null)}
        userId={viewUserId}
        roles={roleOptions}
        onEdit={canEdit ? handleViewFromDetails : undefined}
      />

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
            existingSales={salesUsers}
            roles={roleOptions}
            rolesReady={!rolesLoading && roleOptions.length > 0}
            defaultRoleId={getDefaultRoleId(apiRoles)}
            loading={submitting}
            onSubmit={handleEdit}
            onCancel={() => setEditUser(null)}
          />
        )}
      </AppModal>

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
    </div>
  );
}
