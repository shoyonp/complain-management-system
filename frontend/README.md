# DIU Complaint Web

React SPA (Vite) for the privacy-preserving student complaint management system. **M1 Auth and RBAC** is implemented: Firebase signup/login, email verification, profile onboarding, status gates, the role-based app shell, and the admin student-verification queue.

## Requirements

- Node.js >= 22.12
- npm 10+
- A Firebase web app registered in the same project the API uses

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env
npm run dev
```

Open http://localhost:5173. The API must be running and its `CLIENT_ORIGIN` must match this origin.

## Scripts

| Script                 | Purpose                                 |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Vite dev server (port 5173)             |
| `npm run build`        | Production build to `dist/`             |
| `npm run preview`      | Preview the production build            |
| `npm run lint`         | ESLint (flat config, React hooks rules) |
| `npm run lint:fix`     | ESLint with autofix                     |
| `npm run format`       | Prettier write                          |
| `npm run format:check` | Prettier check                          |

## Environment variables

Only `VITE_*` variables reach the browser — never put secrets here.

| Variable                    | Required | Notes                                           |
| --------------------------- | -------- | ----------------------------------------------- |
| `VITE_API_URL`              | No       | API origin, defaults to `http://localhost:5000` |
| `VITE_FIREBASE_API_KEY`     | **Yes**  | Firebase web app config                         |
| `VITE_FIREBASE_AUTH_DOMAIN` | **Yes**  | Firebase web app config                         |
| `VITE_FIREBASE_PROJECT_ID`  | **Yes**  | Must match the API's `FIREBASE_PROJECT_ID`      |
| `VITE_FIREBASE_APP_ID`      | **Yes**  | Firebase web app config                         |

`src/lib/firebase.js` throws a readable error at startup when any of these is missing.

## Routes

| Path                                      | Access                                        |
| ----------------------------------------- | --------------------------------------------- |
| `/`                                       | Public landing                                |
| `/login`, `/register`, `/forgot-password` | Public (redirect when already signed in)      |
| `/verify-email`                           | Signed in, email not verified                 |
| `/complete-profile`                       | Signed in, verified, no profile yet           |
| `/pending-approval`                       | Signed in, profile pending/rejected/suspended |
| `/student`                                | Active student                                |
| `/department`                             | Active department officer                     |
| `/admin`                                  | Active administrator                          |
| `/admin/users`                            | Active administrator (verification queue)     |
| `/403`, `*`                               | Forbidden, not found                          |

Guards: `ProtectedRoute` (signed in) → `StatusGate` (verified → profile → active) → `RoleRoute` (role). The API enforces the same rules, so the UI gates are usability only.

## Structure

```
src/
  main.jsx                  # QueryClientProvider, BrowserRouter, AuthProvider
  app/
    router.jsx              # route table
    guards/                 # ProtectedRoute, StatusGate, RoleRoute
  components/
    layout/                 # AppShell, Sidebar, Topbar, MobileDrawer, PageHeader
    ui/                     # shadcn-style primitives (button, input, card, dialog, ...)
  context/                  # AuthContext + context object
  features/
    auth/                   # Login, Register, ForgotPassword, VerifyEmail,
                            # CompleteProfile, PendingApproval, postAuthPath
    dashboard/              # Student, Department, Admin dashboards
    users/pages/AdminUsers  # verification queue
  hooks/                    # useAuth, useDebounce
  lib/                      # firebase, axios, constants, navigation, queryClient, utils
  pages/                    # Landing, Forbidden, NotFound
  utils/                    # errorMessage
```

## Auth behaviour

- The Axios request interceptor attaches a fresh Firebase ID token to every call.
- A `401` response signs the user out; guards then redirect to `/login`.
- A `403` with `PROFILE_REQUIRED` is treated as "onboarding not finished", not an error.
- After sign-in, `postAuthPath()` decides between `/verify-email`, `/complete-profile`, `/pending-approval`, and the role dashboard.

## Design system

Tailwind CSS v4 with CSS variables in `src/index.css` (`@theme inline`), deep-blue primary, green success accent, Inter with Noto Sans Bengali fallback. Components live in `src/components/ui` and follow shadcn/ui conventions without the CLI. Layouts are responsive: a persistent sidebar on desktop, a Radix drawer on mobile, and tables that become cards below `md`.

## Not in this milestone

Complaint submission and tracking, department workflows, identity reveal, audit views, analytics, AI suggestions. See `docs/BLUEPRINT.md` §13. Frontend tests (Vitest) are scheduled for M8.
