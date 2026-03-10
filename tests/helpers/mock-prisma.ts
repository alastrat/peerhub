import { vi } from "vitest";
import { type PrismaClient } from "@prisma/client";

// Deep mock of PrismaClient methods
type MockPrismaModel = {
  findUnique: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  createMany: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
  aggregate: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
};

function createMockModel(): MockPrismaModel {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    upsert: vi.fn(),
  };
}

export type MockPrismaClient = {
  [K in keyof Pick<
    PrismaClient,
    | "user"
    | "employee"
    | "companyUser"
    | "company"
    | "department"
    | "template"
    | "templateSection"
    | "templateQuestion"
    | "cycle"
    | "cycleParticipant"
    | "nomination"
    | "reviewAssignment"
    | "reviewResponse"
    | "reviewToken"
    | "accessToken"
    | "invitation"
    | "competency"
    | "superAdminDomain"
  >]: MockPrismaModel;
} & {
  $transaction: ReturnType<typeof vi.fn>;
};

export function createMockPrisma(): MockPrismaClient {
  return {
    user: createMockModel(),
    employee: createMockModel(),
    companyUser: createMockModel(),
    company: createMockModel(),
    department: createMockModel(),
    template: createMockModel(),
    templateSection: createMockModel(),
    templateQuestion: createMockModel(),
    cycle: createMockModel(),
    cycleParticipant: createMockModel(),
    nomination: createMockModel(),
    reviewAssignment: createMockModel(),
    reviewResponse: createMockModel(),
    reviewToken: createMockModel(),
    accessToken: createMockModel(),
    invitation: createMockModel(),
    competency: createMockModel(),
    superAdminDomain: createMockModel(),
    $transaction: vi.fn((fn: (tx: MockPrismaClient) => Promise<unknown>) => {
      // By default, $transaction passes itself as the transactional client
      const txClient = createMockPrisma();
      return fn(txClient);
    }),
  };
}

export function resetMockPrisma(mock: MockPrismaClient) {
  for (const key of Object.keys(mock)) {
    const model = mock[key as keyof MockPrismaClient];
    if (typeof model === "function") {
      (model as ReturnType<typeof vi.fn>).mockReset();
    } else if (model && typeof model === "object") {
      for (const method of Object.values(model)) {
        if (typeof method === "function") {
          method.mockReset();
        }
      }
    }
  }
}
