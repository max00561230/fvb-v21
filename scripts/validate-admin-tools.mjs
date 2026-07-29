import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const EXPECTED_TOTAL = 90;

let errors = 0;

function fail(message) {
  console.error(`ERROR: ${message}`);
  errors += 1;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf-8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf-8");
}

function assertIncludes(file, needle, label = needle) {
  const text = readText(file);
  if (!text.includes(needle)) fail(`${file} must include ${label}.`);
}

function validateRoutesAndGate() {
  assertIncludes("src/main.tsx", 'path: "/admin"', "/admin route");
  assertIncludes("src/main.tsx", 'path: "photo-restoration"', "/admin/photo-restoration child route");
  assertIncludes("src/main.tsx", "<AdminGate />", "AdminGate wrapper");
  assertIncludes("src/components/AdminGate.tsx", "sessionStorage", "sessionStorage unlock state");
  assertIncludes("src/components/AdminGate.tsx", "localStorage", "local derived PIN verifier");
  assertIncludes("src/components/AdminGate.tsx", "PBKDF2", "PBKDF2 derived PIN hash");
  assertIncludes("src/components/AdminGate.tsx", "Lock Admin", "visible Lock Admin button");

  const adminGate = readText("src/components/AdminGate.tsx");
  if (/default\s*pin|["'](?:1234|0000)["']/i.test(adminGate)) {
    fail("AdminGate must not ship with a default PIN.");
  }
  if (/localStorage\.setItem\([^,]+,\s*pin\)/.test(adminGate)) {
    fail("AdminGate must not store the PIN as plain text.");
  }
}

function validateRestorationTool() {
  const text = readText("src/components/PhotoRestoration.tsx");
  for (const needle of [
    'fetch("/data/pages.json")',
    'fetch("/data/reading-order.json")',
    "Runtime pages manifest does not match authoritative reading order.",
    "pageId: page.pageId",
    "readingPosition: page.readingPosition",
    "displayNumber: page.displayNumber",
    "sourceFile: page.sourceFile",
    "createdAt",
    "browser-local storage",
    "Delete Draft",
    "Export Restoration Package",
    "Download Prepared Package",
  ]) {
    if (!text.includes(needle)) fail(`PhotoRestoration.tsx missing ${needle}.`);
  }

  for (const field of ["draftId", "photoDataReference", "x", "y", "width", "height", "rotation", "crop", "status", "updatedAt"]) {
    if (!text.includes(field)) fail(`PhotoRestoration.tsx missing required draft/export field ${field}.`);
  }

  for (const helpSection of [
    "Quick Start",
    "Select a Page",
    "Upload a Photo",
    "Move and Resize",
    "Rotate and Crop",
    "Preview",
    "Save and Reopen a Draft",
    "Approve a Restoration",
    "Export the Restoration Package",
    "Lock Admin",
    "Where Drafts Are Stored",
    "What Happens After Export",
    "Troubleshooting",
  ]) {
    if (!text.includes(helpSection)) fail(`PhotoRestoration.tsx missing Help section ${helpSection}.`);
  }

  for (const exportFile of ["manifest.json", "placement.json", "original-recovered-photo", "flattened-restoration-preview.png", "README.txt"]) {
    if (!text.includes(exportFile)) fail(`PhotoRestoration.tsx missing export package file ${exportFile}.`);
  }

  for (const forbidden of ["@supabase", "createClient(", "uploadBytes(", "fetch(\"/api/upload", "fetch('/api/upload"]) {
    if (text.includes(forbidden)) {
      fail(`PhotoRestoration.tsx must not upload recovered photos or use ${forbidden}.`);
    }
  }
}

function validateManifests() {
  const pagesManifest = readJson("public/data/pages.json");
  const readingOrder = readJson("public/data/reading-order.json");
  const searchIndex = readJson("public/data/search-index.json");

  const pages = pagesManifest.pages ?? [];
  if (pagesManifest.totalPages !== EXPECTED_TOTAL || pages.length !== EXPECTED_TOTAL) {
    fail(`Runtime manifest must expose exactly ${EXPECTED_TOTAL} visible pages.`);
  }

  const pageIds = pages.map((page) => page.pageId);
  if (new Set(pageIds).size !== EXPECTED_TOTAL) fail("Each active pageId must appear exactly once.");

  const positions = pages.map((page) => page.readingPosition);
  const displayNumbers = pages.map((page) => page.displayNumber);
  for (let index = 1; index <= EXPECTED_TOTAL; index += 1) {
    if (!positions.includes(index)) fail(`Missing readingPosition ${index}.`);
    if (!displayNumbers.includes(index)) fail(`Missing displayNumber ${index}.`);
  }

  for (let index = 0; index < pages.length; index += 1) {
    if (pages[index].pageId !== readingOrder.pages[index]?.pageId) {
      fail(`Reader row ${index + 1} does not match authoritative reading order.`);
    }
    if (pages[index].thumbnailSrc !== `/book-pages/thumbnails/${pages[index].pageId}.webp`) {
      fail(`Thumbnail for ${pages[index].pageId} is not keyed to authoritative pageId.`);
    }
  }

  for (const entry of searchIndex.pages ?? []) {
    const runtimePage = pages.find((page) => page.displayNumber === entry.displayNumber);
    if (!runtimePage || runtimePage.pageId !== entry.pageId || runtimePage.sourceFile !== entry.sourceFile) {
      fail(`Search entry for display page ${entry.displayNumber} does not open the authoritative source.`);
    }
  }

  const page89 = pages.find((page) => page.displayNumber === 89);
  if (page89?.pageId !== "page-002" || page89?.sourceFile !== "page-02.png") {
    fail("Visible Page 89 must select old Page 2 source image page-002/page-02.png.");
  }
}

function validateOriginalScansUntouched() {
  let changedFiles = "";
  try {
    changedFiles = execFileSync("git", ["status", "--short", "--untracked-files=all"], { encoding: "utf-8" });
  } catch (err) {
    fail(`Unable to inspect git status: ${err.message}`);
    return;
  }
  const changedOriginalScan = changedFiles
    .split("\n")
    .filter(Boolean)
    .find((line) => /archive-source\/original-scans|public\/book-pages\/masters/.test(line));
  if (changedOriginalScan) {
    fail(`Original source scan appears changed: ${changedOriginalScan}`);
  }
}

validateRoutesAndGate();
validateRestorationTool();
validateManifests();
validateOriginalScansUntouched();

if (errors > 0) {
  console.error(`Admin tools validation failed with ${errors} error(s).`);
  process.exit(1);
}

console.log("Admin tools validation passed");
