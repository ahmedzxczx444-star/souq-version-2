import React, { useEffect, useState } from "react";
import { Ban, CheckCircle, EyeOff, Flag, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { api } from "../services/api";

// Admin review of reports sent from the app (routes/moderation.ts).

const TARGET_LABELS: Record<string, string> = { car: "سيارة", reel: "فيديو", part: "قطعة غيار", dealer: "معرض", user: "مستخدم" };
const REASON_LABELS: Record<string, string> = {
  spam: "إعلان مزعج أو مكرر",
  fraud: "احتيال أو نصب",
  inappropriate: "محتوى غير لائق",
  offensive: "إساءة أو كراهية",
  misleading: "معلومات مضللة",
  other: "سبب آخر",
};
const STATUS_LABELS: Record<string, string> = { open: "مفتوح", actioned: "تم اتخاذ إجراء", dismissed: "مرفوض" };
const ACTION_LABELS: Record<string, string> = {
  none: "بدون إجراء",
  hide_content: "إخفاء المحتوى",
  suspend_dealer: "إيقاف المعرض",
  ban_user: "حظر المستخدم",
};

interface Report {
  id: number;
  target_type: string;
  target_id: number;
  reason: string;
  details: string | null;
  status: string;
  action_taken: string | null;
  admin_note: string | null;
  reporter_email: string | null;
  created_at: string;
  open_reports_for_target: number;
  target: { title?: string; status?: string; dealer_name?: string };
}

export const AdminReportsPanel: React.FC = () => {
  const [filter, setFilter] = useState<"open" | "actioned" | "dismissed" | "">("open");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setReports(await api.admin.getReports(filter || undefined));
    } catch {
      setError("تعذر تحميل البلاغات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const resolve = async (report: Report, status: "actioned" | "dismissed", action = "none") => {
    if (action !== "none" && !window.confirm(`تأكيد: ${ACTION_LABELS[action]}؟`)) return;
    setBusyId(report.id);
    setError(null);
    const res = await api.admin.resolveReport(report.id, status, action);
    setBusyId(null);
    if (res.error) setError(res.error);
    else load();
  };

  const canHide = (type: string) => ["car", "part", "reel"].includes(type);
  const hasDealer = (r: Report) => r.target_type !== "user" && Boolean(r.target.dealer_name);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(["open", "actioned", "dismissed", ""] as const).map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-bold ${filter === s ? "bg-black text-white" : "bg-white text-gray-600 border border-gray-100"}`}
          >
            {s ? STATUS_LABELS[s] : "الكل"}
          </button>
        ))}
      </div>
      {error && <p className="text-sm font-bold text-red-600">{error}</p>}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-gray-400" /></div>
      ) : reports.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-gray-100 text-center text-gray-400 font-bold">لا توجد بلاغات</div>
      ) : (
        reports.map((r) => (
          <div key={r.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-3">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0"><Flag size={20} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold bg-gray-100 rounded-lg px-2 py-1">{TARGET_LABELS[r.target_type] || r.target_type} #{r.target_id}</span>
                  <h4 className="font-bold text-gray-900 truncate">{r.target.title || "محتوى محذوف"}</h4>
                  {r.target.status && <span className="text-xs text-gray-400">({r.target.status})</span>}
                </div>
                {r.target.dealer_name && <p className="text-sm text-gray-500 mt-1">المعرض: {r.target.dealer_name}</p>}
                <p className="text-sm text-gray-700 mt-2"><strong>{REASON_LABELS[r.reason] || r.reason}</strong>{r.details ? ` — ${r.details}` : ""}</p>
                <p className="text-[11px] text-gray-400 mt-2 font-bold">
                  {new Date(r.created_at + "Z").toLocaleString("ar-EG")} · المبلّغ: {r.reporter_email || "—"}
                  {r.open_reports_for_target > 1 ? ` · ${r.open_reports_for_target} بلاغات مفتوحة على نفس المحتوى` : ""}
                </p>
                {r.status !== "open" && (
                  <p className="text-xs text-gray-500 mt-1">
                    {STATUS_LABELS[r.status]} · {ACTION_LABELS[r.action_taken || "none"]}{r.admin_note ? ` · ${r.admin_note}` : ""}
                  </p>
                )}
              </div>
            </div>
            {r.status === "open" && (
              <div className="flex flex-wrap gap-2">
                {canHide(r.target_type) && (
                  <button disabled={busyId === r.id} onClick={() => resolve(r, "actioned", "hide_content")} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-sm font-bold">
                    <EyeOff size={16} /> إخفاء المحتوى
                  </button>
                )}
                {(r.target_type === "dealer" || hasDealer(r)) && (
                  <button disabled={busyId === r.id} onClick={() => resolve(r, "actioned", "suspend_dealer")} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-bold">
                    <ShieldAlert size={16} /> إيقاف المعرض
                  </button>
                )}
                <button disabled={busyId === r.id} onClick={() => resolve(r, "actioned", "ban_user")} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-bold">
                  <Ban size={16} /> حظر صاحب المحتوى
                </button>
                <button disabled={busyId === r.id} onClick={() => resolve(r, "actioned")} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold">
                  <CheckCircle size={16} /> تمت المراجعة
                </button>
                <button disabled={busyId === r.id} onClick={() => resolve(r, "dismissed")} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gray-50 text-gray-600 text-sm font-bold">
                  <XCircle size={16} /> رفض البلاغ
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};
