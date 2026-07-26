#!/usr/bin/env node
/**
 * Re-run Tesseract with full TSV output for all 91 pages.
 * Generates structured JSON per Tony's spec:
 *   src/data/search/ocr/raw/    — raw TSV files
 *   src/data/search/ocr/pages/   — structured JSON per page
 *   src/data/search/ocr/reports/ — completion report
 *
 * Each page JSON has: pageId, pageNumber, sourceImage, rawText, cleanText,
 *   averageConfidence, reviewStatus, words[] with text/confidence/x/y/w/h/block/paragraph/line/word
 *
 * Usage: node scripts/run-tsv-ocr.mjs
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { metadataForPageId } from "./page-metadata.mjs";

const execFileAsync = promisify(execFile);

const MASTERS_DIR = path.resolve("public/book-pages/masters");
const RAW_DIR = path.resolve("src/data/search/ocr/raw");
const PAGES_DIR = path.resolve("src/data/search/ocr/pages");
const REPORTS_DIR = path.resolve("src/data/search/ocr/reports");
const OLD_OCR_DIR = path.resolve("public/data/ocr");

const TOTAL_PAGES = 91;

async function ensureDirs() {
  for (const dir of [RAW_DIR, PAGES_DIR, REPORTS_DIR]) {
    await fs.mkdir(dir, { recursive: true });
  }
}

function pad3(n) {
  return String(n).padStart(3, "0");
}

async function runTesseract(pageNum) {
  const padded = pad3(pageNum);
  const imgPath = path.join(MASTERS_DIR, `page-${padded}.png`);
  const tsvPath = path.join(RAW_DIR, `page-${padded}.tsv`);

  try {
    await fs.access(imgPath);
  } catch {
    return { pageNum, success: false, error: `Image not found: ${imgPath}` };
  }

  try {
    // Run tesseract with TSV output
    await execFileAsync("tesseract", [imgPath, tsvPath.replace(/\.tsv$/, ""), "tsv"], {
      timeout: 120000, // 2 min per page max
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
    });
  } catch (err) {
    return { pageNum, success: false, error: `Tesseract failed: ${err.message}` };
  }

  // Parse TSV
  try {
    const tsvContent = await fs.readFile(tsvPath, "utf-8");
    const jsonData = parseTsv(tsvContent, pageNum);

    // Write structured JSON
    const jsonPath = path.join(PAGES_DIR, `page-${padded}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(jsonData, null, 2));

    return {
      pageNum,
      success: true,
      wordCount: jsonData.words.length,
      avgConfidence: jsonData.averageConfidence,
      lowConfidenceWords: jsonData.words.filter(w => w.confidence < 60).length,
    };
  } catch (err) {
    return { pageNum, success: false, error: `TSV parse failed: ${err.message}` };
  }
}

function parseTsv(tsvContent, pageNum) {
  const lines = tsvContent.trim().split("\n");
  const headers = lines[0].split("\t");

  // Tesseract TSV columns: level page_num block_num par_num line_num word_num left top width height conf text
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
    const text = cols[11] || "";

    // Only word-level entries (level 5) have text
    if (level === 5 && text.trim()) {
      const wordConf = conf; // Tesseract conf is 0-100, -1 for no text
      if (wordConf >= 0) {
        totalConf += wordConf;
        wordCount++;
        if (wordConf < 60) lowConfCount++;
      }

      words.push({
        text: text,
        confidence: wordConf,
        x: left,
        y: top,
        width: width,
        height: height,
        block: block,
        paragraph: par,
        line: line,
        word: word,
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

  const pageId = `page-${pad3(pageNum)}`;

  return {
    pageId,
    pageNumber: pageNum,
    ...metadataForPageId(pageId),
    sourceImage: `page-${pad3(pageNum)}.png`,
    rawText: rawText,
    cleanText: cleanText,
    averageConfidence: Math.round(avgConf * 10) / 10,
    wordCount: wordCount,
    lowConfidenceWords: lowConfCount,
    reviewStatus: "machine-generated",
    words: words,
  };
}

async function main() {
  console.log(`Starting TSV OCR run for ${TOTAL_PAGES} pages...`);
  await ensureDirs();

  const results = [];
  const batchSize = 5; // Process 5 pages at a time to avoid memory issues

  for (let batch = 0; batch < TOTAL_PAGES; batch += batchSize) {
    const batchNum = Math.floor(batch / batchSize) + 1;
    const totalBatches = Math.ceil(TOTAL_PAGES / batchSize);
    console.log(`\nBatch ${batchNum}/${totalBatches} — pages ${batch + 1}-${Math.min(batch + batchSize, TOTAL_PAGES)}`);

    const batchPromises = [];
    for (let i = batch; i < Math.min(batch + batchSize, TOTAL_PAGES); i++) {
      batchPromises.push(runTesseract(i + 1));
    }
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Progress report
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
  const lowConfPages = successPages.filter(r => r.lowConfidenceWords > 10).map(r => ({
    page: r.pageNum,
    lowConfWords: r.lowConfidenceWords,
  }));

  const report = {
    generatedAt: new Date().toISOString(),
    engine: "Tesseract 5.5.2",
    totalPages: TOTAL_PAGES,
    successfulPages: successPages.length,
    failedPages: failedPages.length,
    totalWords: totalWords,
    averageConfidence: Math.round(avgConfAll * 10) / 10,
    lowConfidencePages: lowConfPages,
    failed: failedPages.map(r => ({ page: r.pageNum, error: r.error })),
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
  console.log(`Success: ${successPages.length}/${TOTAL_PAGES}`);
  console.log(`Failed: ${failedPages.length}`);
  console.log(`Total words: ${totalWords}`);
  console.log(`Average confidence: ${Math.round(avgConfAll * 10) / 10}`);
  console.log(`Low-confidence pages (>10 words <60%): ${lowConfPages.length}`);
  console.log(`Report saved: ${reportPath}`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
