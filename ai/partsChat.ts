import type { GoogleGenAI } from "@google/genai";
import { Type } from "@google/genai";

// Parts-domain counterpart to server.ts's buildRespondPrompt/respondWithCandidates -
// phrases a reply grounded only on real parts already retrieved deterministically by
// searchPartsByFilters (ai/partsSearchEngine.ts). Never touches the car-domain prompt
// functions in server.ts.

const PARTS_RESPOND_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING },
    matchedPartIds: { type: Type.ARRAY, items: { type: Type.INTEGER } },
  },
  required: ["text", "matchedPartIds"],
};

const partContextOf = (parts: any[]) =>
  parts.map((p) => ({
    id: p.id, name: p.name, part_number: p.part_number, manufacturer: p.manufacturer,
    category: p.category, part_subtype: p.part_subtype, condition_status: p.condition_status,
    price: p.price, status: p.status, delivery_supported: p.delivery_supported,
    compatibility: p.compatibility,
  }));

function buildPartsRespondPrompt(message: string, partContext: any[]): string {
  return `انت مساعد ذكي متخصص في قطع غيار السيارات لسوق سيارات مصري اسمه "سوق السيارات". رد باللهجة المصرية أو العربية الفصحى البسيطة، بشكل ودود ومختصر واحترافي، زي خبير قطع غيار حقيقي.
القطع المرشحة (مرشحة مسبقًا من قاعدة البيانات الفعلية، لا تخترع قطع غير موجودة فيها): ${JSON.stringify(partContext)}
رسالة المستخدم: "${message}"
التعليمات: اذكر فقط قطع من القائمة أعلاه. لو القائمة فاضية قل ذلك بوضوح واقترح تعديل الطلب (موديل أو سنة مختلفة). لو القطعة "نص قطاعة" أو مستعملة وضّح ذلك.
رجّع الرد بصيغة JSON بحقلين فقط: "text" (ردك النصي) و"matchedPartIds" (مصفوفة IDs من القائمة المرشحة فقط).`;
}

export async function respondWithPartsCandidates(
  genAI: GoogleGenAI | null,
  message: string,
  candidates: any[]
): Promise<{ text: string; matchedPartIds: number[] } | null> {
  if (!genAI) return null;
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: buildPartsRespondPrompt(message, partContextOf(candidates)) }] }],
      config: { responseMimeType: "application/json", responseSchema: PARTS_RESPOND_SCHEMA },
    });
    const parsed = JSON.parse(response.text as string);
    if (typeof parsed.text !== "string") return null;
    return { text: parsed.text, matchedPartIds: Array.isArray(parsed.matchedPartIds) ? parsed.matchedPartIds : [] };
  } catch (e) {
    console.error("[SmartSearch] parts respond-call error:", e);
    return null;
  }
}

export function buildDeterministicPartsReply(outcome: { parts: any[]; noExactMatch: boolean }): string {
  if (outcome.parts.length === 0) {
    return "للأسف مفيش قطع غيار متاحة دلوقتي تطابق طلبك. جرّب تحدد الموديل والسنة بشكل أوضح.";
  }
  if (outcome.noExactMatch) {
    return `مفيش نتيجة مطابقة تمامًا، بس دي أقرب ${Math.min(outcome.parts.length, 6)} قطع ممكن تناسبك:`;
  }
  return `لقيت لك ${outcome.parts.length} قطعة غيار تناسب طلبك:`;
}
