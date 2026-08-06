import type Database from "better-sqlite3";

// Resolves which dealer/branch an authenticated user acts on behalf of, for the new
// dealer-category features (multi-branch/chain/importer/official-agent). Deliberately
// does not touch users.role or the JWT payload - owners are resolved the same way
// existing endpoints already do (dealers.user_id = userId), and employees (who never
// get a users.role change) are resolved via the new dealer_employees table. Never trust
// a dealer_id/branch_id supplied by the client - always resolve it here from the
// authenticated user id.
export interface DealerContext {
  dealerId: number;
  branchId: number | null; // null = HQ / whole-dealer scope
  role: "owner" | "regional_manager" | "branch_manager" | "staff";
  permissions: Record<string, boolean>;
}

const OWNER_PERMISSIONS: Record<string, boolean> = {
  manage_cars: true,
  manage_branches: true,
  manage_employees: true,
  view_reports: true,
  manage_shipments: true,
  manage_offers: true,
  manage_parts: true,
};

export function resolveDealerContext(db: Database.Database, userId: number): DealerContext | null {
  const owned = db.prepare("SELECT id FROM dealers WHERE user_id = ?").get(userId) as { id: number } | undefined;
  if (owned) {
    return { dealerId: owned.id, branchId: null, role: "owner", permissions: { ...OWNER_PERMISSIONS } };
  }

  const employee = db
    .prepare("SELECT dealer_id, branch_id, role, permissions FROM dealer_employees WHERE user_id = ?")
    .get(userId) as { dealer_id: number; branch_id: number | null; role: string; permissions: string | null } | undefined;

  if (employee) {
    let permissions: Record<string, boolean> = {};
    try {
      permissions = employee.permissions ? JSON.parse(employee.permissions) : {};
    } catch {
      permissions = {};
    }
    const role = (["owner", "regional_manager", "branch_manager", "staff"] as const).includes(employee.role as any)
      ? (employee.role as DealerContext["role"])
      : "staff";
    return { dealerId: employee.dealer_id, branchId: employee.branch_id ?? null, role, permissions };
  }

  return null;
}
