/**
 * FollowUpPicker: company users picked from the list, any address typed in.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/messages/es.json";
import { FollowUpPicker } from "@/components/climate/plans/follow-up-picker";

const users = [
  { id: "u1", name: "Iskya", email: "iskyaboom@kultiva.com.co" },
  { id: "u2", name: "Andres", email: "alastrat@pluriza.com" },
];

function Harness({ onChange }: { onChange: (v: { userIds: string[]; emails: string[] }) => void }) {
  const [value, setValue] = useState<{ userIds: string[]; emails: string[] }>({ userIds: [], emails: [] });
  return (
    <NextIntlClientProvider locale="es" messages={messages}>
      <FollowUpPicker
        users={users}
        userIds={value.userIds}
        emails={value.emails}
        onChange={(next) => {
          setValue(next);
          onChange(next);
        }}
      />
    </NextIntlClientProvider>
  );
}

function setup() {
  const onChange = vi.fn();
  render(<Harness onChange={onChange} />);
  const input = screen.getByRole("combobox");
  const last = () => onChange.mock.calls.at(-1)?.[0];
  return { input, last };
}

afterEach(cleanup);

describe("FollowUpPicker", () => {
  it("turns an address followed by a comma into a chip, lowercased", () => {
    const { input, last } = setup();
    fireEvent.change(input, { target: { value: "Pablo@Cliente.com," } });

    expect(last()).toEqual({ userIds: [], emails: ["pablo@cliente.com"] });
    expect(screen.getByText("pablo@cliente.com")).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("adds a typed address on Enter", () => {
    const { input, last } = setup();
    fireEvent.change(input, { target: { value: "ana@cliente.com" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(last()).toEqual({ userIds: [], emails: ["ana@cliente.com"] });
  });

  it("picks the company user when their address is typed", () => {
    const { input, last } = setup();
    fireEvent.change(input, { target: { value: "ALASTRAT@pluriza.com;" } });

    expect(last()).toEqual({ userIds: ["u2"], emails: [] });
  });

  it("picks a user from the suggestions", () => {
    const { input, last } = setup();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "isk" } });
    fireEvent.click(screen.getByRole("option", { name: /Iskya/ }));

    expect(last()).toEqual({ userIds: ["u1"], emails: [] });
  });

  it("keeps an invalid address in the box and says why", () => {
    const { input, last } = setup();
    fireEvent.change(input, { target: { value: "ana@kultiva," } });

    expect(last()).toEqual({ userIds: [], emails: [] });
    expect((input as HTMLInputElement).value).toBe("ana@kultiva");
    expect(screen.getByText("«ana@kultiva» no es un correo válido")).toBeTruthy();
  });

  it("adds every address in a pasted list", () => {
    const { input, last } = setup();
    fireEvent.paste(input, { clipboardData: { getData: () => "a@cliente.com; b@cliente.com\nc@cliente.com" } });

    expect(last()).toEqual({ userIds: [], emails: ["a@cliente.com", "b@cliente.com", "c@cliente.com"] });
  });

  it("removes the last chip with Backspace in an empty box", () => {
    const { input, last } = setup();
    fireEvent.change(input, { target: { value: "a@cliente.com, b@cliente.com," } });
    fireEvent.keyDown(input, { key: "Backspace" });

    expect(last()).toEqual({ userIds: [], emails: ["a@cliente.com"] });
  });
});
