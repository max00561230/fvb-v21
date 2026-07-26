#!/usr/bin/env node
/**
 * Search Index Builder for FVB v21.1
 * 
 * Generates a static search index from OCR data + people data.
 * Output: public/data/search-index.json
 * 
 * Usage: node scripts/build-search-index.mjs
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..");
const OCR_DIR = join(PROJECT_ROOT, "public", "data", "ocr");
const OUTPUT_PATH = join(PROJECT_ROOT, "public", "data", "search-index.json");

function main() {
  console.log("=== FVB v21.1 Search Index Builder ===");

  // Load people data
  let people = [];
  const peoplePath = join(PROJECT_ROOT, "public", "data", "people.json");
  if (existsSync(peoplePath)) {
    const peopleData = JSON.parse(readFileSync(peoplePath, "utf-8"));
    people = peopleData.people || [];
  }

  // Load OCR data for all pages
  const ocrEntries = [];
  for (let i = 1; i <= 91; i++) {
    const padded = String(i).padStart(3, "0");
    const ocrPath = join(OCR_DIR, `page-${padded}.json`);
    if (existsSync(ocrPath)) {
      try {
        const ocr = JSON.parse(readFileSync(ocrPath, "utf-8"));
        ocrEntries.push({
          pageNumber: ocr.pageNumber,
          pageId: ocr.pageId,
          text: ocr.cleanedText || "",
        });
      } catch (e) {
        console.warn(`  ⚠ Could not parse OCR for page ${i}: ${e.message}`);
      }
    }
  }

  // Build people search entries
  const peopleEntries = people.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    firstName: p.firstName,
    lastName: p.lastName,
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

  // Build combined index
  const index = {
    version: "21.1.0",
    generatedAt: new Date().toISOString(),
    ocrEntries,
    peopleEntries,
    stats: {
      totalPages: ocrEntries.length,
      totalPeople: peopleEntries.length,
      totalWords: ocrEntries.reduce((sum, e) => sum + (e.text ? e.text.split(/\s+/).length : 0), 0),
    },
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(index));
  console.log(`Search index generated: ${OUTPUT_PATH}`);
  console.log(`  Pages: ${index.stats.totalPages}`);
  console.log(`  People: ${index.stats.totalPeople}`);
  console.log(`  Total words indexed: ${index.stats.totalWords}`);
}

main();