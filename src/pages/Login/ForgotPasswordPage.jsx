import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendLoginOtp, resetPasswordWithOtp } from "../../services/authService.js";
import { maskPhone, normalizePhoneForOtp } from "../../lib/phoneValidation.js";
import { assetUrl } from "../../lib/assetUrl.js";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 60;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState("identify");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const startResendCooldown = useCallback(() => {
    setResendIn(RESEND_COOLDOWN_SEC);
  }, []);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("يرجى إدخال البريد الإلكتروني");
      return;
    }
    const normalized = normalizePhoneForOtp(phone);
    if (!normalized) {
      setError("يرجى إدخال رقم الهاتف المسجّل في حسابك");
      return;
    }

    setLoading(true);
    try {
      await sendLoginOtp(normalized);
      setOtpPhone(normalized);
      setOtp("");
      setStep("otp");
      startResendCooldown();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (otp.replace(/\D/g, "").length < OTP_LENGTH) {
      setError(`يرجى إدخال رمز التحقق (${OTP_LENGTH} أرقام)`);
      return;
    }
    setStep("password");
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }
    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithOtp({
        email,
        phone: otpPhone,
        otp,
        password,
      });
      navigate("/login", { replace: true, state: { resetSuccess: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendIn > 0 || !otpPhone) return;
    setError("");
    setLoading(true);
    try {
      await sendLoginOtp(otpPhone);
      startResendCooldown();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError("");
    if (step === "otp") {
      setStep("identify");
      setOtp("");
    } else if (step === "password") {
      setStep("otp");
      setPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-16 h-16 rounded-full overflow-hidden shadow-lg border-2 border-[#c9a84c]/30">
            <img src={assetUrl("judy.png")} alt="Drivo" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-[#c9a84c]">Drivo</h1>
            <p className="text-sm text-gray-500 mt-0.5">استعادة كلمة المرور</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-7">
          {step !== "identify" && (
            <button
              type="button"
              onClick={handleBack}
              className="text-xs text-gray-400 hover:text-[#c9a84c] mb-4 flex items-center gap-1"
            >
              ← العودة
            </button>
          )}

          {step === "identify" && (
            <>
              <h2 className="text-base font-bold text-gray-800 mb-2">نسيت كلمة المرور</h2>
              <p className="text-xs text-gray-500 leading-relaxed mb-5">
                أدخل بريدك ورقم هاتفك المسجّلين — سنرسل رمز التحقق عبر واتساب.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-3 py-2.5 text-right mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600 block">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@domain.com"
                    dir="ltr"
                    autoComplete="email"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none placeholder-gray-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600 block">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                    autoComplete="tel"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none placeholder-gray-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#c9a84c] hover:bg-[#b8943f] text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 shadow-sm"
                >
                  {loading ? "جارٍ الإرسال..." : "إرسال رمز التحقق"}
                </button>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <h2 className="text-base font-bold text-gray-800 mb-2">رمز التحقق</h2>
              <p className="text-xs text-gray-500 leading-relaxed mb-5">
                تم إرسال الرمز عبر{" "}
                <span className="font-bold text-green-600">واتساب</span> إلى{" "}
                <span className="font-mono font-bold text-gray-700" dir="ltr">
                  {maskPhone(otpPhone)}
                </span>
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-3 py-2.5 text-right mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600 block">رمز OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={OTP_LENGTH}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
                    placeholder="••••••"
                    dir="ltr"
                    autoComplete="one-time-code"
                    autoFocus
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center text-lg tracking-[0.4em] font-mono focus:border-[#c9a84c] focus:outline-none placeholder-gray-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length < OTP_LENGTH}
                  className="w-full bg-[#c9a84c] hover:bg-[#b8943f] text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 shadow-sm"
                >
                  متابعة
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading || resendIn > 0}
                    className="text-xs text-[#c9a84c] hover:text-[#b8943f] font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {resendIn > 0 ? `إعادة الإرسال خلال ${resendIn} ث` : "إعادة إرسال الرمز"}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === "password" && (
            <>
              <h2 className="text-base font-bold text-gray-800 mb-2">كلمة مرور جديدة</h2>
              <p className="text-xs text-gray-500 leading-relaxed mb-5">
                اختر كلمة مرور جديدة لحسابك.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-3 py-2.5 text-right mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600 block">كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8 أحرف على الأقل"
                    dir="ltr"
                    autoComplete="new-password"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none placeholder-gray-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-600 block">تأكيد كلمة المرور</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    dir="ltr"
                    autoComplete="new-password"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-[#c9a84c] focus:outline-none placeholder-gray-300"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#c9a84c] hover:bg-[#b8943f] text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-60 shadow-sm"
                >
                  {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
                </button>
              </form>
            </>
          )}

          <div className="text-center mt-5">
            <Link to="/login" className="text-xs text-gray-400 hover:text-[#c9a84c]">
              العودة لتسجيل الدخول
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
