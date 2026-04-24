import React from "react";
import { Dealer } from "../types";
import { Star, MapPin, ShieldCheck, Building2, CarFront, MessageSquareText } from "lucide-react";
import { motion } from "motion/react";

interface DealerCardProps {
  dealer: Dealer;
  onClick: () => void;
  t: any;
  variant?: "default" | "luxury" | "image-top";
}

export const DealerCard: React.FC<DealerCardProps> = ({ dealer, onClick, t, variant = "default" }) => {
  const isImageTop = variant === "image-top";

  if (isImageTop) {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="flex-shrink-0 w-60 bg-white rounded-[24px] overflow-hidden border border-gray-100 shadow-sm group"
      >
        <div className="relative h-28 overflow-hidden">
          <img 
            src={dealer.logo} 
            alt={dealer.name} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-2 ltr:left-2 rtl:right-2">
            <div className="bg-[#1a4d3e] text-white text-[7px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-md">
              <ShieldCheck size={10} />
            </div>
          </div>
        </div>
        <div className="p-2.5">
          <div className="flex justify-between items-center mb-1.5">
            <h3 className="font-black text-[11px] text-gray-900 truncate font-arabic">{dealer.name}</h3>
            <div className="bg-[#1a4d3e]/10 text-[#1a4d3e] text-[7px] font-bold px-1.5 py-0.5 rounded-md font-arabic">
              مصر حصري
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[8px] text-gray-400 font-bold font-arabic">
            <div className="flex items-center gap-1">
              <CarFront size={9} className="text-gray-300" />
              <span>{dealer.car_count || 0} {t.carsCount}</span>
            </div>
            <div className="flex items-center gap-1 ltr:text-right rtl:text-left">
              <span>5550 {t.reviews}</span>
            </div>
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-gray-50 flex items-center gap-1 text-[8px] text-gray-400 font-bold font-arabic">
            <MapPin size={9} className="text-[#1a4d3e]" />
            <span className="truncate">{dealer.location} • 27,000 km</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative flex-shrink-0 w-72 rounded-3xl overflow-hidden cursor-pointer border border-white/5 bg-[#1C1F1E] text-white shadow-2xl group hover:border-emerald-500/30 transition-all"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <img 
            src={dealer.logo} 
            alt={dealer.name} 
            className="w-16 h-16 rounded-2xl object-cover shadow-xl border border-white/10"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg border border-emerald-500/20">
              <Star size={12} className="fill-emerald-500" />
              <span className="text-xs font-black">{dealer.rating}</span>
            </div>
            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Premium Dealer</span>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-1">
          <div className="flex items-center gap-1">
            <h3 className="font-black text-lg tracking-tight truncate font-arabic">{dealer.name}</h3>
            {(dealer.planType === 'plus' || dealer.planType === 'premium') && (
              <div className="flex items-center gap-0.5 bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                <ShieldCheck size={12} />
                <span>معرض موثق</span>
              </div>
            )}
          </div>
          <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0" />
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-white/40 mb-4 font-arabic">
          <MapPin size={12} className="text-emerald-500" />
          <span className="truncate">{dealer.location}</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center p-2 rounded-xl bg-white/5 border border-white/5">
            <Building2 size={14} className="text-emerald-500 mb-1" />
            <span className="text-[10px] font-black">{dealer.branches_count}</span>
            <span className="text-[8px] uppercase tracking-tighter text-white/40 font-arabic">{t.branches}</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-xl bg-white/5 border border-white/5">
            <CarFront size={14} className="text-emerald-500 mb-1" />
            <span className="text-[10px] font-black">{dealer.car_count || 0}</span>
            <span className="text-[8px] uppercase tracking-tighter text-white/40 font-arabic">{t.carsCount}</span>
          </div>
          <div className="flex flex-col items-center p-2 rounded-xl bg-white/5 border border-white/5">
            <MessageSquareText size={14} className="text-emerald-500 mb-1" />
            <span className="text-[10px] font-black">{dealer.reviews_count}</span>
            <span className="text-[8px] uppercase tracking-tighter text-white/40 font-arabic">{t.reviews}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

