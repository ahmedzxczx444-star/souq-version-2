import React from "react";
import { Part } from "../types";
import { MapPin, Building2, Truck, CheckCircle2, XCircle, Share2 } from "lucide-react";
import { motion } from "motion/react";

interface PartCardProps {
  part: Part;
  onClick: () => void;
  t: any;
  variant?: "grid" | "feed" | "compact";
}

// Structural sibling of CarCard.tsx (same classNames/layout per variant) so parts
// results render with the identical visual language as car results, per the
// requirement that parts search must reuse the car card's look. CarCard.tsx itself is
// never modified - it stays hard-typed to Car, this component is hard-typed to Part.
export const PartCard: React.FC<PartCardProps> = ({ part, onClick, t, variant = "feed" }) => {
  const isAvailable = part.status === "available";
  const priceLabel = part.price ? `${part.price.toLocaleString()} ج.م` : "اتصل للسعر";
  const image = part.images?.[0];

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const partUrl = `${window.location.origin}/part/${part.id}`;
    const shareText = `السلام عليكم، أنا مهتم بقطعة غيار ${part.name} الموجودة على سوق السيارات.\n${priceLabel}\nالرابط: ${partUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: part.name, text: shareText, url: partUrl }); } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
    }
  };

  if (variant === "compact") {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="flex items-stretch ltr:flex-row rtl:flex-row-reverse bg-white rounded-2xl border border-gray-100 shadow-sm cursor-pointer overflow-hidden h-[110px]"
      >
        <div className="relative w-[110px] h-full flex-shrink-0 overflow-hidden bg-gray-100">
          {image ? (
            <img src={image} alt={part.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px] font-bold">لا صورة</div>
          )}
        </div>
        <div className="flex-1 min-w-0 px-3 py-2 flex flex-col justify-center gap-1">
          <h3 className="font-black text-gray-900 text-xs leading-tight truncate font-arabic">{part.name}</h3>
          <p className="text-xs font-black text-[#1a4d3e] font-arabic">{priceLabel}</p>
          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold font-arabic truncate">
            <Building2 size={11} className="flex-shrink-0 text-gray-400" />
            <span className="truncate">{part.dealer_name || "معرض"}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold font-arabic truncate">
            <MapPin size={11} className="flex-shrink-0 text-[#1a4d3e]" />
            <span className="truncate">{part.dealer_location || "القاهرة"}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (variant === "grid") {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer flex flex-col group"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
          {image ? (
            <img src={image} alt={part.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px] font-bold">لا صورة</div>
          )}
          <div className="absolute top-1.5 ltr:left-1.5 rtl:right-1.5 flex flex-col gap-1 items-start">
            <div className="bg-[#1a4d3e] text-white text-[8px] font-black px-2 py-0.5 rounded-md shadow-md">{priceLabel}</div>
            <div className={`text-white text-[7px] font-black px-1.5 py-0.5 rounded-md shadow-sm uppercase tracking-tighter ${isAvailable ? "bg-emerald-500" : "bg-rose-500"}`}>
              {isAvailable ? "متاح" : "غير متاح"}
            </div>
          </div>
        </div>
        <div className="p-2 flex-1 flex flex-col justify-between">
          <div className="mb-1">
            <h3 className="font-black text-gray-900 text-[10px] leading-tight truncate font-arabic">{part.name}</h3>
            {part.manufacturer && <span className="text-[8px] font-bold text-gray-400 font-arabic">{part.manufacturer}</span>}
          </div>
          <div className="flex flex-col gap-1 text-[7px] text-gray-400 font-bold mt-1.5 pt-1.5 border-t border-gray-50">
            <div className="flex items-center gap-1">
              <MapPin size={8} className="text-[#1a4d3e]" />
              <span className="truncate font-arabic">{part.dealer_location || "القاهرة"}</span>
            </div>
            {part.delivery_supported && (
              <div className="flex items-center gap-1">
                <Truck size={8} className="text-[#1a4d3e]" />
                <span className="font-arabic">يوجد توصيل</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white border-b border-gray-100 pb-4 mb-4"
    >
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-100 p-[1.5px]">
            <div className="w-full h-full rounded-full bg-white p-[1px]">
              <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-[10px] font-black text-gray-500">
                {part.dealer_logo ? (
                  <img src={part.dealer_logo} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                ) : (
                  part.name[0]
                )}
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-black text-gray-900 font-arabic leading-none">{part.dealer_name || "معرض قطع غيار"}</h4>
            <p className="text-[9px] text-gray-400 font-bold font-arabic mt-0.5">{part.dealer_location || "القاهرة"}</p>
          </div>
        </div>
        <button onClick={handleShare} className="text-gray-400">
          <Share2 size={18} />
        </button>
      </div>

      <div onClick={onClick} className="relative aspect-square w-full overflow-hidden bg-gray-100 cursor-pointer">
        {image ? (
          <img src={image} alt={part.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs font-bold">لا توجد صورة</div>
        )}
        <div className={`absolute top-3 ltr:left-3 rtl:right-3 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1 ${isAvailable ? "bg-emerald-500" : "bg-rose-500"}`}>
          {isAvailable ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
          {isAvailable ? "متاح" : "غير متاح"}
        </div>
        {part.images && part.images.length > 1 && (
          <div className="absolute top-3 ltr:right-3 rtl:left-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full">
            1/{part.images.length}
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-gray-900 font-arabic">
            🔧 {part.name}
          </div>
          <div className="text-sm font-black text-[#1a4d3e] font-arabic">{priceLabel}</div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-gray-900 font-arabic">{part.dealer_name || "معرض قطع غيار"}</span>
            {part.manufacturer && <span className="text-[10px] text-gray-400 font-bold font-arabic">{part.manufacturer}</span>}
            {part.delivery_supported && (
              <span className="text-[9px] text-emerald-600 font-bold font-arabic flex items-center gap-0.5">
                <Truck size={10} /> يوجد توصيل
              </span>
            )}
          </div>
          <button onClick={onClick} className="text-[11px] text-gray-400 font-bold font-arabic mt-1">
            عرض المزيد من التفاصيل...
          </button>
        </div>
      </div>
    </motion.div>
  );
};
