import { Link } from "react-router-dom";
import { archiveAudio } from "../data/archiveAudio";
import { archiveDocuments } from "../data/archiveDocuments";
import { archiveVideos } from "../data/archiveVideos";
import { familyTreeDocuments } from "../data/familyTreeDocuments";
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
    <div className="fvb-gallery-shell">
      <FvbMuseumHeader />
      <FvbArchiveNavigation />
      <main className="archive-section-page fvb-section-page">
        <header className="archive-section-header fvb-section-header">
          <FvbPlaque>GENEALOGY GALLERY</FvbPlaque>
          <h1>Family Tree</h1>
          <p>A verified family tree foundation for parent, child, spouse, and branch relationships.</p>
        </header>

        <section className="family-tree-document-grid" aria-label="Family tree documents">
          {familyTreeDocuments.map((document) => (
            <article className="family-tree-document-card" key={document.id}>
              <figure className="family-tree-document-image">
                <img src={document.imageUrl} alt={`${document.title} preview`} />
              </figure>
              <div className="family-tree-document-copy">
                <p className="archive-video-category">{document.type}</p>
                <h2>{document.title}</h2>
                <p>{document.description}</p>
                <div className="archive-video-meta" aria-label={`${document.title} details`}>
                  {document.meta.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <a className="archive-card-action fvb-card-link" href={document.sourceUrl} target="_blank" rel="noreferrer">
                  {document.sourceLabel}
                </a>
              </div>
            </article>
          ))}
        </section>

        <section className="archive-detail-grid" aria-label="Family Tree structure">
          <div className="archive-detail-panel">
            <h2>Tree Materials</h2>
            <ul>
              <li>Ancestor charts</li>
              <li>Descendant reports</li>
              <li>Branch documents</li>
              <li>Original source files</li>
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
            <h2>Research Paths</h2>
            <ul>
              <li>Francis line</li>
              <li>Clanton line</li>
              <li>Jones line</li>
              <li>Dawson connections</li>
            </ul>
          </div>
        </section>
        <FvbArchiveQuote />
      </main>
    </div>
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
  if (archiveAudio.length > 0) {
    return (
      <div className="fvb-gallery-shell">
        <FvbMuseumHeader />
        <FvbArchiveNavigation />
        <main className="archive-section-page fvb-section-page">
          <header className="archive-section-header fvb-section-header">
            <FvbPlaque>VOICE ARCHIVE</FvbPlaque>
            <h1>Oral History</h1>
            <p>A place to preserve spoken family memories, interviews, and audio recordings with transcripts.</p>
          </header>

          <section className="archive-audio-grid" aria-label="Oral history recordings">
            {archiveAudio.map((recording) => (
              <article className="archive-audio-card" key={recording.id}>
                <div className="archive-audio-icon" aria-hidden="true">
                  <span>Voice</span>
                </div>
                <div className="archive-audio-copy">
                  <p className="archive-video-category">{recording.category}</p>
                  <h2>{recording.title}</h2>
                  <p>{recording.description}</p>
                  <audio controls preload="metadata">
                    <source src={recording.audioUrl} type="audio/mp4" />
                    Your browser does not support audio playback.
                  </audio>
                  <div className="archive-video-meta" aria-label={`${recording.title} details`}>
                    <span>{recording.durationLabel}</span>
                    <span>{recording.originalFormat}</span>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <section className="archive-detail-grid" aria-label="Oral History structure">
            <div className="archive-detail-panel">
              <h2>Ready Categories</h2>
              <ul>
                <li>Family Interviews</li>
                <li>Personal Memories</li>
                <li>Church History</li>
                <li>Community History</li>
                <li>Farm Life</li>
              </ul>
            </div>
            <div className="archive-detail-panel">
              <h2>Data Rules</h2>
              <ul>
                <li>Use permanent stable IDs for each record.</li>
                <li>Keep original archival masters separate from web copies.</li>
                <li>Add transcripts only after the text is reviewed.</li>
              </ul>
            </div>
            <div className="archive-detail-panel">
              <h2>Accepted Formats</h2>
              <ul>
                <li>M4A or MP3 web copies</li>
                <li>Transcript text</li>
                <li>Archival MP4 or WAV kept separately</li>
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

        <section className="document-feature-grid" aria-label="Historical document collection">
          {archiveDocuments.map((document) => (
            <article className="document-feature" aria-labelledby={`${document.id}-title`} key={document.id}>
              <figure className="document-feature-image">
                <img src={document.imageUrl} alt={`${document.title} preview`} />
              </figure>
              <div className="document-feature-copy">
                <p className="archive-video-category">{document.category}</p>
                <h2 id={`${document.id}-title`}>{document.title}</h2>
                <p>{document.description}</p>
                <div className="archive-video-meta" aria-label={`${document.title} details`}>
                  {document.meta.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
                <a className="archive-card-action fvb-card-link" href={document.sourceUrl} target="_blank" rel="noreferrer">
                  {document.sourceLabel}
                </a>
              </div>
            </article>
          ))}
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
