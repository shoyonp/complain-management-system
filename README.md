# DIU Student Complaint Management System

A privacy-preserving complaint management system for Dhaka International University. Students submit complaints without exposing their identity to staff; admins triage, assign and resolve them; analytics surface recurring campus problems. The AI integration layer is defined but disabled by default.

**Current status: M1 Auth and RBAC** — Firebase signup/login with email verification, MongoDB profiles, role-based access control, the app shell, and the admin student-verification queue.

## Repository layout

This is one repository with two independent npm projects:

```
backend/    Express 5 API (ES modules, plain JavaScript)
frontend/   React 19 + Vite SPA
docs/       BLUEPRINT.md (source of truth) and project documents
```

## Stack

| Layer    | Choice                                                                 |
| -------- | ---------------------------------------------------------------------- |
| Frontend | React, Vite, React Router, Axios, TanStack Query, Tailwind + shadcn/ui |
| Backend  | Node.js, Express, MongoDB (Mongoose)                                   |
| Auth     | Firebase Authentication; roles live in MongoDB                         |
| Testing  | Jest + Supertest (API), Vitest + React Testing Library (web)           |
| Tooling  | ESLint 9+ flat config, Prettier, conventional commits                  |

## Quick start

You need a Firebase project (Authentication → Email/Password enabled) and either a MongoDB Atlas cluster or the in-memory dev database.

```bash
# API
cd backend
npm install
cp .env.example .env          # then fill in FIREBASE_* (see backend/README.md)
npm run dev:memdb             # http://localhost:5000/health (in-memory MongoDB)
# or: npm run dev             # requires MONGODB_URI in .env

# Web (second terminal)
cd frontend
npm install
cp .env.example .env          # then fill in VITE_FIREBASE_*
npm run dev                   # http://localhost:5173
```

Windows PowerShell: use `Copy-Item .env.example .env`.

Create the first administrator with `npm run seed` in `backend/` (needs `SEED_ADMIN_EMAIL` and real Firebase credentials; the script prints a one-time password-reset link). Every later student registers through the web app and waits for an admin to approve them in **Admin → Users**.

## Root scripts

| Script                 | Purpose                              |
| ---------------------- | ------------------------------------ |
| `npm run lint`         | Lint backend and frontend            |
| `npm run format`       | Prettier write across the repository |
| `npm run format:check` | Prettier check                       |
| `npm test`             | Backend test suite                   |

Run `npm install` in the root once to get Prettier for the shared config.

## Authentication flow (M1)

1. Student registers with email + password; Firebase sends a verification email.
2. The client blocks the app until `emailVerified` is true.
3. `POST /api/v1/auth/register-profile` creates a MongoDB user with role `student` and status `pending`. Role, status and permissions are assigned server-side and rejected if sent by the client.
4. An administrator approves or rejects the profile in the verification queue.
5. Active students reach `/student`; department officers reach `/department`; administrators reach `/admin`. Wrong roles get 403 from both the UI and the API.

## Conventions

- Plain JavaScript, ES modules. No TypeScript, no Python/ML code.
- API responses: `{ success: true, data, meta? }` / `{ success: false, error: { code, message, details? } }`.
- Never store student identity in complaints; staff see the tracking code only (§8).
- Roles always come from MongoDB, never from the Firebase token (§7.4).
- One milestone at a time (§13); branches `main` (stable), `dev` (integration), `feature/<name>`.
- Environment variables are validated at API startup (`backend/index.js`, section 1) and documented in each `.env.example`.

## Documentation

- `docs/BLUEPRINT.md` — full specification, milestones, privacy model, API reference.
- `backend/README.md`, `frontend/README.md` — per-side setup and structure.

## Milestones

M0 Foundation → **M1 Auth and RBAC** → M2 Student complaints → M3 Triage and workflow → M4 Management and audit → M5 Analytics and duplicates → M6 Student extras → M7 AI-ready layer → M8 Hardening and testing → M9 Deployment and UAT → M10 Documentation and defense.

## Notes

- `docs/BLUEPRINT.md` §4.2/§11.2 references DaisyUI; the agreed styling stack for this project is Tailwind + shadcn/ui (see `AGENTS.md`).
- Demo data only. Real DIU data requires university permission.
