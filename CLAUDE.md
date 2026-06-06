# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # eslint check
```

No test suite is configured.

## Environment Variables

Two keys are required (set in `.env`):
- `NEXT_PUBLIC_SUPABASE_URL` — safe to expose, used client + server
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe to expose, subject to RLS
- `SUPABASE_SERVICE_ROLE_KEY` — **never expose to the browser**, bypasses RLS

## Architecture

**Next.js 15 App Router, fully serverless.** All pages under `app/dashboard/` are client components. All data fetching goes through `app/api/` route handlers — the UI never calls Supabase directly.

### Auth flow

`AuthProvider` (`components/AuthProvider.tsx`) is a React context that wraps the entire app. It calls `/api/auth/me` on mount to hydrate the user. Login/logout call `/api/auth/login` and `/api/auth/logout`, which use the Supabase SSR client to manage session cookies. `getAuthUser(req)` in `lib/auth.ts` is the server-side helper used by every API route to verify the session.

### Two Supabase clients

| Client | File | When to use |
|--------|------|-------------|
| SSR anon client | `lib/supabase.ts` → `createSupabaseClient(req)` | Auth routes (login, register, me, logout) — manages cookies |
| Service-role admin client | `lib/supabase-admin.ts` → `getSupabaseAdmin()` | All other API routes — bypasses RLS, never call from browser |

### Column aliasing convention

`lib/supabase.ts` exports `*_COLS` constants (e.g. `GRAVE_COLS`, `BURIAL_COLS`) that use PostgREST aliasing syntax to return camelCase keys from snake_case DB columns (`graveNumber:grave_number`). Always use these constants in `.select()` calls so the rest of the app works with camelCase throughout.

### Error responses

All API routes use `errorResponse(message, error, status?)` from `lib/error-handler.ts`. This produces a consistent shape:
```json
{ "message": "...", "version": "v1", "error": "..." }
```
Use `errorResponse` in every `catch` block. Do not use `NextResponse.json({ error: ... })` in catch blocks.

### Role-based access

Three roles: `admin`, `staff`, `family`. The sidebar (`components/layout/Sidebar.tsx`) filters nav items by `user.role`. API routes enforce roles inline: check `auth.role` after calling `getAuthUser(req)` and return 403 if not permitted. Family users are scoped to their own records by filtering on `booking_user_id` / `user_id`.

### Database schema

Schema lives in `supabase/schema.sql`. Tables: `profiles`, `graves`, `burials`, `payments`, `certificates`, `maintenance`, `notifications`. All API routes use the admin client so RLS policies don't apply server-side. Types for all entities are in `lib/db.ts`.

Graves are seeded via `POST /api/setup/graves` (requires `Authorization: Bearer <SERVICE_ROLE_KEY>`) — this endpoint should be called once and then removed or gated. 390 graves across sections A, B, C, D, VIP.

### UI conventions

- Dark theme only (`bg-slate-950` body, `bg-slate-900` sidebar, `bg-slate-800` cards/inputs).
- Accent color: `emerald-500`.
- Utility: `cn()` from `lib/utils.ts` (clsx + tailwind-merge).
- Currency formatted as PKR via `formatCurrency()` in `lib/utils.ts`.
- No shared component library beyond `components/ui/Badges.tsx` — inline Tailwind throughout pages.
