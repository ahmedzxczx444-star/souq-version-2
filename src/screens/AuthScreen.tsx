import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { User, Mail, Lock, ChevronRight, Phone, MapPin, Hash, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

declare global {
  interface Window {
    grecaptcha: any;
  }
}

interface AuthScreenProps {
  onSuccess: (user: any, token: string) => void;
  t: any;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, t }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  
  // Dealer specific fields
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [branches, setBranches] = useState("1");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [logo, setLogo] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.grecaptcha && document.querySelector('.g-recaptcha')) {
        try {
          window.grecaptcha.render(document.querySelector('.g-recaptcha'), {
            sitekey: (import.meta as any).env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
          });
        } catch (e) {
          // Already rendered or other error
        }
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [isLogin, isForgotPassword, isResetPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const captchaToken = window.grecaptcha?.getResponse();
      if (!captchaToken && (isLogin || (!isLogin && !isForgotPassword && !isResetPassword))) {
        setError("يرجى إكمال اختبار التحقق (reCAPTCHA)");
        setLoading(false);
        return;
      }

      if (isForgotPassword) {
        await api.auth.forgotPassword(email);
        setMessage("تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني (تحقق من وحدة تحكم الخادم للمحاكاة)");
        return;
      }

      if (isResetPassword) {
        await api.auth.resetPassword({ token: resetToken, password });
        setMessage("تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول.");
        setIsResetPassword(false);
        setIsLogin(true);
        return;
      }

      if (!isLogin && !isForgotPassword && !isResetPassword) {
        if (password.length < 6) {
          setError(t.passwordTooShort);
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError(t.passwordsDoNotMatch);
          setLoading(false);
          return;
        }
      }

      const res = isLogin 
        ? await api.auth.login({ email, password, captchaToken })
        : await api.auth.register({ 
            email, 
            password, 
            name, 
            role,
            phone,
            whatsapp_number: whatsapp,
            branches_count: parseInt(branches),
            address,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            logo,
            captchaToken
          });
      
      if (res.requiresVerification) {
        setMessage("تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب (تحقق من وحدة تحكم الخادم للمحاكاة)");
      } else {
        onSuccess(res.user, res.token);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
      });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const title = isForgotPassword 
    ? "نسيت كلمة المرور" 
    : isResetPassword 
      ? "إعادة تعيين كلمة المرور"
      : isLogin 
        ? t.welcomeBack 
        : t.createAccount;

  const subtitle = isForgotPassword
    ? "أدخل بريدك الإلكتروني لاستلام رابط إعادة التعيين"
    : isResetPassword
      ? "أدخل كلمة المرور الجديدة"
      : isLogin
        ? t.signInToContinue
        : t.joinExclusive;

  return (
    <div className="min-h-screen bg-white px-6 pt-20 pb-12 flex flex-col max-w-md mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-black tracking-tighter text-gray-900 mb-2">
          {title}
        </h1>
        <p className="text-gray-500 font-medium">
          {subtitle}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isResetPassword && (
          <div className="relative">
            <Lock className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            <input
              type="text"
              placeholder="رمز إعادة التعيين"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              required
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 ltr:pl-12 ltr:pr-4 rtl:pr-12 rtl:pl-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 text-gray-900 placeholder:text-gray-400"
            />
          </div>
        )}

        {!isLogin && !isForgotPassword && !isResetPassword && (
          <div className="relative">
            <User className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            <input
              type="text"
              placeholder={t.fullName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 ltr:pl-12 ltr:pr-4 rtl:pr-12 rtl:pl-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 text-gray-900 placeholder:text-gray-400"
            />
          </div>
        )}

        {!isResetPassword && (
          <div className="relative">
            <Mail className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            <input
              type="email"
              placeholder={t.emailAddress}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 ltr:pl-12 ltr:pr-4 rtl:pr-12 rtl:pl-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 text-gray-900 placeholder:text-gray-400"
            />
          </div>
        )}

        {(isLogin || isResetPassword || !isLogin) && !isForgotPassword && (
          <div className="relative">
            <Lock className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            <input
              type="password"
              placeholder={isResetPassword ? "كلمة المرور الجديدة" : t.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 ltr:pl-12 ltr:pr-4 rtl:pr-12 rtl:pl-4 text-sm font-sans font-medium focus:outline-none focus:ring-2 focus:ring-black/5 text-gray-900 placeholder:text-gray-400"
            />
          </div>
        )}

        {!isLogin && !isForgotPassword && !isResetPassword && (
          <div className="relative">
            <Lock className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            <input
              type="password"
              placeholder={t.confirmPassword}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 ltr:pl-12 ltr:pr-4 rtl:pr-12 rtl:pl-4 text-sm font-sans font-medium focus:outline-none focus:ring-2 focus:ring-black/5 text-gray-900 placeholder:text-gray-400"
            />
          </div>
        )}

        {!isLogin && !isForgotPassword && !isResetPassword && (
          <>
            <div className="flex gap-3 pt-2">
              <label className="flex-1 relative cursor-pointer">
                <input 
                  type="radio" 
                  name="role" 
                  value="user" 
                  checked={role === "user"} 
                  onChange={() => setRole("user")} 
                  className="sr-only"
                />
                <div className={`w-full py-4 rounded-2xl text-sm font-bold border text-center transition-all ${
                  role === "user"
                    ? "bg-black text-white border-black shadow-lg shadow-black/10"
                    : "bg-gray-50 text-gray-400 border-gray-100"
                }`}>
                  {t.userRole}
                </div>
              </label>
              <label className="flex-1 relative cursor-pointer">
                <input 
                  type="radio" 
                  name="role" 
                  value="dealer" 
                  checked={role === "dealer"} 
                  onChange={() => setRole("dealer")} 
                  className="sr-only"
                />
                <div className={`w-full py-4 rounded-2xl text-sm font-bold border text-center transition-all ${
                  role === "dealer"
                    ? "bg-black text-white border-black shadow-lg shadow-black/10"
                    : "bg-gray-50 text-gray-400 border-gray-100"
                }`}>
                  {t.dealerRole}
                </div>
              </label>
            </div>

            {role === "dealer" && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-4 pt-4 border-t border-gray-100"
              >
                <div className="relative">
                  <Phone className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  <input
                    type="tel"
                    placeholder="رقم الهاتف"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 ltr:pl-12 ltr:pr-4 rtl:pr-12 rtl:pl-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" size={20} />
                  <input
                    type="tel"
                    placeholder="رقم الواتساب"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 ltr:pl-12 ltr:pr-4 rtl:pr-12 rtl:pl-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div className="relative">
                  <Hash className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  <input
                    type="number"
                    placeholder="عدد الفروع"
                    value={branches}
                    onChange={(e) => setBranches(e.target.value)}
                    required
                    min="1"
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 ltr:pl-12 ltr:pr-4 rtl:pr-12 rtl:pl-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div className="relative">
                  <MapPin className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  <input
                    type="text"
                    placeholder="العنوان (مثال: التجمع الخامس - شارع التسعين)"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 ltr:pl-12 ltr:pr-4 rtl:pr-12 rtl:pl-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black/5 text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                
                <button 
                  type="button"
                  onClick={handleGetCurrentLocation}
                  className="w-full py-2 text-[10px] font-bold text-gray-400 hover:text-black transition-colors flex items-center justify-center gap-1"
                >
                  <MapPin size={12} />
                  تحديد موقعي الحالي
                </button>

                <div className="relative">
                  <label className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 text-sm font-medium flex items-center gap-3 cursor-pointer hover:bg-gray-100 transition-colors">
                    <ImageIcon className="text-gray-400" size={20} />
                    <span className="text-gray-400">{logo ? "تم اختيار الشعار" : "رفع شعار المعرض (اختياري)"}</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  {logo && (
                    <div className="mt-2 flex justify-center">
                      <img src={logo} alt="Logo preview" className="w-16 h-16 rounded-xl object-cover border border-gray-100" />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </>
        )}

        {error && <p className="text-red-500 text-xs font-bold px-2">{error}</p>}
        {message && <p className="text-emerald-500 text-xs font-bold px-2">{message}</p>}

        {(isLogin || (!isLogin && !isForgotPassword && !isResetPassword)) && (
          <div className="flex justify-center py-2">
            <div 
              className="g-recaptcha" 
              data-sitekey={(import.meta as any).env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
            ></div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-black/20 disabled:opacity-50"
        >
          {loading ? t.processing : isForgotPassword ? "إرسال رابط التعيين" : isResetPassword ? "تغيير كلمة المرور" : isLogin ? t.signIn : t.register}
          <ChevronRight size={20} className="rtl:rotate-180" />
        </button>
      </form>

      <div className="mt-8 flex flex-col items-center gap-4">
        {isLogin && !isForgotPassword && !isResetPassword && (
          <button
            onClick={() => setIsForgotPassword(true)}
            className="text-xs font-bold text-gray-400 hover:text-black transition-colors"
          >
            نسيت كلمة المرور؟
          </button>
        )}
        
        {(isForgotPassword || isResetPassword) && (
          <button
            onClick={() => {
              setIsForgotPassword(false);
              setIsResetPassword(false);
              setIsLogin(true);
              setError("");
              setMessage("");
            }}
            className="text-xs font-bold text-gray-400 hover:text-black transition-colors"
          >
            العودة لتسجيل الدخول
          </button>
        )}

        {!isForgotPassword && !isResetPassword && (
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setMessage("");
            }}
            className="text-sm font-bold text-gray-400 hover:text-black transition-colors"
          >
            {isLogin ? t.createAccount : t.signIn}
          </button>
        )}
      </div>
    </div>
  );
};

