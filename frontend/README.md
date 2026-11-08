# DIU Complaint Web

React SPA (Vite) for the privacy-preserving student complaint management system. This is the **M0 Foundation** skeleton: routing, TanStack Query, an Axios instance, and a landing page that verifies the API's `/health` endpoint.

## Requirements

- Node.js >= 22.12
- npm 10+

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # Windows PowerShell: Copy-Item .env.example .env
npm run dev
```

Open http://localhost:5173 — the API status pill should read "Connected" once the backend is running.

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

| Variable       | Required | Notes                               |
| -------------- | -------- | ----------------------------------- |
| `VITE_API_URL` | No       | Defaults to `http://localhost:5000` |

The API must allow this origin via its `CLIENT_ORIGIN` variable (CORS).

## Structure

```
src/
  main.jsx            # QueryClientProvider, BrowserRouter, global styles
  app/router.jsx      # route table (public routes only in M0)
  lib/axios.js        # Axios instance + token interceptor (M1)
  lib/queryClient.js  # TanStack Query defaults
  pages/              # Landing, NotFound
  utils/              # errorMessage
```

Feature folders (`features/auth`, `features/complaints`, ...) are added per milestone from §4.2 of the blueprint.

## Not in this milestone

Firebase auth, route guards, app shell, Tailwind/shadcn theme, feature pages. See `docs/BLUEPRINT.md` §13.
