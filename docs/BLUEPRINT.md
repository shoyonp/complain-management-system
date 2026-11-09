# Development Blueprint: Privacy-Preserving Student Complaint Management System

Case study: Dhaka International University. Developer scope: complete MERN web application, AI-ready but AI-independent.

**For AI coding agents (OpenCode):** this file is the source of truth. Work on one milestone at a time (Section 13). Do not add technologies outside Section 1.8 without asking. The backend is ONE file, `backend/index.js` (Section 5); do not split it into folders. Use the official MongoDB Node.js driver (`mongodb` package) with MongoDB Atlas. Do NOT use Mongoose. Never add Python/ML code. AI exists only as the provider interface in Section 12.

## 0. Key Decisions at a Glance

| Decision | Choice | Why |
|---|---|---|
| Architecture | Modular monolith: React SPA + Express API + MongoDB | One developer; microservices add work only |
| Language | Plain JavaScript (ES modules), ESLint + Prettier | Your stack is JS; TypeScript not needed |
| Role source of truth | MongoDB `users.role`, not Firebase custom claims | Role changes apply immediately, no desync |
| Privacy model | Pseudonymization: complaints never store student ID; identity in a separate encrypted vault | A leaked or over-shared complaint reveals nobody |
| Category/priority/department | Student suggests, admin confirms (triage) | Manual workflow that AI will later pre-fill |
| AI | Provider interface + no-op default + feature flag | App works fully without AI |
| Hosting | Vercel (frontend), Render or Railway (API), MongoDB Atlas | Express on serverless is awkward; check current free-tier limits |
| Backend layout | Single `backend/index.js` with ordered, commented sections | Easier for one developer to follow; boundaries stay as clearly named functions |
| Public board | Opt-in + admin-moderated, with separate redacted text | Students can see and support issues without exposing identity |

## 1. Final Project Scope and Requirements

### 1.1 Project summary

A web system where DIU students submit complaints with identity protected from general staff, track progress, and where admins and departments triage, assign and resolve complaints. Analytics show common student problems. AI features from the original document (classification, priority, routing, duplicate detection, Bangla/English NLP) stay as a defined integration layer, not as the web developer's deliverable.

### 1.2 Responsibility split

| Area | You (now) | Future AI/ML developer |
|---|---|---|
| Web app, APIs, database, auth, RBAC | Everything | - |
| Privacy: pseudonymization, encrypted identity vault, audit log | Yes | - |
| Category, priority, department | Manual (student suggests, admin confirms) | Automatic prediction |
| Duplicates | Manual linking + MongoDB text-search similarity | Semantic duplicate detection |
| Bangla/English text | Store/display UTF-8, language field | NLP models, language detection |
| AI integration layer (interface, contract, suggestion UI, flags) | Build the plug | Implement the model service behind it |
| Dataset | Anonymized CSV export feature | Collection, labeling, training |
| Model training, Python services | No | Yes |

### 1.3 MVP scope (Must have)

1. Student registration, email verification, admin verification of student accounts.
2. Login, logout, protected routes, role-based access (student, department, admin).
3. Complaint submission (title, description, suggested category, urgency, location, anonymity mode).
4. Complaint tracking with timeline and history.
5. Admin triage: final category, priority, department; assign; change status.
6. Department dashboard: assigned complaints, updates, status changes within rules.
7. Pseudonymized identity: staff see only the tracking code; reveal restricted and audited.
8. Analytics dashboard (by status, category, department, trend, resolution time).
9. Admin management of users, departments, categories.
10. Validation, rate limiting, secure headers, audit logging.
11. Responsive UI for mobile and desktop.
12. AI integration layer present but disabled.

### 1.4 Should have (after MVP is stable)

- Student feedback/rating after resolution and reopen request.
- Internal notes (staff-only) separate from public updates.
- In-app notifications (bell icon, TanStack Query polling).
- CSV export of analytics and anonymized dataset export.
- CSV import of valid student IDs for automatic verification.
- Duplicate grouping (link complaints to a master complaint).
- Public Complaint Board (opt-in, admin-moderated, with a Support button): Sections 6, 8, 9.10, 10.6, 11.9.

### 1.5 Could have / Later

Email notifications, attachments (image/PDF via a storage service), Bangla UI translation (i18n), dark theme polish, SLA reminders, two-step approval for identity reveal.

### 1.6 Out of scope

Mobile app, SMS, integration with DIU's official student database, ML models, Python services, dataset collection and labeling, real-time chat.

### 1.7 Roles

| Role | Description |
|---|---|
| `student` | Submits and tracks own complaints. Never sees others' complaints. |
| `department` | Officer of one department/office (e.g., Examination Office, Maintenance). Sees only complaints assigned to their department. Cannot see identity. |
| `admin` | Triage, assignment, user/department/category management, analytics. Sees all complaints but not identity by default. |
| Admin permissions | `REVEAL_IDENTITY` (audited identity reveal) and `MANAGE_USERS` are flags on selected admins; no fourth role. |

### 1.8 Libraries beyond the preferred stack (all justified)

| Library | Why |
|---|---|
| `firebase-admin` (backend) | Only supported way to verify Firebase ID tokens securely |
| `react-hook-form` + `zod` | Multi-field forms; Zod also validates API input |
| `recharts` | Analytics charts |
| `helmet`, `cors`, `express-rate-limit`, `express-mongo-sanitize` | Express security hardening |
| `jest` + `supertest` + `mongodb-memory-server`; `vitest` + React Testing Library | Testing (Vitest fits Vite) |
| `node-cron` (optional) | Daily auto-close of resolved complaints |
| `react-hot-toast` (optional) | Toasts (DaisyUI alerts are an alternative) |

No Python, FastAPI, TypeScript, Redux, GraphQL or Docker required.

## 2. Functional and Non-Functional Requirements

### 2.1 Functional requirements

**Authentication and accounts**
- FR-A1: Student signs up with Firebase email/password and verifies email.
- FR-A2: After sign-up, student completes profile (name, student ID, department, batch, semester); status `pending`.
- FR-A3: Admin verifies or rejects pending students; only `active` users can submit complaints.
- FR-A4: Admin creates department officer accounts and assigns them to a department.
- FR-A5: Admin can suspend users; suspended users are blocked immediately.

**Complaints**
- FR-C1: Student submits title, description (Bangla or English), suggested category, urgency, optional location, anonymity mode.
- FR-C2: Unique tracking code (e.g., `C-2026-0001`).
- FR-C3: Student sees list and detail of own complaints with status timeline.
- FR-C4: Student can add follow-up, withdraw before assignment, rate a resolved complaint, request reopen within a window.
- FR-C5: Admin sees all complaints with filters, search, pagination.
- FR-C6: Admin triages: final category, priority, department; may reject with reason.
- FR-C7: Admin or department updates status following the state machine (Section 10).
- FR-C8: Staff post public updates (visible to student) and internal notes (staff only).
- FR-C9: Admin can link duplicates; system shows keyword-similar complaints.
- FR-C10: Sensitive categories (e.g., Harassment) are admin-only and never routed to normal departments.

**Public board (Should)**
- FR-B1: When submitting, a student may tick "Show on public board" (default off).
- FR-B2: Admin approves with an edited public title and summary (separate from the private text) or declines. Sensitive categories can never be published.
- FR-B3: Students see published complaints in a feed (title, summary, category, status, date) and can press Support once per complaint.
- FR-B4: The owner or an admin can unpublish at any time.
- FR-B5: The feed never shows identity or any private field.

**Privacy**
- FR-P1: Staff views never contain student name, ID, email or any identifier.
- FR-P2: Identity reveal requires `REVEAL_IDENTITY`, a written reason, and is audit-logged.
- FR-P3: Student chooses Protected (default) or Identified (consents to share identity with handling authority).
- FR-P4: Form warns students not to put names or IDs in the description.

**Management and analytics**
- FR-M1: Admin CRUD for departments and categories (category to default department mapping).
- FR-M2: Analytics: totals, by status/category/department, monthly trend, average resolution time, overdue count.
- FR-M3: Audit log viewer.

**AI integration (disabled by default)**
- FR-AI1: AI provider interface and documented HTTP contract.
- FR-AI2: If enabled, suggestions are stored separately; admin accepts or rejects.
- FR-AI3: Anonymized dataset export.

### 2.2 Non-functional requirements

| Category | Requirement |
|---|---|
| Security | OWASP Top 10 basics; server-side authorization on every endpoint; secrets only in env variables |
| Privacy | Data minimization; application-level encrypted identity; audited identity access |
| Performance | List endpoints under 500 ms with 10,000 complaints (indexes + pagination) |
| Usability | Complaint submitted in under 2 minutes; works at 360 px width; basic keyboard/contrast accessibility |
| Reliability | Graceful errors; consistent JSON errors; no AI dependency in core flows |
| Maintainability | Layered backend, feature-based frontend, linting, README per side, documented API |
| Localization | Full UTF-8; Bangla renders and saves correctly (Noto Sans Bengali) |
| Compatibility | Latest Chrome, Edge, Firefox, Safari mobile |
| Testability | Core services covered by automated tests (Section 14) |

## 3. Recommended System Architecture

### 3.1 High-level diagram

```
  Browser (React + Vite SPA)
    |  Firebase Auth SDK (login) -> ID token
    |  Axios + TanStack Query (Authorization: Bearer <token>)
    v
  Express API (Node.js)
    middleware: helmet > cors > rate-limit > json > sanitize > verifyToken > loadUser > authorize > validate
    route handlers -> service functions -> MongoDB collections via the native driver (all in backend/index.js)
    |-- Privacy module (pseudonym + identity vault + audit)
    |-- AI integration layer (provider interface, disabled by default)
    v
  MongoDB Atlas
    users, departments, categories, complaints, complaintUpdates,
    identityLinks, auditLogs, counters, notifications, settings

  (Future, separate) AI/ML service  <-- HTTP contract --> AI integration layer
```

### 3.2 Practical technical decisions

1. **Layering inside one file.** Route handlers stay thin and call named service functions; business rules live in those functions (testable, swappable). One file, but still clean sections.
2. **Firebase handles passwords, MongoDB handles everything else.** Firebase UID links to the Mongo user. Never store passwords.
3. **REST, resource-based URLs, role-aware responses.** Serializers return different fields per audience; this is the main privacy mechanism.
4. **Server decides everything sensitive.** Frontend hiding is for usability only.
5. **Status changes follow a state machine** in one service function.
6. **Configuration over hard-coding.** Categories and departments are database records.

### 3.3 Environments

| Environment | Frontend | API | Database | Firebase |
|---|---|---|---|---|
| Local | Vite dev server | nodemon | Local MongoDB or Atlas dev | Dev project |
| Production | Vercel | Render/Railway | Atlas production | Separate prod project |

## 4. Frontend Page and Component Structure

### 4.1 Route map

| Path | Access | Page |
|---|---|---|
| `/` | Public | Landing: purpose, privacy promise, login/register |
| `/login`, `/register`, `/forgot-password` | Public | Auth pages |
| `/verify-email` | Signed in | Verification notice and resend |
| `/complete-profile` | Signed in, no profile | Student profile form |
| `/pending-approval` | Student, pending | Waiting for admin |
| `/student` | student | Dashboard |
| `/student/complaints/new` | student | Submit complaint |
| `/student/complaints` | student | My complaints |
| `/student/complaints/:id` | student | Detail + timeline + follow-up + rating |
| `/student/profile` | student | Profile and privacy settings |
| `/student/board` | student | Public board feed with Support button |
| `/department` | department | Dashboard |
| `/department/complaints` | department | Assigned complaints |
| `/department/complaints/:id` | department | Detail + update/status actions |
| `/admin` | admin | Dashboard with analytics |
| `/admin/complaints` | admin | All complaints with filters |
| `/admin/complaints/:id` | admin | Triage, assign, status, duplicates, AI suggestion panel |
| `/admin/users` | admin | User list, verification queue, create officers |
| `/admin/departments` | admin | Department CRUD |
| `/admin/categories` | admin | Category CRUD and default routing |
| `/admin/analytics` | admin | Reports and CSV export |
| `/admin/audit-logs` | admin | Audit log viewer |
| `/admin/settings` | admin | AI flag, SLA days, reopen window |
| `/admin/board-requests` | admin | Pending public-board requests: approve with edited text, or decline |
| `/403`, `*` | Any | Forbidden, not found |

### 4.2 Folder structure (feature-based)

```
frontend/
  index.html
  vite.config.js
  tailwind.config.js          # daisyui plugin, themes
  .env.example                # VITE_API_URL, VITE_FIREBASE_*
  src/
    main.jsx                  # providers: Query, Auth, Router, Toaster
    app/
      router.jsx
      guards/
        ProtectedRoute.jsx    # signed-in
        RoleRoute.jsx         # allowed roles
        StatusGate.jsx        # email verified, profile complete, account active
    lib/
      firebase.js
      axios.js                # instance + token interceptor + 401 handling
      queryClient.js
      constants.js            # STATUS, PRIORITY, ROLES labels and badge colors
    context/
      AuthContext.jsx         # firebaseUser + backend profile + role
    features/
      auth/        {pages, components, hooks, api}
      complaints/  {pages, components, hooks, api, schemas}
      dashboard/   {student, department, admin widgets}
      users/ departments/ categories/ audit/
      board/       {pages, components, hooks, api}   # public feed + Support
      analytics/   {charts, hooks, api}
      ai/          {SuggestionPanel, hooks, api}   # renders nothing when AI is off
    components/
      layout/      AppShell, Sidebar, Topbar, MobileDrawer, PageHeader
      ui/          DataTable, Pagination, StatusBadge, PriorityBadge, EmptyState,
                   ConfirmModal, Loader, ErrorBox, SearchInput, FilterBar, StatCard
    hooks/         useDebounce, useRoleGuard
    utils/         formatDate, errorMessage
    pages/         NotFound, Forbidden, Landing
```

### 4.3 Key components

| Component | Purpose |
|---|---|
| `ComplaintForm` | react-hook-form + Zod; character counter; privacy warning; anonymity selector |
| `ComplaintCard` / `ComplaintTable` | Lists with tracking code, category, priority, status, date |
| `StatusTimeline` | Vertical steps from `complaintUpdates` |
| `TriagePanel` (admin) | Final category, priority, department, assign, reject |
| `StatusActions` | Only transitions allowed for current role and status |
| `UpdateComposer` | Public update vs internal note toggle (staff) |
| `SimilarComplaints` | Keyword-similar list, link-as-duplicate action |
| `IdentityRevealModal` | Reason field, warning, calls reveal endpoint; only with permission |
| `SuggestionPanel` | AI suggestion with Accept/Reject; hidden when AI off |
| `StatCard`, `TrendChart`, `CategoryPie`, `DepartmentBar` | Dashboards |
| `FilterBar` | Status, category, priority, department, date range, search |

### 4.4 State and data handling

- **Server state:** TanStack Query only. One `api.js` per feature; hooks like `useComplaints(filters)`; keys like `['complaints', filters]`; invalidate after mutations.
- **Auth state:** `AuthContext` (Firebase user, backend profile, loading). No Redux.
- **Axios interceptor:** before each request call `auth.currentUser.getIdToken()` and set Bearer header. On 401 sign out; on 403 go to `/403`.
- **Forms:** react-hook-form with Zod schemas mirroring backend rules.
- **Role-based menu:** defined once in a config object keyed by role.

## 5. Backend Architecture and Folder Structure

### 5.1 Folder structure (single-file backend)

```
backend/
  package.json                # "type": "module"
  .env.example
  index.js                    # the ENTIRE backend lives here
  tests/                      # tests import { app } from '../index.js'
  docs/
    openapi.yaml (or API.md), postman_collection.json, ai.contract.md
```

**Why one file:** easier for one developer to read top to bottom, no import wiring. It stays clean because `index.js` is divided into numbered banner sections (`// ===== 7. SERIALIZERS =====`) in this fixed order:

1. Imports and env validation (fail fast if a variable is missing)
2. Constants: ROLES, STATUS, PRIORITY, TRANSITIONS, PERMISSIONS
3. Firebase Admin init and MongoDB connection
4. Collection handles (`db.collection('complaints')` etc.), index creation at startup (`ensureIndexes()`), and Zod document shapes for inserts (all collections from Section 6)
5. Helpers: ApiError, asyncHandler, pagination, trackingCode, crypto (AES-GCM), pseudonym (HMAC), redactor, audit logger
6. Middleware: verifyToken, loadUser, authorize, validate (Zod), rate limiters
7. Serializers (role-specific field allowlists)
8. Services: state machine, complaint logic, identity vault, analytics, board, AI orchestrator and providers (Noop/Mock/Http)
9. Routes, grouped by area: auth, meta, my complaints, staff complaints, admin, analytics, export, board, notifications, AI
10. 404 handler, error handler
11. Startup: `export const app`; call `listen()` only when `NODE_ENV !== 'test'`; run `seed()` when started with `--seed` (`node index.js --seed`)

**Rules for the single file:**
- Do not split it into folders. Keep the sections in the order above.
- Route handlers stay thin: validate, call one service function, send the response.
- AI code stays inside the "AI INTEGRATION" part of section 8; the rest of the file only calls `aiOrchestrator`.
- If the file passes about 2,500 lines, say so; the section order maps one-to-one onto modules, so splitting later is mechanical.

### 5.2 Request pipeline

```
helmet > cors(whitelist) > rateLimit > express.json(limit 100kb) > mongoSanitize
  > verifyToken > loadUser > authorize(role/permission) > validate(zod) > controller > service > model
  > errorHandler (single consistent JSON error)
```

### 5.3 Conventions

- Success: `{ success: true, data, meta? }`. Error: `{ success: false, error: { code, message, details? } }`.
- Error codes: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INVALID_TRANSITION`.
- Pagination: `?page=1&limit=20`, `meta: { page, limit, total, totalPages }`, max limit 100.
- Plural nouns, kebab-case URLs, camelCase JSON, collection names plural camelCase (`complaintUpdates`).
- Route handlers stay thin: they call named service functions. Business rules and database calls live in those functions, not inside the handlers.

### 5.4 Environment variables

```
NODE_ENV, PORT, MONGODB_URI, CLIENT_ORIGIN
FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
PSEUDONYM_SECRET        # HMAC key for ownerKey
IDENTITY_ENC_KEY        # 32-byte key (base64) for AES-256-GCM
AI_ENABLED=false, AI_SERVICE_URL, AI_SERVICE_API_KEY, AI_CALLBACK_SECRET
```

## 6. MongoDB Database Schema and Relationships

**Driver note (no Mongoose):** use the official `mongodb` driver with Atlas. Practical consequences:
- Collections are plain `db.collection('name')` handles. The tables below describe document shapes, not Mongoose schemas.
- Validate every document with Zod before `insertOne`/`updateOne` (server-side allowlist of fields).
- Set `createdAt` and `updatedAt` yourself (`new Date()`) in the service functions.
- Convert ids with `new ObjectId(id)` and validate them first (`ObjectId.isValid`).
- No `populate`: fetch related documents with a second query or an aggregation `$lookup`.
- Create all indexes once at startup in `ensureIndexes()` (`createIndex` is safe to repeat).
- Transactions (if used) need an Atlas replica set: `client.startSession()` + `session.withTransaction(...)`.
- Soft rules like unique `trackingCode` and unique `{complaint, supporterKey}` are enforced by unique indexes; catch duplicate-key error code `11000` and return 409.

### 6.1 Relationship overview

```
users (student | department | admin)
  |  departmentRef ---------------> departments
  |                                   ^
categories --defaultDepartment--------+
    ^                                 |
complaints ---- department -----------+
  |  | category -> categories
  |  | ownerKey = HMAC(userId)   (NO direct link to users)
  |  | assignedTo -> users (officer)
  |  | duplicateOf -> complaints
  |
  +-- complaintUpdates (many per complaint: timeline, notes)
  +-- identityLinks    (one per complaint: encrypted userId)  <- the vault

auditLogs, notifications, counters, settings, complaintSupports are supporting collections.
```

**Design rule:** `complaints` never contains a reference to the student. The only bridges are (a) the one-way `ownerKey` hash for the student's own list and (b) the encrypted `identityLinks` record for audited reveal.

### 6.2 Collections

**users**

| Field | Notes |
|---|---|
| `firebaseUid` | String, unique, indexed |
| `email`, `name`, `phone?` | Strings |
| `role` | student, department, admin |
| `status` | pending, active, suspended, rejected |
| `studentProfile` | `{ studentId, academicDepartment, batch, semester }` (students); `studentId` unique sparse |
| `departmentRef` | ObjectId to departments (officers only) |
| `permissions` | Array: `REVEAL_IDENTITY`, `MANAGE_USERS` (admins only) |
| `verifiedBy`, `verifiedAt` | Admin verification trail |
| `createdAt`, `updatedAt` | Timestamps |

Indexes: `firebaseUid` unique, `{role, status}`, `studentProfile.studentId` unique sparse.

**departments**: `name`, `code` (unique, e.g., `EXAM`), `type` (academic/administrative), `isActive` (soft delete; never hard-delete one with complaints).

**categories**: `name`, `slug` (Academic, Examination, Infrastructure, Finance, Library, Transport, Administration, Harassment, Cleanliness, Other), `defaultDepartment`, `isSensitive` (true for Harassment: admin-only), `isActive`, `order`.

**complaints**

| Field | Notes |
|---|---|
| `trackingCode` | `C-2026-0001`, unique |
| `ownerKey` | HMAC-SHA256(userId, PSEUDONYM_SECRET), indexed; only for student's own list |
| `title`, `description` | Strings with length limits |
| `language` | bn, en, mixed |
| `location` | `{ building?, room?, note? }` |
| `studentCategory`, `studentUrgency` | Student suggestions |
| `category`, `priority`, `department` | Final values from triage; priority: low, medium, high, critical |
| `classification` | `{ source: student/admin/ai, decidedBy?, decidedAt }` |
| `assignedTo` | Officer user (optional) |
| `status` | See state machine (Section 10) |
| `identityMode` | protected (default) or identified |
| `isSensitive` | Copied from category at triage; drives visibility |
| `duplicateOf` | Master complaint |
| `aiSuggestion` | Embedded, empty until AI is enabled (Section 12) |
| `visibility` | private (default), public_requested, public |
| `publicTitle`, `publicSummary` | Admin-edited text shown on the board; the private `description` is never shown there |
| `publishedAt`, `supportCount` | Board fields (`supportCount` is a cached number) |
| `feedback` | `{ rating 1-5, comment, at }` |
| `resolvedAt`, `closedAt`, `createdAt`, `updatedAt` | Dates |

Indexes: `trackingCode` unique; `visibility + publishedAt`; `ownerKey + createdAt`; `status + priority + createdAt`; `department + status`; `category`; text index on `title` + `description` with `default_language: 'none'` (no wrong stemming for Bangla).

**complaintUpdates** (timeline and notes)

| Field | Notes |
|---|---|
| `complaint` | ObjectId, indexed |
| `type` | submitted, triage, assignment, status_change, public_update, internal_note, student_message, feedback, reopen |
| `visibility` | public (student sees) or internal (staff only) |
| `authorRole` | student, department, admin, system |
| `authorUser` | Staff only; never set for students |
| `message`, `fromStatus`, `toStatus`, `createdAt` | Content |

Students see the department label (e.g., "Examination Office"), never a staff member's personal name.

**identityLinks** (vault): `complaint` (unique), `encryptedUserId` `{ iv, tag, data }` (AES-256-GCM, `IDENTITY_ENC_KEY`), `createdAt`. Only the audited reveal service reads it.

**auditLogs** (append-only): `actor`, `actorRole`, `action` (IDENTITY_REVEAL, USER_VERIFIED, USER_SUSPENDED, ROLE_OR_PERMISSION_CHANGED, COMPLAINT_TRIAGED, COMPLAINT_STATUS_CHANGED, SETTINGS_CHANGED, DATA_EXPORT, LOGIN_DENIED), `targetType`, `targetId`, `reason?`, `ip`, `userAgent`, `createdAt`. No update/delete endpoint.

**counters**: `{ _id: 'complaint-2026', seq }`, atomic `findOneAndUpdate` + `$inc` for tracking codes.

**notifications (Should)**: `user`, `type`, `trackingCode`, `message`, `readAt`, `createdAt`.

**settings (singleton)**: `aiEnabled`, `reopenWindowDays` (7), `slaDays` per priority, `autoApplyThreshold` (future AI, default null).

**complaintSupports (Should)**: `complaint`, `supporterKey` (HMAC of the supporter's userId with `PSEUDONYM_SECRET`, so nobody can see who supported), `createdAt`. Unique index on `{complaint, supporterKey}` makes one Support per student.

### 6.3 Embed vs reference

- Timeline in a separate collection: it grows and internal notes need role filtering.
- AI suggestion embedded: read with the complaint, small, one per complaint.
- Category/department by ObjectId: admins can rename them without touching complaints.

## 7. Authentication and Authorization Workflow

### 7.1 Registration (student)

1. Student registers with Firebase email/password.
2. Frontend calls `sendEmailVerification`; student verifies email.
3. Student completes profile (name, student ID, academic department, batch, semester).
4. Frontend calls `POST /auth/register-profile` with the ID token. Backend verifies token, checks `email_verified`, validates, creates user `role: student`, `status: pending`.
5. Student sees `/pending-approval`. Admin approves or rejects from the verification queue.
6. On approval status becomes `active`.

Anti-fraud: `studentId` unique; admin compares with university records. Later: admin uploads CSV of valid student IDs for automatic approval.

### 7.2 Officer and admin accounts

- Self-registration always creates a student. Nobody self-assigns a role.
- Admin creates officers via `POST /admin/users/officers`: backend creates the Firebase user with `firebase-admin`, creates the Mongo user (`role: department`, `departmentRef`), sends a password-reset link.
- First admin is created by `seed.js` with an email you control. More admins by an admin with `MANAGE_USERS`.

### 7.3 Every API request

1. Frontend sends `Authorization: Bearer <fresh ID token>`.
2. `verifyToken` calls `admin.auth().verifyIdToken(token)`; invalid/expired gives 401.
3. `loadUser` finds user by `firebaseUid`. No profile: `403 PROFILE_REQUIRED`. Not `active`: `403 ACCOUNT_NOT_ACTIVE`.
4. `authorize(...)` checks role/permission: `403 FORBIDDEN`.
5. Service layer applies ownership and scope rules (student: own complaints; department: own department).

Use `verifyIdToken(token, true)` (check revoked) on sensitive routes (reveal, user management, exports). Suspension also calls `revokeRefreshTokens(uid)`.

### 7.4 Why MongoDB roles instead of custom claims

Claims live in tokens and refresh slowly (up to an hour); a demoted or suspended user would keep access. One indexed user read per request is cheap and always current.

### 7.5 RBAC matrix

| Action | Student | Department | Admin | Admin + REVEAL_IDENTITY |
|---|---|---|---|---|
| Submit complaint | Yes | No | No | No |
| View own complaints | Yes | - | - | - |
| View all complaints | No | Own department only | Yes | Yes |
| View sensitive-category complaints | Own only | No | Yes | Yes |
| Triage | No | No | Yes | Yes |
| Assign to officer | No | Within own department | Yes | Yes |
| Change status | Withdraw/reopen only | Allowed transitions | All | All |
| Public update | Follow-up message | Yes | Yes | Yes |
| Internal note | No | Yes | Yes | Yes |
| Reveal identity | No | No | No | Yes (reason + audit) |
| Manage users/departments/categories | No | No | Yes | Yes |
| Analytics | Own stats | Own department stats | Full | Full |
| Audit logs | No | No | Yes | Yes |
| Request public board for own complaint | Yes | - | - | - |
| Approve / unpublish board posts | Unpublish own | No | Yes | Yes |
| View board and press Support | Yes | No | View only | View only |

### 7.6 Frontend gating (usability only)

`ProtectedRoute` (signed in) -> `StatusGate` (email verified, profile complete, active) -> `RoleRoute`. After login redirect by role: student `/student`, department `/department`, admin `/admin`.

## 8. Privacy and Security Implementation Plan

### 8.1 Privacy architecture

| Technique | Implementation |
|---|---|
| Pseudonymization | Staff see only `trackingCode`. `complaints` has no user reference. |
| Secure storage / encryption | `identityLinks.encryptedUserId` AES-256-GCM (key in env, not DB). Atlas also encrypts at rest. |
| Role-based access control | Middleware + scoped service queries + role-specific serializers |
| Data anonymization | Anonymized dataset export strips identity and flags personal patterns |
| Data minimization | Form collects no name/ID; identity comes from the session |

A database dump alone cannot identify a student: complaints hold only an HMAC hash and a code, the vault holds ciphertext, and both secrets live in host env variables.

**Identity modes**
- **Protected (default):** hidden from all staff; reveal only via audited path.
- **Identified:** student consents; assigned staff see name and student ID. Record the choice in the timeline.

**Role-specific serializers** (`complaint.serializer.js`): one function per audience returns an allowlist of fields. Never return a raw database document directly.

| Field | Student (own) | Department | Admin |
|---|---|---|---|
| trackingCode, title, description, status, priority, category | Yes | Yes | Yes |
| Public updates | Yes | Yes | Yes |
| Internal notes | No | Yes | Yes |
| Staff personal names | No (department label only) | Yes | Yes |
| ownerKey and internals | No | No | No |
| Student name/ID | - | Only if identified | Only if identified or revealed |
| AI suggestion | No | No | Yes |

**Identity reveal flow**
1. Admin with `REVEAL_IDENTITY` clicks Reveal and enters a reason (minimum length).
2. `POST /complaints/:id/reveal-identity` verifies token with revocation check, checks permission, rate-limits (e.g., 10/hour).
3. Service decrypts the vault record, loads the user, returns name, student ID, department, email.
4. `IDENTITY_REVEAL` audit record is written BEFORE the response (if logging fails, reveal fails).
5. Response has `Cache-Control: no-store`; UI shows it in a modal, does not persist it.

**Free-text leaks.** Warning in the form; regex `redactor` utility highlights phone numbers, emails, student-ID patterns before submit; do not log complaint text.

**Retention and consent.** Privacy notice at registration and submission. Define retention (e.g., 3 years then anonymize). Real DIU data for research needs university permission; use seeded demo data otherwise.

### 8.2 Security checklist

| Area | Measure |
|---|---|
| Transport | HTTPS only; HSTS via helmet |
| Authentication | Firebase ID token verified server-side; revocation check on sensitive routes |
| Authorization | Deny by default; role + ownership + scope in services; tests for every role |
| Input validation | Zod on body/query/params; reject unknown fields; length limits; ObjectId validation |
| Injection | `express-mongo-sanitize`; never build queries from raw user objects; whitelist sort/filter fields |
| XSS | React escaping; never `dangerouslySetInnerHTML`; CSP via helmet |
| CSRF | Bearer tokens (not cookies), so classic CSRF does not apply; CORS limited to frontend origin |
| Rate limiting | Global; stricter on submission (e.g., 5/hour/user), reveal, auth routes |
| Brute force | Firebase throttling; require email verification |
| Secrets | `.env` never committed; separate dev/prod; rotate if exposed |
| Errors | Generic client messages; details in server logs; no stack traces in production |
| Logging | Structured, no PII or complaint text; audit log for sensitive actions |
| Dependencies | `npm audit` before release; lock files; Dependabot |
| Database | Atlas network rules, least-privilege user, backups |
| Mass assignment | Services pick allowed fields; clients never send role, status, ownerKey, priority on submission |

### 8.3 Threat model

| Threat | Mitigation |
|---|---|
| Staff curiosity about who complained | Pseudonymization, serializers, audited reveal |
| Admin abuses reveal | Separate permission, mandatory reason, audit log, rate limit |
| Database leak | No identity in complaints; encrypted vault; keys outside DB |
| Stolen token | Short lifetime, HTTPS, revocation on suspension |
| Fake student accounts | Email verification + admin approval |
| Spam or flooding | Rate limits, length limits, account status checks |
| Student A reads student B's complaint | Ownership filter via `ownerKey` in every student query |
| Privilege escalation | Role never accepted from client; server-side checks and tests |

### 8.4 Public board privacy rules (Should)

- **Separate text.** The board shows only `publicTitle` and `publicSummary`, written or edited by an admin at approval. The private `description` is never exposed there.
- **Opt-in and moderated.** Default is `private`. Nothing is published without the student's request and an admin's approval.
- **Never sensitive.** Complaints in sensitive categories cannot be requested or approved for the board (checked in the service function, not only in the UI).
- **Own serializer.** `serializeBoardItem` returns only: id/tracking code, publicTitle, publicSummary, category name, status, publishedAt, supportCount, and whether the current user already supported. No location, no student fields, no staff names, no internal notes.
- **Admin checklist at approval:** remove room numbers, dates, names and anything that points to one person.
- **Anonymous support.** Supporters are stored as HMAC hashes, so a Support never reveals who pressed it.
- **Unpublish anytime.** The owner or an admin can set the complaint back to `private`; it disappears from the feed immediately.
- **Audit.** Publishing and unpublishing write audit entries.

## 9. Complete REST API Documentation

Base URL: `/api/v1`. All endpoints need `Authorization: Bearer <Firebase ID token>` unless stated. Access: S = student, D = department, A = admin, A+ = admin with the named permission.

### 9.1 Auth and profile

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/register-profile` | Signed-in, email verified | Creates student profile (`pending`). Body: name, studentId, academicDepartment, batch, semester, phone? |
| GET | `/auth/me` | Any signed-in | Profile, role, status, permissions |
| PATCH | `/users/me` | Any | Update name, phone |

### 9.2 Metadata

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/meta/categories` | S, D, A | Active categories (id, name, slug) |
| GET | `/meta/departments` | A, D | Active departments |

### 9.3 Student complaints

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/my/complaints` | S (active) | Submit complaint |
| GET | `/my/complaints` | S | List own. Query: `status`, `page`, `limit`, `sort` |
| GET | `/my/complaints/:id` | S | Detail + public timeline |
| POST | `/my/complaints/:id/messages` | S | Follow-up (blocked when closed) |
| POST | `/my/complaints/:id/withdraw` | S | Only while `submitted` or `under_review` |
| POST | `/my/complaints/:id/feedback` | S | Rating 1-5 + comment when `resolved` |
| POST | `/my/complaints/:id/reopen` | S | Within `reopenWindowDays`; reason required |
| GET | `/my/stats` | S | Counts by status |

### 9.4 Staff complaint management

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/complaints` | A, D | List. D auto-scoped to its department, excludes sensitive. Query: `status`, `priority`, `category`, `department`, `q`, `from`, `to`, `page`, `limit`, `sort` |
| GET | `/complaints/:id` | A, D | Detail via role-specific serializer |
| GET | `/complaints/:id/similar` | A | Keyword-similar complaints (MongoDB text search) |
| PATCH | `/complaints/:id/triage` | A | Set category, priority, department; or reject with reason |
| PATCH | `/complaints/:id/assign` | A, D | A sets department/officer; D sets officer in own department |
| PATCH | `/complaints/:id/status` | A, D | Body: `toStatus`, `message?`. State machine validated |
| POST | `/complaints/:id/updates` | A, D | Body: `message`, `visibility` (public/internal) |
| POST | `/complaints/:id/duplicate` | A | Body: `masterId`. Links and closes with reason |
| POST | `/complaints/:id/reveal-identity` | A+ `REVEAL_IDENTITY` | Body: `reason`. Audited |
| GET | `/department/stats` | D | Counts for own department |

### 9.5 Admin management

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/admin/users` | A | Query: `role`, `status`, `q`, `page` |
| PATCH | `/admin/users/:id/verify` | A | Body: `decision` (approve/reject), `note?` |
| PATCH | `/admin/users/:id/status` | A+ `MANAGE_USERS` | active/suspended; revokes tokens |
| POST | `/admin/users/officers` | A+ `MANAGE_USERS` | Create department officer |
| PATCH | `/admin/users/:id/permissions` | A+ `MANAGE_USERS` | Grant/remove permissions |
| GET, POST | `/admin/departments` | A | List, create |
| PATCH, DELETE | `/admin/departments/:id` | A | Update; DELETE sets `isActive=false` |
| GET, POST | `/admin/categories` | A | List, create |
| PATCH, DELETE | `/admin/categories/:id` | A | Update; DELETE sets `isActive=false` |
| GET | `/admin/audit-logs` | A | Query: `action`, `actor`, `from`, `to`, `page` |
| GET, PATCH | `/admin/settings` | A | Read/update settings |

### 9.6 Analytics and export

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/analytics/overview` | A | Totals, open, resolved, overdue, avg resolution hours |
| GET | `/analytics/by-status`, `/by-category`, `/by-department`, `/by-priority` | A | Grouped counts |
| GET | `/analytics/trend?months=6` | A | Created and resolved per month |
| GET | `/analytics/resolution-time` | A | Average and median per category/department |
| GET | `/export/complaints.csv` | A | Filtered export; audited |
| GET | `/export/dataset.csv` | A | Anonymized dataset for AI developer (title, description, language, final category, priority, department); audited |

### 9.7 Notifications (Should)

`GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all` (any signed-in user).

### 9.8 AI integration endpoints (disabled while `AI_ENABLED=false`)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/ai/status` | A | `{ enabled, provider, modelVersion }` |
| POST | `/complaints/:id/ai/analyze` | A | Request analysis; `503 AI_DISABLED` when off |
| POST | `/complaints/:id/ai/accept` | A | Apply stored suggestion |
| POST | `/complaints/:id/ai/reject` | A | Dismiss suggestion |
| POST | `/ai/callback` | AI service (API-key header) | Async result delivery |

### 9.9 Sample payloads

**POST `/my/complaints`**

```json
{
  "title": "Room 301 AC not working",
  "description": "The AC in CSE Building Room 301 has not worked for two weeks.",
  "language": "en",
  "studentCategoryId": "66f1...",
  "studentUrgency": "medium",
  "location": { "building": "CSE Building", "room": "301" },
  "identityMode": "protected"
}
```

Response 201:

```json
{ "success": true, "data": { "id": "6702...", "trackingCode": "C-2026-0045", "status": "submitted" } }
```

**GET `/complaints/:id` (department view, protected complaint)**

```json
{
  "success": true,
  "data": {
    "trackingCode": "C-2026-0045",
    "title": "Room 301 AC not working",
    "category": { "id": "...", "name": "Infrastructure" },
    "priority": "medium",
    "status": "assigned",
    "location": { "building": "CSE Building", "room": "301" },
    "identity": { "mode": "protected", "visible": false },
    "updates": [ { "type": "assignment", "visibility": "internal", "message": "..." } ],
    "allowedTransitions": ["in_progress"]
  }
}
```

**PATCH `/complaints/:id/triage`**

```json
{ "categoryId": "66f1...", "priority": "medium", "departmentId": "66e9...", "note": "Routed to maintenance" }
```

**Error example (403)**

```json
{ "success": false, "error": { "code": "FORBIDDEN", "message": "You do not have access to this resource." } }
```

Status codes: 200, 201, 204, 400 (validation), 401, 403, 404, 409 (conflict/invalid transition), 429, 500, 503 (AI disabled).

### 9.10 Public board (Should)

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/board` | S, A | Published complaints. Query: `page`, `limit`, `category`, `sort` (recent or supported) |
| POST | `/board/:id/support` | S | Add Support (one per student; 409 if already supported) |
| DELETE | `/board/:id/support` | S | Remove own Support |
| POST | `/my/complaints/:id/public-request` | S | Body: `{ "request": true }` or `false`. Not allowed for sensitive categories |
| POST | `/my/complaints/:id/unpublish` | S | Owner takes the post down |
| GET | `/complaints?visibility=public_requested` | A | Moderation queue |
| PATCH | `/complaints/:id/publish` | A | Body: `publicTitle`, `publicSummary` |
| PATCH | `/complaints/:id/unpublish` | A | Takes the post down |

Sample board item:

```json
{
  "id": "6702...",
  "trackingCode": "C-2026-0045",
  "publicTitle": "AC not working in a CSE classroom",
  "publicSummary": "Students report the air conditioning has been out for about two weeks.",
  "category": "Infrastructure",
  "status": "in_progress",
  "publishedAt": "2026-11-09T08:30:00Z",
  "supportCount": 14,
  "supportedByMe": false
}
```

## 10. Student, Admin and Department Workflows

### 10.1 Complaint status state machine

```
submitted --(admin triage)--> under_review --(assign)--> assigned --(start)--> in_progress --(done)--> resolved --(window ends)--> closed
    |                              |                                                                       |
    |--(student)--> withdrawn      |--(admin)--> rejected (reason required)                                |--(student, within window)--> reopened --> assigned / in_progress
    |--(admin)--> rejected         |--(admin)--> closed (duplicate of master)
```

| From | To | Who | Rule |
|---|---|---|---|
| submitted | under_review | Admin | When triage starts |
| submitted, under_review | withdrawn | Student | Only before assignment |
| submitted, under_review | rejected | Admin | Reason shown to student |
| under_review | assigned | Admin | Needs category, priority, department |
| assigned | in_progress | Department, Admin | Officer starts work |
| in_progress | resolved | Department, Admin | Resolution message required |
| assigned, in_progress | under_review | Admin | Re-triage / wrong department |
| resolved | closed | System, Admin | After `reopenWindowDays` with no reopen |
| resolved | reopened | Student | Within window; reason required |
| reopened | assigned, in_progress | Admin, Department | Continues same complaint |

Allowed transitions live only in `constants.js` and `stateMachine.js`. Every transition writes a `complaintUpdates` record. A daily job (`node-cron`, or opportunistically when the admin dashboard loads, since free hosts sleep) closes expired `resolved` complaints.

### 10.2 Student workflow

1. Register, verify email, complete profile, wait for admin approval.
2. Submit: read privacy notice, enter title and description (Bangla or English), suggested category and urgency, optional location, choose Protected or Identified. Tracking code is shown ("Save this code").
3. Track: "My complaints", filter by status, open detail for timeline (public updates only).
4. Interact: follow-up message while open; withdraw before assignment.
5. Close the loop: rate when resolved, or reopen with reason inside the window.
6. Notifications bell (Should).

### 10.3 Admin workflow (daily routine)

1. Dashboard: new complaints, unassigned, overdue, pending student verifications.
2. Verify students from the queue.
3. Triage new complaints: read, check similar complaints, set final category and priority, pick department (category default pre-selected), assign, optional internal note. Duplicate: link to master. Invalid: reject with reason.
4. Monitor overdue and high/critical items; nudge departments via internal notes.
5. Sensitive complaints (harassment): admins or designated committee only.
6. Identity reveal (rare): only with permission, written reason, audited.
7. Manage users, officers, departments, categories, settings.
8. Analytics and CSV export.

### 10.4 Department workflow

1. Log in (admin-created account; officer sets own password via reset link).
2. Dashboard: assigned complaints by status, overdue.
3. Open complaint: title, description, category, priority, location, public timeline. No identity unless student chose Identified.
4. Optionally assign to an officer in the same department.
5. Move to `in_progress`; post public updates and internal notes.
6. Mark `resolved` with resolution message.
7. Wrong department: internal note, ask admin to re-triage (no cross-department reassign).

### 10.5 Submission flow (inside)

```
Student submits form
  -> API verifies token, loads user (active student)
  -> validate + whitelist fields
  -> ownerKey = HMAC(userId)
  -> trackingCode = next counter value
  -> save complaint (no user reference)
  -> save identityLinks (AES-GCM encrypted userId)
  -> save timeline entry (type: submitted)
  -> (if AI enabled) enqueue AI analysis, never blocks the response
  -> return { id, trackingCode }
```

Writing two collections can use a MongoDB transaction on Atlas. Alternative: write the vault record first and delete it if the complaint save fails. Pick one and test it.

### 10.6 Public board flow (Should)

1. Student ticks "Show on public board" while submitting (or later from the complaint detail). Status of the request: `public_requested`.
2. Admin opens `/admin/board-requests`, reads the complaint, writes `publicTitle` and `publicSummary` (starting from the student's text, removing anything identifying) and approves, or declines.
3. On approval `visibility = public`, `publishedAt` is set, and the post appears in `/student/board`.
4. Other students read the post and press Support. The cached `supportCount` updates; admins can use it as a hint when setting priority.
5. Status changes on the complaint show on the board automatically (status only, no private notes).
6. The owner or an admin can unpublish; the post disappears at once.

## 11. UI/UX Design and Dashboard Planning

### 11.1 Principles

- Calm and trustworthy: clean layout, generous spacing, clear privacy messages.
- Privacy visible: lock badge "Your identity is protected" on form and detail pages.
- Mobile first: tables become cards below `md`.
- Fewer clicks: admin triage in one panel on the detail page.
- Plain language statuses: Submitted, Under review, Assigned, In progress, Resolved.

### 11.2 DaisyUI setup

- Custom theme (`diu-light`, optional `diu-dark`): deep blue primary, green accent, WCAG AA contrast.
- Components: `drawer`, `navbar`, `card`, `table`, `badge`, `steps`/`timeline`, `modal`, `tabs`, `stat`, `alert`, `toast`, `skeleton`, `join` (pagination).
- Fonts: Inter (or system) + Noto Sans Bengali; textarea uses the same stack.

### 11.3 Status and priority colors

| Status | Badge | Priority | Badge |
|---|---|---|---|
| Submitted | neutral | Low | ghost/success |
| Under review | info | Medium | warning |
| Assigned | secondary | High | error (outline) |
| In progress | primary | Critical | error (solid) |
| Resolved | success | | |
| Closed | ghost | | |
| Rejected / Withdrawn | error / warning | | |

Always pair color with text.

### 11.4 Layouts

- Public: top navbar + hero + footer.
- App shell: left sidebar (role-based menu) + top bar (profile, notifications); drawer on mobile.

### 11.5 Student dashboard

```
+---------------------------------------------------------------+
| Welcome back                         [ + New complaint ]       |
+----------+----------+-----------+-----------+-----------------+
| Total    | Open     | In prog.  | Resolved  | (stat cards)    |
+----------+----------+-----------+-----------+-----------------+
| Recent complaints (cards)        | How privacy works (info box)|
| C-2026-0045  Infrastructure  ... | Your identity is hidden ... |
| C-2026-0031  Academic  Resolved  | Tips for good complaints    |
+----------------------------------+-----------------------------+
```

**Complaint form:** one column. Details (title, description with counter, language) -> Classification (category, urgency) -> Location (optional) -> Privacy (Protected/Identified with explanation) -> Review and submit. Show redactor warning inline.

**Complaint detail:** header (tracking code, status badge) -> summary -> timeline -> follow-up box -> rating or reopen actions.

### 11.6 Department dashboard

Stat cards (Assigned, In progress, Resolved this month, Overdue); table sorted by priority then age; filter chips; detail with `StatusActions` and `UpdateComposer`.

### 11.7 Admin dashboard

```
+-----------+-----------+-----------+-----------+-----------+
| Total     | Unassigned| Overdue   | Pending   | Avg. res. |
|           |           |           | students  | time      |
+-----------+-----------+-----------+-----------+-----------+
| Trend (line: created vs resolved, 6 months)                |
+--------------------------+--------------------------------+
| By category (donut)      | By department (bar)            |
+--------------------------+--------------------------------+
| Needs triage (table, newest first)  | Recent audit events    |
+-------------------------------------+------------------------+
```

Admin complaint detail: two columns. Left = complaint and timeline. Right = Triage panel, assignment, status actions, similar complaints, AI suggestion panel (hidden when AI off), identity reveal button (only with permission).

### 11.8 Interaction details

- Loading: skeletons. Empty states: friendly message + one action. Errors: retry.
- Confirmation modals for withdraw, reject, suspend, reveal.
- Server-side pagination and filters; keep filter state in the URL query string.
- Accessibility: labels on inputs, focus states, keyboard-reachable modals, `aria-live` for toasts, 44 px touch targets.

### 11.9 Public board page (Should)

- Route `/student/board`: a card feed (title, summary, category badge, status badge, date) with a large Support button and a count.
- Filters: category and sort (Recent / Most supported). Infinite scroll or "Load more".
- Already-supported cards show a filled button; pressing again removes Support.
- A small note at the top: "Posts are reviewed by the administration. Personal details are never shown."
- Admin side: `/admin/board-requests` shows the original text on the left and editable public title/summary on the right, with Approve and Decline buttons.

## 12. Future AI/ML Integration Architecture

### 12.1 Principles

1. The app never depends on AI. Every AI call is optional, time-limited and failure-tolerant. With `AI_ENABLED=false` nothing changes.
2. AI suggests, humans decide. Output is stored as a suggestion; admin accepts or rejects. Auto-apply is a later setting.
3. One boundary. All AI code lives in the clearly marked AI INTEGRATION part of `index.js`; the rest of the file only talks to `aiOrchestrator`.
4. HTTP contract, any language for the AI service.
5. No identity ever crosses the boundary. Only redacted text and metadata are sent.

### 12.2 Architecture

```
 Complaint saved / admin clicks Analyze
          |
          v
  aiOrchestrator  (checks AI_ENABLED, builds redacted payload, timeout, retry)
          |
          v
  AiProvider interface
    |-- NoopProvider   (default: returns nothing)
    |-- MockProvider   (tests and demos: fixed/rule-based answers, clearly labeled mock)
    |-- HttpProvider   (calls AI_SERVICE_URL with API key)
          |
          v
   Future AI service (separate repo): classify, priority, department, duplicates, NLP
          |
   result --> complaint.aiSuggestion (status ready) --> Admin sees SuggestionPanel --> Accept / Reject
```

### 12.3 Hook points

| Future feature | Hook in your app | Manual version today |
|---|---|---|
| Complaint classification | `aiSuggestion.category` in TriagePanel | Admin selects category |
| Priority prediction | `aiSuggestion.priority` | Admin selects priority |
| Department recommendation | `aiSuggestion.department` | Category default department + admin choice |
| Duplicate detection | `aiSuggestion.duplicates` in SimilarComplaints | Text-search similar list + manual link |
| Bangla/English NLP | `aiSuggestion.language`, normalized text | Student selects language |
| PII detection | Optional `/v1/redact` before storing | Regex redactor |

### 12.4 Provider interface (build now)

Three methods documented in `ai.contract.md`, implemented by each provider:

- `health()`: availability and model version.
- `analyzeComplaint(input)`: category, priority, department, language, confidences, model version.
- `findDuplicates(input)`: candidate matches with scores.

The orchestrator calls the provider AFTER the complaint is saved, with a short timeout (e.g., 5 s), at most one retry, and catches all errors. Failure sets `aiSuggestion.status = failed`; the complaint is unaffected. Slow models may return `202 Accepted` and later call `POST /ai/callback` (signed with `AI_CALLBACK_SECRET`).

### 12.5 HTTP contract for the AI service (v1)

Auth: header `X-API-Key`. JSON, UTF-8.

**POST `{AI_SERVICE_URL}/v1/analyze`**

```json
{
  "requestId": "uuid",
  "trackingCode": "C-2026-0045",
  "text": "The AC in CSE Building Room 301 has not worked for two weeks.",
  "title": "Room 301 AC not working",
  "languageHint": "en",
  "studentSuggestion": { "category": "infrastructure", "urgency": "medium" },
  "taxonomy": {
    "categories": ["academic", "examination", "infrastructure", "finance", "library", "transport", "administration", "harassment", "cleanliness", "other"],
    "priorities": ["low", "medium", "high", "critical"],
    "departments": ["EXAM", "MAINT", "ADMIN", "FIN", "LIB", "TRANS", "CSE"]
  }
}
```

Response 200:

```json
{
  "requestId": "uuid",
  "modelVersion": "cls-0.3.1",
  "language": "en",
  "category": { "value": "infrastructure", "confidence": 0.91 },
  "priority": { "value": "medium", "confidence": 0.74 },
  "department": { "value": "MAINT", "confidence": 0.83 }
}
```

**POST `{AI_SERVICE_URL}/v1/duplicates`**

```json
{ "requestId": "uuid", "text": "...", "candidates": [ { "trackingCode": "C-2026-0031", "text": "..." } ] }
```

Response 200:

```json
{ "requestId": "uuid", "modelVersion": "dup-0.1", "matches": [ { "trackingCode": "C-2026-0031", "score": 0.88 } ] }
```

**GET `{AI_SERVICE_URL}/v1/health`** returns `{ "status": "ok", "modelVersion": "..." }`.

Rules: values use stable slugs and codes (not display names); unknown values are ignored and logged; breaking changes need `/v2`.

### 12.6 Stored suggestion (`complaints.aiSuggestion`)

| Field | Notes |
|---|---|
| `status` | none, pending, ready, failed, accepted, rejected |
| `category`, `priority`, `department` | `{ value, confidence }` each |
| `language` | Detected language |
| `duplicates` | `[{ trackingCode, score }]` |
| `modelVersion`, `requestedAt`, `completedAt`, `error?` | Traceability |

On accept: final fields set, `classification.source = 'ai'`, audit and timeline entry written. Both AI suggestion and admin final choice are stored, so the AI developer can measure agreement later.

### 12.7 Privacy rules for AI

- Send only title, description, language hint, tracking code, taxonomy. Never name, student ID, email, `ownerKey`, user ID.
- Run the regex redactor first; the AI service must not store requests beyond processing and should be hosted by the university or a trusted party.
- HTTPS + API key; callback verified by HMAC signature.
- Add "AI-assisted suggestions" to the privacy notice when enabled.

### 12.8 What the manual workflow gives the AI developer

Every admin triage is a human-labeled example (final category, priority, department). `/export/dataset.csv` gives it without identities. Quality depends on consistent labeling; real data needs university permission.

### 12.9 Handoff package

| You deliver | They deliver |
|---|---|
| `ai.contract.md` + `openapi-ai.yaml` | HTTP service implementing `/v1/analyze`, `/v1/duplicates`, `/v1/health` |
| MockProvider + simple mock server | Models: category, priority, department, duplicates, Bangla/English NLP |
| Taxonomy list (slugs, codes) | Evaluation report (accuracy, precision, recall, F1) |
| Anonymized dataset export | Deployment and API key |
| Feature flag, SuggestionPanel, settings | Model version updates via `modelVersion` |
| Integration test checklist | Passing the checklist against staging |

To enable later: `AI_ENABLED=true`, `AI_SERVICE_URL`, `AI_SERVICE_API_KEY`, provider `http`. No changes to routes, models or pages.

## 13. Complete Development Roadmap with Milestones

About 12 weeks part-time. Keep the order; build vertical slices.

| Milestone | Weeks | Deliverables | Done when |
|---|---|---|---|
| **M0 Foundation** | 1 | Repos, ESLint/Prettier, Firebase dev project, Atlas cluster, env validation, final ERD and wireframes, seed skeleton | Frontend and API deploy hello-world; `/health` works |
| **M1 Auth and RBAC** | 2 | Firebase signup/login, email verification, `register-profile`, `verifyToken`, `loadUser`, `authorize`, route guards, app shell, admin verification queue | Student registers, is approved, reaches right dashboard; wrong roles get 403 |
| **M2 Student complaints** | 3-4 | Models, privacy module (ownerKey, vault, serializers), tracking code, submit form, list/detail, timeline, student dashboard | Student submits and tracks; DB shows no user reference in complaints |
| **M3 Triage and workflow** | 5 | State machine, admin list/filters, triage panel, assignment, status actions, updates/notes, department dashboard | submit -> triage -> assign -> in progress -> resolved works across three roles |
| **M4 Management and audit** | 6 | Departments, categories, officer creation, permissions, settings, audit logs, identity reveal | Reveal only with permission and creates audit record |
| **M5 Analytics and duplicates** | 7 | Aggregation endpoints, charts, CSV export, similar complaints, duplicate linking | Dashboard numbers match DB |
| **M6 Student extras** | 8 | Withdraw, feedback, reopen, notifications, public board, empty/error states, polish | All Must and chosen Should items done |
| **M7 AI-ready layer** | 9 | Provider interface, Noop/Mock/Http providers, orchestrator, `aiSuggestion`, SuggestionPanel, contract docs, dataset export, mock AI server | Mock on: suggestions appear and can be accepted. Off: app unchanged |
| **M8 Hardening and testing** | 10 | Automated tests, security review (8.2), rate limits, accessibility/responsive pass | Tests green; no high-severity findings; usable at 360 px |
| **M9 Deployment and UAT** | 11 | Production deploy, demo data, test with 5-10 students and 2-3 staff, bug fixes | Feedback collected; critical bugs fixed |
| **M10 Documentation and defense** | 12 | Final report, API docs, user manual, demo video, presentation | Section 15 checklist complete |

### 13.1 Working method

- Git: `main` (stable, deployed), `dev` (integration), `feature/<name>`; PRs even when solo; conventional commits.
- Weekly: plan Monday, demo Friday, update checklist.
- Definition of done: validated input, authorization enforced, error states handled, a test for the key rule, documented in API file.
- Order inside a feature: model -> service + tests -> route -> Postman check -> frontend API function -> hook -> page.

### 13.2 If time runs short, cut in this order

Notifications -> CSV import -> officer-level assignment -> public board -> feedback/reopen -> dataset export. Never cut: privacy module, RBAC, audit log, state machine, authorization tests.

### 13.3 Risks

| Risk | Response |
|---|---|
| Scope creep toward AI | Keep to contract and mock; no model work |
| Over-engineering | Modular monolith; no queues, no microservices |
| Free-tier cold starts during demo | Warm the API or use always-on plan for demo week |
| Hard to get real data | Seeded demo data; real data only with university permission |
| Firebase/DB misconfiguration | Separate dev/prod; env validation at startup |

## 14. Testing and Deployment Strategy

### 14.1 Testing approach

| Layer | Tools | What to test |
|---|---|---|
| Backend unit | Jest | `stateMachine` (all allowed/forbidden transitions), serializers (allowlists per role), crypto (round trip, tamper detection), pseudonym (same user same key, different users differ), redactor, trackingCode |
| Backend integration | Jest + Supertest + mongodb-memory-server | Endpoints with a test user per role |
| Frontend | Vitest + React Testing Library | Complaint form validation, route guards, `StatusActions`, empty/error states |
| Manual end-to-end | Checklist 14.3 | Real Firebase login on staging |
| Performance | Seed 10,000 complaints; `explain()` | Queries use indexes |
| Accessibility/responsive | Lighthouse, keyboard, 360 px | Forms, tables, modals |

Firebase in tests: inject the token verifier as a dependency (production uses `firebase-admin`; tests pass a fake). Never add a debug login route to the real app.

Single-file backend: export the Express `app` from `index.js` and call `listen()` only when `NODE_ENV !== 'test'`, so Supertest can import it.

### 14.2 Tests that matter most

| Area | Example tests |
|---|---|
| Authorization matrix | For every endpoint and role (none, student, department, admin, admin with permission) assert 401/403/success per the RBAC matrix |
| Horizontal access | Student A requests Student B's complaint: 404 or 403 |
| Department scope | Dept X cannot read/update Dept Y's complaint or sensitive categories |
| Privacy | Staff responses never contain `ownerKey`, user IDs, student name/ID (unless identified); a test scans `complaints` for any ObjectId pointing to `users` |
| Identity reveal | Fails without permission or reason; writes audit; no identity returned if audit write fails |
| Mass assignment | `role`, `status`, `priority`, `ownerKey` in body ignored/rejected |
| Validation | Oversized text, invalid ObjectId, unknown fields, bad enums |
| Account state | Pending, suspended, unverified users blocked |
| AI off | With `AI_ENABLED=false` submission/triage work, AI endpoints return 503; failing/timing-out mock still lets submission succeed |
| Concurrency | 20 parallel submissions give 20 unique tracking codes |
| Public board | Private complaints never appear in `/board`; sensitive categories cannot be requested or published; board responses contain no description, location or user fields; a second Support from the same student returns 409; unpublish removes the post at once |

Targets: authorization matrix 100% covered; services at least 70% line coverage; CI passes before merging to `main`.

### 14.3 Manual test script (UAT)

1. Register a student, verify email, complete profile, see pending screen.
2. Admin approves; student reaches dashboard.
3. Student submits a protected complaint in Bangla and one in English.
4. Admin sees only tracking codes; triages and assigns.
5. Officer moves it to in progress and posts a public update.
6. Student sees the update; sends a follow-up.
7. Department resolves; student rates it; another is reopened.
8. Admin without permission cannot reveal identity; admin with permission can and audit log shows it.
9. Suspended user is blocked within a minute.
10. Analytics numbers match what you created.

### 14.4 Deployment plan

| Component | Platform | Key steps |
|---|---|---|
| Database | MongoDB Atlas | Create cluster; least-privilege DB user; restrict network access as far as the host allows (free hosts often lack static IPs: use strong password, rotate if exposed); backups if plan supports them, else periodic `mongodump` |
| Auth | Firebase | Separate dev/prod projects; enable Email/Password; add Vercel domain to authorized domains; service account for the API |
| Backend | Render or Railway | Connect GitHub; build `npm ci`; start `node src/server.js`; set env vars; health check `/health`; `CLIENT_ORIGIN` = Vercel URL |
| Frontend | Vercel | Connect repo; `npm run build`; set `VITE_*`; rewrite all routes to `index.html` |
| CI | GitHub Actions | On PR: install, lint, run backend and frontend tests |
| Monitoring | Host logs + uptime pinger on `/health` | Pinging also reduces cold starts |

Check each platform's current free-tier limits; they change.

Release checklist:
- Production env variables set; secrets differ from development.
- Seed script run once for categories, departments, first admin (never seed demo passwords in production).
- `npm audit` reviewed; CORS locked to production origin; helmet enabled.
- Smoke test with the manual script on production.
- Rollback: redeploy previous commit; keep DB changes backward compatible.

## 15. Final Project Documentation Checklist

### 15.1 Technical documents

- [ ] Software Requirements Specification (Sections 1-2)
- [ ] System architecture diagram and decisions (Section 3)
- [ ] ERD and data dictionary (Section 6)
- [ ] Authentication and RBAC document with permission matrix (Section 7)
- [ ] Privacy design document: pseudonymization, vault, reveal flow, threat model (Section 8)
- [ ] Security checklist with results
- [ ] API documentation: OpenAPI or Postman collection with examples (Section 9)
- [ ] Workflow diagrams: state machine, submission flow, reveal flow (Section 10)
- [ ] UI wireframes and final screenshots per role (Section 11)
- [ ] AI integration specification: contract, taxonomy, handoff package, enable instructions (Section 12)
- [ ] Test plan and test report (unit, integration, authorization matrix, UAT)
- [ ] Deployment guide and environment variable reference

### 15.2 Repository documents

- [ ] `README.md` in both repos: purpose, stack, setup, scripts, env variables, seed instructions
- [ ] `.env.example` files without secrets
- [ ] Folder structure explanation and coding conventions
- [ ] Clean Git history with meaningful commits and a tagged release
- [ ] License and a note about demo data

### 15.3 User documents

- [ ] Student guide
- [ ] Department officer guide
- [ ] Admin guide (verification, triage, reveal policy, analytics)
- [ ] Privacy notice and complaint-handling policy (who sees what, retention)

### 15.4 Academic and project documents

- [ ] Report chapters: introduction and problem, related work, methodology, system design, implementation, evaluation, conclusion and future work
- [ ] Evaluation: UAT usability feedback, privacy analysis, performance notes
- [ ] Ethics and data statement: demo data only, or university permission and anonymization steps
- [ ] Scope and contribution statement: what the web app delivers, what is reserved for the AI/ML developer, and how the contract connects them
- [ ] Limitations and future work (AI models, Bangla NLP, mobile app, email/SMS, DIU system integration)
- [ ] Demo video (3-5 minutes) and presentation slides

### 15.5 Final acceptance checklist

- [ ] All Must items (1.3) work on the deployed site
- [ ] Staff screens never show student identity in protected mode
- [ ] Identity reveal works only with permission and is audited
- [ ] App fully works with `AI_ENABLED=false`; mock AI works when enabled
- [ ] Works on phone and desktop; Bangla text displays and saves correctly
- [ ] Authorization tests pass; no secrets in the repository
- [ ] Seeded demo data and accounts for each role prepared for the presentation

**Suggested first step:** start Milestone M0. Before writing code, finalize the category list, department list and status names, because the AI contract and the database seed depend on those stable slugs and codes.