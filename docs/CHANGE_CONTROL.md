# FVB v21 Change Control
## Permanent Project Governance Document
### Family Virtual Book (FVB v21)

Version: 21.0.0

---

# PURPOSE

This document establishes the permanent change control policy for the
Family Virtual Book (FVB v21).

Its purpose is to protect the historical integrity of the Family Heritage
Book while allowing future enhancements.

This document overrides any AI-generated assumptions.

If a proposed change conflicts with this document, this document wins.

---

# PRIMARY PRINCIPLE

The Family Heritage Book is a historical archive.

It is NOT a graphic design project.

It is NOT a scrapbook editor.

It is NOT a document recreation project.

It is a permanent digital museum.

Every historical page represents archival material and must be preserved
for future generations.

---

# SOURCE OF TRUTH

The flattened restored page image is the permanent source of truth.

Everything else is supplemental.

Nothing may replace the page image.

Nothing may redraw the page image.

Nothing may reinterpret the page image.

Nothing may recreate the page using HTML, CSS, Canvas, SVG, AI image generation,
or any other visual reconstruction technique.

---

# GOVERNING DOCUMENT HIERARCHY

When multiple project documents exist, they shall be followed in this order:

1. FVB v21 Change Control.md
2. FVB v21 OpenClaw Master Build.md
3. FVB v21 Design Standards & Deployment Checklist.md
4. Project Source Code
5. AI Recommendations
6. Developer Assumptions

If two documents conflict, the document higher in this hierarchy always takes precedence.

---

# CHANGE LEVELS

Every requested modification shall be classified before work begins.

------------------------------------------------------------

LEVEL 1

SAFE CHANGES

Automatically Approved

------------------------------------------------------------

Examples

• Bug fixes

• Performance improvements

• Accessibility improvements

• Mobile responsiveness

• Faster loading

• Better caching

• Search improvements

• OCR improvements

• Audio narration

• Biography panels

• Family tree

• Timeline

• Maps

• Bookmarks

• Notes

• Fullscreen

• Zoom improvements

• Keyboard navigation

• PWA improvements

• Analytics

These changes must NEVER alter the historical pages.

---

LEVEL 2

VISUAL IMPROVEMENTS

Verification Required

------------------------------------------------------------

Examples

Toolbar improvements

Viewer polish

Spacing improvements

Typography improvements

Icons

Animation improvements

Button styling

Color refinements

Panel layout improvements

These changes are allowed ONLY if the historical pages remain completely unchanged.

---

LEVEL 3

HISTORICAL CONTENT CHANGES

OWNER APPROVAL REQUIRED

------------------------------------------------------------

Examples

Changing captions

Moving photographs

Replacing photographs

Cropping photographs

Changing page order

Changing page layout

Changing handwriting

Removing marks

Replacing scans

Replacing text

Changing dates

Changing names

Changing historical notes

Adding text directly onto a historical page

Any Level 3 change requires explicit owner approval BEFORE implementation.

---

LEVEL 4

FORBIDDEN CHANGES

NEVER ALLOWED

------------------------------------------------------------

The following changes are permanently prohibited.

DO NOT

Generate replacement faces

Generate AI family photographs

Colorize historical photographs

Replace historical photographs

Move historical photographs

Separate photographs into HTML blocks

Recreate scrapbook layouts

Replace handwriting

Rewrite historical text

Invent historical facts

Guess names

Guess dates

Guess relationships

Guess locations

Rotate historical photographs

Resize photographs independently

Replace page textures

Replace page numbering

Remove historical imperfections

Hide historical wear

Create "better looking" page layouts

Insert AI artwork into historical pages

Modify approved archival restorations

---

# PAGE LOCK POLICY

Every approved page is permanently locked.

Approved pages shall be treated as:

READ ONLY

No layout editing.

No repositioning.

No photo movement.

No text movement.

No redesign.

No automatic cleanup.

No visual reinterpretation.

---

# PAGE 6 LOCK

Page 6 is permanently approved.

It represents the official archival restoration.

OpenClaw shall NEVER

Replace James Henry Francis

Replace Pearl Martha Ann Clanton Francis

Replace either photograph

Move either photograph

Separate photographs into HTML

Generate replacement faces

Replace captions

Replace dates

Rotate photographs

Rebuild the scrapbook layout

Substitute another restoration

If Page 6 changes visually in any way, the build fails.

---

# FUTURE FEATURES POLICY

Future features are encouraged.

However, they must remain separate from the archival pages.

Approved enhancement types

Biography Panels

Family Tree

Interactive Timeline

Maps

Audio Narration

OCR Search

Bookmarks

Notes

Related Documents

Historical Videos

Photo Galleries

Accessibility Tools

Search Highlights

These features shall exist only as overlays, dialogs, panels, metadata,
or independent data sources.

They shall NEVER alter the archival page.

---

# DATA SEPARATION

Historical Pages

↓

Flattened Images

-----------------------------------

Metadata

↓

JSON

-----------------------------------

OCR

↓

Search Index

-----------------------------------

Biographies

↓

JSON

-----------------------------------

Audio

↓

MP3

-----------------------------------

Family Tree

↓

JSON

-----------------------------------

All future information remains independent from the archival page.

---

# IMAGE POLICY

Master Images

PNG

Lossless

4000–6000 pixels preferred

Never edited after archival approval.

Responsive Copies

WebP

Generated automatically

Never manually edited.

If a master image changes,
all responsive copies shall be regenerated.

---

# BUILD FAILURE CONDITIONS

The build shall automatically fail if:

A page is reconstructed.

A photograph moves.

Historical text changes.

Historical captions change.

Page numbering changes.

Generated faces appear.

Draft captions appear.

Debug labels appear.

Legacy scrapbook renderer appears.

Experimental renderer appears.

Any approved page fails validation.

---

# CODE REVIEW POLICY

Every release shall verify:

No historical image changes.

No historical layout changes.

No removed photographs.

No removed captions.

No page numbering changes.

No AI generated replacements.

No broken OCR.

No broken search.

No broken hotspots.

No broken bookmarks.

No broken page links.

---

# RELEASE REQUIREMENTS

Every release shall include

Version Number

Git Commit

Build Date

Validation Report

Deployment Report

Performance Report

Accessibility Report

Historical Integrity Report

---

# VERSIONING POLICY

Major Version

Historical architecture changes.

Minor Version

New features.

Patch Version

Bug fixes only.

Historical pages remain identical.

---

# LONG TERM VISION

FVB v21 is intended to become the permanent digital archive of the Francis Family Heritage Book.

Future versions shall expand the experience while preserving the archival record exactly.

The historical page is the museum artifact.

Every feature is simply a window into that artifact.

---

# AI BEHAVIOR CONTRACT

This contract applies to every AI coding assistant, software engineer,
or automation system that contributes to the Family Virtual Book project.

This includes, but is not limited to:

• OpenClaw

• Codex

• ChatGPT

• Hermes

• Gemini

• Claude

• Qwen

• GLM

• Any future AI development system

---

## AI SHALL

Follow the OpenClaw Master Build Specification.

Follow the Design Standards.

Follow this Change Control document.

Preserve every approved archival page exactly.

Preserve all historical photographs exactly.

Preserve all historical text exactly.

Keep enhancements separate from archival content.

Use overlays, dialogs, metadata, and side panels for new features.

Ask for clarification whenever historical information is uncertain.

Maintain compatibility with previously approved archival releases whenever practical.

---

## AI SHALL NOT

Invent historical facts.

Guess names.

Guess dates.

Guess relationships.

Guess locations.

Generate replacement photographs.

Replace faces.

Replace handwriting.

Rearrange scrapbook layouts.

Modify approved page images.

Remove historical imperfections.

Rewrite captions.

Change page numbering.

Introduce experimental public renderers.

Override this governance document.

---

## WHEN UNCERTAINTY EXISTS

If historical information is uncertain,
the AI shall stop and request clarification.

"No Change" is always preferred over an incorrect change.

---

## HISTORICAL FIRST POLICY

Whenever there is a choice between:

Preserving historical accuracy

or

Improving visual appearance

Historical accuracy always wins.

The archival record has absolute priority.

---

## FEATURE DEVELOPMENT POLICY

Future enhancements are encouraged.

Examples include:

Family Tree

Biography Panels

Audio Narration

OCR Search

Interactive Timelines

Maps

Related Documents

Historical Videos

Bookmarks

Notes

Accessibility Improvements

These enhancements must remain independent from the archival page image.

The archival page itself shall never be modified.

---

## FINAL COMPLIANCE VERIFICATION

Before declaring the project complete,
the development system shall verify:

✓ No historical pages were modified.

✓ No photographs were replaced.

✓ No historical text changed.

✓ No prohibited changes were introduced.

✓ All validation tests passed.

✓ All deployment tests passed.

✓ All historical integrity checks passed.

Only after every item has passed may the project be declared complete.

---

# FINAL RULE

When there is uncertainty:

DO NOT redesign.

DO NOT recreate.

DO NOT improve the historical page.

Preserve first.

Enhance around it.

The historical page always has the highest authority.

END OF DOCUMENT