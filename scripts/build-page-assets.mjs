import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { originalPageNumberForPageId, pageNumberForPageId } from "./page-metadata.mjs";

const SOURCE = path.resolve("archive-source/original-scans");
const OUTPUT = path.resolve("public/book-pages");
const DATA = path.resolve("public/data");

const sizes = [
  ["desktop", 2400, 92],
  ["tablet", 1800, 91],
  ["mobile", 1200, 90],
  ["thumbnails", 320, 82]
];

function pageId(filename) {
  const match = filename.match(/page-(\d+)/i);
  if (!match) throw new Error(`Invalid page filename: ${filename}`);
  return `page-${String(Number(match[1])).padStart(3, "0")}`;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function buildPagesJsonFromDerivatives() {
  console.log("Building pages.json from existing WebP derivatives...");
  const desktopDir = path.join(OUTPUT, "desktop");
  let webpFiles = [];
  try {
    webpFiles = (await fs.readdir(desktopDir)).filter(f => f.endsWith(".webp")).sort();
  } catch {
    console.error("No source scans AND no existing WebP derivatives found. Cannot build.");
    process.exit(1);
  }

  const pages = [];
  for (const webpFile of webpFiles) {
    const match = webpFile.match(/^page-(\d{3})\.webp$/i);
    if (!match) continue;
    const num = Number(match[1]);
    const id = `page-${String(num).padStart(3, "0")}`;
    const masterExists = await fileExists(path.join(OUTPUT, "masters", `${id}.png`));

    pages.push({
      id,
      pageNumber: pageNumberForPageId(id) ?? num,
      originalPageNumber: originalPageNumberForPageId(id) ?? num,
      width: 0,
      height: 0,
      masterSrc: masterExists ? `/book-pages/masters/${id}.png` : "",
      thumbnailSrc: `/book-pages/thumbnails/${id}.webp`,
      sources: {
        mobile: `/book-pages/mobile/${id}.webp`,
        tablet: `/book-pages/tablet/${id}.webp`,
        desktop: `/book-pages/desktop/${id}.webp`
      }
    });
  }

  pages.sort((a, b) => a.pageNumber - b.pageNumber);

  await ensureDir(DATA);
  await fs.writeFile(
    path.join(DATA, "pages.json"),
    JSON.stringify({ version: "21.0.0", totalPages: pages.length, generatedAt: new Date().toISOString(), pages }, null, 2)
  );
  await fs.writeFile(path.join(DATA, "hotspots.json"), JSON.stringify({ version: "21.0.0", hotspots: [] }, null, 2));
  await fs.writeFile(path.join(DATA, "transcripts.json"), JSON.stringify({ version: "21.0.0", transcripts: [] }, null, 2));

  console.log(`\nBuild complete: ${pages.length} pages (from existing derivatives).`);
}

async function main() {
  await ensureDir(OUTPUT);
  await ensureDir(path.join(OUTPUT, "masters"));

  let files = [];
  try {
    files = (await fs.readdir(SOURCE))
      .filter((name) => /\.(png|jpe?g|tiff?)$/i.test(name))
      .sort();
  } catch {
    // Source scans not available — build from existing derivatives
    await buildPagesJsonFromDerivatives();
    return;
  }

  if (!files.length) {
    await buildPagesJsonFromDerivatives();
    return;
  }

  const pages = [];
  let skipped = 0;
  let processed = 0;

  for (const filename of files) {
    const id = pageId(filename);
    const sourcePath = path.join(SOURCE, filename);

    // Check if all derivatives already exist (resumable)
    const masterPath = path.join(OUTPUT, "masters", `${id}.png`);
    const desktopPath = path.join(OUTPUT, "desktop", `${id}.webp`);
    const tabletPath = path.join(OUTPUT, "tablet", `${id}.webp`);
    const mobilePath = path.join(OUTPUT, "mobile", `${id}.webp`);
    const thumbPath = path.join(OUTPUT, "thumbnails", `${id}.webp`);

    const allExist = await Promise.all([
      fileExists(masterPath), fileExists(desktopPath), fileExists(tabletPath),
      fileExists(mobilePath), fileExists(thumbPath)
    ]).then(results => results.every(r => r));

    if (allExist) {
      const metadata = await sharp(masterPath).metadata();
      const number = pageNumberForPageId(id) ?? Number(id.split("-")[1]);
      pages.push({
        id,
        pageNumber: number,
        originalPageNumber: originalPageNumberForPageId(id) ?? Number(id.split("-")[1]),
        width: metadata.width,
        height: metadata.height,
        masterSrc: `/book-pages/masters/${id}.png`,
        thumbnailSrc: `/book-pages/thumbnails/${id}.webp`,
        sources: {
          mobile: `/book-pages/mobile/${id}.webp`,
          tablet: `/book-pages/tablet/${id}.webp`,
          desktop: `/book-pages/desktop/${id}.webp`
        }
      });
      skipped++;
      continue;
    }

    console.log(`Processing ${id}...`);

    const image = sharp(sourcePath, { failOn: "error", limitInputPixels: false });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error(`Unreadable page: ${filename}`);
    }

    await image.clone().png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(masterPath);

    for (const [folder, width, quality] of sizes) {
      const outDir = path.join(OUTPUT, folder);
      await ensureDir(outDir);
      await image.clone()
        .resize({ width: Math.min(width, metadata.width), withoutEnlargement: true, fit: "inside", kernel: sharp.kernel.lanczos3 })
        .webp({ quality, effort: 4, smartSubsample: true })
        .toFile(path.join(outDir, `${id}.webp`));
    }

    const number = pageNumberForPageId(id) ?? Number(id.split("-")[1]);
    pages.push({
      id,
      pageNumber: number,
      originalPageNumber: originalPageNumberForPageId(id) ?? Number(id.split("-")[1]),
      width: metadata.width,
      height: metadata.height,
      masterSrc: `/book-pages/masters/${id}.png`,
      thumbnailSrc: `/book-pages/thumbnails/${id}.webp`,
      sources: {
        mobile: `/book-pages/mobile/${id}.webp`,
        tablet: `/book-pages/tablet/${id}.webp`,
        desktop: `/book-pages/desktop/${id}.webp`
      }
    });
    processed++;
  }

  pages.sort((a, b) => a.pageNumber - b.pageNumber);

  await ensureDir(DATA);
  await fs.writeFile(
    path.join(DATA, "pages.json"),
    JSON.stringify({ version: "21.0.0", totalPages: pages.length, generatedAt: new Date().toISOString(), pages }, null, 2)
  );
  await fs.writeFile(path.join(DATA, "hotspots.json"), JSON.stringify({ version: "21.0.0", hotspots: [] }, null, 2));
  await fs.writeFile(path.join(DATA, "transcripts.json"), JSON.stringify({ version: "21.0.0", transcripts: [] }, null, 2));

  console.log(`\nBuild complete: ${pages.length} pages total.`);
  console.log(`  Newly processed: ${processed}`);
  console.log(`  Skipped (already existed): ${skipped}`);
}

main().catch((err) => {
  console.error("BUILD FAILED:", err.message);
  process.exit(1);
});
