# FVB v21 Design Standards & Deployment Checklist

## Purpose

This document is the permanent design, UI/UX, quality, and deployment
standard for the Family Virtual Book (FVB v21). It complements the
OpenClaw Master Build specification and must be followed for every
future release.

# Part 1 --- Design Standards

## Core Principles

-   Preserve every historical page exactly as restored.
-   Preserve every original family photograph pixel-for-pixel.
-   Never recreate faces or historical content with generative AI.
-   Treat each page image as the permanent archival record.
-   Add new functionality only through overlays, panels, metadata, or
    dialogs.

## Visual Identity

-   Theme: Premium archival library.
-   Primary color: Burgundy (#6C1727)
-   Accent: Antique Gold (#CAA24B)
-   Background: Warm cream (#F7F0DF)
-   Page background: White/Paper tone.
-   Serif fonts for titles; clean sans-serif for interface text.

## Viewer Standards

-   Fit page by default.
-   Pinch/double-click zoom.
-   Fullscreen mode.
-   Previous/Next navigation.
-   Thumbnail page browser.
-   URL format: ?page=#
-   Responsive for desktop, tablet, and phone.

## Accessibility

-   44px minimum touch targets.
-   Keyboard navigation.
-   Visible focus states.
-   Optional transcript panel.
-   Screen-reader friendly controls.

## Performance

-   Archive masters remain PNG.
-   Serve responsive WebP copies.
-   Lazy-load thumbnails.
-   Preload only the next page.
-   Never embed page images in JavaScript.

## Future Features

Add only as overlays: - Biographies - Family tree - Maps - Audio
narration - OCR search - Timeline - Notes - Bookmarks

# Part 2 --- Deployment Checklist

## Before Build

-   [ ] Master pages verified.
-   [ ] Page sequence complete.
-   [ ] No missing images.
-   [ ] OCR metadata updated.

## Build

-   [ ] npm install
-   [ ] npm run build:assets
-   [ ] npm run validate:pages
-   [ ] npm run build

## Functional Testing

-   [ ] Desktop
-   [ ] iPhone Safari
-   [ ] Android Chrome
-   [ ] Tablet
-   [ ] PWA install
-   [ ] Offline cache
-   [ ] Fullscreen
-   [ ] Zoom
-   [ ] Bookmarks
-   [ ] URL routing
-   [ ] Search
-   [ ] Hotspots

## Historical Integrity

-   [ ] No generated faces.
-   [ ] No reconstructed layouts.
-   [ ] No draft captions.
-   [ ] No debug elements.
-   [ ] Page 6 matches approved archival version.

## Performance

-   [ ] Responsive images served.
-   [ ] Masters used only for zoom.
-   [ ] Lighthouse performance acceptable.
-   [ ] No oversized initial downloads.

## Deployment

-   [ ] Deploy to Vercel.
-   [ ] Verify live URL.
-   [ ] Verify cache refresh.
-   [ ] Test direct page links.
-   [ ] Test Add to Home Screen.

## Completion Report

OpenClaw must provide: 1. Live Vercel URL. 2. Git commit hash. 3. Total
pages processed. 4. Desktop screenshot. 5. Mobile screenshot. 6. Page 6
screenshot. 7. Confirmation legacy renderers removed. 8. Confirmation no
generative image processing used.

## Final Rule

The historical page image is the source of truth. Future enhancements
must never modify or replace the archival page itself.
