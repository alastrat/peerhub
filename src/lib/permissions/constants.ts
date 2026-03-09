export type PermissionLevel = "off" | "read" | "write";

export type PermissionKey =
  | "company.settings"
  | "company.members"
  | "company.roles"
  | "company.departments"
  | "cycles.manage"
  | "templates.manage"
  | "reviews.manage"
  | "nominations.approve"
  | "reports.company"
  | "reports.team"
  | "reports.own"
  | "ats.jobs"
  | "ats.candidates"
  | "ats.pipeline"
  | "onboarding.plans"
  | "onboarding.tasks"
  | "workenv.surveys"
  | "workenv.results";

export interface PermissionDef {
  key: PermissionKey;
  label: string;
  description: string;
}

export interface PermissionGroup {
  title: string;
  featureFlag?: "featureAts" | "featureOnboarding" | "featureWorkEnv";
  permissions: PermissionDef[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: "Company Management",
    permissions: [
      { key: "company.settings", label: "Company Settings", description: "View/edit company profile, logo, colors" },
      { key: "company.members", label: "Member Management", description: "Invite, activate, deactivate, remove members" },
      { key: "company.roles", label: "Role Management", description: "Create, edit, delete custom roles" },
      { key: "company.departments", label: "Departments", description: "Create, edit, delete departments" },
    ],
  },
  {
    title: "360 Feedback",
    permissions: [
      { key: "cycles.manage", label: "Review Cycles", description: "Create, edit, launch, close cycles" },
      { key: "templates.manage", label: "Templates", description: "Create, edit, archive templates" },
      { key: "reviews.manage", label: "Review Assignments", description: "View and manage review assignments" },
      { key: "nominations.approve", label: "Nomination Approval", description: "Approve/reject peer nominations" },
      { key: "reports.company", label: "Company Reports", description: "View company-wide aggregated reports" },
      { key: "reports.team", label: "Team Reports", description: "View reports for direct reports" },
      { key: "reports.own", label: "Own Reports", description: "View own individual feedback reports" },
    ],
  },
  {
    title: "ATS",
    featureFlag: "featureAts",
    permissions: [
      { key: "ats.jobs", label: "Job Postings", description: "Create, edit, archive job postings" },
      { key: "ats.candidates", label: "Candidates", description: "View and manage candidates" },
      { key: "ats.pipeline", label: "Pipeline", description: "Manage recruitment pipeline stages" },
    ],
  },
  {
    title: "Onboarding",
    featureFlag: "featureOnboarding",
    permissions: [
      { key: "onboarding.plans", label: "Onboarding Plans", description: "Create, edit onboarding plans" },
      { key: "onboarding.tasks", label: "Tasks", description: "Assign and manage onboarding tasks" },
    ],
  },
  {
    title: "Work Environment",
    featureFlag: "featureWorkEnv",
    permissions: [
      { key: "workenv.surveys", label: "Surveys", description: "Create, launch, close surveys" },
      { key: "workenv.results", label: "Results", description: "View survey results and analytics" },
    ],
  },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap(
  (g) => g.permissions.map((p) => p.key)
);

export type PermissionsMap = Record<PermissionKey, PermissionLevel>;

function makePerms(
  overrides: Partial<Record<PermissionKey, PermissionLevel>>
): PermissionsMap {
  const base: PermissionsMap = {} as PermissionsMap;
  for (const key of ALL_PERMISSION_KEYS) {
    base[key] = "off";
  }
  return { ...base, ...overrides };
}

export const SYSTEM_ROLE_DEFAULTS: Record<string, { name: string; description: string; color: string; permissions: PermissionsMap }> = {
  admin: {
    name: "Admin",
    description: "Full access to company settings, members, and all features.",
    color: "#7c3aed",
    permissions: makePerms({
      "company.settings": "write",
      "company.members": "write",
      "company.roles": "write",
      "company.departments": "write",
      "cycles.manage": "write",
      "templates.manage": "write",
      "reviews.manage": "write",
      "nominations.approve": "write",
      "reports.company": "read",
      "reports.team": "read",
      "reports.own": "read",
      "ats.jobs": "write",
      "ats.candidates": "write",
      "ats.pipeline": "write",
      "onboarding.plans": "write",
      "onboarding.tasks": "write",
      "workenv.surveys": "write",
      "workenv.results": "read",
    }),
  },
  manager: {
    name: "Manager",
    description: "Team management with access to direct reports' reviews and feedback.",
    color: "#2563eb",
    permissions: makePerms({
      "company.members": "read",
      "company.departments": "read",
      "cycles.manage": "read",
      "templates.manage": "read",
      "reviews.manage": "read",
      "nominations.approve": "write",
      "reports.team": "read",
      "reports.own": "read",
      "ats.jobs": "read",
      "ats.candidates": "read",
      "ats.pipeline": "read",
      "onboarding.plans": "read",
      "onboarding.tasks": "write",
      "workenv.surveys": "read",
      "workenv.results": "read",
    }),
  },
  employee: {
    name: "Employee",
    description: "Standard access to participate in reviews and view personal feedback.",
    color: "#059669",
    permissions: makePerms({
      "reports.own": "read",
    }),
  },
};
