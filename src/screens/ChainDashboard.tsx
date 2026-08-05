import React, { useEffect, useState } from "react";
import { ChevronLeft, Plus, Trash2, Loader2, Building2, Users, BarChart3, LayoutGrid } from "lucide-react";
import { api } from "../services/api";
import { User as UserType } from "../types";
import { ChainBranchDashboard } from "./ChainBranchDashboard";

interface ChainDashboardProps {
  user: UserType;
  onBack: () => void;
  t: any;
}

type Section = "overview" | "branches" | "employees";

// Central HQ dashboard for the "chain" dealer category (e.g. multi-region chains like
// El-Laithy/El-Qureshi): aggregate branch reports, employee/regional-manager
// permissions, and per-branch drill-down (rendered locally, not via App.tsx routing).
export const ChainDashboard: React.FC<ChainDashboardProps> = ({ onBack }) => {
  const [section, setSection] = useState<Section>("overview");
  const [overview, setOverview] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<{ id: number; name: string } | null>(null);
  const [newEmployee, setNewEmployee] = useState({ email: "", branch_id: "", role: "branch_manager" });
  const [showNewEmployee, setShowNewEmployee] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [ov, br, emp] = await Promise.all([
        api.dealerChain.getOverview(),
        api.dealerBranches.getAll(),
        api.dealerEmployees.getAll(),
      ]);
      setOverview(ov);
      setBranches(br);
      setEmployees(emp);
    } catch (e) {
      console.error("Failed to load chain dashboard:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createEmployee = async () => {
    if (!newEmployee.email) return;
    try {
      await api.dealerEmployees.create({
        email: newEmployee.email,
        branch_id: newEmployee.branch_id ? Number(newEmployee.branch_id) : null,
        role: newEmployee.role,
        permissions: newEmployee.role === "regional_manager"
          ? { manage_cars: true, manage_branches: true, view_reports: true }
          : { manage_cars: true, view_reports: true },
      });
      setNewEmployee({ email: "", branch_id: "", role: "branch_manager" });
      setShowNewEmployee(false);
      load();
    } catch (e: any) {
      alert(e.message || "فشل إضافة الموظف");
    }
  };

  const removeEmployee = async (id: number) => {
    if (!window.confirm("إزالة هذا الموظف؟")) return;
    await api.dealerEmployees.delete(id);
    load();
  };

  if (selectedBranch) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="p-6">
          <ChainBranchDashboard branchId={selectedBranch.id} branchName={selectedBranch.name} onBack={() => setSelectedBranch(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">لوحة تحكم السلسلة المركزية</h1>
      </header>

      <div className="p-6 space-y-6">
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          {([
            { id: "overview", label: "نظرة عامة", icon: LayoutGrid },
            { id: "branches", label: "الفروع", icon: Building2 },
            { id: "employees", label: "الموظفون", icon: Users },
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
        ) : section === "overview" ? (
          <section className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-gray-100 text-center">
                <span className="block text-2xl font-black text-gray-900">{overview?.totalBranches ?? 0}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 block">إجمالي الفروع</span>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-gray-100 text-center">
                <span className="block text-2xl font-black text-emerald-500">{overview?.totalCars ?? 0}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 block">إجمالي السيارات</span>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-gray-100 text-center">
                <span className="block text-2xl font-black text-amber-500">{overview?.unassignedCars ?? 0}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 block">سيارات غير موزعة</span>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-gray-100 text-center">
                <span className="block text-2xl font-black text-blue-500">{overview?.employeeCount ?? 0}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 block">الموظفون</span>
              </div>
            </div>

            <div>
              <h3 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2"><BarChart3 size={16} /> أداء الفروع</h3>
              <div className="space-y-2">
                {(overview?.branchPerformance || []).map((bp: any) => (
                  <div key={bp.branchId} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{bp.branchName}</p>
                      {bp.region && <p className="text-xs text-gray-400">{bp.region}</p>}
                    </div>
                    <div className="text-left rtl:text-right">
                      <p className="font-black text-gray-900 text-sm">{bp.totalCars} سيارة</p>
                      <p className="text-xs text-emerald-500 font-bold">{bp.totalViews} مشاهدة</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : section === "branches" ? (
          <section className="space-y-3">
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBranch({ id: b.id, name: b.name })}
                className="w-full bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between text-right rtl:text-right hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h3 className="font-black text-gray-900 text-sm">{b.name}</h3>
                  <p className="text-xs text-gray-400 font-medium mt-0.5">{b.address}</p>
                </div>
                <ChevronLeft size={18} className="text-gray-300 rotate-180 rtl:rotate-0" />
              </button>
            ))}
            {branches.length === 0 && (
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-100">
                <p className="text-gray-400 font-bold text-sm">لا يوجد فروع بعد</p>
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-gray-900">إدارة الصلاحيات</h2>
              <button
                onClick={() => setShowNewEmployee((s) => !s)}
                className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full text-sm font-bold"
              >
                <Plus size={16} /> إضافة موظف
              </button>
            </div>

            {showNewEmployee && (
              <div className="bg-white p-4 rounded-2xl border border-gray-100 space-y-3">
                <input
                  placeholder="البريد الإلكتروني للموظف"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm"
                />
                <select
                  value={newEmployee.branch_id}
                  onChange={(e) => setNewEmployee({ ...newEmployee, branch_id: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm"
                >
                  <option value="">بدون فرع (نطاق إقليمي)</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select
                  value={newEmployee.role}
                  onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 font-bold text-sm"
                >
                  <option value="branch_manager">مدير فرع</option>
                  <option value="regional_manager">مدير إقليمي</option>
                  <option value="staff">موظف</option>
                </select>
                <button onClick={createEmployee} className="w-full bg-emerald-500 text-white font-bold py-2.5 rounded-xl">إضافة</button>
              </div>
            )}

            {employees.map((emp) => (
              <div key={emp.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{emp.name}</p>
                  <p className="text-xs text-gray-400">{emp.email} · {emp.branch_name || "نطاق إقليمي"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-full uppercase">{emp.role}</span>
                  <button onClick={() => removeEmployee(emp.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-xl">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            {employees.length === 0 && (
              <div className="bg-white rounded-3xl p-8 text-center border border-gray-100">
                <p className="text-gray-400 font-bold text-sm">لا يوجد موظفين بعد</p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
