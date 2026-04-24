import React, { useState, useEffect } from "react";
import { ChevronLeft, Camera, Video, Loader2, Car as CarIcon } from "lucide-react";
import { api } from "../services/api";
import { subscriptionsEnabled } from "../constants/config";
import { Car, User } from "../types";

interface AddCarScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  t: any;
  initialCar?: Car;
}

export const AddCarScreen: React.FC<AddCarScreenProps> = ({ onBack, onSuccess, t, initialCar }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: new Date().getFullYear(),
    price: "",
    location: "",
    mileage: "",
    description: "",
    fuel_type: "Petrol",
    transmission: "Automatic",
    video_url: "",
    status: "available" as "available" | "reserved" | "sold",
    featured: false,
  });
  const [images, setImages] = useState<string[]>([]);
  const [userSubscription, setUserSubscription] = useState<any>(null);

  useEffect(() => {
    if (subscriptionsEnabled) {
      fetchSubscription();
    }
    if (initialCar) {
      setFormData({
        make: initialCar.make,
        model: initialCar.model,
        year: initialCar.year,
        price: initialCar.price.toString(),
        location: initialCar.location || "",
        mileage: initialCar.mileage.toString(),
        description: initialCar.description,
        fuel_type: initialCar.fuel_type,
        transmission: initialCar.transmission,
        video_url: "", // Reels are separate, but we could handle them if needed
        status: initialCar.status || "available",
        featured: initialCar.featured || false,
      });
      setImages(initialCar.images);
    }
  }, [initialCar]);

  const fetchSubscription = async () => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        const data = await api.subscription.getSubscription(user.id);
        setUserSubscription(data);
      }
    } catch (error) {
      console.error("Failed to fetch subscription info:", error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 10 - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => {
          if (prev.length >= 10) return prev;
          return [...prev, reader.result as string];
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const carData = {
        ...formData,
        price: parseInt(formData.price),
        year: parseInt(formData.year.toString()),
        mileage: parseInt(formData.mileage),
        images: images,
      };

      if (initialCar) {
        await api.cars.update(initialCar.id, carData);
      } else {
        await api.cars.create(carData);
      }
      onSuccess();
    } catch (error: any) {
      console.error("Failed to save car:", error);
      const message = error.response?.data?.error || error.message || "Failed to save car. Please try again.";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-12">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 border-b border-gray-50 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">{t.addCar}</h1>
      </header>
      
      {subscriptionsEnabled && userSubscription && !initialCar && (
        <div className="px-6 pt-4">
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                <CarIcon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">السيارات المتاحة هذا الشهر</p>
                <p className="text-sm font-black text-emerald-900">
                  {userSubscription.carsPostedThisMonth} / {userSubscription.limits.carsLimit === 9999 ? '∞' : userSubscription.limits.carsLimit}
                </p>
              </div>
            </div>
            {userSubscription.carsPostedThisMonth >= userSubscription.limits.carsLimit && (
              <span className="bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase">وصلت للحد الأقصى</span>
            )}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t.carName}</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Make (e.g. Toyota)"
                required
                className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
                value={formData.make}
                onChange={e => setFormData({ ...formData, make: e.target.value })}
              />
              <input
                type="text"
                placeholder="Model (e.g. Camry)"
                required
                className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
                value={formData.model}
                onChange={e => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t.price}</label>
              <input
                type="number"
                placeholder="0.00"
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
                value={formData.price}
                onChange={e => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t.year}</label>
              <input
                type="number"
                placeholder="2024"
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">نوع الوقود</label>
              <select
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5 appearance-none"
                value={formData.fuel_type}
                onChange={e => setFormData({ ...formData, fuel_type: e.target.value })}
                required
              >
                <option value="بنزين">بنزين</option>
                <option value="سولار">سولار</option>
                <option value="كهرباء">كهرباء</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t.mileage}</label>
              <input
                type="number"
                placeholder="0"
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
                value={formData.mileage}
                onChange={e => setFormData({ ...formData, mileage: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t.location}</label>
            <input
              type="text"
              placeholder="City, Country"
              required
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
              value={formData.location}
              onChange={e => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t.carStatus}</label>
            <select
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5 appearance-none"
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value as any })}
            >
              <option value="available">{t.available}</option>
              <option value="reserved">{t.reserved}</option>
              <option value="sold">{t.sold}</option>
            </select>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6">
            <input
              type="checkbox"
              id="featured"
              className="w-5 h-5 rounded-lg border-gray-300 text-black focus:ring-black"
              checked={formData.featured}
              onChange={e => setFormData({ ...formData, featured: e.target.checked })}
            />
            <label htmlFor="featured" className="text-sm font-bold text-gray-900 flex items-center gap-2 cursor-pointer">
              <span>🔥</span>
              <span>{t.featured}</span>
            </label>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t.description}</label>
            <textarea
              rows={4}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5 resize-none"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
              {t.uploadImage} ({images.length}/10)
            </label>
            <div className="flex gap-3 overflow-x-auto pb-4 px-1">
              {images.length < 10 && (
                <label className="flex-shrink-0 w-28 h-28 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[24px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all hover:border-gray-300 group">
                  <Camera size={28} className="text-gray-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.add}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </label>
              )}
              {images.map((img, i) => (
                <div key={i} className="flex-shrink-0 w-28 h-28 rounded-[24px] overflow-hidden border border-gray-100 relative group shadow-sm">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  >
                    <ChevronLeft size={16} className="rotate-45" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg text-[8px] font-bold text-white uppercase">
                    {i === 0 ? t.main : `#${i + 1}`}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t.uploadVideo}</label>
            <div className="relative">
              <Video className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="url"
                placeholder="Video URL (YouTube/MP4)"
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 ltr:pl-12 ltr:pr-4 rtl:pr-12 rtl:pl-4 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
                value={formData.video_url}
                onChange={e => setFormData({ ...formData, video_url: e.target.value })}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white font-bold py-5 rounded-[32px] shadow-xl shadow-black/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : t.submit}
        </button>
      </form>
    </div>
  );
};
