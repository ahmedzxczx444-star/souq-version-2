import React, { useState } from "react"; // UPDATED
import { Car, User } from "../types"; // UPDATED
import { Heart, MapPin, Calendar, Gauge, Share2, MessageCircle, ShieldCheck, Zap, Sparkles } from "lucide-react"; // UPDATED
import { motion } from "motion/react";
import { api } from "../services/api";
import { subscriptionsEnabled } from "../constants/config";
import { PromoteButton } from "./PromoteButton";

interface CarCardProps {
  car: Car;
  onClick: () => void;
  isFavorite?: boolean;
  onFavoriteToggle?: (e: React.MouseEvent) => void;
  t: any;
  variant?: "default" | "grid" | "feed";
  user?: User | null; // ADDED
}

export const CarCard: React.FC<CarCardProps> = ({ car, onClick, isFavorite, onFavoriteToggle, t, variant = "default", user }) => { // UPDATED
  const [isPromoting, setIsPromoting] = useState(false); // ADDED
  const isGrid = variant === "grid";
  const isFeed = variant === "feed";

  const isOwner = user?.id === car.dealer_user_id; // ADDED
  const isVerified = car.dealer_plan_type === 'plus' || car.dealer_plan_type === 'premium'; // ADDED

  const handlePromote = async (e: React.MouseEvent) => { // ADDED
    e.stopPropagation();
    if (!isOwner) return;
    
    setIsPromoting(true);
    try {
      const res = await api.cars.promote(car.id);
      alert(res.message);
      if (res.success) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Promotion failed:", err);
    } finally {
      setIsPromoting(false);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const carUrl = `${window.location.origin}/car/${car.id}`;
    const shareText = `السلام عليكم، أنا مهتم بسيارة ${car.make} ${car.model} ${car.year} موديل الموجودة على سوق السيارات.
السعر: ${car.price.toLocaleString()} ج.م
الرابط: ${carUrl}
الصورة: ${car.images[0]}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${car.make} ${car.model}`,
          text: shareText,
          url: carUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
      // Also copy to clipboard as a secondary fallback
      try {
        await navigator.clipboard.writeText(carUrl);
        alert("تم نسخ الرابط!");
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  if (isGrid) {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer flex flex-col group"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <img
            src={car.images[0]}
            alt={`${car.make} ${car.model}`}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-1.5 ltr:left-1.5 rtl:right-1.5 flex flex-col gap-1 items-start">
            <div className="bg-[#1a4d3e] text-white text-[8px] font-black px-2 py-0.5 rounded-md shadow-md">
              {car.price.toLocaleString()}
            </div>
            <div className={`text-white text-[7px] font-black px-1.5 py-0.5 rounded-md shadow-sm uppercase tracking-tighter ${
              car.status === 'sold' ? 'bg-rose-500' : 
              car.status === 'reserved' ? 'bg-amber-500' : 
              'bg-emerald-500'
            }`}>
              {t[car.status || 'available']}
            </div>
            {car.isPromoted && subscriptionsEnabled && ( // UPDATED
              <div className="bg-emerald-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-md shadow-sm flex items-center gap-0.5">
                <Zap size={8} className="fill-white" />
                <span>ترويج</span>
              </div>
            )}
            {car.featured && (
              <div className="bg-amber-400 text-white text-[7px] font-black px-1.5 py-0.5 rounded-md shadow-sm flex items-center gap-0.5">
                <span>🔥</span>
                <span>{t.featured}</span>
              </div>
            )}
          </div>
          <div className="absolute top-1.5 ltr:right-1.5 rtl:left-1.5 flex items-center gap-1">
            <button
              onClick={handleShare}
              className="p-1.5 text-white drop-shadow-md"
            >
              <Share2 size={14} strokeWidth={2.5} />
            </button>
            <button
              onClick={onFavoriteToggle}
              className="p-1.5 text-white drop-shadow-md"
            >
              <Heart
                size={14}
                className={isFavorite ? "fill-red-500 text-red-500" : "text-white"}
                strokeWidth={2.5}
              />
            </button>
          </div>
        </div>
        <div className="p-2 flex-1 flex flex-col justify-between">
          <div className="mb-1">
            <h3 className="font-black text-gray-900 text-[10px] leading-tight truncate font-arabic">
              {car.make} {car.model}
            </h3>
            <div className="flex justify-between items-center mt-0.5">
              <span className="text-[8px] font-bold text-gray-400 font-arabic">
                {car.year} موديل
              </span>
            </div>
          </div>
            <div className="flex flex-col gap-1 text-[7px] text-gray-400 font-bold mt-1.5 pt-1.5 border-t border-gray-50">
            <div className="flex items-center gap-1">
              <MapPin size={8} className="text-[#1a4d3e]" />
              <span className="truncate font-arabic">{car.location || car.dealer_location || "Cairo"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Gauge size={8} className="text-[#1a4d3e]" />
              <span className="opacity-70 font-arabic">{car.mileage.toLocaleString()} كم</span>
              <span className="mx-1 opacity-20">|</span>
              <span className={`px-1.5 py-0.5 rounded-md text-[6px] font-black uppercase ${
                car.status === 'sold' ? 'bg-rose-100 text-rose-600' : 
                car.status === 'reserved' ? 'bg-amber-100 text-amber-600' : 
                'bg-emerald-100 text-emerald-600'
              }`}>
                {t[car.status || 'available']}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (isFeed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="bg-white border-b border-gray-100 pb-4 mb-4"
      >
        {/* Post Header */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-100 p-[1.5px]">
              <div className="w-full h-full rounded-full bg-white p-[1px]">
                <div className="w-full h-full rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-[10px] font-black text-gray-500">
                  {car.dealer_logo ? (
                    <img src={car.dealer_logo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    car.make[0]
                  )}
                </div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h4 className="text-xs font-black text-gray-900 font-arabic leading-none">
                  {car.dealer_name || "معرض الجردي"}
                </h4>
                {isVerified && subscriptionsEnabled && ( // UPDATED
                  <div className="flex items-center gap-0.5 bg-emerald-50 text-emerald-600 px-1 py-0.5 rounded text-[8px] font-bold">
                    <ShieldCheck size={8} />
                    <span>معرض موثق</span>
                  </div>
                )}
              </div>
              <p className="text-[9px] text-gray-400 font-bold font-arabic mt-0.5">
                {car.location || car.dealer_location || "القاهرة"} • منذ ساعتين
              </p>
            </div>
          </div>
          <button onClick={handleShare} className="text-gray-400">
            <Share2 size={18} />
          </button>
        </div>

        {/* Post Image */}
        <div 
          onClick={onClick}
          className="relative aspect-square w-full overflow-hidden bg-gray-100 cursor-pointer"
        >
          <img
            src={car.images[0]}
            alt={car.make}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className={`absolute top-3 ltr:left-3 rtl:right-3 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg ${
            car.status === 'sold' ? 'bg-rose-500' : 
            car.status === 'reserved' ? 'bg-amber-500' : 
            'bg-emerald-500'
          }`}>
            {t[car.status || 'available']}
          </div>
          {car.isPromoted && subscriptionsEnabled && ( // UPDATED
            <div className="absolute top-12 ltr:left-3 rtl:right-3 bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
              <Zap size={10} className="fill-white" />
              <span>ترويج</span>
            </div>
          )}
          {car.featured && (
            <div className={`absolute ${car.isPromoted ? 'top-[84px]' : 'top-12'} ltr:left-3 rtl:right-3 bg-amber-400 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1`}>
              <span>🔥</span>
              <span>{t.featured}</span>
            </div>
          )}
          {car.images.length > 1 && (
            <div className="absolute top-3 ltr:right-3 rtl:left-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full">
              1/{car.images.length}
            </div>
          )}
        </div>

        {/* Post Actions */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <button onClick={onFavoriteToggle}>
                <Heart
                  size={24}
                  className={isFavorite ? "fill-red-500 text-red-500" : "text-gray-900"}
                />
              </button>
              <button onClick={handleShare}>
                <Share2 size={24} className="text-gray-900" />
              </button>
              {isOwner && subscriptionsEnabled && ( // UPDATED
                <PromoteButton 
                  carId={car.id} 
                  userId={user!.id} 
                  isPromoted={car.isPromoted} 
                  onSuccess={() => window.location.reload()} 
                />
              )}
            </div>
            <div className="text-sm font-black text-[#1a4d3e] font-arabic">
              {car.price.toLocaleString()} ج.م
            </div>
          </div>

          {/* Post Content */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-gray-900 font-arabic">
                {car.dealer_name || "معرض الجردي"}
              </span>
              <p className="text-xs font-bold text-gray-900 font-arabic">
                {car.make} {car.model} {car.year}
              </p>
            </div>
            <p className="text-[11px] text-gray-600 font-arabic leading-relaxed">
              {car.description.slice(0, 100)}...
            </p>
            <button 
              onClick={onClick}
              className="text-[11px] text-gray-400 font-bold font-arabic mt-1"
            >
              عرض المزيد من التفاصيل...
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Immersive Reel View
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full h-screen snap-start snap-always overflow-hidden bg-black"
    >
      {/* Background Image/Video */}
      <img
        src={car.images[0]}
        alt={car.make}
        className="w-full h-full object-cover opacity-80"
        referrerPolicy="no-referrer"
      />
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90" />

      {/* Right Side Actions */}
      <div className="absolute right-4 bottom-32 flex flex-col gap-6 items-center z-20">
        <button 
          onClick={onFavoriteToggle}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-all">
            <Heart size={24} className={isFavorite ? "fill-red-500 text-red-500" : "text-white"} />
          </div>
          <span className="text-[10px] font-bold text-white shadow-sm">1.2k</span>
        </button>
        
        <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-all">
            <Share2 size={24} className="text-white" />
          </div>
          <span className="text-[10px] font-bold text-white shadow-sm">Share</span>
        </button>
      </div>

      {/* Bottom Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-8 pt-20 bg-gradient-to-t from-black via-black/40 to-transparent z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center font-black text-xs text-white shadow-lg shadow-emerald-500/20">
            SJ
          </div>
          <div>
            <h4 className="text-sm font-black text-white font-arabic">معرض الجردي</h4>
            <p className="text-[10px] text-emerald-400 font-bold font-arabic">مصر حصري • متصل الآن</p>
          </div>
        </div>

        <h2 className="text-2xl font-black text-white mb-2 font-arabic tracking-tight">
          {car.make} {car.model} {car.year}
        </h2>
        
        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
            <Gauge size={14} className="text-emerald-400" />
            <span className="text-xs font-bold text-white/80">{car.mileage.toLocaleString()} كم</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
            <Calendar size={14} className="text-emerald-400" />
            <span className="text-xs font-bold text-white/80">{car.year}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">السعر</span>
            <span className="text-2xl font-black text-emerald-400">{car.price.toLocaleString()} ج.م</span>
          </div>
          <button className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors">
            تواصل الآن
          </button>
        </div>
      </div>
    </motion.div>
  );
};


