# AGENTS.md — guidance for AI coding agents (assignment-two)

## Project

- Next.js 16.4.6 portfolio website (course ISBA2438, assignment two).
  **JavaScript only** — no TypeScript files. React 19, Tailwind CSS 4,
  App Router. Scaffolded with create-next-app, template `app-tw` (JS variant).
- Assignment contract (graded): pages at `/`, `/about-me`,
  `/contact-me-server-form`, `/projects`, plus dynamically routed project
  pages at `/projects/[slug]`. Contact form submissions must be saved as JSON.

## Commands (Windows PowerShell)

- Dev server: `npm.cmd run dev` → http://localhost:3000
- Production build: `npm.cmd run build`
- Lint: `npm.cmd run lint`
- Start built app: `npm.cmd run start`
- **Important:** plain `npm` / `npx` fail on this machine — PowerShell's
  execution policy blocks `npm.ps1`. Always use `npm.cmd` / `npx.cmd`.

## Structure

- `app/` — routes. One folder per segment; `page.js` renders the page.
- `app/api/contact/route.js` — POST handler that validates and appends
  submissions to `data/contact-submissions.json` via `node:fs/promises`.
- `app/projects/[slug]/page.js` — dynamic route; slugs come from
  `data/projects.json` via `generateStaticParams`.
- `components/` — `NavBar.jsx`, `ProjectCard.jsx`, `ContactForm.jsx`
  (`ContactForm.jsx` is the only `"use client"` component).
- `data/projects.json` — project catalog (slug, title, tagline, description,
  tech, repo, demo). Static-imported by pages.
- `data/contact-submissions.json` — JSON array; each entry:
  `{ id, name, email, message, submittedAt }` (`submittedAt` ISO-8601 UTC).

## Hard constraints (assignment contract — breaking any of these is a defect)

- Route paths must match the spec exactly, including
  `/contact-me-server-form` (do not "clean up" the name).
- At least two projects must be reachable via `/projects/[slug]`, driven by
  `slug` values in `data/projects.json`.
- Form submissions must persist as JSON in `data/contact-submissions.json`;
  a rejected/failed submission must leave that file byte-identical and must
  not consume an id (ids are max-existing + 1).
- Concurrent POSTs are serialized through a module-level promise queue
  (`serializeWrite` in `app/api/contact/route.js`) plus atomic temp-file +
  rename with EPERM/EBUSY retry. This guarantees no lost updates or
  duplicate ids for a single server process (`next dev` / `next start`) —
  do not remove the queue. Multi-instance deployments would need a real
  file lock or database; out of scope.
- Read-only pages (`/`, `/about-me`, `/projects`, `/projects/[slug]`) must
  never write to disk.
- Expected errors return concise JSON error messages with correct status
  codes (`400` invalid input, `404` unknown slug, `500` storage failure) —
  never a raw stack trace in the response body.

## Next.js 16 gotchas (verified against bundled docs)

- `cacheComponents: true` is set in `next.config.mjs`. Dynamic segments must
  export `generateStaticParams` (our pages do) — otherwise param access needs
  a `<Suspense>` boundary.
- `params` in pages/layouts/route handlers is a **Promise** — always
  `await params` (never read it synchronously).
- Unknown slugs 404 via a defensive `notFound()` in the page. Do NOT use
  `export const dynamicParams` — it is rejected when `cacheComponents` is on.
- Dev overlay "insights" (e.g. on `/projects/[slug]` navigation) are dev-only
  performance hints, not errors. The page wraps its params-dependent content
  in `<Suspense>` (the documented fix) so navigating from `/projects` shows
  no insight badge. Unknown slugs: hard 404 in dev; in production PPR streams
  a 200 shell that renders the not-found UI.
- JSON is imported statically (`import projects from "@/data/projects.json"`).
  Only the submissions writer uses `fs`.

## Conventions

- Path alias `@/*` → repo root (see `jsconfig.json`).
- `"use client"` only where interactivity is required; everything else stays a
  Server Component.
- Tailwind utility classes inline; follow the existing light/dark pattern
  (`dark:` variants) rather than introducing a theme system.
- Keep page copy realistic — replace all `[Your Name]` / "Replace this…"
  placeholders before submission.

## Verification workflow

1. `npm.cmd run build` must succeed with both slugs prerendered.
2. `npm.cmd run lint` must pass.
3. Work through `TEST-MATRIX.md` sections A–F in order against a running
   server (`npm.cmd run dev` or `npm.cmd run start`).
4. After any fix, re-run the entire failed section, not just the row.
5. Before recording the demo, re-run sections D and E end-to-end.
