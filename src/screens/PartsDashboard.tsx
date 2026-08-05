import React, { useEffect, useState } from "react";
import {
  ChevronLeft, Plus, Edit2, Trash2, Loader2, Home as HomeIcon, Package, ShoppingBag,
  MessageSquare, Truck, BarChart3, Sparkles, CheckCircle2, XCircle, Camera, ScanLine,
} from "lucide-react";
import { api } from "../services/api";
import { Part, User as UserType } from "../types";

interface PartsDashboardProps {
  user: UserType;
  onBack: () => void;
  onAddPart: () => void;
  onEditPart: (part: Part) => void;
}

type Section = "home" | "inventory" | "products" | "orders" | "messages" | "delivery" | "analytics" | "ai-tools";

const SECTIONS: { id: Section; label: string; icon: any }[] = [
  { id: "home", label: "الرئيسية", icon: HomeIcon },
  { id: "inventory", label: "المخزون", icon: Package },
  { id: "products", label: "المنتجات", icon: ShoppingBag },
  { id: "orders", label: "الطلبات", icon: ShoppingBag },
  { id: "messages", label: "الرسائل", icon: MessageSquare },
  { id: "delivery", label: "التوصيل", icon: Truck },
  { id: "analytics", label: "التحليلات", icon: BarChart3 },
  { id: "ai-tools", label: "أدوات ذكية", icon: Sparkles },
];

const ORDER_STATUS_LABELS: Record<string, string> = { pending: "قيد الانتظار", confirmed: "مؤكد", delivered: "تم التسليم", cancelled: "ملغي" };

// Unified dashboard for ALL auto-parts dealer subtypes (new/imported/half-cut/
// accessories/tires-batteries/oils-consumables share this one dashboard, unlike car
// dealers which get separate dashboards per category).
export const PartsDashboard: React.FC<PartsDashboardProps> = ({ onBack, onAddPart, onEditPart }) => {
  const [section, setSection] = useState<Section>("home");
  const [parts, setParts] = useState<Part[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [lookupPn, setLookupPn] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [looking, setLooking] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, o, s] = await Promise.all([api.parts.getDealerParts(), api.partsOrders.getDealerOrders(), api.parts.getStats()]);
      setParts(p);
      setOrders(o);
      setStats(s);
    } catch (e) {
      console.error("Failed to load parts dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleStatus = async (part: Part) => {
    const newStatus = part.status === "available" ? "unavailable" : "available";
    await api.parts.updateStatus(part.id, newStatus);
    setParts((prev) => prev.map((p) => (p.id === part.id ? { ...p, status: newStatus } : p)));
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("حذف هذه القطعة؟")) return;
    setDeletingId(id);
    try {
      await api.parts.delete(id);
      setParts((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      alert(e.message || "فشل حذف القطعة");
    } finally {
      setDeletingId(null);
    }
  };

  const updateOrderStatus = async (id: number, status: string) => {
    await api.partsOrders.updateStatus(id, status);
    load();
  };

  const runLookup = async () => {
    if (!lookupPn.trim()) return;
    setLooking(true);
    setLookupResult(null);
    try {
      setLookupResult(await api.parts.lookupPartNumber(lookupPn.trim()));
    } catch (e: any) {
      setLookupResult({ error: e.message });
    } finally {
      setLooking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">لوحة تحكم قطع الغيار</h1>
      </header>

      <div className="px-6 pt-4">
        <div className="flex bg-gray-100 p-1 rounded-2xl overflow-x-auto no-scrollbar gap-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                section === s.id ? "bg-white text-black shadow-sm" : "text-gray-500"
              }`}
            >
              <s.icon size={14} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-300" size={32} /></div>
        ) : section === "home" ? (
          <section className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-3xl border border-gray-100 text-center">
                <span className="block text-xl font-black text-gray-900">{stats?.totalParts ?? 0}</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase mt-1 block">إجمالي المنتجات</span>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-gray-100 text-center">
                <span className="block text-xl font-black text-emerald-500">{stats?.availableParts ?? 0}</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase mt-1 block">متاح</span>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-gray-100 text-center">
                <span className="block text-xl font-black text-blue-500">{orders.length}</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase mt-1 block">الطلبات</span>
              </div>
            </div>
            <button onClick={onAddPart} className="w-full flex items-center justify-center gap-2 bg-black text-white font-bold py-4 rounded-[24px] shadow-xl shadow-black/20">
              <Plus size={18} /> إضافة قطعة غيار جديدة
            </button>
          </section>
        ) : section === "inventory" ? (
          <section className="space-y-3">
            <h2 className="text-lg font-black text-gray-900">حالة المخزون (متاح / غير متاح فقط)</h2>
            {parts.map((p) => (
              <div key={p.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {p.images?.[0] && <img src={p.images[0]} className="w-full h-full object-cover" loading="lazy" />}
                </div>
                <span className="flex-1 font-bold text-gray-900 text-sm truncate">{p.name}</span>
                <button
                  onClick={() => toggleStatus(p)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold ${
                    p.status === "available" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  }`}
                >
                  {p.status === "available" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {p.status === "available" ? "متاح" : "غير متاح"}
                </button>
              </div>
            ))}
            {parts.length === 0 && <div className="bg-white rounded-3xl p-8 text-center border border-gray-100"><p className="text-gray-400 font-bold text-sm">لا يوجد منتجات بعد</p></div>}
          </section>
        ) : section === "products" ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">المنتجات ({parts.length})</h2>
              <button onClick={onAddPart} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-bold">
                <Plus size={16} /> إضافة
              </button>
            </div>
            {parts.map((p) => (
              <div key={p.id} className="bg-white rounded-3xl p-3 border border-gray-100 shadow-sm flex gap-4">
                <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gray-100">
                  {p.images?.[0] && <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" loading="lazy" />}
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="font-black text-gray-900 text-sm">{p.name}</h3>
                    <p className="text-emerald-500 font-black text-xs mt-1">{p.price ? `${p.price.toLocaleString()} ج.م` : "اتصل للسعر"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onEditPart(p)} className="flex-1 flex items-center justify-center gap-1 bg-gray-50 text-gray-900 py-2 rounded-xl text-[10px] font-bold hover:bg-gray-100">
                      <Edit2 size={12} /> تعديل
                    </button>
                    <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id} className="flex-1 flex items-center justify-center gap-1 bg-red-50 text-red-500 py-2 rounded-xl text-[10px] font-bold hover:bg-red-100 disabled:opacity-50">
                      {deletingId === p.id ? <Loader2 size={12} className="animate-spin" /> : <><Trash2 size={12} /> حذف</>}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {parts.length === 0 && <div className="bg-white rounded-3xl p-8 text-center border border-gray-100"><p className="text-gray-400 font-bold text-sm">لا يوجد منتجات بعد</p></div>}
          </section>
        ) : section === "orders" ? (
          <section className="space-y-3">
            <h2 className="text-lg font-black text-gray-900">الطلبات الواردة</h2>
            {orders.map((o) => (
              <div key={o.id} className="bg-white p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-black text-gray-900 text-sm">{o.items?.map((i: any) => i.part_name).join("، ")}</h3>
                  <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)} className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded-full uppercase border-0">
                    {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <p className="text-xs text-gray-400 font-medium">{o.buyer_name} · {o.delivery_method === "delivery" ? "توصيل" : "استلام من المعرض"}</p>
              </div>
            ))}
            {orders.length === 0 && <div className="bg-white rounded-3xl p-8 text-center border border-gray-100"><p className="text-gray-400 font-bold text-sm">لا يوجد طلبات بعد</p></div>}
          </section>
        ) : section === "messages" ? (
          <section className="bg-white rounded-3xl p-8 text-center border border-gray-100">
            <MessageSquare size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400 font-bold text-sm">الرسائل مع العملاء ستظهر هنا قريبًا</p>
          </section>
        ) : section === "delivery" ? (
          <section className="space-y-3">
            <h2 className="text-lg font-black text-gray-900">إعدادات التوصيل حسب المنتج</h2>
            <p className="text-xs text-gray-400 font-bold">يمكن تفعيل أو إلغاء خدمة التوصيل لكل منتج من صفحة تعديل المنتج.</p>
            {parts.filter((p) => p.delivery_supported).map((p) => (
              <div key={p.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center gap-3">
                <Truck size={16} className="text-emerald-500" />
                <span className="flex-1 font-bold text-gray-900 text-sm truncate">{p.name}</span>
              </div>
            ))}
          </section>
        ) : section === "analytics" ? (
          <section className="space-y-4">
            <h2 className="text-lg font-black text-gray-900">التحليلات</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-gray-100 text-center">
                <span className="block text-2xl font-black text-gray-900">{stats?.totalViews ?? 0}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 block">مشاهدات المنتجات</span>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-gray-100 text-center">
                <span className="block text-2xl font-black text-blue-500">{orders.length}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 block">إجمالي الطلبات</span>
              </div>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <h2 className="text-lg font-black text-gray-900">أدوات ذكية</h2>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3">
              <p className="text-xs font-bold text-gray-500">بحث سريع برقم القطعة (Part Number)</p>
              <div className="flex gap-2">
                <input
                  value={lookupPn} onChange={(e) => setLookupPn(e.target.value)} placeholder="مثال: 16117193372"
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm"
                />
                <button onClick={runLookup} disabled={looking} className="bg-black text-white px-4 rounded-xl font-bold text-sm disabled:opacity-50">
                  {looking ? <Loader2 size={16} className="animate-spin" /> : "بحث"}
                </button>
              </div>
              {lookupResult && !lookupResult.error && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs">
                  <p className="font-black text-gray-900">{lookupResult.name}</p>
                  <p className="text-gray-500 font-bold mt-0.5">{lookupResult.manufacturer} · {lookupResult.category}</p>
                </div>
              )}
              {lookupResult?.error && <p className="text-xs text-red-500 font-bold">{lookupResult.error}</p>}
            </div>

            <button type="button" onClick={onAddPart} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl flex items-center gap-3 hover:bg-gray-100 transition-colors text-right rtl:text-right">
              <Camera size={20} className="text-emerald-500" />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">التعرف على الصور</p>
                <p className="text-[10px] text-gray-400 font-bold">صوّر القطعة وخلي الذكاء الاصطناعي يحدد بياناتها - متاح عند إضافة منتج جديد</p>
              </div>
            </button>
            <button type="button" onClick={onAddPart} className="w-full bg-gray-50 border border-gray-100 p-4 rounded-2xl flex items-center gap-3 hover:bg-gray-100 transition-colors text-right rtl:text-right">
              <ScanLine size={20} className="text-emerald-500" />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">مسح الباركود / الصندوق</p>
                <p className="text-[10px] text-gray-400 font-bold">صوّر صندوق القطعة لاستخراج الباركود ورقم القطعة - متاح عند إضافة منتج جديد</p>
              </div>
            </button>
          </section>
        )}
      </div>
    </div>
  );
};
