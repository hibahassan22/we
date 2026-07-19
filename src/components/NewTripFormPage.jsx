import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppModal, { modalInputClass } from "./ui/AppModal";
import { fetchSalesList } from "../services/salesService.js";
import { createTripWithoutDriver } from "../services/tripService.js";
import { fetchCustomersList } from "../services/customerService.js";
import { fetchBrokers } from "../services/brokerService.js";
import { NATIONALITY_OPTIONS } from "../services/cityService.js";
import AddClientModal from "./clients/AddClientModal";
import BrokerFormModal from "./brokers/BrokerFormModal.jsx";
import { buildTripCreatePayload } from "../lib/tripFormUtils.js";
import {
  sanitizePhoneInputFiveStart,
  validatePhoneTenDigitsFiveStart,
  normalizeSaudiPhoneForInputFiveStart,
} from "../lib/phoneValidation.js";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import { useToast } from "../lib/toast";

// ── Map Picker Modal (OpenStreetMap + Leaflet via CDN) ─────────────
function MapPickerModal({ title, onClose, onConfirm }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);

  // Load Leaflet CSS + JS from CDN
  useEffect(() => {
    // CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    // JS
    if (window.L) { setReady(true); return; }
    if (document.getElementById("leaflet-js")) {
      document.getElementById("leaflet-js").addEventListener("load", () => setReady(true));
      return;
    }
    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  // Init map after Leaflet loads
  useEffect(() => {
    if (!ready || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;
    const map = L.map(mapRef.current).setView([24.7136, 46.6753], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
    }).addTo(map);

    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      const pos = { lat, lng };
      setSelected(pos);
      if (markerRef.current) markerRef.current.remove();
      markerRef.current = L.marker([lat, lng]).addTo(map);
    });

    mapInstanceRef.current = map;

    // Fix Leaflet tile size after modal renders
    setTimeout(() => map.invalidateSize(), 100);
  }, [ready]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Search using Nominatim (OpenStreetMap geocoding - free)
  const handleSearch = async () => {
    if (!search.trim() || !mapInstanceRef.current) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&limit=1`,
        { headers: { "Accept-Language": "ar" } }
      );
      const data = await res.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        const pos = { lat, lng };
        mapInstanceRef.current.setView([lat, lng], 15);
        setSelected(pos);
        if (markerRef.current) markerRef.current.remove();
        markerRef.current = window.L.marker([lat, lng]).addTo(mapInstanceRef.current);
      }
    } catch {}
  };

  return (
    <AppModal
      isOpen
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <div>
          <p className="text-xs text-gray-400 text-center mb-2">اضغط على الخريطة لتحديد الموقع</p>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected}
            className="w-full py-2.5 bg-[#4a4644] text-white text-sm font-semibold rounded-xl hover:bg-black transition-colors disabled:opacity-40"
          >
            {selected
              ? `تأكيد الموقع (${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)})`
              : "اختر موقعاً على الخريطة أولاً"}
          </button>
        </div>
      }
    >
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleSearch}
          className="px-3 py-2 bg-[#c9a84c] text-white text-xs rounded-xl hover:bg-[#b8973d] transition-colors shrink-0"
        >
          بحث
        </button>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder="ابحث عن موقع... مثال: الرياض"
          className={`${modalInputClass} flex-1`}
        />
      </div>
      <div className="relative rounded-xl overflow-hidden" style={{ height: "50vh" }}>
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-400 text-sm gap-2 z-10">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            جاري تحميل الخريطة...
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </AppModal>
  );
}

// ── Shared primitives ──────────────────────────────────────────────
const Pill = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${active ? "border-[#c9a84c] bg-[#c9a84c] text-white" : "border-gray-200 bg-white text-gray-600 hover:border-[#c9a84c]"}`}>{label}</button>
);

const DayBtn = ({ label, short, active, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl text-xs font-bold border transition-all ${active ? "bg-[#c9a84c] border-[#c9a84c] text-white" : "bg-white border-gray-200 text-gray-600 hover:border-[#c9a84c]"}`}>
    <span className="text-base">{short}</span><span className="text-[10px]">{label}</span>
  </button>
);

const Field = ({ label, children }) => (
  <div className="space-y-1.5"><label className="block text-xs font-medium text-gray-600 text-right">{label}</label>{children}</div>
);

const Input = (props) => (
  <input {...props} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right placeholder-gray-300" />
);

function SaudiPhoneInput({ value, onChange, disabled, invalid, hint }) {
  return (
    <div className="space-y-1">
      <div className="flex gap-2" dir="ltr">
        <span className="shrink-0 flex items-center px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 font-medium">
          +966
        </span>
        <input
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(sanitizePhoneInputFiveStart(e.target.value))}
          placeholder="5xxxxxxxxx"
          maxLength={10}
          disabled={disabled}
          className={`flex-1 rounded-xl border px-3 py-2.5 text-sm focus:outline-none bg-white text-left placeholder-gray-300 ${
            invalid ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-[#c9a84c]"
          }`}
        />
      </div>
      {hint && <p className={`text-[11px] text-right ${invalid ? "text-red-600" : "text-gray-400"}`}>{hint}</p>}
    </div>
  );
}

function formatCustomerPhone(phone) {
  const digits = normalizeSaudiPhoneForInputFiveStart(phone);
  return digits || "بدون هاتف";
}

function formatCustomerOption(c) {
  const name = c.name ?? c.full_name ?? "—";
  return `${name} — ${formatCustomerPhone(c.phone)}`;
}

function CustomerSearchSelect({
  customers,
  value,
  onChange,
  loading,
  disabled,
  canAddClient,
  onAddClient,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = useMemo(
    () => customers.find((c) => String(c.id) === String(value)),
    [customers, value]
  );

  useEffect(() => {
    if (selected) {
      setQuery(formatCustomerOption(selected));
    } else if (!open) {
      setQuery("");
    }
  }, [selected, open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && query === formatCustomerOption(selected))) {
      return customers;
    }
    const qDigits = q.replace(/\D/g, "");
    return customers.filter((c) => {
      const name = String(c.name ?? c.full_name ?? "").toLowerCase();
      const phone = String(c.phone ?? "").replace(/\D/g, "");
      const displayPhone = formatCustomerPhone(c.phone).replace(/\D/g, "");
      return (
        name.includes(q) ||
        (qDigits && (phone.includes(qDigits) || displayPhone.includes(qDigits)))
      );
    });
  }, [customers, query, selected]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        if (selected) setQuery(formatCustomerOption(selected));
        else setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selected]);

  const handleInputChange = (e) => {
    const next = e.target.value;
    setQuery(next);
    setOpen(true);
    if (selected && next !== formatCustomerOption(selected)) {
      onChange("");
    }
  };

  const handleSelect = (c) => {
    onChange(String(c.id));
    setQuery(formatCustomerOption(c));
    setOpen(false);
  };

  const isSearching = query.trim().length > 0 && (!selected || query !== formatCustomerOption(selected));
  const showAddClient = canAddClient && isSearching && filtered.length === 0 && !loading;

  return (
    <div className="space-y-1">
      <div ref={containerRef} className="flex gap-2 items-stretch">
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => !disabled && setOpen(true)}
            disabled={disabled || loading}
            placeholder={loading ? "جاري تحميل العملاء..." : "ابحث بالاسم أو رقم الهاتف..."}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right placeholder-gray-300 disabled:opacity-60"
            autoComplete="off"
          />
          <div className="absolute left-3 top-3 pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {open && !disabled && !loading && (
            <ul className="absolute z-30 mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2.5 text-xs text-gray-400 text-right">
                  {isSearching ? "لا توجد نتائج" : "لا يوجد عملاء"}
                </li>
              ) : (
                filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(c)}
                      className={`w-full px-3 py-2.5 text-sm text-right hover:bg-amber-50 transition-colors ${
                        String(c.id) === String(value) ? "bg-amber-50 text-[#c9a84c] font-medium" : "text-gray-700"
                      }`}
                    >
                      {formatCustomerOption(c)}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        {showAddClient && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onAddClient?.();
            }}
            className="shrink-0 px-3 py-2 rounded-xl border border-[#c9a84c] text-[#c9a84c] text-xs font-bold hover:bg-amber-50 transition-colors whitespace-nowrap"
          >
            + إضافة عميل
          </button>
        )}
      </div>
    </div>
  );
}

function formatBrokerOption(b) {
  const name = b?.name || "—";
  const code = b?.broker_code || "";
  const phone = b?.phone ? String(b.phone) : "";
  return [name, code, phone].filter(Boolean).join(" — ");
}

function BrokerSearchSelect({
  brokers,
  value,
  onChange,
  loading,
  disabled,
  canAddBroker,
  onAddBroker,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = useMemo(
    () => brokers.find((b) => String(b.id) === String(value)),
    [brokers, value]
  );

  useEffect(() => {
    if (selected) setQuery(formatBrokerOption(selected));
    else if (!open) setQuery("");
  }, [selected, open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && query === formatBrokerOption(selected))) return brokers;
    const qDigits = q.replace(/\D/g, "");
    return brokers.filter((b) => {
      const name = String(b.name || "").toLowerCase();
      const code = String(b.broker_code || "").toLowerCase();
      const phone = String(b.phone || "").replace(/\D/g, "");
      return (
        name.includes(q) ||
        code.includes(q) ||
        (qDigits && phone.includes(qDigits))
      );
    });
  }, [brokers, query, selected]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        if (selected) setQuery(formatBrokerOption(selected));
        else setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selected]);

  const handleInputChange = (e) => {
    const next = e.target.value;
    setQuery(next);
    setOpen(true);
    if (selected && next !== formatBrokerOption(selected)) onChange("");
  };

  const handleSelect = (b) => {
    onChange(String(b.id));
    setQuery(formatBrokerOption(b));
    setOpen(false);
  };

  const isSearching = query.trim().length > 0 && (!selected || query !== formatBrokerOption(selected));
  const showAdd =
    canAddBroker && isSearching && filtered.length === 0 && !loading;

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="flex gap-2 items-stretch">
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => !disabled && setOpen(true)}
            disabled={disabled || loading}
            placeholder={loading ? "جاري تحميل الوسطاء..." : "ابحث بالاسم أو الكود أو الهاتف..."}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right placeholder-gray-300 disabled:opacity-60"
            autoComplete="off"
          />
          <div className="absolute left-3 top-3 pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {open && !disabled && !loading && (
            <ul className="absolute z-50 mt-1 w-full max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-3 text-xs text-gray-400 text-right">
                  {isSearching ? "لا توجد نتائج" : "لا يوجد وسطاء"}
                </li>
              ) : (
                filtered.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(b)}
                      className={`w-full px-3 py-3 text-sm text-right hover:bg-amber-50 transition-colors ${
                        String(b.id) === String(value) ? "bg-amber-50 text-[#c9a84c] font-medium" : "text-gray-700"
                      }`}
                    >
                      <span className="block font-medium">{b.name}</span>
                      <span className="block text-xs text-gray-400 mt-0.5" dir="ltr">
                        {[b.broker_code, b.phone].filter(Boolean).join(" · ")}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
        {showAdd && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onAddBroker?.();
            }}
            className="shrink-0 px-3 py-2 rounded-xl border border-[#c9a84c] text-[#c9a84c] text-xs font-bold hover:bg-amber-50 transition-colors whitespace-nowrap"
          >
            + إضافة وسيط
          </button>
        )}
      </div>
      {value && selected && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-xs text-gray-400 hover:text-red-500"
        >
          إزالة الوسيط المختار
        </button>
      )}
    </div>
  );
}

const Sel = ({ children, value, onChange, placeholder }) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right appearance-none"
    >
      {placeholder != null && (
        <option value="" disabled hidden>
          {placeholder}
        </option>
      )}
      {children}
    </select>
    <div className="absolute left-3 top-3 pointer-events-none text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
  </div>
);

const Toggle = ({ on, onToggle, label, sub }) => (
  <div className="flex items-center justify-between py-1">
    <button onClick={onToggle} className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${on ? "bg-[#c9a84c]" : "bg-gray-300"}`}>
      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? "translate-x-6" : "translate-x-0"}`} />
    </button>
    <div className="text-right"><p className="text-xs font-semibold text-gray-700">{label}</p>{sub && <p className="text-[10px] text-gray-400">{sub}</p>}</div>
  </div>
);

const Section = ({ icon, title, sub, children, allowOverflow }) => (
  <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${allowOverflow ? "overflow-visible" : "overflow-hidden"}`}>
    <div className="flex items-center justify-end gap-3 px-5 py-4 border-b border-gray-50">
      <div className="text-right"><p className="text-sm font-bold text-gray-800">{title}</p>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#9C6402,#E6C76A)" }}>{icon}</div>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const PinIcon = () => (
  <svg className="w-4 h-4 text-[#c9a84c] absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
  </svg>
);

function createEmptyStop() {
  return {
    fromCity: "",
    toCity: "",
    fromCoords: null,
    toCoords: null,
    fromLabel: "",
    toLabel: "",
  };
}

function MapPointButton({ label, hasCoords, onClick, placeholder = "اختر من الخريطة" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2.5 text-sm text-right flex items-center justify-between transition-colors cursor-pointer ${
        hasCoords ? "border-[#c9a84c] bg-amber-50 text-gray-800" : "border-gray-200 bg-white text-gray-400 hover:border-[#c9a84c]"
      }`}
    >
      <svg className="w-4 h-4 text-[#c9a84c] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      </svg>
      <span className="flex-1 text-right mr-2 truncate text-xs">{label || placeholder}</span>
    </button>
  );
}

/** تحويل YYYY-MM-DD → dd/mm/yy للعرض */
function formatDateDDMMYY(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(-2)}`;
}

/** تاريخ — تقويم، والعرض بصيغة dd/mm/yy */
function DateInput({ value, onChange, className = "" }) {
  const ref = useRef(null);
  const display = formatDateDDMMYY(value);

  const openPicker = () => {
    try {
      ref.current?.showPicker?.();
    } catch {
      /* ignore */
    }
    ref.current?.focus();
  };

  return (
    <div
      className={`relative cursor-pointer ${className}`}
      onClick={openPicker}
      dir="ltr"
    >
      {/* العرض للمستخدم */}
      <div
        className={`w-full rounded-xl border border-gray-200 px-3 py-2.5 pl-9 text-sm bg-white text-left pointer-events-none ${
          display ? "text-gray-800" : "text-gray-300"
        }`}
      >
        {display || "dd/mm/yy"}
      </div>
      {/* التقويم الأصلي — شفاف فوق الحقل */}
      <input
        ref={ref}
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        tabIndex={0}
      />
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    </div>
  );
}

/** وقت — الضغط في أي مكان يفتح منتقي الوقت */
function TimeInput({ value, onChange, className = "" }) {
  const ref = useRef(null);
  const openPicker = () => {
    try { ref.current?.showPicker?.(); } catch { /* ignore */ }
    ref.current?.focus();
  };
  return (
    <div className="relative cursor-pointer" onClick={openPicker}>
      <input
        ref={ref}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right cursor-pointer ${className}`}
      />
    </div>
  );
}

const DAYS = [
  { id: "sat", short: "س", label: "السبت" }, { id: "sun", short: "ح", label: "الأحد" },
  { id: "mon", short: "ن", label: "الاثنين" }, { id: "tue", short: "ث", label: "الثلاثاء" },
  { id: "wed", short: "ر", label: "الأربعاء" }, { id: "thu", short: "خ", label: "الخميس" },
  { id: "fri", short: "ج", label: "الجمعة" },
];

// ── Modal wrapper ──────────────────────────────────────────────────
function Modal({ title, sub, onClose, children, footer }) {
  return (
    <AppModal isOpen onClose={onClose} title={title} subtitle={sub} size="md" footer={footer}>
      <div className="space-y-4">{children}</div>
    </AppModal>
  );
}

// ── Modal 1: إضافة استثناء زمني ───────────────────────────────────
function ExceptionModal({ onClose }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [departTime, setDepartTime] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [note, setNote] = useState("");

  return (
    <Modal
      title="إضافة استثناء زمني"
      sub="تحديد تواريخ وأوقات مختلفة"
      onClose={onClose}
      footer={
        <button
          onClick={onClose}
          className="w-full bg-[#4a4644] hover:bg-black text-white text-sm font-semibold py-3 rounded-xl transition-colors"
        >
          إضافة الاستثناء
        </button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="من تاريخ">
          <DateInput value={dateFrom} onChange={setDateFrom} />
        </Field>
        <Field label="إلى تاريخ">
          <DateInput value={dateTo} onChange={setDateTo} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="وقت العودة">
          <TimeInput value={returnTime} onChange={setReturnTime} />
        </Field>
        <Field label="وقت الانطلاق">
          <TimeInput value={departTime} onChange={setDepartTime} />
        </Field>
      </div>

      <Field label="إضافة ملاحظة">
        <textarea rows="3" value={note} onChange={e => setNote(e.target.value)}
          placeholder="ادخل اي ملاحظات اضافية"
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right resize-none placeholder-gray-300" />
      </Field>
    </Modal>
  );
}

// ── Modal 2: نسخ الجدول الزمني ────────────────────────────────────
function CopyScheduleModal({ onClose }) {
  const [fromDay, setFromDay] = useState("");

  return (
    <Modal
      title="نسخ الجدول الزمني"
      sub="اختر اليوم الذي تريد نسخ الأوقات منه"
      onClose={onClose}
      footer={
        <button
          onClick={onClose}
          className="w-full bg-[#4a4644] hover:bg-black text-white text-sm font-semibold py-3 rounded-xl transition-colors"
        >
          نسخ الجدول
        </button>
      }
    >
      <Field label="اختر اليوم">
        <Sel value={fromDay} onChange={e => setFromDay(e.target.value)}>
          <option value="" disabled hidden>
            اختر اليوم
          </option>
          {DAYS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
        </Sel>
      </Field>
    </Modal>
  );
}

// ── Modal 3: إضافة راكب ───────────────────────────────────────────
function AddPassengerModal({ onClose, activeDays }) {
  const [riderType,    setRiderType]    = useState("");
  const [riderClass,   setRiderClass]   = useState("");
  const [useMap,       setUseMap]       = useState(true);
  const [sameTime,     setSameTime]     = useState(true);
  const [localDays,    setLocalDays]    = useState(activeDays || ["sat","sun","mon"]);
  const [departTime,   setDepartTime]   = useState("");
  const [returnTime,   setReturnTime]   = useState("");
  const [note,         setNote]         = useState("");
  const [showException,setShowException]= useState(false);

  const toggleDay = d => setLocalDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);

  return (
    <>
      <Modal
        title="إضافة راكب"
        sub="قم بإدخال بيانات الراكب بالكامل"
        onClose={onClose}
        footer={
          <div className="flex gap-3">
            <button
              onClick={() => setShowException(true)}
              className="flex-1 border border-[#c9a84c] text-[#c9a84c] text-sm font-medium py-2.5 rounded-xl hover:bg-amber-50 transition-colors"
            >
              إضافة الاستثناء
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-[#c9a84c] hover:bg-[#b8973d] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
            >
              إضافة راكب
            </button>
          </div>
        }
      >
        {/* نوع الراكب + التصنيف */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="التصنيف">
            <Sel value={riderClass} onChange={e => setRiderClass(e.target.value)} placeholder="اختر التصنيف">
              <option value="موظف">موظف</option>
              <option value="طالب">طالب</option>
            </Sel>
          </Field>
          <Field label="نوع الراكب">
            <Sel value={riderType} onChange={e => setRiderType(e.target.value)} placeholder="اختر النوع">
              <option value="ذكر">ذكر</option>
              <option value="أنثى">أنثى</option>
              <option value="طفل">طفل</option>
            </Sel>
          </Field>
        </div>

        {/* Toggles */}
        <Toggle on={useMap} onToggle={() => setUseMap(v => !v)} label="تحديد الموقع من الخريطة" sub="حد الموقع من خريطة جوجل" />
        <Toggle on={sameTime} onToggle={() => setSameTime(v => !v)} label="استخدام نمط موحد لجميع الأيام" sub="نفس التوقيت لكل أيام الأسبوع" />

        {/* Days */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-600 text-right">أيام التشغيل *</p>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {DAYS.map(d => (
              <button key={d.id} onClick={() => toggleDay(d.id)}
                className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl text-xs font-bold border transition-all ${localDays.includes(d.id) ? "bg-[#c9a84c] border-[#c9a84c] text-white" : "bg-white border-gray-200 text-gray-600 hover:border-[#c9a84c]"}`}>
                <span className="text-sm">{d.short}</span>
                <span className="text-[9px]">{d.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Route */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="نقطة الوصول *">
            <div className="relative">
              <input placeholder="الإحداثيات: 34.2145,2345" className="w-full rounded-xl border border-gray-200 pr-3 pl-9 py-2.5 text-xs focus:border-[#c9a84c] focus:outline-none bg-white text-right placeholder-gray-300" />
              <PinIcon />
            </div>
          </Field>
          <Field label="نقطة الانطلاق *">
            <div className="relative">
              <input placeholder="الإحداثيات: 34.2145,2345" className="w-full rounded-xl border border-gray-200 pr-3 pl-9 py-2.5 text-xs focus:border-[#c9a84c] focus:outline-none bg-white text-right placeholder-gray-300" />
              <PinIcon />
            </div>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="مكان الانطلاق"><Input placeholder="ادخل نقطة الانطلاق" /></Field>
          <Field label="مكان الوصول"><Input placeholder="ادخل نقطة الوصول" /></Field>
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="وقت العودة">
            <TimeInput value={returnTime} onChange={setReturnTime} />
          </Field>
          <Field label="وقت الانطلاق">
            <TimeInput value={departTime} onChange={setDepartTime} />
          </Field>
        </div>

        {/* Notes */}
        <Field label="إضافة ملاحظة">
          <textarea rows="3" value={note} onChange={e => setNote(e.target.value)}
            placeholder="ادخل اي ملاحظات اضافية"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right resize-none placeholder-gray-300" />
        </Field>
      </Modal>

      {/* nested exception modal */}
      {showException && <ExceptionModal onClose={() => setShowException(false)} />}
    </>
  );
}

// ── helpers to generate monthly days ──────────────────────────────
const DAY_NAMES = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function getActiveDaysInMonth(activeDayIds, dateFrom) {
  const base = dateFrom ? new Date(dateFrom) : new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayIdToJS = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const result = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const jsDay = date.getDay();
    const dayId = Object.keys(dayIdToJS).find(k => dayIdToJS[k] === jsDay);
    if (activeDayIds.includes(dayId)) {
      result.push({ date, label: `${DAY_NAMES[jsDay]} ${d} ${base.toLocaleString("ar", { month: "long" })} ${year}` });
    }
  }
  return result;
}

// ── Route fields (shared) ──────────────────────────────────────────
function RouteFields({ isBoth }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="مكان الانطلاق *">
          <div className="relative"><input placeholder="ادخل نقطة الانطلاق" className="w-full rounded-xl border border-gray-200 pr-3 pl-9 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right placeholder-gray-300" /><PinIcon /></div>
        </Field>
        <Field label="مكان الوصول *">
          <div className="relative"><input placeholder="ادخل نقطة الوصول" className="w-full rounded-xl border border-gray-200 pr-3 pl-9 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right placeholder-gray-300" /><PinIcon /></div>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="إحداثيات الانطلاق"><input placeholder="اضغط لاختيار من الخريطة" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right placeholder-gray-300" /></Field>
        <Field label="إحداثيات الوصول"><input placeholder="اضغط لاختيار من الخريطة" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right placeholder-gray-300" /></Field>
      </div>
    </div>
  );
}

// ── Time fields removed — الاستثناء انتقل لمواعيد الرحلة ───────────
function TimeFields() {
  return null;
}

// ── Dynamic schedule component ─────────────────────────────────────
// returns { routeSection, timeSection } — each is JSX or null
// For single+go (or single+both): route is standalone section, time is standalone section
// For multi: combined per-day cards
function useScheduleSections({
  passengers,
  routeType,
  direction,
  subType,
  activeDays,
  dateFrom,
  useMap,
  sameTime,
  onToggleSameTime,
  onToggleUseMap,
  multiDayRoutes,
  onDayStopsChange,
  onOpenDayMap,
}) {
  const isMulti = routeType === "multi";
  const isBoth  = direction === "both";
  const isMonthly = subType === "monthly";

  if (!isMulti) {
    // single route — route and time are separate sections
    const routeContent = (
      <div className="space-y-4">
        <p className="text-xs text-gray-500 text-right">🔁 نقطة الانطلاق والنهاية</p>
        <Toggle on={useMap} onToggle={onToggleUseMap} label="تحديد الموقع من الخريطة" sub="يتم تحديد الموقع من خريطة جوجل" />
        <RouteFields isBoth={isBoth} />
      </div>
    );
    const timeContent = null;
    return { routeContent, timeContent, multiContent: null };
  }

  // Multi-route: per-day rows, no separate route/time sections
  const dayRows = isMonthly
    ? getActiveDaysInMonth(activeDays, dateFrom)
    : activeDays.map(id => ({ date: null, label: DAYS.find(d => d.id === id)?.label || id }));

  const multiContent = (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 text-right">اضغط على نقطة الانطلاق أو الوصول لفتح الخريطة لكل يوم</p>
      <Toggle on={sameTime} onToggle={onToggleSameTime} label="استخدام نمط موحد لجميع الأيام" sub="نفس التوقيت لكل أيام الأسبوع" />
      {dayRows.map((row, i) => (
        <DayRouteRow
          key={i}
          label={row.label}
          isBoth={isBoth}
          idx={i}
          stops={multiDayRoutes[i] ?? [createEmptyStop()]}
          onStopsChange={(stops) => onDayStopsChange(i, stops)}
          onOpenMap={(stopIdx, type) => onOpenDayMap(i, stopIdx, type)}
        />
      ))}
    </div>
  );
  return { routeContent: null, timeContent: null, multiContent };
}

// ── Per-day route row ──────────────────────────────────────────────
function DayRouteRow({ label, isBoth, stops, onStopsChange, onOpenMap }) {
  const [departTime, setDepartTime] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [showCopy, setShowCopy] = useState(false);

  const addStop = () => onStopsChange([...stops, createEmptyStop()]);

  const updateStop = (stopIdx, patch) => {
    onStopsChange(stops.map((s, i) => (i === stopIdx ? { ...s, ...patch } : s)));
  };

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between bg-gray-50/70 px-4 py-2.5">
        <button type="button" onClick={() => setShowCopy(true)} className="text-xs text-white bg-[#c9a84c] hover:bg-[#b8973d] px-3 py-1.5 rounded-lg transition-colors">نسخ من يوم آخر</button>
        <p className="text-xs font-semibold text-gray-700">{label}</p>
      </div>
      <div className="p-4 space-y-3">
        {stops.map((stop, si) => (
          <div key={si} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="إحداثيات الانطلاق *">
                <MapPointButton
                  label={stop.fromLabel}
                  hasCoords={!!stop.fromCoords}
                  onClick={() => onOpenMap(si, "from")}
                  placeholder="اضغط لفتح الخريطة"
                />
              </Field>
              <Field label="إحداثيات الوصول *">
                <MapPointButton
                  label={stop.toLabel}
                  hasCoords={!!stop.toCoords}
                  onClick={() => onOpenMap(si, "to")}
                  placeholder="اضغط لفتح الخريطة"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="مكان الانطلاق">
                <Input
                  placeholder="ادخل نقطة الانطلاق"
                  value={stop.fromCity}
                  onChange={(e) => updateStop(si, { fromCity: e.target.value })}
                />
              </Field>
              <Field label="مكان الوصول">
                <Input
                  placeholder="ادخل نقطة الوصول"
                  value={stop.toCity}
                  onChange={(e) => updateStop(si, { toCity: e.target.value })}
                />
              </Field>
            </div>
            {isBoth ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="وقت العودة"><TimeInput value={returnTime} onChange={setReturnTime} /></Field>
                <Field label="وقت الانطلاق"><TimeInput value={departTime} onChange={setDepartTime} /></Field>
              </div>
            ) : (
              <Field label="وقت الانطلاق"><TimeInput value={departTime} onChange={setDepartTime} /></Field>
            )}
          </div>
        ))}
        <button type="button" onClick={addStop} className="flex items-center gap-1.5 border border-dashed border-gray-300 text-gray-500 text-xs px-3 py-2 rounded-xl hover:border-[#c9a84c] hover:text-[#c9a84c] transition-colors w-full justify-center">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          إضافة محطة
        </button>
      </div>
      {showCopy && <CopyScheduleModal onClose={() => setShowCopy(false)} />}
    </div>
  );
}

// ── Passenger card (group+multi+both) ─────────────────────────────
function PassengerCard({ idx, activeDays, useMap, onToggleUseMap, sameTime, onToggleSameTime, onRemove }) {
  const [departTime, setDepartTime] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [notes, setNotes] = useState("");
  const [showException, setShowException] = useState(false);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-end gap-2 bg-[#faf7f0] px-4 py-3 border-b border-gray-100">
        <p className="text-xs font-bold text-gray-800">بيانات الراكب {idx + 1} (الأساسي)</p>
        <p className="text-[10px] text-gray-400">قم بإدخال بيانات الراكب بالكامل</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Name + Phone */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="الهاتف (خدمة العملاء)"><Input placeholder="ادخل الهاتف" /></Field>
          <Field label="الاسم (خدمة العملاء)"><Input placeholder="ادخل الاسم" /></Field>
        </div>

        {/* Classification + Gender */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="جنس العميل">
            <Sel value="" onChange={() => {}} placeholder="اختر الجنس">
              <option value="ذكر">ذكر</option>
              <option value="أنثى">أنثى</option>
              <option value="طفل">طفل</option>
            </Sel>
          </Field>
          <Field label="تصنيف العميل">
            <Sel value="" onChange={() => {}} placeholder="اختر التصنيف">
              <option value="موظف">موظف</option>
              <option value="طالب">طالب</option>
            </Sel>
          </Field>
        </div>

        {/* Toggles */}
        <Toggle on={useMap} onToggle={onToggleUseMap} label="تحديد الموقع من الخريطة" sub="يتم تحديد الموقع من خريطة جوجل" />
        <Toggle on={sameTime} onToggle={onToggleSameTime} label="استخدام نمط موحد لجميع الأيام" sub="نفس التوقيت لكل أيام الأسبوع" />

        {/* Days */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-600 text-right">أيام التشغيل *</p>
          <div className="flex gap-1.5 flex-wrap justify-end">
            {DAYS.map(d => (
              <button key={d.id} className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl text-xs font-bold border transition-all ${activeDays.includes(d.id) ? "bg-[#c9a84c] border-[#c9a84c] text-white" : "bg-white border-gray-200 text-gray-600"}`}>
                <span className="text-sm">{d.short}</span>
                <span className="text-[9px]">{d.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Route */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="نقطة الوصول *"><div className="relative"><input placeholder="الإحداثيات: 34.2145,2345" className="w-full rounded-xl border border-gray-200 pr-3 pl-9 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right placeholder-gray-300 text-xs" /><PinIcon /></div></Field>
          <Field label="نقطة الانطلاق *"><div className="relative"><input placeholder="الإحداثيات: 34.2145,2345" className="w-full rounded-xl border border-gray-200 pr-3 pl-9 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right placeholder-gray-300 text-xs" /><PinIcon /></div></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="مكان الانطلاق"><Input placeholder="ادخل نقطة الانطلاق" /></Field>
          <Field label="مكان الوصول"><Input placeholder="ادخل نقطة الوصول" /></Field>
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="وقت العودة"><TimeInput value={returnTime} onChange={setReturnTime} /></Field>
          <Field label="وقت الانطلاق"><TimeInput value={departTime} onChange={setDepartTime} /></Field>
        </div>

        {/* Notes */}
        <Field label="إضافة ملاحظة">
          <textarea rows="2" placeholder="ادخل اي ملاحظات اضافية" value={notes} onChange={e => setNotes(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right resize-none placeholder-gray-300" />
        </Field>

        {/* Exception button */}
        <div className="flex justify-start">
          <button onClick={() => setShowException(true)} className="flex items-center gap-1.5 border border-[#c9a84c] text-[#c9a84c] text-xs px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            إضافة استثناء
          </button>
        </div>
      </div>
      {showException && <ExceptionModal onClose={() => setShowException(false)} />}
    </div>
  );
}

// ── Extra passenger row (collapsed) ───────────────────────────────
function PassengerRow({ idx, onRemove }) {
  return (
    <div className="flex items-center justify-between bg-[#faf7f0] border border-gray-100 rounded-xl px-4 py-3">
      <div className="flex items-center gap-2">
        <button onClick={onRemove} className="text-xs text-red-500 hover:underline flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          حذف
        </button>
        <button className="text-xs text-gray-500 hover:text-[#c9a84c] flex items-center gap-1 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          تعديل
        </button>
      </div>
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        راكب {idx + 1}
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function NewTripFormPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const toast = useToast();
  const canCreate = can(PERMISSIONS.TRIPS_ADS_CREATE) || can(PERMISSIONS.TRIPS_CREATE);
  const canAddClient = can(PERMISSIONS.CLIENTS_CREATE);
  const canAddBroker = can(PERMISSIONS.BROKERS_CREATE) || can(PERMISSIONS.DRIVERS_CREATE);

  const [tripCard,    setTripCard]    = useState("subscription");
  const [passengers,  setPassengers]  = useState("single");
  const [routeType,   setRouteType]   = useState("single");
  const [direction,   setDirection]   = useState("go");
  const [subType,     setSubType]     = useState("monthly");
  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [activeDays,  setActiveDays]  = useState(["sat", "sun", "mon"]);
  const toggleDay = d => setActiveDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);

  const [useMap,      setUseMap]      = useState(true);
  const [sameTime,    setSameTime]    = useState(true);
  const [riderCount,  setRiderCount]  = useState("5");
  const [customers,   setCustomers]   = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState(null);
  const [customerId,  setCustomerId]  = useState("");
  const [showAddClient, setShowAddClient] = useState(false);
  const [clientName,  setClientName]  = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [nationality, setNationality] = useState("");
  const [clientType,  setClientType]  = useState("");
  const [clientGender,setClientGender]= useState("");
  const [fromCity,    setFromCity]    = useState("");
  const [toCity,      setToCity]      = useState("");
  const [departureTime, setDepartureTime] = useState("07:00");
  const [returnTime,    setReturnTime]    = useState("");
  const [showScheduleException, setShowScheduleException] = useState(false);
  const [transferMethod, setTransferMethod] = useState("نقدي");
  const [bankName,       setBankName]       = useState("");
  const [accountNumber,  setAccountNumber]  = useState("");
  const [ourCommission,  setOurCommission]  = useState("");
  const [commissionManual, setCommissionManual] = useState(false);
  const [driverNat,   setDriverNat]   = useState("");
  const [driverGender,setDriverGender]= useState("");
  const [carSize,     setCarSize]     = useState("large");
  const [price,       setPrice]       = useState("");
  const [notes,       setNotes]       = useState("");

  const calcCommission15 = (priceVal) => {
    const n = Number(priceVal);
    if (!Number.isFinite(n) || n < 0) return "";
    return String(Math.round(n * 0.15 * 100) / 100);
  };

  const handlePriceChange = (e) => {
    const next = e.target.value;
    setPrice(next);
    if (!commissionManual) setOurCommission(calcCommission15(next));
  };

  const handleCommissionChange = (e) => {
    setCommissionManual(true);
    setOurCommission(e.target.value);
  };

  // ── Sales ──────────────────────────────────────────────────────
  const [salesList,   setSalesList]   = useState([]);
  const [selectedSales, setSelectedSales] = useState([]);
  const toggleSale = (id) => setSelectedSales(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  // ── Broker (optional) ──────────────────────────────────────────
  const [brokers, setBrokers] = useState([]);
  const [brokersLoading, setBrokersLoading] = useState(true);
  const [brokerId, setBrokerId] = useState("");
  const [showAddBroker, setShowAddBroker] = useState(false);

  useEffect(() => {
    fetchSalesList()
      .then(setSalesList)
      .catch(() => setSalesList([]));
    fetchCustomersList()
      .then((list) => {
        setCustomers(list);
        setCustomersError(null);
      })
      .catch((err) => {
        setCustomers([]);
        setCustomersError(err.message || "فشل تحميل قائمة العملاء");
      })
      .finally(() => setCustomersLoading(false));
    fetchBrokers()
      .then(setBrokers)
      .catch(() => setBrokers([]))
      .finally(() => setBrokersLoading(false));
  }, []);

  const handleBrokerAdded = (saved) => {
    if (!saved?.id) return;
    setBrokers((prev) => {
      const exists = prev.some((b) => String(b.id) === String(saved.id));
      return exists ? prev : [saved, ...prev];
    });
    setBrokerId(String(saved.id));
  };

  const handleCustomerSelect = (id) => {
    setCustomerId(id);
    const c = customers.find((x) => String(x.id) === String(id));
    if (c) {
      setClientName(c.name ?? c.full_name ?? "");
      setClientPhone(normalizeSaudiPhoneForInputFiveStart(c.phone ?? ""));
      setNationality(c.nationality ?? "");
      setClientGender(c.gender === "أنثى" || c.gender === "female" ? "أنثى" : c.gender === "طفل" ? "طفل" : c.gender === "ذكر" || c.gender === "male" ? "ذكر" : "");
    }
  };

  const handleClientAdded = (created) => {
    if (!created?.id) return;
    setCustomers((prev) => {
      const exists = prev.some((c) => String(c.id) === String(created.id));
      return exists ? prev : [created, ...prev];
    });
    setCustomersError(null);
    setCustomerId(String(created.id));
    setClientName(created.name ?? created.full_name ?? "");
    setClientPhone(normalizeSaudiPhoneForInputFiveStart(created.phone ?? ""));
    setNationality(created.nationality ?? "");
    setClientGender(
      created.gender === "أنثى" || created.gender === "female"
        ? "أنثى"
        : created.gender === "طفل"
          ? "طفل"
          : created.gender === "ذكر" || created.gender === "male"
            ? "ذكر"
            : ""
    );
  };

  const phoneValidation = useMemo(() => validatePhoneTenDigitsFiveStart(clientPhone), [clientPhone]);
  const phoneInvalid = clientPhone.length > 0 && !phoneValidation.valid;

  // ── Map picker ─────────────────────────────────────────────────
  const [mapTarget, setMapTarget] = useState(null);
  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords,   setToCoords]   = useState(null);
  const [fromLabel,  setFromLabel]  = useState("");
  const [toLabel,    setToLabel]    = useState("");
  const [multiDayRoutes, setMultiDayRoutes] = useState({});

  const handleDayStopsChange = useCallback((dayIdx, stops) => {
    setMultiDayRoutes((prev) => ({ ...prev, [dayIdx]: stops }));
  }, []);

  const openDayMap = useCallback((dayIdx, stopIdx, type) => {
    setMapTarget({ scope: "day", dayIdx, stopIdx, type });
  }, []);

  const handleMapConfirm = (coords) => {
    const label = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
    if (!mapTarget) return;

    if (mapTarget.scope === "day") {
      const { dayIdx, stopIdx, type } = mapTarget;
      setMultiDayRoutes((prev) => {
        const dayStops = [...(prev[dayIdx] ?? [createEmptyStop()])];
        while (dayStops.length <= stopIdx) dayStops.push(createEmptyStop());
        const patch =
          type === "from"
            ? { fromCoords: coords, fromLabel: label }
            : { toCoords: coords, toLabel: label };
        dayStops[stopIdx] = { ...dayStops[stopIdx], ...patch };
        return { ...prev, [dayIdx]: dayStops };
      });
    } else if (mapTarget === "from") {
      setFromCoords(coords);
      setFromLabel(label);
    } else {
      setToCoords(coords);
      setToLabel(label);
    }
    setMapTarget(null);
  };

  const mapModalTitle = !mapTarget
    ? "اختر الموقع"
    : mapTarget === "to" || mapTarget?.type === "to"
      ? "اختر نقطة الوصول"
      : "اختر نقطة الانطلاق";

  // ── Submit ─────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async () => {
    if (!customerId) {
      setSubmitError("اختر العميل (الراكب الأساسي) من القائمة");
      return;
    }
    if (!phoneValidation.valid) {
      setSubmitError(phoneValidation.message || "أدخل رقم هاتف سعودي صحيح (10 أرقام)");
      return;
    }
    if (routeType === "multi") {
      const dayCount = subType === "monthly"
        ? getActiveDaysInMonth(activeDays, dateFrom).length
        : activeDays.length;
      for (let i = 0; i < dayCount; i++) {
        const stop = multiDayRoutes[i]?.[0];
        if (!stop?.fromCoords || !stop?.toCoords) {
          setSubmitError("حدد نقطة الانطلاق والوصول من الخريطة لكل يوم");
          return;
        }
        if (!stop.fromCity?.trim() || !stop.toCity?.trim()) {
          setSubmitError("أدخل مكان الانطلاق والوصول لكل يوم");
          return;
        }
      }
    } else {
      if (!fromCoords || !toCoords) {
        setSubmitError("حدد نقطة الانطلاق والوصول من الخريطة");
        return;
      }
      if (!fromCity.trim() || !toCity.trim()) {
        setSubmitError("أدخل اسم مكان الانطلاق والوصول");
        return;
      }
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const firstMultiStop = multiDayRoutes[0]?.[0];
      const payload = buildTripCreatePayload({
        passengers,
        routeType,
        direction,
        subType,
        activeDays,
        dateFrom,
        departureTime,
        returnTime,
        riderCount,
        price,
        notes,
        fromCity: routeType === "multi" ? (firstMultiStop?.fromCity || fromCity) : fromCity,
        toCity: routeType === "multi" ? (firstMultiStop?.toCity || toCity) : toCity,
        fromCoords: routeType === "multi" ? firstMultiStop?.fromCoords : fromCoords,
        toCoords: routeType === "multi" ? firstMultiStop?.toCoords : toCoords,
        multiDayRoutes: routeType === "multi" ? multiDayRoutes : undefined,
        selectedSales,
        carSize,
        customerId,
        clientName,
        clientPhone: phoneValidation.normalized ?? clientPhone,
        nationality,
        clientGender,
        driverGender,
        driverNat,
        transferMethod,
        bankName,
        accountNumber,
        ourCommission,
        brokerId,
      });

      await createTripWithoutDriver(payload);
      navigate("/create-trip");
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const tripCards = [
    { id: "subscription", label: "رحلات اشتراك",  icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { id: "daily",        label: "رحلات يومية",   icon: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" },
    { id: "shared",       label: "رحلات تشاركية", icon: "M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z" },
    { id: "hourly",       label: "رحلات بالساعة", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  const { multiContent } = useScheduleSections({
    passengers, routeType, direction, subType, activeDays, dateFrom,
    useMap, sameTime,
    onToggleUseMap: () => setUseMap(v => !v),
    onToggleSameTime: () => setSameTime(v => !v),
    multiDayRoutes,
    onDayStopsChange: handleDayStopsChange,
    onOpenDayMap: openDayMap,
  });

  const isMultiRoute = routeType === "multi";

  const isGroup = passengers === "group";
  // جماعي + مسارات مختلفة + ذهاب وعودة → per-passenger section
  const isGroupMulti = isGroup && routeType === "multi" && direction === "both";

  // extra passengers list
  const [extraPassengers, setExtraPassengers] = useState([2]);
  const [showAddPassenger, setShowAddPassenger] = useState(false);
  const addPassenger = () => setShowAddPassenger(true);
  const removePassenger = (i) => setExtraPassengers(p => p.filter((_, idx) => idx !== i));

  return (
    <div className="w-full space-y-4" dir="rtl">

      {/* Header */}
      <div className="bg-white rounded-xl px-5 py-3 border border-gray-200/60 shadow-sm flex items-center justify-between">
        <button onClick={() => navigate("/create-trip")} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm">
          <svg className="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          العودة إلى الرحلات
        </button>
        <div className="text-right">
          <p className="text-base font-bold text-[#c9a84c]">إنشاء رحلة جديدة</p>
          <p className="text-xs text-gray-400">إضافة رحلة جديدة إلى قائمة الإعلانات</p>
        </div>
      </div>

      {/* Trip type cards */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-800 text-right mb-4">إنشاء رحلة جديدة</h2>
        <div className="grid grid-cols-4 gap-3">
          {tripCards.map(tc => (
            <button key={tc.id} onClick={() => setTripCard(tc.id)} className={`flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 transition-all ${tripCard === tc.id ? "border-[#c9a84c] bg-gradient-to-b from-[#9C6402] to-[#E6C76A] text-white shadow-md" : "border-gray-200 bg-gray-50 text-gray-500 hover:border-[#c9a84c]"}`}>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tc.icon} /></svg>
              <span className="text-xs font-medium">{tc.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* تفاصيل الرحلة */}
      <Section title="تفاصيل الرحلة" sub="حد نوع الرحلة الجاهزها وطريقة الاشتراك بسهولة"
        icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-600 text-right">نوع المسار</p>
          <div className="grid grid-cols-2 gap-2">
            <Pill label="جماعي - عدة ركاب" active={passengers === "group"}  onClick={() => setPassengers("group")} />
            <Pill label="• فردي"            active={passengers === "single"} onClick={() => setPassengers("single")} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Pill label="مسارات مختلفة" active={routeType === "multi"}  onClick={() => setRouteType("multi")} />
            <Pill label="• مسار واحد"   active={routeType === "single"} onClick={() => setRouteType("single")} />
          </div>
          <p className="text-xs font-semibold text-gray-600 text-right">اتجاه المسار</p>
          <div className="grid grid-cols-2 gap-2">
            <Pill label="ذهاب وعودة" active={direction === "both"} onClick={() => setDirection("both")} />
            <Pill label="• ذهاب فقط"  active={direction === "go"}   onClick={() => setDirection("go")} />
          </div>
          <p className="text-xs font-semibold text-gray-600 text-right">نوع الاشتراك</p>
          <div className="grid grid-cols-2 gap-2">
            <Pill label="مخصص"  active={subType === "custom"}  onClick={() => setSubType("custom")} />
            <Pill label="• شهري" active={subType === "monthly"} onClick={() => setSubType("monthly")} />
          </div>
        </div>
      </Section>

      {/* مواعيد الرحلة */}
      <Section title="مواعيد الرحلة" sub="اختر الفترة والأيام لتحديد جدول الرحلة"
        icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="من تاريخ"><DateInput value={dateFrom} onChange={setDateFrom} /></Field>
            <Field label="إلى تاريخ"><DateInput value={dateTo} onChange={setDateTo} /></Field>
          </div>
          <p className="text-xs font-semibold text-gray-600 text-right">أيام التشغيل *</p>
          <div className="flex gap-2 flex-wrap justify-end">
            {DAYS.map(d => <DayBtn key={d.id} label={d.label} short={d.short} active={activeDays.includes(d.id)} onClick={() => toggleDay(d.id)} />)}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Field label="وقت الانطلاق *">
              <TimeInput value={departureTime} onChange={setDepartureTime} />
            </Field>
            <Field label="وقت العودة *">
              <TimeInput value={returnTime} onChange={setReturnTime} />
            </Field>
          </div>
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowScheduleException(true)}
              className="flex items-center gap-1.5 border border-[#c9a84c] text-[#c9a84c] text-xs px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              إضافة استثناء
            </button>
            <div className="text-right">
              <p className="text-xs font-semibold text-gray-700">استثناء الجدول الزمني</p>
              <p className="text-[10px] text-gray-400">تحديد تواريخ وأوقات مختلفة</p>
            </div>
          </div>
        </div>
      </Section>

      {/* مسار الرحلة — مسار واحد فقط */}
      {!isGroupMulti && !isMultiRoute && (
        <Section title="مسار الرحلة" sub="حد نقطة الانطلاق والوصول بسهولة"
          icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>}>
          <div className="space-y-3">
            <p className="text-xs text-gray-500 text-right">🔁 نقطة الانطلاق والنهاية</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="مكان الانطلاق *">
                <Input placeholder="مثال: الرياض" value={fromCity} onChange={(e) => setFromCity(e.target.value)} />
              </Field>
              <Field label="مكان الوصول *">
                <Input placeholder="مثال: المدينة" value={toCity} onChange={(e) => setToCity(e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="إحداثيات الانطلاق *">
                <MapPointButton label={fromLabel} hasCoords={!!fromCoords} onClick={() => setMapTarget("from")} />
              </Field>
              <Field label="إحداثيات الوصول *">
                <MapPointButton label={toLabel} hasCoords={!!toCoords} onClick={() => setMapTarget("to")} />
              </Field>
            </div>
          </div>
        </Section>
      )}

      {/* أوقات ومسارات الرحلة — multi route فقط (قسم أوقات الرحلة المنفصل أُزيل) */}
      {!isGroupMulti && multiContent && (
        <Section title="مسارات الرحلة" sub="حد مسار كل يوم بسهولة"
          icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>}>
          {multiContent}
        </Section>
      )}

      {/* ═══ جماعي + مسارات مختلفة + ذهاب وعودة → بيانات الركاب ═══ */}
      {isGroupMulti && (
        <Section
          title="بيانات الركاب"
          sub="حد مواعيد ونقطة انطلاق كل راكب"
          icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z" /></svg>}
        >
          <div className="space-y-4">
            {/* Add passenger button */}
            <div className="flex justify-start">
              <button onClick={addPassenger} className="flex items-center gap-1.5 bg-[#c9a84c] hover:bg-[#b8973d] text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                إضافة راكب
              </button>
            </div>

            {/* Passenger 1 (main form) */}
            <PassengerCard
              idx={0}
              activeDays={activeDays}
              useMap={useMap}
              onToggleUseMap={() => setUseMap(v => !v)}
              sameTime={sameTime}
              onToggleSameTime={() => setSameTime(v => !v)}
              onRemove={null}
            />

            {/* Extra passengers (collapsed rows) */}
            {extraPassengers.map((num, i) => (
              <PassengerRow key={i} idx={num - 1} onRemove={() => removePassenger(i)} />
            ))}
          </div>
        </Section>
      )}

      {/* بيانات العميل — NOT group+multi+both */}
      {!isGroupMulti && (
        <Section title="بيانات العميل" sub="معلومات العميل الأساسية"
          icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}>
          <div className="space-y-3">
            <Field label="الراكب الأساسي (من العملاء) *">
              <CustomerSearchSelect
                customers={customers}
                value={customerId}
                onChange={handleCustomerSelect}
                loading={customersLoading}
                disabled={customersLoading}
                canAddClient={canAddClient}
                onAddClient={() => setShowAddClient(true)}
              />
              {customersError && (
                <p className="text-[11px] text-red-600 text-right mt-1">{customersError}</p>
              )}
              {!customersLoading && !customersError && customers.length === 0 && (
                <p className="text-[11px] text-amber-700 text-right mt-1">لا توجد عملاء — ابحث واضغط «إضافة عميل» لإنشاء عميل جديد.</p>
              )}
            </Field>
            {isGroup && (
              <Field label="عدد الركاب">
                <Sel value={riderCount} onChange={e => setRiderCount(e.target.value)}>
                  {["2","3","4","5","6","7","8","9","10"].map(n => <option key={n} value={n}>{n}</option>)}
                </Sel>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="الهاتف *">
                <SaudiPhoneInput
                  value={clientPhone}
                  onChange={setClientPhone}
                  invalid={phoneInvalid}
                  hint={
                    phoneInvalid
                      ? phoneValidation.message
                      : clientPhone.length > 0
                        ? "10 أرقام تبدأ بـ 5 — مثال: 5xxxxxxxxx"
                        : "كود السعودية +966 — 10 أرقام تبدأ بـ 5"
                  }
                />
              </Field>
              <Field label="الاسم"><Input placeholder="ادخل الاسم" value={clientName} onChange={e => setClientName(e.target.value)} /></Field>
            </div>
            <Field label="الجنسية">
              <Sel value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="اختر الجنسية">
                {NATIONALITY_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </Sel>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="جنس العميل">
                <Sel value={clientGender} onChange={e => setClientGender(e.target.value)} placeholder="اختر الجنس">
                  <option value="ذكر">ذكر</option>
                  <option value="أنثى">أنثى</option>
                  <option value="طفل">طفل</option>
                </Sel>
              </Field>
              <Field label="تصنيف العميل">
                <Sel value={clientType} onChange={e => setClientType(e.target.value)} placeholder="اختر التصنيف">
                  <option value="موظف">موظف</option>
                  <option value="طالب">طالب</option>
                </Sel>
              </Field>
            </div>
          </div>
        </Section>
      )}

      {/* تفاصيل الرحلة والمركبة */}
      <Section title="تفاصيل الرحلة والمركبة" sub="نظرة عامة على الرحلة"
        icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 5H4m0 0l4 4m-4-4l4-4" /></svg>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="نوع جنس السائق المطلوب (اختياري)">
              <Sel value={driverGender} onChange={e => setDriverGender(e.target.value)} placeholder="اختر الجنس">
                <option value="ذكر">ذكر</option>
                <option value="أنثى">أنثى</option>
              </Sel>
            </Field>
            <Field label="جنسية السائق المقترحة (اختياري)">
              <Sel value={driverNat} onChange={e => setDriverNat(e.target.value)} placeholder="اختر الجنسية">
                <option value="سعودي">سعودي</option>
                <option value="غير سعودي">غير سعودي</option>
              </Sel>
            </Field>
          </div>
          <Field label="حجم السيارة المطلوب">
            <div className="grid grid-cols-3 gap-2">
              {[{ id: "large", label: "كبيرة (7+ ركاب)" }, { id: "medium", label: "متوسطة (5-6 ركاب)" }, { id: "small", label: "صغيرة (4 ركاب)" }].map(c => (
                <button key={c.id} onClick={() => setCarSize(c.id)} className={`py-2.5 rounded-xl text-xs font-medium border transition-all ${carSize === c.id ? "border-[#c9a84c] bg-amber-50 text-[#c9a84c]" : "border-gray-200 bg-white text-gray-600 hover:border-[#c9a84c]"}`}>{c.label}</button>
              ))}
            </div>
          </Field>
          <Field label="السعر المقترح للرحلة">
            <Input placeholder="ادخل السعر" value={price} onChange={handlePriceChange} type="number" min="0" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="طريقة التحويل">
              <Sel value={transferMethod} onChange={(e) => setTransferMethod(e.target.value)}>
                <option value="نقدي">نقدي</option>
                <option value="تحويل بنكي">تحويل بنكي</option>
              </Sel>
            </Field>
            <Field label="عمولتنا (15%)">
              <Input placeholder="تُحسب تلقائياً" value={ourCommission} onChange={handleCommissionChange} type="number" min="0" />
            </Field>
          </div>
          {transferMethod === "تحويل بنكي" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="اسم البنك"><Input value={bankName} onChange={(e) => setBankName(e.target.value)} /></Field>
              <Field label="رقم الحساب"><Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} dir="ltr" /></Field>
            </div>
          )}
          <Field label="ملحوظات الرحلة"><textarea rows="3" placeholder="ادخل اي ملاحظات اضافية" value={notes} onChange={e => setNotes(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none bg-white text-right resize-none placeholder-gray-300" /></Field>
        </div>
      </Section>

      {/* مسؤولو المبيعات */}
      <Section title="مسؤولو المبيعات" sub="اختر السيلز المسؤولين عن هذه الرحلة"
        icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2h5M12 12a4 4 0 100-8 4 4 0 000 8z" /></svg>}>
        <div className="space-y-2">
          {salesList.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">جاري التحميل...</p>
          )}
          {salesList.map(sale => {
            const isSelected = selectedSales.includes(sale.id);
            return (
              <button
                key={sale.id}
                type="button"
                onClick={() => toggleSale(sale.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-right ${isSelected ? "border-[#c9a84c] bg-amber-50" : "border-gray-200 bg-white hover:border-[#c9a84c]"}`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "border-[#c9a84c] bg-[#c9a84c]" : "border-gray-300"}`}>
                  {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <div className="flex-1 px-3 text-right">
                  <p className="text-sm font-medium text-gray-800">{sale.name}</p>
                  <p className="text-xs text-gray-400">{sale.phone}</p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isSelected ? "bg-[#c9a84c] text-white" : "bg-gray-100 text-gray-500"}`}>
                  {sale.name?.charAt(0)}
                </div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* الوسيط */}
      <Section title="الوسيط" sub="اختياري — اختر وسيطاً أو أضف جديداً" allowOverflow
        icon={<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}>
        <Field label="وسيط">
          <BrokerSearchSelect
            brokers={brokers}
            value={brokerId}
            onChange={setBrokerId}
            loading={brokersLoading}
            canAddBroker={canAddBroker}
            onAddBroker={() => setShowAddBroker(true)}
          />
        </Field>
        {!brokersLoading && brokers.length === 0 && (
          <p className="text-[11px] text-gray-400 text-right mt-2">
            لا يوجد وسطاء — ابحثي واكتبي اسمًا وسيظهر زر «إضافة وسيط» لو مفيش نتائج.
          </p>
        )}
      </Section>

      {/* Error message */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 text-right">
          {submitError}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || !canCreate}
        className="w-full bg-[#4a4644] text-white font-bold py-4 rounded-2xl hover:bg-black transition-colors text-sm disabled:opacity-60"
      >
        {submitting ? "جاري الإنشاء..." : "إنشاء رحله"}
      </button>

      {showScheduleException && (
        <ExceptionModal onClose={() => setShowScheduleException(false)} />
      )}

      {/* Map Picker Modal */}
      {mapTarget && (
        <MapPickerModal
          title={mapModalTitle}
          onClose={() => setMapTarget(null)}
          onConfirm={handleMapConfirm}
        />
      )}

      {/* Modals */}
      {showAddPassenger && (
        <AddPassengerModal
          activeDays={activeDays}
          onClose={() => {
            setShowAddPassenger(false);
            setExtraPassengers(p => [...p, p.length + 2]);
          }}
        />
      )}

      <AddClientModal
        isOpen={showAddClient}
        onClose={() => setShowAddClient(false)}
        onSuccess={handleClientAdded}
      />

      <BrokerFormModal
        isOpen={showAddBroker}
        onClose={() => setShowAddBroker(false)}
        brokerData={null}
        onSaved={handleBrokerAdded}
        onToast={(t, m) => toast[t](m)}
      />
    </div>
  );
}
