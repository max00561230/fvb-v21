# v22.2 Admin Photo Restoration Tool Blocking Repair Acceptance Report

Date: 2026-07-29T02:31:39.911Z
Preview URL: http://127.0.0.1:4178
Live deployment: PENDING POST-ACCEPTANCE DEPLOY STEP.
Original scan hash before: fe924556618ce068cc950cc39218b5861710476862d63a89b674b985dd5cd310  -
Original scan hash after: fe924556618ce068cc950cc39218b5861710476862d63a89b674b985dd5cd310  -
Original scans unchanged: PASS

## Workflow Results

- PASS: Page-order validation — Exactly 90 pages; Page 2 page-003, Page 88 page-090, Page 89 page-002/page-02.png, Page 90 page-091.
- PASS: Open Admin Tools and unlock PIN — Admin landing opened after PIN unlock.
- PASS: Open Photo Restoration — Protected route opened after unlock.
- PASS: Sidebar scrolling — Scrollable menu reaches Editor through Help.
- PASS: Help tab and Help scrolling — Help reaches final Troubleshooting section.
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
- PASS: Mobile iPhone emulation — Drawer tabs, upload, crop cancel, canvas, touch buttons, and Help scroll worked.
- PASS: Tablet emulation — Photo Restoration route, selector, upload, and canvas visible at tablet viewport.
- PASS: Viewport 1440x900 — Sidebar/drawer and Help content are reachable.
- PASS: Viewport 1280x720 — Sidebar/drawer and Help content are reachable.
- PASS: Viewport 1024x768 — Sidebar/drawer and Help content are reachable.
- PASS: Viewport 820x1180 — Sidebar/drawer and Help content are reachable.
- PASS: Viewport 390x844 — Sidebar/drawer and Help content are reachable.
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

- Root cause of sidebar scrolling failure: the photo tool rendered all controls in one long sidebar with only Tools/Help tabs. Mobile CSS also reverted the route to page/body scrolling, so laptop-height screens could clip tool groups and the required individual menu tabs did not exist.
- Root cause of Help scrolling failure: Help lived inside that same sidebar stack instead of an independent bounded scroll panel, so its final sections could be trapped below the visible viewport or hidden by browser/footer controls.

## Full Function Status Table

| Function | Working | Partially Working | Not Working | Notes |
| --- | --- | --- | --- | --- |
| page selector | Yes |  |  | Verified 90 options and Page 89 page-002/page-02.png. |
| upload photo | Yes |  |  | Verified JPEG, WebP, large PNG, and PNG upload. |
| drag | Yes |  |  | Verified canvas drag updates placement. |
| resize | Yes |  |  | Verified Resize -, Resize +, and canvas handles remain available. |
| rotate left | Yes |  |  | Verified Rotate -. |
| rotate right | Yes |  |  | Verified Rotate +. |
| crop | Yes |  |  | Verified Crop enters crop mode. |
| apply crop | Yes |  |  | Verified Apply Crop. |
| cancel crop | Yes |  |  | Verified Cancel Crop. |
| preview | Yes |  |  | Verified Restored preview, Original, Side by side, and Overlay. |
| return to editor | Yes |  |  | Verified switching back from preview/help to Editor preserves work. |
| reset | Yes |  |  | Verified Reset Photo. |
| delete photo | Yes |  |  | Verified Remove Photo after Return to Draft. |
| save draft | Yes |  |  | Verified Save Draft writes localStorage. |
| reopen draft | Yes |  |  | Verified refresh and reopen by pageId. |
| approve | Yes |  |  | Verified approval confirmation and locked approved state. |
| return approved item to draft | Yes |  |  | Verified Return to Draft. |
| export package | Yes |  |  | Verified ZIP contents and manifest. |
| Help tab | Yes |  |  | Verified exact Help sections and Feature Status. |
| sidebar scrolling | Yes |  |  | Verified menu reaches Editor through Help. |
| Help scrolling | Yes |  |  | Verified final Troubleshooting section. |
| Lock Admin | Yes |  |  | Verified route returns to PIN gate. |

## Repaired Functions

- Sidebar menu now shows Editor, Page Selection, Upload, Position and Size, Rotate, Crop, Preview, Drafts, Approval, Export, and Help.
- Sidebar menu scrolls independently between fixed header and fixed footer.
- Help is rendered in an independent scroll panel with bottom spacing and a verified Feature Status section.
- Mobile uses a drawer with independent menu/help scrolling and 100dvh sizing.

## Disabled or Removed Functions

- Removed the active-looking project import/export and Lock Published Revision controls from the visible photo restoration workflow for this repair. Help labels them outside the verified workflow rather than describing them as usable.

## Browser and Device Coverage

- Chromium desktop 1440x900: full workflow, export capture, package inspection.
- Chromium iPhone 14 / 390x844 emulation: drawer, unlock, selector, upload, crop tap/cancel, Help scroll, responsive/touch-target smoke.
- Chromium tablet touch emulation 820x1180: route, unlock, selector, upload, canvas visibility smoke.
- Viewport matrix screenshots: 1440x900, 1280x720, 1024x768, 820x1180, 390x844.
- Playwright WebKit: route-protection smoke if local browser is installed. True Safari was not available from CLI.

## Build Result

- `npm run build` passed before browser acceptance.

## Screenshots

- qa/v22.2-admin-photo-blocking-repair/screenshots/01-admin-pin-create.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/02-admin-tools-unlocked.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/03-photo-restoration-initial.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/04-sidebar-bottom.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/05-sidebar-top.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/06-help-top.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/07-help-bottom.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/08-page-89-selected.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/09-photo-uploaded.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/10-moved-resized-rotated.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/11-crop-applied-canceled.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/12-preview-side-by-side.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/13-preview-overlay.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/14-draft-reopened.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/15-approved-locked.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/16-export-complete.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/17-returned-draft-photo-removed.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/18-admin-locked.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/19-mobile-iphone-tool.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/20-tablet-tool.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/viewport-1024x768.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/viewport-1280x720.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/viewport-1440x900.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/viewport-390x844.png
- qa/v22.2-admin-photo-blocking-repair/screenshots/viewport-820x1180.png

## Export Artifact

- qa/v22.2-admin-photo-blocking-repair/example-page-002-approved-restoration-export.zip

Overall: PASS
