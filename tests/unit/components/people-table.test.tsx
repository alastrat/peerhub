/**
 * PeopleTable ("Ver colaboradores"): every field the employee import loads,
 * a role for everyone and their platform access, with filters for both.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import type { PersonRow } from "@/lib/queries/people";
import { PeopleTable } from "@/components/people/people-table";

const person = (overrides: Partial<PersonRow>): PersonRow => ({
  id: "e1",
  name: "Ana Gómez",
  email: "ana@acme.com",
  phone: null,
  nationalId: null,
  title: null,
  department: null,
  hub: null,
  manager: null,
  jobLevel: null,
  startDate: null,
  gender: null,
  birthDate: null,
  role: "MEMBER",
  access: "NONE",
  ...overrides,
});

const people: PersonRow[] = [
  person({
    id: "e1",
    nationalId: "1020304050",
    title: "Analista de ventas",
    department: "Ventas",
    hub: "Bogotá",
    manager: "Lina Pérez",
    jobLevel: "COORDINATOR",
    startDate: new Date("2022-03-15T00:00:00Z"),
    gender: "FEMALE",
    birthDate: new Date("1990-05-02T00:00:00Z"),
  }),
  person({ id: "e2", name: "Bruno Díaz", email: "bruno@acme.com", role: "MANAGER", access: "INVITED" }),
  person({ id: "e4", name: "Diego Mora", email: null, phone: "3001234567", access: "NO_EMAIL" }),
  person({ id: "e3", name: "Carla Ruiz", email: "carla@acme.com", role: "ADMIN", access: "ACTIVE" }),
];

function renderTable(showHubs = true) {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <PeopleTable data={people} showHubs={showHubs} />
    </NextIntlClientProvider>,
  );
}

const rowOf = (name: string) => screen.getByRole("link", { name: new RegExp(name) }).closest("tr")!;

afterEach(cleanup);

describe("PeopleTable", () => {
  it("shows every field the import loads", () => {
    renderTable();
    for (const header of ["Nombre", "Cédula", "Cargo", "Departamento", "Sede", "Jefe directo", "Nivel jerárquico", "Fecha de ingreso", "Género", "Fecha de nacimiento", "Rol", "Acceso"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeTruthy();
    }
    const ana = within(rowOf("Ana Gómez"));
    for (const value of ["ana@acme.com", "1020304050", "Analista de ventas", "Ventas", "Bogotá", "Lina Pérez", "Coordinador", "Femenino"]) {
      expect(ana.getByText(value)).toBeTruthy();
    }
    // Calendar days, not shifted by the time zone
    expect(ana.getByText(/^15 .*mar.* 2022$/)).toBeTruthy();
    expect(ana.getByText(/^2 .*may.* 1990$/)).toBeTruthy();
  });

  it("hides Sede when there are no hubs", () => {
    renderTable(false);
    expect(screen.queryByRole("columnheader", { name: "Sede" })).toBeNull();
  });

  it("gives everyone a role, Miembro by default, and their access", () => {
    renderTable();
    expect(within(rowOf("Ana Gómez")).getByText("Miembro")).toBeTruthy();
    expect(within(rowOf("Ana Gómez")).getByText("Sin acceso")).toBeTruthy();
    expect(within(rowOf("Bruno Díaz")).getByText("Manager")).toBeTruthy();
    expect(within(rowOf("Bruno Díaz")).getByText("Invitado")).toBeTruthy();
    expect(within(rowOf("Carla Ruiz")).getByText("Admin")).toBeTruthy();
    expect(within(rowOf("Carla Ruiz")).getByText("Activo")).toBeTruthy();
  });

  it("shows the mobile number and who has no email", () => {
    renderTable();
    expect(screen.getByRole("columnheader", { name: "Celular" })).toBeTruthy();
    const diego = within(rowOf("Diego Mora"));
    expect(diego.getByText("3001234567")).toBeTruthy();
    expect(diego.getByText("Sin correo")).toBeTruthy();
  });

  it("has a filter for access next to the role filter", () => {
    renderTable();
    expect(screen.getByRole("combobox", { name: "Rol" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Acceso" })).toBeTruthy();
  });
});
