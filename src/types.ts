export interface BookPage {
  id: string;
  pageNumber: number;
  originalPageNumber?: number;
  width: number;
  height: number;
  masterSrc: string;
  thumbnailSrc: string;
  sources: {
    mobile: string;
    tablet: string;
    desktop: string;
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

export interface HotspotsManifest {
  version: string;
  hotspots: PageHotspot[];
}

export interface TranscriptEntry {
  pageNumber: number;
  text: string;
}

export interface TranscriptsManifest {
  version: string;
  transcripts: TranscriptEntry[];
}

// === Phase 1 additions ===

export interface Person {
  id: string;
  fullName: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  nicknames: string[];
  birthDate?: string;
  deathDate?: string;
  occupations: string[];
  places: string[];
  churches: string[];
  schools: string[];
  militaryService: string[];
  businesses: string[];
  cemeteries: string[];
  pageReferences: number[];
  storyIds: string[];
  mediaIds: string[];
  familyTreeId: string;
}

export interface PeopleManifest {
  version: string;
  people: Person[];
}

export interface SearchResult {
  type: "page" | "person" | "place" | "church" | "school" | "military" | "business" | "cemetery" | "occupation";
  title: string;
  snippet: string;
  pageReference?: number;
  personId?: string;
  url: string;
  score: number;
}

export interface OcrPageData {
  pageId: string;
  pageNumber: number;
  originalPageNumber?: number;
  sourceImage: string;
  rawText: string;
  cleanedText: string;
  confidence: number;
  wordCount: number;
  words: { text: string; conf: number; bbox: { left: number; top: number; width: number; height: number } }[];
  machineGenerated: boolean;
  generatedAt: string;
  tesseractVersion: string;
}

export interface SearchIndexEntry {
  pageNumber: number;
  originalPageNumber?: number;
  pageId: string;
  text: string;
  title?: string;
}

export interface PersonReviewEntry {
  id: string;
  fullName: string;
  reason: string;
  pageReferences: number[];
  suggestedFields?: string[];
}

export interface PlacementData {
  pageId: string;
  sourcePage: string;
  restoredPhoto: string;
  personName: string;
  opening: { x: number; y: number; width: number; height: number };
  placement: { offsetX: number; offsetY: number; scale: number; rotation: number };
  sourceInformation: {
    submittedBy: string;
    sourceDescription: string;
    dateRestored: string;
  };
  status: "draft" | "approved";
}
