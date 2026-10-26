# TutorDesk Web — Remaining Work

React + Vite + TypeScript web app for tuition admin and staff. Part of three repos:
`tutordesk-app` (Flutter), `tutordesk-web` (this), `tutordesk-backend` (Node API).

## Current state

- **First pass written, not yet run in a browser.** Work stopped right after
  `tsc` (no errors) and `vite build` (succeeds). Nobody has clicked through the UI yet,
  so expect small runtime and layout issues.
- Pages: demo login (admin / staff picker), dashboard, students list, profile, new
  admission (with live fee calculation), attendance today, marking (handles the 409
  "already marked" response), session summary with admin correction and notify parents,
  fees overview and per-enrollment detail (record payment, set fee plan), exams list and
  create, exam detail (results, marks entry, publish, send results), messages with
  announcement composer, live batch status with retry, staff list and add, staff
  permissions, years, classes and promotion, notifications.
- Same design language as the app (dark, turquoise `#00D9A6`, cream `#F3EFE4`), in
  `src/styles.css`.
- No dependencies beyond React, React Router and Vite.

## Setup

```bash
# 1. Start the API (tutordesk-backend)
cd ../tutordesk-backend && npm install && npm start     # http://localhost:4000

# 2. Start the web app
npm install
npm run dev            # http://localhost:5173 (proxies /api to :4000)
npm run typecheck
npm run build
```

## Remaining work (suggested order)

1. **First run and fix-up.** Click through every page as admin and as each staff member
   (Sneha has messaging, Amit doesn't, and so on). Fix runtime errors, layout and empty states.
   Check the mobile breakpoint (sidebar becomes a top bar under 860px).
2. **Tests.** Add Vitest + React Testing Library: role-based nav (staff never see Fees,
   Staff, Years), forms and validation, the 409 attendance flow. Add a Playwright smoke test
   against a running backend.
3. **Missing UI for endpoints that already exist:**
   - Edit student (`PATCH /api/students/:id`)
   - Add / edit class and assign staff (`POST/PATCH /api/classes`, `PUT /api/classes/:id/staff`)
   - Create academic year (`POST /api/academic-years`)
   - SMS settings view (`GET /api/messages/sms-settings`)
   - Profile / settings page
4. **Pages the Flutter app has but web doesn't yet:** Reports (needs backend endpoints),
   per-student report card view, announcement to selected parents (the API accepts `studentIds`).
5. **Real authentication** once the backend has it: login page, token refresh, logout
   everywhere. Remove or dev-gate the demo picker.
6. **Data handling:** pagination and server-side search for large tuitions, request
   cancellation, an optimistic or "saving…" pattern. A small query library (e.g. TanStack
   Query) could replace `src/lib/hooks.ts` if needed.
7. **Production config:** API base URL via env (`VITE_API_URL`; currently only the dev
   proxy), deployment (static hosting + API domain), error monitoring.
8. **Accessibility pass:** keyboard flow through dialogs (focus trap), screen-reader labels
   on tables, contrast check of muted text.

## Notes

- The UI hides what a role can't use, but the **backend enforces it** (403s). Don't rely on
  the UI for security.
- Message batches are idempotent on the server. The announcement composer sends a
  per-draft `draftKey` so double-clicks can't create two batches.
- `typescript` resolved to v7 (native compiler). If tooling has problems, pin `typescript@5`.
