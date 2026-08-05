import express from "express";
import type Database from "better-sqlite3";
import { resolveDealerContext } from "./dealerContext";

interface Deps {
  db: Database.Database;
  authenticate: (req: any, res: any, next: any) => void;
}

// Warehouses, shipments, and pre-orders for the "importer" dealer category.
// Mounted at /api/importer by server.ts, fully additive.
export function createImporterRouter({ db, authenticate }: Deps) {
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

  // --- Warehouses ---

  router.get("/warehouses", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    res.json(db.prepare("SELECT * FROM warehouses WHERE dealer_id = ? ORDER BY id DESC").all(ctx.dealerId));
  });

  router.post("/warehouses", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    const { name, location, address, latitude, longitude } = req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });
    const result = db
      .prepare("INSERT INTO warehouses (dealer_id, name, location, address, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?)")
      .run(ctx.dealerId, name, location || null, address || null, latitude ?? null, longitude ?? null);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  router.put("/warehouses/:id", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    const wh = db.prepare("SELECT * FROM warehouses WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId) as any;
    if (!wh) return res.status(404).json({ error: "Warehouse not found" });
    const { name, location, address, latitude, longitude } = req.body || {};
    db.prepare("UPDATE warehouses SET name = ?, location = ?, address = ?, latitude = ?, longitude = ? WHERE id = ?").run(
      name ?? wh.name, location ?? wh.location, address ?? wh.address, latitude ?? wh.latitude, longitude ?? wh.longitude, req.params.id
    );
    res.json({ success: true });
  });

  router.delete("/warehouses/:id", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    const wh = db.prepare("SELECT id FROM warehouses WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId);
    if (!wh) return res.status(404).json({ error: "Warehouse not found" });
    db.prepare("DELETE FROM warehouses WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // --- Shipments ---

  router.get("/shipments", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    const shipments = db.prepare("SELECT * FROM shipments WHERE dealer_id = ? ORDER BY created_at DESC").all(ctx.dealerId) as any[];
    const items = db.prepare("SELECT * FROM shipment_items WHERE shipment_id = ?");
    res.json(shipments.map((s) => ({ ...s, items: items.all(s.id) })));
  });

  router.post("/shipments", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    const { warehouse_id, reference_code, origin_country, carrier, status, eta, notes } = req.body || {};
    if (!reference_code) return res.status(400).json({ error: "reference_code is required" });
    const result = db
      .prepare(
        "INSERT INTO shipments (dealer_id, warehouse_id, reference_code, origin_country, carrier, status, eta, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(ctx.dealerId, warehouse_id || null, reference_code, origin_country || null, carrier || null, status || "pending", eta || null, notes || null);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  router.put("/shipments/:id", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    const shipment = db.prepare("SELECT * FROM shipments WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId) as any;
    if (!shipment) return res.status(404).json({ error: "Shipment not found" });
    const { warehouse_id, reference_code, origin_country, carrier, status, eta, notes } = req.body || {};
    db.prepare(
      "UPDATE shipments SET warehouse_id = ?, reference_code = ?, origin_country = ?, carrier = ?, status = ?, eta = ?, notes = ? WHERE id = ?"
    ).run(
      warehouse_id ?? shipment.warehouse_id,
      reference_code ?? shipment.reference_code,
      origin_country ?? shipment.origin_country,
      carrier ?? shipment.carrier,
      status ?? shipment.status,
      eta ?? shipment.eta,
      notes ?? shipment.notes,
      req.params.id
    );
    res.json({ success: true });
  });

  router.post("/shipments/:id/items", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    const shipment = db.prepare("SELECT id FROM shipments WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId);
    if (!shipment) return res.status(404).json({ error: "Shipment not found" });
    const { item_type, description, quantity } = req.body || {};
    if (!description) return res.status(400).json({ error: "description is required" });
    const result = db
      .prepare("INSERT INTO shipment_items (shipment_id, item_type, description, quantity) VALUES (?, ?, ?, ?)")
      .run(req.params.id, item_type || "car", description, quantity || 1);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  // --- Pre-orders ---

  router.get("/preorders", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    res.json(
      db
        .prepare(
          `SELECT p.*, u.name as customer_name, u.email as customer_email FROM preorders p
           JOIN users u ON u.id = p.customer_user_id WHERE p.dealer_id = ? ORDER BY p.created_at DESC`
        )
        .all(ctx.dealerId)
    );
  });

  router.put("/preorders/:id", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    const preorder = db.prepare("SELECT id FROM preorders WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId);
    if (!preorder) return res.status(404).json({ error: "Pre-order not found" });
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ error: "status is required" });
    db.prepare("UPDATE preorders SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  // Buyer-facing: request a pre-order from a dealer (any authenticated user).
  router.post("/:dealerId/preorders", authenticate, (req: any, res) => {
    const { dealerId } = req.params;
    const { car_make, car_model, desired_year, notes } = req.body || {};
    if (!car_make) return res.status(400).json({ error: "car_make is required" });
    const dealer = db.prepare("SELECT id FROM dealers WHERE id = ?").get(dealerId);
    if (!dealer) return res.status(404).json({ error: "Dealer not found" });
    const result = db
      .prepare("INSERT INTO preorders (dealer_id, customer_user_id, car_make, car_model, desired_year, notes) VALUES (?, ?, ?, ?, ?, ?)")
      .run(dealerId, req.user.id, car_make, car_model || null, desired_year || null, notes || null);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  return router;
}
