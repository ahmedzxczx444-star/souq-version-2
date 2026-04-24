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

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        // Fetch all cars and filter them on the frontend as per target functionality
        // but if the API supported search that would be better. 
        // Based on HomeScreen logic, it filters locally.
        const allCars = await api.cars.getAll();
        const filtered = allCars.filter(car => {
          const make = car.make?.toLowerCase() || "";
          const model = car.model?.toLowerCase() || "";
          const searchLower = query.toLowerCase();
          return make.includes(searchLower) || model.includes(searchLower);
        });
        setCars(filtered);
      } catch (error) {
        console.error("Failed to fetch search results:", error);
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
            <p className="text-sm font-bold text-gray-400">Searching...</p>
          </div>
        ) : cars.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 bg-emerald-500 rounded-full" />
              <p className="text-gray-900 font-black">{cars.length} {t.carsFound || "Results Found"}</p>
            </div>
            
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
            <h3 className="text-xl font-black text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-400 text-sm font-medium max-w-[200px]">
              We couldn't find any cars matching your search.
            </p>
            <button 
              onClick={onBack}
              className="mt-8 px-8 py-3 bg-black text-white rounded-2xl font-bold text-sm shadow-xl shadow-black/10 transition-all active:scale-95"
            >
              Go Back
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
