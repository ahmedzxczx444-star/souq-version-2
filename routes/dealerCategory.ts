import express from "express";
import type Database from "better-sqlite3";
import { resolveDealerContext } from "./dealerContext";

interface Deps {
  db: Database.Database;
  authenticate: (req: any, res: any, next: any) => void;
}

// Branch CRUD, employee/permission management, and chain-wide reporting for
// multi_branch/chain dealer categories. Mounted at /api/dealer by server.ts, additive
// to (never replacing) the existing /api/dealer/profile branches-in-profile editor,
// which stays the only write path for dealer_category='single' dealers.
export function createDealerCategoryRouter({ db, authenticate }: Deps) {
  const router = express.Router();

  const requireContext = (req: any, res: any): ReturnType<typeof resolveDealerContext> => {
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

  // --- Branches ---

  router.get("/branches", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    const branches = db.prepare("SELECT * FROM dealer_branches WHERE dealer_id = ? ORDER BY is_headquarters DESC, id ASC").all(ctx.dealerId);
    res.json(branches);
  });

  router.post("/branches", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    if (!ctx.permissions.manage_branches) return res.status(403).json({ error: "No permission to manage branches" });

    const { name, address, map_link, phone, region, is_headquarters } = req.body || {};
    if (!name || !address) return res.status(400).json({ error: "name and address are required" });

    const result = db
      .prepare("INSERT INTO dealer_branches (dealer_id, name, address, map_link, phone, region, is_headquarters) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(ctx.dealerId, name, address, map_link || null, phone || null, region || null, is_headquarters ? 1 : 0);
    res.json({ success: true, id: result.lastInsertRowid });
  });

  router.put("/branches/:id", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    if (!ctx.permissions.manage_branches) return res.status(403).json({ error: "No permission to manage branches" });

    const branch = db.prepare("SELECT * FROM dealer_branches WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId);
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    const { name, address, map_link, phone, region, is_headquarters, manager_user_id } = req.body || {};
    db.prepare(
      "UPDATE dealer_branches SET name = ?, address = ?, map_link = ?, phone = ?, region = ?, is_headquarters = ?, manager_user_id = ? WHERE id = ?"
    ).run(
      name ?? (branch as any).name,
      address ?? (branch as any).address,
      map_link ?? (branch as any).map_link,
      phone ?? (branch as any).phone,
      region ?? (branch as any).region,
      is_headquarters !== undefined ? (is_headquarters ? 1 : 0) : (branch as any).is_headquarters,
      manager_user_id !== undefined ? manager_user_id : (branch as any).manager_user_id,
      req.params.id
    );
    res.json({ success: true });
  });

  router.delete("/branches/:id", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    if (!ctx.permissions.manage_branches) return res.status(403).json({ error: "No permission to manage branches" });

    const branch = db.prepare("SELECT id FROM dealer_branches WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId);
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    db.prepare("UPDATE cars SET branch_id = NULL WHERE branch_id = ?").run(req.params.id);
    db.prepare("DELETE FROM dealer_branches WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  router.get("/branches/:id/stats", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;

    const branch = db.prepare("SELECT id FROM dealer_branches WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId);
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    const carsStats = db
      .prepare("SELECT COUNT(*) as totalCars, COALESCE(SUM(views), 0) as totalViews FROM cars WHERE branch_id = ?")
      .get(req.params.id) as any;
    const soldCount = db.prepare("SELECT COUNT(*) as count FROM cars WHERE branch_id = ? AND status = 'sold'").get(req.params.id) as any;

    res.json({
      totalCars: carsStats.totalCars,
      totalViews: carsStats.totalViews,
      soldCount: soldCount.count,
    });
  });

  router.post("/branches/:id/move-car", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    if (!ctx.permissions.manage_branches && !ctx.permissions.manage_cars) return res.status(403).json({ error: "No permission" });

    const { carId } = req.body || {};
    if (!carId) return res.status(400).json({ error: "carId is required" });

    const branch = db.prepare("SELECT id FROM dealer_branches WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId);
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    const car = db.prepare("SELECT id FROM cars WHERE id = ? AND dealer_id = ?").get(carId, ctx.dealerId);
    if (!car) return res.status(404).json({ error: "Car not found for this dealer" });

    db.prepare("UPDATE cars SET branch_id = ? WHERE id = ?").run(req.params.id, carId);
    res.json({ success: true });
  });

  // --- Employees / permissions (chain & multi-branch) ---

  router.get("/employees", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    if (!ctx.permissions.manage_employees && !ctx.permissions.view_reports) return res.status(403).json({ error: "No permission" });

    const employees = db
      .prepare(
        `SELECT de.id, de.branch_id, de.role, de.permissions, de.created_at, u.id as user_id, u.name, u.email, db.name as branch_name
         FROM dealer_employees de
         JOIN users u ON u.id = de.user_id
         LEFT JOIN dealer_branches db ON db.id = de.branch_id
         WHERE de.dealer_id = ? ORDER BY de.created_at DESC`
      )
      .all(ctx.dealerId);
    res.json(employees);
  });

  router.post("/employees", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    if (!ctx.permissions.manage_employees) return res.status(403).json({ error: "No permission to manage employees" });

    const { email, branch_id, role, permissions } = req.body || {};
    if (!email || !role) return res.status(400).json({ error: "email and role are required" });

    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number } | undefined;
    if (!user) return res.status(404).json({ error: "No user found with that email - they must register an account first" });

    const existing = db.prepare("SELECT id FROM dealer_employees WHERE dealer_id = ? AND user_id = ?").get(ctx.dealerId, user.id);
    if (existing) return res.status(409).json({ error: "This user is already an employee of this dealer" });

    const result = db
      .prepare("INSERT INTO dealer_employees (dealer_id, branch_id, user_id, role, permissions) VALUES (?, ?, ?, ?, ?)")
      .run(ctx.dealerId, branch_id || null, user.id, role, JSON.stringify(permissions || {}));
    res.json({ success: true, id: result.lastInsertRowid });
  });

  router.put("/employees/:id", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    if (!ctx.permissions.manage_employees) return res.status(403).json({ error: "No permission to manage employees" });

    const employee = db.prepare("SELECT id FROM dealer_employees WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const { branch_id, role, permissions } = req.body || {};
    db.prepare("UPDATE dealer_employees SET branch_id = ?, role = COALESCE(?, role), permissions = COALESCE(?, permissions) WHERE id = ?").run(
      branch_id !== undefined ? branch_id : null,
      role || null,
      permissions ? JSON.stringify(permissions) : null,
      req.params.id
    );
    res.json({ success: true });
  });

  router.delete("/employees/:id", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    if (!ctx.permissions.manage_employees) return res.status(403).json({ error: "No permission to manage employees" });

    const employee = db.prepare("SELECT id FROM dealer_employees WHERE id = ? AND dealer_id = ?").get(req.params.id, ctx.dealerId);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    db.prepare("DELETE FROM dealer_employees WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // --- Chain-wide overview (HQ dashboard) ---

  router.get("/chain/overview", authenticate, (req: any, res) => {
    const ctx = requireContext(req, res);
    if (!ctx) return;
    if (!ctx.permissions.view_reports) return res.status(403).json({ error: "No permission to view reports" });

    const branches = db.prepare("SELECT * FROM dealer_branches WHERE dealer_id = ? ORDER BY is_headquarters DESC, id ASC").all(ctx.dealerId) as any[];
    const totalCars = db.prepare("SELECT COUNT(*) as count FROM cars WHERE dealer_id = ?").get(ctx.dealerId) as any;
    const branchPerformance = branches.map((b) => {
      const stats = db.prepare("SELECT COUNT(*) as totalCars, COALESCE(SUM(views), 0) as totalViews FROM cars WHERE branch_id = ?").get(b.id) as any;
      return { branchId: b.id, branchName: b.name, region: b.region, totalCars: stats.totalCars, totalViews: stats.totalViews };
    });
    const unassignedCars = db.prepare("SELECT COUNT(*) as count FROM cars WHERE dealer_id = ? AND branch_id IS NULL").get(ctx.dealerId) as any;
    const employeeCount = db.prepare("SELECT COUNT(*) as count FROM dealer_employees WHERE dealer_id = ?").get(ctx.dealerId) as any;

    res.json({
      totalCars: totalCars.count,
      totalBranches: branches.length,
      unassignedCars: unassignedCars.count,
      employeeCount: employeeCount.count,
      branchPerformance,
    });
  });

  return router;
}
