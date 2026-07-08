import { PERMISSION_LABELS, ALL_PERMISSIONS } from "../../lib/permissions.js";

export default function PermissionSelector({ selected = [], onChange, disabled = false }) {
  const toggle = (key) => {
    if (disabled) return;
    if (selected.includes(key)) {
      onChange(selected.filter((p) => p !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  const grouped = ALL_PERMISSIONS.reduce((acc, key) => {
    const module = key.split(".")[0];
    if (!acc[module]) acc[module] = [];
    acc[module].push(key);
    return acc;
  }, {});

  return (
    <div className="max-h-48 sm:max-h-56 overflow-y-auto border border-gray-100 rounded-xl p-3 space-y-3 bg-gray-50/50">
      {Object.entries(grouped).map(([module, keys]) => (
        <div key={module}>
          <p className="text-[10px] font-bold text-[#c9a84c] mb-1.5 text-right">{module}</p>
          <div className="flex flex-wrap gap-1.5 justify-end">
            {keys.map((key) => {
              const active = selected.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(key)}
                  disabled={disabled}
                  className={`text-[10px] px-2 py-1 rounded-lg border transition-colors ${
                    active
                      ? "bg-[#c9a84c] text-white border-[#c9a84c]"
                      : "bg-white text-gray-500 border-gray-200 hover:border-[#c9a84c]/50"
                  } disabled:opacity-60`}
                >
                  {PERMISSION_LABELS[key] ?? key}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
