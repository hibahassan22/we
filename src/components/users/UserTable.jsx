import { STATUS_LABELS } from "../../lib/roles.js";
import { getRoleLabel } from "../../lib/roleUtils.js";
import { formatAccountPhone } from "../../services/accountRegistryService.js";

function fmtDate(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

function AccountAvatar({ label, className = "w-11 h-11 text-sm" }) {
  const initial = (label?.trim()?.[0] ?? "#").toUpperCase();
  return (
    <div
      className={`rounded-full bg-gradient-to-br from-[#9C6402] to-[#E6C76A] flex items-center justify-center text-white font-bold shrink-0 ${className}`}
    >
      {initial}
    </div>
  );
}

function StatusBadge({ status }) {
  const active = status === "active";
  return (
    <span
      className={`inline-flex items-center text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap h-[26px] ${
        active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function RoleBadge({ role, roles = [], firebaseRoles }) {
  const roleList = roles.length ? roles : (firebaseRoles ?? []);
  const label = getRoleLabel(role, roleList);
  const upper = String(label).toUpperCase();
  const isAdmin = upper.includes("ADMIN") || upper.includes("مدير");
  return (
    <span
      className={`inline-flex items-center text-[11px] font-bold px-3 py-1 rounded-md whitespace-nowrap h-[26px] ${
        isAdmin
          ? "bg-[#4a4746] text-white"
          : "bg-amber-50 text-[#9C6402] border border-amber-100"
      }`}
    >
      {upper}
    </span>
  );
}

function ViewIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L13.196 5.196z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function AccountActions({ user, onView, onEdit, onDelete, canEdit = true, canDelete = true, deletingId, textActions = false }) {
  const userId = user.accountKey ?? user.uid ?? user.id;
  const isDeleting = deletingId === userId;

  if (textActions) {
    return (
      <div className="flex items-center justify-start gap-3 text-xs font-medium">
        {onView && (
          <button
            type="button"
            onClick={() => onView(user)}
            className="inline-flex items-center gap-1 text-gray-500 hover:text-[#9C6402] transition-colors"
          >
            <ViewIcon />
            تفاصيل
          </button>
        )}
        {canEdit && onEdit && (
          <button
            type="button"
            onClick={() => onEdit(user)}
            className="inline-flex items-center gap-1 text-gray-500 hover:text-[#9C6402] transition-colors"
          >
            <EditIcon />
            تعديل
          </button>
        )}
        {canDelete && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(user)}
            disabled={isDeleting}
            className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
          >
            {isDeleting ? (
              <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <TrashIcon />
            )}
            حذف
          </button>
        )}
      </div>
    );
  }

  const btnBase = "w-9 h-9 flex items-center justify-center rounded-lg border transition-colors disabled:opacity-60";
  return (
    <div className="flex items-center justify-start gap-2">
      {onView && (
        <button type="button" onClick={() => onView(user)} className={`${btnBase} text-gray-500 border-gray-200 hover:bg-gray-100`} title="عرض التفاصيل">
          <ViewIcon />
        </button>
      )}
      {canEdit && onEdit && (
        <button type="button" onClick={() => onEdit(user)} className={`${btnBase} text-gray-500 border-gray-200 hover:bg-gray-100`}>
          <EditIcon />
        </button>
      )}
      {canDelete && onDelete && (
        <button type="button" onClick={() => onDelete(user)} disabled={isDeleting} className={`${btnBase} text-red-500 border-red-200 bg-red-50/50 hover:bg-red-100`}>
          {isDeleting ? (
            <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <TrashIcon />
          )}
        </button>
      )}
    </div>
  );
}

function AccountCard({ user, roles, firebaseRoles, accountsMode, ...actions }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <AccountAvatar label={user.accountName || user.accountLabel} />
        <div className="flex-1 min-w-0 text-right">
          <p className="font-bold text-gray-900">{user.accountName || "—"}</p>
          <p className="text-xs text-gray-500 truncate mt-0.5" dir="ltr">
            {user.accountPhoneDisplay || formatAccountPhone(user.accountNumber)}
          </p>
          {accountsMode && (
            <p className="text-xs text-gray-400 mt-1">
              {user.memberCount ?? user.members?.length ?? 1} موظف
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 mt-4">
        {!accountsMode && <RoleBadge role={user.role} roles={roles} firebaseRoles={firebaseRoles} />}
        {!accountsMode && <StatusBadge status={user.status} />}
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100">
        <AccountActions user={user} textActions={accountsMode} {...actions} />
      </div>
    </div>
  );
}

export default function UserTable({
  users,
  onView,
  onEdit,
  onDelete,
  loading = false,
  accountsMode = false,
  roles = [],
  firebaseRoles = [],
  canEdit = true,
  canDelete = true,
  deletingId = null,
}) {
  const actions = { onView, onEdit, onDelete, canEdit, canDelete, deletingId, textActions: accountsMode };
  const roleList = roles.length ? roles : firebaseRoles;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center text-gray-400 text-sm py-16 px-4">
        <div className="text-4xl mb-3 opacity-60">👤</div>
        {accountsMode ? "لا توجد أكونتات" : "لا يوجد مستخدمين"}
      </div>
    );
  }

  if (accountsMode) {
    return (
      <>
        <div className="md:hidden p-4 space-y-3">
          {users.map((u) => (
            <AccountCard key={u.accountKey ?? u.uid ?? u.id} user={u} roles={roleList} accountsMode {...actions} />
          ))}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500">الاكونت</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500">عدد الموظفين</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500">تاريخ الإنشاء</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500">إجراءات</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.accountKey ?? u.uid ?? u.id} className="hover:bg-gray-50/60 transition-colors align-middle">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <AccountAvatar label={u.accountName || u.accountLabel} />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-base">
                          {u.accountName || "—"}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5" dir="ltr">
                          {u.accountPhoneDisplay || formatAccountPhone(u.accountNumber)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {u.memberCount ?? u.members?.length ?? 1} موظف
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {fmtDate(u.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <AccountActions user={u} {...actions} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  // الوضع الافتراضي (جدول المستخدمين القديم)
  return (
    <>
      <div className="md:hidden p-3 sm:p-4 space-y-3">
        {users.map((u) => (
          <AccountCard key={u.uid ?? u.id} user={u} roles={roleList} {...actions} />
        ))}
      </div>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-50/60">
            <tr>
              <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">المستخدم</th>
              <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">الدور</th>
              <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">القسم</th>
              <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
              <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">تاريخ الإنشاء</th>
              <th className="px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">إجراءات</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.uid ?? u.id} className="hover:bg-gray-50/70 transition-colors align-middle">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-4">
                    <AccountAvatar label={u.fullName} />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-[15px] truncate">{u.fullName}</p>
                      <p className="text-sm text-gray-500 truncate" dir="ltr">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <RoleBadge role={u.role} roles={roleList} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                  {u.department || "—"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={u.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                  {fmtDate(u.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <AccountActions user={u} {...actions} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
