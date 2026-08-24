export interface ArchiveBiography {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  sourceUrl: string;
  sourceLabel: string;
  meta: string[];
}

export const archiveBiographies: ArchiveBiography[] = [
  {
    id: "jesse-abel-francis-biographical-sketch",
    title: "Jesse Abel Francis Biographical Sketch",
    category: "Family Member Biography",
    description:
      "A preserved biographical sketch honoring Jesse Abel Francis and his contributions in education, military service, community development, religion, and public service.",
    imageUrl: "/media/biographies/jesse-abel-francis-biographical-sketch.webp",
    thumbnailUrl: "/media/biographies/thumbnails/jesse-abel-francis-biographical-sketch-thumb.webp",
    sourceUrl: "/media/biographies/sources/jesse-abel-francis-biographical-sketch.pdf",
    sourceLabel: "Open searchable PDF",
    meta: ["Three-page PDF", "Clean searchable text", "Replacement PDF preserved"],
  },
];
