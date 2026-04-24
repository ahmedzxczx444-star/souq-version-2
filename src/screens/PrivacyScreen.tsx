import React from "react";
import { ChevronLeft } from "lucide-react";

interface PrivacyScreenProps {
  onBack: () => void;
}

export const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 border-b border-gray-50 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">سياسة الخصوصية</h1>
      </header>

      <div className="p-6 space-y-8 text-right" dir="rtl">
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">1. البيانات التي نجمعها</h2>
          <p className="text-gray-600 leading-relaxed">
            نقوم بجمع بعض البيانات الأساسية لتقديم خدماتنا، وتشمل: البريد الإلكتروني، رقم الهاتف، ومعلومات الحساب التي تزودنا بها عند التسجيل.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">2. لماذا نجمع هذه البيانات؟</h2>
          <p className="text-gray-600 leading-relaxed">
            نستخدم هذه البيانات لإنشاء حسابك، وتحسين تجربة المستخدم، والتواصل معك بخصوص إعلاناتك أو استفساراتك، ولضمان أمان المنصة.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">3. حماية البيانات</h2>
          <p className="text-gray-600 leading-relaxed">
            نحن ملتزمون بحماية بياناتك الشخصية واستخدام تقنيات أمان متقدمة لمنع الوصول غير المصرح به أو تسريب المعلومات.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">4. مشاركة البيانات</h2>
          <p className="text-gray-600 leading-relaxed">
            نحن نلتزم بعدم بيع أو تأجير بياناتك الشخصية لأي طرف ثالث لأغراض تسويقية. يتم استخدام البيانات فقط داخل إطار المنصة ولتحسين خدماتنا.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">5. ملفات تعريف الارتباط (Cookies)</h2>
          <p className="text-gray-600 leading-relaxed">
            نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح، وتذكر تفضيلاتك، وتحليل كيفية استخدام المنصة لتطويرها باستمرار.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">6. حقوق المستخدم</h2>
          <p className="text-gray-600 leading-relaxed">
            لديك الحق الكامل في تحديث بياناتك الشخصية أو طلب حذف حسابك وبياناتك من أنظمتنا في أي وقت من خلال إعدادات الحساب أو التواصل معنا.
          </p>
        </section>
      </div>
    </div>
  );
};
