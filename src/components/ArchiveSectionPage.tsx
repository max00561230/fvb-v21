import { Link } from "react-router-dom";
import { archiveVideos } from "../data/archiveVideos";
import { FvbArchiveNavigation, FvbArchiveQuote, FvbMuseumHeader, FvbPlaque } from "./FvbMuseumComponents";

interface SectionAction {
  label: string;
  href: string;
}

interface EmptySectionProps {
  title: string;
  eyebrow: string;
  description: string;
  emptyTitle: string;
  emptyBody: string;
  categories: string[];
  acceptedFormats?: string[];
  actions?: SectionAction[];
}

function EmptyArchiveSection({
  title,
  eyebrow,
  description,
  emptyTitle,
  emptyBody,
  categories,
  acceptedFormats = [],
  actions = [],
}: EmptySectionProps) {
  return (
    <div className="fvb-gallery-shell">
      <FvbMuseumHeader />
      <FvbArchiveNavigation />
      <main className="archive-section-page fvb-section-page">
        <header className="archive-section-header fvb-section-header">
          <FvbPlaque>{eyebrow}</FvbPlaque>
          <h1>{title}</h1>
          <p>{description}</p>
        </header>

        <section className="archive-empty-state" aria-labelledby={`${title}-empty-title`}>
          <div>
            <h2 id={`${title}-empty-title`}>{emptyTitle}</h2>
            <p>{emptyBody}</p>
          </div>
          {actions.length > 0 && (
            <div className="archive-section-actions">
              {actions.map((action) => (
                <Link key={action.href} to={action.href} className="archive-card-action fvb-card-link">
                  {action.label}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="archive-detail-grid" aria-label={`${title} structure`}>
          <div className="archive-detail-panel">
            <h2>Ready Categories</h2>
            <ul>
              {categories.map((category) => (
                <li key={category}>{category}</li>
              ))}
            </ul>
          </div>
          <div className="archive-detail-panel">
            <h2>Data Rules</h2>
            <ul>
              <li>Use permanent stable IDs for each record.</li>
              <li>Leave unknown information blank until verified.</li>
              <li>Keep original archival masters separate from web copies.</li>
              <li>Publish only approved public or family-safe material.</li>
            </ul>
          </div>
          {acceptedFormats.length > 0 && (
            <div className="archive-detail-panel">
              <h2>Accepted Formats</h2>
              <ul>
                {acceptedFormats.map((format) => (
                  <li key={format}>{format}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <FvbArchiveQuote />
      </main>
    </div>
  );
}

export function FamilyMembersPage() {
  return (
    <EmptyArchiveSection
      title="Family Members"
      eyebrow="PEOPLE & LEGACY"
      description="A ready structure for biographies, profile photos, Heritage Book links, and related archive media."
      emptyTitle="No family member profiles have been added yet."
      emptyBody="This section is ready for approved biographies and verified person records when Tony provides them."
      categories={[
        "Biographies",
        "Profile photographs",
        "Heritage Book links",
        "Related photos",
        "Related videos",
        "Related audio",
        "Related documents",
        "Timeline notes",
      ]}
      actions={[{ label: "Open Heritage Book", href: "/book" }, { label: "Search Book", href: "/search" }]}
    />
  );
}

export function FamilyTreePage() {
  return (
    <EmptyArchiveSection
      title="Family Tree"
      eyebrow="GENEALOGY GALLERY"
      description="A verified family tree foundation for parent, child, spouse, and branch relationships."
      emptyTitle="No family tree records have been added yet."
      emptyBody="This section is ready for verified people and relationship data when Tony provides it."
      categories={["Parents", "Children", "Spouses", "Family branches", "Unknown relationships", "Multi-generation views"]}
      actions={[{ label: "Open Heritage Book", href: "/book" }, { label: "Search Book", href: "/search" }]}
    />
  );
}

export function PhotoGalleryPage() {
  return (
    <EmptyArchiveSection
      title="Photo Gallery"
      eyebrow="VISUAL ARCHIVE"
      description="A separate archive gallery for family photographs outside the scanned Heritage Book pages."
      emptyTitle="No archive photos have been added yet."
      emptyBody="This section is ready for approved family photos, optimized viewing copies, captions, and related people."
      categories={[
        "Family Members",
        "Family Branches",
        "Reunions",
        "Weddings",
        "Churches",
        "Schools",
        "Military",
        "Farms and Homes",
        "Cemeteries",
        "Historical Places",
        "Memorials",
        "Unidentified Family Photos",
        "Other",
      ]}
      acceptedFormats={["WebP viewing copies", "JPG", "PNG"]}
    />
  );
}

export function FamilyVideosPage() {
  if (archiveVideos.length > 0) {
    return (
      <div className="fvb-gallery-shell">
        <FvbMuseumHeader />
        <FvbArchiveNavigation />
        <main className="archive-section-page fvb-section-page">
          <header className="archive-section-header fvb-section-header">
            <FvbPlaque>MEDIA COLLECTION</FvbPlaque>
            <h1>Family Videos</h1>
            <p>A media center for interviews, reunions, family-history recordings, and videos of important places.</p>
          </header>

          <section className="archive-video-grid" aria-label="Family video collection">
            {archiveVideos.map((video) => (
              <article className="archive-video-card" key={video.id}>
                <video controls preload="metadata" poster={video.posterUrl}>
                  <source src={video.videoUrl} type="video/mp4" />
                </video>
                <div className="archive-video-copy">
                  <p className="archive-video-category">{video.category}</p>
                  <h2>{video.title}</h2>
                  <p>{video.description}</p>
                  <div className="archive-video-meta" aria-label={`${video.title} details`}>
                    <span>{video.durationLabel}</span>
                    <span>{video.originalFormat}</span>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="archive-detail-grid" aria-label="Family Videos structure">
            <div className="archive-detail-panel">
              <h2>Ready Categories</h2>
              <ul>
                <li>Family Interviews</li>
                <li>Family Reunions</li>
                <li>Family History</li>
                <li>Historical Places</li>
              </ul>
            </div>
            <div className="archive-detail-panel">
              <h2>Data Rules</h2>
              <ul>
                <li>Use permanent stable IDs for each record.</li>
                <li>Keep original archival masters separate from web copies.</li>
                <li>Publish only approved public or family-safe material.</li>
              </ul>
            </div>
            <div className="archive-detail-panel">
              <h2>Accepted Formats</h2>
              <ul>
                <li>MP4</li>
                <li>H.264 video</li>
                <li>AAC audio</li>
                <li>Poster WebP</li>
              </ul>
            </div>
          </section>
          <FvbArchiveQuote />
        </main>
      </div>
    );
  }

  return (
    <EmptyArchiveSection
      title="Family Videos"
      eyebrow="MEDIA COLLECTION"
      description="A media center for interviews, reunions, family-history recordings, and videos of important places."
      emptyTitle="No family videos have been added yet."
      emptyBody="This section is ready for future interviews, reunion recordings, and other family-history videos."
      categories={[
        "Family Interviews",
        "Family Reunions",
        "Family History",
        "Historical Places",
        "Church History",
        "Cemetery History",
        "Military History",
        "Memorials",
        "Special Events",
        "Other",
      ]}
      acceptedFormats={["MP4", "H.264 video", "AAC audio", "Poster WebP", "Captions", "Transcripts"]}
    />
  );
}

export function OralHistoryPage() {
  return (
    <EmptyArchiveSection
      title="Oral History"
      eyebrow="VOICE ARCHIVE"
      description="A place to preserve spoken family memories, interviews, and audio recordings with transcripts."
      emptyTitle="No oral-history audio has been added yet."
      emptyBody="This section is ready for approved recordings, speaker information, transcripts, and related archive links."
      categories={[
        "Family Interviews",
        "Personal Memories",
        "Church History",
        "Community History",
        "Military Memories",
        "Farm Life",
        "Family Traditions",
        "Memorial Tributes",
        "Other",
      ]}
      acceptedFormats={["MP3 web copies", "Transcript text", "Archival WAV kept separately"]}
    />
  );
}

export function HistoricalDocumentsPage() {
  return (
    <div className="fvb-gallery-shell">
      <FvbMuseumHeader />
      <FvbArchiveNavigation />
      <main className="archive-section-page fvb-section-page">
        <header className="archive-section-header fvb-section-header">
          <FvbPlaque>DOCUMENT ARCHIVE</FvbPlaque>
          <h1>Historical Documents</h1>
          <p>A document archive for approved records, programs, certificates, articles, letters, and related files.</p>
        </header>

        <section className="document-feature" aria-labelledby="century-farm-certificate-title">
          <figure className="document-feature-image">
            <img
              src="/media/documents/francis-century-farm-certificate.webp"
              alt="North Carolina Century Farm certificate presented to James and Pearl Francis Farm"
            />
          </figure>
          <div className="document-feature-copy">
            <p className="archive-video-category">Certificate</p>
            <h2 id="century-farm-certificate-title">James and Pearl Francis Farm Century Farm Certificate</h2>
            <p>
              North Carolina Century Farm certificate recognizing 100 years of continuous agricultural heritage for the
              James and Pearl Francis Farm.
            </p>
            <div className="archive-video-meta" aria-label="Century Farm certificate details">
              <span>North Carolina Century Farm</span>
              <span>Web viewing copy</span>
            </div>
          </div>
        </section>

        <section className="archive-detail-grid" aria-label="Historical Documents structure">
          <div className="archive-detail-panel">
            <h2>Ready Categories</h2>
            <ul>
              <li>Birth Records</li>
              <li>Marriage Records</li>
              <li>Death Records</li>
              <li>Military Records</li>
              <li>Church Records</li>
              <li>School Records</li>
              <li>Newspaper Articles</li>
              <li>Letters</li>
              <li>Wills</li>
              <li>Deeds</li>
              <li>Certificates</li>
              <li>Funeral Programs</li>
              <li>Obituaries</li>
              <li>Other</li>
            </ul>
          </div>
          <div className="archive-detail-panel">
            <h2>Data Rules</h2>
            <ul>
              <li>Use permanent stable IDs for each record.</li>
              <li>Leave unknown information blank until verified.</li>
              <li>Keep original archival masters separate from web copies.</li>
              <li>Publish only approved public or family-safe material.</li>
            </ul>
          </div>
          <div className="archive-detail-panel">
            <h2>Accepted Formats</h2>
            <ul>
              <li>PDF</li>
              <li>PNG</li>
              <li>JPG</li>
              <li>WebP</li>
              <li>OCR text</li>
            </ul>
          </div>
        </section>
        <FvbArchiveQuote />
      </main>
    </div>
  );
}

export function AboutProjectPage() {
  return (
    <div className="fvb-gallery-shell">
      <FvbMuseumHeader />
      <FvbArchiveNavigation />
      <main className="archive-section-page fvb-section-page">
        <header className="archive-section-header fvb-section-header">
          <FvbPlaque>ARCHIVE NOTES</FvbPlaque>
          <h1>Francis Family Digital Family History Center</h1>
          <p>
            The Family Virtual Book preserves the original 90-page Francis Family Heritage Book while creating a
            separate living archive for new family-history materials.
          </p>
        </header>

        <section className="about-project-copy">
          <h2>Preservation Philosophy</h2>
          <p>
            The original 90-page Family Heritage Book is preserved as the Heritage Collection. New photographs, videos,
            oral histories, documents, family-tree records, stories, and other historical materials are maintained
            separately in the Living Family Archive.
          </p>
          <p>
            The Family Virtual Book allows the original book to remain preserved while the family's history continues to
            grow.
          </p>
        </section>

        <section className="archive-detail-grid" aria-label="Project layers">
          <div className="archive-detail-panel">
            <h2>Heritage Collection</h2>
            <ul>
              <li>Preserved 90-page Heritage Book</li>
              <li>Heritage Book OCR</li>
              <li>Heritage Book search metadata</li>
            </ul>
          </div>
          <div className="archive-detail-panel">
            <h2>Living Family Archive</h2>
            <ul>
              <li>Family Tree</li>
              <li>Photo Gallery</li>
              <li>Family Videos</li>
              <li>Oral History</li>
              <li>Historical Documents</li>
              <li>Future stories and archive collections</li>
            </ul>
          </div>
        </section>
        <FvbArchiveQuote />
      </main>
    </div>
  );
}
