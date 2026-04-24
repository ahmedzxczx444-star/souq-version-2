import React, { useState, useEffect } from "react";
import { HomeScreen } from "./screens/HomeScreen";
import { DetailsScreen } from "./screens/DetailsScreen";
import { ReelsScreen } from "./screens/ReelsScreen";
import { FavoritesScreen } from "./screens/FavoritesScreen";
import { DealerScreen } from "./screens/DealerScreen";
import { AuthScreen } from "./screens/AuthScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { AddCarScreen } from "./screens/AddCarScreen";
import { AddReelScreen } from "./screens/AddReelScreen";
import { DealerDashboard } from "./screens/DealerDashboard";
import { SmartAIScreen } from "./screens/SmartAIScreen";
import { AdminDashboard } from "./screens/AdminDashboard";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { PrivacySecurityScreen } from "./screens/PrivacySecurityScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { TermsScreen } from "./screens/TermsScreen";
import { PrivacyScreen } from "./screens/PrivacyScreen";
import { ContactScreen } from "./screens/ContactScreen";
import { FeaturedCarsScreen } from "./screens/FeaturedCarsScreen";
import { AllDealersScreen } from "./screens/AllDealersScreen";
import { SubscriptionPlans } from "./screens/SubscriptionPlans"; // ADDED
import { SearchResultsScreen } from "./screens/SearchResultsScreen";
import { BottomNav } from "./components/BottomNav";
import { Car, User } from "./types";
import { api } from "./services/api";
import { AnimatePresence, motion } from "motion/react";
import { Language, translations } from "./constants/translations";
import { Languages } from "lucide-react";

type Screen = "home" | "reels" | "favorites" | "profile" | "details" | "dealer" | "add-car" | "add-reel" | "dealer-dashboard" | "smart-ai" | "admin" | "notifications" | "privacy-security" | "settings" | "terms" | "privacy" | "contact" | "featured-cars" | "all-dealers" | "subscription-plans" | "search-results"; // UPDATED

export default function App() {
  const [activeTab, setActiveTab] = useState<Screen>("home");
  const [selectedCarId, setSelectedCarId] = useState<number | null>(null);
  const [selectedReelId, setSelectedReelId] = useState<number | null>(null);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Language>("ar");
  const [isFeedMode, setIsFeedMode] = useState(false);
  const [dashboardSection, setDashboardSection] = useState<'cars' | 'profile'>('cars');
  const [appSearchQuery, setAppSearchQuery] = useState("");

  const t = translations[lang];

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    const storedLang = localStorage.getItem("lang") as Language;
    if (storedLang) setLang(storedLang);
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      fetchFavorites();
    }
    
    if (window.location.pathname === "/admin") {
      setActiveTab("admin");
    }

    // Handle deep links
    const path = window.location.pathname;
    if (path.startsWith("/car/")) {
      const id = parseInt(path.split("/")[2]);
      if (!isNaN(id)) {
        setSelectedCarId(id);
        setActiveTab("details");
      }
    }

    if (path === "/search" || path === "/search-results") {
      const urlParams = new URLSearchParams(window.location.search);
      const q = urlParams.get('q');
      if (q) {
        setAppSearchQuery(q);
        setActiveTab("search-results");
      }
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("lang", lang);
  }, [lang]);

  const toggleLanguage = () => {
    setLang(prev => prev === "ar" ? "en" : "ar");
  };

  const fetchFavorites = async () => {
    try {
      const favs = await api.favorites.getAll();
      setFavorites(favs.map(f => f.id));
    } catch (e) {
      console.error("Failed to fetch favorites");
    }
  };

  const handleLogin = (user: User, token: string) => {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);
    setUser(user);
    fetchFavorites();
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    setFavorites([]);
    setActiveTab("home");
  };

  const toggleFavorite = async (carId: number) => {
    if (!user) {
      setActiveTab("profile");
      return;
    }
    try {
      await api.favorites.toggle(carId);
      setFavorites(prev => 
        prev.includes(carId) ? prev.filter(id => id !== carId) : [...prev, carId]
      );
    } catch (e) {
      console.error("Failed to toggle favorite");
    }
  };

  const navigateToDetails = (car: Car) => {
    setSelectedCarId(car.id);
    setActiveTab("details");
  };

  const navigateToDealer = (id: number) => {
    setSelectedDealerId(id);
    setActiveTab("dealer");
  };

  const navigateToReel = (id: number) => {
    setSelectedReelId(id);
    setActiveTab("reels");
  };

  if (loading) return null;

  const renderScreen = () => {
    switch (activeTab) {
      case "home":
        return <HomeScreen onCarClick={navigateToDetails} onDealerClick={navigateToDealer} favorites={favorites} toggleFavorite={toggleFavorite} t={t} toggleLanguage={toggleLanguage} onFeedModeChange={setIsFeedMode} onSmartAIClick={() => setActiveTab("smart-ai")} onNavigate={setActiveTab} user={user} />;
      case "reels":
        return <ReelsScreen onCarClick={(id) => { setSelectedCarId(id); setActiveTab("details"); }} onDealerClick={navigateToDealer} initialReelId={selectedReelId} />;
      case "favorites":
        if (!user) return <AuthScreen onSuccess={handleLogin} t={t} />;
        return <FavoritesScreen onCarClick={navigateToDetails} favorites={favorites} toggleFavorite={toggleFavorite} t={t} user={user} />;
      case "profile":
        if (!user) return <AuthScreen onSuccess={handleLogin} t={t} />;
        return (
          <ProfileScreen 
            user={user} 
            onLogout={handleLogout} 
            t={t} 
            onAddCar={() => { setEditingCar(null); setActiveTab("add-car"); }} 
            onDealerDashboard={(section = 'cars') => { setDashboardSection(section); setActiveTab("dealer-dashboard"); }}
            onNavigate={setActiveTab}
          />
        );
      case "dealer-dashboard":
        if (!user || user.role !== 'dealer') return <HomeScreen onCarClick={navigateToDetails} onDealerClick={navigateToDealer} favorites={favorites} toggleFavorite={toggleFavorite} t={t} toggleLanguage={toggleLanguage} onFeedModeChange={setIsFeedMode} onSmartAIClick={() => setActiveTab("smart-ai")} onNavigate={setActiveTab} />;
        return (
          <DealerDashboard 
            user={user} 
            onBack={() => setActiveTab("profile")} 
            onAddCar={() => { setEditingCar(null); setActiveTab("add-car"); }}
            onAddReel={() => setActiveTab("add-reel")}
            onEditCar={(car) => { setEditingCar(car); setActiveTab("add-car"); }}
            t={t}
            initialSection={dashboardSection}
          />
        );
      case "add-car":
        return (
          <AddCarScreen 
            onBack={() => setActiveTab(editingCar ? "dealer-dashboard" : "profile")} 
            onSuccess={() => setActiveTab(editingCar ? "dealer-dashboard" : "home")} 
            t={t} 
            initialCar={editingCar || undefined}
          />
        );
      case "add-reel":
        return (
          <AddReelScreen
            onBack={() => setActiveTab("dealer-dashboard")}
            onSuccess={() => setActiveTab("reels")}
            t={t}
          />
        );
      case "details":
        return selectedCarId ? (
          <DetailsScreen 
            carId={selectedCarId} 
            onBack={() => setActiveTab("home")} 
            onDealerClick={navigateToDealer}
            isFavorite={favorites.includes(selectedCarId)}
            toggleFavorite={toggleFavorite}
            t={t}
            user={user}
          />
        ) : null;
      case "dealer":
        return selectedDealerId ? (
          <DealerScreen 
            dealerId={selectedDealerId} 
            onBack={() => setActiveTab("details")} 
            onCarClick={navigateToDetails}
            onReelClick={navigateToReel}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            t={t}
            user={user}
          />
        ) : null;
      case "smart-ai":
        return (
          <SmartAIScreen
            onBack={() => setActiveTab("home")}
            onCarClick={navigateToDetails}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            t={t}
            user={user}
          />
        );
      case "admin":
        if (!user || user.role !== 'super_admin') {
          return <AuthScreen onSuccess={handleLogin} t={t} />;
        }
        return <AdminDashboard user={user} onLogout={handleLogout} t={t} />;
      case "notifications":
        if (!user) return <AuthScreen onSuccess={handleLogin} t={t} />;
        return <NotificationsScreen onBack={() => setActiveTab("profile")} t={t} />;
      case "privacy-security":
        if (!user) return <AuthScreen onSuccess={handleLogin} t={t} />;
        return <PrivacySecurityScreen onBack={() => setActiveTab("profile")} t={t} onLogout={handleLogout} />;
      case "settings":
        return <SettingsScreen onBack={() => setActiveTab("profile")} t={t} lang={lang} toggleLanguage={toggleLanguage} />;
      case "terms":
        return <TermsScreen onBack={() => setActiveTab("home")} />;
      case "privacy":
        return <PrivacyScreen onBack={() => setActiveTab("home")} />;
      case "contact":
        return <ContactScreen onBack={() => setActiveTab("home")} />;
      case "featured-cars":
        return <FeaturedCarsScreen onBack={() => setActiveTab("home")} onCarClick={navigateToDetails} favorites={favorites} toggleFavorite={toggleFavorite} t={t} user={user} />; // UPDATED
      case "all-dealers":
        return <AllDealersScreen onBack={() => setActiveTab("home")} onDealerClick={navigateToDealer} t={t} />;
      case "subscription-plans": // ADDED
        return <SubscriptionPlans onBack={() => setActiveTab("profile")} user={user} />;
      case "search-results":
        return (
          <SearchResultsScreen 
            query={appSearchQuery}
            onBack={() => setActiveTab("home")}
            onCarClick={navigateToDetails}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            t={t}
            user={user}
          />
        );
      default:
        return <HomeScreen onCarClick={navigateToDetails} onDealerClick={navigateToDealer} favorites={favorites} toggleFavorite={toggleFavorite} t={t} toggleLanguage={toggleLanguage} onSmartAIClick={() => setActiveTab("smart-ai")} onNavigate={setActiveTab} user={user} />; // UPDATED
    }
  };

  return (
    <div className={`bg-white min-h-screen font-sans selection:bg-black selection:text-white ${lang === 'ar' ? 'font-arabic' : ''}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + (selectedCarId || "") + (selectedDealerId || "") + lang}
          initial={{ opacity: 0, x: lang === 'ar' ? -10 : 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: lang === 'ar' ? 10 : -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>
      
      {activeTab !== "details" && activeTab !== "dealer" && activeTab !== "add-car" && activeTab !== "add-reel" && activeTab !== "smart-ai" && activeTab !== "admin" && activeTab !== "notifications" && activeTab !== "privacy-security" && activeTab !== "settings" && activeTab !== "terms" && activeTab !== "privacy" && activeTab !== "contact" && activeTab !== "featured-cars" && activeTab !== "all-dealers" && activeTab !== "search-results" && !isFeedMode && (
        <BottomNav activeTab={activeTab === "details" || activeTab === "dealer" || activeTab === "add-car" || activeTab === "add-reel" || activeTab === "smart-ai" || activeTab === "admin" || activeTab === "notifications" || activeTab === "privacy-security" || activeTab === "settings" || activeTab === "terms" || activeTab === "privacy" || activeTab === "contact" || activeTab === "featured-cars" || activeTab === "all-dealers" || activeTab === "search-results" ? "home" : activeTab} setActiveTab={setActiveTab} t={t} />
      )}
    </div>
  );
}

