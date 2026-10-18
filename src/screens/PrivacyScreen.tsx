import React from "react";
import { ChevronLeft, Languages } from "lucide-react";
import type { Language } from "../constants/translations";
import { PRIVACY_POLICY_UPDATED, privacyPolicy } from "../constants/privacyPolicy";

interface PrivacyScreenProps {
  onBack: () => void;
  lang: Language;
  toggleLanguage: () => void;
  onDeleteAccount: () => void;
}

/** Public privacy policy (also reachable directly at /privacy). */
export const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ onBack, lang, toggleLanguage, onDeleteAccount }) => {
  const policy = privacyPolicy[lang];
  const isAr = lang === "ar";
  return (
    <div className="min-h-screen bg-white" dir={isAr ? "rtl" : "ltr"}>
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 border-b border-gray-50 sticky top-0 bg-white z-10">
        <button onClick={onBack} aria-label={isAr ? "رجوع" : "Back"} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight flex-1">{policy.title}</h1>
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gray-50 text-xs font-bold text-gray-700 hover:bg-gray-100"
        >
          <Languages size={16} />
          {isAr ? "English" : "العربية"}
        </button>
      </header>

      <div className="p-6 space-y-8 max-w-2xl mx-auto">
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-400">
            {policy.updated}: {PRIVACY_POLICY_UPDATED}
          </p>
          <p className="text-gray-600 leading-relaxed">{policy.intro}</p>
        </div>

        {policy.sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-lg font-bold text-gray-900">{section.title}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p} className="text-gray-600 leading-relaxed">{p}</p>
            ))}
            {section.bullets && (
              <ul className="list-disc ps-5 space-y-2 text-gray-600 leading-relaxed">
                {section.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
            {section.notes?.map((p) => (
              <p key={p} className="text-gray-600 leading-relaxed">{p}</p>
            ))}
          </section>
        ))}

        <button
          onClick={onDeleteAccount}
          className="w-full py-4 rounded-2xl border border-red-100 bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
        >
          {isAr ? "طلب حذف الحساب" : "Request account deletion"}
        </button>
      </div>
    </div>
  );
};
