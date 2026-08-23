export interface ArchiveDocument {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  sourceUrl: string;
  sourceLabel: string;
  meta: string[];
}

export const archiveDocuments: ArchiveDocument[] = [
  {
    id: "francis-century-farm-certificate",
    title: "James and Pearl Francis Farm Century Farm Certificate",
    category: "Certificate",
    description:
      "North Carolina Century Farm certificate recognizing 100 years of continuous agricultural heritage for the James and Pearl Francis Farm.",
    imageUrl: "/media/documents/francis-century-farm-certificate.webp",
    sourceUrl: "/media/documents/sources/francis-century-farm-certificate-original.jpg",
    sourceLabel: "Open source image",
    meta: ["North Carolina Century Farm", "Web viewing copy"],
  },
  {
    id: "dads-letter-1945",
    title: "Dad's Letter, 1945",
    category: "Letter",
    description:
      "A preserved two-page handwritten family letter dated February 18, 1945, prepared with a web preview and the original PDF kept intact.",
    imageUrl: "/media/documents/dads-letter-1945.webp",
    sourceUrl: "/media/documents/sources/dads-letter-1945.pdf",
    sourceLabel: "Open preserved PDF",
    meta: ["February 18, 1945", "Two-page PDF"],
  },
  {
    id: "joe-silver-project",
    title: "Joe Silver Project",
    category: "Historical Research",
    description:
      "A clean, searchable text edition of the Joe Silver Project material documenting the Delmar farming cooperative and Joe Silver interview notes.",
    imageUrl: "/media/documents/joe-silver-project.webp",
    sourceUrl: "/media/documents/joe-silver-project.html",
    sourceLabel: "Open browser copy",
    meta: ["Clean searchable text", "HTML browser copy", "DOCX preserved"],
  },
  {
    id: "james-francis-interview-1937",
    title: "James Francis Interview, 1937",
    category: "Historical Interview",
    description:
      "Clean searchable text edition of the July 15, 1937 James Francis interview for the Roanoke Farms resettlement project.",
    imageUrl: "/media/documents/james-francis-interview-1937.webp",
    sourceUrl: "/media/documents/sources/james-francis-interview-1937.pdf",
    sourceLabel: "Open preserved PDF",
    meta: ["July 15, 1937", "Four-page PDF", "Clean searchable text"],
  },
  {
    id: "dudley-jones-interview-1937",
    title: "Dudley Jones Interview, 1937",
    category: "Historical Interview",
    description:
      "Clean searchable text edition of the 1937 Dudley Jones interview documenting Daniel's Chapel, Pomery land, and community history.",
    imageUrl: "/media/documents/dudley-jones-interview-1937.webp",
    sourceUrl: "/media/documents/sources/dudley-jones-interview-1937.pdf",
    sourceLabel: "Open preserved PDF",
    meta: ["August 1937", "Four-page PDF", "Clean searchable text"],
  },
];
