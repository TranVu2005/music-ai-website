# Task 007: Track Catalog Page and Audio Preview Player

## 1. Objectives
- Develop the public Track Catalog page (`/tracks`) allowing users to browse, search, and filter pre-composed music tracks.
- Implement real-time keyword search (debounced) and dynamic filtering by genre and mood based on metadata retrieved from `GET /api/filters`.
- Build the Track Detail page (`/tracks/[slug]`) presenting complete metadata, artwork, waveform/scrubber, and track description.
- Implement a persistent, responsive web audio preview player component supporting play, pause, seek, volume adjustment, and duration display across both desktop and mobile viewports.
- Enforce strict single-stream playback concurrency: triggering playback of any track immediately pauses any currently active track.
- Display track BPM strictly as informational reference metadata with no search filter capability.

## 2. Prerequisites (link docs)
- [Requirements](../requirements/requirements.md)
- [Architecture Overview](../architecture/overview.md)
- [File Protection](../architecture/file-protection.md)
- [CLAUDE.md](../../CLAUDE.md)
- [Task 004: Catalog API Handlers](./004-catalog-api.md)
- [Task 005: UI Design Mockups](./005-ui-design.md) (Formal owner approval required)

## 3. Scope
- Components, directories, and files within task scope:
  - `src/app/tracks/page.tsx`: Catalog listing page integrating search input, genre and mood filter chips/dropdowns, track grid/list, and pagination controls.
  - `src/app/tracks/[slug]/page.tsx`: Individual track showcase page.
  - `src/components/player/`:
    - `AudioPlayerContext.tsx`: React Context / state store managing current track, playback state (`playing`, `paused`, `loading`), current time, duration, and volume.
    - `AudioPlayerBar.tsx`: Persistent bottom audio player docked across the application with responsive mobile drawer/mini-player mode.
    - `useAudioPlayer.ts`: Custom hook for audio element controls and event listeners.
  - `src/components/catalog/`: TrackCard, TrackSearchInput, FilterGroup, PaginationBar.
  - `test/components/catalog.test.tsx`: Component tests for catalog interactions.
  - `test/components/player.test.tsx`: Audio player component and context tests.
- Explicitly Out of Scope:
  - Do NOT implement "Add to Cart", "Buy Now", or checkout workflows (deferred to Phase 2).
  - Do NOT implement master file download buttons or direct master audio access.
  - Do NOT provide UI controls to filter tracks by BPM (BPM is purely informative).

## 4. Definition of Done
- [ ] Catalog page renders published tracks received from `GET /api/tracks`.
- [ ] Keyword search dynamically filters tracks with input debouncing.
- [ ] Genre and mood filter selectors dynamically populate from `GET /api/filters` and filter the listing.
- [ ] Track detail page renders full track details or displays a clean 404 page for invalid slugs.
- [ ] Audio player controls (play, pause, seek, volume/mute) function smoothly on desktop and mobile browsers.
- [ ] Concurrency check: playing any new track stops any previously playing audio immediately.
- [ ] BPM is displayed on track cards and details as metadata only, without filter interactions.
- [ ] All customer-facing UI labels are sourced from the Vietnamese dictionary file.
- [ ] Linter and type-checker pass without errors.

## 5. Required Tests
- [ ] Component tests using React Testing Library:
  - Verify track list renders correctly with data from mock API.
  - Verify search input debounces and updates filter state.
  - Verify genre and mood filter selection triggers appropriate API query updates.
  - Verify track detail page renders metadata (title, genre, mood, bpm, duration).
- [ ] Audio player unit/component tests:
  - Test play/pause toggle changes playback state.
  - Test seek updates playback time.
  - Test that selecting a second track pauses the first track and starts the second track.
