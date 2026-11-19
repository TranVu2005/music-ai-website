# Milestone 1 Acceptance Report (Phase 1 demo)

> Status: **in progress, not signed off.** Evidence below was collected 2026-11-18 and 2026-11-19. Items marked "human-verified by the owner" are not executed by an agent.
> Hard rule: **No real customer orders on any free tier.** This deployment is a demo for stakeholder review only.

## 1. Environment under test

| Item | Value |
|---|---|
| Demo URL | https://music-shop-demo.onrender.com |
| Hosting | Render free web service, Docker (`build/deploy/Dockerfile`), Singapore |
| Database | Neon free Postgres (Singapore), migrations applied with `prisma migrate deploy`, seeded with `npm run db:seed` (5 tracks) |
| Email | Resend, `EMAIL_FROM=onboarding@resend.dev`, `OWNER_NOTIFICATION_EMAIL` = owner's Resend account address |
| Deployed commit | `866e73d` on `feat/task-009-deploy-acceptance` (later commits change only tests and docs) |
| `TRUSTED_PROXY_HOPS` | `3` on Render |
| Reminder | The free instance spins down after about 15 minutes idle. Open the URL 1-2 minutes before any review meeting. The first request took 12.9 s in testing. |

## 2. Production smoke tests (agent, `curl`, 2026-11-18)

| Check | Result |
|---|---|
| `GET /api/health` | 200 `{"status":"ok"}` (12.9 s cold start) |
| `GET /api/tracks` | 200, `total` 5, each `durationSeconds` 20 |
| `GET /api/filters` | 200 |
| `/`, `/tracks`, `/about`, `/pricing`, `/contact`, `/custom-request` | 200 |
| `GET /audio/previews/softly.mp3` | 200; `Range: bytes=0-1023` returns 206 |
| `POST /api/custom-requests` with a valid test payload | 201 `{"ok":true}` |

## 3. Milestone 1 checklist

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | Website loads on desktop browsers (Chrome, Safari, Firefox) | Partial | Loaded and exercised in the Claude desktop app's built-in Chromium browser (see section 4). Safari and Firefox: **to be human-verified by the owner**. |
| 2 | Real-device mobile (iOS Safari, Android Chrome) | **Human-verified by the owner**: pending | Checklist in section 6. The owner reported a successful form submission from a phone on mobile data (see row 7). |
| 3 | At least 5 sample tracks visible with complete metadata | Pass | `/tracks` shows "5 bài phù hợp": Ambient Pad, Merfolk Music Box, Work, Shoepop, Softly, each with genre, mood, 0:20 duration and BPM. |
| 4 | Filter by genre and mood | Pass | Genre and mood controls list 5 genres and 5 moods; `/tracks?genre=Ambient&mood=Peaceful` shows "1 bài phù hợp" (Ambient Pad). |
| 5 | Previews play, seek and pause | Partial | Desktop (built-in Chromium): pressing play started playback, the bar advanced to 0:08 / 0:20, and pause worked. Seek and mobile playback: to be human-verified by the owner. Server returns 206 for range requests. |
| 6 | Custom request form submits with client validation | Pass (submit), validation covered by tests | Test payload returned 201. Server validation covered by `test/api/custom-requests.test.ts` in CI. |
| 7 | Submitted request persisted in `custom_requests` | Owner to confirm in Neon Tables | The test request returned 201 after the database insert. The owner's phone submission over mobile data was reported as accepted. |
| 8 | Email notification reaches the owner's inbox | Pass (owner-reported) | The owner confirmed the test notification arrived in the inbox on 2026-11-19. The Resend dashboard log was not visible to the owner, so no Resend delivery record is attached. |

## 4. Desktop browser check details (built-in browser, 2026-11-19)

- `/tracks` text shows 5 tracks and the genre and mood filter lists.
- `/tracks?genre=Ambient&mood=Peaceful` returns 1 result.
- Player: after pressing play on Ambient Pad, the player bar showed 0:08 / 0:20 with "Tạm dừng" (pause) controls; pressing pause returned it to the paused state.
- Not covered: Safari, Firefox, seek by dragging, volume.

## 5. Proxy header chain and rate limit

- Observed on Render: `x-forwarded-for` = `<client>, <Cloudflare edge>, <Render internal 10.x>` (3 entries), `x-real-ip` absent. `TRUSTED_PROXY_HOPS=1` (default) selected the shared internal address; `3` selects the real client.
- With `3`, spoofed `X-Forwarded-For` values did not bypass the limiter: 8 requests with different spoofed values gave 400 x5 then 429 x3 (exactly 5 accepted per 10 minutes).
- No `no trusted client IP` (`unknown-client`) warning was observed.
- A request from the owner's phone on mobile data was accepted (reported by the owner). The server-side client IP for that request was not captured after the temporary log was removed, so "two different networks" is **owner-reported**, not log-proven.
- An earlier run let 6 requests through before limiting. Code review shows no off-by-one; the cause was not reproduced (see PR #19).

## 6. Real-device checklist (human-verified by the owner)

Tester: __________  Date: __________  Open the demo URL 1-2 minutes earlier to wake the service.

| Check | iOS Safari | Android Chrome |
|---|---|---|
| Home page loads, layout readable, menu opens | [ ] | [ ] |
| `/tracks` shows 5 tracks; genre and mood filters work | [ ] | [ ] |
| Tap play: audio starts (no autoplay block) | [ ] | [ ] |
| Seek by dragging the progress bar | [ ] | [ ] |
| Pause and resume; only one track plays at a time | [ ] | [ ] |
| Floating contact widget does not cover the player bar | [ ] | [ ] |
| `/custom-request`: invalid input shows validation messages | [ ] | [ ] |
| `/custom-request`: valid submit shows success | [ ] | [ ] |

Notes: ______________________________________________

## 7. Known limitations and open decisions

- Previews are CC0 community recordings from Wikimedia Commons, not the client's tracks (sources and licences listed in PR #19). Replace before real use.
- Pricing and contact details are placeholders (`isPlaceholder: true`).
- Free tiers: no persistent disk, spin-down after idle, no pre-deploy command. Not for real orders.
- Open for the owner: masters location versus `docs/architecture/file-protection.md` and the `CLAUDE.md` folder rule; audio rights confirmation (PR #19).

## 8. Sign-off

| Role | Name | Decision | Date |
|---|---|---|---|
| Product owner | Vu | [ ] Accepted  [ ] Rejected | |
