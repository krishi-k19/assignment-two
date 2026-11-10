# TEST-MATRIX.md — QA acceptance matrix for the portfolio

Every row must pass before submission. Run against a server on
http://localhost:3000 (`npm.cmd run dev`, or `npm.cmd run start` after
`npm.cmd run build`). Expected HTTP status in the **Status** column.

Legend for File column (`data/contact-submissions.json`): **–** untouched ·
**✎** created/modified · **↯** must remain byte-identical after the request.

## A. Landing page `/`

| # | Case | Action | Expected | Status |
|---|---|---|---|---|
| A1 | Page loads | open `/` | 200; hero heading with name, short intro | 200 |
| A2 | Nav complete | inspect header on `/` | links to Home, About Me, My Projects, Contact | 200 |
| A3 | CTAs | click both hero buttons | land on `/projects` and `/contact-me-server-form` | 200 |
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
| D5 | Server validation shown | submit with invalid email + 1-char message | inline field errors from server; message preserved | 400 |
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
| E5 | Bad email | body file with each of: `not-an-email`, `a@b`, `a@b.c`, `a@b..c`, `.a@b.com`, `a.@b.com`, `a..b@c.com`, `a@b.c.`, `a@-b.com`, `a@b.123` | `errors.email` for every variant; file byte-identical (↯); realistic formats pass (`ada@example.com`, `krish.k@example.co.in` → 201) | 400 |
| E6 | Short message | `@body-invalid.json` (also tests E5) | `errors.message` (min 10 chars); file byte-identical (↯) | 400 |
| E7 | Multiple errors | `@body-invalid.json` | both `errors.email` and `errors.message` present | 400 |
| E8 | Malformed JSON | `@body-malformed.json` | concise JSON error; file byte-identical (↯) | 400 |
| E9 | No id reuse | E1–E4 mix → valid submit | id = max existing + 1 (never re-uses a failed attempt's id) | 201 |
| E10 | Wrong method | `curl.exe -i http://localhost:3000/api/contact` | 405, no file change (↯) | 405 |
| E11 | Whitespace trim | `"name":"  Ada  "` | stored as `"Ada"` | 201 |
| E12 | Oversize fields | name > 200 chars / message > 5000 chars | 400 with length error | 400 |
| E13 | Concurrent submissions | fire 25 simultaneous valid POSTs (node `Promise.all` script) | every request 201; file has 25 records with unique contiguous ids 1–25; no lost updates | 201 |

## F. Cross-cutting

| # | Case | Action | Expected | Pass |
|---|---|---|---|---|
| F1 | Build | `npm.cmd run build` | exit 0, no type/lint errors | ☐ |
| F2 | Lint | `npm.cmd run lint` | exit 0 | ☐ |
| F3 | Route spec | `glob` `app/**/page.js` | `/`, `/about-me`, `/contact-me-server-form`, `/projects`, `/projects/[slug]` all exist with exact names | ☐ |
| F4 | Per-page titles | visit each page | tab title matches page (metadata per route) | ☐ |
| F5 | 404 page | open `/no-such-page` | not-found page renders | 404 |
| F6 | JS only | search repo for `.ts`/`.tsx` sources | none (jsconfig.json, .js/.jsx only) | ☐ |
| F7 | Dark mode | toggle OS appearance | layout stays readable (uses `dark:` variants) | ☐ |
| F8 | Mobile | 375px viewport | nav and pages usable, no horizontal scroll | ☐ |
| F9 | Submissions format | open `data/contact-submissions.json` | valid JSON array, pretty-printed | ☐ |

## Verification workflow

1. `npm.cmd run build`, then serve (`npm.cmd run start`) — or just
   `npm.cmd run dev`.
2. Run sections A–F in order; A–C build on each other.
3. Any failed row → fix → re-run the **entire** section (not just the row).
4. Before recording the demo, re-run sections D and E from a clean
   `data/contact-submissions.json` (`echo [] > data\contact-submissions.json`).
