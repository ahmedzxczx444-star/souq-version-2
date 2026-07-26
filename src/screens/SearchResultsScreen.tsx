import React, { useEffect, useState } from "react";
import { ChevronLeft, Search, Loader2 } from "lucide-react";
import { Car, User } from "../types";
import { api } from "../services/api";
import { CarCard } from "../components/CarCard";
import { motion } from "motion/react";

interface SearchResultsScreenProps {
  query: string;
  onBack: () => void;
  onCarClick: (car: Car) => void;
  favorites: number[];
  toggleFavorite: (id: number) => void;
  t: any;
  user: User | null;
}

export const SearchResultsScreen: React.FC<SearchResultsScreenProps> = ({ 
  query, 
  onBack, 
  onCarClick, 
  favorites, 
  toggleFavorite, 
  t,
  user
}) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [noExactMatch, setNoExactMatch] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const data = await api.search.query(query);
        setCars(data.results);
        setNoExactMatch(data.noExactMatch);
      } catch (error) {
        console.error("Failed to fetch search results:", error);
        setCars([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 bg-white sticky top-0 z-10 border-b border-gray-50">
        <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black text-gray-900 tracking-tight">{t.search}</h1>
          <p className="text-xs font-bold text-gray-400 capitalize">"{query}"</p>
        </div>
      </header>

      <main className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
            <p className="text-sm font-bold text-gray-400">جاري البحث...</p>
          </div>
        ) : cars.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 bg-emerald-500 rounded-full" />
              <p className="text-gray-900 font-black">{cars.length} {t.carsFound}</p>
            </div>
            {noExactMatch && (
              <p className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 -mt-2">
                لم نجد نتائج مطابقة تمامًا لبحثك، إليك أقرب السيارات المتاحة:
              </p>
            )}

            <div className="grid gap-6">
              {cars.map((car) => (
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
                  user={user}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center mb-6 text-gray-300">
              <Search size={40} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">لا توجد نتائج</h3>
            <p className="text-gray-400 text-sm font-medium max-w-[240px]">
              لم نجد أي سيارات مطابقة لبحثك. جرّب كلمات مختلفة أو تصفح أحدث السيارات المعروضة.
            </p>
            <button
              onClick={onBack}
              className="mt-8 px-8 py-3 bg-black text-white rounded-2xl font-bold text-sm shadow-xl shadow-black/10 transition-all active:scale-95"
            >
              العودة
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
