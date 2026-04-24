import React, { useEffect, useState } from "react";
import { Dealer } from "../types";
import { api } from "../services/api";
import { DealerCard } from "../components/DealerCard";
import { ChevronLeft, Trophy } from "lucide-react";
import { motion } from "motion/react";

interface AllDealersScreenProps {
  onBack: () => void;
  onDealerClick: (id: number) => void;
  t: any;
}

export const AllDealersScreen: React.FC<AllDealersScreenProps> = ({ onBack, onDealerClick, t }) => {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.dealers.getAll().then((data) => {
      setDealers(data);
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
          <h1 className="text-2xl font-black tracking-tighter text-gray-900">{t.topDealers}</h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">{dealers.length} {t.officialDealer}</p>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {dealers.map((dealer) => (
            <DealerCard 
              key={dealer.id} 
              dealer={dealer} 
              onClick={() => onDealerClick(dealer.id)} 
              t={t} 
              variant="image-top"
            />
          ))}
        </div>
      )}
    </div>
  );
};
