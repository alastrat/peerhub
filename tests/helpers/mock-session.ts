import type { Session } from "next-auth";

export function createMockSession(overrides?: Partial<{
  userId: string;
  email: string;
  name: string;
  globalRole: "SUPER_ADMIN" | "USER";
  companyUser: {
    id: string;
    companyId: string;
    companyName: string;
    companySlug: string;
    role: "ADMIN" | "MANAGER" | "MEMBER";
    employeeId: string | null;
  } | null;
}>): Session {
  return {
    user: {
      id: overrides?.userId ?? "user-1",
      email: overrides?.email ?? "admin@acme.com",
      name: overrides?.name ?? "Alex Admin",
      image: null,
      globalRole: overrides?.globalRole ?? "USER",
    },
    companyUser: overrides?.companyUser !== undefined
      ? overrides.companyUser
      : {
          id: "cu-1",
          companyId: "company-1",
          companyName: "Acme Corp",
          companySlug: "acme-corp",
          role: "ADMIN",
          employeeId: "emp-1",
        },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } as Session;
}

export function createAdminSession(companyId = "company-1") {
  return createMockSession({
    userId: "admin-user",
    email: "admin@acme.com",
    globalRole: "USER",
    companyUser: {
      id: "cu-admin",
      companyId,
      companyName: "Acme Corp",
      companySlug: "acme-corp",
      role: "ADMIN",
      employeeId: "emp-admin",
    },
  });
}

export function createManagerSession(companyId = "company-1") {
  return createMockSession({
    userId: "manager-user",
    email: "manager@acme.com",
    name: "Sarah Manager",
    globalRole: "USER",
    companyUser: {
      id: "cu-manager",
      companyId,
      companyName: "Acme Corp",
      companySlug: "acme-corp",
      role: "MANAGER",
      employeeId: "emp-manager",
    },
  });
}

export function createMemberSession(companyId = "company-1") {
  return createMockSession({
    userId: "member-user",
    email: "member@acme.com",
    name: "James Member",
    globalRole: "USER",
    companyUser: {
      id: "cu-member",
      companyId,
      companyName: "Acme Corp",
      companySlug: "acme-corp",
      role: "MEMBER",
      employeeId: "emp-member",
    },
  });
}

export function createSuperAdminSession() {
  return createMockSession({
    userId: "super-admin-user",
    email: "superadmin@kultiva.com",
    name: "Super Admin",
    globalRole: "SUPER_ADMIN",
    companyUser: null,
  });
}

export function createUnauthenticatedSession(): null {
  return null;
}
