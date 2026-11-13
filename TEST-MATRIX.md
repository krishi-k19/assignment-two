# TEST-MATRIX.md — QA acceptance matrix for the portfolio

Every row must pass before submission. Run against a server on
http://localhost:3000 (`npm.cmd run dev`, or `npm.cmd run start` after
`npm.cmd run build`). Expected HTTP status in the **Status** column.

Legend for File columns (`data/contact-submissions.json`,
`data/blog-posts.json`): **–** untouched · **✎** created/modified · **↯**
must remain byte-identical after the request.

## A. Landing page `/`

| # | Case | Action | Expected | Status |
|---|---|---|---|---|
| A1 | Page loads | open `/` | 200; hero heading with name, short intro | 200 |
| A2 | Nav complete | inspect header on `/` | links to Home, About Me, My Projects, Contact | 200 |
| A3 | CTAs | click both hero buttons | land on `/projects` and `/contact-me` | 200 |
| A4 | Static render | `npm.cmd run build` output | `/` prerendered (static), no server marker | 200 |

## B. About Me `/about-me`

| # | Case | Action | Expected | Status |
|---|---|---|---|---|
| B1 | Page loads | open `/about-me` | 200; `h1` "About Me"; bio, skills, experience sections filled in (no placeholder text left) | 200 |
| B2 | Own metadata | check browser tab | title is "About Me", not "My Portfolio" | 200 |
| B3 | Read-only | snapshot `data/` before/after | no files created or modified | 200 |

## C. Projects `/projects` + `/projects/[slug]`

| # | Case | Action | Expected | Status |
|---|---|---|---|---|
| C1 | Listing | open `/projects` | card for every entry in `data/projects.json` (title, tagline, tech chips) | 200 |
| C2 | Card links | click each card | lands on `/projects/student-grade-tracker` and `/projects/personal-budget-planner` | 200 |
| C3 | Detail page | open `/projects/student-grade-tracker` | title, tagline, description, tech, repo/demo links, "Back to all projects" link | 200 |
| C4 | Second detail | open `/projects/personal-budget-planner` | same fields, different content (data-driven, not copied markup) | 200 |
| C5 | Unknown slug | open `/projects/does-not-exist` | branded "Page not found" page, no crash. Status: 404 in dev; in production PPR streams a 200 shell with the not-found UI (platform behavior under `cacheComponents`) | 404/200 |
| C6 | Data-driven add | append a third object with unique `slug` to `projects.json` (dev server) | third card appears; `/projects/<new-slug>` renders | 200 |
| C7 | Prerendered | `npm.cmd run build` output | `[…/projects/[slug]]` prerenders both (all) slugs via `generateStaticParams` | 200 |
| C8 | Read-only | snapshot `data/contact-submissions.json` before/after browsing | byte-identical (↯) | 200 |

## D. Contact form `/contact-me-server-form`

| # | Case | Action | Expected | Status |
|---|---|---|---|---|
| D1 | Page loads | open `/contact-me-server-form` | 200; form with Name, Email, Message fields and submit button | 200 |
| D2 | Required fields | submit empty form | browser blocks (required attrs); no request sent | — |
| D3 | Happy path | submit name + valid email + message ≥ 10 chars | success message shown; form clears | 201 |
| D4 | Repeat submit | submit again (D3) | second success; two records on disk | 201 |
| D5 | Server validation shown | submit with invalid email | inline field error from server; name/message no longer have length rules (only blank-after-trim rejects) | 400 |
| D6 | Network resilience | stop server, submit | friendly "Network error" message, no crash | — |

## E. API `POST /api/contact` + JSON persistence

Setup: put request bodies in temp files (inline JSON with spaces is mangled
by PowerShell 5.1):

```powershell
$body = "$env:TEMP\body.json"
Set-Content "$env:TEMP\body-valid.json" '{"name":"Ada Lovelace","email":"ada@example.com","message":"Hello, I love your portfolio!"}' -Encoding ascii
Set-Content "$env:TEMP\body-invalid.json" '{"name":"Bad","email":"nope","message":"hi"}' -Encoding ascii
Set-Content "$env:TEMP\body-malformed.json" '{oops' -Encoding ascii
```

Each row: replace `@BODYFILE` with the file above. Verify file integrity by
comparing `Get-FileHash data\contact-submissions.json` before/after failed
rows.

| # | Case | Action (curl.exe, PowerShell-safe single quotes) | Expected | Status |
|---|---|---|---|---|
| E1 | Valid submission | `curl.exe -s -i -X POST http://localhost:3000/api/contact -H "Content-Type: application/json" -d "@body-valid.json"` | body `{"ok":true,"id":1}`; file gets the record | 201 |
| E2 | Record shape | inspect `data/contact-submissions.json` | array with `{id, name, email, message, submittedAt}`; `submittedAt` ISO-8601 UTC; strings trimmed | 201 |
| E3 | Monotonic ids | repeat E1 | next record `id: 2` | 201 |
| E4 | Missing name | body file with `name` omitted | `errors.name` "Name is required."; nothing else leaks | 400 |
| E5 | Email rules | body file with each of: `a@b.c`, `.a@b.com`, `a.@b.com`, `a..b@c.com`, `a@-b.com`, `a@b.123` | all ACCEPTED (exactly one `@`, nonempty local, ≥2 nonempty domain labels, no whitespace) | 201 |
| E5b | Email rejections | body file with each of: `a@b` (one label), `a@b..c` + `a@b.c.` (empty label), `not-an-email` (no `@`), `a@b@c.com` (two `@`), `a b@c.com` / `a@b c.com` (internal whitespace), `"  ada@example.com  "` / trailing tab (padding) | `errors.email` for every variant; file byte-identical (↯) | 400 |
| E6 | Blank message | body with whitespace-only message | `errors.message` "Message is required."; file byte-identical (↯) | 400 |
| E7 | Multiple errors | body file with blank name + invalid email + blank message | `errors.name`, `errors.email`, and `errors.message` all present | 400 |
| E8 | Malformed JSON | `@body-malformed.json` | concise JSON error; file byte-identical (↯) | 400 |
| E9 | No id reuse | E1–E4 mix → valid submit | id = max existing + 1 (never re-uses a failed attempt's id) | 201 |
| E10 | Wrong method | `curl.exe -i http://localhost:3000/api/contact` | 405, no file change (↯) | 405 |
| E11 | Whitespace trim | `"name":"  Ada  "` | stored as `"Ada"` | 201 |
| E12 | Length rules removed | name/message of any length (only blank-after-trim rejects) | accepted; stored as submitted (trimmed) | 201 |
| E13 | Concurrent submissions | fire 25 simultaneous valid POSTs (node `Promise.all` script) | every request 201; file has 25 records with unique contiguous ids 1–25; no lost updates | 201 |

## F. Cross-cutting

| # | Case | Action | Expected | Pass |
|---|---|---|---|---|
| F1 | Build | `npm.cmd run build` | exit 0, no type/lint errors | ☐ |
| F2 | Lint | `npm.cmd run lint` | exit 0 | ☐ |
| F3 | Route spec | `glob` `app/**/page.js` | `/`, `/about-me`, `/contact-me-server-form`, `/contact-me`, `/projects`, `/projects/[slug]`, `/blogs`, `/blogs/[slug]`, `/admin/blogs` all exist with exact names | ☐ |
| F4 | Per-page titles | visit each page | tab title matches page (metadata per route) | ☐ |
| F5 | 404 page | open `/no-such-page` | not-found page renders | 404 |
| F6 | JS only | search repo for `.ts`/`.tsx` sources | none (jsconfig.json, .js/.jsx only) | ☐ |
| F7 | Dark mode | toggle OS appearance | layout stays readable (uses `dark:` variants) | ☐ |
| F8 | Mobile | 375px viewport | nav and pages usable, no horizontal scroll | ☐ |
| F9 | Submissions format | open `data/contact-submissions.json` | valid JSON array, pretty-printed | ☐ |

## G. Contact Me `/contact-me` + `POST /api/contacts` (reuses `/api/contact` plumbing)

| # | Case | Action | Expected | Status |
|---|---|---|---|---|
| G1 | Page loads | open `/contact-me` | 200; form with Name, Email, Message fields and submit button | 200 |
| G2 | Valid submission | `curl.exe -s -X POST http://localhost:3000/api/contacts -H "Content-Type: application/json" -d "@body-valid.json"` | body `{"ok":true,"id":N}`; record lands in `data/contact-submissions.json` — **the same file** as `/api/contact` | 201 |
| G3 | Shared monotonic ids | submit valid via `/api/contact` then via `/api/contacts` | ids continue max-existing + 1 across both endpoints | 201 |
| G4 | Server validation | `@body-invalid.json` to `/api/contacts` | `errors.email` + `errors.message`; file byte-identical (↯) | 400 |
| G5 | Malformed JSON | `@body-malformed.json` to `/api/contacts` | concise JSON error; file byte-identical (↯) | 400 |
| G6 | Wrong method | `curl.exe -i http://localhost:3000/api/contacts` | 405, no file change (↯) | 405 |
| G7 | Concurrency | 15 parallel valid POSTs to `/api/contacts` (node `Promise.all`) | every request 201; contiguous unique ids; no lost updates | 201 |
| G8 | Old route intact | re-run sections D and E | `/contact-me-server-form` + `/api/contact` behave exactly as before the refactor | 200/201/400 |
| G9 | Wrong types rejected | POST `{"name":{"a":1},"email":123,"message":true}` | 400 `must be a string` field errors (no silent coercion); file ↯ | 400 |

## H. Basic Auth + `/api/blogs` (GET/POST) + `/api/blogs/[id]` (PUT/DELETE)

Setup: `.env.local` holds `ADMIN_USERNAME` and `ADMIN_PASSWORD_HASH`
(scrypt, generated by `scripts/hash-password.mjs`; never committed). All
authed curl rows use `-u admin:<password>`. Verify file integrity with
`Get-FileHash data\blog-posts.json` before/after failed rows.

| # | Case | Action | Expected | Status |
|---|---|---|---|---|
| H1 | Anon list = public only | `curl.exe http://localhost:3000/api/blogs` | 200 `{posts:[...]}`; only `isPublic:true`, newest first | 200 |
| H2 | Write requires auth | POST /api/blogs without creds | 401 JSON error + `WWW-Authenticate: Basic` header; file ↯ | 401 |
| H3 | Wrong password | POST / PUT with `-u admin:wrongpass` | 401; file ↯ | 401 |
| H4 | Create | POST valid `{title, content, ...}` with creds | 201 `{ok:true, id, slug}`; record in `data/blog-posts.json` with `createdAt`/`updatedAt` ISO-8601 UTC | 201 |
| H5 | Auto slug | POST without `slug` | slug generated from title (lowercase, hyphenated) | 201 |
| H6 | Slug dedupe | POST a title that produces an existing slug | slug gets `-2` suffix, never overwrites | 201 |
| H7 | Field validation | POST with empty title and content | `errors.title` + `errors.content`; file ↯ | 400 |
| H8 | Auth list = all | `curl.exe -u ... http://localhost:3000/api/blogs` | includes private posts | 200 |
| H9 | Edit | `PUT /api/blogs/1 -d '{"title":"New"}'` | 200; title + `updatedAt` change; `slug` and `createdAt` stable | 200 |
| H10 | Unknown id | `PUT`/`DELETE /api/blogs/999` with creds | 404 `{"error":"Blog post not found."}`; file ↯ | 404 |
| H11 | Bad id | `PUT /api/blogs/abc` with creds | 400 id error | 400 |
| H12 | Delete | `DELETE /api/blogs/{id}` with creds, then again | first 200 + record gone; repeat 404; file ↯ on the repeat | 200/404 |
| H13 | Challenge endpoint | `GET /api/auth/challenge` without / with creds | 401 + `WWW-Authenticate` HTML retry page / 302 redirect to `/admin/blogs` | 401/302 |
| H13 | Challenge endpoint | `GET /api/auth/challenge` without / with creds | 401 + `WWW-Authenticate` HTML retry page / 302 redirect to `/admin/blogs` | 401/302 |
| H13b | Login page flow | click Sign in on `/admin/blogs` → `/admin/login` → submit admin creds | styled login form; valid creds redirect to `/admin/blogs` showing the admin panel; invalid creds show an inline error | 200 |
| H13c | Login API | `POST /api/auth/login` wrong / right creds | 401 `{"error":"Invalid username or password."}` / 200 + `Set-Cookie: admin_session=…` (HttpOnly, SameSite=Lax, 7-day Max-Age) | 401/200 |
| H13d | Cookie authorizes API + pages | replay the `admin_session` cookie on `GET /api/blogs` and `/admin/blogs` | private posts visible in API; admin panel renders (no gate); Basic header also still accepted everywhere | 200 |
| H14 | isPublic string coercion | POST with `"isPublic":"false"` / `"true"` / `false` | post is private / public / private respectively (never `Boolean("false")` → public) | 201 |
| H15 | isPublic garbage | POST with `"isPublic":"maybe"` | 400 `errors.isPublic`; file ↯ | 400 |
| H16 | Wrong-type blog fields | POST/PUT with `{"title":123}` or `{"tags":["ok",5]}` | 400 `must be a string` / `Tags must be a list of strings.`; file ↯ | 400 |
| H17 | Update without fields | `PUT /api/blogs/1 -d '{"unknown":"x"}'` | 400 `errors.form`; file ↯ | 400 |

## I. Admin `/admin/blogs` + public `/blogs` + dynamic `/blogs/[slug]`

| # | Case | Action | Expected | Status |
|---|---|---|---|---|
| I1 | Admin gate | open `/admin/blogs` signed out | sign-in panel, no post data, no crash | 200 |
| I2 | Admin signed in | sign in (browser popup or challenge), reload | post list with Edit / Make private / Delete controls and New post form | 200 |
| I3 | Create via admin UI | fill New post form, publish | 201; post appears in list instantly | 201 |
| I4 | Blog list | open `/blogs` | cards for **public** posts only (title, date, tags, excerpt) | 200 |
| I5 | Dynamic post page | open `/blogs/{slug}` of a public post | title, date, tags, paragraphs, "Back to all posts" | 200 |
| I6 | Runtime routing | create a post via API/admin, then open `/blogs/{new-slug}` without rebuilding | page renders (dynamic segment picks up runtime slugs) | 200 |
| I7 | Private hidden | toggle a post private, open `/blogs` then `/blogs/{its-slug}` | absent from list; its slug serves the not-found UI | 200/404 |
| I8 | Unknown slug | open `/blogs/does-not-exist` | branded not-found page, no crash | 404/200 |
| I9 | Nav | inspect header on `/` | Blog link → `/blogs`; Contact → `/contact-me`; `/contact-me-server-form` still directly reachable | 200 |
| I10 | Read-only public pages | snapshot both data files before/after browsing `/blogs` + `/blogs/[slug]` | byte-identical (↯) | 200 |

## Verification workflow

1. `npm.cmd run build`, then serve (`npm.cmd run start`) — or just
   `npm.cmd run dev`.
2. Run sections A–I in order; A–C build on each other.
3. Any failed row → fix → re-run the **entire** section (not just the row).
4. Before recording the demo, re-run sections D and E from a clean
   `data/contact-submissions.json` (`echo [] > data\contact-submissions.json`),
   and G–I from a clean `data/blog-posts.json`.
