import heroImg from "../assets/hero.jpg";
import React, { useEffect, useState } from "react";
import { Car, Dealer } from "../types";
import { api } from "../services/api";
import { CarCard } from "../components/CarCard";
import { DealerCard } from "../components/DealerCard";
import { Search, Filter, SlidersHorizontal, Languages, Crown, Trophy, ChevronLeft, X, ChevronDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HomeScreenProps {
  onCarClick: (car: Car) => void;
  onDealerClick: (id: number) => void;
  favorites: number[];
  toggleFavorite: (id: number) => void;
  t: any;
  toggleLanguage: () => void;
  onFeedModeChange?: (isFeed: boolean) => void;
  onSmartAIClick: () => void;
  onNavigate: (screen: any) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onCarClick, onDealerClick, favorites, toggleFavorite, t, toggleLanguage, onSmartAIClick, onNavigate }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [topDealers, setTopDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    city: "",
    minYear: "",
    maxMileage: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      const [carsData, topDealersData] = await Promise.all([
        api.cars.getAll(),
        api.dealers.getAll("top"),
      ]);
      setCars(carsData);
      setTopDealers(topDealersData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredCars = cars.filter(car => {
    const make = car.make?.toLowerCase() || "";
    const model = car.model?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    const matchesSearch = make.includes(query) || model.includes(query);
    
    const carPrice = Number(car.price) || 0;
    const matchesMinPrice = !filters.minPrice || carPrice >= Number(filters.minPrice);
    const matchesMaxPrice = !filters.maxPrice || carPrice <= Number(filters.maxPrice);
    
    const carLocation = (car.location || car.dealer_location || "").toLowerCase();
    const filterCity = (filters.city || "").toLowerCase();
    const matchesCity = !filters.city || carLocation.includes(filterCity);
    
    const carYear = Number(car.year) || 0;
    const matchesMinYear = !filters.minYear || carYear >= Number(filters.minYear);
    
    const carMileage = Number(car.mileage) || 0;
    const matchesMaxMileage = !filters.maxMileage || carMileage <= Number(filters.maxMileage);

    return matchesSearch && matchesMinPrice && matchesMaxPrice && matchesCity && matchesMinYear && matchesMaxMileage;
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const cities = Array.from(new Set(cars.map(car => car.location || car.dealer_location).filter(Boolean)));

  return (
    <div className="pb-24 max-w-md mx-auto min-h-screen bg-white overflow-x-hidden">
      {/* Hero Section */}
      <header className="relative h-[500px] flex flex-col items-center pt-16 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImg}
            className="w-full h-full object-cover scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-emerald-950/40 to-white" />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="relative z-10 w-full flex flex-col items-center">
          <div className="flex justify-between items-center w-full mb-12">
            <div className="w-10" /> {/* Spacer */}
            <h1 className="text-5xl font-black tracking-tight text-white drop-shadow-[0_8px_8px_rgba(0,0,0,0.8)]">{t.appName}</h1>
            <button 
              onClick={toggleLanguage}
              className="w-10 h-10 bg-white/5 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white font-bold text-xs border border-white/10"
            >
              {t.switchLanguage === "English" ? "EN" : "AR"}
            </button>
          </div>

          <div className="w-full flex gap-3 items-center">
            <div className="flex-1 bg-white/95 backdrop-blur-md rounded-full p-1.5 flex items-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20">
              <button 
                onClick={handleSearch}
                className="bg-[#064e3b] hover:bg-[#065f46] text-white px-6 py-3.5 rounded-full font-bold text-sm transition-all active:scale-95 shadow-lg"
              >
                {t.search}
              </button>
              <div className="flex-1 flex items-center px-4 gap-3">
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full bg-transparent py-4 text-sm font-medium focus:outline-none text-gray-900 placeholder:text-gray-400 text-right"
                />
                <Search className="text-gray-400" size={20} />
              </div>
            </div>
            <button 
              onClick={onSmartAIClick}
              className="h-14 px-4 bg-emerald-500 rounded-2xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-white active:scale-95 transition-all"
            >
              <Sparkles size={20} />
              <span className="font-bold text-sm whitespace-nowrap">سوق السيارات الذكي</span>
            </button>
          </div>
        </div>
      </header>

      {/* Filter Modal */}
      <AnimatePresence>
        {showFilter && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilter(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white rounded-t-[40px] p-8 pb-12 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black text-gray-900">{t.filter}</h2>
                <button 
                  onClick={() => setShowFilter(false)}
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar pr-2">
                {/* Price Range */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t.priceRange}</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <input
                        type="number"
                        placeholder={t.fromPrice}
                        value={filters.minPrice}
                        onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-[#064e3b]/20 text-right text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder={t.toPrice}
                        value={filters.maxPrice}
                        onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-[#064e3b]/20 text-right text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* City */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t.city}</label>
                  <div className="relative">
                    <select
                      value={filters.city}
                      onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 text-sm font-bold appearance-none focus:ring-2 focus:ring-[#064e3b]/20 text-right text-gray-900"
                    >
                      <option value="">{t.allCities}</option>
                      {cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>

                {/* Year */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t.minYear}</label>
                  <input
                    type="number"
                    placeholder="2020"
                    value={filters.minYear}
                    onChange={(e) => setFilters({ ...filters, minYear: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-[#064e3b]/20 text-right text-gray-900 placeholder:text-gray-400"
                  />
                </div>

                {/* Mileage */}
                <div className="space-y-3">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t.maxMileage}</label>
                  <input
                    type="number"
                    placeholder="50000"
                    value={filters.maxMileage}
                    onChange={(e) => setFilters({ ...filters, maxMileage: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl py-4 px-5 text-sm font-bold focus:ring-2 focus:ring-[#064e3b]/20 text-right text-gray-900 placeholder:text-gray-400"
                  />
                </div>
              </div>

              <button
                onClick={() => setShowFilter(false)}
                className="w-full bg-[#064e3b] text-white py-5 rounded-2xl font-black text-lg mt-8 shadow-xl shadow-emerald-900/20 active:scale-[0.98] transition-all"
              >
                {t.showResults}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top Dealers Section */}
      <section className="relative z-10 -mt-24 px-4 mb-6">
        <div className="bg-white rounded-[32px] p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-gray-900">{t.topDealers}</h2>
            <button 
              onClick={() => onNavigate("all-dealers")}
              className="text-xs font-bold text-[#1a4d3e] uppercase tracking-wider"
            >
              {t.viewAll}
            </button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {loading ? (
              [1, 2].map(i => <div key={i} className="w-64 h-48 bg-gray-100 animate-pulse rounded-2xl flex-shrink-0" />)
            ) : (
              topDealers.map(dealer => (
                <DealerCard 
                  key={dealer.id} 
                  dealer={dealer} 
                  onClick={() => onDealerClick(dealer.id)} 
                  t={t} 
                  variant="image-top"
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Featured Cars Section (Card Style like Top Dealers) */}
      <section className="px-4 mb-6">
        <div className="bg-white rounded-[32px] p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔥</span>
              <h2 className="text-xl font-black text-gray-900">{t.featuredCars}</h2>
            </div>
            <button 
              onClick={() => onNavigate("featured-cars")}
              className="text-xs font-bold text-[#1a4d3e] uppercase tracking-wider"
            >
              {t.viewAll}
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            {loading ? (
              [1, 2].map(i => <div key={i} className="w-48 h-64 bg-gray-100 animate-pulse rounded-2xl flex-shrink-0" />)
            ) : (
              cars
                .filter(car => car.featured || (car.views + (car.favorites_count || 0)) > 50)
                .slice(0, 10)
                .map((car) => (
                <div key={car.id} className="w-48 flex-shrink-0">
                  <CarCard
                    car={car}
                    onClick={() => onCarClick(car)}
                    isFavorite={favorites.includes(car.id)}
                    onFavoriteToggle={(e) => {
                      e.stopPropagation();
                      toggleFavorite(car.id);
                    }}
                    t={t}
                    variant="grid"
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Instagram Style Feed Section */}
      <section className="px-4 space-y-6">
        <div className="flex items-center gap-2 px-2">
          <div className="w-1 h-6 bg-[#1a4d3e] rounded-full" />
          <h2 className="text-xl font-black text-gray-900">{t.findDreamRide}</h2>
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[400px] bg-white/5 animate-pulse rounded-3xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {filteredCars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                onClick={() => onCarClick(car)}
                isFavorite={favorites.includes(car.id)}
                onFavoriteToggle={(e) => {
                  e.stopPropagation();
                  toggleFavorite(car.id);
                }}
                t={t}
                variant="feed"
              />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-12 px-6 pb-12 border-t border-gray-100 pt-12 text-center">
        <div className="flex flex-col items-center gap-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{t.appName}</h2>
          
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
            <button 
              onClick={() => onNavigate("terms")}
              className="text-gray-400 hover:text-black text-sm font-bold transition-colors"
            >
              الشروط والأحكام
            </button>
            <button 
              onClick={() => onNavigate("privacy")}
              className="text-gray-400 hover:text-black text-sm font-bold transition-colors"
            >
              سياسة الخصوصية
            </button>
            <button 
              onClick={() => onNavigate("contact")}
              className="text-gray-400 hover:text-black text-sm font-bold transition-colors"
            >
              تواصل معنا
            </button>
          </div>

          <p className="text-gray-500 text-xs font-medium mt-4">
            © {new Date().getFullYear()} {t.appName}. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
};




