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
  {
    id: "video-francis-family-reunion-1990",
    title: "Francis Family Reunion 1990",
    category: "Family Reunion",
    description: "A preserved 1990 Francis family reunion recording added to the Family Videos collection.",
    durationLabel: "4 min 6 sec",
    originalFormat: "Original MOV preserved separately",
    videoUrl: "/media/videos/francis-family-reunion-1990.mp4",
    posterUrl: "/media/videos/posters/francis-family-reunion-1990.webp",
  },
];
