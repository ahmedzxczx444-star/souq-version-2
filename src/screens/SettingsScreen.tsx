import React, { useState } from "react";
import { Settings, ChevronLeft, Globe, Bell, Moon, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

interface SettingsScreenProps {
  onBack: () => void;
  t: any;
  lang: string;
  toggleLanguage: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, t, lang, toggleLanguage }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-6 pt-12 pb-6 border-b border-gray-100 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-black transition-colors">
            <ChevronLeft size={24} className="rtl:rotate-180" />
          </button>
          <h1 className="text-xl font-black text-gray-900">{t.settings}</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="p-6 max-w-md mx-auto space-y-4">
        {/* Language Toggle */}
        <div className="bg-white rounded-[32px] p-2 border border-gray-100 shadow-sm">
          <button
            onClick={toggleLanguage}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-500">
                <Globe size={20} />
              </div>
              <div className="text-left rtl:text-right">
                <span className="block font-bold text-gray-900">{t.language}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {lang === 'ar' ? 'العربية' : 'English'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-blue-500">{t.switchLanguage}</span>
              <ChevronRight size={18} className="text-gray-300 rtl:rotate-180" />
            </div>
          </button>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-[32px] p-2 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-500">
                <Bell size={20} />
              </div>
              <span className="font-bold text-gray-900">{t.notificationPrefs}</span>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`w-12 h-6 rounded-full transition-all relative ${
                notificationsEnabled ? "bg-emerald-500" : "bg-gray-200"
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                notificationsEnabled ? "ltr:left-7 rtl:right-7" : "ltr:left-1 rtl:right-1"
              }`} />
            </button>
          </div>
        </div>

        {/* Dark Mode Toggle (Placeholder) */}
        <div className="bg-white rounded-[32px] p-2 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-gray-900 text-white">
                <Moon size={20} />
              </div>
              <span className="font-bold text-gray-900">{t.darkMode}</span>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`w-12 h-6 rounded-full transition-all relative ${
                darkMode ? "bg-black" : "bg-gray-200"
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                darkMode ? "ltr:left-7 rtl:right-7" : "ltr:left-1 rtl:right-1"
              }`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
