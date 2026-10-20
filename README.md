# VS CRM

The existing sales, recovery, technical, webinar and social-media UI uses Next.js, React, Prisma and PostgreSQL.

Use Node.js 22.12 or newer (the remediation was tested with Node 24). Install with `npm ci`, copy `.env.example` to `.env`, and configure a PostgreSQL connection and APP_URL. Keep SMTP, Google and Smartflo credentials outside source control.

For a new empty database, run `npm run db:migrate`, then provision the organization's users and configuration. Historical SQLite files are not used by this version. Demo seed scripts are for disposable development databases only.

For an existing PostgreSQL database, back it up and compare its schema to `prisma/migrations/0_baseline/migration.sql` before migration. Only when that original schema already matches, record the baseline with `prisma migrate resolve --applied 0_baseline`, then run `npm run db:migrate`. Do not run the baseline CREATE statements over an existing schema. None of these commands were run against a business database during remediation.

Run locally with `npm run dev`. For production, set an HTTPS APP_URL, configure real SMTP with TLS, run the migrations, `npm run check`, `npm run build`, and `npm start`. Sessions are opaque random tokens whose hashes, expiry and user relationship are stored in PostgreSQL. Legacy JSON cookies are rejected. Role/active-state changes take effect from current database data; logout, reset and account edits revoke stored sessions.

Google Drive authorization starts from the existing admin file manager. Its callback verifies a one-time session-bound state and stores the refresh token server-side in the database rather than rewriting environment files. Existing GOOGLE_REFRESH_TOKEN configuration remains supported. File deletion is restricted to the configured folder.

Payment imports keep a transactionally recorded row fingerprint so re-uploading the same row cannot add money again. A different legitimate payment must have a distinct payment reference/date or distinct row data. Existing UI templates and additional-payment workflows remain available. Attendance replacements parse the new CSV/XLSX completely before replacing records inside a transaction.

## Validation

- `npm run typecheck`: mandatory TypeScript validation; production builds also enforce it.
- `npm test`: PostgreSQL regression suite. Set TEST_DATABASE_URL to a disposable local database named vscrm_test. Tests fail if it is missing, a non-local host, or another database name.
- `npm run test:e2e`: real Chrome browser journeys through the local production build, PostgreSQL and a local SMTP receiver. Requires Chrome, a completed build and TEST_DATABASE_URL. The suite starts/stops its app and SMTP servers itself and creates test-only accounts.
- `npm run lint`: TypeScript and React correctness checks with zero warnings permitted. Explicit-any, unused variables, effect synchronization, memoization and hook-dependency checks are enforced as errors.
- `npm audit`: locked dependency advisory check.

An example disposable database is PostgreSQL 16 in a dedicated Docker container on localhost port 55439. Never reuse production credentials or volumes for tests. Browser tests use local-only email and do not initiate paid calls or mutate Google Drive.

External Google Drive and Smartflo acceptance still requires configured test accounts and explicit real-provider testing. Local tests do not prove production deployment, backup restoration, or carrier delivery.

Detailed lead queues, analytics detail tables, custom portals, manual dialer history and call history use bounded server queries. Existing page controls remain; tables without page controls load further server pages on scroll. Filters, totals, sorting and authorized record scope apply before paging. Exports cover the full matching set, cross-page selections remain available, and bulk assignment loads only the metadata needed by its existing controls. Webinar card counts are calculated in PostgreSQL; chart inputs omit personal lead fields. Database indexes and daily call/audit aggregates reduce reporting payloads.

Representative load testing remains separate from the local regression suite. Monthly incentive inputs are deterministic and month-filtered, but the existing lead-total/assignment attribution is not a per-payment accounting ledger.
