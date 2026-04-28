import React, { useEffect, useState } from "react";
import { ChevronLeft, Plus, Edit2, Trash2, User, Mail, Shield, Loader2, Car as CarIcon, Phone, MapPin, MessageCircle, Image as ImageIcon, Zap } from "lucide-react";
import { api } from "../services/api";
import { subscriptionsEnabled } from "../constants/config";
import { PromoteButton } from "../components/PromoteButton";
import { Car, User as UserType, Dealer } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface DealerDashboardProps {
  user: UserType;
  onBack: () => void;
  onAddCar: () => void;
  onAddReel: () => void;
  onEditCar: (car: Car) => void;
  t: any;
  initialSection?: 'cars' | 'profile';
}

export const DealerDashboard: React.FC<DealerDashboardProps> = ({ user, onBack, onAddCar, onAddReel, onEditCar, t, initialSection = 'cars' }) => {
  const [cars, setCars] = useState<Car[]>([]);
  const [reels, setReels] = useState<any[]>([]);
  const [deletingReelId, setDeletingReelId] = useState<number | null>(null);
  const [dealerProfile, setDealerProfile] = useState<Dealer | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<'cars' | 'profile'>(initialSection);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetchCars();
    fetchReels();
    fetchDealerProfile();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await api.dealers.getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchCars = async () => {
    try {
      const data = await api.cars.getDealerCars();
      setCars(data);
    } catch (error) {
      console.error("Failed to fetch dealer cars:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDealerProfile = async () => {
    try {
      const data = await api.dealers.getProfile();
      setDealerProfile(data);
    } catch (error) {
      console.error("Failed to fetch dealer profile:", error);
    }
  };

  const addBranch = () => {
    if (dealerProfile) {
      const newBranch = { name: "", address: "", map_link: "", phone: "" };
      setDealerProfile({
        ...dealerProfile,
        branches: [...(dealerProfile.branches || []), newBranch]
      });
    }
  };

  const updateBranch = (index: number, field: string, value: string) => {
    if (dealerProfile && dealerProfile.branches) {
      const newBranches = [...dealerProfile.branches];
      newBranches[index] = { ...newBranches[index], [field]: value };
      setDealerProfile({ ...dealerProfile, branches: newBranches });
    }
  };

  const removeBranch = (index: number) => {
    if (dealerProfile && dealerProfile.branches) {
      const newBranches = dealerProfile.branches.filter((_, i) => i !== index);
      setDealerProfile({ ...dealerProfile, branches: newBranches });
    }
  };

  const handleGetLocation = (index: number) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const link = `https://www.google.com/maps?q=${latitude},${longitude}`;
          updateBranch(index, 'map_link', link);
        },
        (error) => {
          if (error.code !== error.PERMISSION_DENIED) {
            alert("Unable to get location");
          }
        }
      );
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealerProfile) return;
    setIsSaving(true);
    try {
      await api.dealers.updateProfile(dealerProfile);
      alert("تم تحديث الملف الشخصي بنجاح");
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("فشل تحديث الملف الشخصي");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t.confirmDelete)) return;
    setDeletingId(id);
    try {
      await api.cars.delete(id);
      setCars(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error("Failed to delete car:", error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">{t.dealerDashboard}</h1>
      </header>

      <div className="p-6 space-y-8">
        {dealerProfile?.status === 'pending' && (
          <div className="bg-orange-50 border border-orange-100 p-6 rounded-[32px] flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-orange-500 shadow-sm flex-shrink-0">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="font-black text-orange-900 mb-1">حسابك قيد المراجعة</h3>
              <p className="text-sm text-orange-700 font-medium leading-relaxed">
                حساب المعرض الخاص بك قيد المراجعة حالياً من قبل الإدارة. ستتمكن من إضافة السيارات والريلز بمجرد الموافقة على حسابك.
              </p>
            </div>
          </div>
        )}

        {dealerProfile?.status === 'rejected' && (
          <div className="bg-red-50 border border-red-100 p-6 rounded-[32px] flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm flex-shrink-0">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="font-black text-red-900 mb-1">تم رفض الحساب</h3>
              <p className="text-sm text-red-700 font-medium leading-relaxed">
                عذراً، تم رفض طلب انضمامك كمعرض. يرجى التواصل مع الدعم الفني لمزيد من المعلومات.
              </p>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-gray-900">{stats?.totalCars || 0}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">إجمالي السيارات</span>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-emerald-500">{stats?.totalFollowers || 0}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">المتابعون</span>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-rose-500">{stats?.totalLikes || 0}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">الإعجابات</span>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveSection('cars')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeSection === 'cars' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
            }`}
          >
            <CarIcon size={18} />
            {t.myCars}
          </button>
          <button
            onClick={() => setActiveSection('profile')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeSection === 'profile' ? 'bg-white text-black shadow-sm' : 'text-gray-500'
            }`}
          >
            <User size={18} />
            {t.profile}
          </button>
        </div>

        {activeSection === 'cars' ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">{t.myCars}</h2>
              <div className="flex gap-2">
                <button
                  onClick={onAddReel}
                  disabled={dealerProfile?.status !== 'active'}
                  className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={18} />
                  {t.addReel}
                </button>
                <button
                  onClick={onAddCar}
                  disabled={dealerProfile?.status !== 'active'}
                  className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={18} />
                  {t.addCar}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-gray-300" size={32} />
              </div>
            ) : cars.length === 0 ? (
              <div className="bg-white rounded-[32px] p-12 text-center border border-gray-100">
                <p className="text-gray-400 font-bold">No cars listed yet.</p>
              </div>
            ) : (
              
              <div className="grid gap-4">
  <AnimatePresence>
    {cars.map((car) => (
      <motion.div
        key={car.id}
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl p-3 border border-gray-100 shadow-sm flex gap-4"
      >
        <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
          <img
            src={car.images[0]}
            alt={car.make}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 flex flex-col justify-between py-1">
          <div>
            <h3 className="font-black text-gray-900 text-sm">
              {car.make} {car.model}
            </h3>
            <p className="text-emerald-500 font-black text-xs mt-1">
              {car.price.toLocaleString()} ج.م
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onEditCar(car)}
              className="flex-1 bg-gray-50 py-2 rounded-xl text-xs font-bold"
            >
              تعديل
            </button>

            <button
              onClick={() => handleDelete(car.id)}
              className="flex-1 bg-red-50 text-red-500 py-2 rounded-xl text-xs font-bold"
            >
              حذف
            </button>
          </div>
        </div>
      </motion.div>
    ))}
  </AnimatePresence>

  {/* 👇 الريلز */}
  {reels.map((reel) => (
    <div
      key={reel.id}
      className="bg-white rounded-3xl p-3 border border-gray-100 shadow-sm flex gap-4"
    >
      <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-black">
        <video

          src={reel.video_url}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex gap-2 mt-2">
  <button
    onClick={() => handleDeleteReel(reel.id)}
    className="flex-1 bg-red-50 text-red-500 py-2 rounded-xl text-xs font-bold"
  >
    حذف
  </button>
</div>

      <div className="flex-1 flex flex-col justify-between py-1">
        <div>
          <h3 className="font-black text-gray-900 text-sm">Reel</h3>
          <p className="text-gray-400 text-xs">
            {reel.make} {reel.model}
          </p>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 bg-gray-50 py-2 rounded-xl text-xs font-bold">
            تعديل
          </button>

          <button className="flex-1 bg-red-50 text-red-500 py-2 rounded-xl text-xs font-bold">
            حذف
          </button>
        </div>
      </div>
    </div>
  ))}
</div>
          </section>
        ) : (
          <section className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm">
            <h2 className="text-xl font-black text-gray-900 mb-6">{t.editProfile}</h2>
            {dealerProfile ? (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">شعار المعرض</label>
                    <div className="flex items-center gap-4">
                      {dealerProfile.logo && (
                        <img src={dealerProfile.logo} alt="Logo" className="w-16 h-16 rounded-2xl object-cover border border-gray-100" />
                      )}
                      <label className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-400 text-sm cursor-pointer hover:bg-gray-100 transition-colors flex items-center gap-2">
                        <ImageIcon size={18} />
                        تغيير الشعار
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setDealerProfile({ ...dealerProfile, logo: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">اسم المعرض</label>
                    <input
                      type="text"
                      value={dealerProfile.name}
                      onChange={(e) => setDealerProfile({ ...dealerProfile, name: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">رقم الهاتف</label>
                    <input
                      type="text"
                      value={dealerProfile.phone}
                      onChange={(e) => setDealerProfile({ ...dealerProfile, phone: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">رقم الواتساب</label>
                    <input
                      type="text"
                      value={dealerProfile.whatsapp_number || ""}
                      onChange={(e) => setDealerProfile({ ...dealerProfile, whatsapp_number: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
                      placeholder="مثال: 201234567890"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">العنوان</label>
                    <input
                      type="text"
                      value={dealerProfile.address || ""}
                      onChange={(e) => setDealerProfile({ ...dealerProfile, address: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">رابط الموقع على الخريطة</label>
                    <input
                      type="text"
                      value={dealerProfile.map_location_link || ""}
                      onChange={(e) => setDealerProfile({ ...dealerProfile, map_location_link: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </div>

                  {/* Branches Section */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-gray-900">الفروع</h3>
                      <button
                        type="button"
                        onClick={addBranch}
                        className="flex items-center gap-1 text-xs font-bold text-black bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        <Plus size={14} />
                        إضافة فرع
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {dealerProfile.branches?.map((branch, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 relative group">
                          <button
                            type="button"
                            onClick={() => removeBranch(index)}
                            className="absolute top-2 left-2 p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                          
                          <div className="grid gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">اسم الفرع</label>
                              <input
                                type="text"
                                value={branch.name}
                                onChange={(e) => updateBranch(index, 'name', e.target.value)}
                                className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
                                placeholder="مثال: فرع القاهرة الجديدة"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">عنوان الفرع</label>
                              <input
                                type="text"
                                value={branch.address}
                                onChange={(e) => updateBranch(index, 'address', e.target.value)}
                                className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">رابط الخريطة (اختياري)</label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={branch.map_link || ""}
                                    onChange={(e) => updateBranch(index, 'map_link', e.target.value)}
                                    onClick={() => !branch.map_link && handleGetLocation(index)}
                                    className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 pl-10 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
                                    placeholder="https://www.google.com/maps?q=..."
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleGetLocation(index)}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="تحديد موقعي الحالي"
                                  >
                                    <MapPin size={16} />
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">رقم الهاتف (اختياري)</label>
                                <input
                                  type="text"
                                  value={branch.phone || ""}
                                  onChange={(e) => updateBranch(index, 'phone', e.target.value)}
                                  className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {(!dealerProfile.branches || dealerProfile.branches.length === 0) && (
                        <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                          <p className="text-xs text-gray-400 font-bold">لم يتم إضافة أي فروع بعد</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">وصف المعرض</label>
                    <textarea
                      value={dealerProfile.description}
                      onChange={(e) => setDealerProfile({ ...dealerProfile, description: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5 min-h-[100px]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-black text-white font-bold py-4 rounded-2xl shadow-xl shadow-black/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20} /> : "حفظ التغييرات"}
                </button>
              </form>
            ) : (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-gray-300" size={32} />
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
