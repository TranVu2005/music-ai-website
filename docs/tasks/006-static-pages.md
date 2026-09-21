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
- [CLAUDE.md](../../CLAUDE.md)
- [Task 001: Project Setup](./001-project-setup.md)
- [Task 005: UI Design Mockups](./005-ui-design.md) (Formal owner approval required)
- [Task 007: Catalog UI and Player](./007-catalog-ui-player.md) (Task 007 lands first; Task 006 rebases on it)

## 3. Scope
- Components, directories, and files within task scope:
  - `src/app/layout.tsx`: Wrap Header and Footer around the existing layout structure established in Task 007 (Task 007 lands first, and Task 006 rebases on it, preserving `AudioPlayerProvider` and `AudioPlayerBar`).
  - `src/app/page.tsx`: Home page featuring hero banner, value proposition, featured track highlight, and custom composition CTA.
  - `src/app/about/page.tsx`: Artist bio, creative journey, and production philosophy.
  - `src/app/contact/page.tsx`: Official contact channels (social links, email, phone, location).
  - `src/app/pricing/page.tsx`: Pricing comparison table for "Dùng chung" (Standard), "Độc quyền" (Exclusive), and Custom composition service tiers.
  - `src/config/pricing.ts`: Configuration file defining pricing packages, feature bullets, and license descriptions.
  - `src/lib/i18n/vi.ts` (or `src/locales/vi.json`): Centralized Vietnamese string dictionary.
  - `src/components/common/`: Header, Navigation, MobileMenu, Footer, Button, Card components.
  - `test/components/static-pages.test.tsx`: Component render tests using Vitest and React Testing Library.
- Explicitly Out of Scope:
  - Do NOT implement cart or checkout purchase buttons (deferred to Phase 2).
  - Do NOT implement user login/account screens (deferred to Phase 3).
  - Do NOT hardcode Vietnamese UI strings directly inside JSX components without referencing the centralized dictionary.

## 4. Definition of Done
- [ ] Root layout, header, navigation, and footer render cleanly and adapt responsively across mobile, tablet, and desktop viewports.
- [ ] Home, About, Contact, and Pricing pages are fully implemented and accessible via direct routes.
- [ ] Pricing page dynamically renders package details and prices from `src/config/pricing.ts`.
- [ ] All customer-facing text is sourced from the centralized Vietnamese dictionary file with zero raw hardcoded strings in page templates.
- [ ] Meta tags, page titles, descriptions, and OpenGraph tags are properly configured for every route.
- [ ] Linter and type-checker pass without errors.

## 5. Required Tests
- [ ] Component render tests via Vitest and React Testing Library verifying that Home, About, Contact, and Pricing pages mount and display expected sections.
- [ ] Localization dictionary test: Assert that all required translation keys exist in the dictionary and no undefined text tokens appear on page renders.
- [ ] Mobile responsiveness smoke check and Lighthouse SEO/mobile audit pass without critical warnings.
