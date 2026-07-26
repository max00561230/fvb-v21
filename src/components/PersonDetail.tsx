import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Navigation } from "./Navigation";
import type { Person, PeopleManifest } from "../types";

export function PersonDetail() {
  const { personId } = useParams<{ personId: string }>();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/people.json")
      .then((r) => r.ok ? r.json() : { people: [] })
      .then((data: PeopleManifest) => {
        const found = (data.people || []).find((p) => p.id === personId);
        setPerson(found || null);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [personId]);

  if (loading) {
    return (
      <div className="person-detail-page">
        <Navigation />
        <div className="loading-spinner-container">
          <div className="loading-spinner" />
          <p>Loading person details...</p>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="person-detail-page">
        <Navigation />
        <div className="not-found-content">
          <h1>Person Not Found</h1>
          <p>No person found with ID "{personId}"</p>
          <Link to="/people" className="not-found-link">← Back to People Directory</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="person-detail-page">
      <Navigation />
      <div className="person-detail-content">
        <Link to="/people" className="back-link">← All People</Link>

        <div className="person-detail-header">
          <h1 className="person-detail-name">{person.fullName}</h1>
          {person.nicknames.length > 0 && (
            <p className="person-detail-nicknames">
              Also known as: {person.nicknames.join(", ")}
            </p>
          )}
        </div>

        <div className="person-detail-sections">
          {person.birthDate && (
            <section className="person-detail-section">
              <h2>Life Dates</h2>
              <p>
                <strong>Born:</strong> {formatDate(person.birthDate)}
                {person.deathDate && (
                  <>{" — "}<strong>Died:</strong> {formatDate(person.deathDate)}</>
                )}
              </p>
            </section>
          )}

          {person.occupations.length > 0 && (
            <section className="person-detail-section">
              <h2>Occupations</h2>
              <ul>
                {person.occupations.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </section>
          )}

          {person.places.length > 0 && (
            <section className="person-detail-section">
              <h2>Places</h2>
              <ul>
                {person.places.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </section>
          )}

          {person.churches.length > 0 && (
            <section className="person-detail-section">
              <h2>Churches</h2>
              <ul>
                {person.churches.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </section>
          )}

          {person.schools.length > 0 && (
            <section className="person-detail-section">
              <h2>Schools</h2>
              <ul>
                {person.schools.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </section>
          )}

          {person.militaryService.length > 0 && (
            <section className="person-detail-section">
              <h2>Military Service</h2>
              <ul>
                {person.militaryService.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </section>
          )}

          {person.businesses.length > 0 && (
            <section className="person-detail-section">
              <h2>Businesses</h2>
              <ul>
                {person.businesses.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </section>
          )}

          {person.cemeteries.length > 0 && (
            <section className="person-detail-section">
              <h2>Cemeteries</h2>
              <ul>
                {person.cemeteries.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </section>
          )}

          {person.pageReferences.length > 0 && (
            <section className="person-detail-section">
              <h2>Referenced in Book</h2>
              <div className="person-page-refs">
                {person.pageReferences.map((pg) => (
                  <Link key={pg} to={`/?page=${pg}`} className="page-ref-link">
                    Page {pg}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  if (!y) return dateStr;
  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const monthIdx = m ? parseInt(m) - 1 : -1;
  if (monthIdx >= 0 && d) {
    return `${months[monthIdx]} ${parseInt(d)}, ${y}`;
  }
  return y;
}