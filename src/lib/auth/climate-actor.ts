import { headers } from "next/headers";
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

/** True when the server action was posted from a /portal page. */
async function calledFromPortal(): Promise<boolean> {
  try {
    const referer = (await headers()).get("referer");
    return !!referer && new URL(referer).pathname.startsWith("/portal");
  } catch {
    return false;
  }
}

async function portalActor(): Promise<ClimateActor | null> {
  const portal = await getPortalSession();
  if (!portal) return null;
  const employee = await prisma.employee.findUnique({
    where: { id: portal.employeeId },
    select: { id: true, name: true, companyId: true, isActive: true },
  });
  if (!employee?.isActive) return null;
  return { kind: "employee", companyId: employee.companyId, userId: null, employeeId: employee.id, name: employee.name };
}

/**
 * From portal pages the portal identity wins, so a browser that also holds
 * an admin dashboard session acts (and is recorded) as the employee.
 * Elsewhere dashboard admins win: admin is a superset of every employee
 * permission, so preferring it never locks anyone out.
 */
export async function getClimateActor(): Promise<ClimateActor | null> {
  if (await calledFromPortal()) {
    const fromPortal = await portalActor();
    if (fromPortal) return fromPortal;
  }

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

  const fromPortal = await portalActor();
  if (fromPortal) return fromPortal;

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
