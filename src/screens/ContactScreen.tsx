import React from "react";
import { ChevronLeft, Phone, Mail, MessageCircle } from "lucide-react";

interface ContactScreenProps {
  onBack: () => void;
}

export const ContactScreen: React.FC<ContactScreenProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 border-b border-gray-50 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">تواصل معنا</h1>
      </header>

      <div className="p-6 space-y-6 text-right" dir="rtl">
        <p className="text-gray-600 mb-8">
          نحن هنا لمساعدتك. يمكنك التواصل مع فريق الدعم الفني من خلال الوسائل التالية:
        </p>

        <div className="space-y-4">
          <a 
            href="tel:+201155336849" 
            className="flex items-center gap-4 p-6 bg-gray-50 rounded-[24px] hover:bg-gray-100 transition-colors group"
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <Phone size={24} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">الهاتف / واتساب</p>
              <p className="text-lg font-black text-gray-900" dir="ltr">+20 115 533 6849</p>
            </div>
          </a>

          <a 
            href="https://wa.me/201155336849" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-6 bg-emerald-50 rounded-[24px] hover:bg-emerald-100 transition-colors group"
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <MessageCircle size={24} className="text-emerald-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-emerald-600/60 uppercase tracking-wider mb-1">واتساب مباشر</p>
              <p className="text-lg font-black text-emerald-900">ابدأ المحادثة الآن</p>
            </div>
          </a>

          <a 
            href="mailto:Souqcars33@gmail.com" 
            className="flex items-center gap-4 p-6 bg-gray-50 rounded-[24px] hover:bg-gray-100 transition-colors group"
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <Mail size={24} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">البريد الإلكتروني</p>
              <p className="text-lg font-black text-gray-900">Souqcars33@gmail.com</p>
            </div>
          </a>
        </div>

        <div className="mt-12 p-8 bg-black rounded-[32px] text-white text-center">
          <h3 className="text-xl font-black mb-2">سوق السيارات</h3>
          <p className="text-gray-400 text-sm">منصتك الموثوقة لبيع وشراء السيارات في مصر</p>
        </div>
      </div>
    </div>
  );
};
