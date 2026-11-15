# Task 006: Static Brand and Informational Pages

## 1. Objectives
- Implement the foundational Next.js App Router layout components (Header, Navigation, Mobile drawer, and Footer) adhering to approved designs from Task 005.
- Build static informational pages: Home (`/`), About (`/about`), Contact (`/contact`), and Pricing (`/pricing`).
- Populate the Pricing page dynamically with standard license ("Dùng chung"), exclusive license ("Độc quyền"), and custom composition packages read from a structured configuration file.
- Enforce the project UI localization policy: website UI is Vietnamese-only, but 100% of user-facing UI strings must reside in a single dictionary file (`src/lib/i18n/vi.ts` or `src/locales/vi.json`) for maintainability and i18n readiness.
- Implement comprehensive SEO metadata, OpenGraph tags, semantic markup, and mobile-first responsiveness.

## 2. Prerequisites (link docs)
- [Requirements](../requirements/requirements.md)
- [Architecture Overview](../architecture/overview.md)
- [Project Plan](../project-plan.md)
- [AGENTS.md](../../AGENTS.md)
- [Task 001: Project Setup](./001-project-setup.md)
- [Task 005: UI Design Mockups](./005-ui-design.md) (Formal owner approval required)
- [Task 007: Catalog UI and Player](./007-catalog-ui-player.md) (Task 007 lands first; Task 006 rebases on it)

## 3. Scope
- Components, directories, and files within task scope:
  - `src/app/layout.tsx`: Wrap Header and Footer around the existing layout structure established in Task 007 (Task 007 lands first, and Task 006 rebases on it, preserving `AudioPlayerProvider` and `AudioPlayerBar`).
  - `src/app/page.tsx`: Home page featuring hero banner, value proposition, featured track highlight, and custom composition CTA.
  - `src/app/about/page.tsx`: Artist bio, creative journey, and production philosophy.
  - `src/app/contact/page.tsx`: Official contact channels (social links, email, phone, location).
  - `src/app/pricing/page.tsx`: Pricing page rendered entirely from `src/config/pricing.ts` (placeholder data for the Phase 1 demo):
    - **Table 1, catalog track licenses**: "Dùng chung" (Standard) vs "Độc quyền" (Exclusive), each with a "Từ ..." (From ...) price and usage-rights bullets.
    - **Table 2, custom composition packages**: exactly three packages matching `vi.customRequest.tiers` (video/digital content; brand/advertising; song or bespoke arrangement). Per package: price range (min-max VND), free revisions count, delivery time in days, deliverables list, and optional add-ons with prices.
    - **Process block, 4 steps**: Gửi yêu cầu (Send request) -> Nhận báo giá (Receive quote) -> Duyệt bản nghe thử (Approve preview) -> Nhận file hoàn chỉnh (Receive final files).
    - **CTA** linking to `/custom-request`.
    - Every price entry carries `isPlaceholder: true`; the page shows a visible "Giá minh họa" (Illustrative price) badge while any placeholder price is rendered.
  - `src/config/pricing.ts`: Typed configuration defining license prices, usage-rights bullets, the three custom packages (fields above), add-ons, and process steps. Every price entry has an `isPlaceholder` flag.
  - `src/config/contact.ts`: Single source for phone, Zalo URL, Messenger URL, email, and social links. All values are clearly fake placeholders (e.g. `0900 000 000`) with `isPlaceholder: true`; to be replaced with real values before any real use.
  - `src/components/common/FloatingContact.tsx`: Fixed floating contact widget (Zalo, Hotline via `tel:` link, Messenger) mounted in the root layout so it shows on all pages. It must not overlap the Task 007 `AudioPlayerBar` (offset above the bar), must be keyboard accessible (focusable links, visible focus, accessible names), and takes all labels from the vi dictionary.
  - `src/lib/i18n/vi.ts` (or `src/locales/vi.json`): Centralized Vietnamese string dictionary.
  - `src/components/common/`: Header, Navigation, MobileMenu, Footer, Button, Card components.
  - `test/components/static-pages.test.tsx`: Component render tests using Vitest and React Testing Library.
- Explicitly Out of Scope:
  - Do NOT implement cart or checkout purchase buttons (deferred to Phase 2).
  - Do NOT implement user login/account screens (deferred to Phase 3).
  - Do NOT add features beyond the items above (no chat integrations, no live pricing calculator, no checkout).
  - Do NOT hardcode Vietnamese UI strings directly inside JSX components without referencing the centralized dictionary.

## 4. Definition of Done
- [ ] Root layout, header, navigation, and footer render cleanly and adapt responsively across mobile, tablet, and desktop viewports.
- [ ] Home, About, Contact, and Pricing pages are fully implemented and accessible via direct routes.
- [ ] Pricing page dynamically renders package details and prices from `src/config/pricing.ts`.
- [ ] Pricing page shows Table 1 (two licenses), Table 2 (three custom packages with range, revisions, delivery days, deliverables, add-ons), the 4-step process block, and a CTA to `/custom-request`, all driven by `src/config/pricing.ts`.
- [ ] Every price entry has `isPlaceholder: true` and the "Giá minh họa" badge is visible while any placeholder is rendered.
- [ ] `src/config/contact.ts` exists with fake placeholder values and `isPlaceholder: true`; Contact page and footer read from it.
- [ ] `FloatingContact` appears on every page with Zalo, Hotline (`tel:`) and Messenger, does not overlap `AudioPlayerBar`, and is keyboard accessible.
- [ ] All customer-facing text is sourced from the centralized Vietnamese dictionary file with zero raw hardcoded strings in page templates.
- [ ] Meta tags, page titles, descriptions, and OpenGraph tags are properly configured for every route.
- [ ] Linter and type-checker pass without errors.

## 5. Required Tests
- [ ] Component render tests via Vitest and React Testing Library verifying that Home, About, Contact, and Pricing pages mount and display expected sections.
- [ ] Localization dictionary test: Assert that all required translation keys exist in the dictionary and no undefined text tokens appear on page renders.
- [ ] Pricing render test: both tables, all three custom packages (range, revisions, days, deliverables, add-ons), process steps and `/custom-request` CTA render from `src/config/pricing.ts` values.
- [ ] Placeholder badge test: "Giá minh họa" shows when any entry has `isPlaceholder: true`, and is absent when none do.
- [ ] FloatingContact test: renders Zalo, Hotline and Messenger with hrefs equal to `src/config/contact.ts` values (hotline as `tel:`), labels from the vi dictionary, links reachable by keyboard.
- [ ] Mobile responsiveness smoke check and Lighthouse SEO/mobile audit pass without critical warnings.
