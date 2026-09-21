# Task 005: UI/UX Prototypes and Design Mockups

## 1. Objectives
- Design and build static HTML and Tailwind CSS visual prototypes of the Home page and Catalog page for both desktop and mobile viewports.
- Place all design prototypes in a dedicated `design/` folder within the repository.
- Ensure visual hierarchy, typography, color palette, responsive layout, track cards, filter controls, and audio player positioning match client aesthetic expectations.
- Use Vietnamese copy placeholders representing realistic website text and messaging per the project localization policy.
- Serve as the mandatory visual and UX approval gate for the store owner before proceeding with production frontend implementation in Task 006 and Task 007.

## 2. Prerequisites (link docs)
- [Requirements](../requirements/requirements.md)
- [Architecture Overview](../architecture/overview.md)
- [Project Plan](../project-plan.md)
- [CLAUDE.md](../../CLAUDE.md)

## 3. Scope
- Components, directories, and files within task scope:
  - `design/home.html`: Static HTML/Tailwind mockup of the Home page (hero section, featured tracks, artist intro, custom music request CTA, footer).
  - `design/catalog.html`: Static HTML/Tailwind mockup of the Catalog page (search bar, genre and mood filter tags, track cards with artwork/title/genre/mood/BPM/duration, bottom persistent audio player bar, pagination).
  - `design/assets/`: Design assets, mock artwork, and Tailwind styling assets used by the prototypes.
- Explicitly Out of Scope:
  - Do NOT write React components, Next.js page code, or application code in `src/`.
  - Do NOT implement actual audio streaming, API connections, or interactive JavaScript logic beyond basic markup prototyping.
  - Do NOT use English UI copy in prototypes (placeholders must be Vietnamese with authentic tone).

## 4. Definition of Done
- [ ] Static HTML/Tailwind prototypes for Home and Catalog pages created in `design/`.
- [ ] Responsive design verified on desktop (>= 1280px), tablet (768px - 1024px), and mobile (<= 375px) screen resolutions.
- [ ] Persistent audio player bar styled with playback controls (play/pause, scrubber bar, volume, current track info).
- [ ] Catalog track cards showcase title, artist/brand, genre, mood, duration, and BPM indicator.
- [ ] All UI copy placeholders use natural Vietnamese phrasing (e.g., `"Nghe thử"` ("Preview"), `"Thể loại"` ("Genre"), `"Đặt làm nhạc theo yêu cầu"` ("Commission custom music")).
- [ ] Formal review and approval of the design prototypes by the store owner is documented and granted (acts as prerequisite for Tasks 006 and 007).

## 5. Required Tests
- [ ] Visual design inspection across desktop and mobile viewport sizes.
- [ ] HTML markup validation ensuring semantic tags and valid structure.
- [ ] Verification that prototypes run standalone in a browser without application server dependencies.
