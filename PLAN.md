# PLAN.md — build plan for assignment two (Next.js portfolio)

Status legend: ✅ done (scaffolded) · 🔲 to do (fill in during build).

## 0. What the assignment requires

| Requirement | Where it lives |
|---|---|
| Landing page `/` | `app/page.js` |
| About Me `/about-me` | `app/about-me/page.js` |
| Contact Me Server Form `/contact-me-server-form` | `app/contact-me-server-form/page.js` |
| My Projects `/projects` | `app/projects/page.js` |
| Two dynamic project pages `/projects/[slug]` | `app/projects/[slug]/page.js` |
| Dynamic routing driven by slug | `generateStaticParams` + `data/projects.json` |
| Contact form submissions saved as JSON | `POST /api/contact` → `data/contact-submissions.json` |

## 1. Scaffold — ✅ done

- `npx.cmd create-next-app@latest .` with JavaScript, Tailwind 4, App Router,
  ESLint, `@/*` import alias. Stack: Next 16.4.6, React 19.3, Tailwind 4.3.
- Files created: `app/layout.js` (NavBar + footer), `app/page.js` (hero stub),
  `app/about-me/page.js`, `app/contact-me-server-form/page.js`,
  `app/projects/page.js`, `app/projects/[slug]/page.js`,
  `app/api/contact/route.js`, `components/{NavBar,ProjectCard,ContactForm}.jsx`,
  `data/{projects.json,contact-submissions.json}`.

## 2. Architecture decisions (why it is built this way)

- **Static JSON import for projects.** `data/projects.json` is imported at
  build time (`import projects from "@/data/projects.json"`), so `/projects`
  and `/projects/[slug]` stay fully static and read-only. No `fs` on those
  pages.
- **`generateStaticParams`.** `next.config.mjs` enables `cacheComponents`,
  which requires either `generateStaticParams` or Suspense for dynamic
  segments. Both slugs are provided at build time; unknown slugs hit the
  defensive `notFound()` in the page. (`dynamicParams` route config is
  rejected under `cacheComponents` — do not add it.)
- **Suspense around params access.** The `[slug]` page renders its content
  inside `<Suspense>`; without it, the dev overlay shows an "instant
  navigation" insight when clicking project links. Dev-only hint, but the
  Suspense fix keeps the demo overlay clean.
- **API Route (not Server Action) for the form.** Chosen explicitly:
  `components/ContactForm.jsx` is `"use client"` and `fetch`es
  `POST /api/contact`; `app/api/contact/route.js` validates, then appends to
  `data/contact-submissions.json` with `node:fs/promises`.
- **Validation lives server-side.** The client sends JSON
  `{name, email, message}`; the route trims, validates, and returns either
  `201 {ok, id}` or `400 {errors: {field: message}}`. IDs are
  `max(existing ids) + 1`; a rejected write never touches the file.
- **`fs` only in the route handler.** Keeps the pages static; only the POST
  path can write. Works with `next dev` and `next start` (local Node host —
  a serverless host like Vercel would need a DB, fine for this assignment).

## 3. Fill-in work — 🔲 to do

1. **`data/projects.json`** — replace both placeholder projects with real
   ones (your repos). Keep each `slug` unique, lowercase, hyphenated — it is
   the URL. Set `demo` to `""` if none.
2. **`app/page.js`** — replace `[Your Name]` and the intro sentence.
3. **`app/about-me/page.js`** — real bio, skills, experience (3–5 sentences
   each is plenty).
4. **`app/layout.js`** — replace `[Your Name]` in the footer and the
   `metadata.description`.
5. **Polish pass (optional but graded on look):**
   - Add a headshot/avatar to `public/` and show it on `/about-me`.
   - Add `next/image` screenshots to project detail pages (add an
     `image` field to the JSON schema).
   - Add `export const metadata` tweaks or an `favicon.ico` if desired.
6. **Delete scaffold leftovers** if unused: `public/*.svg` demo assets.

## 4. Verification & submission

1. `npm.cmd run build` → must succeed; both project slugs prerendered.
2. `npm.cmd run lint` → must pass.
3. Run `TEST-MATRIX.md` sections A–F against the server (see that file for
   curl commands).
4. Replace every "Replace this…" placeholder (grep the repo to be sure).
5. Commit with a clean message; screenshot the running site for submission.

## 5. Known gotchas (Next.js 16, verified against bundled docs)

- `params` is a **Promise** in pages, metadata, and route handlers — always
  `await` it.
- `cacheComponents: true` means a dynamic segment without
  `generateStaticParams` needs `<Suspense>` around param reads. Don't remove
  `generateStaticParams` from `app/projects/[slug]/page.js`.
- On this machine use `npm.cmd` / `npx.cmd` (PowerShell blocks `npm.ps1`).
