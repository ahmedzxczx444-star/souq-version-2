import React, { useEffect, useState } from "react";
import { Dealer, Car, User, Reel } from "../types";
import { api } from "../services/api";
import { ChevronLeft, MapPin, Phone, Star, ShieldCheck, Loader2, Play, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DealerScreenProps {
  dealerId: number;
  onBack: () => void;
  onCarClick: (car: Car) => void;
  onReelClick: (id: number) => void;
  favorites: number[];
  toggleFavorite: (id: number) => void;
  t: any;
  user: User | null;
}

type GridItem = 
  | { type: 'car'; data: Car; timestamp: number }
  | { type: 'reel'; data: Reel; timestamp: number };

export const DealerScreen: React.FC<DealerScreenProps> = ({ dealerId, onBack, onCarClick, onReelClick, favorites, toggleFavorite, t, user }) => {
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [isRating, setIsRating] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [showAllBranches, setShowAllBranches] = useState(false);

  useEffect(() => {
    fetchData();
    if (user) {
      fetchFollowStatus();
    }
  }, [dealerId, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dealerData, allReels] = await Promise.all([
        api.dealers.getById(dealerId),
        api.reels.getAll()
      ]);
      setDealer(dealerData);
      setReels(allReels.filter(r => r.dealer_id === dealerId));
    } catch (e) {
      console.error("Failed to fetch dealer data");
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowStatus = async () => {
    try {
      const { followed } = await api.dealers.getFollowStatus(dealerId);
      setIsFollowing(followed);
    } catch (e) {
      console.error("Failed to fetch follow status");
    }
  };

  const handleFollow = async () => {
    if (!user) {
      alert("يرجى تسجيل الدخول للمتابعة");
      return;
    }
    setIsFollowLoading(true);
    try {
      const { followed } = await api.dealers.follow(dealerId);
      setIsFollowing(followed);
      fetchData();
    } catch (e) {
      alert("فشل تحديث المتابعة");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleRate = async (value: number) => {
    if (!user) {
      alert("يرجى تسجيل الدخول للتقييم");
      return;
    }
    if (user.role === 'dealer' && user.dealerId === dealerId) {
      alert("لا يمكنك تقييم معرضك الخاص");
      return;
    }
    
    setIsRating(true);
    try {
      await api.dealers.rate(dealerId, value);
      setRating(value);
      fetchData(); // Refresh to get new average
    } catch (e) {
      alert("فشل إرسال التقييم");
    } finally {
      setIsRating(false);
    }
  };

  if (loading || !dealer) return null;

  const gridItems: GridItem[] = [
    ...(dealer.cars || []).map(car => ({
      type: 'car' as const,
      data: car,
      timestamp: new Date(car.createdAt || 0).getTime()
    })),
    ...reels.map(reel => ({
      type: 'reel' as const,
      data: reel,
      timestamp: new Date(reel.created_at).getTime()
    }))
  ].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="bg-white min-h-screen pb-24">
      <div className="bg-white px-6 pt-6 pb-8 rounded-b-[40px] shadow-sm border-b border-gray-100">
        <button onClick={onBack} className="p-3 bg-gray-100 rounded-2xl mb-6">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>

        <div className="flex items-center gap-6 mb-6">
          <img src={dealer.logo} className="w-24 h-24 rounded-3xl object-cover shadow-xl" referrerPolicy="no-referrer" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black tracking-tight">{dealer.name}</h1>
              {(dealer.planType === 'plus' || dealer.planType === 'premium') && (
                <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg text-xs font-bold">
                  <ShieldCheck size={14} />
                  <span>معرض موثق</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm font-bold text-gray-400">
              <div className="flex items-center gap-1 text-amber-500">
                <Star size={14} className="fill-amber-500" />
                <span>{dealer.rating ? Number(dealer.rating).toFixed(1) : "0.0"}</span>
              </div>
              <span>•</span>
              <span>{t.verifiedDealer}</span>
              {dealer.branches && dealer.branches.length > 0 && (
                <>
                  <span>•</span>
                  <span>{dealer.branches.length} فروع</span>
                </>
              )}
              <span>•</span>
              <span className="text-emerald-500">{dealer.followers_count || 0} متابع</span>
            </div>
          </div>
        </div>

        {user && user.role !== 'dealer' && (
          <button
            onClick={handleFollow}
            disabled={isFollowLoading}
            className={`w-full mb-6 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
              isFollowing 
                ? "bg-gray-100 text-gray-500" 
                : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
            }`}
          >
            {isFollowLoading ? <Loader2 size={18} className="animate-spin" /> : (
              <>
                {isFollowing ? "إلغاء المتابعة" : "متابعة المعرض"}
              </>
            )}
          </button>
        )}

        <p className="text-gray-500 text-sm font-medium leading-relaxed mb-6">
          {dealer.description}
        </p>

        {/* Rating Section */}
        {user && user.role !== 'dealer' && (
          <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase mb-3">قيم هذا المعرض</p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => handleRate(star)}
                  disabled={isRating}
                  className="transition-transform active:scale-90"
                >
                  <Star
                    size={24}
                    className={`${
                      (hoveredStar || rating) >= star
                        ? "text-amber-500 fill-amber-500"
                        : "text-gray-200"
                    } transition-colors`}
                  />
                </button>
              ))}
              {isRating && <Loader2 size={16} className="animate-spin text-gray-400 ml-2" />}
            </div>
          </div>
        )}

        {dealer.address && (
          <div className="flex items-center gap-2 text-gray-500 text-sm font-bold mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <MapPin size={16} className="text-gray-400" />
            <span>{dealer.address}</span>
          </div>
        )}

        {/* Branches Section */}
        {dealer.branches && dealer.branches.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-bold text-gray-400 uppercase mb-3 px-1">فروعنا</p>
            <div className="grid grid-cols-1 gap-2">
              {(showAllBranches ? dealer.branches : dealer.branches.slice(0, 3)).map((branch, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                      <MapPin size={16} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{branch.name}</p>
                      <p className="text-[10px] font-bold text-gray-400">{branch.address}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {branch.phone && (
                      <a href={`tel:${branch.phone}`} className="p-2 bg-white rounded-xl shadow-sm text-gray-400 hover:text-black transition-colors">
                        <Phone size={14} />
                      </a>
                    )}
                    {branch.map_link && (
                      <a href={branch.map_link} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-xl shadow-sm text-gray-400 hover:text-black transition-colors">
                        <MapPin size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {dealer.branches.length > 3 && !showAllBranches && (
              <button 
                onClick={() => setShowAllBranches(true)}
                className="w-full mt-3 py-3 text-xs font-bold text-gray-400 hover:text-black transition-colors bg-gray-50 rounded-2xl border border-dashed border-gray-200"
              >
                عرض جميع الفروع ({dealer.branches.length})
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <a 
            href={`tel:${dealer.phone}`}
            className="flex-1 bg-black text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
          >
            <Phone size={18} />
            {t.contact}
          </a>
          {dealer.map_location_link && (
            <a 
              href={dealer.map_location_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-gray-100 text-gray-900 font-bold py-4 rounded-2xl flex items-center justify-center gap-2"
            >
              <MapPin size={18} />
              🗺 عرض الموقع على الخريطة
            </a>
          )}
        </div>
      </div>

      <div className="px-1 mt-8">
        <div className="px-5 mb-6">
          <h2 className="text-xl font-black">{t.inventory} ({gridItems.length})</h2>
        </div>
        
        <div className="grid grid-cols-3 gap-2 px-2">
          {gridItems.map((item) => {
            if (item.type === 'car') {
              const car = item.data;
              return (
                <motion.div
                  key={`car-${car.id}`}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onCarClick(car)}
                  className="relative aspect-square bg-gray-100 overflow-hidden cursor-pointer rounded-xl"
                >
                  <img 
                    src={car.images[0]} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {car.isPromoted && ( // ADDED
                    <div className="absolute top-1 right-1 bg-emerald-500 text-white p-1 rounded-md shadow-lg">
                      <Zap size={10} className="fill-white" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2 text-white">
                    <p className="text-[10px] font-black leading-tight truncate">{car.make} {car.model}</p>
                    <p className="text-[8px] font-bold opacity-80">{car.year} • {car.price.toLocaleString()} {t.currency}</p>
                  </div>
                </motion.div>
              );
            } else {
              const reel = item.data;
              return (
                <motion.div
                  key={`reel-${reel.id}`}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onReelClick(reel.id)}
                  className="relative aspect-square bg-gray-100 overflow-hidden cursor-pointer rounded-xl"
                >
                  <video 
                    src={reel.video_url} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20" />
                  <div className="absolute top-2 right-2 text-white drop-shadow-lg">
                    <Play size={16} fill="currentColor" />
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 text-white">
                    <p className="text-[10px] font-black leading-tight truncate">{reel.caption}</p>
                  </div>
                </motion.div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
};

