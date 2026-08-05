import React, { useEffect, useState } from "react";
import { ChevronLeft, Plus, Trash2, Loader2, Building2, Car as CarIcon, BarChart3, ArrowRightLeft } from "lucide-react";
import { api } from "../services/api";
import { Car, User as UserType } from "../types";

interface Branch {
  id: number;
  name: string;
  address: string;
  phone?: string;
  region?: string;
  is_headquarters?: number;
}

interface MultiBranchDashboardProps {
  user: UserType;
  onBack: () => void;
  onAddCar: () => void;
  t: any;
}

type Section = "branches" | "cars" | "stats";

export const MultiBranchDashboard: React.FC<MultiBranchDashboardProps> = ({ onBack, onAddCar, t }) => {
  const [section, setSection] = useState<Section>("branches");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBranch, setNewBranch] = useState({ name: "", address: "", phone: "" });
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [branchStats, setBranchStats] = useState<Record<number, any>>({});

  const load = async () => {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([api.dealerBranches.getAll(), api.cars.getDealerCars()]);
      setBranches(b);
      setCars(c);
    } catch (e) {
      console.error("Failed to load multi-branch dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const loadStats = async (branchId: number) => {
    try {
      const stats = await api.dealerBranches.getStats(branchId);
      setBranchStats((prev) => ({ ...prev, [branchId]: stats }));
    } catch (e) {
      console.error("Failed to load branch stats:", e);
    }
  };

  useEffect(() => {
    if (section === "stats") branches.forEach((b) => loadStats(b.id));
  }, [section, branches]);

  const createBranch = async () => {
    if (!newBranch.name || !newBranch.address) return;
    await api.dealerBranches.create(newBranch);
    setNewBranch({ name: "", address: "", phone: "" });
    setShowNewBranch(false);
    load();
  };

  const deleteBranch = async (id: number) => {
    if (!window.confirm("حذف هذا الفرع؟")) return;
    await api.dealerBranches.delete(id);
    load();
  };

  const moveCar = async (carId: number, branchId: number) => {
    if (!branchId) return;
    await api.dealerBranches.moveCar(branchId, carId);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">لوحة تحكم صاحب الفروع المتعددة</h1>
      </header>

      <div className="p-6 space-y-6">
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          {([
            { id: "branches", label: "الفروع", icon: Building2 },
            { id: "cars", label: "نقل السيارات", icon: ArrowRightLeft },
            { id: "stats", label: "إحصائيات", icon: BarChart3 },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSection(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                section === tab.id ? "bg-white text-black shadow-sm" : "text-gray-500"
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-300" size={32} /></div>
        ) : section === "branches" ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">فروعي ({branches.length})</h2>
              <button
                onClick={() => setShowNewBranch((s) => !s)}
                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-bold"
              >
                <Plus size={16} /> فرع جديد
              </button>
            </div>

            {showNewBranch && (
              <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3">
                <input
                  placeholder="اسم الفرع"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm"
                />
                <input
                  placeholder="العنوان"
                  value={newBranch.address}
                  onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm"
                />
                <input
                  placeholder="الهاتف (اختياري)"
                  value={newBranch.phone}
                  onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm"
                />
                <button onClick={createBranch} className="w-full bg-emerald-500 text-white font-bold py-2.5 rounded-xl">حفظ الفرع</button>
              </div>
            )}

            {branches.map((b) => (
              <div key={b.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-gray-900 text-sm">{b.name}</h3>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">{b.address}</p>
                </div>
                <button onClick={() => deleteBranch(b.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {branches.length === 0 && (
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-100">
                <p className="text-gray-400 font-bold text-sm">لا يوجد فروع بعد</p>
              </div>
            )}
          </section>
        ) : section === "cars" ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">نقل سيارة بين الفروع</h2>
              <button onClick={onAddCar} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-bold">
                <Plus size={16} /> {t.addCar}
              </button>
            </div>
            {cars.map((car) => (
              <div key={car.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={car.images[0]} alt={car.make} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-gray-900 text-sm truncate">{car.make} {car.model}</h3>
                </div>
                <select
                  defaultValue=""
                  onChange={(e) => moveCar(car.id, Number(e.target.value))}
                  className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-gray-700"
                >
                  <option value="" disabled>نقل إلى فرع...</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            ))}
            {cars.length === 0 && (
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-100">
                <p className="text-gray-400 font-bold text-sm flex items-center justify-center gap-2"><CarIcon size={16} /> لا يوجد سيارات بعد</p>
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            <h2 className="text-lg font-black text-gray-900">إحصائيات الفروع</h2>
            {branches.map((b) => (
              <div key={b.id} className="bg-white p-4 rounded-2xl border border-gray-100">
                <h3 className="font-black text-gray-900 text-sm mb-3">{b.name}</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <span className="block text-lg font-black text-gray-900">{branchStats[b.id]?.totalCars ?? "-"}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">سيارات</span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <span className="block text-lg font-black text-emerald-500">{branchStats[b.id]?.totalViews ?? "-"}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">مشاهدات</span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <span className="block text-lg font-black text-rose-500">{branchStats[b.id]?.soldCount ?? "-"}</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">مباعة</span>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};
