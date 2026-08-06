import type { GoogleGenAI } from "@google/genai";
import { Type } from "@google/genai";

// Runs ahead of (never merged into) the existing car-only "understand" call in
// server.ts. Decides whether a Smart Search message is about cars, parts, or both -
// silently, per the requirement that the assistant must never ask the user which
// vertical they meant. UNDERSTAND_SCHEMA/buildUnderstandPrompt in server.ts are never
// touched by this file.

const DOMAIN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    domain: { type: Type.STRING, enum: ["car", "parts", "ambiguous"] },
    confidence: { type: Type.INTEGER },
    carQuery: { type: Type.STRING },
    partsQuery: { type: Type.STRING },
  },
  required: ["domain", "confidence"],
};

export interface DomainClassification {
  domain: "car" | "parts" | "ambiguous";
  confidence: number;
  carQuery: string;
  partsQuery: string;
}

const FALLBACK: DomainClassification = { domain: "ambiguous", confidence: 0, carQuery: "", partsQuery: "" };

export async function classifyDomain(
  genAI: GoogleGenAI | null,
  message: string,
  history: { role: string; content: string }[]
): Promise<DomainClassification> {
  if (!genAI) return { ...FALLBACK, carQuery: message, partsQuery: message };

  const prompt = `انت مصنّف نوايا لمنصة "سوق السيارات" اللي بتبيع سيارات كاملة وقطع غيار سيارات مع بعض. مهمتك تحدد هل رسالة المستخدم عن:
- car: طلب سيارة كاملة (مثال: "BMW 320"، "مرسيدس C180 حديثة")
- parts: طلب قطعة غيار (مثال: "طرمبة مياه إلنترا 2019"، "نص قطاعة BMW F30"، "باب مرسيدس")
- ambiguous: مش واضح، أو ممكن يكون الاتنين، أو استفسار عام

آخر رسائل من المحادثة: ${JSON.stringify(history)}
رسالة المستخدم: "${message}"

رجّع الفئة (domain) ومستوى الثقة (confidence 0-100)، وcarQuery (نص الرسالة معاد صياغته كطلب سيارة لو الفئة car أو ambiguous)،
وpartsQuery (نص الرسالة معاد صياغته كطلب قطعة غيار لو الفئة parts أو ambiguous). لا تسأل المستخدم أي سؤال توضيحي هنا أبدًا - فقط صنّف.`;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json", responseSchema: DOMAIN_SCHEMA },
    });
    const parsed = JSON.parse(response.text as string);
    const domain = ["car", "parts", "ambiguous"].includes(parsed?.domain) ? parsed.domain : "ambiguous";
    const confidence = typeof parsed?.confidence === "number" ? Math.max(0, Math.min(100, parsed.confidence)) : 0;
    return {
      domain,
      confidence,
      carQuery: typeof parsed?.carQuery === "string" && parsed.carQuery ? parsed.carQuery : message,
      partsQuery: typeof parsed?.partsQuery === "string" && parsed.partsQuery ? parsed.partsQuery : message,
    };
  } catch (e) {
    console.error("[SmartSearch] domain classification failed, treating as ambiguous:", e);
    return { ...FALLBACK, carQuery: message, partsQuery: message };
  }
}
