import { describe, it, expect } from "vitest";
import { buildParticipation, leaderParticipation } from "@/lib/utils/climate-participation";
import { leaderOf, participationSegments, type SegmentSnapshot } from "@/lib/utils/climate-segments";
import { notAnsweredAsOf } from "@/lib/climate/survey-end";

function invitee(isComplete: boolean, segments: Partial<SegmentSnapshot> = {}) {
  return {
    isComplete,
    segments: {
      departmentId: null,
      hubId: null,
      teamIds: [],
      leaderEmployeeId: null,
      gender: null,
      generation: null,
      tenure: null,
      ...segments,
    },
  };
}

describe("leaderOf", () => {
  it("takes the leader frozen at submission over the current manager", () => {
    expect(leaderOf({ teamIds: [], leaderEmployeeId: "lead-2" }, "lead-1")).toBe("lead-2");
  });

  it("falls back to the current manager when the snapshot has no leader (answered before managers were loaded)", () => {
    expect(leaderOf({ teamIds: [], leaderEmployeeId: null }, "lead-1")).toBe("lead-1");
    expect(leaderOf({ teamIds: [], leaderEmployeeId: null }, null)).toBeNull();
  });

  it("falls back to the current manager when there's no snapshot (not answered yet)", () => {
    expect(leaderOf(null, "lead-1")).toBe("lead-1");
    expect(leaderOf(null, null)).toBeNull();
    expect(leaderOf(undefined, undefined)).toBeNull();
  });
});

describe("participationSegments", () => {
  const AT = new Date("2026-06-30");
  const now = {
    departmentId: "dept-2",
    hubId: null,
    managerId: "lead-1",
    teamMemberships: [],
    gender: "FEMALE",
    birthDate: new Date("1990-05-01"),
    startDate: new Date("2025-01-15"),
  };

  it("takes each value from the snapshot when it's set", () => {
    const snapshot = {
      departmentId: "dept-1",
      hubId: null,
      teamIds: ["team-1"],
      leaderEmployeeId: "lead-2",
      gender: "MALE",
      generation: "GEN_X",
      tenure: "OVER_5",
    };
    expect(participationSegments(snapshot, now, AT)).toEqual(snapshot);
  });

  it("fills leader and demographics missing from the snapshot with current data, field by field", () => {
    // answered before managers and demographics were loaded
    const snapshot = { departmentId: "dept-1", hubId: null, teamIds: [], leaderEmployeeId: null, gender: "MALE" };
    expect(participationSegments(snapshot, now, AT)).toEqual({
      departmentId: "dept-1",
      hubId: null,
      teamIds: [],
      leaderEmployeeId: "lead-1",
      gender: "MALE",
      generation: "MILLENNIALS",
      // measured at `at`, not today
      tenure: "1_TO_3",
    });
  });

  it("uses current data when there's no snapshot (not answered yet)", () => {
    expect(participationSegments(null, now, AT)).toMatchObject({
      departmentId: "dept-2",
      leaderEmployeeId: "lead-1",
      gender: "FEMALE",
      tenure: "1_TO_3",
    });
  });

  it("leaves a value unset when neither the snapshot nor the employee has it", () => {
    const s = participationSegments({ teamIds: [], leaderEmployeeId: null }, null, AT);
    expect([s.leaderEmployeeId, s.gender, s.generation, s.tenure]).toEqual([null, null, null, null]);
  });
});

describe("notAnsweredAsOf", () => {
  const NOW = new Date("2026-11-08T12:00:00Z");
  const base = { accessEndDate: null, closedAt: null, distributions: [] };

  it("is now while the survey is open, even past its end date", () => {
    expect(notAnsweredAsOf({ ...base, status: "ACTIVE", accessEndDate: new Date("2026-01-31") }, NOW)).toBe(NOW);
    expect(notAnsweredAsOf({ ...base, status: "DRAFT" }, NOW)).toBe(NOW);
  });

  it("is when it closed once it's closed", () => {
    const closedAt = new Date("2026-02-03");
    expect(
      notAnsweredAsOf({ ...base, status: "CLOSED", closedAt, accessEndDate: new Date("2026-01-31") }, NOW),
    ).toBe(closedAt);
    expect(notAnsweredAsOf({ ...base, status: "ARCHIVED", closedAt }, NOW)).toBe(closedAt);
  });

  it("falls back to the access end date, then the latest due date, then now", () => {
    const end = new Date("2026-01-31");
    expect(notAnsweredAsOf({ ...base, status: "CLOSED", accessEndDate: end }, NOW)).toBe(end);
    expect(
      notAnsweredAsOf(
        {
          ...base,
          status: "CLOSED",
          distributions: [{ dueDate: new Date("2026-03-01") }, { dueDate: new Date("2026-03-15") }],
        },
        NOW,
      ),
    ).toEqual(new Date("2026-03-15"));
    expect(notAnsweredAsOf({ ...base, status: "CLOSED" }, NOW)).toBe(NOW);
  });
});

describe("leaderParticipation", () => {
  it("sorts leaders by name, with the people without a leader last", () => {
    const groups = leaderParticipation(
      [
        invitee(false),
        invitee(true, { leaderEmployeeId: "b" }),
        invitee(false, { leaderEmployeeId: "a" }),
        invitee(true, { leaderEmployeeId: "a" }),
        invitee(true, { leaderEmployeeId: "gone" }),
      ],
      new Map([
        ["a", "Álvaro"],
        ["b", "Beatriz"],
      ]),
    );
    expect(groups).toEqual([
      // a leader no longer in the company still counts, without a name
      { id: "gone", name: "—", invited: 1, answered: 1 },
      { id: "a", name: "Álvaro", invited: 2, answered: 1 },
      { id: "b", name: "Beatriz", invited: 1, answered: 1 },
      { id: null, name: null, invited: 1, answered: 0 },
    ]);
  });
});

describe("buildParticipation", () => {
  it("returns no groups when nobody was invited", () => {
    expect(buildParticipation([], new Map())).toEqual({ leaders: [], gender: [], generation: [], tenure: [] });
  });

  it("orders demographic groups naturally and leaves out groups nobody belongs to", () => {
    const p = buildParticipation(
      [
        invitee(true, { tenure: "OVER_5" }),
        invitee(false, { tenure: "UP_TO_1" }),
        invitee(true, { tenure: "3_TO_5" }),
        invitee(false),
      ],
      new Map(),
    );
    expect(p.tenure.map((g) => g.id)).toEqual(["UP_TO_1", "3_TO_5", "OVER_5", null]);
    expect(p.gender).toEqual([{ id: null, name: null, invited: 4, answered: 2 }]);
  });
});
