#!/usr/bin/env node
/**
 * Re-run Tesseract with full TSV output for the 90 approved visible pages.
 * Generates structured machine OCR JSON per Tony's spec:
 *   src/data/search/ocr/raw/    — raw TSV files
 *   src/data/search/ocr/pages/   — structured JSON per page
 *   src/data/search/ocr/corrections/ — reserved for future manual corrections
 *   src/data/search/ocr/reports/ — completion report
 *
 * Each page JSON has: pageId, pageNumber, sourceImage, rawText, cleanText,
 *   averageConfidence, reviewStatus, words[] with text/confidence/x/y/width/height/block/paragraph/line/word
 *
 * Usage: node scripts/run-tsv-ocr.mjs
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import {
  READING_ORDER,
  INACTIVE_PAGES,
  TOTAL_READING_PAGES,
  originalPageNumberForPageId,
  pageNumberForPageId,
  pageRecordForPageId,
  readingPositionForPageId,
  sourceFileForPageId
} from "./page-metadata.mjs";

const execFileAsync = promisify(execFile);

const MASTERS_DIR = path.resolve("public/book-pages/masters");
const ORIGINAL_SCANS_DIR = path.resolve("archive-source/original-scans");
const RAW_DIR = path.resolve("src/data/search/ocr/raw");
const PAGES_DIR = path.resolve("src/data/search/ocr/pages");
const CORRECTIONS_DIR = path.resolve("src/data/search/ocr/corrections");
const REPORTS_DIR = path.resolve("src/data/search/ocr/reports");
const LOW_CONFIDENCE_WORD_THRESHOLD = 60;
const LOW_CONFIDENCE_PAGE_THRESHOLD = 75;

async function ensureDirs() {
  for (const dir of [RAW_DIR, PAGES_DIR, CORRECTIONS_DIR, REPORTS_DIR]) {
    await fs.mkdir(dir, { recursive: true });
  }
}

function pad3(n) {
  return String(n).padStart(3, "0");
}

function pageNumFromPageId(pageId) {
  return Number(pageId.replace(/^page-/, ""));
}

async function existingPath(filePath) {
  try {
    await fs.access(filePath);
    return filePath;
  } catch {
    return null;
  }
}

async function sourceImagePathForPage(record) {
  const pageNum = pageNumFromPageId(record.pageId);
  const candidates = [
    path.join(ORIGINAL_SCANS_DIR, record.sourceFile),
    path.join(MASTERS_DIR, `${record.pageId}.png`),
    path.join(MASTERS_DIR, `page-${pad3(pageNum)}.png`),
  ];

  for (const candidate of candidates) {
    const found = await existingPath(candidate);
    if (found) return found;
  }

  return null;
}

async function getTesseractVersion() {
  try {
    const { stdout, stderr } = await execFileAsync("tesseract", ["--version"], {
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    });
    return (stdout || stderr).split("\n")[0].trim();
  } catch {
    return "tesseract";
  }
}

async function pruneStaleOutputs(activePageIds) {
  const activeFiles = new Set([...activePageIds].map((pageId) => `${pageId}.json`));
  const activeTsv = new Set([...activePageIds].map((pageId) => `${pageId}.tsv`));

  const removed = [];
  for (const [dir, allowed] of [[PAGES_DIR, activeFiles], [RAW_DIR, activeTsv]]) {
    let entries = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!/^page-\d{3}\.(json|tsv)$/.test(entry) || allowed.has(entry)) continue;
      const filePath = path.join(dir, entry);
      await fs.unlink(filePath);
      removed.push(path.relative(process.cwd(), filePath));
    }
  }

  return removed;
}

async function runTesseract(record) {
  const pageNum = pageNumFromPageId(record.pageId);
  const padded = record.pageId.replace(/^page-/, "");
  const imgPath = await sourceImagePathForPage(record);
  const tsvPath = path.join(RAW_DIR, `${record.pageId}.tsv`);

  if (!imgPath) {
    return { pageId: record.pageId, pageNum, success: false, error: `Image not found for ${record.sourceFile}` };
  }

  try {
    await execFileAsync("tesseract", [imgPath, tsvPath.replace(/\.tsv$/, ""), "--psm", "1", "-l", "eng", "tsv"], {
      timeout: 120000,
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (err) {
    return { pageId: record.pageId, pageNum, success: false, error: `Tesseract failed: ${err.message}` };
  }

  try {
    const tsvContent = await fs.readFile(tsvPath, "utf-8");
    const jsonData = parseTsv(tsvContent, record, imgPath);

    const jsonPath = path.join(PAGES_DIR, `${record.pageId}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2));

    return {
      pageId: record.pageId,
      pageNum,
      success: true,
      wordCount: jsonData.words.length,
      avgConfidence: jsonData.averageConfidence,
      lowConfidenceWords: jsonData.lowConfidenceWords,
    };
  } catch (err) {
    return { pageId: record.pageId, pageNum, success: false, error: `TSV parse failed: ${err.message}` };
  }
}

function parseTsv(tsvContent, record, imgPath) {
  const lines = tsvContent.trim().split("\n");

  const words = [];
  let fullText = [];
  let totalConf = 0;
  let wordCount = 0;
  let lowConfCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const level = parseInt(cols[0]);
    const block = parseInt(cols[2]);
    const par = parseInt(cols[3]);
    const line = parseInt(cols[4]);
    const word = parseInt(cols[5]);
    const left = parseInt(cols[6]);
    const top = parseInt(cols[7]);
    const width = parseInt(cols[8]);
    const height = parseInt(cols[9]);
    const conf = parseFloat(cols[10]);
    const text = cols.slice(11).join("\t");

    if (level === 5 && text.trim()) {
      const wordConf = Number.isFinite(conf) ? conf : -1;
      if (wordConf >= 0) {
        totalConf += wordConf;
        wordCount++;
        if (wordConf < LOW_CONFIDENCE_WORD_THRESHOLD) lowConfCount++;
      }

      words.push({
        text,
        confidence: wordConf,
        x: left,
        y: top,
        width,
        height,
        block,
        paragraph: par,
        line,
        word,
      });

      fullText.push(text);
    }
  }

  const avgConf = wordCount > 0 ? totalConf / wordCount : 0;
  const rawText = fullText.join(" ");
  const cleanText = rawText
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .trim();

  const pageId = record.pageId;
  const pageRecord = pageRecordForPageId(pageId);
  const activePageNumber = pageNumberForPageId(pageId) ?? null;
  const activeReadingPosition = readingPositionForPageId(pageId) ?? null;

  return {
    pageId,
    pageNumber: activePageNumber,
    readingPosition: activeReadingPosition,
    displayNumber: activePageNumber,
    originalPrintedPageNumber: originalPageNumberForPageId(pageId) ?? record.originalPrintedPageNumber,
    originalPageNumber: originalPageNumberForPageId(pageId) ?? record.originalPrintedPageNumber,
    sourceFile: sourceFileForPageId(pageId) ?? record.sourceFile,
    sourceImage: pageRecord?.sourceFile ?? record.sourceFile,
    sourceImagePath: path.relative(process.cwd(), imgPath),
    rawText,
    cleanText,
    averageConfidence: Math.round(avgConf * 10) / 10,
    wordCount,
    lowConfidenceWords: lowConfCount,
    reviewStatus: "machine-generated",
    words,
  };
}

async function main() {
  console.log(`Starting TSV OCR run for ${TOTAL_READING_PAGES} approved visible pages...`);
  await ensureDirs();

  const tesseractVersion = await getTesseractVersion();
  const activePageIds = new Set(READING_ORDER.map((page) => page.pageId));
  const removedStaleOutputs = await pruneStaleOutputs(activePageIds);
  const results = [];
  const batchSize = 5; // Process 5 pages at a time to avoid memory issues

  for (let batch = 0; batch < READING_ORDER.length; batch += batchSize) {
    const batchNum = Math.floor(batch / batchSize) + 1;
    const totalBatches = Math.ceil(READING_ORDER.length / batchSize);
    const batchRecords = READING_ORDER.slice(batch, Math.min(batch + batchSize, READING_ORDER.length));
    console.log(`\nBatch ${batchNum}/${totalBatches} — visible pages ${batch + 1}-${batch + batchRecords.length}`);

    const batchResults = await Promise.all(batchRecords.map((record) => runTesseract(record)));
    results.push(...batchResults);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    console.log(`  Progress: ${successCount} success, ${failCount} fail`);

    for (const r of batchResults) {
      if (r.success) {
        console.log(`  ✅ Page ${r.pageNum}: ${r.wordCount} words, avg conf ${r.avgConfidence}, ${r.lowConfidenceWords} low-conf`);
      } else {
        console.log(`  ❌ Page ${r.pageNum}: ${r.error}`);
      }
    }
  }

  // Generate completion report
  const successPages = results.filter(r => r.success);
  const failedPages = results.filter(r => !r.success);
  const totalWords = successPages.reduce((sum, r) => sum + r.wordCount, 0);
  const avgConfAll = successPages.length > 0
    ? successPages.reduce((sum, r) => sum + r.avgConfidence, 0) / successPages.length
    : 0;
  const lowConfPages = successPages.filter(r => r.avgConfidence < LOW_CONFIDENCE_PAGE_THRESHOLD).map(r => ({
    pageId: r.pageId,
    pageNumber: pageNumberForPageId(r.pageId),
    originalPageNumber: originalPageNumberForPageId(r.pageId),
    averageConfidence: r.avgConfidence,
    lowConfWords: r.lowConfidenceWords,
  }));

  const report = {
    generatedAt: new Date().toISOString(),
    engine: tesseractVersion,
    totalPages: TOTAL_READING_PAGES,
    pagesProcessed: results.length,
    activeReadingPages: TOTAL_READING_PAGES,
    inactivePages: INACTIVE_PAGES.map((page) => ({
      pageId: page.pageId,
      sourceFile: page.sourceFile,
      duplicateOf: page.duplicateOf,
      inactiveReason: page.inactiveReason,
    })),
    successfulPages: successPages.length,
    failedPages: failedPages.length,
    totalWords: totalWords,
    averageConfidence: Math.round(avgConfAll * 10) / 10,
    lowConfidencePageThreshold: LOW_CONFIDENCE_PAGE_THRESHOLD,
    lowConfidencePages: lowConfPages,
    averageConfidenceByPage: successPages.map((r) => ({
      pageId: r.pageId,
      pageNumber: pageNumberForPageId(r.pageId),
      originalPageNumber: originalPageNumberForPageId(r.pageId),
      averageConfidence: r.avgConfidence,
    })),
    failed: failedPages.map(r => ({ pageId: r.pageId, page: r.pageNum, error: r.error })),
    removedStaleOutputs,
    structure: {
      rawTsv: "src/data/search/ocr/raw/",
      structuredJson: "src/data/search/ocr/pages/",
      corrections: "src/data/search/ocr/corrections/",
      reports: "src/data/search/ocr/reports/",
    },
  };

  const reportPath = path.join(REPORTS_DIR, "ocr-completion-report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n=== OCR COMPLETE ===`);
  console.log(`Success: ${successPages.length}/${TOTAL_READING_PAGES}`);
  console.log(`Failed: ${failedPages.length}`);
  console.log(`Total words: ${totalWords}`);
  console.log(`Average confidence: ${Math.round(avgConfAll * 10) / 10}`);
  console.log(`Low-confidence pages (<${LOW_CONFIDENCE_PAGE_THRESHOLD}% avg): ${lowConfPages.length}`);
  console.log(`Removed stale outputs: ${removedStaleOutputs.length}`);
  console.log(`Report saved: ${reportPath}`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
