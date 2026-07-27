#!/usr/bin/env node
/**
 * OCR Generation Script for FVB v21.1
 * 
 * Processes all 91 physical source pages using Tesseract CLI with ImageMagick preprocessing.
 * NEVER touches archival masters — all preprocessing done on temporary copies.
 * 
 * Usage: node scripts/generate-ocr.mjs
 * 
 * Output: public/data/ocr/page-XXX.json for each page
 *         public/data/ocr/ocr-report.json completion report
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  INACTIVE_PAGES,
  TOTAL_READING_PAGES,
  originalPageNumberForPageId,
  pageNumberForPageId,
  pageRecordForPageId,
  readingPositionForPageId,
  sourceFileForPageId
} from "./page-metadata.mjs";

const TESSERACT = "/opt/homebrew/bin/tesseract";
const PROJECT_ROOT = new URL("..", import.meta.url).pathname;

// Source image directories — phase folders on external volume
const PHASE_DIRS = [
  { range: [1, 5], dir: "/Volumes/openclaw/family-heritage-book/phase-1/page-images" },
  { range: [6, 20], dir: "/Volumes/openclaw/family-heritage-book/phase-2-pages-06-20/page-images" },
  { range: [21, 35], dir: "/Volumes/openclaw/family-heritage-book/phase-3-pages-21-35/page-images" },
  { range: [36, 50], dir: "/Volumes/openclaw/family-heritage-book/phase-4-pages-36-50/page-images" },
  { range: [51, 65], dir: "/Volumes/openclaw/family-heritage-book/phase-5-pages-51-65/page-images" },
  { range: [66, 80], dir: "/Volumes/openclaw/family-heritage-book/phase-6-pages-66-80/page-images" },
  { range: [81, 91], dir: "/Volumes/openclaw/family-heritage-book/phase-7-pages-81-91/page-images" },
];

const OUTPUT_DIR = join(PROJECT_ROOT, "public", "data", "ocr");
const CORRECTIONS_DIR = join(OUTPUT_DIR, "corrections");
const TEMP_DIR = join(tmpdir(), "fvb-ocr-preprocess");

function getSourcePath(pageNum) {
  for (const phase of PHASE_DIRS) {
    if (pageNum >= phase.range[0] && pageNum <= phase.range[1]) {
      const padded = String(pageNum).padStart(2, "0");
      return join(phase.dir, `page-${padded}.png`);
    }
  }
  return null;
}

function preprocessImage(srcPath, pageNum) {
  // Create temp directory if needed
  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true });
  }

  const padded = String(pageNum).padStart(3, "0");
  const tempProcessed = join(TEMP_DIR, `page-${padded}-processed.png`);

  // ImageMagick preprocessing: grayscale, contrast enhance, deskew, 2x enlarge
  // Using magick command (ImageMagick 7) or convert (ImageMagick 6)
  const magickCmd = "magick"; // Try v7 first
  const convertCmd = "convert"; // Fallback to v6

  let cmd;
  try {
    // Try ImageMagick 7 (magick command)
    execSync(`which ${magickCmd}`, { stdio: "pipe" });
    cmd = `${magickCmd} "${srcPath}" -colorspace Gray -normalize -deskew 40% -resize 200% "${tempProcessed}"`;
  } catch {
    try {
      // Fallback to ImageMagick 6 (convert command)
      execSync(`which ${convertCmd}`, { stdio: "pipe" });
      cmd = `${convertCmd} "${srcPath}" -colorspace Gray -normalize -deskew 40% -resize 200% "${tempProcessed}"`;
    } catch {
      // No ImageMagick — use Tesseract directly on the source
      console.warn(`  ⚠ No ImageMagick found, processing page ${pageNum} without preprocessing`);
      return srcPath;
    }
  }

  try {
    execSync(cmd, { stdio: "pipe", timeout: 60000 });
    return tempProcessed;
  } catch (err) {
    console.warn(`  ⚠ Preprocessing failed for page ${pageNum}, using original`);
    return srcPath;
  }
}

function runTesseract(imagePath, pageNum) {
  const padded = String(pageNum).padStart(3, "0");
  const outputBase = join(TEMP_DIR, `page-${padded}-ocr`);

  try {
    // Run Tesseract: output both text (stdout) and TSV (for word coordinates)
    // tesseract <image> <output_base> --psm 1 tsv txt
    execSync(
      `"${TESSERACT}" "${imagePath}" "${outputBase}" --psm 1 -l eng tsv txt 2>/dev/null`,
      { stdio: "pipe", timeout: 120000 }
    );

    // Read text output
    const txtPath = `${outputBase}.txt`;
    const tsvPath = `${outputBase}.tsv`;

    let rawText = "";
    let tsvData = "";

    if (existsSync(txtPath)) {
      rawText = readFileSync(txtPath, "utf-8").trim();
    }
    if (existsSync(tsvPath)) {
      tsvData = readFileSync(tsvPath, "utf-8");
    }

    // Parse TSV for word coordinates and confidence
    const words = parseTsv(tsvData);

    // Calculate overall confidence
    const confidences = words.filter(w => w.conf > 0).map(w => w.conf);
    const avgConfidence = confidences.length > 0
      ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length * 10) / 10
      : 0;

    // Clean text for search
    const cleanedText = cleanText(rawText);

    return {
      rawText,
      cleanedText,
      confidence: avgConfidence,
      words
    };
  } catch (err) {
    console.error(`  ✗ Tesseract failed for page ${pageNum}: ${err.message}`);
    return null;
  }
}

function parseTsv(tsv) {
  const lines = tsv.split("\n");
  const words = [];

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split("\t");
    if (parts.length < 12) continue;

    const level = parseInt(parts[0]);
    const blockNum = parseInt(parts[1]);
    const parNum = parseInt(parts[2]);
    const lineNum = parseInt(parts[3]);
    const wordNum = parseInt(parts[4]);
    const left = parseInt(parts[5]);
    const top = parseInt(parts[6]);
    const width = parseInt(parts[7]);
    const height = parseInt(parts[8]);
    const conf = parseFloat(parts[9]);
    const text = parts[10] || "";

    // Only include actual words (level 5 in Tesseract TSV)
    if (level === 5 && text.trim()) {
      words.push({
        text,
        conf,
        bbox: { left, top, width, height }
      });
    }
  }

  return words;
}

function cleanText(text) {
  return text
    // Remove excessive whitespace
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    // Remove common OCR artifacts
    .replace(/[|]/g, "I")
    .replace(/^[~\s]+$/gm, "")
    .trim();
}

function processPage(pageNum) {
  const sourcePath = getSourcePath(pageNum);
  if (!sourcePath || !existsSync(sourcePath)) {
    return { pageNum, success: false, error: "Source image not found" };
  }

  console.log(`Processing page ${pageNum}...`);

  // Preprocess (on temp copy only)
  const processedPath = preprocessImage(sourcePath, pageNum);

  // Run Tesseract
  const result = runTesseract(processedPath, pageNum);

  // Cleanup temp processed file if it's different from source
  if (processedPath !== sourcePath && existsSync(processedPath)) {
    try { rmSync(processedPath); } catch {}
  }

  if (!result) {
    return { pageNum, success: false, error: "Tesseract failed" };
  }

  const padded = String(pageNum).padStart(3, "0");

  // Skip if already processed (resumable)
  const existingPath = join(OUTPUT_DIR, `page-${padded}.json`);
  if (existsSync(existingPath)) {
    console.log(`Page ${pageNum} already processed, skipping`);
    try {
      const existing = JSON.parse(readFileSync(existingPath, "utf-8"));
      return { pageNum, success: true, confidence: existing.confidence, wordCount: existing.wordCount, skipped: true };
    } catch {
      // Corrupt file — reprocess
      console.warn(`  ⚠ Existing file corrupt, reprocessing page ${pageNum}`);
    }
  }

  const pageId = `page-${padded}`;
  const pageRecord = pageRecordForPageId(pageId);
  const activePageNumber = pageNumberForPageId(pageId) ?? null;
  const activeReadingPosition = readingPositionForPageId(pageId) ?? null;
  const inactive = activePageNumber === null;
  const output = {
    pageId,
    pageNumber: activePageNumber,
    readingPosition: activeReadingPosition,
    displayNumber: activePageNumber,
    originalPrintedPageNumber: originalPageNumberForPageId(pageId) ?? pageNum,
    originalPageNumber: originalPageNumberForPageId(pageId) ?? pageNum,
    sourceFile: sourceFileForPageId(pageId) ?? `page-${String(pageNum).padStart(2, "0")}.png`,
    sourceImage: pageRecord?.sourceFile ?? `page-${String(pageNum).padStart(2, "0")}.png`,
    inactive,
    inactiveReason: inactive ? pageRecord?.inactiveReason : undefined,
    duplicateOf: inactive ? pageRecord?.duplicateOf : undefined,
    rawText: result.rawText,
    cleanedText: result.cleanedText,
    confidence: result.confidence,
    wordCount: result.words.length,
    words: result.words,
    machineGenerated: true,
    generatedAt: new Date().toISOString(),
    tesseractVersion: "5.5.2"
  };

  const outputPath = join(OUTPUT_DIR, `page-${padded}.json`);
  writeFileSync(outputPath, JSON.stringify(output, null, 2));

  return {
    pageNum,
    success: true,
    confidence: result.confidence,
    wordCount: result.words.length
  };
}

function main() {
  console.log("=== FVB v21.1 OCR Generation ===");
  console.log(`Tesseract: ${TESSERACT}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log("");

  // Ensure output directories exist
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  if (!existsSync(CORRECTIONS_DIR)) {
    mkdirSync(CORRECTIONS_DIR, { recursive: true });
  }

  // Check source volume is mounted
  if (!existsSync("/Volumes/openclaw/family-heritage-book")) {
    console.error("ERROR: Source volume /Volumes/openclaw not mounted!");
    process.exit(1);
  }

  const results = [];
  const totalPages = 91;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const result = processPage(pageNum);
    results.push(result);

    if (result.success) {
      const confStr = result.confidence < 60 ? " ⚠ LOW CONFIDENCE" : "";
      console.log(`  ✓ Page ${pageNum}: ${result.wordCount} words, ${result.confidence}% confidence${confStr}`);
    } else {
      console.log(`  ✗ Page ${pageNum}: FAILED — ${result.error}`);
    }
  }

  // Generate completion report
  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const lowConfidence = succeeded.filter(r => r.confidence < 60);

  const report = {
    generatedAt: new Date().toISOString(),
    totalPages: TOTAL_READING_PAGES,
    totalPhysicalPages: 91,
    activeReadingPages: TOTAL_READING_PAGES,
    inactivePages: INACTIVE_PAGES.map((page) => ({
      pageId: page.pageId,
      sourceFile: page.sourceFile,
      duplicateOf: page.duplicateOf,
      inactiveReason: page.inactiveReason,
    })),
    pagesProcessed: succeeded.length,
    pagesFailed: failed.length,
    lowConfidencePages: lowConfidence.map(r => ({
      page: r.pageNum,
      confidence: r.confidence
    })),
    failedPages: failed.map(r => ({
      page: r.pageNum,
      error: r.error
    })),
    averageConfidence: succeeded.length > 0
      ? Math.round(succeeded.reduce((a, b) => a + b.confidence, 0) / succeeded.length * 10) / 10
      : 0,
    tesseractVersion: "5.5.2",
    machineGenerated: true
  };

  writeFileSync(join(OUTPUT_DIR, "ocr-report.json"), JSON.stringify(report, null, 2));

  console.log("\n=== OCR Complete ===");
  console.log(`Pages processed: ${succeeded.length}/${totalPages}`);
  console.log(`Pages failed: ${failed.length}`);
  console.log(`Low confidence pages: ${lowConfidence.length}`);
  console.log(`Average confidence: ${report.averageConfidence}%`);
  console.log(`Report saved to: ${join(OUTPUT_DIR, "ocr-report.json")}`);

  // Cleanup temp directory
  if (existsSync(TEMP_DIR)) {
    try { rmSync(TEMP_DIR, { recursive: true, force: true }); } catch {}
  }
}

main();
