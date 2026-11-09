/**
 * EditEmployeeForm: role and status are only sent when the admin changed
 * them, so saving another field never reactivates a deactivated account or
 * overwrites an invitation role set meanwhile.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import type { CompanyRole } from "@prisma/client";
import type { AccessStatus } from "@/lib/people/access";

const updateEmployee = vi.hoisted(() => vi.fn(async () => ({ success: true })));
vi.mock("@/lib/actions/users", () => ({ updateEmployee, deactivateEmployee: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { EditEmployeeForm } from "@/components/people/edit-employee-form";

// Radix's Switch measures itself; jsdom has no ResizeObserver
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

const employee = {
  id: "emp-1",
  companyId: "company-1",
  email: "ana@acme.com",
  name: "Ana Gómez",
  title: "Analista",
  employeeCode: null,
  nationalId: "1020304050",
  jobLevel: null,
  managerId: null,
  departmentId: null,
  startDate: null,
  isActive: true,
  gender: null,
  birthDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  hubId: null,
  department: null,
  manager: null,
  // A deactivated account
  companyUser: null,
};

function renderForm(role: CompanyRole, access: AccessStatus) {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <EditEmployeeForm employee={employee as never} role={role} access={access} departments={[]} managers={[]} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EditEmployeeForm", () => {
  it("saves other fields without sending the role or status", async () => {
    renderForm("ADMIN", "DEACTIVATED");
    expect(screen.getByText("Su cuenta está desactivada: conserva este rol, que recupera si la reactivas.")).toBeTruthy();

    fireEvent.change(screen.getByDisplayValue("Analista"), { target: { value: "Coordinadora" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateEmployee).toHaveBeenCalledTimes(1));
    const [id, payload] = updateEmployee.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(id).toBe("emp-1");
    expect(payload.title).toBe("Coordinadora");
    expect(payload).not.toHaveProperty("role");
    expect(payload).not.toHaveProperty("isActive");
  });
});
