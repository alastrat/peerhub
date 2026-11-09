import { describe, it, expect } from "vitest";
import { buildParticipation, leaderParticipation } from "@/lib/utils/climate-participation";
import { leaderOf, type SegmentSnapshot } from "@/lib/utils/climate-segments";

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

  it("keeps a snapshot without a leader, even if they have a manager now", () => {
    expect(leaderOf({ teamIds: [], leaderEmployeeId: null }, "lead-1")).toBeNull();
  });

  it("falls back to the current manager when there's no snapshot (not answered yet)", () => {
    expect(leaderOf(null, "lead-1")).toBe("lead-1");
    expect(leaderOf(null, null)).toBeNull();
    expect(leaderOf(undefined, undefined)).toBeNull();
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
