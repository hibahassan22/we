import { useState } from "react";

function ModuleExpanded({ module, enabled, onToggle, onToggleAll, readOnly = false }) {
  return (
    <div className="mt-3 space-y-2">
      {!readOnly && (
        <div className="flex items-center justify-end gap-2 mb-3">
          <button type="button" onClick={() => onToggleAll(false)} className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
            إلغاء الكل
          </button>
          <button type="button" onClick={() => onToggleAll(true)} className="text-xs px-3 py-1 rounded-lg border border-green-200 text-green-600 hover:bg-green-50">
            تفعيل الكل
          </button>
        </div>
      )}
      {module.permissions.map((perm, i) => (
        <div
          key={perm.key}
          className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors ${
            enabled[i] ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"
          }`}
        >
          <button
            type="button"
            onClick={() => !readOnly && onToggle(i)}
            disabled={readOnly}
            className={`relative inline-flex w-10 h-5 rounded-full shrink-0 transition-colors ${
              enabled[i] ? "bg-green-500" : "bg-gray-300"
            } ${readOnly ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <span
              className={`inline-block w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${
                enabled[i] ? "translate-x-1" : "translate-x-5"
              }`}
            />
          </button>
          <div className="flex items-center gap-2 text-right">
            <span className={`text-sm ${enabled[i] ? "text-gray-800" : "text-gray-400"}`}>{perm.label}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${enabled[i] ? "bg-green-500" : "bg-gray-300"}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ModuleRow({ module, expandedId, onExpand, permState, onToggle, onToggleAll, readOnly = false }) {
  const isOpen = expandedId === module.id;
  const enabledCount = permState.filter(Boolean).length;
  const total = module.permissions.length;
  const pct = total ? Math.round((enabledCount / total) * 100) : 0;
  const isActive = enabledCount > 0;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50/60 transition-colors"
        onClick={() => onExpand(isOpen ? null : module.id)}
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
            {isActive ? "مفعّل" : "معطّل"}
          </span>
          <span className="text-xs text-gray-400">{pct}%</span>
          <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-800">{module.name}</p>
            <p className="text-xs text-gray-400">{enabledCount} من {total} صلاحيات مفعلة</p>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${module.iconBg}`}>
            {module.icon}
          </div>
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 bg-white border-t border-gray-100">
          <ModuleExpanded
            module={module}
            enabled={permState}
            onToggle={onToggle}
            onToggleAll={onToggleAll}
            readOnly={readOnly}
          />
        </div>
      )}
    </div>
  );
}

/** قائمة وحدات الصلاحيات القابلة للتوسيع — نفس تصميم صفحة الصلاحيات */
export default function PermissionModuleList({ modules, moduleState, onChange, readOnly = false }) {
  const [expandedModule, setExpandedModule] = useState(null);

  const togglePerm = (moduleId, idx) => {
    const arr = [...moduleState[moduleId]];
    arr[idx] = !arr[idx];
    onChange({ ...moduleState, [moduleId]: arr });
  };

  const toggleAll = (moduleId, val) => {
    onChange({ ...moduleState, [moduleId]: moduleState[moduleId].map(() => val) });
  };

  return (
    <div className="space-y-2">
      {modules.map((mod) => (
        <ModuleRow
          key={mod.id}
          module={mod}
          expandedId={expandedModule}
          onExpand={setExpandedModule}
          permState={moduleState[mod.id]}
          onToggle={(i) => togglePerm(mod.id, i)}
          onToggleAll={(val) => toggleAll(mod.id, val)}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}
