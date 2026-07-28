# Phase 1B Photo Restoration QA

Generated: 2026-07-28T04:42:00Z

## Runtime Preflight

- Baseline checkpoint: `804f30c26110581d2f61c894904c022e2c463405` (`Fix Phase 1A data page scrolling`).
- Initial git state had untracked `.herenow/` and `qa/scroll-layout/`; those were left untouched.
- Local preview routes used only:
  - Enabled workspace: `VITE_ENABLE_RESTORATION_TOOLS=true npm run dev -- --host 127.0.0.1 --port 5173`
  - Protected route check: `VITE_ENABLE_RESTORATION_TOOLS=false npm run dev -- --mode production --host 127.0.0.1 --port 5174`

## Checks

- `npm run validate:pages`: passed, 90 pages, 0 errors, 0 warnings.
- `npm run build`: passed.
- `git diff --check`: passed.

## Browser QA

- `/admin/photo-restoration` desktop: private workspace rendered with 90-page manifest checkpoints, page selector in manifest order, editable JSON preview, locked original canvas background, local save/export controls.
- `/admin/photo-restoration` mobile: workspace rendered responsively with manifest checkpoints and no public navigation link to the tool.
- Route protection: `/admin/photo-restoration` with `VITE_ENABLE_RESTORATION_TOOLS=false` rendered the placeholder instead of the editor.
- Public reader page 89: DOM verified `Page 89 of 90` uses `/book-pages/*/page-002.webp`.
- Public search and people routes rendered after the restoration changes.

## Screenshots

- `admin-desktop.png`
- `admin-mobile.png`
- `public-reader-page-89-mobile.png`
- `public-search-desktop.png`
- `public-people-desktop.png`
- `route-protection-placeholder.png`

## Production Boundary

No public reader page replacement, publication, production alias, or production deploy was performed. The tool only prepares approved export ZIP packages.
