# Permit Portal — Citizen / Officer / Admin

Three fully separate Next.js portals in one app, each with its own login,
its own session cookie, and its own API surface. ERPNext is a pure backend —
no portal talks to Frappe Desk directly.

```
/citizen  → citizen_session cookie → Emirates ID + OTP login
/officer  → officer_session cookie → Staff ID + OTP login
/admin    → admin_session cookie   → Admin ID + OTP login
```

## 1. Install

```bash
npm install
```

## 2. Configure

`.env.local` is already filled in with your existing ERPNext credentials
(reused from the previous build) and a freshly generated `SESSION_SECRET`.
Only thing you must stand up yourself: **WireMock**.

```bash
docker run -it --rm -p 8080:8080 \
  -v "$(pwd)/wiremock/mappings:/home/wiremock/mappings" \
  wiremock/wiremock:latest
```

That loads every mapping in `/wiremock/mappings` automatically — no separate
import step. Restart WireMock any time you edit a mapping file.

## 3. Required ERPNext DocTypes

The API routes assume these doctypes exist on `operations.apps.grootan.com`.
Create the ones you don't have yet (field lists below are the minimum the
routes actually read/write — extend freely).

**Citizen Profile** — `emirates_id`, `phone`, `full_name`, `email`,
`nationality`, `date_of_birth`, `gender`, `card_expiry_date`

**Officer Profile** — `staff_id`, `full_name`, `email`, `agency`,
`department`, `designation`, `availability`

**Admin Profile** — `staff_id`, `full_name`, `email`

**Permit** (extends your existing schema) — add if missing: `applicant`
(link → Citizen Profile), `applicant_name`, `assigned_officer` (link →
Officer Profile), `current_stage_status`, `responsible_agency`,
`decision_remarks`, `decided_by`, `decided_on`, `deadline_status`,
`deadline_at`, `sla_due_at`, `sla_breached`, `forgery_flags` (child table:
`document`, `issue`, `severity`), `documents` (child table: `doc_type_code`,
`document_name`, `file_url`)

**State Transition Log** — `permit` (link), `from_status`, `to_status`,
`actor`, `timestamp`, `note`

## 4. Race-condition-safe officer accept

Copy `/frappe_custom_methods/permit_portal/api.py` into a custom Frappe app
(`apps/permit_portal/permit_portal/api.py`) and install it on the site. This
gives you two whitelisted methods:

- `permit_portal.api.accept_review` — atomic claim, returns HTTP 409 if
  another officer already claimed the case
- `permit_portal.api.record_decision` — APPROVED / REJECTED / CONDITIONAL

Without this app installed, `/officer/dashboard` → Accept and the case
decision buttons will fail — they call these methods directly, there's no
fallback path in the Next.js layer (the atomicity has to live in ERPNext's
single SQL transaction, not in application code).

## 5. Run

```bash
npm run dev
```

Open `http://localhost:3000` — portal picker links to all three logins.

## 6. Demo credentials (all OTPs are `1234`)

| Portal  | Identifier         | Name                |
|---------|---------------------|----------------------|
| Citizen | `784-1990-1234567-1` (+phone) | Tejash Kumar S |
| Citizen | `784-1995-7654321-2` (+phone) | Fatima Al Mazrouei |
| Officer | `OFC-1001`           | Aisha Al Suwaidi (DED) |
| Officer | `OFC-1002`           | Rashid Al Nuaimi (Civil Defence) |
| Admin   | `ADM-01`             | Tej Platform Admin |

Any Emirates ID / Staff ID not in `/wiremock/mappings` is rejected outright —
there is no signup fallback for any of the three roles, by design.

## 7. What's deliberately minimal

- **SLA tracking**: a `sla_due_at` field + one query on the admin dashboard.
  No ThingsBoard, no Superset — dropped by design for this rebuild.
- **OTP store**: in-memory (`lib/otp.ts`), single-process only. Fine for
  `next dev`; swap for Redis or a Frappe doctype before any multi-instance
  deploy.
- **File storage**: citizen document uploads still go through the existing
  Activepieces webhook (`ACTIVEPIECES_WEBHOOK_URL`) — untouched from the
  previous build, reused as-is.

## Folder map

```
app/
  citizen/   pages: login, dashboard, apply, applications, applications/[id]
  officer/   pages: login, dashboard, cases/[id]
  admin/     pages: login, dashboard
  api/citizen/...   API routes, session-gated by citizen_session
  api/officer/...   API routes, session-gated by officer_session
  api/admin/...     API routes, session-gated by admin_session
components/
  ui/        Spinner, Skeleton, Button, Card, StatusBadge, ErrorBanner, Toast, ConfidenceMeter
  citizen/ officer/ admin/   per-portal Header components
lib/
  config.ts       env + cookie names
  session.ts      HMAC-signed session tokens, one per role
  auth-helpers.ts getSession/unauthorized/serverError for route handlers
  frappe.ts       generic ERPNext REST + custom-method client
  wiremock.ts     citizen/officer/admin registry checks + OTP send
  otp.ts          demo OTP store (in-memory, dev-only)
middleware.ts     redirects to the right login page per portal prefix
wiremock/mappings/  WireMock stub files, load directly into WireMock
frappe_custom_methods/permit_portal/api.py   atomic accept + decision
```
