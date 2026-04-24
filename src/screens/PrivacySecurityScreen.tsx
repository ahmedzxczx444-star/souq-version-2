import React, { useState, useEffect } from "react";
import { Shield, ChevronLeft, Lock, LogOut, User, Mail, Phone, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "../services/api";
import { motion, AnimatePresence } from "motion/react";

interface PrivacySecurityScreenProps {
  onBack: () => void;
  t: any;
  onLogout: () => void;
}

export const PrivacySecurityScreen: React.FC<PrivacySecurityScreenProps> = ({ onBack, t, onLogout }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const data = await api.auth.getMe();
      setUserInfo(data);
    } catch (e) {
      console.error("Failed to fetch user info");
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: t.passwordsDoNotMatch });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: t.passwordTooShort });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await api.auth.changePassword({ currentPassword, newPassword });
      setMessage({ type: 'success', text: "تم تغيير كلمة المرور بنجاح" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || "فشل تغيير كلمة المرور" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    if (window.confirm(t.logoutAllDevices + "?")) {
      try {
        await api.auth.logoutAll();
        onLogout();
      } catch (e) {
        console.error("Logout all failed");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-6 pt-12 pb-6 border-b border-gray-100 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-black transition-colors">
            <ChevronLeft size={24} className="rtl:rotate-180" />
          </button>
          <h1 className="text-xl font-black text-gray-900">{t.privacy}</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="p-6 max-w-md mx-auto space-y-6">
        {/* Account Info */}
        <section className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-500">
              <User size={20} />
            </div>
            <h2 className="text-lg font-black text-gray-900">{t.accountInfo}</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-gray-400" />
                <span className="text-sm font-bold text-gray-500">{t.email}</span>
              </div>
              <span className="text-sm font-black text-gray-900">{userInfo?.email || "..."}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-gray-400" />
                <span className="text-sm font-bold text-gray-500">{t.phone}</span>
              </div>
              <span className="text-sm font-black text-gray-900">{userInfo?.phone || "—"}</span>
            </div>
          </div>
        </section>

        {/* Change Password */}
        <section className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-500">
              <Lock size={20} />
            </div>
            <h2 className="text-lg font-black text-gray-900">{t.changePassword}</h2>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-4 rounded-2xl flex items-center gap-3 ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}
                >
                  {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span className="text-xs font-bold">{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                {t.currentPassword}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-black focus:bg-white transition-all outline-none font-sans font-bold text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                {t.newPassword}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-black focus:bg-white transition-all outline-none font-sans font-bold text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                {t.confirmPassword}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-black focus:bg-white transition-all outline-none font-sans font-bold text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full p-4 bg-black text-white font-black rounded-2xl shadow-xl shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? t.processing : t.changePassword}
            </button>
          </form>
        </section>

        {/* Global Logout */}
        <button
          onClick={handleLogoutAll}
          className="w-full p-6 bg-red-50 text-red-500 font-black rounded-[32px] border border-red-100 flex items-center justify-center gap-3 hover:bg-red-100 transition-colors"
        >
          <LogOut size={20} />
          {t.logoutAllDevices}
        </button>
      </div>
    </div>
  );
};
