/**
 * SurveyLinksCard (Participantes): the participants without an email who
 * haven't answered, and their personal link copied or sent by WhatsApp.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";

const createSurveyLink = vi.hoisted(() =>
  vi.fn(async (_surveyId: string, employeeId: string) => ({
    success: true,
    data: { employeeId, name: "", nationalId: null, phone: null, url: `https://app.test/portal/link/tok-${employeeId}`, expiresAt: new Date("2026-11-26T05:00:00Z") },
  })),
);
vi.mock("@/lib/actions/survey-links", () => ({ createSurveyLink, createSurveyLinksWithoutEmail: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));

import { SurveyLinksCard } from "@/components/climate/survey-links-card";

const people = [
  { employeeId: "ana", name: "Ana María Gómez", phone: "300 123 4567", nationalId: "101" },
  { employeeId: "carla", name: "Carla Díaz", phone: null, nationalId: "103" },
];

function renderCard() {
  render(
    <NextIntlClientProvider locale="es" messages={messages}>
      <SurveyLinksCard surveyId="s1" surveyName="Clima 2026" companyName="Acme" people={people} />
    </NextIntlClientProvider>,
  );
}

const rowOf = (name: string) => screen.getByText(name).closest("tr")!;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SurveyLinksCard", () => {
  it("says how many people without an email still need their link", () => {
    renderCard();
    expect(screen.getByText("2 personas sin correo aún no han respondido: comparte su enlace.")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Buscar por nombre o cédula..."), { target: { value: "103" } });
    expect(screen.queryByText("Ana María Gómez")).toBeNull();
    expect(screen.getByText("Carla Díaz")).toBeTruthy();
  });

  it("offers WhatsApp only to people with a mobile number", () => {
    renderCard();
    expect(within(rowOf("Ana María Gómez")).getByRole("button", { name: "Enviar por WhatsApp" })).toBeTruthy();
    expect(within(rowOf("Carla Díaz")).queryByRole("button", { name: "Enviar por WhatsApp" })).toBeNull();
  });

  it("opens WhatsApp on the person's chat with a new link in the message", async () => {
    const win = { location: { href: "" }, opener: {}, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(win as unknown as Window);
    renderCard();

    fireEvent.click(within(rowOf("Ana María Gómez")).getByRole("button", { name: "Enviar por WhatsApp" }));

    await waitFor(() => expect(win.location.href).not.toBe(""));
    expect(createSurveyLink).toHaveBeenCalledWith("s1", "ana");
    const url = new URL(win.location.href);
    expect(url.origin + url.pathname).toBe("https://wa.me/573001234567");
    expect(url.searchParams.get("text")).toBe(
      "Hola Ana, Acme te invita a responder la encuesta «Clima 2026». Entra con tu enlace personal, sirve una sola vez: https://app.test/portal/link/tok-ana",
    );
    expect(win.opener).toBeNull();
  });

  it("copies a new link", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderCard();

    fireEvent.click(within(rowOf("Carla Díaz")).getByRole("button", { name: "Copiar enlace" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://app.test/portal/link/tok-carla"));
  });
});
