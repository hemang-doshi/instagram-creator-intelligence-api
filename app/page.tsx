import { getPublicAppName } from "@/lib/env";

export default function Home() {
  const appName = getPublicAppName();

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Read-only analytics for Custom GPT Actions</p>
        <h1>{appName}</h1>
        <p className="lede">
          Minimal Next.js API wrapper for Instagram Creator insights. This service
          exposes authenticated REST endpoints, a GPT-friendly OpenAPI document,
          and no client-side secret handling.
        </p>
      </section>

      <section className="panel">
        <h2>Quick links</h2>
        <div className="linkGrid">
          <a href="/api/health">/api/health</a>
          <a href="/api/openapi.json">/api/openapi.json</a>
        </div>
      </section>

      <section className="panel">
        <h2>Authenticated endpoints</h2>
        <ul>
          <li>
            <code>GET /api/instagram/profile</code>
          </li>
          <li>
            <code>GET /api/instagram/recent-media?limit=12</code>
          </li>
          <li>
            <code>GET /api/instagram/media/:mediaId/insights</code>
          </li>
          <li>
            <code>GET /api/instagram/reel-report?limit=10</code>
          </li>
        </ul>
        <p className="note">
          Send the private <code>x-api-key</code> header to every Instagram endpoint.
          This page never renders secrets.
        </p>
      </section>

      <section className="panel">
        <h2>Creator analysis intent</h2>
        <p className="taste">
          Clean tech aesthetic. Calm but sharp futurism. Engineering, internships,
          builder-in-public, honest humor, cinematic restraint, premium subtle captions.
          No cheap CapCut energy, no generic AI-bro posturing, no fake productivity flexes.
        </p>
      </section>
    </main>
  );
}
