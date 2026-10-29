# TutorDesk Web — Status & Remaining Work

React 19 + Vite + TypeScript web app for tuition admins and staff. Part of three repos:
`tutordesk-app` (Flutter), `tutordesk-web` (this), `tutordesk-backend` (Node API).

## Setup

```bash
# Backend first (tutordesk-backend): npm install && npm start   -> http://localhost:4000
npm install
npm run dev          # http://localhost:5173 (proxies /api to :4000)
npm run typecheck
npm run build
```

## What works

- **Real accounts:** log in (phone/email + password), register a tuition, or join as
  staff with an invite code. No demo picker any more.
- Same backend and data as the mobile app — changes in one show up in the other.
- Dashboard (with a "Get started" card for a new tuition), students (list, profile,
  admission with live fee calculation), attendance (mark, lock, 409 handling, admin
  correction, notify parents), fees (admin only), exams (create, marks, publish, send
  results), messages (batches, live status, retry failed, announcements), staff
  (add, invite code, reset, permissions, assigned classes), years & classes (create
  class, create year, promotion), notifications.

## Not verified yet

Typecheck and production build pass, but the updated site has **not been clicked
through against the new database backend yet**.

## Remaining work

1. End-to-end testing against the real backend; add Vitest/RTL tests and a Playwright smoke test.
2. Missing UI: edit student, edit class / assign staff to class, settings & profile page,
   reports page, SMS settings view.
3. Production config: `VITE_API_URL` (today only the dev proxy), deployment with HTTPS.
4. Pagination/server-side search for large tuitions; accessibility pass (dialog focus trap).
