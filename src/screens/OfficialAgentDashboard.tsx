import React, { useEffect, useState } from "react";
import { ChevronLeft, Plus, Trash2, Loader2, Wrench, Tag, ShieldCheck } from "lucide-react";
import { api } from "../services/api";
import { User as UserType } from "../types";

interface OfficialAgentDashboardProps {
  user: UserType;
  onBack: () => void;
  t: any;
}

type Section = "service-centers" | "offers" | "warranties";

export const OfficialAgentDashboard: React.FC<OfficialAgentDashboardProps> = ({ onBack }) => {
  const [section, setSection] = useState<Section>("service-centers");
  const [serviceCenters, setServiceCenters] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCenter, setShowNewCenter] = useState(false);
  const [newCenter, setNewCenter] = useState({ name: "", address: "", phone: "" });
  const [showNewOffer, setShowNewOffer] = useState(false);
  const [newOffer, setNewOffer] = useState({ title: "", description: "", discount_percent: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [sc, of, wr] = await Promise.all([api.officialAgent.getServiceCenters(), api.officialAgent.getOffers(), api.officialAgent.getWarranties()]);
      setServiceCenters(sc);
      setOffers(of);
      setWarranties(wr);
    } catch (e) {
      console.error("Failed to load official agent dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createCenter = async () => {
    if (!newCenter.name || !newCenter.address) return;
    await api.officialAgent.createServiceCenter(newCenter);
    setNewCenter({ name: "", address: "", phone: "" });
    setShowNewCenter(false);
    load();
  };

  const deleteCenter = async (id: number) => {
    if (!window.confirm("حذف مركز الخدمة؟")) return;
    await api.officialAgent.deleteServiceCenter(id);
    load();
  };

  const createOffer = async () => {
    if (!newOffer.title) return;
    await api.officialAgent.createOffer({ ...newOffer, discount_percent: newOffer.discount_percent ? Number(newOffer.discount_percent) : null });
    setNewOffer({ title: "", description: "", discount_percent: "" });
    setShowNewOffer(false);
    load();
  };

  const deleteOffer = async (id: number) => {
    if (!window.confirm("حذف هذا العرض؟")) return;
    await api.officialAgent.deleteOffer(id);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">لوحة تحكم الوكيل الرسمي</h1>
      </header>

      <div className="p-6 space-y-6">
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          {([
            { id: "service-centers", label: "مراكز الخدمة", icon: Wrench },
            { id: "offers", label: "العروض الرسمية", icon: Tag },
            { id: "warranties", label: "الضمانات", icon: ShieldCheck },
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
        ) : section === "service-centers" ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">مراكز الخدمة</h2>
              <button onClick={() => setShowNewCenter((s) => !s)} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-bold">
                <Plus size={16} /> مركز جديد
              </button>
            </div>
            {showNewCenter && (
              <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3">
                <input placeholder="اسم المركز" value={newCenter.name} onChange={(e) => setNewCenter({ ...newCenter, name: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm" />
                <input placeholder="العنوان" value={newCenter.address} onChange={(e) => setNewCenter({ ...newCenter, address: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm" />
                <input placeholder="الهاتف (اختياري)" value={newCenter.phone} onChange={(e) => setNewCenter({ ...newCenter, phone: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm" />
                <button onClick={createCenter} className="w-full bg-emerald-500 text-white font-bold py-2.5 rounded-xl">حفظ المركز</button>
              </div>
            )}
            {serviceCenters.map((sc) => (
              <div key={sc.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-gray-900 text-sm">{sc.name}</h3>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">{sc.address}</p>
                </div>
                <button onClick={() => deleteCenter(sc.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={16} /></button>
              </div>
            ))}
            {serviceCenters.length === 0 && (
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-100"><p className="text-gray-400 font-bold text-sm">لا يوجد مراكز خدمة بعد</p></div>
            )}
          </section>
        ) : section === "offers" ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">العروض الرسمية</h2>
              <button onClick={() => setShowNewOffer((s) => !s)} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-bold">
                <Plus size={16} /> عرض جديد
              </button>
            </div>
            {showNewOffer && (
              <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3">
                <input placeholder="عنوان العرض" value={newOffer.title} onChange={(e) => setNewOffer({ ...newOffer, title: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm" />
                <textarea placeholder="الوصف" value={newOffer.description} onChange={(e) => setNewOffer({ ...newOffer, description: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm min-h-[80px]" />
                <input type="number" placeholder="نسبة الخصم % (اختياري)" value={newOffer.discount_percent} onChange={(e) => setNewOffer({ ...newOffer, discount_percent: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm" />
                <button onClick={createOffer} className="w-full bg-emerald-500 text-white font-bold py-2.5 rounded-xl">حفظ العرض</button>
              </div>
            )}
            {offers.map((o) => (
              <div key={o.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-gray-900 text-sm">{o.title}</h3>
                  {o.discount_percent && <p className="text-xs text-emerald-500 font-bold mt-0.5">خصم {o.discount_percent}%</p>}
                </div>
                <button onClick={() => deleteOffer(o.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl"><Trash2 size={16} /></button>
              </div>
            ))}
            {offers.length === 0 && (
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-100"><p className="text-gray-400 font-bold text-sm">لا يوجد عروض بعد</p></div>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            <h2 className="text-lg font-black text-gray-900">ضمانات السيارات</h2>
            {warranties.map((w) => (
              <div key={w.id} className="bg-white p-4 rounded-2xl border border-gray-100">
                <h3 className="font-black text-gray-900 text-sm">{w.make} {w.model} {w.year}</h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">{w.warranty_type} · {w.duration_months} شهر</p>
              </div>
            ))}
            {warranties.length === 0 && (
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-100"><p className="text-gray-400 font-bold text-sm">لا يوجد ضمانات مسجلة بعد. يمكن إضافتها من صفحة تعديل السيارة.</p></div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
