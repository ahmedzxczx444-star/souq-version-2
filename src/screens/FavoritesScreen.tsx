import React, { useEffect, useState } from "react";
import { Car } from "../types";
import { api } from "../services/api";
import { CarCard } from "../components/CarCard";
import { Heart } from "lucide-react";
import { motion } from "motion/react";

interface FavoritesScreenProps {
  onCarClick: (car: Car) => void;
  favorites: number[];
  toggleFavorite: (id: number) => void;
  t: any;
  user?: any; // ADDED
}

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ onCarClick, favorites, toggleFavorite, t, user }) => { // UPDATED
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.favorites.getAll().then((data) => {
      setCars(data);
      setLoading(false);
    });
  }, [favorites]);

  return (
    <div className="pb-24 pt-6 px-4 max-w-md mx-auto min-h-screen bg-white">
      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tighter text-gray-900">{t.favorites}</h1>
        <p className="text-gray-500 text-sm font-medium">{t.findDreamRide}</p>
      </header>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : cars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Heart size={32} className="text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">{t.noFavorites}</h3>
          <p className="text-gray-500 text-sm max-w-[200px] mt-1 font-medium">
            {t.tapHeart}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {cars.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              onClick={() => onCarClick(car)}
              isFavorite={true}
              onFavoriteToggle={(e) => {
                e.stopPropagation();
                toggleFavorite(car.id);
              }}
              t={t}
              user={user} // ADDED
            />
          ))}
        </div>
      )}
    </div>
  );
};

