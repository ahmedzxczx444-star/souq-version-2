import React from "react";
import { ChevronLeft } from "lucide-react";

interface TermsScreenProps {
  onBack: () => void;
}

export const TermsScreen: React.FC<TermsScreenProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 border-b border-gray-50 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">الشروط والأحكام</h1>
      </header>

      <div className="p-6 space-y-8 text-right" dir="rtl">
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">1. طبيعة المنصة</h2>
          <p className="text-gray-600 leading-relaxed">
            تعتبر المنصة سوقاً إلكترونياً يهدف إلى الربط بين بائعي السيارات ومشتريه. نحن نوفر المساحة التقنية لعرض السيارات والتواصل، ولا نتدخل في عمليات البيع المباشرة.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">2. ملكية المعروضات</h2>
          <p className="text-gray-600 leading-relaxed">
            المنصة لا تملك أي من السيارات المدرجة في القوائم. جميع السيارات المعروضة مملوكة للتجار أو الأفراد العارضين لها.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">3. مسؤولية المعلومات</h2>
          <p className="text-gray-600 leading-relaxed">
            يتحمل التجار والمعلنون المسؤولية الكاملة عن دقة وصحة المعلومات المتعلقة بالسيارات المعروضة، بما في ذلك الحالة الفنية والأسعار والمواصفات.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">4. إدارة المحتوى</h2>
          <p className="text-gray-600 leading-relaxed">
            تحتفظ المنصة بالحق في إزالة أي إعلانات مضللة أو احتيالية أو تخالف سياسات الاستخدام دون إشعار مسبق، وذلك لضمان سلامة ومصداقية السوق.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">5. الاستخدام القانوني</h2>
          <p className="text-gray-600 leading-relaxed">
            يجب على جميع المستخدمين استخدام المنصة للأغراض القانونية فقط ووفقاً للقوانين واللوائح المعمول بها في جمهورية مصر العربية.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">6. إخلاء المسؤولية</h2>
          <p className="text-gray-600 leading-relaxed">
            المنصة غير مسؤولة عن أي معاملات أو اتفاقيات تتم بين البائع والمشتري. ننصح دائماً بفحص السيارة جيداً والتأكد من الأوراق القانونية قبل إتمام أي عملية شراء.
          </p>
        </section>
      </div>
    </div>
  );
};
