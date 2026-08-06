import type { GoogleGenAI } from "@google/genai";
import { Type } from "@google/genai";

// Gemini vision prompts for Smart Product Import methods 3 & 4 (image recognition and
// barcode/box-photo scanning). Both are draft-only: callers must show the dealer an
// "are these details correct?" confirmation step before persisting anything - these
// functions never write to the database themselves. Reuses the single genAI client
// already configured in server.ts (same model, no new SDK dependency).

const IMAGE_RECOGNITION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    partNumber: { type: Type.STRING },
    category: { type: Type.STRING },
    condition: { type: Type.STRING },
    compatibleModels: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          make: { type: Type.STRING },
          model: { type: Type.STRING },
          yearFrom: { type: Type.INTEGER },
          yearTo: { type: Type.INTEGER },
        },
      },
    },
    confidence: { type: Type.INTEGER },
  },
  required: ["name", "category", "confidence"],
};

const BARCODE_SCAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    barcode: { type: Type.STRING },
    partNumber: { type: Type.STRING },
    manufacturer: { type: Type.STRING },
    category: { type: Type.STRING },
    confidence: { type: Type.INTEGER },
  },
  required: ["confidence"],
};

export interface ImageMimePart {
  base64: string;
  mimeType: string;
}

// Accepts a data URL ("data:image/jpeg;base64,...") or a raw base64 string + mime type.
export function parseDataUrl(input: string, fallbackMime = "image/jpeg"): ImageMimePart {
  const match = /^data:(.+?);base64,(.+)$/.exec(input);
  if (match) return { mimeType: match[1], base64: match[2] };
  return { mimeType: fallbackMime, base64: input };
}

export async function recognizePartImage(genAI: GoogleGenAI, image: ImageMimePart) {
  const prompt = `انت خبير في قطع غيار السيارات. حلل الصورة المرفقة لقطعة غيار سيارة وحدد:
اسم القطعة، رقم القطعة (Part Number) لو ظاهر في الصورة، الفئة (مثال: محرك، فرامل، كهرباء، هيكل)،
حالة القطعة (جديد/مستعمل/مجدد) بناءً على المظهر، والسيارات المتوافقة المحتملة (لو ممكن تحديدها من شكل القطعة).
لو مش متأكد من أي حقل رجّع قيمة فاضية له، وحدد مستوى ثقتك الإجمالي (confidence) من 0 إلى 100.`;

  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        { inlineData: { mimeType: image.mimeType, data: image.base64 } },
      ],
    }],
    config: { responseMimeType: "application/json", responseSchema: IMAGE_RECOGNITION_SCHEMA },
  });

  const parsed = JSON.parse(response.text as string);
  return {
    name: parsed?.name || "",
    partNumber: parsed?.partNumber || "",
    category: parsed?.category || "",
    condition: parsed?.condition || "",
    compatibleModels: Array.isArray(parsed?.compatibleModels) ? parsed.compatibleModels : [],
    confidence: typeof parsed?.confidence === "number" ? parsed.confidence : 0,
  };
}

export async function recognizeBarcode(genAI: GoogleGenAI, image: ImageMimePart) {
  const prompt = `انت خبير في قطع غيار السيارات. حلل الصورة المرفقة لصندوق/عبوة قطعة غيار سيارة وحدد:
الباركود لو ظاهر، رقم القطعة (Part Number / OEM Number) المطبوع على العبوة، اسم الشركة المصنعة، والفئة العامة للقطعة.
لو مش متأكد من أي حقل رجّع قيمة فاضية له، وحدد مستوى ثقتك الإجمالي (confidence) من 0 إلى 100.`;

  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        { inlineData: { mimeType: image.mimeType, data: image.base64 } },
      ],
    }],
    config: { responseMimeType: "application/json", responseSchema: BARCODE_SCAN_SCHEMA },
  });

  const parsed = JSON.parse(response.text as string);
  return {
    barcode: parsed?.barcode || "",
    partNumber: parsed?.partNumber || "",
    manufacturer: parsed?.manufacturer || "",
    category: parsed?.category || "",
    confidence: typeof parsed?.confidence === "number" ? parsed.confidence : 0,
  };
}
