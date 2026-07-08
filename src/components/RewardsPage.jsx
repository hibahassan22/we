"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { filterByGlobalSearch } from "../lib/searchUtils";
import { usePermissions } from "../hooks/usePermissions.js";
import { PERMISSIONS } from "../lib/permissions.js";
import AppModal, { ModalField, modalInputClass, ConfirmModal } from "./ui/AppModal";
import { useToast } from "../lib/toast.jsx";
import { fetchRewardSettings, updateRewardSettings } from "../services/rewardService.js";
import { isEqual } from "lodash";

const BASE = "https://drivo1.elmoroj.com/api";

const Toggle = ({ checked, onChange, disabled }) => (
  <button onClick={() => onChange(!checked)}
    disabled={disabled}
    className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${checked ? "bg-[#9d7821]" : "bg-gray-300"} disabled:opacity-50`}>
    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${checked ? "left-1" : "right-1"}`} />
  </button>
);

const SectionCard = ({ icon, iconBg, title, subtitle, children }) => (
  <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 space-y-5">
    <div className="flex items-center gap-3">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="text-right">
        <h3 className="text-[15px] font-bold text-gray-800">{title}</h3>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </div>
    </div>
    <div className="space-y-4 pt-1">{children}</div>
  </div>
);

const typeColor = {
  "نقدي": "bg-green-50 border border-green-200 text-green-600",
  "نقاط": "bg-amber-50 border border-amber-200 text-amber-600",
  "خصم":  "bg-purple-50 border border-purple-200 text-purple-600"
};

// ── PromoCodeModal — state داخلي عشان ميحصلش remount ──
const PromoCodeModal = ({ isOpen, editingId, initialData, onClose, onSaved }) => {
  const [code, setCode]           = useState("");
  const [rewardType, setRewardType] = useState("cash");
  const [rewardValue, setRewardValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [maxUsage, setMaxUsage]   = useState("");
  const [saving, setSaving]       = useState(false);
  const [success, setSuccess]     = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSuccess(false);
    if (initialData) {
      setCode(initialData.code || "");
      setRewardType(initialData.reward_type || "cash");
      setRewardValue(String(initialData.reward_value || ""));
      setStartDate(initialData.start_date || "");
      setEndDate(initialData.end_date || "");
      setMaxUsage(String(initialData.max_total_usage || ""));
    } else {
      setCode(""); setRewardType("cash"); setRewardValue("");
      setStartDate(""); setEndDate(""); setMaxUsage("");
    }
  }, [isOpen, editingId]);

  const inp = modalInputClass;

  const handleSave = async () => {
    if (!code || !rewardValue) return;
    setSaving(true);
    const payload = {
      code, reward_type: rewardType,
      reward_value: parseFloat(rewardValue) || 0,
      start_date: startDate, end_date: endDate,
      max_total_usage: parseInt(maxUsage) || 0,
      is_active: 1,
    };
    try {
      const url = editingId ? `${BASE}/promo-codes/${editingId}` : `${BASE}/promo-codes`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok || res.status < 500) {
        setSuccess(true);
        onSaved();
        setTimeout(() => { setSuccess(false); onClose(); }, 700);
      }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "تعديل الكود" : "إضافة كود جديد"}
      isSubmitting={saving}
      size="xl"
      footer={
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="border border-gray-200 text-gray-600 text-xs px-6 py-2.5 rounded-lg hover:bg-gray-50 font-bold">إلغاء</button>
          <button onClick={handleSave} disabled={saving||success}
            className={`text-white text-xs px-8 py-2.5 rounded-lg font-bold shadow-sm transition-colors ${success?"bg-green-600":"bg-[#c9a84c] hover:bg-[#b8943f] disabled:opacity-60"}`}>
            {success?"✓ تم الحفظ":saving?"جارٍ الحفظ...":editingId?"حفظ التعديلات":"إضافة كود"}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <ModalField label="الكود"><input value={code} onChange={e=>setCode(e.target.value)} className={inp} placeholder="PROMO123" dir="ltr" disabled={saving}/></ModalField>
        <ModalField label="النوع">
          <select value={rewardType} onChange={e=>setRewardType(e.target.value)} className={inp+" text-right appearance-none"} disabled={saving}>
            <option value="cash">نقدي</option><option value="points">نقاط</option><option value="discount">خصم</option>
          </select>
        </ModalField>
        <ModalField label="القيمة"><input value={rewardValue} onChange={e=>setRewardValue(e.target.value)} className={inp+" text-right"} placeholder="50" disabled={saving}/></ModalField>
        <ModalField label="حد الاستخدام"><input value={maxUsage} onChange={e=>setMaxUsage(e.target.value)} className={inp+" text-right"} placeholder="1000" disabled={saving}/></ModalField>
        <ModalField label="تاريخ البداية"><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className={inp} disabled={saving}/></ModalField>
        <ModalField label="تاريخ الانتهاء"><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className={inp} disabled={saving}/></ModalField>
      </div>
    </AppModal>
  );
};

const settingsToForm = (data) => ({
  app_download_enabled: !!data.app_download_enabled,
  app_download_reward: parseFloat(data.app_download_reward) || 0,
  invite_enabled: !!data.invite_enabled,
  invite_required_count: parseInt(data.invite_required_count) || 0,
  invite_reward_amount: parseFloat(data.invite_reward_amount) || 0,
  points_enabled: !!data.points_enabled,
  points_per_amount: parseFloat(data.points_per_amount) || 0,
  points_value: parseInt(data.points_value) || 0,
  point_money_value: parseFloat(data.point_money_value) || 0,
  points_min_convert: parseInt(data.points_min_convert) || 0,
  points_expiration_days: parseInt(data.points_expiration_days) || 0,
});

export default function RewardsPage() {
  const [initialSettings, setInitialSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [codes, setCodes] = useState([]);
  const [showAddCode, setShowAddCode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editInitial, setEditInitial] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open:false, id:null, code:"" });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { searchQuery } = useGlobalSearch();
  const { can } = usePermissions();
  const canViewSettings = can(PERMISSIONS.REWARDS_SETTINGS_READ);
  const canCreateCode = can(PERMISSIONS.REWARDS_CODE_CREATE);
  const canEditCode = can(PERMISSIONS.REWARDS_CODE_EDIT);
  const canDeleteCode = can(PERMISSIONS.REWARDS_CODE_DELETE);
  const canViewCodes = canViewSettings || canCreateCode || canEditCode || canDeleteCode || can(PERMISSIONS.REWARDS_CODE_TOGGLE);

  const isDirty = useMemo(() => {
    if (!initialSettings || !form) return false;
    return !isEqual(initialSettings, form);
  }, [initialSettings, form]);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchRewardSettings();
      const newFormState = settingsToForm(data);
      setForm(newFormState);
      setInitialSettings(newFormState);
    } catch (error) {
      toast.error(error.message || "Failed to load reward settings.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSettings();
    fetchCodes();
  }, [loadSettings]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleFieldChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const {
      app_download_enabled, app_download_reward,
      invite_enabled, invite_required_count, invite_reward_amount,
      points_enabled, points_per_amount, points_value,
      points_min_convert, points_expiration_days
    } = form;

    if (app_download_enabled && app_download_reward < 0) {
      toast.error("App download reward cannot be negative.");
      return false;
    }
    if (invite_enabled) {
      if (invite_reward_amount < 0) {
        toast.error("Invite reward cannot be negative.");
        return false;
      }
      if (invite_required_count <= 0) {
        toast.error("Required invite count must be greater than 0.");
        return false;
      }
    }
    if (points_enabled) {
      if (points_per_amount <= 0) {
        toast.error("Points Per Amount must be greater than 0.");
        return false;
      }
      if (points_value <= 0) {
        toast.error("Point Value must be greater than 0.");
        return false;
      }
      if (points_min_convert <= 0) {
        toast.error("Minimum Conversion Points must be greater than 0.");
        return false;
      }
      if (points_expiration_days <= 0) {
        toast.error("Expiration Days must be greater than 0.");
        return false;
      }
    }
    return true;
  }

  const saveSettings = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        app_download_enabled: form.app_download_enabled ? 1 : 0,
        invite_enabled: form.invite_enabled ? 1 : 0,
        points_enabled: form.points_enabled ? 1 : 0,
      }
      const data = await updateRewardSettings(payload);
      const newFormState = settingsToForm(data);
      setForm(newFormState);
      setInitialSettings(newFormState);
      toast.success("Reward settings updated successfully.");
    } catch (error) {
      toast.error(error.message || "Failed to update settings.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  }

  const filteredCodes = useMemo(
    () => filterByGlobalSearch(codes, searchQuery, (c) => [c.code, c.type, c.value, c.status]),
    [codes, searchQuery]
  );

  async function fetchCodes() {
    try {
      const res = await fetch(`${BASE}/promo-codes`);
      const data = await res.json();
      if (data?.data) {
        setCodes(data.data.map(item => ({
          id: item.id,
          code: item.code,
          type: item.reward_type === 'cash' ? 'نقدي' : item.reward_type === 'points' ? 'نقاط' : 'خصم',
          value: item.reward_value ? String(item.reward_value) : '',
          start: item.start_date, end: item.end_date,
          limit: item.max_total_usage ?? 0,
          currentUsed: item.current_used || 0,
          totalLimit: item.max_total_usage || 1000,
          status: item.is_active ? 'مفعل' : 'متوقف',
          raw: item,
        })));
      }
    } catch (e) { console.error(e); }
  }

  function openAdd() {
    setEditingId(null);
    setEditInitial(null);
    setShowAddCode(true);
  }

  function openEdit(c) {
    setEditingId(c.id);
    setEditInitial({
      code: c.code,
      reward_type: c.raw?.reward_type || "cash",
      reward_value: c.raw?.reward_value || c.value || "",
      start_date: c.raw?.start_date || c.start || "",
      end_date: c.raw?.end_date || c.end || "",
      max_total_usage: c.raw?.max_total_usage || c.limit || "",
    });
    setShowAddCode(true);
  }

  function closeModal() {
    setShowAddCode(false);
    setEditingId(null);
    setEditInitial(null);
  }

  async function confirmDeleteCode() {
    setDeleteLoading(true);
    try {
      await fetch(`${BASE}/promo-codes/${deleteConfirm.id}`, { method:"DELETE" });
      fetchCodes();
    } catch (e) { console.error(e); }
    setDeleteLoading(false);
    setDeleteConfirm({ open:false, id:null, code:"" });
  }

  const inp = "w-full text-right border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#c9a84c] transition-colors disabled:bg-gray-100";

  if (isLoading) {
      return (
          <div className="w-full min-h-screen p-6 font-sans" dir="rtl">
              <div className="w-full space-y-5 animate-pulse">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-24"></div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-48"></div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-64"></div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-80"></div>
              </div>
          </div>
      )
  }

  return (
    <div className="w-full min-h-screen p-6 font-sans" dir="rtl">
      <div className="w-full space-y-5">

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-right">
          <h1 className="text-xl font-bold text-[#b8943f]">إدارة المكافآت</h1>
          <p className="text-xs text-gray-500 mt-1.5">إعدادات نظام المكافآت والأكواد الترويجية</p>
        </div>

        {/* 1. مكافأة التطبيق */}
        {canViewSettings && form && (
        <>
        <SectionCard iconBg="bg-[#c9a84c]" title="مكافأة تحميل التطبيق" subtitle="مكافأة ترحيبية للسائقين الجدد"
          icon={<svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>}>
          <div className="flex items-center justify-between bg-[#f8f7f2] px-5 py-4 rounded-xl">
            <div className="text-right"><p className="text-sm font-bold text-gray-700">تفعيل المكافأة</p><p className="text-[11px] text-gray-500 mt-1">يتم منحها مرة واحدة لكل رقم هاتف عند التسجيل</p></div>
            <Toggle checked={form.app_download_enabled} onChange={v => handleFieldChange('app_download_enabled', v)} disabled={isSaving}/>
          </div>
          <div><label className="text-xs font-bold text-gray-600 block mb-2 text-right">قيمة المكافأة (ريال سعودي)</label>
            <input type="number" value={form.app_download_reward} onChange={e=>handleFieldChange('app_download_reward', e.target.value)} className={inp} disabled={!form.app_download_enabled || isSaving}/></div>
        </SectionCard>

        {/* 2. مكافأة الدعوات */}
        <SectionCard iconBg="bg-[#e4ecff]" title="مكافأة الدعوات" subtitle="مكافأة للسائقين عند دعوة الآخرين"
          icon={<svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}>
          <div className="flex items-center justify-between bg-[#f8f7f2] px-5 py-4 rounded-xl">
            <div className="text-right"><p className="text-sm font-bold text-gray-700">تفعيل نظام الدعوات</p><p className="text-[11px] text-gray-500 mt-1">يتم منح المكافأة بشكل متكرر عند الوصول للهدف</p></div>
            <Toggle checked={form.invite_enabled} onChange={v => handleFieldChange('invite_enabled', v)} disabled={isSaving}/>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <div><label className="text-xs font-bold text-gray-600 block mb-2 text-right">عدد الدعوات المطلوبة</label><input type="number" value={form.invite_required_count} onChange={e=>handleFieldChange('invite_required_count', e.target.value)} className={inp} disabled={!form.invite_enabled || isSaving}/></div>
            <div><label className="text-xs font-bold text-gray-600 block mb-2 text-right">قيمة المكافأة (ريال سعودي)</label><input type="number" value={form.invite_reward_amount} onChange={e=>handleFieldChange('invite_reward_amount', e.target.value)} className={inp} disabled={!form.invite_enabled || isSaving}/></div>
          </div>
        </SectionCard>

        {/* 3. نظام النقاط */}
        <SectionCard iconBg="bg-purple-50" title="نظام النقاط" subtitle="إعدادات كسب وتحويل النقاط"
          icon={<svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>}>
          <div className="flex items-center justify-between bg-[#f8f7f2] px-5 py-4 rounded-xl">
            <div className="text-right"><p className="text-sm font-bold text-gray-700">تفعيل نظام النقاط</p><p className="text-[11px] text-gray-500 mt-1">يجب تحويل النقاط الى نقود قبل الاستخدام</p></div>
            <Toggle checked={form.points_enabled} onChange={v => handleFieldChange('points_enabled', v)} disabled={isSaving}/>
          </div>
          <div className="grid grid-cols-2 gap-5">
              <div><label className="text-xs font-bold text-gray-600 block mb-2 text-right">النقاط لكل مبلغ</label><input type="number" value={form.points_per_amount} onChange={e=>handleFieldChange('points_per_amount', e.target.value)} className={inp} disabled={!form.points_enabled || isSaving}/></div>
              <div><label className="text-xs font-bold text-gray-600 block mb-2 text-right">قيمة النقطة</label><input type="number" value={form.points_value} onChange={e=>handleFieldChange('points_value', e.target.value)} className={inp} disabled={!form.points_enabled || isSaving}/></div>
              <div><label className="text-xs font-bold text-gray-600 block mb-2 text-right">قيمة النقدية لكل نقطة</label><input type="number" value={form.point_money_value} onChange={e=>handleFieldChange('point_money_value', e.target.value)} className={inp} disabled={!form.points_enabled || isSaving}/></div>
              <div><label className="text-xs font-bold text-gray-600 block mb-2 text-right">الحد الأدنى من النقاط للتحويل</label><input type="number" value={form.points_min_convert} onChange={e=>handleFieldChange('points_min_convert', e.target.value)} className={inp} disabled={!form.points_enabled || isSaving}/></div>
              <div><label className="text-xs font-bold text-gray-600 block mb-2 text-right">انتهاء صلاحية النقاط (أيام)</label><input type="number" value={form.points_expiration_days} onChange={e=>handleFieldChange('points_expiration_days', e.target.value)} className={inp} disabled={!form.points_enabled || isSaving}/></div>
          </div>
        </SectionCard>
        
        {/* زر حفظ الإعدادات */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-end">
          <button
            onClick={saveSettings}
            disabled={!isDirty || isSaving}
            className="bg-[#c9a84c] hover:bg-[#b8943f] text-white font-bold px-8 py-3 rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "جارٍ الحفظ..." : "حفظ الاعدادات"}
          </button>
        </div>
        </>
        )}

        {canViewCodes && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
              </div>
              <div className="text-right"><h3 className="text-[15px] font-bold text-gray-800">الأكواد الترويجية</h3><p className="text-xs text-gray-400 mt-1">إدارة الأكواد الترويجية للسائقين</p></div>
            </div>
            {canCreateCode && (
            <button onClick={openAdd} className="flex items-center gap-1.5 bg-[#c9a84c] hover:bg-[#b8943f] text-white text-xs px-5 py-2.5 rounded-xl transition-colors shadow-sm font-bold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              إضافة كود جديد
            </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="bg-[#faf9f6] border-b border-gray-100">
                  {["الكود","النوع","القيمة","تاريخ البداية","تاريخ الانتهاء","حد الاستخدام","مستخدم","الحالة","إجراءات"].map(h=>(
                    <th key={h} className="px-5 py-4 text-[11px] font-bold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCodes.map(c=>(
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-amber-600 font-bold">{c.code}</td>
                    <td className="px-5 py-4"><span className={`text-[10px] px-3 py-1.5 rounded-md font-bold ${typeColor[c.type]||"bg-gray-100 text-gray-600"}`}>{c.type}</span></td>
                    <td className="px-5 py-4 text-xs text-gray-800 font-bold">{c.value}</td>
                    <td className="px-5 py-4 text-[11px] text-gray-500 whitespace-nowrap">{c.start}</td>
                    <td className="px-5 py-4 text-[11px] text-gray-500 whitespace-nowrap">{c.end}</td>
                    <td className="px-5 py-4 text-xs text-gray-600 font-bold">{c.limit}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1.5 w-24">
                        <div className="text-center text-[10px] text-gray-600 font-bold">{c.currentUsed}/{c.totalLimit}</div>
                        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden" dir="ltr">
                          <div className="h-full bg-amber-500 rounded-full" style={{width:`${Math.min(100,(c.currentUsed/c.totalLimit)*100)}%`}}/>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className="bg-[#e4faed] text-[#21a654] text-[10px] px-3 py-1.5 rounded-md font-bold">{c.status}</span></td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2 justify-end">
                        {canEditCode && (
                        <button onClick={()=>openEdit(c)} className="text-gray-400 hover:text-amber-500 bg-white border border-gray-200 p-1.5 rounded-md shadow-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        )}
                        {canDeleteCode && (
                        <button onClick={()=>setDeleteConfirm({open:true,id:c.id,code:c.code})} className="text-red-400 hover:text-red-600 bg-white border border-gray-200 p-1.5 rounded-md shadow-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

      </div>

      {/* PromoCode Modal */}
      <PromoCodeModal
        isOpen={showAddCode}
        editingId={editingId}
        initialData={editInitial}
        onClose={closeModal}
        onSaved={fetchCodes}
      />

      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={()=>setDeleteConfirm({open:false,id:null,code:""})}
        onConfirm={confirmDeleteCode}
        title="تأكيد الحذف"
        message={<>هل أنت متأكد من حذف الكود <span className="font-bold text-amber-600">{deleteConfirm.code}</span>؟</>}
        confirmLabel="حذف الكود"
        isSubmitting={deleteLoading}
        variant="danger"
      />

    </div>
  );
}
