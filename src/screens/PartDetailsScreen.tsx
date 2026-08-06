import React, { useEffect, useState } from "react";
import { Part } from "../types";
import { api } from "../services/api";
import { ChevronLeft, Share2, MapPin, Phone, Hash, Factory, Truck, MessageCircle, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toWhatsappLink } from "../../phoneUtils";

interface PartDetailsScreenProps {
  partId: number;
  onBack: () => void;
}

// Mirrors DetailsScreen.tsx's structure/classNames for the parts-domain detail view
// (Part 7 requirement). DetailsScreen.tsx itself is never modified.
export const PartDetailsScreen: React.FC<PartDetailsScreenProps> = ({ partId, onBack }) => {
  const [part, setPart] = useState<Part | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    api.parts.getById(partId).then((data) => {
      setPart(data);
      setLoading(false);
    });
  }, [partId]);

  const handleShare = () => {
    if (!part) return;
    const partUrl = `${window.location.origin}/part/${part.id}`;
    const shareText = `شوف قطعة الغيار دي على سوق السيارات:\n${part.name}\n${part.price ? part.price.toLocaleString() + " ج.م" : "اتصل للسعر"}\nالرابط:\n${partUrl}`;
    if (navigator.share) {
      navigator.share({ title: part.name, text: shareText, url: partUrl }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
    }
  };

  if (loading || !part) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAvailable = part.status === "available";
  const images = part.images && part.images.length > 0 ? part.images : [];
  const whatsappLink = toWhatsappLink(part.dealer_whatsapp);

  return (
    <div className="bg-white min-h-screen pb-32">
      <div className="relative h-[45vh] group bg-gray-100">
        {images.length > 0 ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={activeImage}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.4 }}
              src={images[activeImage]}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </AnimatePresence>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">لا توجد صورة</div>
        )}

        <div className="absolute top-6 ltr:left-4 ltr:right-4 rtl:right-4 rtl:left-4 flex justify-between items-center">
          <button onClick={onBack} className="p-3 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 text-white">
            <ChevronLeft size={24} className="rtl:rotate-180" />
          </button>
          <button onClick={handleShare} className="p-3 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 text-white">
            <Share2 size={20} />
          </button>
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-6 left-0 right-0 px-6">
            <div className="flex justify-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`relative flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${
                    activeImage === i ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60 scale-90"
                  }`}
                >
                  <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-6 -mt-8 relative z-10 bg-white rounded-t-[32px] pt-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 mb-1">🔧 {part.name}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-gray-500 font-medium">
                <MapPin size={14} />
                <span className="text-sm">{part.dealer_location || "القاهرة"}</span>
              </div>
              <div className={`text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm uppercase tracking-tight flex items-center gap-1 ${isAvailable ? "bg-emerald-500" : "bg-rose-500"}`}>
                {isAvailable ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {isAvailable ? "متاح" : "غير متاح"}
              </div>
            </div>
          </div>
          <div className="ltr:text-right rtl:text-left">
            <p className="text-2xl font-black text-black">{part.price ? `${part.price.toLocaleString()} ج.م` : "اتصل للسعر"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-8">
          {part.part_number && (
            <div className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-gray-100">
              <Hash size={18} className="text-gray-400 mb-2" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">رقم القطعة</span>
              <span className="text-xs font-bold text-gray-900 mt-0.5">{part.part_number}</span>
            </div>
          )}
          {part.manufacturer && (
            <div className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-gray-100">
              <Factory size={18} className="text-gray-400 mb-2" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">الشركة المصنعة</span>
              <span className="text-xs font-bold text-gray-900 mt-0.5">{part.manufacturer}</span>
            </div>
          )}
          {part.delivery_supported && (
            <div className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-gray-100">
              <Truck size={18} className="text-gray-400 mb-2" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">التوصيل</span>
              <span className="text-xs font-bold text-gray-900 mt-0.5">متاح</span>
            </div>
          )}
        </div>

        {part.compatibility && part.compatibility.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-3">السيارات المتوافقة</h2>
            <div className="flex flex-wrap gap-2">
              {part.compatibility.map((c, i) => (
                <span key={i} className="bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5 text-xs font-bold text-gray-700">
                  {c.make} {c.model || ""} {c.year_from ? `${c.year_from}${c.year_to ? "-" + c.year_to : "+"}` : ""}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-900 rounded-3xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {part.dealer_logo && (
              <img src={part.dealer_logo} className="w-12 h-12 rounded-2xl object-cover border-2 border-white/10" referrerPolicy="no-referrer" loading="lazy" decoding="async" />
            )}
            <div>
              <h3 className="text-white font-bold">{part.dealer_name || "معرض قطع غيار"}</h3>
              {part.dealer_address && <p className="text-gray-400 text-xs font-medium">{part.dealer_address}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 p-6 flex gap-4 z-50">
        {whatsappLink && (
          <a
            href={`${whatsappLink}?text=${encodeURIComponent(`السلام عليكم، أنا مهتم بقطعة غيار ${part.name} الموجودة على سوق السيارات.\nالرابط: ${window.location.origin}/part/${part.id}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-emerald-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
          >
            <MessageCircle size={20} />
            💬 واتساب
          </a>
        )}
        {part.dealer_phone && (
          <a
            href={`tel:${part.dealer_phone}`}
            className="flex-1 bg-black text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-black/20"
          >
            <Phone size={20} />
            اتصال
          </a>
        )}
      </div>
    </div>
  );
};
