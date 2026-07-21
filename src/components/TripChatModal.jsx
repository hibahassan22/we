import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Send, Paperclip, MapPin, Mic, Square, Link2, UserPlus, Pencil, Copy, Check } from "lucide-react";
import { useToast } from "../lib/toast";
import { useAuth } from "../hooks/useAuth";
import AppModal, { ModalField, modalInputClass } from "./ui/AppModal";
import ChatMediaImage from "./ui/ChatMediaImage.jsx";
import AssignTripModal from "./AssignTripModal";
import EditOfferedTripModal from "./EditOfferedTripModal";
import {
  fetchTripChatMessages,
  sendTripChatMessage,
  tripChatDisplayText,
  tripMessageImages,
  tripMessageAudios,
} from "../services/tripChatService.js";
import {
  parseLocationMessage,
  isMessageRead,
  fetchAllDrivers,
  getDriverChatUserId,
} from "../services/driverSaleChatService.js";
import { createTripPaymentLink } from "../services/paymentLinkService.js";

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

function formatDuration(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function previewText(message) {
  const location = parseLocationMessage(message);
  if (location) return "📍 موقع";
  const text = tripChatDisplayText(message);
  if (text) return text;
  if (/تسجيل صوت/i.test(String(message ?? ""))) return "🎤 تسجيل صوت";
  if (/صورة/i.test(String(message ?? ""))) return "📷 صورة";
  return "رسالة";
}

/**
 * TripChatModal — محادثة رحلة: قائمة سائقين + شات + أزرار إجراءات
 */
export default function TripChatModal({ isOpen, onClose, tripId, tripLabel, trip = null, onTripUpdated }) {
  const toast = useToast();
  const { user } = useAuth();
  const bottomRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const stickToBottomRef = useRef(true);

  const [messages, setMessages] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [localTrip, setLocalTrip] = useState(trip);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordTimerRef = useRef(null);
  const recordStreamRef = useRef(null);

  const myId = user?.uid ?? "";

  useEffect(() => {
    if (isOpen) setLocalTrip(trip);
  }, [isOpen, trip]);

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
      const [msgs, driverList] = await Promise.all([
        fetchTripChatMessages(tripId),
        fetchAllDrivers(),
      ]);

      setMessages(msgs);
      setDrivers(driverList);

      const driverIds = new Set(driverList.map((d) => String(d.id)));
      const involvedDriverIds = new Set();
      msgs.forEach((m) => {
        if (driverIds.has(String(m.sender_id))) involvedDriverIds.add(String(m.sender_id));
        if (driverIds.has(String(m.receiver_id))) involvedDriverIds.add(String(m.receiver_id));
      });

      const tripDriverId = trip?.driver_id ?? trip?.driver?.id;
      if (tripDriverId && driverIds.has(String(tripDriverId))) {
        involvedDriverIds.add(String(tripDriverId));
      }

      setSelectedDriverId((prev) => {
        if (prev && involvedDriverIds.has(prev)) return prev;
        return [...involvedDriverIds][0] ?? "";
      });
    } catch (err) {
      toast.error(err.message || "فشل تحميل المحادثة");
    } finally {
      setLoading(false);
    }
  }, [tripId, trip, toast]);

  useEffect(() => {
    if (!isOpen) return;
    setInputText("");
    setAttachments([]);
    setAssignOpen(false);
    setEditOpen(false);
    setPaymentOpen(false);
    setPaymentLink("");
    setLinkCopied(false);
    stickToBottomRef.current = true;
    loadChatData();
  }, [isOpen, loadChatData]);

  useEffect(() => {
    if (isOpen) return undefined;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    recordStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    setRecording(false);
    setRecordSecs(0);
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !tripId) return undefined;
    const timer = setInterval(() => {
      fetchTripChatMessages(tripId)
        .then(setMessages)
        .catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, [isOpen, tripId]);

  const scrollMessagesToBottom = useCallback((force = false) => {
    const el = messagesScrollRef.current;
    if (!el) return;
    if (!force && !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const handleMessagesScroll = () => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 80;
  };

  useEffect(() => {
    stickToBottomRef.current = true;
    scrollMessagesToBottom(true);
  }, [selectedDriverId, scrollMessagesToBottom]);

  useEffect(() => {
    scrollMessagesToBottom(false);
  }, [messages, scrollMessagesToBottom]);

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

    const tripDriverId = localTrip?.driver_id ?? localTrip?.driver?.id ?? trip?.driver_id ?? trip?.driver?.id;
    if (tripDriverId && driverIds.has(String(tripDriverId))) {
      involved.add(String(tripDriverId));
    }

    return drivers.filter((d) => involved.has(String(d.id)));
  }, [drivers, messages, localTrip, trip]);

  const driverLastMessage = useMemo(() => {
    const map = new Map();
    messages.forEach((m) => {
      const sender = String(m.sender_id);
      const receiver = String(m.receiver_id);
      const touch = (id) => {
        if (!driverMap.has(id)) return;
        const prev = map.get(id);
        if (!prev || new Date(m.created_at) > new Date(prev.created_at)) {
          map.set(id, m);
        }
      };
      touch(sender);
      touch(receiver);
    });
    return map;
  }, [messages, driverMap]);

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

  const handlePickFiles = (e) => {
    const files = Array.from(e.target.files || []).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("audio/"),
    );
    if (files.length) setAttachments((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const stopRecordingCleanup = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    recordStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    recordStreamRef.current = null;
    mediaRecorderRef.current = null;
    setRecording(false);
    setRecordSecs(0);
  };

  const pickAudioMimeType = () => {
    if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return "";
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
      "audio/ogg",
      "audio/aac",
      "audio/mpeg",
    ];
    return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";
  };

  const deliverMessage = useCallback(async ({ text = "", files = [] }) => {
    const driver = driverMap.get(String(selectedDriverId));
    const uploadReceiverId = getDriverChatUserId(driver) || selectedDriverId;
    await sendTripChatMessage({
      tripId,
      senderId: myId,
      receiverId: selectedDriverId,
      uploadReceiverId,
      message: text,
      attachments: files,
    });
    const msgs = await fetchTripChatMessages(tripId);
    setMessages(msgs);
  }, [tripId, myId, selectedDriverId, driverMap]);

  const startRecording = async () => {
    if (recording || sending) return;
    if (!selectedDriverId) {
      toast.error("اختاري سائقًا أولًا قبل التسجيل");
      return;
    }

    if (!window.isSecureContext) {
      toast.error("التسجيل يحتاج فتح الموقع على HTTPS");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("المتصفح لا يدعم الوصول للميكروفون");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      toast.error("التسجيل الصوتي غير مدعوم في هذا المتصفح");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      recordStreamRef.current = stream;
      recordChunksRef.current = [];

      const mimeType = pickAudioMimeType();
      let recorder;
      try {
        recorder = mimeType
          ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 12000 })
          : new MediaRecorder(stream, { audioBitsPerSecond: 12000 });
      } catch {
        try {
          recorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);
        } catch {
          recorder = new MediaRecorder(stream);
        }
      }
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordChunksRef.current.push(e.data);
      };

      recorder.onerror = () => {
        stopRecordingCleanup();
        toast.error("توقف التسجيل بسبب خطأ في الميكروفون");
      };

      recorder.onstop = () => {
        const chunks = [...recordChunksRef.current];
        const blobType = (recorder.mimeType || mimeType || "audio/webm").split(";")[0];
        stopRecordingCleanup();
        if (!chunks.length) {
          toast.error("التسجيل فارغ — جرّبي مرة أخرى");
          return;
        }
        const ext = blobType.includes("mp4") || blobType.includes("aac") || blobType.includes("mpeg")
          ? "m4a"
          : blobType.includes("ogg")
            ? "ogg"
            : "webm";
        const file = new File(chunks, `voice-${Date.now()}.${ext}`, {
          type: blobType || "audio/webm",
        });
        // إرسال فوري زي واتساب
        (async () => {
          if (!selectedDriverId || !myId) {
            setAttachments((prev) => [...prev, file]);
            return;
          }
          setSending(true);
          stickToBottomRef.current = true;
          try {
            await deliverMessage({ text: "", files: [file] });
            requestAnimationFrame(() => scrollMessagesToBottom(true));
          } catch (err) {
            setAttachments((prev) => [...prev, file]);
            toast.error(err.message || "فشل إرسال التسجيل");
          } finally {
            setSending(false);
          }
        })();
      };

      try {
        recorder.start(200);
      } catch {
        recorder.start();
      }

      setRecording(true);
      setRecordSecs(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSecs((s) => {
          const next = s + 1;
          // السيرفر مش بيقبل رفع صوت — التسجيل بيتبعت جوّه الرسالة بحد أقصى قصير
          if (next >= 20) {
            const rec = mediaRecorderRef.current;
            if (rec && rec.state === "recording") {
              try {
                rec.requestData?.();
                rec.stop();
              } catch { /* ignore */ }
              toast.info("تم إيقاف التسجيل تلقائيًا (الحد الأقصى ٢٠ ثانية)");
            }
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      stopRecordingCleanup();
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        toast.error("اسمحي بالوصول للميكروفون من إعدادات المتصفح");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        toast.error("لا يوجد ميكروفون متصل بالجهاز");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        toast.error("الميكروفون مستخدم من تطبيق آخر");
      } else if (name === "SecurityError") {
        toast.error("المتصفح منع الوصول للميكروفون (يلزم HTTPS)");
      } else {
        toast.error(err?.message ? `تعذر التسجيل: ${err.message}` : "تعذر بدء التسجيل");
      }
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        if (recorder.state === "recording") recorder.requestData?.();
        recorder.stop();
      } catch {
        stopRecordingCleanup();
      }
    } else {
      stopRecordingCleanup();
    }
  };

  const handleSend = async () => {
    if ((!inputText.trim() && attachments.length === 0) || !selectedDriverId || !myId) {
      if (!myId) toast.error("يجب تسجيل الدخول لإرسال رسالة");
      return;
    }
    setSending(true);
    stickToBottomRef.current = true;
    try {
      await deliverMessage({ text: inputText, files: attachments });
      setInputText("");
      setAttachments([]);
      requestAnimationFrame(() => scrollMessagesToBottom(true));
    } catch (err) {
      toast.error(err.message || "فشل إرسال الرسالة");
    } finally {
      setSending(false);
    }
  };

  const handleSendLocation = () => {
    if (!selectedDriverId || !myId) {
      if (!myId) toast.error("يجب تسجيل الدخول لإرسال رسالة");
      return;
    }
    if (!navigator.geolocation) {
      toast.error("خدمة الموقع غير مدعومة في المتصفح");
      return;
    }
    setSendingLocation(true);
    stickToBottomRef.current = true;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
          await deliverMessage({ text: `📍 الموقع: ${url}` });
          requestAnimationFrame(() => scrollMessagesToBottom(true));
        } catch (err) {
          toast.error(err.message || "فشل إرسال الموقع");
        } finally {
          setSendingLocation(false);
        }
      },
      (err) => {
        setSendingLocation(false);
        toast.error(err.code === err.PERMISSION_DENIED ? "تم رفض إذن الوصول للموقع" : "تعذر تحديد الموقع");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const openPaymentModal = () => {
    const remaining =
      localTrip?.remaining_amount ??
      trip?.remaining_amount ??
      localTrip?.total_price ??
      trip?.total_price ??
      localTrip?.price ??
      trip?.price ??
      "";
    setPaymentAmount(remaining !== "" && remaining != null ? String(remaining) : "");
    setPaymentLink("");
    setLinkCopied(false);
    setPaymentOpen(true);
  };

  const handleCreatePaymentLink = async () => {
    setPaymentLoading(true);
    setLinkCopied(false);
    try {
      const { link } = await createTripPaymentLink(tripId, {
        amount: paymentAmount,
        driverId: selectedDriverId || undefined,
      });
      setPaymentLink(link);
      toast.success("تم إنشاء رابط الدفع");
    } catch (err) {
      toast.error(err.message || "فشل إنشاء رابط الدفع");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!paymentLink) return;
    try {
      await navigator.clipboard.writeText(paymentLink);
      setLinkCopied(true);
      toast.success("تم نسخ الرابط");
    } catch {
      toast.error("تعذر نسخ الرابط");
    }
  };

  const handleSendLinkInChat = async () => {
    if (!paymentLink || !selectedDriverId || !myId) {
      if (!selectedDriverId) toast.error("اختاري سائقًا لإرسال الرابط");
      return;
    }
    setSending(true);
    try {
      await deliverMessage({ text: `رابط الدفع: ${paymentLink}` });
      toast.success("تم إرسال الرابط في الشات");
      setPaymentOpen(false);
    } catch (err) {
      toast.error(err.message || "فشل إرسال الرابط");
    } finally {
      setSending(false);
    }
  };

  const selectedDriver = driverMap.get(String(selectedDriverId));
  const editTrip = localTrip || trip;

  return (
    <>
      <AppModal
        isOpen={isOpen}
        onClose={onClose}
        title={`محادثة الرحلة #${tripId}`}
        subtitle={tripLabel}
        size="2xl"
        bodyScroll={false}
      >
        <div className="flex flex-col h-[min(70vh,620px)] -mx-1 overflow-hidden rounded-2xl border border-gray-200" dir="rtl">
          {/* أزرار الإجراءات */}
          <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2.5 bg-white border-b border-gray-200">
            <button
              type="button"
              onClick={openPaymentModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c9a84c] text-white text-xs font-bold hover:bg-[#b8973f] transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              إنشاء رابط دفع
            </button>
            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4a4746] text-white text-xs font-bold hover:bg-black transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              إسناد الرحلة
            </button>
            <button
              type="button"
              onClick={() => {
                if (!editTrip) {
                  toast.error("بيانات الرحلة غير متوفرة للتعديل");
                  return;
                }
                setEditOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              تعديل الرحلة
            </button>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* قائمة السائقين */}
            <aside className="w-[210px] sm:w-[240px] shrink-0 border-l border-gray-200 bg-[#f0f2f5] flex flex-col">
              <div className="px-3 py-2.5 border-b border-gray-200 bg-white">
                <p className="text-xs font-bold text-gray-700">السائقون على الرحلة</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{driverOptions.length} سائق</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading && driverOptions.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#075e54] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : driverOptions.length === 0 ? (
                  <p className="text-center text-xs text-gray-500 px-3 py-8 leading-relaxed">
                    لا يوجد سائقون راسلوا هذه الرحلة بعد
                  </p>
                ) : (
                  driverOptions.map((d) => {
                    const id = String(d.id);
                    const active = id === String(selectedDriverId);
                    const last = driverLastMessage.get(id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDriverId(id)}
                        className={`w-full text-right px-3 py-3 border-b border-gray-200/80 transition-colors ${
                          active ? "bg-white border-r-2 border-r-[#075e54]" : "hover:bg-white/70"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            active ? "bg-[#075e54] text-white" : "bg-[#128c7e]/20 text-[#075e54]"
                          }`}>
                            {(personName(d) || "؟")[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-800 truncate">{personName(d) || "سائق"}</p>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                              {last ? previewText(last.message) : (d.phone || "بدون رسائل")}
                            </p>
                          </div>
                          {last?.created_at && (
                            <span className="text-[10px] text-gray-400 shrink-0 self-start mt-0.5">
                              {formatTime(last.created_at)}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* منطقة الشات */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-[#075e54] text-white">
                <div className="w-10 h-10 rounded-full bg-[#128c7e] flex items-center justify-center text-sm font-bold shrink-0">
                  {(personName(selectedDriver) || "؟")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">
                    {selectedDriver ? personName(selectedDriver) : "اختاري سائقًا من القائمة"}
                  </p>
                  <p className="text-[11px] text-white/70 truncate">
                    {selectedDriver?.phone || "محادثة الرحلة"}
                  </p>
                </div>
              </div>

              <div
                ref={messagesScrollRef}
                onScroll={handleMessagesScroll}
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
                  <p className="text-center text-sm text-gray-500 py-10 bg-white/60 rounded-xl mx-4 px-4">
                    اختاري سائقًا من القائمة الجانبية لعرض المحادثة
                  </p>
                ) : threadMessages.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-10 bg-white/60 rounded-xl mx-4 px-4">
                    لا توجد رسائل — ابدأ المحادثة
                  </p>
                ) : (
                  threadMessages.map((m, i) => {
                    const isOutgoing = !isDriverId(m.sender_id);
                    const prev = threadMessages[i - 1];
                    const showDate = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
                    const images = tripMessageImages(m);
                    const audios = tripMessageAudios(m);
                    const displayText = tripChatDisplayText(m.message);
                    const location = parseLocationMessage(m.message);
                    const read = isMessageRead(m);

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
                            {location ? (
                              <a
                                href={location.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 font-semibold text-[#075e54]"
                              >
                                <MapPin className="w-4 h-4 shrink-0" />
                                عرض الموقع على الخريطة
                              </a>
                            ) : (
                              displayText && <p className="whitespace-pre-wrap break-words text-right">{displayText}</p>
                            )}
                            {images.length > 0 && (
                              <div className={`grid gap-1.5 ${images.length > 1 ? "grid-cols-2" : "grid-cols-1"} ${displayText && !location ? "mt-1.5" : ""}`}>
                                {images.map((url, idx) => (
                                  <a
                                    key={idx}
                                    href={url.startsWith("data:") ? undefined : url}
                                    target={url.startsWith("data:") ? undefined : "_blank"}
                                    rel="noreferrer"
                                    className="block"
                                    onClick={url.startsWith("data:") ? (e) => e.preventDefault() : undefined}
                                  >
                                    <ChatMediaImage src={url} className="w-full max-h-44 object-cover rounded-lg border border-black/10" />
                                  </a>
                                ))}
                              </div>
                            )}
                            {audios.length > 0 && (
                              <div className={`space-y-2 ${(displayText || images.length) && !location ? "mt-1.5" : ""}`}>
                                {audios.map((url, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 rounded-xl bg-black/5 px-2.5 py-2 min-w-[200px]"
                                  >
                                    <span className="shrink-0 w-8 h-8 rounded-full bg-[#075e54] text-white flex items-center justify-center">
                                      <Mic className="w-4 h-4" />
                                    </span>
                                    <audio controls preload="metadata" className="flex-1 h-9 min-w-0">
                                      <source src={url} />
                                    </audio>
                                  </div>
                                ))}
                              </div>
                            )}
                            {!displayText && !location && images.length === 0 && audios.length === 0 && (
                              /تسجيل صوت/i.test(String(m.message ?? "")) ? (
                                <div className="flex items-center gap-2 rounded-xl bg-black/5 px-2.5 py-2 min-w-[180px]">
                                  <span className="shrink-0 w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center">
                                    <Mic className="w-4 h-4" />
                                  </span>
                                  <span className="text-xs text-gray-500">تسجيل صوت غير متاح</span>
                                </div>
                              ) : /صورة/i.test(String(m.message ?? "")) ? (
                                <p className="text-xs text-gray-400 text-right">صورة غير متاحة</p>
                              ) : null
                            )}
                            <div className={`flex items-center gap-1 mt-0.5 ${isOutgoing ? "justify-start" : "justify-end"}`}>
                              <span className="text-[10px] text-gray-400">{formatTime(m.created_at)}</span>
                              {isOutgoing && (
                                read ? (
                                  <svg className="w-3.5 h-3.5 text-[#53bdeb]" viewBox="0 0 16 15" fill="currentColor" title="تمت القراءة">
                                    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.063-.51z" />
                                    <path d="M0.5 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.156 9.88a.32.32 0 0 1-.484.033L1.01 6.7a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185a.32.32 0 0 0 .484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 16 15" fill="currentColor" title="تم الإرسال">
                                    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.033l-.358-.325a.32.32 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266a.32.32 0 0 0 .484-.034l6.272-8.048a.366.366 0 0 0-.063-.51z" />
                                  </svg>
                                )
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

              <div className="shrink-0 bg-[#f0f2f5] border-t border-gray-200 px-3 py-2.5">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-300 bg-white">
                        {file.type.startsWith("audio/") ? (
                          <div className="flex items-center gap-2 px-2 py-1.5 min-w-[160px]">
                            <Mic className="w-4 h-4 text-[#075e54] shrink-0" />
                            <audio controls preload="metadata" className="h-8 max-w-[140px]">
                              <source src={URL.createObjectURL(file)} type={file.type} />
                            </audio>
                          </div>
                        ) : (
                          <div className="w-14 h-14">
                            <img src={URL.createObjectURL(file)} alt="مرفق" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {recording && (
                  <div className="flex items-center justify-between gap-3 mb-2 px-2 py-1.5 rounded-xl bg-red-50 border border-red-100">
                    <div className="flex items-center gap-2 text-red-600 text-sm font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      جاري التسجيل… {formatDuration(recordSecs)}
                    </div>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      إيقاف
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,audio/*"
                    multiple
                    onChange={handlePickFiles}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || recording || !selectedDriverId}
                    title="إرفاق صورة أو صوت"
                    className="shrink-0 w-10 h-10 rounded-full text-gray-500 hover:text-[#075e54] hover:bg-white flex items-center justify-center transition-colors disabled:opacity-40"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={recording ? stopRecording : startRecording}
                    disabled={sending || !selectedDriverId}
                    title={recording ? "إيقاف التسجيل" : "تسجيل صوت"}
                    className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 ${
                      recording
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "text-gray-500 hover:text-[#075e54] hover:bg-white"
                    }`}
                  >
                    {recording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendLocation}
                    disabled={sending || sendingLocation || recording || !selectedDriverId}
                    title="إرسال الموقع الحالي"
                    className="shrink-0 w-10 h-10 rounded-full text-gray-500 hover:text-[#075e54] hover:bg-white flex items-center justify-center transition-colors disabled:opacity-40"
                  >
                    {sendingLocation ? (
                      <div className="w-4 h-4 border-2 border-[#075e54] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <MapPin className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder={selectedDriverId ? "اكتب رسالة..." : "اختاري سائقًا أولًا..."}
                    disabled={sending || recording || !selectedDriverId}
                    className="flex-1 rounded-full border-0 bg-white px-4 py-2.5 text-sm text-right outline-none focus:ring-1 focus:ring-[#075e54]/30 disabled:opacity-50 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || recording || (!inputText.trim() && attachments.length === 0) || !selectedDriverId}
                    className="shrink-0 w-11 h-11 rounded-full bg-[#075e54] text-white flex items-center justify-center hover:bg-[#128c7e] transition-colors disabled:opacity-40 shadow-sm"
                  >
                    <Send className="w-5 h-5 -scale-x-100" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppModal>

      <AssignTripModal
        isOpen={assignOpen}
        tripId={tripId}
        tripTotalPrice={localTrip?.total_price ?? localTrip?.price ?? trip?.total_price ?? trip?.price ?? ""}
        onClose={() => setAssignOpen(false)}
        zIndex={10050}
        onSuccess={(result) => {
          const driverId = result?.driver_id ?? result?.data?.driver_id;
          const driver = result?.driver ?? result?.data?.driver;
          setAssignOpen(false);
          setLocalTrip((prev) => ({
            ...(prev || trip || { id: tripId }),
            driver_id: driverId ?? driver?.id ?? prev?.driver_id,
            driver: driver ?? (driverId ? { id: driverId } : prev?.driver),
          }));
          if (driverId) setSelectedDriverId(String(driverId));
          onTripUpdated?.(result);
          loadChatData();
        }}
      />

      {editTrip && (
        <EditOfferedTripModal
          isOpen={editOpen}
          trip={editTrip}
          onClose={() => setEditOpen(false)}
          zIndex={10050}
          onSuccess={(result) => {
            const updated = result?.trip ?? result;
            setEditOpen(false);
            if (updated) {
              setLocalTrip((prev) => ({ ...(prev || {}), ...updated }));
            }
            onTripUpdated?.(result);
          }}
        />
      )}

      <AppModal
        isOpen={paymentOpen}
        onClose={() => !paymentLoading && setPaymentOpen(false)}
        title="إنشاء رابط دفع"
        subtitle={tripLabel ? `الرحلة #${tripId} — ${tripLabel}` : `الرحلة #${tripId}`}
        size="sm"
        zIndex={10050}
        isSubmitting={paymentLoading}
      >
        <div className="space-y-4" dir="rtl">
          <ModalField label="المبلغ" hint="اختياري — يُرسل للبوابة إن وُجد">
            <input
              type="number"
              min="0"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className={modalInputClass}
              placeholder="مثال: 500"
              disabled={paymentLoading || Boolean(paymentLink)}
            />
          </ModalField>

          {!paymentLink ? (
            <button
              type="button"
              onClick={handleCreatePaymentLink}
              disabled={paymentLoading}
              className="w-full py-3 rounded-xl bg-[#c9a84c] text-white text-sm font-bold hover:bg-[#b8973f] transition-colors disabled:opacity-60"
            >
              {paymentLoading ? "جاري الإنشاء..." : "إنشاء الرابط"}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-[10px] text-gray-400 mb-1">رابط الدفع</p>
                <p className="text-xs text-gray-800 break-all leading-relaxed">{paymentLink}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                >
                  {linkCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {linkCopied ? "تم النسخ" : "نسخ"}
                </button>
                <button
                  type="button"
                  onClick={handleSendLinkInChat}
                  disabled={sending || !selectedDriverId}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#075e54] text-white text-sm font-semibold hover:bg-[#128c7e] disabled:opacity-50"
                >
                  <Send className="w-4 h-4 -scale-x-100" />
                  إرسال في الشات
                </button>
              </div>
            </div>
          )}
        </div>
      </AppModal>
    </>
  );
}
