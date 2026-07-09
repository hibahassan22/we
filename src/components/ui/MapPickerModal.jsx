import { useState, useEffect, useRef } from "react";
import AppModal, { modalInputClass } from "./AppModal";

export function MapPointButton({ label, hasCoords, onClick, placeholder = "اختر من الخريطة" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2.5 text-sm text-right flex items-center justify-between transition-colors ${
        hasCoords ? "border-[#c9a84c] bg-amber-50 text-gray-800" : "border-gray-200 bg-white text-gray-400 hover:border-[#c9a84c]"
      }`}
    >
      <svg className="w-4 h-4 text-[#c9a84c] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      </svg>
      <span className="flex-1 text-right mr-2 truncate text-xs">
        {hasCoords ? `${label} (${hasCoords.lat?.toFixed(4)}, ${hasCoords.lng?.toFixed(4)})` : (label || placeholder)}
      </span>
    </button>
  );
}

export default function MapPickerModal({ title, onClose, onConfirm }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (window.L) {
      setReady(true);
      return;
    }
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
    setTimeout(() => map.invalidateSize(), 100);
  }, [ready]);

  useEffect(() => () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
  }, []);

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
    } catch {
      /* ignore geocode errors */
    }
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
            type="button"
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
          type="button"
          onClick={handleSearch}
          className="px-3 py-2 bg-[#c9a84c] text-white text-xs rounded-xl hover:bg-[#b8973d] transition-colors shrink-0"
        >
          بحث
        </button>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
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
