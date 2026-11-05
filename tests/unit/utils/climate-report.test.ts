import { describe, it, expect } from "vitest";
import {
  defaultScaleText,
  introParagraphs,
  reportDimensions,
  reportSchedule,
  splitScaleText,
  storedCoverText,
} from "@/lib/utils/climate-report";
import { instrumentItemConfig } from "@/lib/constants/climate-instrument";
import { businessDay } from "@/lib/constants/business-time";

const BOGOTA = "America/Bogota";

describe("reportSchedule", () => {
  it("uses the access window and counts both ends", () => {
    const s = reportSchedule(
      {
        accessStartDate: new Date("2026-03-02T13:00:00Z"), // 8:00 Bogotá
        accessEndDate: new Date("2026-03-13T23:00:00Z"), // 18:00 Bogotá
        distributions: [{ sentAt: new Date("2026-02-20T00:00:00Z"), dueDate: new Date("2026-04-01T00:00:00Z") }],
      },
      BOGOTA,
    );
    expect(s).toMatchObject({ days: 12, hasStartTime: true, hasEndTime: true });
    expect(s?.start.toISOString()).toBe("2026-03-02T13:00:00.000Z");
  });

  it("counts calendar days in the time zone, not 24h blocks", () => {
    // 23:00 on the 1st to 01:00 on the 3rd, Bogotá time: three calendar days
    const s = reportSchedule(
      {
        accessStartDate: new Date("2026-03-02T04:00:00Z"),
        accessEndDate: new Date("2026-03-03T06:00:00Z"),
        distributions: [],
      },
      BOGOTA,
    );
    expect(s?.days).toBe(3);
  });

  it("falls back to the first send and the last due date", () => {
    // Due dates are calendar days stored at UTC midnight
    const s = reportSchedule(
      {
        accessStartDate: null,
        accessEndDate: null,
        distributions: [
          { sentAt: new Date("2026-03-10T15:00:00Z"), dueDate: new Date("2026-03-20") },
          { sentAt: new Date("2026-03-05T15:00:00Z"), dueDate: new Date("2026-03-15") },
          { sentAt: null, dueDate: new Date("2026-03-25") },
        ],
      },
      BOGOTA,
    );
    expect(s?.start.toISOString()).toBe("2026-03-05T15:00:00.000Z");
    expect(s && businessDay(s.end, BOGOTA)).toBe("2026-03-25");
    expect(s).toMatchObject({ days: 21, hasStartTime: false, hasEndTime: false });
  });

  it("keeps a due date on its calendar day west of UTC, even when sent that day", () => {
    const s = reportSchedule(
      {
        accessStartDate: null,
        accessEndDate: null,
        distributions: [{ sentAt: new Date("2026-03-17T15:00:00Z"), dueDate: new Date("2026-03-17") }],
      },
      BOGOTA,
    );
    expect(s && businessDay(s.end, BOGOTA)).toBe("2026-03-17");
    expect(s?.days).toBe(1);
  });

  it("is null without a start or with reversed dates", () => {
    expect(
      reportSchedule({ accessStartDate: null, accessEndDate: null, distributions: [] }, BOGOTA),
    ).toBeNull();
    expect(
      reportSchedule(
        { accessStartDate: new Date("2026-03-10"), accessEndDate: new Date("2026-03-01"), distributions: [] },
        BOGOTA,
      ),
    ).toBeNull();
  });
});

describe("defaultScaleText", () => {
  it("lists the instrument's frequency labels", () => {
    const questions = [
      { type: "LIKERT", config: instrumentItemConfig("CO1") },
      { type: "LIKERT", config: { scale: "AGREE_5" } },
      { type: "LIKERT", config: { scale: "AGREE_5" } },
      { type: "NPS" },
    ];
    expect(defaultScaleText(questions, "es")).toBe("Nunca, Casi nunca, Casi siempre, Siempre");
    expect(defaultScaleText(questions, "en")).toBe("Never, Rarely, Almost always, Always");
  });

  it("picks the most used scale without the instrument", () => {
    const questions = [
      { type: "LIKERT", config: { scale: "AGREE_5" } },
      { type: "LIKERT", config: { scale: "AGREE_5" } },
      { type: "LIKERT", config: { scale: "FREQ_4" } },
    ];
    expect(defaultScaleText(questions, "es")).toMatch(/^Muy en Desacuerdo, .*, Muy de Acuerdo$/);
  });

  it("shows a numeric range and nothing for text-only surveys", () => {
    expect(defaultScaleText([{ type: "RATING" }], "es")).toBe("1 – 5");
    expect(defaultScaleText([{ type: "TEXT" }], "es")).toBe("");
  });

  it("uses the NPS range only when nothing else is scored", () => {
    expect(defaultScaleText([{ type: "TEXT" }, { type: "NPS" }], "es")).toBe("0 – 10");
    expect(defaultScaleText([{ type: "NPS" }, { type: "RATING" }], "es")).toBe("1 – 5");
  });
});

describe("cover text", () => {
  it("splits the scale on commas", () => {
    expect(splitScaleText(" Nunca, Casi nunca ,, Siempre ")).toEqual(["Nunca", "Casi nunca", "Siempre"]);
  });

  it("splits the intro on blank lines", () => {
    expect(introParagraphs("Uno\nsigue\n\n  \nDos\n")).toEqual(["Uno\nsigue", "Dos"]);
  });

  it("stores the default as empty so it keeps following the locale", () => {
    expect(storedCoverText(" Texto por defecto \n", "Texto por defecto")).toBe("");
    expect(storedCoverText(" Mío ", "Texto por defecto")).toBe("Mío");
  });
});

describe("reportDimensions", () => {
  it("keeps question order and counts questions", () => {
    const a = { id: "a", name: "Comunicación" };
    const b = { id: "b", name: "Liderazgo" };
    expect(reportDimensions([{ dimension: b }, { dimension: a }, { dimension: null }, { dimension: b }])).toEqual([
      { id: "b", name: "Liderazgo", questionCount: 2 },
      { id: "a", name: "Comunicación", questionCount: 1 },
    ]);
  });
});
