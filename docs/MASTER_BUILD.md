# FVB v21 — OPENCLAW MASTER BUILD FILE

## Objective

Build the Family Virtual Book as a pixel-preserving digital archive. Each historical page must be displayed as one flattened image. Interactive functions must be overlays or side panels and must never reconstruct or alter the page.

## Non-negotiable rules

- Preserve all original photographs and text exactly.
- Never generate, redraw, enhance, replace, rotate, or reinterpret faces.
- Never rebuild historical pages from HTML text blocks.
- Never expose draft captions, debug labels, editor controls, or experimental layouts.
- Use lossless master page images as the archival source.
- Generate smaller WebP display copies for phones, tablets, desktops, Retina screens, and 4K displays.
- Use the lossless master only when the user enters zoom mode.
- Keep all future features separate from the permanent page image.

## Technology

Use React, TypeScript, Vite, Sharp, OpenSeadragon, Fuse.js, vite-plugin-pwa, and Vercel.

```bash
npm install react react-dom openseadragon fuse.js
npm install -D typescript vite @vitejs/plugin-react sharp vite-plugin-pwa
```

## Project structure

```text
FVB-v21/
  source/master-pages/page-001.png
  source/master-pages/page-002.png
  public/pages/page-001/master.png
  public/pages/page-001/2400.webp
  public/pages/page-001/1800.webp
  public/pages/page-001/1200.webp
  public/pages/page-001/800.webp
  public/pages/page-001/thumb.webp
  public/data/pages.json
  public/data/hotspots.json
  public/data/transcripts.json
  scripts/build-page-assets.mjs
  scripts/validate-pages.mjs
  src/components/BookViewer.tsx
  src/components/ResponsivePageImage.tsx
  src/components/ZoomPageViewer.tsx
  src/components/HotspotLayer.tsx
  src/hooks/useBookPage.ts
  src/hooks/useBookmarks.ts
  src/styles.css
  src/App.tsx
  src/main.tsx
  vite.config.ts
  vercel.json
```

## package.json

```json
{
  "name": "fvb-v21",
  "private": true,
  "version": "21.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build:assets": "node scripts/build-page-assets.mjs",
    "validate:pages": "node scripts/validate-pages.mjs",
    "prebuild": "npm run build:assets && npm run validate:pages",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "fuse.js": "^7.0.0",
    "openseadragon": "^5.0.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.0",
    "sharp": "^0.34.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vite-plugin-pwa": "^0.21.0"
  }
}
```

## Image pipeline

Place the best restored page files in `source/master-pages`. Use sequential names such as `page-001.png`. Do not resize masters before processing.

Create `scripts/build-page-assets.mjs`:

```js
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

const SOURCE = path.resolve("source/master-pages");
const OUTPUT = path.resolve("public/pages");
const DATA = path.resolve("public/data");

const sizes = [
  ["2400", 2400, 92],
  ["1800", 1800, 91],
  ["1200", 1200, 90],
  ["800", 800, 88],
  ["thumb", 320, 82]
];

function pageId(filename) {
  const match = filename.match(/page-(\d+)/i);
  if (!match) throw new Error(`Invalid page filename: ${filename}`);
  return `page-${String(Number(match[1])).padStart(3, "0")}`;
}

await fs.mkdir(OUTPUT, { recursive: true });
await fs.mkdir(DATA, { recursive: true });

const files = (await fs.readdir(SOURCE))
  .filter((name) => /\.(png|jpe?g|tiff?)$/i.test(name))
  .sort();

if (!files.length) throw new Error("No master page files found.");

const pages = [];

for (const filename of files) {
  const id = pageId(filename);
  const sourcePath = path.join(SOURCE, filename);
  const pageDir = path.join(OUTPUT, id);
  await fs.mkdir(pageDir, { recursive: true });

  const image = sharp(sourcePath, {
    failOn: "error",
    limitInputPixels: false
  });

  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Unreadable page: ${filename}`);
  }

  await image.clone().png({
    compressionLevel: 9,
    adaptiveFiltering: true
  }).toFile(path.join(pageDir, "master.png"));

  for (const [name, width, quality] of sizes) {
    await image.clone()
      .resize({
        width: Math.min(width, metadata.width),
        withoutEnlargement: true,
        fit: "inside",
        kernel: sharp.kernel.lanczos3
      })
      .webp({
        quality,
        effort: 6,
        smartSubsample: true
      })
      .toFile(path.join(pageDir, `${name}.webp`));
  }

  const number = Number(id.split("-")[1]);

  pages.push({
    id,
    pageNumber: number,
    width: metadata.width,
    height: metadata.height,
    masterSrc: `/pages/${id}/master.png`,
    thumbnailSrc: `/pages/${id}/thumb.webp`,
    sources: {
      800: `/pages/${id}/800.webp`,
      1200: `/pages/${id}/1200.webp`,
      1800: `/pages/${id}/1800.webp`,
      2400: `/pages/${id}/2400.webp`
    }
  });
}

pages.sort((a, b) => a.pageNumber - b.pageNumber);

await fs.writeFile(
  path.join(DATA, "pages.json"),
  JSON.stringify({
    version: "21.0.0",
    totalPages: pages.length,
    generatedAt: new Date().toISOString(),
    pages
  }, null, 2)
);

console.log(`Built ${pages.length} pages.`);
```

## Page validation

Create `scripts/validate-pages.mjs`:

```js
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const dir = path.resolve("source/master-pages");
const files = (await fs.readdir(dir))
  .filter((name) => /\.(png|jpe?g|tiff?)$/i.test(name))
  .sort();

if (!files.length) throw new Error("No page files found.");

for (let index = 0; index < files.length; index += 1) {
  const filename = files[index];
  const match = filename.match(/^page-(\d{3})\.(png|jpe?g|tiff?)$/i);

  if (!match) {
    throw new Error(`Invalid name: ${filename}`);
  }

  const expected = index + 1;
  const actual = Number(match[1]);

  if (actual !== expected) {
    throw new Error(`Expected page ${expected}; found page ${actual}.`);
  }

  const metadata = await sharp(path.join(dir, filename)).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Unreadable image: ${filename}`);
  }

  if (metadata.width < 1000 || metadata.height < 1000) {
    console.warn(
      `${filename} is relatively low resolution: ` +
      `${metadata.width} × ${metadata.height}`
    );
  }
}

console.log(`Validated ${files.length} pages.`);
```

## Types

Create `src/types.ts`:

```ts
export interface BookPage {
  id: string;
  pageNumber: number;
  width: number;
  height: number;
  masterSrc: string;
  thumbnailSrc: string;
  sources: {
    800: string;
    1200: string;
    1800: string;
    2400: string;
  };
}

export interface PagesManifest {
  version: string;
  totalPages: number;
  generatedAt: string;
  pages: BookPage[];
}

export interface PageHotspot {
  id: string;
  pageNumber: number;
  type:
    | "biography"
    | "family-tree"
    | "audio"
    | "document"
    | "map"
    | "timeline"
    | "note";
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  title?: string;
  content?: string;
  target?: string;
  audioSrc?: string;
}
```

## Responsive page image

Create `src/components/ResponsivePageImage.tsx`:

```tsx
import type { BookPage } from "../types";

export function ResponsivePageImage({
  page,
  priority = false
}: {
  page: BookPage;
  priority?: boolean;
}) {
  return (
    <picture>
      <source
        media="(min-width: 1800px)"
        srcSet={page.sources[2400]}
        type="image/webp"
      />
      <source
        media="(min-width: 1200px)"
        srcSet={page.sources[1800]}
        type="image/webp"
      />
      <source
        media="(min-width: 700px)"
        srcSet={page.sources[1200]}
        type="image/webp"
      />
      <img
        src={page.sources[800]}
        srcSet={[
          `${page.sources[800]} 800w`,
          `${page.sources[1200]} 1200w`,
          `${page.sources[1800]} 1800w`,
          `${page.sources[2400]} 2400w`
        ].join(", ")}
        sizes="(max-width: 699px) 100vw, (max-width: 1199px) 90vw, 1100px"
        width={page.width}
        height={page.height}
        alt={`Family heritage book page ${page.pageNumber}`}
        className="page-image"
        draggable={false}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
    </picture>
  );
}
```

## High-resolution zoom

Create `src/components/ZoomPageViewer.tsx`:

```tsx
import { useEffect, useRef } from "react";
import OpenSeadragon from "openseadragon";
import type { BookPage } from "../types";

export function ZoomPageViewer({ page }: { page: BookPage }) {
  const target = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!target.current) return;

    const viewer = OpenSeadragon({
      element: target.current,
      prefixUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/5.0.1/images/",
      tileSources: {
        type: "image",
        url: page.masterSrc
      },
      showNavigator: true,
      showNavigationControl: false,
      animationTime: 0.8,
      constrainDuringPan: true,
      visibilityRatio: 0.7,
      minZoomImageRatio: 0.85,
      maxZoomPixelRatio: 3,
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: true,
        scrollToZoom: true
      },
      gestureSettingsTouch: {
        pinchToZoom: true,
        flickEnabled: true,
        clickToZoom: false,
        dblClickToZoom: true
      }
    });

    return () => viewer.destroy();
  }, [page.masterSrc]);

  return (
    <div
      ref={target}
      className="zoom-viewer"
      aria-label={`Zoomable page ${page.pageNumber}`}
    />
  );
}
```

## URL page routing

Create `src/hooks/useBookPage.ts`:

```ts
import { useCallback, useEffect, useState } from "react";

function readPage(total: number) {
  const value = Number(
    new URL(window.location.href).searchParams.get("page")
  );

  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(total, Math.floor(value)));
}

export function useBookPage(totalPages: number) {
  const [pageNumber, setState] = useState(() => readPage(totalPages));

  const setPageNumber = useCallback(
    (next: number) => {
      const safe = Math.max(1, Math.min(totalPages, next));
      setState(safe);

      const url = new URL(window.location.href);
      url.searchParams.set("page", String(safe));
      window.history.pushState({}, "", url);
    },
    [totalPages]
  );

  useEffect(() => {
    const handler = () => setState(readPage(totalPages));
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [totalPages]);

  return { pageNumber, setPageNumber };
}
```

## Bookmarks

Create `src/hooks/useBookmarks.ts`:

```ts
import { useEffect, useState } from "react";

const KEY = "fvb-v21-bookmarks";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(bookmarks));
  }, [bookmarks]);

  function toggle(page: number) {
    setBookmarks((current) =>
      current.includes(page)
        ? current.filter((item) => item !== page)
        : [...current, page].sort((a, b) => a - b)
    );
  }

  return {
    bookmarks,
    toggle,
    isBookmarked: (page: number) => bookmarks.includes(page)
  };
}
```

## Hotspots

Coordinates must be percentages from 0 through 100. Create `public/data/hotspots.json`:

```json
{
  "version": "21.0.0",
  "hotspots": [
    {
      "id": "page-006-james",
      "pageNumber": 6,
      "type": "biography",
      "x": 16.5,
      "y": 7.2,
      "width": 39.7,
      "height": 45,
      "label": "Open James Henry Francis biography",
      "title": "James Henry Francis",
      "content": ""
    }
  ]
}
```

Create `src/components/HotspotLayer.tsx`:

```tsx
import type { PageHotspot } from "../types";

export function HotspotLayer({
  hotspots,
  visible,
  onActivate
}: {
  hotspots: PageHotspot[];
  visible: boolean;
  onActivate: (hotspot: PageHotspot) => void;
}) {
  return (
    <div className="hotspot-layer">
      {hotspots.map((hotspot) => (
        <button
          key={hotspot.id}
          type="button"
          className={
            visible
              ? "page-hotspot page-hotspot--visible"
              : "page-hotspot"
          }
          style={{
            left: `${hotspot.x}%`,
            top: `${hotspot.y}%`,
            width: `${hotspot.width}%`,
            height: `${hotspot.height}%`
          }}
          aria-label={hotspot.label}
          onClick={() => onActivate(hotspot)}
        />
      ))}
    </div>
  );
}
```

## Main viewer

Create `src/components/BookViewer.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import type {
  PageHotspot,
  PagesManifest
} from "../types";
import { useBookPage } from "../hooks/useBookPage";
import { useBookmarks } from "../hooks/useBookmarks";
import { ResponsivePageImage } from "./ResponsivePageImage";
import { ZoomPageViewer } from "./ZoomPageViewer";
import { HotspotLayer } from "./HotspotLayer";

export function BookViewer() {
  const [manifest, setManifest] =
    useState<PagesManifest | null>(null);
  const [hotspots, setHotspots] = useState<PageHotspot[]>([]);
  const [zoom, setZoom] = useState(false);
  const [showAreas, setShowAreas] = useState(false);
  const [active, setActive] = useState<PageHotspot | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/data/pages.json").then((response) => response.json()),
      fetch("/data/hotspots.json")
        .then((response) => response.ok
          ? response.json()
          : { hotspots: [] })
    ]).then(([pageData, hotspotData]) => {
      setManifest(pageData);
      setHotspots(hotspotData.hotspots ?? []);
    });
  }, []);

  const total = manifest?.totalPages ?? 1;
  const { pageNumber, setPageNumber } = useBookPage(total);
  const bookmarks = useBookmarks();

  const page = manifest?.pages.find(
    (item) => item.pageNumber === pageNumber
  );

  const currentHotspots = useMemo(
    () => hotspots.filter(
      (item) => item.pageNumber === pageNumber
    ),
    [hotspots, pageNumber]
  );

  if (!manifest || !page) {
    return <main className="loading">Loading book…</main>;
  }

  async function fullscreen() {
    const shell = document.querySelector(".book-shell");
    if (!(shell instanceof HTMLElement)) return;

    if (!document.fullscreenElement) {
      await shell.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  }

  return (
    <main className="book-shell">
      <header className="book-header">
        <div>
          <small>Family Heritage Archive</small>
          <h1>Celebrating the Francis Family</h1>
        </div>
      </header>

      <nav className="toolbar">
        <button
          onClick={() => setPageNumber(pageNumber - 1)}
          disabled={pageNumber === 1}
        >
          Previous
        </button>

        <strong>Page {pageNumber} of {total}</strong>

        <button
          onClick={() => setPageNumber(pageNumber + 1)}
          disabled={pageNumber === total}
        >
          Next
        </button>

        <button onClick={() => setZoom((value) => !value)}>
          {zoom ? "Fit Page" : "Zoom"}
        </button>

        <button onClick={() => bookmarks.toggle(pageNumber)}>
          {bookmarks.isBookmarked(pageNumber)
            ? "Remove Bookmark"
            : "Bookmark"}
        </button>

        <button onClick={() => setShowAreas((value) => !value)}>
          {showAreas ? "Hide Links" : "Show Links"}
        </button>

        <button onClick={fullscreen}>Fullscreen</button>
      </nav>

      <section className="page-stage">
        {zoom ? (
          <ZoomPageViewer page={page} />
        ) : (
          <div
            className="page-wrapper"
            style={{ aspectRatio: `${page.width}/${page.height}` }}
          >
            <ResponsivePageImage page={page} priority />

            <HotspotLayer
              hotspots={currentHotspots}
              visible={showAreas}
              onActivate={setActive}
            />
          </div>
        )}
      </section>

      <nav className="mobile-controls">
        <button
          onClick={() => setPageNumber(pageNumber - 1)}
          disabled={pageNumber === 1}
        >
          Previous
        </button>

        <strong>{pageNumber} / {total}</strong>

        <button
          onClick={() => setPageNumber(pageNumber + 1)}
          disabled={pageNumber === total}
        >
          Next
        </button>
      </nav>

      {active && (
        <div className="modal-backdrop" onClick={() => setActive(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <button onClick={() => setActive(null)}>Close</button>
            <h2>{active.title ?? active.label}</h2>
            {active.content && <p>{active.content}</p>}
            {active.audioSrc && (
              <audio controls src={active.audioSrc} />
            )}
            {active.target && (
              <a href={active.target}>Open related information</a>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
```

## App entry

```tsx
// src/App.tsx
import { BookViewer } from "./components/BookViewer";
import "./styles.css";

export default function App() {
  return <BookViewer />;
}
```

```tsx
// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Root not found.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

## Core CSS

Create `src/styles.css`:

```css
:root {
  font-family: Inter, system-ui, sans-serif;
  --wine: #6c1727;
  --gold: #caa24b;
  --cream: #f7f0df;
  --paper: #fffdf7;
}

* { box-sizing: border-box; }

html, body, #root {
  min-height: 100%;
  margin: 0;
}

body {
  min-width: 320px;
  background: var(--cream);
}

button {
  min-height: 44px;
  padding: .65rem .9rem;
  border: 1px solid rgba(70, 45, 25, .25);
  border-radius: 10px;
  background: var(--paper);
}

.book-shell {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
}

.book-header {
  padding: 1rem clamp(1rem, 4vw, 3rem);
  color: white;
  background: linear-gradient(135deg, #42101a, var(--wine));
  border-bottom: 4px solid var(--gold);
}

.book-header h1 { margin: .2rem 0 0; }

.toolbar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: .55rem;
  flex-wrap: wrap;
  padding: .7rem;
  background: rgba(255, 253, 247, .96);
}

.page-stage {
  display: grid;
  place-items: center;
  min-height: 0;
  padding: clamp(.4rem, 2vw, 1.5rem);
  overflow: hidden;
}

.page-wrapper {
  position: relative;
  width: min(100%, 1100px);
  max-height: calc(100vh - 185px);
}

.page-image {
  display: block;
  width: 100%;
  height: 100%;
  max-height: calc(100vh - 185px);
  object-fit: contain;
  background: white;
  box-shadow: 0 18px 50px rgba(39, 25, 15, .2);
  user-select: none;
}

.zoom-viewer {
  width: min(100%, 1500px);
  height: calc(100vh - 185px);
  min-height: 450px;
  background: #201b18;
}

.hotspot-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.page-hotspot {
  position: absolute;
  min-height: 0;
  padding: 0;
  border: 2px solid transparent;
  background: transparent;
  pointer-events: auto;
}

.page-hotspot--visible {
  border-color: var(--gold);
  background: rgba(255, 226, 137, .18);
}

.mobile-controls { display: none; }

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(22, 14, 9, .72);
}

.modal {
  width: min(100%, 600px);
  padding: 1.25rem;
  border: 3px solid var(--gold);
  border-radius: 18px;
  background: var(--paper);
}

.loading {
  min-height: 100vh;
  display: grid;
  place-items: center;
}

@media (max-width: 760px) {
  .toolbar { display: none; }

  .book-header {
    padding: .7rem 1rem;
  }

  .page-stage { padding: .3rem; }

  .page-wrapper,
  .page-image {
    max-height: calc(100vh - 140px);
  }

  .zoom-viewer {
    width: 100%;
    height: calc(100vh - 140px);
    min-height: 360px;
  }

  .mobile-controls {
    position: sticky;
    bottom: 0;
    z-index: 40;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: .6rem;
    padding: .65rem;
    padding-bottom: calc(.65rem + env(safe-area-inset-bottom));
    color: white;
    background: var(--wine);
    border-top: 3px solid var(--gold);
  }
}
```

## PWA configuration

Create `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Family Virtual Book",
        short_name: "FVB v21",
        theme_color: "#6c1727",
        background_color: "#f7f0df",
        display: "standalone",
        start_url: "/?page=1",
        scope: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,json,webmanifest}"],
        globIgnores: ["pages/**/master.png"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/pages/"),
            handler: "CacheFirst",
            options: {
              cacheName: "fvb-v21-pages",
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 2592000
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
});
```

## Vercel

Create `vercel.json`:

```json
{
  "version": 2,
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/pages/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/data/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=300, must-revalidate"
        }
      ]
    }
  ]
}
```

## OCR and search metadata

OCR must be search metadata only. Do not print OCR text over the page.

Example `public/data/transcripts.json`:

```json
{
  "version": "21.0.0",
  "pages": [
    {
      "pageNumber": 6,
      "text": "James Henry Francis Born March 20 1886 Died April 16 1973 Pearl Martha Ann Clanton Francis Born May 8 1890 Died December 25 1978."
    }
  ]
}
```

Search flow:

1. Search transcript JSON.
2. Show matching page numbers.
3. Open the original flattened page.
4. Optionally display temporary highlight overlays.
5. Never modify the source page.

## Performance requirements

- Load only the current full page.
- Preload only the next page's 1200-pixel WebP.
- Lazy-load thumbnails.
- Never preload every master PNG.
- Never embed page images as base64.
- Keep page assets outside the JavaScript bundle.
- Never enlarge a source image beyond its original dimensions.
- Use immutable caching for generated page assets.
- Change asset filenames or cache version when a page changes.

## Page 6 lock

Page 6 must use the approved flattened restored page image placed at:

```text
source/master-pages/page-006.png
```

It must never use:

- the old Page006 scrapbook component
- separate James and Pearl image blocks
- generated photographs
- editable captions
- rotated CSS
- draft metadata
- the old experimental renderer

## Remove legacy renderers

Search for and disable:

```text
Visible Caption Draft
captionDraft
draftCaption
scrapbook-diagonal
portrait-pair
legacyPageRenderer
experimentalPageRenderer
rotation classes
debug blocks
old Page006 implementation
```

Do not merely hide these with CSS. The public reader must not execute them.

The editor, when retained, must be isolated under `/admin`. The public book must run under `/`.

## Build

```bash
npm install
npm run build:assets
npm run validate:pages
npm run build
npm run preview
```

Test:

```text
/?page=1
/?page=6
/?page=20
/?page=91
```

Deploy:

```bash
vercel --prod
```

Vercel settings:

```text
Framework: Vite
Build command: npm run build
Output directory: dist
Install command: npm install
```

## Required verification

OpenClaw must verify:

- all page files were processed
- page numbering is sequential
- page 6 is the approved flattened page
- no generated faces appear
- no draft labels appear
- desktop navigation works
- iPhone Safari layout works
- portrait and landscape work
- pinch zoom works
- browser back restores the previous page
- PWA reload displays v21 rather than an old cache
- bookmarks persist locally
- direct links such as `?page=6` work

## Completion report

Do not claim completion until deployed. Return:

1. live Vercel URL
2. Git commit hash
3. number of pages processed
4. desktop screenshot
5. iPhone screenshot
6. Page 6 screenshot
7. confirmation that legacy public renderers were disabled
8. confirmation that no generative image processing was used

## Final instruction

Do not redesign the book and do not improvise.

The flattened historical page is the permanent visual truth. Zoom, search, biographies, audio, family-tree links, maps, notes, bookmarks, and transcripts must be implemented above the image or beside it without modifying the image.
