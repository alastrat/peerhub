import type { CompanyRole, CycleStatus } from "@prisma/client";
import type { Session } from "next-auth";

type Action = "create" | "read" | "update" | "delete" | "manage" | "release";
type Resource =
  | "company"
  | "user"
  | "department"
  | "template"
  | "cycle"
  | "participant"
  | "nomination"
  | "review"
  | "report"
  | "settings";

interface PermissionContext {
  resourceUserId?: string;
  resourceCompanyId?: string;
  managerId?: string;
  cycleStatus?: CycleStatus;
  isOwnReport?: boolean;
  isReportReleased?: boolean;
}

// Base role permissions
const ROLE_PERMISSIONS: Record<CompanyRole, Partial<Record<Resource, Action[]>>> = {
  ADMIN: {
    company: ["read", "update", "manage"],
    user: ["create", "read", "update", "delete", "manage"],
    department: ["create", "read", "update", "delete"],
    template: ["create", "read", "update", "delete"],
    cycle: ["create", "read", "update", "delete", "manage", "release"],
    participant: ["create", "read", "update", "delete"],
    nomination: ["read", "update", "manage"],
    review: ["read", "manage"],
    report: ["read", "release", "manage"],
    settings: ["read", "update"],
  },
  MANAGER: {
    company: ["read"],
    user: ["read"],
    department: ["read"],
    template: ["read"],
    cycle: ["read"],
    participant: ["read"],
    nomination: ["read", "update"],
    review: ["create", "read", "update"],
    report: ["read"],
    settings: [],
  },
  EMPLOYEE: {
    company: ["read"],
    user: ["read"],
    department: ["read"],
    template: [],
    cycle: ["read"],
    participant: ["read"],
    nomination: ["create", "read"],
    review: ["create", "read", "update"],
    report: ["read"],
    settings: [],
  },
};

export function hasPermission(
  session: Session | null,
  action: Action,
  resource: Resource,
  context?: PermissionContext
): boolean {
  if (!session?.user) return false;

  // Super admin can do everything
  if (session.user.globalRole === "SUPER_ADMIN") return true;

  // Must have a company context for most actions
  if (!session.companyUser) return false;

  const role = session.companyUser.role;
  const permissions = ROLE_PERMISSIONS[role];

  // Check base permission
  const resourcePermissions = permissions[resource];
  if (!resourcePermissions?.includes(action)) {
    // Check context-specific overrides
    return checkContextualPermission(session, action, resource, context);
  }

  // Additional context checks
  return checkContextualPermission(session, action, resource, context);
}

function checkContextualPermission(
  session: Session,
  action: Action,
  resource: Resource,
  context?: PermissionContext
): boolean {
  if (!session.companyUser) return false;

  const { role } = session.companyUser;
  const userId = session.user.id;

  switch (resource) {
    case "user":
      // Users can read/update their own profile
      if (context?.resourceUserId === userId && (action === "read" || action === "update")) {
        return true;
      }
      // Managers can read their direct reports
      if (role === "MANAGER" && action === "read" && context?.managerId === session.companyUser.id) {
        return true;
      }
      break;

    case "nomination":
      // Employees can create nominations for themselves
      if (role === "EMPLOYEE" && action === "create") {
        return true;
      }
      // Managers can approve nominations for their direct reports
      if (role === "MANAGER" && action === "update" && context?.managerId === session.companyUser.id) {
        return true;
      }
      break;

    case "review":
      // Anyone can create/update their own assigned reviews
      if ((action === "create" || action === "update") && context?.resourceUserId === userId) {
        return true;
      }
      break;

    case "report":
      // Users can read their own released reports
      if (action === "read" && context?.isOwnReport && context?.isReportReleased) {
        return true;
      }
      // Managers can read direct reports' released reports
      if (
        role === "MANAGER" &&
        action === "read" &&
        context?.managerId === session.companyUser.id &&
        context?.isReportReleased
      ) {
        return true;
      }
      break;
  }

  // Fall back to base permissions
  const permissions = ROLE_PERMISSIONS[role];
  return permissions[resource]?.includes(action) || false;
}

export function requirePermission(
  session: Session | null,
  action: Action,
  resource: Resource,
  context?: PermissionContext
): void {
  if (!hasPermission(session, action, resource, context)) {
    throw new Error(`Unauthorized: Cannot ${action} ${resource}`);
  }
}

export function canAccessCompany(session: Session | null, companyId: string): boolean {
  if (!session?.user) return false;
  if (session.user.globalRole === "SUPER_ADMIN") return true;
  return session.companyUser?.companyId === companyId;
}

export function requireCompanyAccess(session: Session | null, companyId: string): void {
  if (!canAccessCompany(session, companyId)) {
    throw new Error("Unauthorized: Cannot access this company");
  }
}

export function isCompanyAdmin(session: Session | null): boolean {
  return session?.companyUser?.role === "ADMIN";
}

export function isCompanyManager(session: Session | null): boolean {
  const role = session?.companyUser?.role;
  return role === "ADMIN" || role === "MANAGER";
}

export function isSuperAdmin(session: Session | null): boolean {
  return session?.user?.globalRole === "SUPER_ADMIN";
}

export function getCompanyId(session: Session | null): string | null {
  return session?.companyUser?.companyId || null;
}

export function requireCompanyId(session: Session | null): string {
  const companyId = getCompanyId(session);
  if (!companyId) {
    throw new Error("No company selected");
  }
  return companyId;
}
