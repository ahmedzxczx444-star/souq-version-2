import express from "express";
import type Database from "better-sqlite3";
import type { GoogleGenAI } from "@google/genai";
import { Type } from "@google/genai";
import { resolveDealerContext } from "./dealerContext";
import { searchParts } from "../ai/partsSearchEngine";
import { recognizePartImage, recognizeBarcode, parseDataUrl } from "../ai/partsRecognition";

interface Deps {
  db: Database.Database;
  authenticate: (req: any, res: any, next: any) => void;
  genAI: GoogleGenAI | null;
  cooldownMiddleware: (actionName: string, seconds: number) => (req: any, res: any, next: any) => void;
}

const PART_NUMBER_LOOKUP_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    manufacturer: { type: Type.STRING },
    category: { type: Type.STRING },
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
  required: ["name", "category", "compatibleModels", "confidence"],
};

function normalizePartNumber(input: string): string {
  return (input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function parsePartRow(p: any) {
  let images: string[] = [];
  try { images = p.images ? JSON.parse(p.images) : []; } catch { images = []; }
  return { ...p, images, delivery_supported: !!p.delivery_supported };
}

// Parts CRUD, search, and part-number lookup (Product Import methods 1 & 2 - manual
// entry and part-number lookup; AI image/barcode recognition are added in a later
// phase). Mounted at /api/parts by server.ts, fully additive - never touches /api/cars,
// /api/search, or the existing car AI chat pipeline.
export function createPartsRouter({ db, authenticate, genAI, cooldownMiddleware }: Deps) {
  const router = express.Router();

  const getCompatibility = (partId: number) =>
    db.prepare("SELECT make, model, year_from, year_to FROM part_compatibility WHERE part_id = ?").all(partId);

  const setCompatibility = (partId: number, compatibility: any[]) => {
    db.prepare("DELETE FROM part_compatibility WHERE part_id = ?").run(partId);
    const insert = db.prepare("INSERT INTO part_compatibility (part_id, make, model, year_from, year_to) VALUES (?, ?, ?, ?, ?)");
    for (const c of compatibility || []) {
      if (!c?.make) continue;
      insert.run(partId, c.make, c.model || null, c.yearFrom ?? c.year_from ?? null, c.yearTo ?? c.year_to ?? null);
    }
  };

  const upsertCatalog = (partNumber: string, data: { manufacturer?: string; name?: string; category?: string; compatibility?: any[] }) => {
    const normalized = normalizePartNumber(partNumber);
    if (!normalized) return;
    const existing = db.prepare("SELECT id FROM part_number_catalog WHERE part_number = ?").get(normalized) as any;
    const compatibleJson = JSON.stringify(data.compatibility || []);
    if (existing) {
      db.prepare(
        "UPDATE part_number_catalog SET manufacturer = ?, name = ?, category = ?, compatible_json = ?, source = 'dealer_confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).run(data.manufacturer || null, data.name || null, data.category || null, compatibleJson, existing.id);
    } else {
      db.prepare(
        "INSERT INTO part_number_catalog (part_number, manufacturer, name, category, compatible_json, source) VALUES (?, ?, ?, ?, ?, 'dealer_confirmed')"
      ).run(normalized, data.manufacturer || null, data.name || null, data.category || null, compatibleJson);
    }
  };

  const requireDealer = (req: any, res: any) => {
    if (req.user?.role !== "dealer") {
      res.status(403).json({ error: "Only dealers can access this" });
      return null;
    }
    const ctx = resolveDealerContext(db, req.user.id);
    if (!ctx || !ctx.permissions.manage_parts) {
      res.status(403).json({ error: "No permission to manage parts" });
      return null;
    }
    return ctx;
  };

  // --- Inventory (dealer-authenticated) ---

  router.get("/", authenticate, (req: any, res) => {
    const ctx = requireDealer(req, res);
    if (!ctx) return;
    const parts = db.prepare("SELECT * FROM parts WHERE dealer_id = ? ORDER BY createdAt DESC").all(ctx.dealerId) as any[];
    res.json(parts.map((p) => ({ ...parsePartRow(p), compatibility: getCompatibility(p.id) })));
  });

  router.post("/", authenticate, (req: any, res) => {
    const ctx = requireDealer(req, res);
    if (!ctx) return;

    const { name, part_number, manufacturer, category, part_subtype, condition_status, images, price, status, delivery_supported, compatibility } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });
    if (images && (!Array.isArray(images) || images.length > 10)) return res.status(400).json({ error: "images must be an array of up to 10 items" });

    const result = db
      .prepare(
        `INSERT INTO parts (dealer_id, name, part_number, manufacturer, category, part_subtype, condition_status, images, price, status, delivery_supported)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        ctx.dealerId, name, part_number || null, manufacturer || null, category || null, part_subtype || null,
        condition_status || null, JSON.stringify(images || []), price ? Number(price) : null,
        status === "unavailable" ? "unavailable" : "available", delivery_supported ? 1 : 0
      );

    const partId = result.lastInsertRowid as number;
    if (Array.isArray(compatibility) && compatibility.length > 0) {
      setCompatibility(partId, compatibility);
      if (part_number) upsertCatalog(part_number, { manufacturer, name, category, compatibility });
    }

    res.json({ success: true, id: partId });
  });

  router.get("/:id", (req, res) => {
    const part = db.prepare("SELECT * FROM parts WHERE id = ?").get(req.params.id) as any;
    if (!part) return res.status(404).json({ error: "Part not found" });
    db.prepare("UPDATE parts SET views = views + 1 WHERE id = ?").run(req.params.id);
    const dealer = db.prepare(
      "SELECT name, logo, location, phone, whatsapp_number, address, map_location_link FROM dealers WHERE id = ?"
    ).get(part.dealer_id) as any;
    res.json({
      ...parsePartRow(part),
      compatibility: getCompatibility(part.id),
      dealer_name: dealer?.name, dealer_logo: dealer?.logo, dealer_location: dealer?.location,
      dealer_phone: dealer?.phone, dealer_whatsapp: dealer?.whatsapp_number,
      dealer_address: dealer?.address, dealer_map_link: dealer?.map_location_link,
    });
  });

  router.put("/:id", authenticate, (req: any, res) => {
    const ctx = requireDealer(req, res);
    if (!ctx) return;
    const part = db.prepare("SELECT * FROM parts WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId) as any;
    if (!part) return res.status(404).json({ error: "Part not found" });

    const { name, part_number, manufacturer, category, part_subtype, condition_status, images, price, status, delivery_supported, compatibility } = req.body || {};
    db.prepare(
      `UPDATE parts SET name = ?, part_number = ?, manufacturer = ?, category = ?, part_subtype = ?, condition_status = ?,
       images = ?, price = ?, status = ?, delivery_supported = ? WHERE id = ?`
    ).run(
      name ?? part.name, part_number ?? part.part_number, manufacturer ?? part.manufacturer,
      category ?? part.category, part_subtype ?? part.part_subtype, condition_status ?? part.condition_status,
      images ? JSON.stringify(images) : part.images, price !== undefined ? (price ? Number(price) : null) : part.price,
      status === "unavailable" || status === "available" ? status : part.status,
      delivery_supported !== undefined ? (delivery_supported ? 1 : 0) : part.delivery_supported,
      req.params.id
    );

    if (Array.isArray(compatibility)) {
      setCompatibility(Number(req.params.id), compatibility);
      const pn = part_number ?? part.part_number;
      if (pn) upsertCatalog(pn, { manufacturer: manufacturer ?? part.manufacturer, name: name ?? part.name, category: category ?? part.category, compatibility });
    }

    res.json({ success: true });
  });

  router.put("/:id/status", authenticate, (req: any, res) => {
    const ctx = requireDealer(req, res);
    if (!ctx) return;
    const { status } = req.body || {};
    if (status !== "available" && status !== "unavailable") return res.status(400).json({ error: "status must be 'available' or 'unavailable'" });
    const part = db.prepare("SELECT id FROM parts WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId);
    if (!part) return res.status(404).json({ error: "Part not found" });
    db.prepare("UPDATE parts SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  router.delete("/:id", authenticate, (req: any, res) => {
    const ctx = requireDealer(req, res);
    if (!ctx) return;
    const part = db.prepare("SELECT id FROM parts WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId);
    if (!part) return res.status(404).json({ error: "Part not found" });

    const hasOrders = db.prepare("SELECT 1 FROM order_items WHERE part_id = ? LIMIT 1").get(req.params.id);
    if (hasOrders) {
      return res.status(409).json({ error: "This part has existing orders and can't be deleted - mark it unavailable instead" });
    }

    db.prepare("DELETE FROM part_compatibility WHERE part_id = ?").run(req.params.id);
    db.prepare("DELETE FROM parts WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  router.get("/dealer/stats", authenticate, (req: any, res) => {
    const ctx = requireDealer(req, res);
    if (!ctx) return;
    const totals = db.prepare("SELECT COUNT(*) as total, SUM(status = 'available') as available, COALESCE(SUM(views), 0) as totalViews FROM parts WHERE dealer_id = ?").get(ctx.dealerId) as any;
    res.json({ totalParts: totals.total || 0, availableParts: totals.available || 0, totalViews: totals.totalViews || 0 });
  });

  // --- Public search ---

  router.get("/search/query", (req, res) => {
    const q = String(req.query.q || "");
    const allParts = (db.prepare("SELECT * FROM parts WHERE status = 'available'").all() as any[]).map((p) => ({
      ...parsePartRow(p),
      compatibility: getCompatibility(p.id),
    }));
    const outcome = searchParts(allParts, q);
    res.json({ results: outcome.parts.slice(0, 30), count: outcome.parts.length, noExactMatch: outcome.noExactMatch, emptyQuery: !q.trim() });
  });

  // --- Part-number lookup (Smart Product Import method 2) ---

  router.post("/lookup/part-number", authenticate, cooldownMiddleware("parts_lookup", 3), async (req: any, res) => {
    const ctx = requireDealer(req, res);
    if (!ctx) return;

    const { partNumber } = req.body || {};
    if (!partNumber || String(partNumber).trim().length < 4) return res.status(400).json({ error: "A valid part number is required" });

    const normalized = normalizePartNumber(partNumber);
    const cached = db.prepare("SELECT * FROM part_number_catalog WHERE part_number = ?").get(normalized) as any;
    if (cached) {
      return res.json({
        source: cached.source,
        name: cached.name,
        manufacturer: cached.manufacturer,
        category: cached.category,
        compatibleModels: JSON.parse(cached.compatible_json || "[]"),
        confidence: 100,
      });
    }

    if (!genAI) return res.status(503).json({ error: "AI lookup is not configured" });

    try {
      const prompt = `انت خبير في قطع غيار السيارات. رقم القطعة (Part Number / OEM Number) هو: "${partNumber}".
بناءً على معرفتك العامة بقطع غيار السيارات، حدد على الأرجح: اسم القطعة، الشركة المصنعة، الفئة (مثال: محرك، فرامل، كهرباء، هيكل)،
والسيارات المتوافقة (الماركة والموديل ونطاق سنوات الإنتاج). لو مش متأكد رجّع ثقة منخفضة في حقل confidence (0-100).`;
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json", responseSchema: PART_NUMBER_LOOKUP_SCHEMA },
      });
      const parsed = JSON.parse(response.text as string);
      res.json({
        source: "ai",
        name: parsed?.name || "",
        manufacturer: parsed?.manufacturer || "",
        category: parsed?.category || "",
        compatibleModels: Array.isArray(parsed?.compatibleModels) ? parsed.compatibleModels : [],
        confidence: typeof parsed?.confidence === "number" ? parsed.confidence : 0,
      });
    } catch (e) {
      console.error("[Parts] part-number lookup failed:", e);
      res.status(502).json({ error: "AI lookup failed, please enter details manually" });
    }
  });

  // --- Image recognition & barcode scanning (Smart Product Import methods 3 & 4) ---
  // Both are draft/suggest-only: neither writes to `parts`. The dealer reviews the
  // suggestion ("are these details correct?") and submits a normal POST / to persist.

  router.post("/recognize-image", authenticate, cooldownMiddleware("parts_recognize_image", 5), async (req: any, res) => {
    const ctx = requireDealer(req, res);
    if (!ctx) return;
    if (!genAI) return res.status(503).json({ error: "AI recognition is not configured" });

    const { image } = req.body || {};
    if (!image || typeof image !== "string") return res.status(400).json({ error: "An image is required" });

    try {
      const parsed = parseDataUrl(image);
      const result = await recognizePartImage(genAI, parsed);
      res.json(result);
    } catch (e) {
      console.error("[Parts] image recognition failed:", e);
      res.status(502).json({ error: "AI image recognition failed, please enter details manually" });
    }
  });

  // Part 8: buyer-facing image search - public, no auth. Identifies the part from a
  // photo, then immediately (same request) runs the deterministic search engine
  // against real inventory and returns both the identification and matching parts.
  router.post("/image-search", cooldownMiddleware("parts_image_search", 5), async (req: any, res) => {
    if (!genAI) return res.status(503).json({ error: "AI image search is not configured" });
    const { image } = req.body || {};
    if (!image || typeof image !== "string") return res.status(400).json({ error: "An image is required" });

    try {
      const parsedImage = parseDataUrl(image);
      const identification = await recognizePartImage(genAI, parsedImage);
      const allParts = (db.prepare("SELECT parts.* FROM parts JOIN dealers ON dealers.id = parts.dealer_id WHERE parts.status = 'available' AND dealers.status = 'active'").all() as any[])
        .map((p) => ({ ...parsePartRow(p), compatibility: getCompatibility(p.id) }));
      const query = [identification.name, identification.category, identification.partNumber].filter(Boolean).join(" ");
      const outcome = searchParts(allParts, query);
      res.json({ identification, results: outcome.parts.slice(0, 20) });
    } catch (e) {
      console.error("[Parts] image search failed:", e);
      res.status(502).json({ error: "AI image search failed" });
    }
  });

  router.post("/recognize-barcode", authenticate, cooldownMiddleware("parts_recognize_barcode", 5), async (req: any, res) => {
    const ctx = requireDealer(req, res);
    if (!ctx) return;
    if (!genAI) return res.status(503).json({ error: "AI recognition is not configured" });

    const { image } = req.body || {};
    if (!image || typeof image !== "string") return res.status(400).json({ error: "An image is required" });

    try {
      const parsed = parseDataUrl(image);
      const result = await recognizeBarcode(genAI, parsed);
      res.json(result);
    } catch (e) {
      console.error("[Parts] barcode recognition failed:", e);
      res.status(502).json({ error: "AI barcode recognition failed, please enter details manually" });
    }
  });

  return router;
}
