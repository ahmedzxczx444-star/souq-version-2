import React, { useState } from "react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { subscriptionsEnabled } from "../constants/config";
import { api } from "../services/api";

interface PromoteButtonProps {
  carId: number;
  userId: number;
  isPromoted?: boolean;
  onSuccess?: () => void;
}

export const PromoteButton: React.FC<PromoteButtonProps> = ({ carId, userId, isPromoted, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!subscriptionsEnabled) return null;

  const handlePromote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPromoted || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await api.subscription.promote(userId, carId);
      if (res.success) {
        setStatus("success");
        onSuccess?.();
      } else {
        setError(res.error || "Failed to promote car");
        setStatus("error");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setStatus("error");
    } finally {
      setLoading(false);
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handlePromote}
        disabled={isPromoted || loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-sm transition-all ${
          isPromoted
            ? "bg-emerald-100 text-emerald-600 cursor-default"
            : status === "success"
            ? "bg-emerald-500 text-white"
            : status === "error"
            ? "bg-rose-500 text-white"
            : "bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200"
        }`}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Loader2 size={18} />
            </motion.div>
          ) : status === "success" || isPromoted ? (
            <motion.div
              key="success"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <CheckCircle2 size={18} />
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Sparkles size={18} />
            </motion.div>
          )}
        </AnimatePresence>
        <span>{isPromoted ? "Promoted" : status === "success" ? "Done!" : status === "error" ? "Limit Reached" : "Promote"}</span>
      </motion.button>

      {error && (
        <div className="absolute top-full mt-2 left-0 w-48 p-2 bg-rose-50 text-rose-600 text-[10px] rounded-xl border border-rose-100 z-50 shadow-xl">
          {error}
        </div>
      )}
    </div>
  );
};
