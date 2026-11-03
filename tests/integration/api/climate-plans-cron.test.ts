import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";

const reminders = vi.hoisted(() => ({
  sendTaskReminders: vi.fn(async () => ({ tasks: 2, emails: 1 })),
  sendPlanDeadlineReminders: vi.fn(async () => ({ surveys: 1, emails: 1 })),
}));
vi.mock("@/lib/queries/action-plan-reminders", () => reminders);

import { GET } from "@/app/api/cron/climate-plans/route";

const call = (auth?: string) =>
  GET(new Request("http://localhost/api/cron/climate-plans", auth ? { headers: { authorization: auth } } : {}));

describe("GET /api/cron/climate-plans", () => {
  const original = process.env.CRON_SECRET;
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("rejects calls without the cron secret outside development", async () => {
    delete process.env.CRON_SECRET;
    const res = await call();
    expect(res.status).toBe(401);
    expect(reminders.sendTaskReminders).not.toHaveBeenCalled();
  });

  it("rejects a wrong bearer token", async () => {
    process.env.CRON_SECRET = "s3cret";
    expect((await call("Bearer nope")).status).toBe(401);
    expect((await call()).status).toBe(401);
  });

  it("runs both reminder jobs with the right token (as Vercel Cron sends it)", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await call("Bearer s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      tasks: { tasks: 2, emails: 1 },
      deadlines: { surveys: 1, emails: 1 },
    });
  });

  it("returns 500 when a job fails", async () => {
    process.env.CRON_SECRET = "s3cret";
    reminders.sendTaskReminders.mockRejectedValueOnce(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await call("Bearer s3cret")).status).toBe(500);
    spy.mockRestore();
  });

  it("is scheduled daily in vercel.json", () => {
    const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), "vercel.json"), "utf8"));
    expect(config.crons).toContainEqual({ path: "/api/cron/climate-plans", schedule: "0 13 * * *" });
  });
});
