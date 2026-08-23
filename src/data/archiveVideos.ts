export interface ArchiveVideo {
  id: string;
  title: string;
  category: string;
  description: string;
  durationLabel: string;
  originalFormat: string;
  videoUrl: string;
  posterUrl: string;
}

export const archiveVideos: ArchiveVideo[] = [
  {
    id: "video-francis-family-memories",
    title: "Francis Family Memories",
    category: "Family History",
    description: "A preserved family-memory recording added to the Family Videos collection.",
    durationLabel: "10 min 6 sec",
    originalFormat: "Original MOV preserved separately",
    videoUrl: "/media/videos/francis-family-memories.mp4",
    posterUrl: "/media/videos/posters/francis-family-memories.webp",
  },
];
