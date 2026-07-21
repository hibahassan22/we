import { useState, useEffect, useMemo, useCallback } from "react";
import { Users } from "lucide-react";
import { useAuthContext } from "../context/AuthContext.jsx";
import { useToast } from "../lib/toast.jsx";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import AccountWizardForm from "./users/AccountWizardForm.jsx";
import AccountDetailsModal from "./users/AccountDetailsModal.jsx";
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
import {
  ensureAccountMeta,
  updateAccountMeta,
  removeAccountMeta,
  syncAccountMetaFromSales,
  enrichUserWithAccount,
  getAllAccountMeta,
  groupUsersByAccount,
} from "../services/accountRegistryService.js";
import { fetchRoles } from "../services/roleService.js";
import { buildRoleOptions, getDefaultRoleId, resolveApiRoleId } from "../lib/roleUtils.js";
import { validateUserPhone, validatePhoneTenDigitsFiveStart, normalizeSaudiPhoneForInputFiveStart } from "../lib/phoneValidation.js";
import { STATUS_LABELS, USER_STATUSES } from "../lib/roles.js";

const PAGE_SIZE = 10;

const selectCls = "h-10 w-full border border-gray-200 rounded-lg px-4 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right appearance-none";

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

function UsersPageContent() {
  const { user: currentUser } = useAuthContext();
  const toast = useToast();
  const { can } = usePermissions();
  const canCreate = can(PERMISSIONS.USERS_CREATE);
  const canEdit = can(PERMISSIONS.USERS_EDIT);
  const canDelete = can(PERMISSIONS.USERS_DELETE);
  const canView = can(PERMISSIONS.USERS_READ);

  const [salesUsers, setSalesUsers] = useState([]);
  const [accountMeta, setAccountMeta] = useState({});
  const [apiRoles, setApiRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(true);
  const [createStep, setCreateStep] = useState("account"); // "account" | "user"
  const [accountDraft, setAccountDraft] = useState({ accountName: "", accountNumber: "" });
  const [createUserFormKey, setCreateUserFormKey] = useState(0);
  const [editUser, setEditUser] = useState(null);
  const [viewAccount, setViewAccount] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadSalesUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchSalesList();
      syncAccountMetaFromSales(list);
      setAccountMeta(getAllAccountMeta());
      setSalesUsers(list);
    } catch (err) {
      toast.error(err.message || "فشل تحميل الأكونتات");
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
    const base = filterSalesUsers(
      salesUsers.map((sale) => salesRecordToUser(sale)),
      { search: "", role: filterRole, status: filterStatus },
    );
    const enriched = base.map((u) => enrichUserWithAccount(u, accountMeta[String(u.uid ?? u.id)]));
    const grouped = groupUsersByAccount(enriched);

    const term = searchQuery.trim().toLowerCase();
    if (!term) return grouped;

    return grouped.filter((account) => {
      const inAccount =
        String(account.accountNumber ?? "").includes(term)
        || account.accountName?.toLowerCase().includes(term)
        || account.accountLabel?.toLowerCase().includes(term)
        || account.accountPhoneDisplay?.includes(term);

      const inMembers = (account.members ?? []).some(
        (u) =>
          u.fullName?.toLowerCase().includes(term)
          || u.email?.toLowerCase().includes(term)
          || String(u.phone ?? "").includes(term),
      );

      return inAccount || inMembers;
    });
  }, [salesUsers, searchQuery, filterRole, filterStatus, accountMeta]);

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const paged = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageStart = users.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const pageEnd = Math.min(page * PAGE_SIZE, users.length);

  const handleCreateUser = async (form) => {
    if (!form.accountName?.trim()) {
      toast.error("أدخل اسم الأكونت");
      return;
    }
    const accountPhoneCheck = validatePhoneTenDigitsFiveStart(form.accountNumber);
    if (!accountPhoneCheck.valid) {
      toast.error(accountPhoneCheck.message || "أدخل رقم جوال سعودي صحيح للأكونت");
      return;
    }

    if (form.linkExisting && form.existingUserId) {
      setSubmitting(true);
      try {
        updateAccountMeta(form.existingUserId, {
          accountName: form.accountName,
          accountNumber: accountPhoneCheck.normalized,
        });
        setAccountMeta(getAllAccountMeta());
        toast.success("تم ربط الموظف بالأكونت");
        setCreateUserFormKey((k) => k + 1);
        await loadSalesUsers();
      } catch (err) {
        toast.error(err.message || "فشل ربط الموظف");
      } finally {
        setSubmitting(false);
      }
      return;
    }

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
      ensureAccountMeta(id, {
        accountName: form.accountName,
        accountNumber: accountPhoneCheck.normalized,
      });
      setAccountMeta(getAllAccountMeta());
      toast.success("تم إضافة الموظف داخل الأكونت");
      setCreateUserFormKey((k) => k + 1);
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
      updateAccountMeta(staffId, {
        accountName: form.accountName,
        accountNumber: form.accountNumber,
      });
      setAccountMeta(getAllAccountMeta());
      toast.success("تم تحديث الأكونت");
      setEditUser(null);
      await loadSalesUsers();
    } catch (err) {
      toast.error(err.message || "فشل تحديث الأكونت");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const members = deleteTarget.members?.length
      ? deleteTarget.members
      : [deleteTarget];

    setDeletingId(deleteTarget.accountKey ?? deleteTarget.uid ?? deleteTarget.id);
    setDeleteTarget(null);
    try {
      for (const member of members) {
        const id = member.uid ?? member.id;
        await deleteSalesRecord(id);
        removeAccountMeta(id);
      }
      setAccountMeta(getAllAccountMeta());
      toast.success("تم حذف الأكونت بنجاح");
      const deletedIds = new Set(members.map((m) => String(m.uid ?? m.id)));
      setSalesUsers((prev) => prev.filter((s) => !deletedIds.has(String(s.id))));
    } catch (err) {
      toast.error(err.message || "فشل حذف الأكونت");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditAccount = (account) => {
    const firstMember = account.members?.[0] ?? account;
    setEditUser({
      ...firstMember,
      accountName: account.accountName ?? firstMember.accountName,
      accountNumber: account.accountNumber ?? firstMember.accountNumber,
      members: account.members ?? [firstMember],
    });
  };

  const openAddEmployeeToAccount = (account) => {
    if (!account) return;
    setEditUser(null);
    setAccountDraft({
      accountName: account.accountName ?? "",
      accountNumber: normalizeSaudiPhoneForInputFiveStart(account.accountNumber ?? ""),
    });
    setCreateStep("user");
    setCreateUserFormKey((k) => k + 1);
    setShowCreate(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRemoveMemberFromAccount = async (member) => {
    if (!member) return;
    const id = member.uid ?? member.id;
    if (!id) return;
    try {
      await deleteSalesRecord(id);
      removeAccountMeta(id);
      setAccountMeta(getAllAccountMeta());
      toast.success("تم حذف الموظف");
      await loadSalesUsers();
    } catch (err) {
      toast.error(err.message || "فشل حذف الموظف");
    }
  };

  // حدّث تفاصيل الأكونت المفتوحة بعد أي تحميل جديد
  useEffect(() => {
    if (!viewAccount) return;
    const key = viewAccount.accountKey;
    const fresh = users.find((a) => a.accountKey === key);
    if (fresh) setViewAccount(fresh);
  }, [users, viewAccount?.accountKey]);

  const paginationNumbers = useMemo(() => {
    const max = Math.min(totalPages, 5);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [totalPages]);

  const createFormContent = createStep === "account" ? (
    <AccountWizardForm
      mode="account"
      existingSales={salesUsers}
      accountMeta={accountMeta}
      roles={roleOptions}
      rolesReady={!rolesLoading && roleOptions.length > 0}
      defaultRoleId={getDefaultRoleId(apiRoles)}
      loading={submitting}
      initial={{ accountName: "", accountNumber: "" }}
      onSubmit={(draft) => {
        setAccountDraft({
          accountName: draft.accountName,
          accountNumber: draft.accountNumber,
        });
        setCreateStep("user");
        setCreateUserFormKey((k) => k + 1);
      }}
      onCancel={() => {
        setShowCreate(false);
        setCreateStep("account");
        setAccountDraft({ accountName: "", accountNumber: "" });
      }}
    />
  ) : (
    <AccountWizardForm
      key={`user-${createUserFormKey}-${roleOptions.map((r) => r.id).join("-")}`}
      mode="user"
      accountDraft={accountDraft}
      existingSales={salesUsers}
      accountMeta={accountMeta}
      roles={roleOptions}
      rolesReady={!rolesLoading && roleOptions.length > 0}
      defaultRoleId={getDefaultRoleId(apiRoles)}
      loading={submitting}
      showAddAnother
      onAddAnother={() => setCreateUserFormKey((k) => k + 1)}
      onSubmit={handleCreateUser}
      onCancel={() => {
        setShowCreate(false);
        setCreateStep("account");
        setAccountDraft({ accountName: "", accountNumber: "" });
      }}
    />
  );

  return (
    <div className="w-full space-y-5 pb-8" dir="rtl">
      {/* عنوان الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Users className="w-6 h-6 text-[#9C6402]" />
          <h1 className="text-xl font-bold text-gray-800">إدارة الأكونتات</h1>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="بحث بالاسم أو رقم الأكونت..."
            className="w-full h-10 border border-gray-200 rounded-lg pr-10 pl-4 text-sm text-right focus:border-[#c9a84c] focus:outline-none bg-white"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* نموذج إضافة أكونت */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">إضافة أكونت جديد</h2>
          <button
            type="button"
            onClick={() => {
              setShowCreate((v) => !v);
              setCreateStep("account");
              setAccountDraft({ accountName: "", accountNumber: "" });
              setCreateUserFormKey((k) => k + 1);
            }}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg"
          >
            {showCreate ? "إخفاء النموذج" : "إظهار النموذج"}
          </button>
        </div>
        {showCreate && (
          <div className="p-5">
            {canCreate ? (
              createFormContent
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">ليس لديك صلاحية إضافة أكونت</p>
            )}
          </div>
        )}
      </div>

      {/* سجل الأكونتات */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-sm font-bold text-gray-800">
            سجل الأكونتات
            <span className="mr-2 text-gray-400 font-normal">({users.length})</span>
          </h3>
          <div className="flex flex-col sm:flex-row gap-2 sm:max-w-md w-full sm:w-auto">
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="بحث سريع..."
              className="h-10 border border-gray-200 rounded-lg px-4 text-sm text-right focus:border-[#c9a84c] focus:outline-none bg-white flex-1"
            />
            <FilterSelect
              value={filterStatus}
              onChange={(v) => { setFilterStatus(v); setPage(1); }}
              className="sm:w-36"
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
          accountsMode
          roles={roleOptions}
          onView={canView ? setViewAccount : undefined}
          onEdit={canEdit ? handleEditAccount : undefined}
          onDelete={canDelete ? setDeleteTarget : undefined}
          canEdit={canEdit}
          canDelete={canDelete}
          deletingId={deletingId}
        />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50/40">
          <p className="text-xs text-gray-500">
            إظهار {pageStart}–{pageEnd} من أصل {users.length} أكونت
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
              {totalPages > 5 && (
                <span className="text-xs text-gray-400 px-1">…</span>
              )}
            </div>
          )}
        </div>
      </div>

      <AccountDetailsModal
        isOpen={!!viewAccount}
        onClose={() => setViewAccount(null)}
        account={viewAccount}
        members={viewAccount?.members ?? []}
        roles={roleOptions}
        existingSales={salesUsers}
        accountMeta={accountMeta}
        canAddEmployee={canCreate}
        canDeleteEmployee={canDelete}
        rolesReady={!rolesLoading && roleOptions.length > 0}
        defaultRoleId={getDefaultRoleId(apiRoles)}
        submitting={submitting}
        onAddEmployeeSubmit={async (form) => {
          const draft = {
            ...form,
            accountName: viewAccount?.accountName ?? form.accountName,
            accountNumber: viewAccount?.accountNumber ?? form.accountNumber,
          };
          await handleCreateUser(draft);
        }}
        onRemoveMember={handleRemoveMemberFromAccount}
        onAssignTo={(entry) => {
          toast.success(`تم تعيين ${entry.userName} لمدة ${entry.days} يوم`);
        }}
      />

      <AppModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="حذف الأكونت"
        size="sm"
      >
        <div className="space-y-4 text-right" dir="rtl">
          <p className="text-sm text-gray-600">
            هل أنت متأكد من حذف هذا الأكونت
            {(deleteTarget?.memberCount ?? deleteTarget?.members?.length ?? 1) > 1
              ? ` وجميع الموظفين داخله (${deleteTarget.memberCount ?? deleteTarget.members.length})؟`
              : "؟"}
            {" "}لا يمكن التراجع عن هذا الإجراء.
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
        title="تعديل الأكونت"
        isSubmitting={submitting}
        size="lg"
      >
        {editUser && (
          <AccountWizardForm
            mode="edit"
            accountDraft={{ accountName: editUser.accountName, accountNumber: editUser.accountNumber }}
            initial={editUser}
            roles={roleOptions}
            rolesReady={!rolesLoading && roleOptions.length > 0}
            defaultRoleId={getDefaultRoleId(apiRoles)}
            existingSales={salesUsers}
            accountMeta={accountMeta}
            loading={submitting}
            onSubmit={handleEdit}
            onCancel={() => setEditUser(null)}
            onAddEmployee={
              canCreate
                ? () => openAddEmployeeToAccount(editUser)
                : undefined
            }
          />
        )}
      </AppModal>
    </div>
  );
}

export default function UsersPage() {
  return <UsersPageContent />;
}
