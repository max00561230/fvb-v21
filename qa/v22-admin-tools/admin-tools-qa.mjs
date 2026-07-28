import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE_URL = process.env.FVB_BASE_URL || "http://127.0.0.1:4173";
const QA_PIN = "864213";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectText(page, text, label = text) {
  await page.waitForSelector(`text=${text}`, { timeout: 10000 });
  const visible = await page.locator(`text=${text}`).first().isVisible();
  assert(visible, `${label} was not visible`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

await page.goto(`${BASE_URL}/admin/photo-restoration`, { waitUntil: "networkidle" });
await expectText(page, "Create Local Admin PIN", "locked direct admin setup gate");
await page.screenshot({ path: "qa/v22-admin-tools/pin-screen.png", fullPage: true });

await page.getByRole("textbox", { name: "PIN", exact: true }).fill(QA_PIN);
await page.getByRole("textbox", { name: "Confirm PIN" }).fill(QA_PIN);
await page.getByRole("button", { name: "Save PIN and Unlock" }).click();
await expectText(page, "Photo Restoration Tool", "photo restoration after direct unlock");

await page.reload({ waitUntil: "networkidle" });
await expectText(page, "Photo Restoration Tool", "same-session refresh remains unlocked");

await page.getByRole("button", { name: "Lock Admin" }).click();
await expectText(page, "Enter Admin PIN", "lock admin returns to PIN gate");

await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" });
await expectText(page, "Enter Admin PIN", "locked admin landing gate");
await page.getByRole("textbox", { name: "PIN", exact: true }).fill(QA_PIN);
await page.getByRole("button", { name: "Unlock Admin" }).click();
await expectText(page, "Admin Tools", "admin tools landing after unlock");
await page.screenshot({ path: "qa/v22-admin-tools/admin-tools.png", fullPage: true });

await page.goto(`${BASE_URL}/admin/photo-restoration`, { waitUntil: "networkidle" });
await expectText(page, "Photo Restoration Tool", "photo restoration route");
await page.locator("select.restoration-input").first().selectOption("page-002");
await page.waitForTimeout(1000);
const selectedMeta = await page.locator(".restoration-meta").innerText();
assert(selectedMeta.includes("Visible page\n89"), "Page 89 selector did not show visible page 89");
assert(selectedMeta.includes("Source file\npage-02.png"), "Page 89 selector did not show page-02.png source");
await page.screenshot({ path: "qa/v22-admin-tools/photo-restoration-page89-selector.png", fullPage: true });

await page.close();
const freshPage = await context.newPage();
await freshPage.goto(`${BASE_URL}/admin/photo-restoration`, { waitUntil: "networkidle" });
await expectText(freshPage, "Enter Admin PIN", "fresh page in same browser context requires PIN after previous page close");

await context.close();
await browser.close();

console.log("Admin browser QA passed");
