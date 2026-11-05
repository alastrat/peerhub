import { describe, it, expect } from "vitest";
import { generationOf, tenureOf, parseGender, isGender, isValidBirthDate } from "@/lib/constants/demographics";
import { buildSegmentSnapshot, parseSegmentSnapshot, resolveSegments } from "@/lib/utils/climate-segments";

describe("generationOf", () => {
  it.each([
    ["1997-01-01", "GEN_Z"],
    ["2004-06-30", "GEN_Z"],
    ["1996-12-31", "MILLENNIALS"],
    ["1981-01-01", "MILLENNIALS"],
    ["1980-12-31", "GEN_X"],
    ["1965-01-01", "GEN_X"],
    ["1964-12-31", "BABY_BOOMERS"],
  ])("%s → %s", (d, g) => {
    expect(generationOf(new Date(d))).toBe(g);
  });

  it("returns null without a birth date", () => {
    expect(generationOf(null)).toBeNull();
    expect(generationOf(new Date("nope"))).toBeNull();
  });
});

describe("isValidBirthDate", () => {
  const today = new Date("2026-11-03T12:00:00Z");
  it("accepts dates from 1900 up to today", () => {
    expect(isValidBirthDate(new Date("1900-01-01"), today)).toBe(true);
    expect(isValidBirthDate(new Date("1990-05-02"), today)).toBe(true);
    expect(isValidBirthDate(new Date("2026-11-03"), today)).toBe(true);
  });
  it("rejects future, pre-1900 and unparseable dates", () => {
    expect(isValidBirthDate(new Date("2027-01-01"), today)).toBe(false);
    expect(isValidBirthDate(new Date("1899-12-31"), today)).toBe(false);
    expect(isValidBirthDate(new Date("not a date"), today)).toBe(false);
  });
});

describe("tenureOf", () => {
  const at = new Date("2026-11-03T12:00:00Z");
  it.each([
    ["2026-01-10", "UP_TO_1"],
    ["2025-11-04", "UP_TO_1"], // one day short of a year
    ["2025-11-03", "1_TO_3"], // exactly one year
    ["2023-11-04", "1_TO_3"],
    ["2023-11-03", "3_TO_5"],
    ["2021-11-04", "3_TO_5"],
    ["2021-11-03", "OVER_5"],
    ["2010-01-01", "OVER_5"],
  ])("started %s → %s", (d, t) => {
    expect(tenureOf(new Date(d), at)).toBe(t);
  });

  it("ignores missing or future start dates", () => {
    expect(tenureOf(null, at)).toBeNull();
    expect(tenureOf(new Date("2027-01-01"), at)).toBeNull();
  });
});

describe("parseGender", () => {
  it.each([
    ["F", "FEMALE"],
    ["femenino", "FEMALE"],
    ["Mujer", "FEMALE"],
    ["m", "MALE"],
    ["Masculino", "MALE"],
    ["No binario", "NON_BINARY"],
    ["non-binary", "NON_BINARY"],
    ["Prefiero no decirlo", "PREFER_NOT_TO_SAY"],
    // The value in the import template's dropdown
    ["Prefiero no decir", "PREFER_NOT_TO_SAY"],
    ["FEMALE", "FEMALE"],
    ["  hombre ", "MALE"],
  ])("%s → %s", (input, expected) => {
    expect(parseGender(input)).toBe(expected);
  });

  it("returns null for blank or unknown values", () => {
    expect(parseGender("")).toBeNull();
    expect(parseGender(undefined)).toBeNull();
    expect(parseGender("xyz")).toBeNull();
    expect(isGender("xyz")).toBe(false);
  });
});

describe("segment snapshot demographics", () => {
  const employee = {
    departmentId: "d1",
    hubId: null,
    managerId: "m1",
    teamMemberships: [],
    gender: "FEMALE",
    birthDate: new Date("1990-05-02"),
    startDate: new Date("2020-01-15"),
  };

  it("freezes gender, generation and tenure at submission", () => {
    const snap = buildSegmentSnapshot(employee, new Date("2026-11-03"));
    expect(snap).toMatchObject({ gender: "FEMALE", generation: "MILLENNIALS", tenure: "OVER_5" });
  });

  it("parses stored snapshots and drops unknown values", () => {
    expect(
      parseSegmentSnapshot({ teamIds: [], gender: "FEMALE", generation: "GEN_X", tenure: "1_TO_3" }),
    ).toMatchObject({ gender: "FEMALE", generation: "GEN_X", tenure: "1_TO_3" });
    expect(parseSegmentSnapshot({ gender: "ALIEN", generation: "X", tenure: 5 })).toMatchObject({
      gender: null,
      generation: null,
      tenure: null,
    });
  });

  it("reads snapshots saved before demographics existed", () => {
    expect(parseSegmentSnapshot({ departmentId: "d1", teamIds: [], leaderEmployeeId: "m1" })).toMatchObject({
      departmentId: "d1",
      gender: null,
      generation: null,
      tenure: null,
    });
  });

  it("falls back to the employee's current data for responses without a snapshot", () => {
    expect(resolveSegments(null, employee)).toMatchObject({ gender: "FEMALE", generation: "MILLENNIALS" });
    expect(resolveSegments(null, null)).toMatchObject({ gender: null, generation: null, tenure: null });
  });

  it("measures fallback tenure at submission, not at report time", () => {
    // Started 2020-01-15: 1 full year when answering in 2021, over 5 years by 2026
    expect(resolveSegments(null, employee, new Date("2021-06-01")).tenure).toBe("1_TO_3");
    expect(resolveSegments(null, employee, null).tenure).toBe("OVER_5");
  });
});
