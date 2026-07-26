#!/usr/bin/env node
/**
 * Build a static search index combining OCR text, people data, and captions.
 * Outputs: src/data/search/search-index.json
 * 
 * This pre-computes the searchable text corpus so the client doesn't need
 * to load all 91 OCR JSON files individually.
 */

import fs from "node:fs/promises";
import path from "node:path";

const OCR_DIR = path.resolve("src/data/search/ocr/pages");
const OLD_OCR_DIR = path.resolve("public/data/ocr");
const PEOPLE_PATH = path.resolve("public/data/people.json");
const OUTPUT_DIR = path.resolve("src/data/search");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "search-index.json");

async function loadOcrPages() {
  const pages = [];
  
  // Try new OCR output first, fall back to old OCR
  const newDirExists = await fs.access(OCR_DIR).then(() => true).catch(() => false);
  
  if (newDirExists) {
    console.log("Loading from new TSV OCR output...");
    for (let i = 1; i <= 91; i++) {
      const padded = String(i).padStart(3, "0");
      const fpath = path.join(OCR_DIR, `page-${padded}.json`);
      try {
        const data = JSON.parse(await fs.readFile(fpath, "utf-8"));
        pages.push({
          pageNumber: data.pageNumber,
          pageId: data.pageId,
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
    for (let i = 1; i <= 91; i++) {
      const padded = String(i).padStart(3, "0");
      const fpath = path.join(OLD_OCR_DIR, `page-${padded}.json`);
      try {
        const data = JSON.parse(await fs.readFile(fpath, "utf-8"));
        pages.push({
          pageNumber: data.pageNumber || i,
          pageId: `page-${padded}`,
          text: data.cleanedText || data.rawText || "",
          wordCount: data.wordCount || 0,
          averageConfidence: data.confidence || 0,
        });
      } catch {
        // Skip missing pages
      }
    }
  }
  
  return pages;
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
  
  const [ocrPages, people] = await Promise.all([loadOcrPages(), loadPeople()]);
  
  // Build page entries
  const pageEntries = ocrPages.map(p => ({
    pageNumber: p.pageNumber,
    pageId: p.pageId,
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
  
  console.log(`Search index built:`);
  console.log(`  Pages: ${pageEntries.length}`);
  console.log(`  People: ${peopleEntries.length}`);
  console.log(`  Output: ${OUTPUT_PATH}`);
  console.log(`  Size: ${(JSON.stringify(index).length / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});