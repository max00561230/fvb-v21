import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const ROOT = process.cwd();
const QA_DIR = path.join(ROOT, "qa/v22.3-photo-placement-repair");
const SCREENSHOT_DIR = path.join(QA_DIR, "screenshots");
const INPUT_DIR = path.join(QA_DIR, "inputs");
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4179";
const PIN = "864213";
const STORAGE_KEY = "fvb-phase-1b-photo-restorations";
const steps = [];

const pass = (name, details = "") => steps.push({ status: "PASS", name, details });
const fail = (name, details = "") => steps.push({ status: "FAIL", name, details });

async function screenshot(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
}

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 30000) {
    try {
      if ((await fetch(BASE_URL)).ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Preview server did not start at ${BASE_URL}`);
}

async function createInputs() {
  await fs.mkdir(INPUT_DIR, { recursive: true });
  const jpeg = path.join(INPUT_DIR, "v22-3-placement.jpeg");
  const png = path.join(INPUT_DIR, "v22-3-placement.png");
  const webp = path.join(INPUT_DIR, "v22-3-placement.webp");
  await sharp({ create: { width: 900, height: 620, channels: 3, background: "#456c83" } })
    .composite([{ input: Buffer.from('<svg width="900" height="620"><rect x="55" y="55" width="790" height="510" fill="#f4e2b6"/><text x="120" y="330" font-family="Arial" font-size="72" fill="#232323">JPEG</text></svg>') }])
    .jpeg({ quality: 88 })
    .toFile(jpeg);
  await sharp({ create: { width: 820, height: 520, channels: 4, background: "#6f4932" } })
    .composite([{ input: Buffer.from('<svg width="820" height="520"><circle cx="260" cy="260" r="160" fill="#d8bc73"/><text x="355" y="286" font-family="Arial" font-size="64" fill="#fff">PNG</text></svg>') }])
    .png()
    .toFile(png);
  await sharp({ create: { width: 540, height: 820, channels: 4, background: "#3d654b" } })
    .composite([{ input: Buffer.from('<svg width="540" height="820"><rect x="70" y="70" width="400" height="680" fill="#f2efe7"/><text x="142" y="430" font-family="Arial" font-size="58" fill="#1d1d1d">WebP</text></svg>') }])
    .webp()
    .toFile(webp);
  return { jpeg, png, webp };
}

async function unlock(page) {
  await page.goto(`${BASE_URL}/admin/photo-restoration`, { waitUntil: "networkidle" });
  await page.getByLabel("PIN", { exact: true }).fill(PIN);
  const confirm = page.getByLabel("Confirm PIN");
  if (await confirm.isVisible().catch(() => false)) await confirm.fill(PIN);
  await page.getByRole("button", { name: /Save PIN and Unlock|Unlock Admin/ }).click();
  await page.getByRole("heading", { name: "Photo Restoration Tool" }).waitFor();
}

async function openTab(page, name) {
  await page.getByRole("tab", { name, exact: true }).click();
  await page.getByRole("heading", { name, exact: true }).waitFor();
}

async function selectVisiblePage10(page) {
  await openTab(page, "Page Selection");
  const select = page.locator("select.restoration-input").first();
  const page10 = await select.locator("option").evaluateAll((options) => {
    const option = options.find((node) => node.textContent?.startsWith("Page 10 "));
    return option ? { value: option.value, text: option.textContent } : null;
  });
  if (!page10) throw new Error("Visible Page 10 option not found");
  await select.selectOption(page10.value);
  await page.waitForFunction((pageId) => [...document.querySelectorAll(".restoration-meta dd")].some((node) => node.textContent === pageId), page10.value);
  return page10;
}

async function selectVisiblePage(page, displayNumber) {
  await openTab(page, "Page Selection");
  const select = page.locator("select.restoration-input").first();
  const selected = await select.locator("option").evaluateAll((options, displayNumber) => {
    const option = options.find((node) => node.textContent?.startsWith(`Page ${displayNumber} `));
    return option ? { value: option.value, text: option.textContent } : null;
  }, displayNumber);
  if (!selected) throw new Error(`Visible Page ${displayNumber} option not found`);
  await select.selectOption(selected.value);
  await page.waitForFunction((pageId) => [...document.querySelectorAll(".restoration-meta dd")].some((node) => node.textContent === pageId), selected.value);
  return selected;
}

async function waitForPhoto(page, fileName) {
  await page.waitForFunction((fileName) => {
    const canvas = window.__fvbPhotoCanvas;
    const photo = canvas?.getObjects?.().find((obj) => obj.fvbRole === "photo");
    const fileNameVisible = [...document.querySelectorAll("p.restoration-help")].some((node) => node.textContent === fileName);
    return photo && (fileName ? fileNameVisible : true);
  }, fileName);
}

async function waitForCanvasPhoto(page) {
  await waitForPhoto(page, "");
}

async function photoState(page) {
  return page.evaluate(() => {
    const canvas = window.__fvbPhotoCanvas;
    if (!canvas) return null;
    const photo = canvas.getObjects().find((obj) => obj.fvbRole === "photo");
    const bg = canvas.getObjects().find((obj) => !obj.fvbRole);
    const objects = canvas.getObjects().map((obj) => obj.fvbRole || "background");
    if (!photo) return { objects, activeRole: canvas.getActiveObject()?.fvbRole || null };
    const rect = photo.getBoundingRect();
    return {
      objects,
      activeRole: canvas.getActiveObject()?.fvbRole || null,
      zoom: canvas.getZoom(),
      left: Number(photo.left.toFixed(3)),
      top: Number(photo.top.toFixed(3)),
      width: Number(photo.getScaledWidth().toFixed(3)),
      height: Number(photo.getScaledHeight().toFixed(3)),
      angle: Number((photo.angle || 0).toFixed(3)),
      selectable: photo.selectable === true,
      evented: photo.evented === true,
      bgSelectable: bg?.selectable === true,
      bgEvented: bg?.evented === true,
      screenRect: {
        left: Number(rect.left.toFixed(3)),
        top: Number(rect.top.toFixed(3)),
        width: Number(rect.width.toFixed(3)),
        height: Number(rect.height.toFixed(3)),
      },
      controls: photo.oCoords
        ? {
            br: { x: Number(photo.oCoords.br.x.toFixed(3)), y: Number(photo.oCoords.br.y.toFixed(3)) },
            tr: { x: Number(photo.oCoords.tr.x.toFixed(3)), y: Number(photo.oCoords.tr.y.toFixed(3)) },
            bl: { x: Number(photo.oCoords.bl.x.toFixed(3)), y: Number(photo.oCoords.bl.y.toFixed(3)) },
            tl: { x: Number(photo.oCoords.tl.x.toFixed(3)), y: Number(photo.oCoords.tl.y.toFixed(3)) },
          }
        : null,
    };
  });
}

async function scrollPhotoIntoView(page) {
  await page.evaluate(() => {
    const canvas = window.__fvbPhotoCanvas;
    const area = document.querySelector(".restoration-canvas-area");
    const upper = document.querySelector(".upper-canvas");
    const photo = canvas?.getObjects?.().find((obj) => obj.fvbRole === "photo");
    if (!area || !upper || !photo) return;
    const rect = photo.getBoundingRect();
    const zoom = canvas.getZoom() || 1;
    const areaRect = area.getBoundingClientRect();
    const upperRect = upper.getBoundingClientRect();
    const upperOffsetLeft = upperRect.left - areaRect.left + area.scrollLeft;
    const upperOffsetTop = upperRect.top - areaRect.top + area.scrollTop;
    area.scrollTo({
      left: Math.max(0, upperOffsetLeft + (rect.left + rect.width / 2) * zoom - area.clientWidth / 2),
      top: Math.max(0, upperOffsetTop + (rect.top + rect.height / 2) * zoom - area.clientHeight / 2),
      behavior: "auto",
    });
    requestAnimationFrame(() => canvas.calcOffset?.());
  });
  await page.waitForTimeout(100);
}

async function getDraft(page, pageId) {
  return page.evaluate(({ key, pageId }) => JSON.parse(localStorage.getItem(key) || "{}").records?.[pageId] ?? null, {
    key: STORAGE_KEY,
    pageId,
  });
}

async function canvasBox(page) {
  const box = await page.locator(".upper-canvas").first().boundingBox();
  if (!box) throw new Error("Fabric upper canvas is not visible");
  return box;
}

async function dragPhotoByMouse(page, dx, dy) {
  await scrollPhotoIntoView(page);
  const before = await photoState(page);
  const box = await canvasBox(page);
  const zoom = before.zoom || 1;
  const startX = box.x + (before.screenRect.left + before.screenRect.width * 0.45) * zoom;
  const startY = box.y + (before.screenRect.top + before.screenRect.height * 0.45) * zoom;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 16 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  return { before, after: await photoState(page) };
}

async function resizeWithCornerHandle(page, dx, dy) {
  await scrollPhotoIntoView(page);
  const before = await photoState(page);
  const box = await canvasBox(page);
  const zoom = before.zoom || 1;
  const startX = box.x + before.controls.br.x * zoom;
  const startY = box.y + before.controls.br.y * zoom;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 16 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  return { before, after: await photoState(page) };
}

async function dragPhotoByTouch(page, dx, dy) {
  await scrollPhotoIntoView(page);
  const before = await photoState(page);
  const box = await canvasBox(page);
  const zoom = before.zoom || 1;
  const startX = box.x + (before.screenRect.left + before.screenRect.width / 2) * zoom;
  const startY = box.y + (before.screenRect.top + before.screenRect.height / 2) * zoom;
  await page.evaluate(
    async ({ startX, startY, dx, dy }) => {
      const target = document.querySelector(".upper-canvas");
      const fire = (type, x, y) =>
        target.dispatchEvent(
          new PointerEvent(type, {
            pointerId: 7,
            pointerType: "touch",
            isPrimary: true,
            clientX: x,
            clientY: y,
            bubbles: true,
            cancelable: true,
            button: type === "pointerup" ? -1 : 0,
            buttons: type === "pointerup" ? 0 : 1,
          }),
        );
      fire("pointerdown", startX, startY);
      for (let i = 1; i <= 12; i += 1) {
        fire("pointermove", startX + (dx * i) / 12, startY + (dy * i) / 12);
        await new Promise((resolve) => setTimeout(resolve, 8));
      }
      fire("pointerup", startX + dx, startY + dy);
    },
    { startX, startY, dx, dy },
  );
  await page.waitForTimeout(200);
  return { before, after: await photoState(page) };
}

async function runDesktop(inputs) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await unlock(page);
  const page10 = await selectVisiblePage10(page);
  pass("Select visible Page 10", page10.text);

  await openTab(page, "Upload");
  await page.locator('input[type="file"]').first().setInputFiles(inputs.jpeg);
  await waitForPhoto(page, path.basename(inputs.jpeg));
  const uploaded = await photoState(page);
  await screenshot(page, "01-after-jpeg-upload");
  if (
    uploaded.activeRole === "photo" &&
    uploaded.selectable &&
    uploaded.evented &&
    uploaded.bgSelectable === false &&
    uploaded.bgEvented === false &&
    uploaded.objects.at(-1) === "photo"
  ) {
    pass("JPEG upload places editable photo", JSON.stringify(uploaded));
  } else {
    fail("JPEG upload places editable photo", JSON.stringify(uploaded));
  }

  const resize = await resizeWithCornerHandle(page, -90, -70);
  await screenshot(page, "03-after-corner-resize");
  if (resize.after.width < resize.before.width - 10 || resize.after.height < resize.before.height - 10) pass("Corner handle resize changes Fabric object size", JSON.stringify(resize));
  else fail("Corner handle resize changes Fabric object size", JSON.stringify(resize));

  await openTab(page, "Upload");
  await page.getByRole("button", { name: "Remove Photo" }).click();
  await page.waitForFunction(() => !window.__fvbPhotoCanvas?.getObjects?.().some((obj) => obj.fvbRole === "photo"));
  await page.locator('input[type="file"]').first().setInputFiles([]);
  await page.locator('input[type="file"]').first().setInputFiles(inputs.jpeg);
  await waitForPhoto(page, path.basename(inputs.jpeg));

  const drag = await dragPhotoByMouse(page, -90, -110);
  await screenshot(page, "02-after-mouse-drag-upper-left");
  if (drag.after.left < drag.before.left - 40 && drag.after.top < drag.before.top - 40) pass("Mouse drag moves actual Fabric photo object", JSON.stringify(drag));
  else fail("Mouse drag moves actual Fabric photo object", JSON.stringify(drag));

  await openTab(page, "Rotate");
  const beforeRotate = await photoState(page);
  await page.getByRole("button", { name: "Rotate +" }).click();
  await waitForCanvasPhoto(page);
  const afterRotate = await photoState(page);
  await screenshot(page, "04-after-resize-rotate");
  if (afterRotate.angle > beforeRotate.angle) pass("Rotate control changes Fabric object angle", JSON.stringify({ beforeRotate, afterRotate }));
  else fail("Rotate control changes Fabric object angle", JSON.stringify({ beforeRotate, afterRotate }));

  const beforeZoom = await photoState(page);
  await openTab(page, "Position and Size");
  await page.getByRole("button", { name: "Zoom +" }).click();
  await page.getByRole("button", { name: "Zoom +" }).click();
  await waitForCanvasPhoto(page);
  const afterZoom = await photoState(page);
  if (
    afterZoom.zoom > beforeZoom.zoom &&
    Math.abs(afterZoom.left - beforeZoom.left) < 0.5 &&
    Math.abs(afterZoom.top - beforeZoom.top) < 0.5 &&
    Math.abs(afterZoom.width - beforeZoom.width) < 0.5
  ) {
    pass("Zoom changes view without changing object placement", JSON.stringify({ beforeZoom, afterZoom }));
  } else {
    fail("Zoom changes view without changing object placement", JSON.stringify({ beforeZoom, afterZoom }));
  }

  await page.getByRole("button", { name: "Save Draft" }).click();
  await page.getByText("Draft saved locally.").waitFor();
  const saved = await getDraft(page, page10.value);
  await selectVisiblePage(page, 11);
  await selectVisiblePage10(page);
  await waitForCanvasPhoto(page);
  const reopenedSamePage = await getDraft(page, page10.value);
  if (saved?.pageId === page10.value && reopenedSamePage?.pageId === page10.value && typeof reopenedSamePage?.x === "number") {
    pass("Saved draft remains associated with Page 10", JSON.stringify({ pageId: reopenedSamePage.pageId, displayNumber: reopenedSamePage.displayNumber, x: reopenedSamePage.x, y: reopenedSamePage.y }));
  } else {
    fail("Saved draft remains associated with Page 10", JSON.stringify({ saved, reopenedSamePage }));
  }

  for (const file of [inputs.png, inputs.webp]) {
    await openTab(page, "Upload");
    await page.locator('input[type="file"]').first().setInputFiles(file);
    await waitForPhoto(page, path.basename(file));
    const state = await photoState(page);
    if (state.activeRole === "photo" && state.selectable && state.evented) pass(`${path.extname(file).slice(1).toUpperCase()} upload places editable photo`, JSON.stringify(state));
    else fail(`${path.extname(file).slice(1).toUpperCase()} upload places editable photo`, JSON.stringify(state));
  }

  await browser.close();
}

async function runMobileTouch(inputs) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await unlock(page);
  await page.getByRole("button", { name: "Open Tools" }).click();
  await selectVisiblePage10(page);
  await page.getByRole("button", { name: "Open Tools" }).click();
  await openTab(page, "Upload");
  await page.locator('input[type="file"]').first().setInputFiles(inputs.webp);
  await waitForPhoto(page, path.basename(inputs.webp));
  const drag = await dragPhotoByTouch(page, -45, -52);
  await screenshot(page, "05-mobile-touch-drag");
  if (drag.after.left < drag.before.left - 10 && drag.after.top < drag.before.top - 10) pass("Mobile touch drag moves actual Fabric photo object", JSON.stringify(drag));
  else fail("Mobile touch drag moves actual Fabric photo object", JSON.stringify(drag));
  await browser.close();
}

async function writeReport(previewUrl) {
  const failed = steps.filter((step) => step.status !== "PASS");
  const lines = [
    "# v22.3 Photo Placement Repair Acceptance Report",
    "",
    "## Root Cause",
    "",
    "Uploaded photos were initialized through a separate marked-region workflow and were not selected as foreground Fabric objects after upload. Canvas zoom was applied with a CSS transform outside Fabric, which could desynchronize pointer coordinates from page/object coordinates. Touch scrolling was also allowed on the canvas area, competing with direct photo manipulation.",
    "",
    "## Files Changed",
    "",
    "- src/components/PhotoRestoration.tsx",
    "- src/styles-phase1.css",
    "- scripts/photo-placement-v22-3-acceptance.mjs",
    "- qa/v22.3-photo-placement-repair/*",
    "",
    "## Preview URL",
    "",
    previewUrl,
    "",
    "## Screenshots",
    "",
    "- screenshot immediately after upload: qa/v22.3-photo-placement-repair/screenshots/01-after-jpeg-upload.png",
    "- screenshot after dragging: qa/v22.3-photo-placement-repair/screenshots/02-after-mouse-drag-upper-left.png",
    "- screenshot after resizing: qa/v22.3-photo-placement-repair/screenshots/03-after-corner-resize.png",
    "- screenshot after resizing/rotating: qa/v22.3-photo-placement-repair/screenshots/04-after-resize-rotate.png",
    "- mobile touch test screenshot: qa/v22.3-photo-placement-repair/screenshots/05-mobile-touch-drag.png",
    "",
    "## Results",
    "",
    ...steps.map((step) => `- ${step.status}: ${step.name}${step.details ? ` - ${step.details}` : ""}`),
    "",
    `Overall: ${failed.length === 0 ? "PASS" : "FAIL"}`,
  ];
  await fs.writeFile(path.join(QA_DIR, "acceptance-report.md"), `${lines.join("\n")}\n`);
  await fs.writeFile(path.join(QA_DIR, "acceptance-results.json"), JSON.stringify({ previewUrl, steps, failed }, null, 2));
}

async function main() {
  await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  const inputs = await createInputs();
  const server = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4179"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await waitForServer();
    await runDesktop(inputs);
    await runMobileTouch(inputs);
    await writeReport(BASE_URL);
    const failed = steps.filter((step) => step.status !== "PASS");
    if (failed.length > 0) {
      console.error(`Acceptance failed: ${failed.map((step) => step.name).join(", ")}`);
      process.exitCode = 1;
    } else {
      console.log("v22.3 photo placement acceptance passed");
    }
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch(async (error) => {
  fail("Acceptance script error", error?.stack || String(error));
  await fs.mkdir(QA_DIR, { recursive: true });
  await writeReport(BASE_URL).catch(() => {});
  console.error(error);
  process.exit(1);
});
