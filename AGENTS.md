# AGENTS.md — guidance for AI coding agents (assignment-two)

## Project

- Next.js 16.4.6 portfolio website (course ISBA2438, assignment two).
  **JavaScript only** — no TypeScript files. React 19, Tailwind CSS 4,
  App Router. Scaffolded with create-next-app, template `app-tw` (JS variant).
- Assignment contract (graded): pages at `/`, `/about-me`,
  `/contact-me-server-form`, `/projects`, plus dynamically routed project
  pages at `/projects/[slug]`. Contact form submissions must be saved as JSON.
- Extensions (blogs + contact): `/contact-me` page → `POST /api/contacts`
  (same JSON file as `/api/contact`); Basic-Auth-protected `/admin/blogs`
  (full CRUD) → `POST/PUT/DELETE /api/blogs[/id]`; public `/blogs` +
  dynamically routed `/blogs/[slug]` → `GET /api/blogs` (public posts only).

## Commands (Windows PowerShell)

- Dev server: `npm.cmd run dev` → http://localhost:3000
- Production build: `npm.cmd run build`
- Lint: `npm.cmd run lint`
- Start built app: `npm.cmd run start`
- **Important:** plain `npm` / `npx` fail on this machine — PowerShell's
  execution policy blocks `npm.ps1`. Always use `npm.cmd` / `npx.cmd`.

## Structure

- `app/` — routes. One folder per segment; `page.js` renders the page.
- `app/api/contact/route.js` + `app/api/contacts/route.js` — thin POST
  handlers delegating to `lib/contactRoute.js`.
- `lib/jsonStore.js` — shared JSON persistence plumbing: module-level
  promise queue (`serializeWrite`), atomic temp-file + rename with
  EPERM/EBUSY retry, `readJsonArray`, `writeJsonArrayAtomic`, `nextId`.
- `lib/contactStore.js` — contact validation + append to
  `data/contact-submissions.json`.
- `lib/auth.js` — two equivalent credentials paths: **HTTP Basic Auth**
  (verifies the `Authorization` header against `ADMIN_USERNAME` + scrypt
  `ADMIN_PASSWORD_HASH`, timing-safe) and a **signed session cookie**
  (`admin_session`, HMAC-SHA256 of an `{exp}` payload, HttpOnly SameSite=Lax,
  7-day TTL; key = `SESSION_SECRET` or the password hash). Both
  `isAuthorized(request)` and `isAuthorizedFromHeaders()` accept either.
  `unauthorizedResponse()` sends `401` + `WWW-Authenticate: Basic`.
- `app/api/blogs/route.js` — GET (public posts for anonymous, all posts
  with valid auth) + POST (auth; slug auto-generated from title, deduped).
- `app/api/blogs/[id]/route.js` — PUT/DELETE (auth; `params` awaited).
- `app/api/auth/challenge/route.js` — 302 to `/admin/blogs` when
  authorized, else 401 + `WWW-Authenticate` (HTML retry page); top-level
  navigation target for the browser Basic Auth popup (which Chrome/Edge
  do not show for `fetch()`).
- `app/api/auth/login/route.js` — POST `{username, password}` → 200 +
  `Set-Cookie: admin_session` on success, 401 otherwise; DELETE clears the
  cookie.
- `app/admin/login/page.js` + `components/LoginForm.jsx` — styled login
  form posting to `/api/auth/login`; the primary sign-in UX (the browser
  Basic popup is a fallback, not required).
- `app/projects/[slug]/page.js` — dynamic route; slugs come from
  `data/projects.json` via `generateStaticParams`.
- `app/blogs/[slug]/page.js` — dynamic route; seeded slugs prerendered via
  `generateStaticParams` from `data/blog-posts.json`; runtime-created slugs
  render on demand inside `<Suspense>`; private/unknown slugs `notFound()`.
- `components/` — `NavBar.jsx`, `ProjectCard.jsx`, `ContactForm.jsx`,
  `AdminGate.jsx`, `BlogAdmin.jsx` (the client components).
- `components/ContactForm.jsx` takes an `endpoint` prop (default
  `/api/contact`); `/contact-me` passes `/api/contacts`.
- `data/projects.json` — project catalog (slug, title, tagline, description,
  tech, repo, demo). Static-imported by pages.
- `data/contact-submissions.json` — JSON array; each entry:
  `{ id, name, email, message, submittedAt }` (`submittedAt` ISO-8601 UTC).
  Shared by `/api/contact` and `/api/contacts`.
- `data/blog-posts.json` — JSON array; each entry: `{ id, slug, title,
  excerpt, content, tags, isPublic, createdAt, updatedAt }`.
- `scripts/hash-password.mjs` — one-off dev script that prints an
  `ADMIN_PASSWORD_HASH` line for `.env.local` (`node scripts/hash-password.mjs`
  or pass the password as an argument). `.env.local` is git-ignored.

## Hard constraints (assignment contract — breaking any of these is a defect)

- Route paths must match the spec exactly, including
  `/contact-me-server-form` (do not "clean up" the name).
- At least two projects must be reachable via `/projects/[slug]`, driven by
  `slug` values in `data/projects.json`.
- Form submissions must persist as JSON in `data/contact-submissions.json`
  (both `/api/contact` and `/api/contacts`); a rejected/failed submission
  must leave that file byte-identical and must not consume an id (ids are
  max-existing + 1).
- Concurrent writes (contact + blogs) are serialized through the
  module-level promise queue (`serializeWrite` in `lib/jsonStore.js`) plus
  atomic temp-file + rename with EPERM/EBUSY retry. This guarantees no lost
  updates or duplicate ids for a single server process (`next dev` /
  `next start`) — do not remove the queue. Multi-instance deployments would
  need a real file lock or database; out of scope.
- Never commit `.env.local` or any real admin password. The scrypt hash in
  `.env.local` is the only credential artifact; rotate it by re-running
  `scripts/hash-password.mjs`.
- Blog writes (POST/PUT/DELETE on `/api/blogs*`) require valid Basic Auth
  and must leave `data/blog-posts.json` byte-identical on failure; public
  pages and anonymous `GET /api/blogs` must never expose private posts and
  must never write to disk.
- Read-only pages (`/`, `/about-me`, `/projects`, `/projects/[slug]`,
  `/blogs`, `/blogs/[slug]`, `/contact-me`, `/contact-me-server-form`) must
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
- `Date.now()` (or any time-dependent call, e.g. session expiry checks) is
  forbidden during the prerender pass under `cacheComponents`. In a
  Suspense-wrapped server component, call `await connection()` from
  `next/server` BEFORE the time-dependent logic (see `AdminContent` in
  `app/admin/blogs/page.js`) — this opts the component into dynamic
  rendering and the prerender error goes away.
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
3. Work through `TEST-MATRIX.md` sections A–I in order against a running
   server (`npm.cmd run dev` or `npm.cmd run start`).
4. After any fix, re-run the entire failed section, not just the row.
5. Before recording the demo, re-run sections D, E, G, H and I end-to-end
   from clean data files.
