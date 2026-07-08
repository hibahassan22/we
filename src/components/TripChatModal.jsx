import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Send } from "lucide-react";
import { useToast } from "../lib/toast";
import { useAuth } from "../hooks/useAuth";
import AppModal from "./ui/AppModal";

const API_BASE = "https://drivo1.elmoroj.com/api";

function personName(person) {
  if (!person) return null;
  return [person.name, person.last_name].filter(Boolean).join(" ") || person.name || null;
}

function formatTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

async function fetchTripMessages(tripId) {
  const res = await fetch(`${API_BASE}/trip-chat/${tripId}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`فشل تحميل المحادثة (${res.status})`);
  const data = await res.json();
  return Array.isArray(data.messages) ? data.messages : [];
}

async function sendTripMessage({ tripId, senderId, receiverId, message }) {
  const res = await fetch(`${API_BASE}/trip-chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      trip_id: Number(tripId),
      sender_id: senderId,
      receiver_id: receiverId,
      message: message.trim(),
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `خطأ ${res.status}`);
  return json;
}

/**
 * TripChatModal — محادثة رحلة بين السائق وخدمة العملاء
 *
 * Props:
 *   isOpen    {boolean}
 *   onClose   {Function}
 *   tripId    {string|number}
 *   tripLabel {string?}
 */
export default function TripChatModal({ isOpen, onClose, tripId, tripLabel }) {
  const toast = useToast();
  const { user } = useAuth();
  const bottomRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const myId = user?.uid ?? "";

  const driverMap = useMemo(() => {
    const map = new Map();
    drivers.forEach((d) => {
      map.set(String(d.id), d);
    });
    return map;
  }, [drivers]);

  const loadChatData = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const [msgs, driversRes] = await Promise.all([
        fetchTripMessages(tripId),
        fetch(`${API_BASE}/drivers`, { headers: { Accept: "application/json" } }).then((r) => r.json()),
      ]);

      const driverList = Array.isArray(driversRes) ? driversRes : driversRes.data ?? driversRes.drivers ?? [];

      setMessages(msgs);
      setDrivers(driverList);

      const driverIds = new Set(driverList.map((d) => String(d.id)));
      const involvedDriverIds = new Set();
      msgs.forEach((m) => {
        if (driverIds.has(String(m.sender_id))) involvedDriverIds.add(String(m.sender_id));
        if (driverIds.has(String(m.receiver_id))) involvedDriverIds.add(String(m.receiver_id));
      });

      setSelectedDriverId((prev) => {
        if (prev && (involvedDriverIds.has(prev) || driverIds.has(prev))) return prev;
        const first = [...involvedDriverIds][0] ?? String(driverList[0]?.id ?? "");
        return first;
      });
    } catch (err) {
      toast.error(err.message || "فشل تحميل المحادثة");
    } finally {
      setLoading(false);
    }
  }, [tripId, toast]);

  useEffect(() => {
    if (!isOpen) return;
    setInputText("");
    loadChatData();
  }, [isOpen, loadChatData]);

  useEffect(() => {
    if (!isOpen || !tripId) return undefined;
    const timer = setInterval(() => {
      fetchTripMessages(tripId)
        .then(setMessages)
        .catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, [isOpen, tripId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedDriverId]);

  const isDriverId = useCallback(
    (id) => driverMap.has(String(id)),
    [driverMap]
  );

  const driverOptions = useMemo(() => {
    const driverIds = new Set(drivers.map((d) => String(d.id)));
    const involved = new Set();
    messages.forEach((m) => {
      if (driverIds.has(String(m.sender_id))) involved.add(String(m.sender_id));
      if (driverIds.has(String(m.receiver_id))) involved.add(String(m.receiver_id));
    });

    if (involved.size) {
      return drivers.filter((d) => involved.has(String(d.id)));
    }
    return drivers;
  }, [drivers, messages]);

  const threadMessages = useMemo(() => {
    if (!selectedDriverId) return [];
    const driverId = String(selectedDriverId);

    return messages
      .filter((m) => {
        const sender = String(m.sender_id);
        const receiver = String(m.receiver_id);
        return sender === driverId || receiver === driverId;
      })
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [messages, selectedDriverId]);

  const handleSend = async () => {
    if (!inputText.trim() || !selectedDriverId || !myId) {
      if (!myId) toast.error("يجب تسجيل الدخول لإرسال رسالة");
      return;
    }
    setSending(true);
    try {
      await sendTripMessage({
        tripId,
        senderId: myId,
        receiverId: selectedDriverId,
        message: inputText,
      });
      setInputText("");
      const msgs = await fetchTripMessages(tripId);
      setMessages(msgs);
    } catch (err) {
      toast.error(err.message || "فشل إرسال الرسالة");
    } finally {
      setSending(false);
    }
  };

  const selectedDriver = driverMap.get(String(selectedDriverId));

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={`محادثة الرحلة #${tripId}`}
      subtitle={tripLabel}
      size="lg"
    >
      <div className="flex flex-col h-[520px] -mx-1 overflow-hidden rounded-2xl border border-gray-200" dir="rtl">
        {/* هيدر واتساب */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-[#075e54] text-white">
          <div className="w-10 h-10 rounded-full bg-[#128c7e] flex items-center justify-center text-sm font-bold shrink-0">
            {(personName(selectedDriver) || "؟")[0]}
          </div>
          <div className="flex-1 min-w-0">
            {driverOptions.length > 1 ? (
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full bg-transparent text-sm font-bold outline-none cursor-pointer truncate"
              >
                {driverOptions.map((d) => (
                  <option key={d.id} value={d.id} className="text-gray-900">
                    {personName(d)}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm font-bold truncate">{selectedDriver ? personName(selectedDriver) : "السائق"}</p>
            )}
            <p className="text-[11px] text-white/70 truncate">
              {selectedDriver?.phone || "محادثة الرحلة"}
            </p>
          </div>
        </div>

        {/* منطقة الرسائل — واتساب */}
        <div
          className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5"
          style={{
            backgroundColor: "#e5ddd5",
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8c3bc' fill-opacity='0.18'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        >
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-2 border-[#075e54] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !selectedDriverId ? (
            <p className="text-center text-sm text-gray-500 py-10 bg-white/60 rounded-xl mx-4 px-4 py-3">لا يوجد سائق للمحادثة</p>
          ) : threadMessages.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-10 bg-white/60 rounded-xl mx-4 px-4 py-3">لا توجد رسائل — ابدأ المحادثة</p>
          ) : (
            threadMessages.map((m, i) => {
              const isOutgoing = !isDriverId(m.sender_id);
              const prev = threadMessages[i - 1];
              const showDate = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();

              return (
                <div key={m.id}>
                  {showDate && (
                    <div className="flex justify-center my-3">
                      <span className="text-[11px] text-gray-600 bg-white/90 shadow-sm px-3 py-1 rounded-lg">
                        {new Date(m.created_at).toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "short" })}
                      </span>
                    </div>
                  )}
                  <div className={`flex mb-1 ${isOutgoing ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`relative max-w-[78%] px-3 pt-2 pb-1 shadow-sm text-sm leading-relaxed ${
                        isOutgoing
                          ? "bg-[#d9fdd3] text-gray-900 rounded-2xl rounded-tl-sm"
                          : "bg-white text-gray-900 rounded-2xl rounded-tr-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-right">{m.message}</p>
                      <div className={`flex items-center gap-1 mt-0.5 ${isOutgoing ? "justify-start" : "justify-end"}`}>
                        <span className="text-[10px] text-gray-400">{formatTime(m.created_at)}</span>
                        {isOutgoing && (
                          <svg className="w-3.5 h-3.5 text-[#53bdeb]" viewBox="0 0 16 15" fill="currentColor">
                            <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.063-.51z" />
                            <path d="M0.5 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.156 9.88a.32.32 0 0 1-.484.033L1.01 6.7a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* شريط الإدخال — واتساب */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 bg-[#f0f2f5] border-t border-gray-200">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="اكتب رسالة..."
            disabled={sending || !selectedDriverId}
            className="flex-1 rounded-full border-0 bg-white px-4 py-2.5 text-sm text-right outline-none focus:ring-1 focus:ring-[#075e54]/30 disabled:opacity-50 shadow-sm"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !inputText.trim() || !selectedDriverId}
            className="shrink-0 w-11 h-11 rounded-full bg-[#075e54] text-white flex items-center justify-center hover:bg-[#128c7e] transition-colors disabled:opacity-40 shadow-sm"
          >
            <Send className="w-5 h-5 -scale-x-100" />
          </button>
        </div>
      </div>
    </AppModal>
  );
}
