# Todo · Notes

A Kanban-style todo/notes app for tracking a project **phase by phase** (POC,
Foundation, RAG, …). Each phase is its own board with **Todo / In Progress /
In Review / Done** columns. Cards open into a rich editor (description,
checklist, comments, activity log) with a properties sidebar (status, priority,
type, tags, dates).

Built with **Bun + Vite + React + TypeScript** on a **locally-run Convex**
backend, with simple home-brewed email/password auth. The visual language is
borrowed from `sno-cms` (Fraunces display serif + Hanken Grotesk UI) on a
lighter, neutral palette.

---

## Stack

| Layer     | Choice                                                        |
| --------- | ------------------------------------------------------------- |
| Runtime   | Bun                                                           |
| Frontend  | Vite + React 19 + TypeScript, plain CSS design tokens         |
| Backend   | Convex (local deployment) — reactive DB + functions           |
| Auth      | Home-brewed email + password (salted SHA-256 + session tokens)|
| Drag/drop | `@dnd-kit`                                                    |

---

## Running locally

### Prerequisites
- [Bun](https://bun.sh) installed (`bun --version`)
- No Convex **account** is required — we run an anonymous **local** deployment.

### 1. Install
```bash
bun install
```

### 2. Start the local Convex backend (first run downloads the binary)
```bash
CONVEX_AGENT_MODE=anonymous bunx convex dev
```
The first run:
- downloads the Convex local backend + dashboard,
- starts the backend (port auto-assigned from the deployment name in `.env.local`),
- writes `CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL` to `.env.local`,
- pushes the schema and functions, and keeps watching for changes.

This project uses `CONVEX_DEPLOYMENT=anonymous:todo-notes` to avoid port
conflicts with other Convex projects (e.g. sno-cms on `:3210`). The actual
port is written to `VITE_CONVEX_URL` in `.env.local` (typically `:3212`).

Leave this running in its own terminal. The local dashboard URL is printed in
the output.

> **No auth keys to set up.** Auth is home-brewed (see below), so there are no
> JWT keys or env vars to provision — just run the backend and the web app.

### 3. Start the web app
```bash
bun run dev:web      # vite on http://localhost:5273
```

Or run **both** backend + frontend together:
```bash
CONVEX_AGENT_MODE=anonymous bun run dev
```

### 4. Open the app
Visit **http://localhost:5273**, click **Create an account**, sign up, and the
default phases (POC, Foundation, RAG, Hardening, Launch) are seeded
automatically.

---

## Auth (home-brewed)
This app does **not** use Convex Auth. Instead:
- `users` table stores `email`, an optional `name`, and a `salt` + `passwordHash`
  (salted **SHA-256** via Web Crypto, computed inside the mutation).
- On sign up / sign in, the server creates a random opaque token in the
  `sessions` table and returns it. The client stores it in `localStorage` and
  passes it as a `token` argument to every query/mutation; the server resolves
  the user via the `by_token` index (`requireUser` in `convex/auth.ts`).
- Sign out deletes the session row.

> This is deliberately minimal — fine for a local, single-project tool, **not**
> a hardened public service. For production you'd want a slow password hash
> (bcrypt/scrypt/argon2 via an action), token expiry/rotation, and rate limiting.

---

## Scripts
| Command              | What it does                                  |
| -------------------- | --------------------------------------------- |
| `bun run dev`        | Convex backend + Vite together (concurrently) |
| `bun run dev:web`    | Vite only                                     |
| `bun run dev:backend`| Convex local backend only                     |
| `bun run build`      | Type-aware production build of the web app    |

---

## Project layout
```
convex/
  schema.ts        tables: users, sessions, phases, todos, checklistItems, comments, activity
  auth.ts          home-brewed auth: signUp / signIn / signOut + requireUser(token)
  phases.ts        list / create / rename / archive / reorder / seed
  todos.ts         list / get / create / update / setColumn (drag) / remove
  checklist.ts     subtasks
  comments.ts      comments
  activity.ts      activity feed
  users.ts         current-user query
src/
  components/      Shell, Sidebar, Board, Column, TodoCard, TodoModal, Login
  lib/             constants, formatting helpers, shared types
  styles/          design tokens + per-surface CSS
```

---

## Notes on what's included
- **Phases** are seeded on first run and are fully editable: add (`+ Add phase`),
  rename (double-click the name), archive (hover → ✕).
- **Drag-and-drop** moves cards within and across columns; the new column +
  order is persisted and the move is recorded in the card's activity log.
- **Search** uses a Convex full-text index on titles; category/tag filters are
  applied client-side.
- The edit modal is the **core + essentials** set (status, priority, type,
  tags, start/due dates, checklist, comments, activity). Sprints, epics,
  assignees, attachments and linked tickets from the concept mockup were
  intentionally left out of this first build.
