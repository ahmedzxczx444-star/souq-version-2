import React from "react";
import { Home, Film, Heart, User, Search } from "lucide-react";
import { motion } from "motion/react";

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  t: any;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, t }) => {
  const tabs = [
    { id: "home", icon: Home, label: t.home },
    { id: "reels", icon: Film, label: t.reels },
    { id: "favorites", icon: Heart, label: t.favorites },
    { id: "profile", icon: User, label: t.profile },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50 pb-safe">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex flex-col items-center relative"
          >
            <Icon
              size={24}
              className={isActive ? "text-black" : "text-gray-400"}
            />
            <span className={`text-[10px] mt-1 font-medium ${isActive ? "text-black" : "text-gray-400"}`}>
              {tab.label}
            </span>
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute -top-2 w-1 h-1 bg-black rounded-full"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
};
