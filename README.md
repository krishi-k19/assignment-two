# ISBA 2438 — Assignment 2 Portfolio

A personal portfolio website for Krishi Konindala built with Next.js (App
Router), React, and Tailwind CSS. Part 1 covers the static pages and
dynamically routed project pages; **Part 2 adds an API-backed contact form
and full blog management** — a protected admin panel that writes posts to
JSON, plus a public blog that renders them with dynamic per-post routes.

## Local setup

Prerequisites: Node.js (18+; developed on Node 26) and npm. On Windows
PowerShell use `npm.cmd` (plain `npm` can be blocked by the execution
policy).

```powershell
npm.cmd install        # install dependencies
npm.cmd run dev        # dev server → http://localhost:3000
```

Production mode:

```powershell
npm.cmd run build      # compile + prerender
npm.cmd run start      # serve the production build on http://localhost:3000
npm.cmd run lint       # ESLint (passes with 0 errors)
```

## Admin setup

Blog administration is protected by credentials stored in `.env.local`
(git-ignored — never commit it). The password is stored only as a
**scrypt hash**.

1. Generate a hash (prints an `ADMIN_PASSWORD_HASH=...` line):

   ```powershell
   node scripts/hash-password.mjs
   # or: node scripts/hash-password.mjs "<your-password>"
   ```

2. Create `.env.local` in the project root:

   ```text
   ADMIN_USERNAME=<your-admin-username>
   ADMIN_PASSWORD_HASH=<paste-the-full-scrypt-line-from-step-1>
   ```

3. Restart the server, open [`/admin/blogs`](app/admin/blogs/page.js), click
   **Sign in**, and log in at `/admin/login`. Signing in sets an
   HttpOnly, HMAC-signed session cookie (7-day expiry). The original
   username/password verification stays available for `curl` via HTTP Basic
   Auth on every write endpoint.

## Pages and routes

| Route | What visitors see |
|---|---|
| `/` | Home — hero, intro, CTA buttons to Projects and Contact ([app/page.js](app/page.js)) |
| `/about-me` | Bio, skills, experience ([app/about-me/page.js](app/about-me/page.js)) |
| `/projects` | Cards for every project in `data/projects.json` ([app/projects/page.js](app/projects/page.js)) |
| `/projects/[slug]` | Project detail; e.g. `/projects/product-inventory-cli`, `/projects/vulrank`, `/projects/cyclone-cnn` ([app/projects/%5Bslug%5D/page.js](app/projects/%5Bslug%5D/page.js)) |
| `/contact-me` | Contact form that posts to `/api/contacts` ([app/contact-me/page.js](app/contact-me/page.js)) |
| `/contact-me-server-form` | Original graded contact form that posts to `/api/contact` ([app/contact-me-server-form/page.js](app/contact-me-server-form/page.js)) |
| `/blogs` | Public list of published posts ([app/blogs/page.js](app/blogs/page.js)) |
| `/blogs/[slug]` | Blog post detail; e.g. `/blogs/from-computer-science-to-business-analytics`, `/blogs/what-building-vulrank-taught-me` ([app/blogs/%5Bslug%5D/page.js](app/blogs/%5Bslug%5D/page.js)) |
| `/admin/blogs` | Protected blog manager (list, create, edit, delete, publish/private) ([app/admin/blogs/page.js](app/admin/blogs/page.js)) |
| `/admin/login` | Admin sign-in form ([app/admin/login/page.js](app/admin/login/page.js)) |

Unknown slugs: a project or blog slug that does not exist (or a blog post
marked private) renders the branded not-found page — a hard `404` in dev;
the production build streams a `200` shell whose content is the not-found
UI (Next.js partial prerendering behavior under `cacheComponents`).

## Contact flow

- `/contact-me` renders the shared [`ContactForm`](components/ContactForm.jsx)
  with `endpoint="/api/contacts"`.
- `/contact-me-server-form` renders the same component with the default
  `endpoint="/api/contact"`.
- Both routes delegate to one handler ([lib/contactRoute.js](lib/contactRoute.js))
  and append to the **same file**, [`data/contact-submissions.json`](data/contact-submissions.json),
  with ids assigned as max-existing + 1.
- Validation ([lib/contactStore.js](lib/contactStore.js)), currently
  implemented:
  - **Name / message** — must be strings; rejected only when blank after
    trimming (`"Name is required."` / `"Message is required."`). No minimum
    or maximum length.
  - **Email** — rejected unless it has exactly one `@`, a nonempty local
    part, a domain of at least two nonempty dot-separated labels, and no
    whitespace anywhere. Padded addresses (`"  a@b.com  "`), internal
    spaces, tabs, one-label domains, and double `@`s are all rejected —
    the value is never trimmed into acceptance.
  - Non-string values (`{"name": {...}}`) return a 400 field error instead
    of being coerced.
- Field errors return `400 { "errors": { field: message } }` and render
  inline under each input; a valid submit returns `201` and shows the
  success panel. A rejected or failed request leaves the JSON file
  byte-identical (verified by hash before/after in testing).
- Writes are serialized through a module-level promise queue and saved with
  an atomic temp-file + rename ([lib/jsonStore.js](lib/jsonStore.js));
  15 concurrent submissions produced 15× `201` with contiguous unique ids.

## Blog flow

- The admin panel ([components/BlogAdmin.jsx](components/BlogAdmin.jsx)) is
  a client component that talks to the JSON API:
  `POST /api/blogs` (create), `PUT /api/blogs/[id]` (edit / visibility),
  `DELETE /api/blogs/[id]` (remove), `GET /api/blogs` (list).
- Every write requires auth (session cookie or Basic Auth); unauthenticated
  writes get `401`.
- Validation ([lib/blogStore.js](lib/blogStore.js)): `title` and `content`
  are required strings; `slug`, `excerpt`, and `tags` are optional
  (tags must be an array of strings, max 10); `isPublic` must be a boolean
  (or `"true"`/`"false"`), defaulting to public. Invalid input returns
  `400` field errors and the file is left byte-identical.
- **Slugs** are generated from the title (lowercase, hyphenated, trimmed to
  80 chars) and de-duplicated with a numeric suffix — creating a second
  "Runtime Rendered Post" yields `runtime-rendered-post-2`. A slug only
  changes if you explicitly edit it.
- Each post is saved to [`data/blog-posts.json`](data/blog-posts.json) as
  `{ id, slug, title, excerpt, content, tags, isPublic, createdAt,
  updatedAt }` using the same queue + atomic-write pattern.
- **Visibility**: anonymous `GET /api/blogs` returns only `isPublic: true`
  posts (newest first); an authorized request returns all. `/blogs` renders
  cards from the public list, and `/blogs/[slug]` streams the post's
  content — private and unknown slugs serve the not-found UI. Posts created
  at runtime are picked up by the dynamic route without a rebuild; slugs
  present in the data file at build time are additionally prerendered via
  `generateStaticParams`.

## Verification and development notes

- [`TEST-MATRIX.md`](TEST-MATRIX.md) — full QA acceptance matrix (sections
  A–I) covering every page, the contact endpoints, auth, blog CRUD, and
  public visibility, with curl commands and expected statuses.
- [`PROMPT-LOG.md`](PROMPT-LOG.md) — chronological log of the prompts used
  to build the project.
- [`AGENTS.md`](AGENTS.md) — architecture notes and hard constraints for
  coding agents (queue location, `cacheComponents` gotchas, secret
  handling).

Manual smoke checklist (outcomes recorded during testing on
`http://localhost:3000`):

1. **Valid contact submission** — fill Name, clean email
   (`ada@example.com`), and Message `Hi` on `/contact-me` → success panel
   shows; a record lands in `data/contact-submissions.json` (observed:
   `201 {"ok":true,"id":4}`, stored message `"Hi"`).
2. **Invalid contact submission** — submit a padded email
   (`"  ada@example.com  "`) or a blank name/message → red inline field
   error, **no** record added (file hash verified byte-identical before/after).
3. **Publish and open a post** — in `/admin/blogs`, create a post (slug
   auto-generated), then open `/blogs/<slug>` — the post renders without a
   rebuild; the post also appears in the `/blogs` list.
4. **Private post** — toggle a post to private via the admin panel → it
   disappears from `/blogs` and its slug serves the not-found page.
5. **Unknown slug** — visit `/blogs/does-not-exist` or
   `/projects/does-not-exist` → branded "Page not found" page, no crash.
