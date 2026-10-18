import React, { useState } from "react";
import { CheckCircle2, ChevronLeft, Languages, Trash2 } from "lucide-react";
import type { Language } from "../constants/translations";
import { SUPPORT_EMAIL } from "../constants/privacyPolicy";
import { api } from "../services/api";

interface DeleteAccountScreenProps {
  onBack: () => void;
  onOpenPrivacy: () => void;
  onForgotPassword: () => void;
  /** Called with the deleted account's email after the server confirmed it. */
  onDeleted: (email: string) => void;
  lang: Language;
  toggleLanguage: () => void;
}

const copy = {
  ar: {
    title: "حذف الحساب",
    intro: "احذف حسابك في أسواق السيارات من هنا إذا لم يعد التطبيق متاحًا لديك. يمكنك أيضًا الحذف من التطبيق: الإعدادات ← حذف الحساب.",
    removedTitle: "ما الذي يُحذف",
    removed: [
      "الاسم والبريد الإلكتروني وكلمة المرور، فلا يمكن الدخول بالحساب مرة أخرى.",
      "المفضلة والمتابعات والتقييمات والإعجابات والإشعارات والحسابات المحظورة.",
      "عنوان التوصيل والملاحظات في طلبات قطع الغيار.",
      "للتجار: بيانات المعرض، وصور السيارات والقطع، والفيديوهات، والفروع والموظفين والعروض والضمانات والمخازن والشحنات.",
    ],
    keptTitle: "ما الذي نحتفظ به",
    kept: [
      "سجلات الطلبات والحجوزات لأنها تخص الطرف الآخر، ويظهر صاحب الحساب المحذوف باسم «مستخدم محذوف».",
      "البلاغات لأغراض الإشراف، وسجل النشاط بعد حذف تفاصيله.",
      "سجل رسائل التحقق (البريد وعنوان IP) حتى 30 يومًا.",
    ],
    verifyTitle: "أكد أنك صاحب الحساب",
    verifyHint: "أدخل البريد الإلكتروني وكلمة المرور الخاصة بالحساب.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    confirm: "أفهم أن حذف الحساب نهائي ولا يمكن التراجع عنه.",
    submit: "حذف الحساب نهائيًا",
    working: "جارٍ الحذف...",
    forgot: "نسيت كلمة المرور؟ أعد تعيينها أولًا",
    privacy: "سياسة الخصوصية",
    contact: `لا يمكنك الدخول إلى بريدك؟ راسلنا من عنوان الحساب على ${SUPPORT_EMAIL}.`,
    doneTitle: "تم حذف حسابك",
    doneBody: "حذفنا بيانات حسابك كما هو موضح أعلاه. لن تتمكن من الدخول بهذا الحساب مرة أخرى.",
    missing: "أدخل البريد الإلكتروني وكلمة المرور ووافق على التأكيد.",
    failed: "تعذر التحقق من هذه البيانات. تأكد من البريد وكلمة المرور، أو أعد تعيين كلمة المرور أولًا.",
    tooMany: "محاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى.",
    admin: "لا يمكن حذف حسابات المشرفين من هذه الصفحة.",
  },
  en: {
    title: "Delete your account",
    intro: "Delete your Asuaq Cars account here if you no longer have the app. You can also delete it in the app: Settings → Delete account.",
    removedTitle: "What is deleted",
    removed: [
      "Your name, email and password, so the account can never sign in again.",
      "Favourites, follows, ratings, likes, notifications and blocked accounts.",
      "The delivery address and notes on your spare-part orders.",
      "For dealers: the showroom details, car and part photos, videos, branches, employees, offers, warranties, warehouses and shipments.",
    ],
    keptTitle: "What we keep",
    kept: [
      "Order and pre-order records, because they belong to the other party too; the deleted account shows as \"Deleted user\".",
      "Reports, for moderation records, and activity-log entries with their details erased.",
      "The verification-email log (email and IP address) for up to 30 days.",
    ],
    verifyTitle: "Confirm it is your account",
    verifyHint: "Enter the account's email address and password.",
    email: "Email address",
    password: "Password",
    confirm: "I understand that deleting my account is permanent and cannot be undone.",
    submit: "Delete my account permanently",
    working: "Deleting...",
    forgot: "Forgot your password? Reset it first",
    privacy: "Privacy policy",
    contact: `Can't access your email? Write to us from the account's address at ${SUPPORT_EMAIL}.`,
    doneTitle: "Your account was deleted",
    doneBody: "We deleted your account data as described above. You cannot sign in with this account again.",
    missing: "Enter your email and password and tick the confirmation.",
    failed: "We could not verify these details. Check the email and password, or reset your password first.",
    tooMany: "Too many attempts. Wait a minute and try again.",
    admin: "Administrator accounts cannot be deleted from this page.",
  },
};

/**
 * Public account-deletion page (souq-elsyrat.com/delete-account), linked from
 * Google Play. Ownership is proven with the account's email and password; the
 * answer for a wrong password and an unknown email is the same.
 */
export const DeleteAccountScreen: React.FC<DeleteAccountScreenProps> = ({ onBack, onOpenPrivacy, onForgotPassword, onDeleted, lang, toggleLanguage }) => {
  const c = copy[lang];
  const isAr = lang === "ar";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !confirmed) {
      setError(c.missing);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.account.requestDeletion(email.trim(), password);
      if (res.success) {
        setDone(true);
        setPassword("");
        onDeleted(email.trim());
      } else if (res.error === "Too many requests") setError(c.tooMany);
      else if (res.error?.startsWith("Administrator")) setError(c.admin);
      else setError(c.failed);
    } catch {
      setError(c.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" dir={isAr ? "rtl" : "ltr"}>
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 border-b border-gray-50 sticky top-0 bg-white z-10">
        <button onClick={onBack} aria-label={isAr ? "رجوع" : "Back"} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight flex-1">{c.title}</h1>
        <button onClick={toggleLanguage} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gray-50 text-xs font-bold text-gray-700 hover:bg-gray-100">
          <Languages size={16} />
          {isAr ? "English" : "العربية"}
        </button>
      </header>

      <div className="p-6 space-y-6 max-w-xl mx-auto">
        <p className="text-gray-600 leading-relaxed">{c.intro}</p>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900">{c.removedTitle}</h2>
          <ul className="list-disc ps-5 space-y-1 text-sm text-gray-600 leading-relaxed">
            {c.removed.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-bold text-gray-900">{c.keptTitle}</h2>
          <ul className="list-disc ps-5 space-y-1 text-sm text-gray-600 leading-relaxed">
            {c.kept.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </section>

        {done ? (
          <div role="status" className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 flex gap-3">
            <CheckCircle2 className="text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-emerald-900">{c.doneTitle}</p>
              <p className="text-sm text-emerald-800 mt-1">{c.doneBody}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-3xl border border-gray-100 p-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">{c.verifyTitle}</h2>
              <p className="text-sm text-gray-500 mt-1">{c.verifyHint}</p>
            </div>
            <label className="block">
              <span className="text-xs font-bold text-gray-500">{c.email}</span>
              <input
                type="email"
                aria-label={c.email}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                dir="ltr"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold text-gray-500">{c.password}</span>
              <input
                type="password"
                aria-label={c.password}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full bg-gray-50 border border-gray-100 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                dir="ltr"
              />
            </label>
            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input type="checkbox" aria-label={c.confirm} checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
              <span>{c.confirm}</span>
            </label>
            {error && <p role="alert" className="text-sm font-bold text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="w-full py-4 rounded-2xl bg-red-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-red-700 transition-colors"
            >
              <Trash2 size={18} />
              {busy ? c.working : c.submit}
            </button>
            <button type="button" onClick={onForgotPassword} className="w-full text-sm font-bold text-gray-600 hover:underline">
              {c.forgot}
            </button>
          </form>
        )}

        <p className="text-xs text-gray-500 leading-relaxed">{c.contact}</p>
        <button onClick={onOpenPrivacy} className="text-sm font-bold text-emerald-700 hover:underline">
          {c.privacy}
        </button>
      </div>
    </div>
  );
};
