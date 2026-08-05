import React, { useEffect, useState } from "react";
import { ChevronLeft, Loader2, Users, Car as CarIcon } from "lucide-react";
import { api } from "../services/api";

interface ChainBranchDashboardProps {
  branchId: number;
  branchName: string;
  onBack: () => void;
}

// Drill-down into a single branch of a chain dealer. Rendered directly by
// ChainDashboard (no App.tsx-level Screen/routing changes needed for this nested view).
export const ChainBranchDashboard: React.FC<ChainBranchDashboardProps> = ({ branchId, branchName, onBack }) => {
  const [stats, setStats] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [s, e] = await Promise.all([api.dealerBranches.getStats(branchId), api.dealerEmployees.getAll()]);
        setStats(s);
        setEmployees(e.filter((emp: any) => emp.branch_id === branchId));
      } catch (err) {
        console.error("Failed to load branch details:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [branchId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ChevronLeft size={20} className="rtl:rotate-180" />
        </button>
        <h2 className="text-lg font-black text-gray-900">{branchName}</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-300" size={32} /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center">
              <span className="block text-xl font-black text-gray-900">{stats?.totalCars ?? 0}</span>
              <span className="text-[9px] font-bold text-gray-400 uppercase flex items-center justify-center gap-1 mt-1"><CarIcon size={10} /> سيارات</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center">
              <span className="block text-xl font-black text-emerald-500">{stats?.totalViews ?? 0}</span>
              <span className="text-[9px] font-bold text-gray-400 uppercase mt-1 block">مشاهدات</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center">
              <span className="block text-xl font-black text-rose-500">{stats?.soldCount ?? 0}</span>
              <span className="text-[9px] font-bold text-gray-400 uppercase mt-1 block">مباعة</span>
            </div>
          </div>

          <div>
            <h3 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2"><Users size={16} /> موظفو الفرع</h3>
            <div className="space-y-2">
              {employees.map((emp) => (
                <div key={emp.id} className="bg-white p-3 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{emp.name}</p>
                    <p className="text-xs text-gray-400">{emp.email}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-full uppercase">{emp.role}</span>
                </div>
              ))}
              {employees.length === 0 && <p className="text-xs text-gray-400 font-bold text-center py-4">لا يوجد موظفين مخصصين لهذا الفرع</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
