export interface ArchiveSection {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  route: string;
  icon: string;
  actionLabel: string;
  countLabel: string;
}

export const archiveSections: ArchiveSection[] = [
  {
    id: "book",
    title: "Heritage Book",
    eyebrow: "Heritage Collection",
    description: "Read the preserved 90-page Francis Family Heritage Book.",
    route: "/book",
    icon: "Book",
    actionLabel: "Open Book",
    countLabel: "90 pages",
  },
  {
    id: "tree",
    title: "Family Tree",
    eyebrow: "Living Family Archive",
    description: "Build the family tree with verified relationships as records are added.",
    route: "/tree",
    icon: "Tree",
    actionLabel: "Open Tree",
    countLabel: "4 tree documents",
  },
  {
    id: "photos",
    title: "Photo Gallery",
    eyebrow: "Living Family Archive",
    description: "Organize approved family photos, places, memorials, and events.",
    route: "/photos",
    icon: "Photo",
    actionLabel: "View Photos",
    countLabel: "1 photo",
  },
  {
    id: "videos",
    title: "Family Videos",
    eyebrow: "Living Family Archive",
    description: "Add interviews, reunion recordings, and family-history video clips.",
    route: "/videos",
    icon: "Video",
    actionLabel: "View Videos",
    countLabel: "2 videos",
  },
  {
    id: "audio",
    title: "Oral History",
    eyebrow: "Living Family Archive",
    description: "Preserve family memories, interviews, audio recordings, and transcripts.",
    route: "/audio",
    icon: "Mic",
    actionLabel: "Open Audio",
    countLabel: "1 recording",
  },
  {
    id: "documents",
    title: "Historical Documents",
    eyebrow: "Living Family Archive",
    description: "Store approved records, programs, letters, certificates, and articles.",
    route: "/documents",
    icon: "Docs",
    actionLabel: "View Documents",
    countLabel: "3 documents",
  },
  {
    id: "search",
    title: "Global Search",
    eyebrow: "Discovery",
    description: "Search the Heritage Book now and expand across archive media later.",
    route: "/search",
    icon: "Find",
    actionLabel: "Search Archive",
    countLabel: "Book OCR active",
  },
  {
    id: "about",
    title: "About the Project",
    eyebrow: "Project Guide",
    description: "Explain the preservation plan and how the archive will continue to grow.",
    route: "/about",
    icon: "Info",
    actionLabel: "Read About",
    countLabel: "Project notes",
  },
];
