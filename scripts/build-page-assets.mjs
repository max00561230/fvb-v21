import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import {
  INACTIVE_PAGES,
  READING_ORDER,
  readingOrderManifest
} from "./page-metadata.mjs";

const SOURCE = path.resolve("archive-source/original-scans");
const OUTPUT = path.resolve("public/book-pages");
const DATA = path.resolve("public/data");

const sizes = [
  ["desktop", 2400, 92],
  ["tablet", 1800, 91],
  ["mobile", 1200, 90],
  ["thumbnails", 320, 82]
];

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

async function loadSourceFilesByName() {
  try {
    const files = await fs.readdir(SOURCE);
    return new Set(files.filter((name) => /\.(png|jpe?g|tiff?)$/i.test(name)));
  } catch {
    return null;
  }
}

async function pageDimensions(masterPath) {
  const metadata = await sharp(masterPath).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Unreadable page image: ${masterPath}`);
  }
  return { width: metadata.width, height: metadata.height };
}

async function dimensionsFromExistingAssets(masterPath, desktopPath) {
  if (await fileExists(masterPath)) {
    return pageDimensions(masterPath);
  }

  return pageDimensions(desktopPath);
}

async function buildDerivatives(record, sourcePath) {
  const image = sharp(sourcePath, { failOn: "error", limitInputPixels: false });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Unreadable source image: ${record.sourceFile}`);
  }

  const masterPath = path.join(OUTPUT, "masters", `${record.pageId}.png`);
  await image.clone().png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(masterPath);

  for (const [folder, width, quality] of sizes) {
    const outDir = path.join(OUTPUT, folder);
    await ensureDir(outDir);
    await image.clone()
      .resize({
        width: Math.min(width, metadata.width),
        withoutEnlargement: true,
        fit: "inside",
        kernel: sharp.kernel.lanczos3
      })
      .webp({ quality, effort: 4, smartSubsample: true })
      .toFile(path.join(outDir, `${record.pageId}.webp`));
  }

  return { width: metadata.width, height: metadata.height };
}

function runtimePage(record, dimensions, masterExists) {
  return {
    id: record.pageId,
    pageId: record.pageId,
    readingPosition: record.readingPosition,
    displayNumber: record.displayNumber,
    originalPrintedPageNumber: record.originalPrintedPageNumber,
    sourceFile: record.sourceFile,
    pageNumber: record.displayNumber,
    originalPageNumber: record.originalPrintedPageNumber,
    duplicateOf: record.duplicateOf,
    metadataNote: record.metadataNote,
    width: dimensions.width,
    height: dimensions.height,
    masterSrc: masterExists ? `/book-pages/masters/${record.pageId}.png` : "",
    thumbnailSrc: `/book-pages/thumbnails/${record.pageId}.webp`,
    sources: {
      mobile: `/book-pages/mobile/${record.pageId}.webp`,
      tablet: `/book-pages/tablet/${record.pageId}.webp`,
      desktop: `/book-pages/desktop/${record.pageId}.webp`
    }
  };
}

function inactiveRuntimePage(record, dimensions, masterExists) {
  return {
    id: record.pageId,
    pageId: record.pageId,
    active: false,
    readingPosition: null,
    displayNumber: null,
    originalPrintedPageNumber: record.originalPrintedPageNumber,
    sourceFile: record.sourceFile,
    originalPageNumber: record.originalPrintedPageNumber,
    duplicateOf: record.duplicateOf,
    inactiveReason: record.inactiveReason,
    metadataNote: record.metadataNote,
    width: dimensions.width,
    height: dimensions.height,
    masterSrc: masterExists ? `/book-pages/masters/${record.pageId}.png` : "",
    thumbnailSrc: `/book-pages/thumbnails/${record.pageId}.webp`,
    sources: {
      mobile: `/book-pages/mobile/${record.pageId}.webp`,
      tablet: `/book-pages/tablet/${record.pageId}.webp`,
      desktop: `/book-pages/desktop/${record.pageId}.webp`
    }
  };
}

async function materializePage(record, { allowBuild }) {
  const masterPath = path.join(OUTPUT, "masters", `${record.pageId}.png`);
  const desktopPath = path.join(OUTPUT, "desktop", `${record.pageId}.webp`);
  const derivativePaths = [
    desktopPath,
    path.join(OUTPUT, "tablet", `${record.pageId}.webp`),
    path.join(OUTPUT, "mobile", `${record.pageId}.webp`),
    path.join(OUTPUT, "thumbnails", `${record.pageId}.webp`)
  ];
  const allDerivativesExist = await Promise.all(
    derivativePaths.map((assetPath) => fileExists(assetPath))
  ).then((results) => results.every(Boolean));

  if (allDerivativesExist) {
    return {
      dimensions: await dimensionsFromExistingAssets(masterPath, desktopPath),
      masterExists: await fileExists(masterPath),
      processed: false
    };
  }

  if (!allowBuild) {
    throw new Error(`Missing inactive derivatives for ${record.pageId}; source assets are preserved but inactive pages are not rebuilt as active content.`);
  }

  return { allDerivativesExist: false, masterPath, desktopPath, derivativePaths };
}

async function main() {
  await ensureDir(OUTPUT);
  await ensureDir(path.join(OUTPUT, "masters"));

  const sourceFiles = await loadSourceFilesByName();
  const pages = [];
  const inactivePages = [];
  let skipped = 0;
  let processed = 0;

  for (const record of READING_ORDER) {
    const existing = await materializePage(record, { allowBuild: true });
    let dimensions = existing.dimensions;
    let masterExists = existing.masterExists;
    if (existing.processed === false) {
      skipped += 1;
    } else {
      if (!sourceFiles) {
        throw new Error(`Missing derivatives for ${record.pageId} and source scan directory is unavailable.`);
      }
      if (!sourceFiles.has(record.sourceFile)) {
        throw new Error(`Missing source scan for ${record.pageId}: ${record.sourceFile}`);
      }
      console.log(`Processing ${record.pageId} from ${record.sourceFile}...`);
      dimensions = await buildDerivatives(record, path.join(SOURCE, record.sourceFile));
      masterExists = true;
      processed += 1;
    }

    pages.push(runtimePage(record, dimensions, masterExists));
  }

  for (const record of INACTIVE_PAGES) {
    const existing = await materializePage(record, { allowBuild: false });
    inactivePages.push(inactiveRuntimePage(record, existing.dimensions, existing.masterExists));
  }

  await ensureDir(DATA);
  await fs.writeFile(
    path.join(DATA, "reading-order.json"),
    JSON.stringify(readingOrderManifest, null, 2)
  );
  await fs.writeFile(
    path.join(DATA, "pages.json"),
    JSON.stringify({
      version: "21.2.0",
      totalPages: pages.length,
      inactivePagesCount: inactivePages.length,
      generatedAt: new Date().toISOString(),
      orderManifest: "/data/reading-order.json",
      pages,
      inactivePages
    }, null, 2)
  );
  await fs.writeFile(path.join(DATA, "hotspots.json"), JSON.stringify({ version: "21.2.0", hotspots: [] }, null, 2));
  await fs.writeFile(path.join(DATA, "transcripts.json"), JSON.stringify({ version: "21.2.0", transcripts: [] }, null, 2));

  console.log(`\nBuild complete from authoritative reading order: ${pages.length} pages.`);
  console.log(`  Inactive audit pages: ${inactivePages.length}`);
  console.log(`  Newly processed: ${processed}`);
  console.log(`  Skipped (already existed): ${skipped}`);
}

main().catch((err) => {
  console.error("BUILD FAILED:", err.message);
  process.exit(1);
});
