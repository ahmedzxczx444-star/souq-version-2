import React, { useEffect, useState } from "react";
import { Bell, ChevronLeft, CheckCircle2, Clock } from "lucide-react";
import { api } from "../services/api";
import { motion } from "motion/react";

interface NotificationsScreenProps {
  onBack: () => void;
  t: any;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ onBack, t }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await api.notifications.getAll();
      setNotifications(data);
    } catch (e) {
      console.error("Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: 1 } : n));
    } catch (e) {
      console.error("Failed to mark as read");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white px-6 pt-12 pb-6 border-b border-gray-100 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-black transition-colors">
            <ChevronLeft size={24} className="rtl:rotate-180" />
          </button>
          <h1 className="text-xl font-black text-gray-900">{t.notifications}</h1>
          <div className="w-8" />
        </div>
      </div>

      <div className="p-6 max-w-md mx-auto">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white rounded-3xl animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-[32px] flex items-center justify-center mb-6">
              <Bell size={32} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">{t.noNotifications}</h3>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <motion.div
                key={notification.notification_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => !notification.is_read && handleMarkAsRead(notification.notification_id)}
                className={`p-5 rounded-[28px] border transition-all cursor-pointer ${
                  notification.is_read 
                    ? "bg-white border-gray-100 opacity-70" 
                    : "bg-white border-emerald-100 shadow-lg shadow-emerald-500/5"
                }`}
              >
                <div className="flex gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    notification.is_read ? "bg-gray-50 text-gray-400" : "bg-emerald-50 text-emerald-600"
                  }`}>
                    <Bell size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${
                        notification.is_read ? "text-gray-400" : "text-emerald-600"
                      }`}>
                        {notification.type}
                      </span>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-2 leading-relaxed">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                      <Clock size={10} />
                      <span>{new Date(notification.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
