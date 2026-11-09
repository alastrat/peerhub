/**
 * Mobile numbers ("Celular") and the WhatsApp links that share a person's
 * survey link.
 */
import { describe, it, expect } from "vitest";
import { normalizePhone, whatsAppNumber, whatsAppUrl } from "@/lib/people/phone";

describe("normalizePhone", () => {
  it("keeps digits and a leading +", () => {
    expect(normalizePhone("300 123 4567")).toBe("3001234567");
    expect(normalizePhone("(300) 123-4567")).toBe("3001234567");
    expect(normalizePhone(" +57 300.123.4567 ")).toBe("+573001234567");
  });

  it("rejects what isn't a phone number", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("llamar")).toBeNull();
    expect(normalizePhone("12345")).toBeNull(); // too short
    expect(normalizePhone("3001234567890123")).toBeNull(); // too long
    expect(normalizePhone("57+3001234567")).toBeNull();
  });
});

describe("whatsAppNumber", () => {
  it("adds Colombia's code to a local number", () => {
    expect(whatsAppNumber("3001234567")).toBe("573001234567");
    expect(whatsAppNumber("300 123 4567")).toBe("573001234567");
  });

  it("keeps a number that already has its country code", () => {
    expect(whatsAppNumber("+57 300 123 4567")).toBe("573001234567");
    expect(whatsAppNumber("+1 415 555 0100")).toBe("14155550100");
    expect(whatsAppNumber("573001234567")).toBe("573001234567");
    expect(whatsAppNumber("0057 300 123 4567")).toBe("573001234567");
  });

  it("is null for an invalid number", () => {
    expect(whatsAppNumber("llamar")).toBeNull();
  });
});

describe("whatsAppUrl", () => {
  it("opens a chat with the number and the message typed in", () => {
    const url = whatsAppUrl("300 123 4567", "Hola Ana, «Clima 2026»: https://app.test/portal/link/abc?x=1&y=2");
    expect(url).toBe(
      "https://wa.me/573001234567?text=Hola%20Ana%2C%20%C2%ABClima%202026%C2%BB%3A%20https%3A%2F%2Fapp.test%2Fportal%2Flink%2Fabc%3Fx%3D1%26y%3D2",
    );
    const parsed = new URL(url!);
    expect(parsed.host).toBe("wa.me");
    expect(parsed.pathname).toBe("/573001234567");
    expect(parsed.searchParams.get("text")).toBe("Hola Ana, «Clima 2026»: https://app.test/portal/link/abc?x=1&y=2");
  });

  it("is null without a valid number", () => {
    expect(whatsAppUrl("abc", "Hola")).toBeNull();
  });
});
