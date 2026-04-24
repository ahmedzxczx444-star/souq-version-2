import React from "react";
import { User, Settings, Bell, Shield, LogOut, ChevronRight, CreditCard, Crown } from "lucide-react";
import { api } from "../services/api";
import { subscriptionsEnabled } from "../constants/config";

interface ProfileScreenProps {
  user: any;
  onLogout: () => void;
  onAddCar: () => void;
  onDealerDashboard: (section?: 'cars' | 'profile') => void;
  onNavigate: (screen: any) => void;
  t: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ user, onLogout, onAddCar, onDealerDashboard, onNavigate, t }) => {
  const menuItems = [
    { icon: Bell, label: t.notifications, color: "text-blue-500", onClick: () => onNavigate("notifications") },
    { icon: CreditCard, label: t.myListings, color: "text-emerald-500", onClick: () => user.role === 'dealer' ? onDealerDashboard('cars') : alert(t.myListings) },
    ...(user.role === 'dealer' ? [{ icon: Settings, label: t.dealerDashboard, color: "text-emerald-600", onClick: () => onDealerDashboard('cars') }] : []),
    ...(subscriptionsEnabled && user.role === 'dealer' ? [{ icon: Crown, label: "خطط الاشتراك", color: "text-amber-500", onClick: () => onNavigate("subscription-plans") }] : []),
    { icon: Shield, label: t.privacy, color: "text-purple-500", onClick: () => onNavigate("privacy-security") },
    { icon: Settings, label: t.settings, color: "text-gray-500", onClick: () => onNavigate("settings") },
  ];

  return (
    <div className="pb-24 pt-12 px-6 max-w-md mx-auto min-h-screen bg-white">
      <div className="flex flex-col items-center mb-10">
        <div className="w-24 h-24 bg-black rounded-[32px] flex items-center justify-center mb-4 shadow-2xl shadow-black/20">
          <span className="text-white text-3xl font-black">{user.name.charAt(0)}</span>
        </div>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{user.name}</h2>
        <p className="text-gray-400 text-sm font-medium">{user.email}</p>
        {user.role === 'dealer' && (
          <div className="mt-2 px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-widest rounded-full border border-emerald-100">
            {t.dealerRole}
          </div>
        )}
      </div>

      {subscriptionsEnabled && user.role === 'dealer' && (
        <div className="bg-emerald-50 rounded-[32px] p-6 mb-6 border border-emerald-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Crown size={80} />
          </div>
          <div className="relative z-10">
            <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">خطتك الحالية</p>
            <h3 className="text-2xl font-black text-emerald-900 mb-4 uppercase">{user.planType || 'free'}</h3>
            <button 
              onClick={() => onNavigate("subscription-plans")}
              className="bg-emerald-500 text-white px-6 py-2 rounded-full text-xs font-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors"
            >
              ترقية الخطة
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[32px] p-2 border border-gray-100 shadow-sm mb-6">
        {menuItems.map((item, i) => (
          <button
            key={i}
            onClick={item.onClick}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-xl bg-gray-50 ${item.color}`}>
                <item.icon size={20} />
              </div>
              <span className="font-bold text-gray-700">{item.label}</span>
            </div>
            <ChevronRight size={18} className="text-gray-300 rtl:rotate-180" />
          </button>
        ))}
      </div>

      {user.role === 'dealer' && (
        <button
          onClick={onAddCar}
          disabled={user.is_verified === 0}
          className="w-full flex items-center justify-center gap-2 p-5 bg-black text-white font-bold rounded-[32px] shadow-xl shadow-black/20 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-lg">+</span>
          {t.addCar}
        </button>
      )}

      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 p-5 bg-red-50 text-red-500 font-bold rounded-[32px] border border-red-100"
      >
        <LogOut size={20} className="rtl:rotate-180" />
        {t.logout}
      </button>
    </div>
  );
};

