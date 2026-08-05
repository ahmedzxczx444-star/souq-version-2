import React, { useEffect, useState } from "react";
import { ChevronLeft, Camera, Loader2, Search, CheckCircle2, XCircle, Plus, Trash2, ScanLine, Sparkles } from "lucide-react";
import { api } from "../services/api";
import { Part } from "../types";

interface AddPartScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  initialPart?: Part;
}

const PART_SUBTYPES = [
  { value: "new_parts", label: "قطع جديدة" },
  { value: "imported_parts", label: "قطع مستوردة" },
  { value: "half_cut", label: "نص قطاعة" },
  { value: "accessories", label: "إكسسوارات وتحسينات" },
  { value: "tires_batteries", label: "إطارات وبطاريات" },
  { value: "oils_consumables", label: "زيوت ومستهلكات" },
];

interface CompatRow { make: string; model: string; yearFrom: string; yearTo: string; }

export const AddPartScreen: React.FC<AddPartScreenProps> = ({ onBack, onSuccess, initialPart }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "", part_number: "", manufacturer: "", category: "", part_subtype: "new_parts",
    condition_status: "new", price: "", status: "available" as "available" | "unavailable",
    delivery_supported: false,
  });
  const [images, setImages] = useState<string[]>([]);
  const [compatibility, setCompatibility] = useState<CompatRow[]>([]);

  const [partNumberInput, setPartNumberInput] = useState("");
  const [looking, setLooking] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [lookupError, setLookupError] = useState("");

  // Smart Product Import methods 3 & 4: photo/barcode recognition. Both are
  // draft-only - `photoSuggestion` always requires the dealer's explicit "correct?"
  // confirmation before any field/image is applied to the form.
  const [scanning, setScanning] = useState<"image" | "barcode" | null>(null);
  const [photoSuggestion, setPhotoSuggestion] = useState<{ kind: "image" | "barcode"; data: any; capturedImage: string } | null>(null);
  const [scanError, setScanError] = useState("");

  useEffect(() => {
    if (initialPart) {
      setFormData({
        name: initialPart.name, part_number: initialPart.part_number || "", manufacturer: initialPart.manufacturer || "",
        category: initialPart.category || "", part_subtype: initialPart.part_subtype || "new_parts",
        condition_status: initialPart.condition_status || "new", price: initialPart.price?.toString() || "",
        status: initialPart.status, delivery_supported: !!initialPart.delivery_supported,
      });
      setImages(initialPart.images || []);
      setCompatibility((initialPart.compatibility || []).map((c) => ({
        make: c.make, model: c.model || "", yearFrom: c.year_from?.toString() || "", yearTo: c.year_to?.toString() || "",
      })));
    }
  }, [initialPart]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remainingSlots = 10 - images.length;
    Array.from(files).slice(0, remainingSlots).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => setImages((prev) => (prev.length >= 10 ? prev : [...prev, reader.result as string]));
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => setImages((prev) => prev.filter((_, i) => i !== index));

  const runLookup = async () => {
    if (!partNumberInput.trim()) return;
    setLooking(true);
    setLookupError("");
    setSuggestion(null);
    try {
      const result = await api.parts.lookupPartNumber(partNumberInput.trim());
      setSuggestion(result);
    } catch (e: any) {
      setLookupError(e.message || "فشل البحث عن رقم القطعة");
    } finally {
      setLooking(false);
    }
  };

  const acceptSuggestion = () => {
    if (!suggestion) return;
    setFormData((prev) => ({
      ...prev,
      name: suggestion.name || prev.name,
      manufacturer: suggestion.manufacturer || prev.manufacturer,
      category: suggestion.category || prev.category,
      part_number: partNumberInput.trim(),
    }));
    setCompatibility((suggestion.compatibleModels || []).map((c: any) => ({
      make: c.make || "", model: c.model || "", yearFrom: c.yearFrom?.toString() || "", yearTo: c.yearTo?.toString() || "",
    })));
    setSuggestion(null);
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleScanFile = async (kind: "image" | "barcode", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanning(kind);
    setScanError("");
    setPhotoSuggestion(null);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const data = kind === "image" ? await api.parts.recognizeImage(dataUrl) : await api.parts.recognizeBarcode(dataUrl);
      setPhotoSuggestion({ kind, data, capturedImage: dataUrl });
    } catch (err: any) {
      setScanError(err.message || "فشل التحليل، برجاء إدخال البيانات يدويًا");
    } finally {
      setScanning(null);
    }
  };

  const acceptPhotoSuggestion = () => {
    if (!photoSuggestion) return;
    const { kind, data, capturedImage } = photoSuggestion;
    if (kind === "image") {
      setFormData((prev) => ({
        ...prev,
        name: data.name || prev.name,
        part_number: data.partNumber || prev.part_number,
        category: data.category || prev.category,
        condition_status: data.condition || prev.condition_status,
      }));
      if (Array.isArray(data.compatibleModels) && data.compatibleModels.length > 0) {
        setCompatibility(data.compatibleModels.map((c: any) => ({
          make: c.make || "", model: c.model || "", yearFrom: c.yearFrom?.toString() || "", yearTo: c.yearTo?.toString() || "",
        })));
      }
      setImages((prev) => (prev.length >= 10 ? prev : [...prev, capturedImage]));
    } else {
      setFormData((prev) => ({
        ...prev,
        part_number: data.partNumber || prev.part_number,
        manufacturer: data.manufacturer || prev.manufacturer,
        category: data.category || prev.category,
      }));
    }
    setPhotoSuggestion(null);
  };

  const addCompatRow = () => setCompatibility((prev) => [...prev, { make: "", model: "", yearFrom: "", yearTo: "" }]);
  const updateCompatRow = (i: number, field: keyof CompatRow, value: string) =>
    setCompatibility((prev) => prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  const removeCompatRow = (i: number) => setCompatibility((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        price: formData.price ? Number(formData.price) : null,
        images,
        compatibility: compatibility.filter((c) => c.make).map((c) => ({
          make: c.make, model: c.model || null,
          yearFrom: c.yearFrom ? Number(c.yearFrom) : null, yearTo: c.yearTo ? Number(c.yearTo) : null,
        })),
      };
      if (initialPart) await api.parts.update(initialPart.id, payload);
      else await api.parts.create(payload);
      onSuccess();
    } catch (error: any) {
      alert(error.message || "فشل حفظ بيانات القطعة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pb-12">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 border-b border-gray-50 sticky top-0 bg-white z-10">
        <button onClick={onBack} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
          <ChevronLeft size={24} className="rtl:rotate-180" />
        </button>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">{initialPart ? "تعديل قطعة الغيار" : "إضافة قطعة غيار"}</h1>
      </header>

      {!initialPart && (
        <div className="px-6 pt-6">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">بحث سريع برقم القطعة (Part Number)</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="مثال: 16117193372"
              value={partNumberInput}
              onChange={(e) => setPartNumberInput(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
            />
            <button
              type="button"
              onClick={runLookup}
              disabled={looking}
              className="bg-black text-white px-5 rounded-2xl flex items-center gap-2 font-bold text-sm disabled:opacity-50"
            >
              {looking ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
              بحث
            </button>
          </div>
          {lookupError && <p className="text-xs text-red-500 font-bold mt-2">{lookupError}</p>}

          {suggestion && (
            <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-black text-emerald-700 uppercase tracking-wider">هل هذه البيانات صحيحة؟</p>
              <p className="text-sm font-bold text-gray-900">{suggestion.name}</p>
              <p className="text-xs text-gray-500 font-medium">{suggestion.manufacturer} · {suggestion.category}</p>
              {suggestion.compatibleModels?.length > 0 && (
                <p className="text-xs text-gray-500 font-medium">
                  متوافق مع: {suggestion.compatibleModels.map((c: any) => `${c.make} ${c.model || ""}`).join("، ")}
                </p>
              )}
              <p className="text-[10px] text-gray-400 font-bold">مستوى الثقة: {suggestion.confidence}%</p>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={acceptSuggestion} className="flex-1 bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1">
                  <CheckCircle2 size={16} /> نعم، صحيح
                </button>
                <button type="button" onClick={() => setSuggestion(null)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1">
                  <XCircle size={16} /> إدخال يدوي
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-4">
            <label className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl py-4 cursor-pointer hover:bg-gray-100 transition-colors">
              {scanning === "image" ? <Loader2 size={22} className="text-gray-400 animate-spin" /> : <Sparkles size={22} className="text-gray-400" />}
              <span className="text-xs font-bold text-gray-600">تحليل بالصورة</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleScanFile("image", e)} disabled={scanning !== null} />
            </label>
            <label className="flex flex-col items-center justify-center gap-1.5 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl py-4 cursor-pointer hover:bg-gray-100 transition-colors">
              {scanning === "barcode" ? <Loader2 size={22} className="text-gray-400 animate-spin" /> : <ScanLine size={22} className="text-gray-400" />}
              <span className="text-xs font-bold text-gray-600">مسح الباركود/الصندوق</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleScanFile("barcode", e)} disabled={scanning !== null} />
            </label>
          </div>
          {scanError && <p className="text-xs text-red-500 font-bold mt-2">{scanError}</p>}

          {photoSuggestion && (
            <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-3">
                <img src={photoSuggestion.capturedImage} className="w-14 h-14 rounded-xl object-cover border border-emerald-200" />
                <p className="text-xs font-black text-emerald-700 uppercase tracking-wider">هل هذه البيانات صحيحة؟</p>
              </div>
              {photoSuggestion.kind === "image" ? (
                <>
                  <p className="text-sm font-bold text-gray-900">{photoSuggestion.data.name}</p>
                  <p className="text-xs text-gray-500 font-medium">{photoSuggestion.data.category} · {photoSuggestion.data.condition}</p>
                  {photoSuggestion.data.partNumber && <p className="text-xs text-gray-500 font-medium">رقم القطعة: {photoSuggestion.data.partNumber}</p>}
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-gray-900">{photoSuggestion.data.manufacturer || "شركة غير محددة"}</p>
                  <p className="text-xs text-gray-500 font-medium">{photoSuggestion.data.category}</p>
                  {photoSuggestion.data.partNumber && <p className="text-xs text-gray-500 font-medium">رقم القطعة: {photoSuggestion.data.partNumber}</p>}
                  {photoSuggestion.data.barcode && <p className="text-xs text-gray-500 font-medium">الباركود: {photoSuggestion.data.barcode}</p>}
                </>
              )}
              <p className="text-[10px] text-gray-400 font-bold">مستوى الثقة: {photoSuggestion.data.confidence}%</p>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={acceptPhotoSuggestion} className="flex-1 bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1">
                  <CheckCircle2 size={16} /> نعم، صحيح
                </button>
                <button type="button" onClick={() => setPhotoSuggestion(null)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1">
                  <XCircle size={16} /> إدخال يدوي
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">اسم القطعة</label>
            <input
              type="text" required placeholder="مثال: طرمبة مياه"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">رقم القطعة (اختياري)</label>
              <input
                type="text" value={formData.part_number}
                onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">الشركة المصنعة</label>
              <input
                type="text" value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">التصنيف</label>
              <select
                value={formData.part_subtype}
                onChange={(e) => setFormData({ ...formData, part_subtype: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5 appearance-none"
              >
                {PART_SUBTYPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">الحالة</label>
              <select
                value={formData.condition_status}
                onChange={(e) => setFormData({ ...formData, condition_status: e.target.value })}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5 appearance-none"
              >
                <option value="new">جديد</option>
                <option value="used">مستعمل</option>
                <option value="refurbished">مجدد</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">الفئة العامة (مثال: محرك، فرامل، كهرباء)</label>
            <input
              type="text" value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">السعر (اختياري)</label>
            <input
              type="number" placeholder="اتركه فارغًا لعرض 'اتصل للسعر'"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">الحالة في المخزون</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/5 appearance-none"
            >
              <option value="available">✅ متاح</option>
              <option value="unavailable">❌ غير متاح</option>
            </select>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6">
            <input
              type="checkbox" id="delivery" checked={formData.delivery_supported}
              onChange={(e) => setFormData({ ...formData, delivery_supported: e.target.checked })}
              className="w-5 h-5 rounded-lg border-gray-300 text-black focus:ring-black"
            />
            <label htmlFor="delivery" className="text-sm font-bold text-gray-900 cursor-pointer">يوجد خدمة توصيل لهذه القطعة</label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">السيارات المتوافقة</label>
              <button type="button" onClick={addCompatRow} className="flex items-center gap-1 text-xs font-bold text-black bg-gray-100 px-3 py-1.5 rounded-full">
                <Plus size={14} /> إضافة
              </button>
            </div>
            <div className="space-y-2">
              {compatibility.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_70px_70px_auto] gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
                  <input placeholder="الماركة" value={row.make} onChange={(e) => updateCompatRow(i, "make", e.target.value)} className="bg-white border border-gray-100 rounded-lg px-2 py-2 text-xs font-bold" />
                  <input placeholder="الموديل" value={row.model} onChange={(e) => updateCompatRow(i, "model", e.target.value)} className="bg-white border border-gray-100 rounded-lg px-2 py-2 text-xs font-bold" />
                  <input placeholder="من سنة" value={row.yearFrom} onChange={(e) => updateCompatRow(i, "yearFrom", e.target.value)} className="bg-white border border-gray-100 rounded-lg px-2 py-2 text-xs font-bold" />
                  <input placeholder="إلى سنة" value={row.yearTo} onChange={(e) => updateCompatRow(i, "yearTo", e.target.value)} className="bg-white border border-gray-100 rounded-lg px-2 py-2 text-xs font-bold" />
                  <button type="button" onClick={() => removeCompatRow(i)} className="p-1.5 text-red-400"><Trash2 size={14} /></button>
                </div>
              ))}
              {compatibility.length === 0 && <p className="text-xs text-gray-400 font-bold text-center py-3">لم تتم إضافة توافقات بعد</p>}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">الصور ({images.length}/10)</label>
            <div className="flex gap-3 overflow-x-auto pb-4 px-1">
              {images.length < 10 && (
                <label className="flex-shrink-0 w-28 h-28 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[24px] flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all">
                  <Camera size={28} className="text-gray-400 mb-1" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">إضافة</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </label>
              )}
              {images.map((img, i) => (
                <div key={i} className="flex-shrink-0 w-28 h-28 rounded-[24px] overflow-hidden border border-gray-100 relative group shadow-sm">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-2 right-2 w-7 h-7 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                    <ChevronLeft size={16} className="rotate-45" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full bg-black text-white font-bold py-5 rounded-[32px] shadow-xl shadow-black/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : "حفظ"}
        </button>
      </form>
    </div>
  );
};
