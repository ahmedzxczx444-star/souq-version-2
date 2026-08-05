import React, { useState, useEffect, useRef } from "react";
import { Car, Part, User } from "../types";
import { api } from "../services/api";
import { ChevronLeft, Send, Bot, User as UserIcon, Loader2, Sparkles, Camera } from "lucide-react";
import { CarCard } from "../components/CarCard";
import { PartCard } from "../components/PartCard";

interface Message {
  role: "user" | "assistant";
  content: string;
  cars?: Car[];
  parts?: Part[];
}

interface UnifiedSearchScreenProps {
  onBack: () => void;
  onCarClick: (car: Car) => void;
  onPartClick: (part: Part) => void;
  favorites: number[];
  toggleFavorite: (id: number) => void;
  t: any;
  user: User | null;
}

// Structural copy of SmartAIScreen.tsx's chat shell (same layout/classes), calling the
// new /api/smart-search/chat endpoint instead. SmartAIScreen.tsx itself is never
// touched - both entry points coexist so the old car-only assistant keeps working
// exactly as before during rollout.
export const UnifiedSearchScreen: React.FC<UnifiedSearchScreenProps> = ({ onBack, onCarClick, onPartClick, favorites, toggleFavorite, t }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "أهلاً! أنا البحث الذكي الموحد لسوق السيارات - اسألني عن أي سيارة أو قطعة غيار، أو ارفع صورة قطعة مش عارف اسمها وهلاقيها لك."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [slots, setSlots] = useState<Record<string, any>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage = input.trim();
    setInput("");
    const history = messages.slice(-10).map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const result = await api.smartSearch.chat(userMessage, history, slots);
      setSlots(result.slots ?? slots);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: result.text,
        cars: result.cars && result.cars.length > 0 ? result.cars : undefined,
        parts: result.parts && result.parts.length > 0 ? result.parts : undefined,
      }]);
    } catch (error) {
      console.error("Smart search error:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: "عذراً، حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Part 8: buyer image search - upload a photo of an unknown part, get matching
  // dealers/prices/locations back in the same chat flow.
  const handleImageSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || isLoading) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setMessages((prev) => [...prev, { role: "user", content: "📷 صورة قطعة غيار" }]);
      setIsLoading(true);
      try {
        const result = await api.parts.imageSearch(dataUrl);
        const idText = result.identification?.name ? `يمكن تكون: ${result.identification.name}` : "";
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: result.results.length > 0 ? `${idText}\n\nلقيت ${result.results.length} قطعة مشابهة عند تجار موثوقين:` : `${idText}\n\nمش لاقي قطع مطابقة متاحة دلوقتي.`,
          parts: result.results.length > 0 ? result.results : undefined,
        }]);
      } catch (err) {
        console.error("Image search error:", err);
        setMessages((prev) => [...prev, { role: "assistant", content: "عذراً، تعذر تحليل الصورة. حاول مرة أخرى." }]);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a110f] text-white">
      <header className="flex items-center gap-4 p-6 bg-white/5 backdrop-blur-xl border-b border-white/10">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-black text-lg">البحث الذكي الموحد</h1>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">سيارات وقطع غيار</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-white/10" : "bg-emerald-500"}`}>
                {msg.role === "user" ? <UserIcon size={16} /> : <Bot size={16} />}
              </div>
              <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-line ${
                msg.role === "user" ? "bg-emerald-600 text-white rounded-tr-none" : "bg-white/10 text-gray-100 rounded-tl-none border border-white/5"
              }`}>
                {msg.content}
              </div>
            </div>

            {msg.cars && msg.cars.length > 0 && (
              <div className="mt-4 w-full grid grid-cols-1 gap-2">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">سيارات مقترحة:</p>
                {msg.cars.map((car) => (
                  <div key={`car-${car.id}`} className="w-full">
                    <CarCard
                      car={car}
                      onClick={() => onCarClick(car)}
                      isFavorite={favorites.includes(car.id)}
                      onFavoriteToggle={(e) => { e.stopPropagation(); toggleFavorite(car.id); }}
                      t={t}
                      variant="compact"
                    />
                  </div>
                ))}
              </div>
            )}

            {msg.parts && msg.parts.length > 0 && (
              <div className="mt-4 w-full grid grid-cols-1 gap-2">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">قطع غيار مقترحة:</p>
                {msg.parts.map((part) => (
                  <div key={`part-${part.id}`} className="w-full">
                    <PartCard part={part} onClick={() => onPartClick(part)} t={t} variant="compact" />
                  </div>
                ))}
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

      <div className="p-6 bg-white/5 backdrop-blur-xl border-t border-white/10">
        <div className="relative flex items-center gap-3">
          <label className="w-12 h-12 bg-white/10 border border-white/10 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors flex-shrink-0">
            <Camera size={20} className="text-gray-300" />
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSearch} disabled={isLoading} />
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="اسأل عن سيارة أو قطعة غيار..."
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
          أمثلة: "BMW 320" • "طرمبة مياه إلنترا 2019" • "نص قطاعة BMW F30"
        </p>
      </div>
    </div>
  );
};
