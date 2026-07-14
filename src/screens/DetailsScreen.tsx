import React, { useEffect, useState } from "react";
import { Car, Dealer, User } from "../types";
import { api } from "../services/api";
import { ChevronLeft, Heart, Share2, MapPin, Phone, Info, Calendar, Gauge, Fuel, Settings2, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DetailsScreenProps {
  carId: number;
  onBack: () => void;
  onDealerClick: (id: number) => void;
  isFavorite: boolean;
  toggleFavorite: (id: number) => void;
  t: any;
  user: User | null;
}

export const DetailsScreen: React.FC<DetailsScreenProps> = ({ carId, onBack, onDealerClick, isFavorite, toggleFavorite, t, user }) => {
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    api.cars.getById(carId).then((data) => {
      setCar(data);
      setLoading(false);
    });
  }, [carId]);

  const handleShare = () => {
    if (!car) return;
    const carUrl = `${window.location.origin}/car/${car.id}`;
    const shareText = `شوف العربية دي على سوق السيارات:
${car.make} ${car.model} ${car.year}
السعر: ${car.price.toLocaleString()} ج.م
الرابط:
${carUrl}`;

    if (navigator.share) {
      navigator.share({
        title: `${car.make} ${car.model}`,
        text: shareText,
        url: carUrl,
      }).catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      });
    } else {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const formatWhatsAppNumber = (number?: string) => {
    if (!number) return "";
    let digits = number.replace(/\D/g, "");
    if (digits.startsWith("00")) digits = digits.slice(2);
    if (digits.startsWith("0")) digits = "20" + digits.slice(1);
    else if (!digits.startsWith("20")) digits = "20" + digits;
    return digits;
  };

  if (loading || !car) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const specs = [
    { icon: Calendar, label: t.year, value: car.year },
    { icon: Gauge, label: t.mileage, value: `${car.mileage.toLocaleString()} mi` },
    { icon: Fuel, label: t.fuel, value: car.fuel_type },
    { icon: Settings2, label: t.trans, value: car.transmission },
  ];

  return (
    <div className="bg-white min-h-screen pb-32">
      {/* Header */}
      <div className="relative h-[45vh] group">
        <AnimatePresence mode="wait">
          <motion.img
            key={activeImage}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            src={car.images[activeImage]}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </AnimatePresence>
        
        {/* Navigation Arrows */}
        {car.images.length > 1 && (
          <>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setActiveImage(prev => (prev === 0 ? car.images.length - 1 : prev - 1));
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 backdrop-blur-md rounded-full text-white border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setActiveImage(prev => (prev === car.images.length - 1 ? 0 : prev + 1));
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/20 backdrop-blur-md rounded-full text-white border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft size={24} className="rotate-180" />
            </button>
          </>
        )}

        <div className="absolute top-6 ltr:left-4 ltr:right-4 rtl:right-4 rtl:left-4 flex justify-between items-center">
          <button onClick={onBack} className="p-3 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 text-white">
            <ChevronLeft size={24} className="rtl:rotate-180" />
          </button>
          <div className="flex gap-2">
            <button onClick={handleShare} className="p-3 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 text-white">
              <Share2 size={20} />
            </button>
            <button 
              onClick={() => toggleFavorite(car.id)}
              className={`p-3 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 ${isFavorite ? 'text-red-500' : 'text-white'}`}
            >
              <Heart size={20} className={isFavorite ? "fill-red-500" : ""} />
            </button>
          </div>
        </div>

        {car.images.length > 1 && (
          <div className="absolute bottom-6 left-0 right-0 px-6">
            <div className="flex justify-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {car.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`relative flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition-all ${
                    activeImage === i ? "border-white scale-110 shadow-lg" : "border-transparent opacity-60 scale-90"
                  }`}
                >
                  <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-6 -mt-8 relative z-10 bg-white rounded-t-[32px] pt-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-1">{car.make} {car.model}</h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-500 font-medium">
                <MapPin size={14} />
                <span className="text-sm">{car.dealer_location}</span>
              </div>
              <div className={`text-white text-[10px] font-black px-3 py-1 rounded-full shadow-sm uppercase tracking-tight ${
                car.status === 'sold' ? 'bg-rose-500' : 
                car.status === 'reserved' ? 'bg-amber-500' : 
                'bg-emerald-500'
              }`}>
                {t[car.status || 'available']}
              </div>
            </div>
          </div>
          <div className="ltr:text-right rtl:text-left">
            <p className="text-2xl font-black text-black">£{car.price.toLocaleString()}</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.fixedPrice}</p>
          </div>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {specs.map((spec, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-gray-100">
              <spec.icon size={18} className="text-gray-400 mb-2" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{spec.label}</span>
              <span className="text-xs font-bold text-gray-900 mt-0.5">{spec.value}</span>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">{t.description}</h2>
          <p className="text-gray-600 leading-relaxed text-sm font-medium">
            {car.description}
          </p>
        </div>

        {/* Dealer Card */}
        <div 
          onClick={() => onDealerClick(car.dealer_id)}
          className="bg-gray-900 rounded-3xl p-5 flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <img src={car.dealer_logo} className="w-12 h-12 rounded-2xl object-cover border-2 border-white/10" referrerPolicy="no-referrer" />
            <div>
              <h3 className="text-white font-bold">{car.dealer_name}</h3>
              <p className="text-gray-400 text-xs font-medium">{t.officialDealer}</p>
            </div>
          </div>
          <button className="bg-white/10 p-3 rounded-2xl text-white">
            <ChevronLeft size={20} className="ltr:rotate-180 rtl:rotate-0" />
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 p-6 flex gap-4 z-50">
        <a
          href={`https://wa.me/${formatWhatsAppNumber(car.dealer_whatsapp)}?text=${encodeURIComponent(`السلام عليكم، أنا مهتم بسيارة ${car.make} ${car.model} ${car.year} موديل الموجودة على سوق السيارات.
السعر: ${car.price.toLocaleString()} ج.م
الرابط: ${window.location.origin}/car/${car.id}
الصورة: ${car.images[0]}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-emerald-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
        >
          <MessageCircle size={20} />
          💬 واتساب
        </a>
        <a 
          href={`tel:${car.dealer_phone}`}
          className="flex-1 bg-black text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-black/20"
        >
          <Phone size={20} />
          {t.contact}
        </a>
      </div>
    </div>
  );
};

