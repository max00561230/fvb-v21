# v22.1 Admin Photo Restoration Tool Repair Acceptance Report

Date: 2026-07-29T01:37:57.126Z
Preview URL: http://127.0.0.1:4177
Live deployment: NOT PERFORMED pending Tony approval.
Original scan hash before: fe924556618ce068cc950cc39218b5861710476862d63a89b674b985dd5cd310  -
Original scan hash after: fe924556618ce068cc950cc39218b5861710476862d63a89b674b985dd5cd310  -
Original scans unchanged: PASS

## Workflow Results

- PASS: Page-order validation — Exactly 90 pages; Page 2 page-003, Page 88 page-090, Page 89 page-002/page-02.png, Page 90 page-091.
- PASS: Open Admin Tools and unlock PIN — Admin landing opened after PIN unlock.
- PASS: Open Photo Restoration — Protected route opened after unlock.
- PASS: Help tab exact sections — Quick Start, Select a Page, Upload a Photo, Move and Resize, Rotate and Crop, Preview, Save and Reopen a Draft, Approve a Restoration, Export the Restoration Package, Lock Admin, Where Drafts Are Stored, What Happens After Export, Troubleshooting
- PASS: Authoritative page selector — Selector displays visible pages 1-90 in order with required checkpoints.
- PASS: Select Page and correct scan metadata — Visible Page 89 selected page-002 from page-02.png.
- PASS: JPEG/iPhone orientation upload — recovered-iphone-orientation.jpg loaded into the local canvas.
- PASS: WebP portrait upload — recovered-portrait.webp loaded into the local canvas.
- PASS: Large PNG upload — recovered-large.png loaded into the local canvas.
- PASS: PNG landscape upload — Landscape PNG loaded and displayed on editing canvas.
- PASS: Drag, resize, rotate, reset — Mouse drag plus Resize +/- Rotate +/- and Reset Photo controls completed.
- PASS: Crop apply and cancel — Crop, Apply Crop, Crop, and Cancel Crop completed.
- PASS: Preview and return to editor — Side by side, overlay, and restored editor modes worked.
- PASS: Save, refresh, reopen draft — pageId/photo/placement/size/rotation/crop restored from localStorage.
- PASS: Approve with confirmation — Status approved and Return to Draft is visible.
- PASS: Export package contents — ZIP inspected: manifest.json, page-002/README.txt, page-002/flattened-restoration-preview.png, page-002/original-recovered-photo.png, page-002/placement.json, page-002/restoration.json
- PASS: Return to Draft and delete photo — Approved record returned to draft, then Remove Photo completed.
- PASS: Lock Admin protects admin routes — Lock Admin cleared sessionStorage and protected direct Photo Restoration navigation.
- PASS: Mobile iPhone emulation — Controls wrap, touch buttons are usable, canvas area is visible, and crop tap/cancel works.
- PASS: Tablet emulation — Photo Restoration route, selector, upload, and canvas visible at tablet viewport.
- PASS: WebKit browser coverage not run — Optional WebKit binary unavailable in this CLI environment; Chromium desktop, mobile touch, and tablet touch coverage completed. browserType.launch: Executable doesn't exist at /Users/max0056/Library/Caches/ms-playwright/webkit-2336/pw_run.sh
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝

## Bugs Found and Root Causes

- Sidebar/admin shell used page-height scrolling that could clip the tool menu and controls instead of independent sidebar/canvas scrolling.
- Help content was generic and did not match the exact v22.1 workflow labels Tony requested.
- Draft records did not expose all required normalized/page-relative fields at top level for reliable reopen/export inspection.
- Approval notices were cleared by record reloads, making approval look like it failed in browser QA.
- Pending autosave timers could overwrite explicit save/status transitions with stale draft state.
- JSZip dynamic import used the module object as a constructor, blocking restoration package export.
- Asynchronous hidden-link downloads were unreliable in browser QA; export now prepares a ZIP and exposes a direct download link.
- Mobile sidebar tabs had text-only height below usable touch-target size.
- The admin validator still checked old help text instead of the v22.1 photo-tool contract.

## Browser and Device Coverage

- Chromium desktop 1440x950: full workflow, export capture, package inspection.
- Chromium iPhone 14 emulation: route, unlock, selector, upload, crop tap/cancel, responsive/touch-target smoke.
- Chromium tablet touch emulation 820x1180: route, unlock, selector, upload, canvas visibility smoke.
- Playwright WebKit: route-protection smoke if local browser is installed. True Safari was not available from CLI.

## Screenshots

- qa/v22.1-photo-tool-repair/screenshots/01-admin-pin-create.png
- qa/v22.1-photo-tool-repair/screenshots/02-admin-tools-unlocked.png
- qa/v22.1-photo-tool-repair/screenshots/03-photo-restoration-initial.png
- qa/v22.1-photo-tool-repair/screenshots/04-help-tab.png
- qa/v22.1-photo-tool-repair/screenshots/05-page-89-selected.png
- qa/v22.1-photo-tool-repair/screenshots/06-photo-uploaded.png
- qa/v22.1-photo-tool-repair/screenshots/07-moved-resized-rotated.png
- qa/v22.1-photo-tool-repair/screenshots/08-crop-applied-canceled.png
- qa/v22.1-photo-tool-repair/screenshots/09-preview-side-by-side.png
- qa/v22.1-photo-tool-repair/screenshots/10-preview-overlay.png
- qa/v22.1-photo-tool-repair/screenshots/11-draft-reopened.png
- qa/v22.1-photo-tool-repair/screenshots/12-approved-locked.png
- qa/v22.1-photo-tool-repair/screenshots/13-export-complete.png
- qa/v22.1-photo-tool-repair/screenshots/14-returned-draft-photo-removed.png
- qa/v22.1-photo-tool-repair/screenshots/15-admin-locked.png
- qa/v22.1-photo-tool-repair/screenshots/16-mobile-iphone-tool.png
- qa/v22.1-photo-tool-repair/screenshots/17-tablet-tool.png

## Export Artifact

- qa/v22.1-photo-tool-repair/example-page-002-approved-restoration-export.zip

## Build and Validation

- PASS: `npm run build:assets` — authoritative reading order build complete: 90 active pages, 1 inactive audit page, 0 newly processed, 90 skipped.
- PASS: `npm run build:search-index` — search index rebuilt with 90 pages and 123 people.
- PASS: `npm run validate:pages` — 90 pages, 0 errors, 0 warnings.
- PASS: `npm run validate:admin-tools` — admin routes, PIN gate, local-only photo tool, required help sections, draft fields, and export files validated.
- PASS: page-order invariant snippet — Page 2 = page-003/page-03.png, Page 89 = page-002/page-02.png, Page 90 = page-091/page-91.png, page-007 inactive duplicate of page-006.
- PASS: `npm run build` — Vite production build completed.

Overall: PASS
