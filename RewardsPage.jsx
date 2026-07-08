import { useState, useEffect, useCallback } from "react";
import { Switch } from "./ui/switch";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useToast } from "../lib/toast";

const API_BASE = "https://drivo1.elmoroj.com/api";

const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
  </div>
);

const ErrorMessage = ({ message, onRetry }) => (
  <div className="text-center py-20">
    <p className="text-red-500 mb-4">حدث خطأ: {message}</p>
    <Button onClick={onRetry}>حاول مرة أخرى</Button>
  </div>
);

export default function RewardsPage() {
  const [settings, setSettings] = useState({
    app_download_enabled: false,
    app_download_reward: 0,
    invite_enabled: false,
    invite_required_count: 0,
    invite_reward_amount: 0,
    points_enabled: false,
    points_per_amount: 0,
    points_value: 0,
    point_money_value: 0,
    points_min_convert: 0,
    points_expiration_days: 0,
  });
  const [initialSettings, setInitialSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  const toast = useToast();

  const hasUnsavedChanges = initialSettings ? JSON.stringify(settings) !== JSON.stringify(initialSettings) : false;

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/reward-settings`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      if (result.status && result.data) {
        const data = {
          app_download_enabled: !!result.data.app_download_enabled,
          app_download_reward: parseFloat(result.data.app_download_reward) || 0,
          invite_enabled: !!result.data.invite_enabled,
          invite_required_count: parseInt(result.data.invite_required_count, 10) || 0,
          invite_reward_amount: parseFloat(result.data.invite_reward_amount) || 0,
          points_enabled: !!result.data.points_enabled,
          points_per_amount: parseFloat(result.data.points_per_amount) || 0,
          points_value: parseInt(result.data.points_value, 10) || 0,
          point_money_value: parseFloat(result.data.point_money_value) || 0,
          points_min_convert: parseInt(result.data.points_min_convert, 10) || 0,
          points_expiration_days: parseInt(result.data.points_expiration_days, 10) || 0,
        };
        setSettings(data);
        setInitialSettings(data);
      } else {
        throw new Error("API returned unsuccessful status or no data.");
      }
    } catch (e) {
      setError(e.message);
      toast.error("فشل تحميل الإعدادات.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleSwitchChange = (key) => (checked) => {
    setSettings((prev) => ({ ...prev, [key]: checked }));
  };

  const handleInputChange = (key) => (e) => {
    const { value } = e.target;
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (settings.app_download_enabled && settings.app_download_reward < 0) {
      newErrors.app_download_reward = "المبلغ لا يمكن أن يكون سالباً";
    }
    if (settings.invite_enabled) {
      if (settings.invite_required_count <= 0) newErrors.invite_required_count = "يجب أن يكون أكبر من 0";
      if (settings.invite_reward_amount < 0) newErrors.invite_reward_amount = "المبلغ لا يمكن أن يكون سالباً";
    }
    if (settings.points_enabled) {
      if (settings.points_per_amount <= 0) newErrors.points_per_amount = "يجب أن يكون أكبر من 0";
      if (settings.points_value <= 0) newErrors.points_value = "يجب أن يكون أكبر من 0";
      if (settings.point_money_value < 0) newErrors.point_money_value = "المبلغ لا يمكن أن يكون سالباً";
      if (settings.points_min_convert <= 0) newErrors.points_min_convert = "يجب أن يكون أكبر من 0";
      if (settings.points_expiration_days <= 0) newErrors.points_expiration_days = "يجب أن يكون أكبر من 0";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error("يرجى إصلاح الأخطاء في النموذج.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        app_download_enabled: settings.app_download_enabled ? 1 : 0,
        app_download_reward: Number(settings.app_download_reward),
        invite_enabled: settings.invite_enabled ? 1 : 0,
        invite_required_count: Number(settings.invite_required_count),
        invite_reward_amount: Number(settings.invite_reward_amount),
        points_enabled: settings.points_enabled ? 1 : 0,
        points_per_amount: Number(settings.points_per_amount),
        points_value: Number(settings.points_value),
        point_money_value: Number(settings.point_money_value),
        points_min_convert: Number(settings.points_min_convert),
        points_expiration_days: Number(settings.points_expiration_days),
      };

      const response = await fetch(`${API_BASE}/admin/rewards/settings/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message ?? `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.status) {
        toast.success("تم حفظ الإعدادات بنجاح.");
        // Refresh local state with what was just saved
        setInitialSettings(settings);
      } else {
        throw new Error(result.message || "فشل حفظ الإعدادات.");
      }
    } catch (e) {
      toast.error(e.message || "حدث خطأ غير متوقع.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchSettings} />;
  }

  return (
    <div className="space-y-8 p-4 md:p-6" dir="rtl">
      <h1 className="text-2xl font-bold">إدارة المكافآت</h1>

      {/* App Download Reward */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between pb-4 border-b">
          <h2 className="text-lg font-semibold">مكافأة تحميل التطبيق</h2>
          <Switch
            checked={settings.app_download_enabled}
            onCheckedChange={handleSwitchChange("app_download_enabled")}
          />
        </div>
        <div className="mt-6">
          <label htmlFor="app_download_reward" className="block text-sm font-medium text-gray-700 mb-2">
            مبلغ المكافأة (SAR)
          </label>
          <Input
            id="app_download_reward"
            type="number"
            value={settings.app_download_reward}
            onChange={handleInputChange("app_download_reward")}
            disabled={!settings.app_download_enabled || saving}
            min="0"
            className={`w-full md:w-1/3 ${errors.app_download_reward ? 'border-red-500' : ''}`}
          />
          {errors.app_download_reward && <p className="text-red-500 text-xs mt-1">{errors.app_download_reward}</p>}
        </div>
      </div>

      {/* Invite Reward */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between pb-4 border-b">
          <h2 className="text-lg font-semibold">مكافأة دعوة الأصدقاء</h2>
          <Switch
            checked={settings.invite_enabled}
            onCheckedChange={handleSwitchChange("invite_enabled")}
          />
        </div>
        <div className={`mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 ${!settings.invite_enabled ? 'opacity-50' : ''}`}>
          <div>
            <label htmlFor="invite_required_count" className="block text-sm font-medium text-gray-700 mb-2">
              عدد الدعوات المطلوبة
            </label>
            <Input
              id="invite_required_count"
              type="number"
              value={settings.invite_required_count}
              onChange={handleInputChange("invite_required_count")}
              disabled={!settings.invite_enabled || saving}
              min="1"
              className={errors.invite_required_count ? 'border-red-500' : ''}
            />
            {errors.invite_required_count && <p className="text-red-500 text-xs mt-1">{errors.invite_required_count}</p>}
          </div>
          <div>
            <label htmlFor="invite_reward_amount" className="block text-sm font-medium text-gray-700 mb-2">
              مبلغ المكافأة (SAR)
            </label>
            <Input
              id="invite_reward_amount"
              type="number"
              value={settings.invite_reward_amount}
              onChange={handleInputChange("invite_reward_amount")}
              disabled={!settings.invite_enabled || saving}
              min="0"
              className={errors.invite_reward_amount ? 'border-red-500' : ''}
            />
            {errors.invite_reward_amount && <p className="text-red-500 text-xs mt-1">{errors.invite_reward_amount}</p>}
          </div>
        </div>
      </div>

      {/* Loyalty Points */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between pb-4 border-b">
          <h2 className="text-lg font-semibold">نظام نقاط الولاء</h2>
          <Switch
            checked={settings.points_enabled}
            onCheckedChange={handleSwitchChange("points_enabled")}
          />
        </div>
        <div className={`mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${!settings.points_enabled ? 'opacity-50' : ''}`}>
          <div>
            <label htmlFor="points_per_amount" className="block text-sm font-medium text-gray-700 mb-2">
              النقاط لكل مبلغ (SAR)
            </label>
            <Input
              id="points_per_amount"
              type="number"
              value={settings.points_per_amount}
              onChange={handleInputChange("points_per_amount")}
              disabled={!settings.points_enabled || saving}
              min="1"
              className={errors.points_per_amount ? 'border-red-500' : ''}
            />
            {errors.points_per_amount && <p className="text-red-500 text-xs mt-1">{errors.points_per_amount}</p>}
          </div>
          <div>
            <label htmlFor="points_value" className="block text-sm font-medium text-gray-700 mb-2">
              قيمة النقطة
            </label>
            <Input
              id="points_value"
              type="number"
              value={settings.points_value}
              onChange={handleInputChange("points_value")}
              disabled={!settings.points_enabled || saving}
              min="1"
              className={errors.points_value ? 'border-red-500' : ''}
            />
            {errors.points_value && <p className="text-red-500 text-xs mt-1">{errors.points_value}</p>}
          </div>
          <div>
            <label htmlFor="point_money_value" className="block text-sm font-medium text-gray-700 mb-2">
              القيمة المالية للنقطة (SAR)
            </label>
            <Input
              id="point_money_value"
              type="number"
              value={settings.point_money_value}
              onChange={handleInputChange("point_money_value")}
              disabled={!settings.points_enabled || saving}
              min="0"
              className={errors.point_money_value ? 'border-red-500' : ''}
            />
            {errors.point_money_value && <p className="text-red-500 text-xs mt-1">{errors.point_money_value}</p>}
          </div>
          <div>
            <label htmlFor="points_min_convert" className="block text-sm font-medium text-gray-700 mb-2">
              أدنى عدد نقاط للتحويل
            </label>
            <Input
              id="points_min_convert"
              type="number"
              value={settings.points_min_convert}
              onChange={handleInputChange("points_min_convert")}
              disabled={!settings.points_enabled || saving}
              min="1"
              className={errors.points_min_convert ? 'border-red-500' : ''}
            />
            {errors.points_min_convert && <p className="text-red-500 text-xs mt-1">{errors.points_min_convert}</p>}
          </div>
          <div>
            <label htmlFor="points_expiration_days" className="block text-sm font-medium text-gray-700 mb-2">
              صلاحية النقاط (بالأيام)
            </label>
            <Input
              id="points_expiration_days"
              type="number"
              value={settings.points_expiration_days}
              onChange={handleInputChange("points_expiration_days")}
              disabled={!settings.points_enabled || saving}
              min="1"
              className={errors.points_expiration_days ? 'border-red-500' : ''}
            />
            {errors.points_expiration_days && <p className="text-red-500 text-xs mt-1">{errors.points_expiration_days}</p>}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleSave}
          disabled={saving || !hasUnsavedChanges}
          className="bg-[#c9a84c] hover:bg-[#b38f3c] text-white font-bold py-2 px-6 rounded-lg transition-colors"
        >
          {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
        </Button>
      </div>
    </div>
  );
}