import React, { useState, useEffect, useRef } from "react";
import { Car, User } from "../types";
import { api } from "../services/api";
import { GoogleGenAI, Type } from "@google/genai";
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
  const [allCars, setAllCars] = useState<Car[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCars = async () => {
      try {
        const cars = await api.cars.getAll();
        setAllCars(cars);
      } catch (error) {
        console.error("Failed to fetch cars:", error);
      }
    };
    fetchCars();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      // Prepare context about available cars
      const carContext = allCars.map(c => ({
        id: c.id,
        make: c.make,
        model: c.model,
        year: c.year,
        price: c.price,
        mileage: c.mileage,
        location: c.location,
        fuel_type: c.fuel_type,
        status: c.status
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `
              You are a smart car assistant for an Egyptian car marketplace app called "للجردي".
              Your goal is to help users find cars based on their natural language queries.
              
              Context:
              - Available cars in our database: ${JSON.stringify(carContext)}
              - User query: "${userMessage}"
              
              Instructions:
              1. Respond in Arabic (Egyptian dialect preferred if natural).
              2. If the user asks for suggestions with a budget (e.g., "معايا 500 ألف"), look for cars in the database that fit.
              3. If you find matching cars in the database, mention them and I will display them below your message.
              4. If no cars match exactly in the database, provide general market advice and suggestions based on your general car knowledge.
              5. Be helpful, professional, and friendly.
              6. Return your response in JSON format with two fields:
                 - "text": Your text response to the user.
                 - "matchedCarIds": An array of IDs of cars from the provided context that match the user's request.
            `}]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              matchedCarIds: { 
                type: Type.ARRAY, 
                items: { type: Type.INTEGER } 
              }
            },
            required: ["text", "matchedCarIds"]
          }
        }
      });

      const result = JSON.parse(response.text);
      const matchedCars = allCars.filter(c => result.matchedCarIds.includes(c.id));

      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: result.text,
        cars: matchedCars.length > 0 ? matchedCars : undefined
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
