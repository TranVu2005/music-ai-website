# Task: 010 — Agent Runtime Handover (Gemini to Codex + Claude Code)

## 1. Objectives
- Move implementation from Google Antigravity (Gemini) to OpenAI Codex and PR review to Claude Code. Claude in the claude.ai Project remains lead; Vu remains product owner and sole merger.
- Keep one canonical repository skills directory discoverable by Codex, with an explicit skill pointer for Claude Code.

## 2. Prerequisites (link docs)
- Read before implementation:
  - [Requirements](../requirements/requirements.md)
  - [Architecture Overview](../architecture/overview.md)
  - [Database Schema](../architecture/database-schema.md)
  - [Payment Flow](../architecture/payment-flow.md)
  - [File Protection](../architecture/file-protection.md)
  - [Agent Guidelines](../../AGENTS.md)
  - [Project Status](../status.md)
  - [Changelog](../../CHANGELOG.md)
  - [Task Template](_template.md)

## 3. Scope
- Allowed modifications: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `docs/status.md`, `docs/tasks/_template.md`, this task file, `CHANGELOG.md`, and the canonical skills move into `.agents/skills/`.
- `.gemini/settings.json` stays unchanged for rollback; only `GEMINI.md` receives the deprecation note.
- Explicitly out of scope: `src/`, `test/`, `tools/`, `build/`, `.github/`, `package.json`, `package-lock.json`, Prisma files, symlinks, and `.claude/skills/`.

## 4. Definition of Done
- [ ] Existing AGENTS.md rules remain verbatim; workflow, exact commands, PR evidence, and four roles are added.
- [ ] All 14 skills are moved with Git history to `.agents/skills/`, with no copied skills or symlinks.
- [ ] `CLAUDE.md` tells Claude Code to read relevant skills from `.agents/skills/` on demand.
- [ ] `docs/status.md` updates only roles, agent runtime, handover progress, and last-updated line.
- [ ] `GEMINI.md` marks Gemini deprecated; `.gemini/settings.json` remains unchanged.
- [ ] Task template includes Acceptance evidence and Plan approval sections.
- [ ] Changelog records the handover.
- [ ] PR cites the official [Codex skills documentation](https://learn.chatgpt.com/docs/build-skills) and [Claude Code skills documentation](https://code.claude.com/docs/en/skills).
- [ ] PR body contains the raw verification output, this checklist, and `git diff --stat main`.

## 5. Required Tests
- [ ] Run `npm ci && npm run lint && npm run typecheck && npm test && npm run build` without skipping or modifying tests.
- [ ] Run `git diff --stat main`; only in-scope paths may appear.
- [ ] Check that current documentation points only to the new repository skill path.
- [ ] Check that all 14 skill directories exist at `.agents/skills/` and none remain at the former location.
- [ ] If local PostgreSQL is unavailable, include the raw failing output, state the missing database prerequisite, and link the PR CI run.

## 6. Acceptance evidence
- Paste raw output of the required npm chain and `git diff --stat main` in the PR body, including any failure.
- Include the completed Definition of Done checklist and a link to the PR CI run.

## 7. Plan approval
- Codex presented a numbered plan listing files, exact changes, and open questions before changing any file.
- Vu approved the plan with these changes: move skills with `git mv` to `.agents/skills/`; use a pointer in `CLAUDE.md` with no symlinks; leave `.gemini/settings.json` untouched; preserve raw database-related failures and link CI.
