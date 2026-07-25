import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const dir = path.resolve("archive-source/original-scans");
let files = [];
try {
  files = (await fs.readdir(dir))
    .filter((name) => /\.(png|jpe?g|tiff?)$/i.test(name))
    .sort();
} catch {
  console.log("No archive-source/original-scans/ found — skipping validation (pre-built derivatives assumed).");
  process.exit(0);
}

if (!files.length) throw new Error("No page files found in archive-source/original-scans/");

let errors = 0;
let warnings = 0;

for (let index = 0; index < files.length; index += 1) {
  const filename = files[index];
  const match = filename.match(/^page-(\d{2,3})\.(png|jpe?g|tiff?)$/i);

  if (!match) {
    console.error(`ERROR: Invalid filename: ${filename} (expected page-NN.png or page-NNN.png)`);
    errors += 1;
    continue;
  }

  const expected = index + 1;
  const actual = Number(match[1]);

  if (actual !== expected) {
    console.error(`ERROR: Expected page ${expected}; found page ${actual} (${filename}).`);
    errors += 1;
    continue;
  }

  const metadata = await sharp(path.join(dir, filename)).metadata();

  if (!metadata.width || !metadata.height) {
    console.error(`ERROR: Unreadable image: ${filename}`);
    errors += 1;
    continue;
  }

  if (metadata.width < 1000 || metadata.height < 1000) {
    console.warn(`WARN: ${filename} is low resolution: ${metadata.width} × ${metadata.height}`);
    warnings += 1;
  }

  console.log(`OK: ${filename} — ${metadata.width} × ${metadata.height}`);
}

console.log(`\nValidation complete: ${files.length} pages, ${errors} errors, ${warnings} warnings.`);

if (errors > 0) {
  console.error("VALIDATION FAILED — fix errors before building.");
  process.exit(1);
} else {
  console.log("VALIDATION PASSED ✅");
}