import React, { useState, useEffect, useRef } from "react";
import { Car, User } from "../types";
import { api } from "../services/api";
import { ChevronLeft, Send, Bot, User as UserIcon, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CarCard } from "../components/CarCard";

interface Message {
  role: "user" | "assistant";
  content: string;
  cars?: Car[];
}

interface SmartAIScreenProps {
  onBack: () => void;
  onCarClick: (car: Car) => void;
  favorites: number[];
  toggleFavorite: (id: number) => void;
  t: any;
  user: User | null;
}

export const SmartAIScreen: React.FC<SmartAIScreenProps> = ({ 
  onBack, 
  onCarClick, 
  favorites, 
  toggleFavorite, 
  t,
  user 
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "مرحباً بك في سوق السيارات الذكي! أنا مساعدك الشخصي المدعوم بالذكاء الاصطناعي. كيف يمكنني مساعدتك اليوم في العثور على سيارة أحلامك؟"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // Conversation memory: entities collected across turns (budget, make, city, ...).
  // The server is stateless - this is resent every turn and replaced with the
  // server's merged copy on each response, so the AI never re-asks known info.
  const [slots, setSlots] = useState<Record<string, any>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    // History sent to the server is text-only (role/content) - full Car objects on
    // past messages must never be included, or the payload grows unboundedly per turn.
    const history = messages.slice(-10).map(({ role, content }) => ({ role, content }));
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const result = await api.aiSearch.chat(userMessage, history, slots);

      // Defensive merge: on a transient failure the server still echoes back the
      // previous slots, but never blindly trust an absent field over what we already have.
      setSlots(result.slots ?? slots);

      setMessages(prev => [...prev, {
        role: "assistant",
        content: result.text,
        cars: result.cars && result.cars.length > 0 ? result.cars : undefined
      }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a110f] text-white">
      {/* Header */}
      <header className="flex items-center gap-4 p-6 bg-white/5 backdrop-blur-xl border-b border-white/10">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-black text-lg">سوق السيارات الذكي</h1>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">مساعدك الشخصي</p>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                msg.role === "user" ? "bg-white/10" : "bg-emerald-500"
              }`}>
                {msg.role === "user" ? <UserIcon size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                msg.role === "user" 
                  ? "bg-emerald-600 text-white rounded-tr-none" 
                  : "bg-white/10 text-gray-100 rounded-tl-none border border-white/5"
              }`}>
                {msg.content}
              </div>
            </div>
            
            {msg.cars && msg.cars.length > 0 && (
              <div className="mt-4 w-full grid grid-cols-1 gap-4">
                {msg.cars.some(car => car.comparisonGroup) ? (
                  <>
                    {(["a", "b"] as const).map(group => {
                      const groupCars = msg.cars!.filter(car => car.comparisonGroup === group);
                      if (groupCars.length === 0) return null;
                      return (
                        <div key={group} className="space-y-4">
                          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">
                            {group === "a" ? "الخيار الأول:" : "الخيار الثاني:"}
                          </p>
                          {groupCars.map(car => (
                            <div key={car.id} className="w-full">
                              <CarCard
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
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">السيارات المقترحة من المعرض:</p>
                    {msg.cars.map(car => (
                      <div key={car.id} className="w-full">
                        <CarCard
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
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="bg-white/10 p-4 rounded-2xl rounded-tl-none border border-white/5">
              <Loader2 size={16} className="animate-spin text-emerald-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white/5 backdrop-blur-xl border-t border-white/10">
        <div className="relative flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="اسأل عن أي سيارة أو ميزانية..."
            className="flex-1 bg-white/10 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-gray-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            <Send size={20} className="text-white" />
          </button>
        </div>
        <p className="text-[10px] text-center text-gray-500 mt-4 font-medium">
          أمثلة: "معايا 500 ألف أجيب ايه" • "أفضل سيارة ألماني ب 700 ألف"
        </p>
      </div>
    </div>
  );
};
