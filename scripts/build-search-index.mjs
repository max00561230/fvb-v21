#!/usr/bin/env node
/**
 * Build a static search index combining OCR text, people data, and captions.
 * Outputs: src/data/search/search-index.json
 * 
 * This pre-computes the searchable text corpus so the client doesn't need
 * to load all OCR JSON files individually.
 */

import fs from "node:fs/promises";
import path from "node:path";

const OCR_DIR = path.resolve("src/data/search/ocr/pages");
const OLD_OCR_DIR = path.resolve("public/data/ocr");
const PEOPLE_PATH = path.resolve("public/data/people.json");
const PAGES_MANIFEST_PATH = path.resolve("public/data/pages.json");
const OUTPUT_DIR = path.resolve("src/data/search");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "search-index.json");
const PUBLIC_OUTPUT_PATH = path.resolve("public/data/search-index.json");

async function loadActivePagesManifest() {
  const manifest = JSON.parse(await fs.readFile(PAGES_MANIFEST_PATH, "utf-8"));
  return manifest.pages || [];
}

async function loadOcrPages(activePages) {
  const pages = [];
  
  // Try new OCR output first, fall back to old OCR
  const newDirExists = await fs.access(OCR_DIR).then(() => true).catch(() => false);
  
  if (newDirExists) {
    console.log("Loading from new TSV OCR output...");
    for (const activePage of activePages) {
      const fpath = path.join(OCR_DIR, `${activePage.id}.json`);
      try {
        const data = JSON.parse(await fs.readFile(fpath, "utf-8"));
        pages.push({
          pageNumber: activePage.pageNumber,
          readingPosition: activePage.readingPosition,
          displayNumber: activePage.displayNumber,
          originalPrintedPageNumber: activePage.originalPrintedPageNumber,
          originalPageNumber: activePage.originalPageNumber,
          pageId: activePage.pageId,
          sourceFile: activePage.sourceFile,
          text: data.cleanText || data.rawText || "",
          wordCount: data.wordCount || 0,
          averageConfidence: data.averageConfidence || 0,
        });
      } catch {
        // Skip missing pages
      }
    }
  }
  
  // Fall back to old OCR if new isn't ready yet
  if (pages.length === 0) {
    console.log("New OCR not ready, loading from existing OCR JSON...");
    for (const activePage of activePages) {
      const fpath = path.join(OLD_OCR_DIR, `${activePage.id}.json`);
      try {
        const data = JSON.parse(await fs.readFile(fpath, "utf-8"));
        pages.push({
          pageNumber: activePage.pageNumber,
          readingPosition: activePage.readingPosition,
          displayNumber: activePage.displayNumber,
          originalPrintedPageNumber: activePage.originalPrintedPageNumber,
          originalPageNumber: activePage.originalPageNumber,
          pageId: activePage.pageId,
          sourceFile: activePage.sourceFile,
          text: data.cleanedText || data.rawText || "",
          wordCount: data.wordCount || 0,
          averageConfidence: data.confidence || 0,
        });
      } catch {
        // Skip missing pages
      }
    }
  }
  
  return pages.sort((a, b) => a.readingPosition - b.readingPosition);
}

async function loadPeople() {
  try {
    const data = JSON.parse(await fs.readFile(PEOPLE_PATH, "utf-8"));
    return data.people || [];
  } catch {
    return [];
  }
}

async function main() {
  console.log("Building search index...");
  
  const activePages = await loadActivePagesManifest();
  const [ocrPages, people] = await Promise.all([loadOcrPages(activePages), loadPeople()]);
  
  // Build page entries
  const pageEntries = ocrPages.map(p => ({
    pageNumber: p.pageNumber,
    readingPosition: p.readingPosition,
    displayNumber: p.displayNumber,
    originalPrintedPageNumber: p.originalPrintedPageNumber,
    originalPageNumber: p.originalPageNumber,
    pageId: p.pageId,
    sourceFile: p.sourceFile,
    text: p.text,
    wordCount: p.wordCount,
    avgConfidence: p.averageConfidence,
  }));
  
  // Build people entries (compact - just searchable fields)
  const peopleEntries = people.map(p => ({
    id: p.id,
    fullName: p.fullName,
    firstName: p.firstName || "",
    lastName: p.lastName || "",
    nicknames: p.nicknames || [],
    birthDate: p.birthDate || "",
    deathDate: p.deathDate || "",
    occupations: p.occupations || [],
    places: p.places || [],
    churches: p.churches || [],
    schools: p.schools || [],
    militaryService: p.militaryService || [],
    businesses: p.businesses || [],
    cemeteries: p.cemeteries || [],
    pageReferences: p.pageReferences || [],
  }));
  
  // Build combined searchable text per page (OCR text + any people mentioned on that page)
  const combinedText = pageEntries.map(page => {
    const peopleOnPage = peopleEntries.filter(p => p.pageReferences.includes(page.pageNumber));
    const peopleText = peopleOnPage.map(p => 
      [p.fullName, ...p.nicknames, ...p.places, ...p.occupations].join(" ")
    ).join(" ");
    return {
      ...page,
      combinedText: `${page.text} ${peopleText}`.trim(),
    };
  });
  
  const index = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    totalPages: pageEntries.length,
    totalPeople: peopleEntries.length,
    pages: combinedText,
    people: peopleEntries,
  };
  
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(index, null, 2));
  await fs.writeFile(PUBLIC_OUTPUT_PATH, JSON.stringify(index, null, 2));
  
  console.log(`Search index built:`);
  console.log(`  Pages: ${pageEntries.length}`);
  console.log(`  People: ${peopleEntries.length}`);
  console.log(`  Output: ${OUTPUT_PATH}`);
  console.log(`  Public output: ${PUBLIC_OUTPUT_PATH}`);
  console.log(`  Size: ${(JSON.stringify(index).length / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
