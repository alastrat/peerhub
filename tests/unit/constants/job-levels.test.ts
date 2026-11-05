import { describe, it, expect } from "vitest";
import { parseJobLevel, isJobLevel } from "@/lib/constants/job-levels";

describe("parseJobLevel", () => {
  it.each([
    ["Colaborador", "STAFF"],
    ["coordinadora", "COORDINATOR"],
    ["Líder", "LEADER"],
    ["LIDER", "LEADER"],
    ["Gerencia", "MANAGER"],
    [" Dirección ", "DIRECTOR"],
    ["Manager", "MANAGER"],
    ["COORDINATOR", "COORDINATOR"],
  ])("%s → %s", (input, expected) => {
    expect(parseJobLevel(input)).toBe(expected);
  });

  it.each(["", "  ", null, undefined, "Jefe", "Presidente"])("%j → null", (input) => {
    expect(parseJobLevel(input)).toBeNull();
  });
});

describe("isJobLevel", () => {
  it("only accepts the enum keys", () => {
    expect(isJobLevel("LEADER")).toBe(true);
    expect(isJobLevel("Líder")).toBe(false);
    expect(isJobLevel(3)).toBe(false);
  });
});
