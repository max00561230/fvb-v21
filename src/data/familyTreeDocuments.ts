export interface FamilyTreeDocument {
  id: string;
  title: string;
  type: "Ancestor Chart" | "Descendant Report";
  branch: string;
  description: string;
  imageUrl: string;
  sourceUrl: string;
  sourceLabel: string;
  meta: string[];
}

export const familyTreeDocuments: FamilyTreeDocument[] = [
  {
    id: "ancestors-james-henry-francis",
    title: "Ancestors of James Henry Francis",
    type: "Ancestor Chart",
    branch: "Francis line",
    description:
      "Ancestor chart for James Henry Francis, connecting the Francis line through Josephine Francis and Julia A. Francis Jones.",
    imageUrl: "/media/tree/ancestors-of-james-henry-francis-chart.webp",
    sourceUrl: "/media/tree/sources/ancestors-of-james-henry-francis-2026-original.jpg",
    sourceLabel: "Open original chart",
    meta: ["James Henry Francis", "Ancestor chart", "MyHeritage export"],
  },
  {
    id: "ancestors-pearl-pearlie-francis-clanton",
    title: "Ancestors of Pearl Pearlie Francis [Clanton]",
    type: "Ancestor Chart",
    branch: "Clanton line",
    description:
      "Ancestor chart for Pearl Pearlie Francis [Clanton], showing the Clanton and Dawson family connections.",
    imageUrl: "/media/tree/ancestors-of-pearl-pearlie-francis-clanton.webp",
    sourceUrl: "/media/tree/sources/ancestors-of-pearl-pearlie-francis-clanton-original.jpg",
    sourceLabel: "Open original chart",
    meta: ["Pearl Pearlie Francis", "Clanton branch", "MyHeritage export"],
  },
  {
    id: "descendants-durmon-clanton",
    title: "Descendants of Durmon Clanton",
    type: "Descendant Report",
    branch: "Clanton line",
    description:
      "Descendant report beginning with Durmon Clanton and Nancy Clanton, including Pearl Pearlie Clanton and related family branches.",
    imageUrl: "/media/tree/thumbnails/descendants-of-durmon-clanton.webp",
    sourceUrl: "/media/tree/sources/descendants-of-durmon-clanton.pdf",
    sourceLabel: "Open PDF",
    meta: ["8-page PDF", "Clanton descendants", "Genealogy report"],
  },
  {
    id: "descendants-wiley-jones",
    title: "Descendants of Wiley Jones",
    type: "Descendant Report",
    branch: "Jones and Francis line",
    description:
      "Descendant report beginning with Wiley Jones, connecting Julia A. Jones, Josephine Francis, and James Henry Francis.",
    imageUrl: "/media/tree/thumbnails/descendants-of-wiley-jones.webp",
    sourceUrl: "/media/tree/sources/descendants-of-wiley-jones.pdf",
    sourceLabel: "Open PDF",
    meta: ["PDF report", "Jones descendants", "Francis connection"],
  },
];
