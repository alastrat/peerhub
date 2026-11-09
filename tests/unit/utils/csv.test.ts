import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/utils/csv";

describe("toCsv", () => {
  it("writes a UTF-8 CSV Excel opens with accents, quoting where needed", () => {
    expect(toCsv([["Nombre", "Enlace"], ["Peña, José", 'Dijo "hola"'], ["Ana", null]])).toBe(
      '﻿Nombre,Enlace\r\n"Peña, José","Dijo ""hola"""\r\nAna,\r\n',
    );
  });

  it("keeps phone numbers but neutralizes formulas", () => {
    expect(toCsv([["+573001234567", "=HYPERLINK(1)", "@cmd", "-1+2"]])).toBe("﻿+573001234567,'=HYPERLINK(1),'@cmd,'-1+2\r\n");
  });
});
