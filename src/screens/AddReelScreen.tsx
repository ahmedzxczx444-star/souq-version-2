import React, { useState, useEffect } from "react";
import { ChevronLeft, Video, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "../services/api";
import { Car } from "../types";

interface AddReelScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  t: any;
}

export const AddReelScreen: React.FC<AddReelScreenProps> = ({ onBack, onSuccess, t }) => {
  const [loading, setLoading] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedCarId, setSelectedCarId] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDealerCars();
  }, []);

  const fetchDealerCars = async () => {
    try {
      const data = await api.cars.getDealerCars();
      setCars(data);
    } catch (error) {
      console.error("Failed to fetch dealer cars:", error);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError("Maximum file size: 100MB");
      return;
    }

    // Check format
    const allowedTypes = ['video/mp4', 'video/quicktime']; // mp4, mov
    if (!allowedTypes.includes(file.type)) {
      setError("Allowed formats: MP4, MOV");
      return;
    }

    // Check duration (3 mins = 180 seconds)
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      if (video.duration > 180) {
        setError("Maximum video length: 3 minutes");
        setVideoFile(null);
        setVideoPreview(null);
      } else {
        setError(null);
        setVideoFile(file);
        setVideoPreview(URL.createObjectURL(file));
      }
    };
    video.src = URL.createObjectURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      setError("Please upload a video");
      return;
    }

    setLoading(true);
    try {
      // 1. Upload video file
      const { video_url } = await api.reels.uploadVideo(videoFile);

      // 2. Create reel entry
      await api.reels.create({
        video_url,
        caption,
        car_id: selectedCarId || null
      });
      onSuccess();
    } catch (error) {
      console.error("Failed to upload reel:", error);
      setError("Failed to upload reel. Please try again.");
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
        <h1 className="text-xl font-black text-gray-900 tracking-tight">{t.addReel}</h1>
      </header>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border border-red-100">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Video Upload */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">{t.videoFile}</label>
            <div className="relative">
              {!videoPreview ? (
                <label className="w-full aspect-[9/16] max-h-[400px] bg-gray-50 border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all group">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                    <Video size={32} className="text-gray-400" />
                  </div>
                  <span className="text-sm font-black text-gray-900 mb-1">{t.uploadVideo}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">أقصى مدة: 3 دقائق</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">MP4, MOV (بحد أقصى 100MB)</span>
                  <input type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={handleVideoUpload} />
                </label>
              ) : (
                <div className="relative w-full aspect-[9/16] max-h-[400px] rounded-[32px] overflow-hidden border border-gray-100 shadow-xl group">
                  <video src={videoPreview} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button 
                      type="button"
                      onClick={() => {
                        setVideoFile(null);
                        setVideoPreview(null);
                      }}
                      className="bg-white text-red-500 px-6 py-3 rounded-full font-black text-sm shadow-xl"
                    >
                      تغيير الفيديو
                    </button>
                  </div>
                  <div className="absolute top-4 right-4 bg-emerald-500 text-white p-2 rounded-full shadow-lg">
                    <CheckCircle2 size={20} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t.caption}</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="اكتب وصفاً للفيديو..."
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5 min-h-[100px] resize-none"
            />
          </div>

          {/* Link Car */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">{t.linkCar}</label>
            <select
              value={selectedCarId}
              onChange={(e) => setSelectedCarId(e.target.value ? Number(e.target.value) : "")}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5 appearance-none"
            >
              <option value="">{t.selectCar}</option>
              {cars.map(car => (
                <option key={car.id} value={car.id}>{car.make} {car.model} ({car.year})</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !videoFile}
          className="w-full bg-black text-white font-bold py-5 rounded-[32px] shadow-xl shadow-black/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              {t.uploadingReel}
            </>
          ) : (
            <>
              <CheckCircle2 size={20} />
              نشر الريلز
            </>
          )}
        </button>
      </form>
    </div>
  );
};
