import express from "express";
import type Database from "better-sqlite3";
import { resolveDealerContext } from "./dealerContext";

interface Deps {
  db: Database.Database;
  authenticate: (req: any, res: any, next: any) => void;
}

// Service centers, official offers, and warranties for the "official_agent" dealer
// category. Mounted at /api/official by server.ts, fully additive. car_warranties
// references cars.id but requires no change to the cars table itself.
export function createOfficialAgentRouter({ db, authenticate }: Deps) {
  const router = express.Router();

  const requireContext = (req: any, res: any) => {
    if (req.user?.role !== "dealer") {
      res.status(403).json({ error: "Only dealers can access this" });
      return null;
    }
    const ctx = resolveDealerContext(db, req.user.id);
    if (!ctx) {
      res.status(403).json({ error: "No dealer account found for this user" });
      return null;
    }
    return ctx;
  };

  // --- Service centers ---

  router.get("/service-centers", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    res.json(db.prepare("SELECT * FROM service_centers WHERE dealer_id = ? ORDER BY id DESC").all(ctx.dealerId));
  });

  // Public: buyers browsing a dealer's public profile can see their service centers.
  router.get("/service-centers/public/:dealerId", (req, res) => {
    res.json(db.prepare("SELECT * FROM service_centers WHERE dealer_id = ? ORDER BY id DESC").all(req.params.dealerId));
  });

  router.post("/service-centers", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    const { name, address, phone, services, branch_id, latitude, longitude } = req.body || {};
    if (!name || !address) return res.status(400).json({ error: "name and address are required" });
    const result = db
      .prepare("INSERT INTO service_centers (dealer_id, branch_id, name, address, phone, services, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(ctx.dealerId, branch_id || null, name, address, phone || null, JSON.stringify(services || []), latitude ?? null, longitude ?? null);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  router.put("/service-centers/:id", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    const sc = db.prepare("SELECT * FROM service_centers WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId) as any;
    if (!sc) return res.status(404).json({ error: "Service center not found" });
    const { name, address, phone, services } = req.body || {};
    db.prepare("UPDATE service_centers SET name = ?, address = ?, phone = ?, services = ? WHERE id = ?").run(
      name ?? sc.name, address ?? sc.address, phone ?? sc.phone, services ? JSON.stringify(services) : sc.services, req.params.id
    );
    res.json({ success: true });
  });

  router.delete("/service-centers/:id", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    const sc = db.prepare("SELECT id FROM service_centers WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId);
    if (!sc) return res.status(404).json({ error: "Service center not found" });
    db.prepare("DELETE FROM service_centers WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // --- Official offers ---

  router.get("/offers", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    res.json(db.prepare("SELECT * FROM official_offers WHERE dealer_id = ? ORDER BY created_at DESC").all(ctx.dealerId));
  });

  router.get("/offers/public/:dealerId", (req, res) => {
    res.json(
      db
        .prepare("SELECT * FROM official_offers WHERE dealer_id = ? AND (valid_to IS NULL OR valid_to >= date('now')) ORDER BY created_at DESC")
        .all(req.params.dealerId)
    );
  });

  router.post("/offers", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    const { title, description, image, discount_percent, valid_from, valid_to } = req.body || {};
    if (!title) return res.status(400).json({ error: "title is required" });
    const result = db
      .prepare("INSERT INTO official_offers (dealer_id, title, description, image, discount_percent, valid_from, valid_to) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(ctx.dealerId, title, description || null, image || null, discount_percent ?? null, valid_from || null, valid_to || null);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  router.delete("/offers/:id", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    const offer = db.prepare("SELECT id FROM official_offers WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId);
    if (!offer) return res.status(404).json({ error: "Offer not found" });
    db.prepare("DELETE FROM official_offers WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // --- Warranties ---

  router.get("/warranties", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    res.json(
      db
        .prepare(
          `SELECT w.*, c.make, c.model, c.year FROM car_warranties w
           JOIN cars c ON c.id = w.car_id WHERE w.dealer_id = ? ORDER BY w.created_at DESC`
        )
        .all(ctx.dealerId)
    );
  });

  router.get("/warranties/car/:carId", (req, res) => {
    res.json(db.prepare("SELECT * FROM car_warranties WHERE car_id = ? ORDER BY created_at DESC").all(req.params.carId));
  });

  router.post("/warranties", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    const { car_id, warranty_type, duration_months, coverage_details } = req.body || {};
    if (!car_id || !warranty_type) return res.status(400).json({ error: "car_id and warranty_type are required" });
    const car = db.prepare("SELECT id FROM cars WHERE id = ? AND dealer_id = ?").get(car_id, ctx.dealerId);
    if (!car) return res.status(404).json({ error: "Car not found for this dealer" });
    const result = db
      .prepare("INSERT INTO car_warranties (car_id, dealer_id, warranty_type, duration_months, coverage_details) VALUES (?, ?, ?, ?, ?)")
      .run(car_id, ctx.dealerId, warranty_type, duration_months || null, coverage_details || null);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  router.delete("/warranties/:id", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    const w = db.prepare("SELECT id FROM car_warranties WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId);
    if (!w) return res.status(404).json({ error: "Warranty not found" });
    db.prepare("DELETE FROM car_warranties WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  return router;
}
