import { ROLE_LABELS, STATUS_LABELS, USER_STATUSES } from "../../lib/roles.js";
import { PERMISSION_LABELS } from "../../lib/permissions.js";

export default function RoleSelector({ value, onChange, roles = [], disabled = false, placeholder }) {
  const options = roles.length
    ? roles
    : Object.entries(ROLE_LABELS).map(([id, name]) => ({ id, name }));

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right appearance-none disabled:opacity-60"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((r) => (
          <option key={r.id ?? r} value={r.id ?? r}>
            {r.name ?? ROLE_LABELS[r.id ?? r] ?? r}
          </option>
        ))}
      </select>
      <div className="absolute left-3 top-3 pointer-events-none text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export function StatusSelector({ value, onChange }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right appearance-none"
      >
        {Object.entries(USER_STATUSES).map(([, key]) => (
          <option key={key} value={key}>{STATUS_LABELS[key]}</option>
        ))}
      </select>
    </div>
  );
}

export { PERMISSION_LABELS };
