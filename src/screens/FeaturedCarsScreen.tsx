import React, { useEffect, useState } from "react";
import { Car } from "../types";
import { api } from "../services/api";
import { CarCard } from "../components/CarCard";
import { ChevronLeft } from "lucide-react";
import { motion } from "motion/react";

interface FeaturedCarsScreenProps {
  onBack: () => void;
  onCarClick: (car: Car) => void;
  favorites: number[];
  toggleFavorite: (id: number) => void;
  t: any;
  user?: any; // ADDED
}

export const FeaturedCarsScreen: React.FC<FeaturedCarsScreenProps> = ({ onBack, onCarClick, favorites, toggleFavorite, t, user }) => { // UPDATED
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.cars.getAll().then((data) => {
      const featured = data.filter(car => car.featured || (car.views + (car.favorites_count || 0)) > 50);
      setCars(featured);
      setLoading(false);
    });
  }, []);

  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen bg-white">
      <header className="mb-8 flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-gray-100 rounded-xl">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tighter text-gray-900">{t.featuredCars}</h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">{cars.length} {t.carsCount}</p>
        </div>
      </header>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
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
              user={user} // ADDED
            />
          ))}
        </div>
      )}
    </div>
  );
};
