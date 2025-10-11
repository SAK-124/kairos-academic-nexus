# Kairos Academic Nexus Audit

_Date: 2025-10-11_

## Executive Summary
- **Security-critical data exposure risks**: Several data-fetching paths omit user scoping, allowing any authenticated user to read or mutate other users' notes and related metadata.
- **Broken or misleading UX flows**: Key call-to-action elements ignore admin-configured content and parent handlers, leading to confusing behaviour and making parts of the CMS ineffective.
- **Hook and routing defects**: Multiple components violate React hook rules or rely on brittle navigation patterns that will misbehave in production builds.
- **Developer experience gaps**: Extensive `any` usage and unmet lint expectations hide additional defects and make regressions hard to catch automatically.

## Detailed Findings

### 1. Notes area ignores per-user scoping (High severity)
- `loadNotes`, `loadCoursesAndFolders`, and follow-up mutation handlers fetch and update records without filtering by the signed-in user, so every authenticated user can read or toggle any note, course, or folder in the database.【F:src/pages/Notes.tsx†L62-L146】
- The sidebar helper makes the same mistake for the courses, folders, and study materials lists, exposing global data in the sidebar as well.【F:src/components/notes/NotesSidebar.tsx†L73-L113】
- The note editor retrieves whichever note ID is passed in the URL without verifying ownership, which means manually guessing an ID grants full read/write access.【F:src/pages/NoteEditor.tsx†L46-L116】

### 2. Hero CTA bypasses admin configuration and parent logic (High severity)
- `HeroSection` accepts an `onCTAClick` prop and subscribes to dynamic content, but the rendered CTA hard-codes navigation to `/scheduler`, ignores the supplied handler, and never uses the admin-controlled CTA text or route. That makes the CMS controls and authentication gate in `Index.tsx` ineffective.【F:src/components/landing/HeroSection.tsx†L17-L128】【F:src/pages/Index.tsx†L41-L70】

### 3. Navigation waitlist control misroutes (Medium severity)
- On non-home routes the waitlist button calls `navigate("/#waitlist")`, which React Router treats as a literal pathname instead of scrolling to an anchor. This produces a blank page with a 404 route rather than taking the user to the intended section.【F:src/components/Navigation.tsx†L35-L205】

### 4. Flashcard and quiz viewers break React hook invariants (High severity)
- Both viewers return early when there is no data, so `useIsMobile` and `useEffect` are invoked conditionally. React will eventually throw when the dataset changes, preventing these study tools from opening reliably.【F:src/components/notes/FlashcardViewer.tsx†L24-L105】【F:src/components/notes/QuizViewer.tsx†L21-L107】
- The keyboard handlers omit stable dependencies (`handleFlip`, `handleNext`, `handlePrevious`, `onClose`), so the registered listeners use stale closures and do not respond after state updates.【F:src/components/notes/FlashcardViewer.tsx†L85-L99】

### 5. AI search builds invalid text-search queries (Medium severity)
- The edge function forwards comma-separated “search terms” directly into `textSearch('plain_text_search', searchTerms)`. Postgres expects a valid `to_tsquery` expression; commas yield syntax errors and empty responses, so AI-assisted search silently fails.【F:supabase/functions/search-notes/index.ts†L13-L64】

### 6. UI polish regressions (Low severity)
- The “Join Waitlist!” hero button is declared as `variant="outline"` while also applying a solid gradient background, so focus/hover tokens do not match the visual treatment and the component looks broken in high-contrast themes.【F:src/components/landing/HeroSection.tsx†L95-L106】
- Mobile sheets in the navigation leave a stray semicolon-rendered artefact because the handler includes a dangling `;` expression inside the JSX callback.【F:src/components/Navigation.tsx†L196-L205】

### 7. Developer experience debt (Medium severity)
- `npm run lint` currently reports 58 errors and 14 warnings, flagging the hook violations above plus pervasive `any` usage. These failures mask real bugs and keep Fast Refresh from working in a number of UI primitives.【0a2fd8†L1-L7】【136d26†L1-L103】
- The Tailwind config still mixes `require` calls with ESM syntax, which breaks TypeScript-aware tooling and triggers lint errors in projects that expect native imports.【136d26†L98-L101】【F:tailwind.config.ts†L1-L74】

## Recommendations
1. **Scope every Supabase query by `user_id`** (or a row-level security policy) before production deployment. Add integration tests to prevent regressions.
2. **Respect admin-managed CTA metadata** by wiring `HeroSection` to the supplied handler and the stored button mapping (text, enabled flag, route).
3. **Replace `navigate("/#waitlist")`** with a two-step approach: navigate to `/` and, once the route resolves, scroll to the anchor—mirroring the existing desktop logic.
4. **Move hooks above guard clauses** in the flashcard and quiz viewers and fix dependency arrays so keyboard shortcuts stay synchronized.
5. **Normalise AI search terms** into a valid `to_tsquery` string (e.g., replace commas with ` & ` and escape reserved characters) before calling `.textSearch`.
6. **Clean up styling mismatches** and JSX typos to avoid confusing UI artefacts on the landing page and mobile menu.
7. **Unblock lint** by addressing the reported errors (particularly hook misuse and `any` types) so automated quality gates can be re-enabled.

## Suggested Next Steps
- Prioritise data-isolation fixes and hook repairs, as they have the highest end-user impact.
- Schedule a dedicated sweep for lint/type hygiene after the functional defects are resolved.
- Consider introducing automated UI snapshots or manual QA around the marketing site to catch styling regressions sooner.

