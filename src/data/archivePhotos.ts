export interface ArchivePhoto {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  thumbnailUrl: string;
  sourceUrl: string;
  meta: string[];
}

export const archivePhotos: ArchivePhoto[] = [
  {
    id: "mom-and-dad",
    title: "Mom and Dad",
    category: "Family Photo",
    description:
      "A preserved family portrait of Mom and Dad seated together at home, added to the living Photo Gallery collection.",
    imageUrl: "/media/photos/mom-and-dad.webp",
    thumbnailUrl: "/media/photos/thumbnails/mom-and-dad-thumb.webp",
    sourceUrl: "/media/photos/sources/mom-and-dad-original.jpg",
    meta: ["Family portrait", "Original JPEG preserved"],
  },
  {
    id: "francis-family-siblings",
    title: "Francis Family Siblings",
    category: "Family Photo",
    description:
      "A preserved group photograph of Francis family siblings, added to the living Photo Gallery collection.",
    imageUrl: "/media/photos/francis-family-siblings.webp",
    thumbnailUrl: "/media/photos/thumbnails/francis-family-siblings-thumb.webp",
    sourceUrl: "/media/photos/sources/francis-family-siblings-original.jpg",
    meta: ["Group photo", "Original JPEG preserved"],
  },
];
