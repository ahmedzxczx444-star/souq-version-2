import express from "express";
import type Database from "better-sqlite3";
import { resolveDealerContext } from "./dealerContext";

interface Deps {
  db: Database.Database;
  authenticate: (req: any, res: any, next: any) => void;
}

// Orders dashboard section for the unified parts dealer dashboard. Mounted at
// /api/parts by server.ts (same base path as parts.ts, disjoint sub-paths), additive.
export function createPartsOrdersRouter({ db, authenticate }: Deps) {
  const router = express.Router();

  const requireDealer = (req: any, res: any) => {
    if (req.user?.role !== "dealer") {
      res.status(403).json({ error: "Only dealers can access this" });
      return null;
    }
    const ctx = resolveDealerContext(db, req.user.id);
    if (!ctx || !ctx.permissions.manage_parts) {
      res.status(403).json({ error: "No permission to manage orders" });
      return null;
    }
    return ctx;
  };

  // Dealer-side: inbound orders.
  router.get("/orders", authenticate, (req: any, res) => {
    const ctx = requireDealer(req, res);
    if (!ctx) return;
    const orders = db
      .prepare(
        `SELECT o.*, u.name as buyer_name, u.email as buyer_email FROM orders o
         JOIN users u ON u.id = o.buyer_user_id WHERE o.dealer_id = ? ORDER BY o.created_at DESC`
      )
      .all(ctx.dealerId) as any[];
    const items = db.prepare(
      `SELECT oi.*, p.name as part_name, p.part_number FROM order_items oi
       JOIN parts p ON p.id = oi.part_id WHERE oi.order_id = ?`
    );
    res.json(orders.map((o) => ({ ...o, items: items.all(o.id) })));
  });

  router.put("/orders/:id/status", authenticate, (req: any, res) => {
    const ctx = requireDealer(req, res);
    if (!ctx) return;
    const { status } = req.body || {};
    if (!["pending", "confirmed", "delivered", "cancelled"].includes(status)) return res.status(400).json({ error: "Invalid status" });
    const order = db.prepare("SELECT id FROM orders WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    db.prepare("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  // Buyer-side: place an order for a part (any authenticated user).
  router.post("/:id/order", authenticate, (req: any, res) => {
    const partId = req.params.id;
    const part = db.prepare("SELECT * FROM parts WHERE id = ? AND status = 'available'").get(partId) as any;
    if (!part) return res.status(404).json({ error: "Part not found or unavailable" });

    const { delivery_method, delivery_address, notes } = req.body || {};
    const orderResult = db
      .prepare("INSERT INTO orders (dealer_id, buyer_user_id, delivery_method, delivery_address, notes) VALUES (?, ?, ?, ?, ?)")
      .run(part.dealer_id, req.user.id, delivery_method || "pickup", delivery_address || null, notes || null);
    db.prepare("INSERT INTO order_items (order_id, part_id, price_at_order) VALUES (?, ?, ?)").run(orderResult.lastInsertRowid, partId, part.price);

    res.json({ success: true, id: orderResult.lastInsertRowid });
  });

  // Buyer-side: view own orders.
  router.get("/my-orders", authenticate, (req: any, res) => {
    const orders = db
      .prepare(
        `SELECT o.*, d.name as dealer_name, d.phone as dealer_phone FROM orders o
         JOIN dealers d ON d.id = o.dealer_id WHERE o.buyer_user_id = ? ORDER BY o.created_at DESC`
      )
      .all(req.user.id) as any[];
    const items = db.prepare(
      `SELECT oi.*, p.name as part_name, p.part_number FROM order_items oi
       JOIN parts p ON p.id = oi.part_id WHERE oi.order_id = ?`
    );
    res.json(orders.map((o) => ({ ...o, items: items.all(o.id) })));
  });

  return router;
}
