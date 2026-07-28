# FVB v22 Admin Tools Update Report

Generated: 2026-07-28

## Authority

- Authoritative repo/build: `/Users/max0056/.openclaw/workspace/projects/fvb-v21`
- `fvb-v21` remains the only authoritative Family Virtual Book repo/build for reader, search, OCR, thumbnails, page selector, and photo restoration admin tools.
- The completed Help-tab/workflow/sidebar reference checkout was identified at `/tmp/family-heritage-book-check` from GitHub remote `https://github.com/sam251231/family-heritage-book.git`, commit `b2f8fde Enable photo restoration tools in production`.
- Only the required photo-tool UI behavior was ported. The older `/tmp` component was not copied wholesale because it used older page field assumptions that could regress the corrected 90-page reading order.

## Scope

- Added protected `/admin` Admin Tools landing.
- Added protected `/admin/photo-restoration` Photo Restoration Tool route.
- Added browser-local PIN setup/unlock gate using a salted PBKDF2-derived verifier in `localStorage` and unlocked state in `sessionStorage`.
- Added visible `Lock Admin` action that clears the admin session immediately.
- Kept recovered photo uploads, drafts, approvals, and exports local to the browser. No Supabase, database, Vercel upload, or original source-scan overwrite path was added.
- Added Admin Tools entry at the bottom of the reader, outside the normal reader control cluster.
- Added `family-book-photo-admin` workspace skill and `validate:admin-tools` validation script.

## Page Order Commitments

- Source of truth remains `src/data/reading-order.json`.
- Runtime manifests remain derived from authoritative reading order.
- Active visible page count remains 90.
- `page-007` remains inactive duplicate/audit data only.
- Visible Page 2 remains `page-003` from `page-03.png`.
- Visible Page 89 remains `page-002` from `page-02.png`.
- Visible Page 90 remains `page-091` from `page-91.png`.

## Validation Status

Passed locally against preview URL `http://127.0.0.1:4173/`:

- `npm run build:assets`
- `npm run build:search-index`
- `npm run validate:pages`
- `npm run validate:admin-tools`
- `npm run build`
- Mandatory page-order one-line integrity check from `family-book-page-order-integrity`
- Browser QA script: `NODE_PATH=/Users/max0056/.npm/_npx/e41f203b7505f1fb/node_modules FVB_BASE_URL=http://127.0.0.1:4173 node qa/v22-admin-tools/admin-tools-qa.mjs`

Browser checks passed:

- Direct locked `/admin/photo-restoration` shows PIN gate.
- Unlock returns to requested route.
- Lock Admin protects `/admin` and `/admin/photo-restoration`.
- Refresh in the same session remains unlocked.
- Closing the page/fresh page in the same browser context requires PIN again.
- Photo Restoration page selector Page 89 selects `page-002` / `page-02.png`.

Screenshot artifacts:

- PIN screen: `qa/v22-admin-tools/pin-screen.png`
- Admin Tools: `qa/v22-admin-tools/admin-tools.png`
- Photo Restoration Page 89 selector: `qa/v22-admin-tools/photo-restoration-page89-selector.png`
- Page-order validation report: `qa/page-order-validation-report.md`

## Deployment

Pending production deployment.
