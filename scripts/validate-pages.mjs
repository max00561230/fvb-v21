import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import {
  INACTIVE_PAGES,
  READING_ORDER,
  TOTAL_READING_PAGES,
  readingOrderManifest
} from "./page-metadata.mjs";

const EXPECTED_TOTAL = 90;
const SOURCE = path.resolve("archive-source/original-scans");
const PUBLIC_DATA = path.resolve("public/data");
const REPORT_PATH = path.resolve("qa/page-order-validation-report.md");

let errors = 0;
let warnings = 0;

function fail(message) {
  console.error(`ERROR: ${message}`);
  errors += 1;
}

function warn(message) {
  console.warn(`WARN: ${message}`);
  warnings += 1;
}

function assertUniqueExactRange(values, label) {
  const seen = new Set(values);
  if (values.length !== EXPECTED_TOTAL) {
    fail(`${label} count is ${values.length}; expected ${EXPECTED_TOTAL}.`);
  }
  if (seen.size !== values.length) {
    fail(`${label} contains duplicate values.`);
  }
  for (let i = 1; i <= EXPECTED_TOTAL; i += 1) {
    if (!seen.has(i)) fail(`${label} is missing ${i}.`);
  }
}

async function readJson(filePath, required = true) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8"));
  } catch (err) {
    if (required) fail(`Unable to read ${filePath}: ${err.message}`);
    return null;
  }
}

async function validateSourceFiles() {
  const sourceDirExists = await fs.access(SOURCE).then(() => true).catch(() => false);
  if (!sourceDirExists && process.env.VERCEL) {
    warn(`Source image directory is unavailable in Vercel build environment; local validation must verify source images before deploy.`);
    return;
  }

  const activeSourceHashes = new Map();
  for (const record of READING_ORDER) {
    const sourcePath = path.join(SOURCE, record.sourceFile);
    try {
      const sourceBytes = await fs.readFile(sourcePath);
      const sourceHash = crypto.createHash("sha256").update(sourceBytes).digest("hex");
      const duplicate = activeSourceHashes.get(sourceHash);
      if (duplicate) {
        fail(`Active source image hash is duplicated by ${duplicate.pageId} and ${record.pageId}.`);
      } else {
        activeSourceHashes.set(sourceHash, record);
      }

      const metadata = await sharp(sourcePath).metadata();
      if (!metadata.width || !metadata.height) {
        fail(`Source image is unreadable: ${record.sourceFile}`);
      }
      if (metadata.width < 1000 || metadata.height < 1000) {
        warn(`${record.sourceFile} is low resolution: ${metadata.width} x ${metadata.height}`);
      }
    } catch (err) {
      fail(`Missing or unreadable source image for ${record.pageId}: ${record.sourceFile} (${err.message})`);
    }
  }

  for (const record of INACTIVE_PAGES) {
    const sourcePath = path.join(SOURCE, record.sourceFile);
    try {
      const metadata = await sharp(sourcePath).metadata();
      if (!metadata.width || !metadata.height) {
        fail(`Inactive source image is unreadable: ${record.sourceFile}`);
      }
    } catch (err) {
      fail(`Missing or unreadable inactive source image for ${record.pageId}: ${record.sourceFile} (${err.message})`);
    }
  }
}

function validateReadingOrderManifest() {
  if (TOTAL_READING_PAGES !== EXPECTED_TOTAL || readingOrderManifest.totalPages !== EXPECTED_TOTAL) {
    fail(`Authoritative manifest total is ${TOTAL_READING_PAGES}; expected ${EXPECTED_TOTAL}.`);
  }

  const requiredFields = [
    "pageId",
    "readingPosition",
    "displayNumber",
    "originalPrintedPageNumber",
    "sourceFile"
  ];

  for (const record of READING_ORDER) {
    for (const field of requiredFields) {
      if (!(field in record)) {
        fail(`${record.pageId || "unknown page"} missing required field ${field}.`);
      }
    }
    if (!/^page-\d{3}$/.test(record.pageId)) {
      fail(`Invalid permanent pageId: ${record.pageId}`);
    }
    if (typeof record.sourceFile !== "string" || !record.sourceFile) {
      fail(`${record.pageId} has invalid sourceFile.`);
    }
  }

  const pageIds = READING_ORDER.map((page) => page.pageId);
  if (new Set(pageIds).size !== EXPECTED_TOTAL) {
    fail("Every active permanent pageId must appear exactly once.");
  }

  const inactivePage007 = INACTIVE_PAGES.find((page) => page.pageId === "page-007");
  if (!inactivePage007) {
    fail("page-007 must be preserved as an inactive duplicate audit/source/OCR record.");
  } else if (inactivePage007.duplicateOf !== "page-006") {
    fail("page-007 inactive metadata must keep duplicateOf page-006.");
  }

  for (const inactivePage of INACTIVE_PAGES) {
    if (!inactivePage.pageId || !inactivePage.sourceFile) {
      fail("Inactive page records must preserve pageId and sourceFile.");
    }
    if (pageIds.includes(inactivePage.pageId)) {
      fail(`Inactive page ${inactivePage.pageId} also appears in the active reading order.`);
    }
    if (inactivePage.readingPosition !== null || inactivePage.displayNumber !== null) {
      fail(`Inactive page ${inactivePage.pageId} must not have active reading/display positions.`);
    }
  }
  assertUniqueExactRange(READING_ORDER.map((page) => page.readingPosition), "readingPosition");
  assertUniqueExactRange(READING_ORDER.map((page) => page.displayNumber), "displayNumber");

  const sortedByPosition = [...READING_ORDER].sort((a, b) => a.readingPosition - b.readingPosition);
  for (let i = 0; i < sortedByPosition.length; i += 1) {
    if (sortedByPosition[i].displayNumber !== i + 1) {
      fail(`Visible display numbers are not strictly sequential at reading position ${i + 1}.`);
    }
  }
}

function validateRuntimePages(runtimeManifest) {
  if (!runtimeManifest) return;

  const pages = runtimeManifest.pages || [];
  if (runtimeManifest.totalPages !== EXPECTED_TOTAL || pages.length !== EXPECTED_TOTAL) {
    fail(`Runtime pages manifest has ${pages.length}/${runtimeManifest.totalPages}; expected ${EXPECTED_TOTAL}.`);
  }

  const checkpoints = [
    { displayNumber: 2, pageId: "page-003", sourceFile: "page-03.png", formerVisiblePage: 3 },
    { displayNumber: 88, pageId: "page-090", sourceFile: "page-90.png", formerVisiblePage: 89 },
    { displayNumber: 89, pageId: "page-002", sourceFile: "page-02.png", formerVisiblePage: 2 },
    { displayNumber: 90, pageId: "page-091", sourceFile: "page-91.png", formerVisiblePage: 90 },
  ];

  for (const checkpoint of checkpoints) {
    const page = pages.find((entry) => entry.displayNumber === checkpoint.displayNumber);
    if (!page) {
      fail(`Missing required visible page checkpoint ${checkpoint.displayNumber}.`);
      continue;
    }
    if (page.pageId !== checkpoint.pageId || page.sourceFile !== checkpoint.sourceFile) {
      fail(
        `Visible page ${checkpoint.displayNumber} should use former visible page ${checkpoint.formerVisiblePage} source ${checkpoint.pageId}/${checkpoint.sourceFile}; got ${page.pageId}/${page.sourceFile}.`
      );
    }
  }

  for (let index = 0; index < READING_ORDER.length; index += 1) {
    const expected = READING_ORDER[index];
    const page = pages[index];
    if (!page) {
      fail(`Runtime pages manifest missing row ${index + 1}.`);
      continue;
    }

    const expectedThumbnail = `/book-pages/thumbnails/${expected.pageId}.webp`;
    if (page.pageId !== expected.pageId || page.id !== expected.pageId) {
      fail(`Runtime page row ${index + 1} has ${page.pageId || page.id}; expected ${expected.pageId}.`);
    }
    if (page.readingPosition !== expected.readingPosition) {
      fail(`${expected.pageId} runtime readingPosition mismatch.`);
    }
    if (page.displayNumber !== expected.displayNumber || page.pageNumber !== expected.displayNumber) {
      fail(`${expected.pageId} runtime display/page number mismatch.`);
    }
    if (page.originalPrintedPageNumber !== expected.originalPrintedPageNumber) {
      fail(`${expected.pageId} originalPrintedPageNumber mismatch.`);
    }
    if (page.sourceFile !== expected.sourceFile) {
      fail(`${expected.pageId} sourceFile mismatch.`);
    }
    if (page.thumbnailSrc !== expectedThumbnail) {
      fail(`${expected.pageId} thumbnail does not match reader order/pageId.`);
    }
    for (const size of ["mobile", "tablet", "desktop"]) {
      if (page.sources?.[size] !== `/book-pages/${size}/${expected.pageId}.webp`) {
        fail(`${expected.pageId} ${size} source does not match pageId.`);
      }
    }
  }

  for (let index = 0; index < pages.length; index += 1) {
    const previous = index === 0 ? null : pages[index - 1];
    const current = pages[index];
    const next = index === pages.length - 1 ? null : pages[index + 1];
    if (previous && previous.displayNumber !== current.displayNumber - 1) {
      fail(`Previous navigation mismatch at page ${current.displayNumber}.`);
    }
    if (next && next.displayNumber !== current.displayNumber + 1) {
      fail(`Next navigation mismatch at page ${current.displayNumber}.`);
    }
  }
}

function validateSearchIndex(searchIndex, runtimeManifest) {
  if (!searchIndex || !runtimeManifest) return;
  const pages = searchIndex.pages || [];
  const runtimeByDisplay = new Map(runtimeManifest.pages.map((page) => [page.displayNumber, page]));

  if (searchIndex.totalPages !== EXPECTED_TOTAL || pages.length !== EXPECTED_TOTAL) {
    fail(`Search index has ${pages.length}/${searchIndex.totalPages}; expected ${EXPECTED_TOTAL}.`);
  }
  if (pages.some((entry) => entry.pageId === "page-007")) {
    fail("Inactive duplicate page-007 must not appear in the active search index.");
  }

  for (const entry of pages) {
    const runtimePage = runtimeByDisplay.get(entry.displayNumber ?? entry.pageNumber);
    if (!runtimePage) {
      fail(`Search entry points to missing display page ${entry.displayNumber ?? entry.pageNumber}.`);
      continue;
    }
    if (entry.pageId !== runtimePage.pageId) {
      fail(`Search result for display page ${runtimePage.displayNumber} opens ${entry.pageId}; expected ${runtimePage.pageId}.`);
    }
    if (entry.sourceFile !== runtimePage.sourceFile) {
      fail(`Search result for ${runtimePage.pageId} has wrong sourceFile.`);
    }
  }
}

async function writeReport() {
  const lines = [
    "# Page Order Validation Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| readingPosition | displayNumber | pageId | sourceFile | originalPrintedPageNumber |",
    "|---:|---:|---|---|---:|"
  ];

  for (const page of READING_ORDER) {
    lines.push(
      `| ${page.readingPosition} | ${page.displayNumber} | ${page.pageId} | ${page.sourceFile} | ${page.originalPrintedPageNumber ?? ""} |`
    );
  }

  if (INACTIVE_PAGES.length > 0) {
    lines.push(
      "",
      "## Inactive Duplicate/Audit Pages",
      "",
      "| pageId | duplicateOf | sourceFile | originalPrintedPageNumber | inactiveReason |",
      "|---|---|---|---:|---|"
    );
    for (const page of INACTIVE_PAGES) {
      lines.push(
        `| ${page.pageId} | ${page.duplicateOf ?? ""} | ${page.sourceFile} | ${page.originalPrintedPageNumber ?? ""} | ${page.inactiveReason ?? ""} |`
      );
    }
  }

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, `${lines.join("\n")}\n`);
}

async function main() {
  validateReadingOrderManifest();
  await validateSourceFiles();

  const runtimeManifest = await readJson(path.join(PUBLIC_DATA, "pages.json"));
  validateRuntimePages(runtimeManifest);

  const searchIndex = await readJson(path.join(PUBLIC_DATA, "search-index.json"), false);
  validateSearchIndex(searchIndex, runtimeManifest);

  await writeReport();

  console.log(`\nValidation report: ${REPORT_PATH}`);
  console.log(`Validation complete: ${EXPECTED_TOTAL} pages, ${errors} errors, ${warnings} warnings.`);

  if (errors > 0) {
    console.error("VALIDATION FAILED.");
    process.exit(1);
  }

  console.log("VALIDATION PASSED");
}

main().catch((err) => {
  console.error("VALIDATION FAILED:", err.message);
  process.exit(1);
});
