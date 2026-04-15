import { chromium } from "playwright";

const BASE = "http://localhost:4999";
const OUT = "./public/images/screenshots";

const CLIMATE_SURVEY_ID = "cmnysafoe0001sp9c1h4mgfbc";
const CYCLE_ID = "cmnypkhfz002vsp0g6b4om9nx";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Logging in...");
  await page.goto(`${BASE}/api/dev/token?email=admin@acme.com&redirect=/overview`);
  await page.waitForURL("**/overview", { timeout: 15000 });
  console.log("Logged in at:", page.url());

  const captures = [
    { name: "dashboard-overview", url: "/overview", fullPage: false },
    { name: "analytics-dashboard", url: "/analytics", fullPage: false },
    { name: "climate-surveys-list", url: "/surveys/climate", fullPage: false },
    { name: "climate-results", url: `/surveys/climate/${CLIMATE_SURVEY_ID}/results`, fullPage: true },
    { name: "360-cycles-list", url: "/surveys/360", fullPage: false },
    { name: "360-cycle-detail", url: `/surveys/360/${CYCLE_ID}`, fullPage: false },
    { name: "people-directory", url: "/people", fullPage: false },
    { name: "org-departments", url: "/settings/company/departments", fullPage: false },
  ];

  for (const cap of captures) {
    console.log(`Capturing ${cap.name}...`);
    await page.goto(`${BASE}${cap.url}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${OUT}/${cap.name}.png`, fullPage: cap.fullPage });
    console.log(`  saved ${cap.name}.png`);
  }

  await browser.close();
  console.log(`\nDone — ${captures.length} screenshots in ${OUT}`);
}

main().catch(console.error);
