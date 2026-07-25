export interface BookPage {
  id: string;
  pageNumber: number;
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