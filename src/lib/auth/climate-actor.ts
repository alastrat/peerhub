import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/config";
import { getPortalSession } from "@/lib/auth/portal-session";

/**
 * Who is acting on climate results and action plans.
 * - admin: dashboard company admin (or super admin) — full access in the company
 * - employee: anyone else, signed in through the portal or the dashboard —
 *   permissions come from being a plan owner, task owner or leader
 */
export type ClimateActor =
  | { kind: "admin"; companyId: string; userId: string; employeeId: string | null; name: string }
  | { kind: "employee"; companyId: string; userId: string | null; employeeId: string; name: string };

/**
 * Dashboard admins win over a portal cookie: admin is a superset of every
 * employee permission, so preferring it never locks anyone out.
 */
export async function getClimateActor(): Promise<ClimateActor | null> {
  const session = await auth();
  const cu = session?.companyUser;
  if (session?.user?.id && cu?.companyId) {
    const isAdmin = cu.role === "ADMIN" || session.user.globalRole === "SUPER_ADMIN";
    if (isAdmin) {
      return {
        kind: "admin",
        companyId: cu.companyId,
        userId: session.user.id,
        employeeId: cu.employeeId ?? null,
        name: session.user.name ?? session.user.email ?? "Admin",
      };
    }
  }

  const portal = await getPortalSession();
  if (portal) {
    const employee = await prisma.employee.findUnique({
      where: { id: portal.employeeId },
      select: { id: true, name: true, companyId: true, isActive: true },
    });
    if (employee?.isActive) {
      return { kind: "employee", companyId: employee.companyId, userId: null, employeeId: employee.id, name: employee.name };
    }
  }

  if (session?.user?.id && cu?.companyId && cu.employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: cu.employeeId },
      select: { id: true, name: true, isActive: true },
    });
    if (employee?.isActive) {
      return { kind: "employee", companyId: cu.companyId, userId: session.user.id, employeeId: employee.id, name: employee.name };
    }
  }

  return null;
}

export async function requireClimateActor(): Promise<ClimateActor> {
  const actor = await getClimateActor();
  if (!actor) throw new Error("Unauthorized");
  return actor;
}
