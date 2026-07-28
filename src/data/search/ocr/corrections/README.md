# OCR Correction Workflow

Manual OCR corrections live beside, not inside, the machine-generated OCR files.
Do not edit `src/data/search/ocr/pages/*.json` during review. Each correction
file records a reviewer-owned layer that can be audited before any future search
integration.

## Correction File Schema

Use one JSON file per visible page:

```json
{
  "schemaVersion": 1,
  "pageId": "page-000",
  "pageNumber": 0,
  "sourceImage": "page-00.png",
  "sourceImagePath": "archive-source/original-scans/page-00.png",
  "machineOcr": {
    "path": "src/data/search/ocr/pages/page-000.json",
    "textFields": ["rawText", "cleanText"],
    "averageConfidence": 0,
    "lowConfidenceWords": 0
  },
  "correctedText": null,
  "reviewedNames": [],
  "uncertainText": [],
  "notes": "",
  "reviewStatus": "needs-human-review",
  "reviewer": null,
  "updatedAt": "YYYY-MM-DDTHH:mm:ssZ"
}
```

`correctedText` must remain `null` until a human reviewer has verified the page
image. Do not guess names, dates, places, relationships, occupations, churches,
schools, military service, or burial locations. Put uncertain readings in
`uncertainText` and keep `reviewStatus` as `needs-human-review` until resolved.

Allowed `reviewStatus` values:

- `needs-human-review`
- `in-review`
- `reviewed`
- `blocked`

