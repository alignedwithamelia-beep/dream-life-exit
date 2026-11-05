# The Dream Life™ Exit Hub

Relocation-planning portal for families moving abroad from the UK. Clients plan their move; the coach invites clients and writes their four-week plan, without seeing their private data.

## Two ways it runs

| | Local (prototype) | Signed in (Supabase) |
|---|---|---|
| Who | Welcome screen → demo, coach preview, "Try it without an account" | Invited clients and the coach |
| Data | `localStorage` in this browser | `client_private` / `client_shared` tables |
| Files | This browser visit only | Private `vault` storage bucket |

If `VITE_SUPABASE_URL` is missing, the app is local-only, exactly as described in the spec.

## Privacy model

- `client_private`: checklist, household, vault metadata, dates, planner, journal, contacts. **Client only**: there is no coach policy.
- `client_shared`: the four-week plan and checklist totals. Client and coach.
- `vault` bucket: files under `<client_id>/…`. **Client only.**

Coach plan edits are merged in, so the coach changes the wording while the client's ticks and notes are kept. They arrive in the client's Hub live through Supabase Realtime.

## Setup

1. `npm install`, then copy `.env.example` to `.env` and fill it in.
2. In Supabase > SQL editor, run `supabase/migrations/20261106090000_hub_v2.sql` (the two earlier files are the original schema it replaces).
3. Supabase > Authentication > URL configuration: set Site URL to your site, and add `http://localhost:*/**` (or each local port you use) and your live site to the redirect URLs.
4. Make your coach account: sign up once, then run `update profiles set role = 'coach', access = 'active' where email = 'you@…';`
5. `npm run dev` runs the app and the invite function together (a small Vite plugin runs `netlify/functions` locally). `npx netlify dev` works too.
6. For client sign-in emails to arrive, set up custom SMTP in Supabase > Authentication > SMTP (for example with Resend). Supabase’s built-in email only sends to your own team’s addresses, a few per hour.

## Netlify functions

- `invite`: coach-only. Creates the client and emails a one-time sign-in link via SMTP (`SMTP_*`, e.g. Gmail with an app password) or Resend. With neither set, it returns the link for the coach to copy.
- `reminders`: runs daily at 07:00 UTC and emails each client the dates whose reminder falls that day. It does nothing until SMTP or Resend is configured.

## Code map

- `src/lib/store.tsx`: state, local/remote persistence, realtime plan sync
- `src/lib/defaults.ts`: categories, the 46 default tasks, the starter plan, demo data
- `src/lib/logic.ts`: checklist %, countdowns, next steps, alerts
- `src/lib/coach.ts`: coach data (local demo or Supabase)
- `src/screens/*`: one file per page
