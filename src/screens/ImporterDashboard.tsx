import React, { useEffect, useState } from "react";
import { ChevronLeft, Plus, Loader2, Warehouse, Ship, PackageCheck } from "lucide-react";
import { api } from "../services/api";
import { User as UserType } from "../types";

interface ImporterDashboardProps {
  user: UserType;
  onBack: () => void;
  t: any;
}

type Section = "shipments" | "warehouses" | "preorders";

const SHIPMENT_STATUSES = ["pending", "in_transit", "customs", "arrived", "cleared"] as const;
const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار", in_transit: "في الطريق", customs: "الجمارك", arrived: "وصلت", cleared: "تم التخليص",
  requested: "مطلوب", confirmed: "مؤكد", fulfilled: "تم التنفيذ", cancelled: "ملغي",
};

export const ImporterDashboard: React.FC<ImporterDashboardProps> = ({ onBack }) => {
  const [section, setSection] = useState<Section>("shipments");
  const [shipments, setShipments] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [preorders, setPreorders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewShipment, setShowNewShipment] = useState(false);
  const [newShipment, setNewShipment] = useState({ reference_code: "", origin_country: "", carrier: "" });
  const [showNewWarehouse, setShowNewWarehouse] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({ name: "", location: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [s, w, p] = await Promise.all([api.importer.getShipments(), api.importer.getWarehouses(), api.importer.getPreorders()]);
      setShipments(s);
      setWarehouses(w);
      setPreorders(p);
    } catch (e) {
      console.error("Failed to load importer dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createShipment = async () => {
    if (!newShipment.reference_code) return;
    await api.importer.createShipment(newShipment);
    setNewShipment({ reference_code: "", origin_country: "", carrier: "" });
    setShowNewShipment(false);
    load();
  };

  const updateShipmentStatus = async (id: number, status: string) => {
    await api.importer.updateShipment(id, { status });
    load();
  };

  const createWarehouse = async () => {
    if (!newWarehouse.name) return;
    await api.importer.createWarehouse(newWarehouse);
    setNewWarehouse({ name: "", location: "" });
    setShowNewWarehouse(false);
    load();
  };

  const updatePreorderStatus = async (id: number, status: string) => {
    await api.importer.updatePreorder(id, status);
    load();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">لوحة تحكم المستورد</h1>
      </header>

      <div className="p-6 space-y-6">
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          {([
            { id: "shipments", label: "الشحنات", icon: Ship },
            { id: "warehouses", label: "المستودعات", icon: Warehouse },
            { id: "preorders", label: "الطلبات المسبقة", icon: PackageCheck },
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
        ) : section === "shipments" ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">الشحنات الواردة</h2>
              <button onClick={() => setShowNewShipment((s) => !s)} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-bold">
                <Plus size={16} /> شحنة جديدة
              </button>
            </div>
            {showNewShipment && (
              <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3">
                <input placeholder="رقم مرجعي للشحنة" value={newShipment.reference_code} onChange={(e) => setNewShipment({ ...newShipment, reference_code: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm" />
                <input placeholder="بلد المنشأ" value={newShipment.origin_country} onChange={(e) => setNewShipment({ ...newShipment, origin_country: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm" />
                <input placeholder="شركة الشحن (اختياري)" value={newShipment.carrier} onChange={(e) => setNewShipment({ ...newShipment, carrier: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm" />
                <button onClick={createShipment} className="w-full bg-emerald-500 text-white font-bold py-2.5 rounded-xl">حفظ الشحنة</button>
              </div>
            )}
            {shipments.map((s) => (
              <div key={s.id} className="bg-white p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-gray-900 text-sm">{s.reference_code}</h3>
                  <select
                    value={s.status}
                    onChange={(e) => updateShipmentStatus(s.id, e.target.value)}
                    className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded-full uppercase border-0"
                  >
                    {SHIPMENT_STATUSES.map((st) => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
                  </select>
                </div>
                <p className="text-xs text-gray-400 font-medium">{s.origin_country || "-"} {s.carrier ? `· ${s.carrier}` : ""}</p>
              </div>
            ))}
            {shipments.length === 0 && (
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-100">
                <p className="text-gray-400 font-bold text-sm">لا يوجد شحنات بعد</p>
              </div>
            )}
          </section>
        ) : section === "warehouses" ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">المستودعات</h2>
              <button onClick={() => setShowNewWarehouse((s) => !s)} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-bold">
                <Plus size={16} /> مستودع جديد
              </button>
            </div>
            {showNewWarehouse && (
              <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3">
                <input placeholder="اسم المستودع" value={newWarehouse.name} onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm" />
                <input placeholder="الموقع" value={newWarehouse.location} onChange={(e) => setNewWarehouse({ ...newWarehouse, location: e.target.value })} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm" />
                <button onClick={createWarehouse} className="w-full bg-emerald-500 text-white font-bold py-2.5 rounded-xl">حفظ المستودع</button>
              </div>
            )}
            {warehouses.map((w) => (
              <div key={w.id} className="bg-white p-4 rounded-2xl border border-gray-100">
                <h3 className="font-black text-gray-900 text-sm">{w.name}</h3>
                <p className="text-xs text-gray-400 font-medium mt-0.5">{w.location}</p>
              </div>
            ))}
            {warehouses.length === 0 && (
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-100">
                <p className="text-gray-400 font-bold text-sm">لا يوجد مستودعات بعد</p>
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            <h2 className="text-lg font-black text-gray-900">الطلبات المسبقة</h2>
            {preorders.map((p) => (
              <div key={p.id} className="bg-white p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-black text-gray-900 text-sm">{p.car_make} {p.car_model} {p.desired_year || ""}</h3>
                  <select
                    value={p.status}
                    onChange={(e) => updatePreorderStatus(p.id, e.target.value)}
                    className="text-[10px] font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded-full uppercase border-0"
                  >
                    {["requested", "confirmed", "fulfilled", "cancelled"].map((st) => <option key={st} value={st}>{STATUS_LABELS[st]}</option>)}
                  </select>
                </div>
                <p className="text-xs text-gray-400 font-medium">{p.customer_name} · {p.customer_email}</p>
              </div>
            ))}
            {preorders.length === 0 && (
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-100">
                <p className="text-gray-400 font-bold text-sm">لا يوجد طلبات مسبقة بعد</p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
