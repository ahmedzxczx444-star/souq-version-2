import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, ShieldCheck, Zap, Star, Crown, ArrowRight, Loader2 } from 'lucide-react';
import { subscriptionsEnabled } from '../constants/config';
import { api } from '../services/api';

interface Plan {
  id: string;
  name: string;
  price: string;
  carsLimit: number;
  promotionsLimit: number;
  isVerified: boolean;
  priority: number;
  popular?: boolean;
  color: string;
  icon: any;
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'مجاني',
    price: '0 ج.م',
    carsLimit: 10,
    promotionsLimit: 0,
    isVerified: false,
    priority: 0,
    color: 'bg-gray-100 text-gray-600',
    icon: Star
  },
  {
    id: 'pro',
    name: 'برو',
    price: '499 ج.م',
    carsLimit: 50,
    promotionsLimit: 5,
    isVerified: false,
    priority: 1,
    color: 'bg-blue-50 text-blue-600',
    icon: Zap
  },
  {
    id: 'plus',
    name: 'بلس',
    price: '999 ج.م',
    carsLimit: 200,
    promotionsLimit: 20,
    isVerified: true,
    priority: 2,
    popular: true,
    color: 'bg-emerald-50 text-emerald-600',
    icon: ShieldCheck
  },
  {
    id: 'premium',
    name: 'بريميوم',
    price: '1999 ج.م',
    carsLimit: 9999,
    promotionsLimit: 9999,
    isVerified: true,
    priority: 3,
    color: 'bg-amber-50 text-amber-600',
    icon: Crown
  }
];

export const SubscriptionPlans: React.FC<{ onBack: () => void; user?: any }> = ({ onBack, user }) => {
  const [loading, setLoading] = useState<string | null>(null);

  if (!subscriptionsEnabled) return null;

  const handleUpgrade = async (planId: string) => {
    if (!user) return;
    setLoading(planId);
    try {
      const res = await api.subscription.changePlan(user.id, planId);
      if (res.success) {
        alert("تم تحديث الخطة بنجاح!");
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to upgrade plan:", err);
      alert("حدث خطأ أثناء تحديث الخطة");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-[#1a4d3e] text-white pt-12 pb-24 px-6 rounded-b-[40px]">
        <button 
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          <ArrowRight size={20} />
          <span className="font-arabic font-bold">العودة</span>
        </button>
        <h1 className="text-3xl font-black font-arabic mb-2">خطط الاشتراك</h1>
        <p className="text-white/70 font-arabic">اختر الخطة المناسبة لمعرضك وزد مبيعاتك</p>
      </div>

      <div className="px-6 -mt-16 space-y-6">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-white rounded-3xl p-6 shadow-xl relative overflow-hidden border-2 ${plan.popular ? 'border-emerald-500' : 'border-transparent'} ${user?.planType === plan.id ? 'ring-2 ring-emerald-500 ring-offset-4' : ''}`}
          >
            {plan.popular && (
              <div className="absolute top-0 left-0 bg-emerald-500 text-white px-4 py-1 rounded-br-2xl text-[10px] font-black font-arabic">
                الأكثر استخدامًا
              </div>
            )}

            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${plan.color}`}>
                  <plan.icon size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black font-arabic text-gray-900">{plan.name}</h3>
                  <p className="text-2xl font-black text-[#1a4d3e]">{plan.price}<span className="text-xs text-gray-400 font-normal">/شهرياً</span></p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check size={12} className="text-emerald-600" />
                </div>
                <span className="text-sm font-bold font-arabic text-gray-600">
                  حد السيارات: {plan.carsLimit === 9999 ? 'غير محدود' : plan.carsLimit}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check size={12} className="text-emerald-600" />
                </div>
                <span className="text-sm font-bold font-arabic text-gray-600">
                  ترويج السيارات: {plan.promotionsLimit === 9999 ? 'غير محدود' : plan.promotionsLimit}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${plan.isVerified ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  <Check size={12} className={plan.isVerified ? 'text-emerald-600' : 'text-gray-300'} />
                </div>
                <span className={`text-sm font-bold font-arabic ${plan.isVerified ? 'text-gray-600' : 'text-gray-300'}`}>
                  شارة معرض موثق
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check size={12} className="text-emerald-600" />
                </div>
                <span className="text-sm font-bold font-arabic text-gray-600">
                  أولوية الظهور: {plan.priority === 0 ? 'عادية' : plan.priority === 3 ? 'قصوى' : 'عالية'}
                </span>
              </div>
            </div>

            <button 
              onClick={() => handleUpgrade(plan.id)}
              disabled={loading === plan.id || user?.planType === plan.id}
              className={`w-full mt-8 py-4 rounded-2xl font-black font-arabic transition-all flex items-center justify-center gap-2 ${
                user?.planType === plan.id
                  ? 'bg-gray-100 text-gray-400 cursor-default'
                  : plan.popular 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600' 
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              }`}
            >
              {loading === plan.id ? <Loader2 className="animate-spin" size={20} /> : null}
              {user?.planType === plan.id ? 'خطتك الحالية' : 'اشترك الآن'}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
