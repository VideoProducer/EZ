# EZtoFind.ca — Changelog

(Appended chronologically. PRD.md holds the static problem statement/architecture; this file grows over time.)

## June 2026 — Doogie Interactive Agent (Apple-style) at `/visual-agent-demo-next`

**What shipped**
- New preview page `frontend/src/pages/VisualAgentDemoNext.jsx` — an Apple-style front end for the Doogie AI agent, built on the shared `homenext` design system (HomeNextNav + HomeNextFooter, `hn-*` tokens).
- Reuses the existing, already-tested chat engine unchanged: renders `<DoogieChat mode="embedded"/>` (from `App.js`) inside an Apple-styled "stage" card. Zero duplication of chat/voice/TTS/streaming logic.
- Sections: hero (eyebrow + big title + white-eyes `doogie-thinking.png` mascot + compliance micro-line), prompt-starter chips, embedded chat stage, "What Doogie can do" capability tiles (lucide icons), buyer/seller handoff CTA, RESA/PIPA/CREA compliance fine print.
- Prompt-starter chips drop text into the chat input via a new `window` CustomEvent `ez-doogie-ask`, handled by a small listener added inside `DoogieChat` (`App.js`, near the `ez-open-doogie` listener).
- CSS: `.hn-agent*` block appended to `components/homenext/homeNext.css`, including a scoped re-skin of the embedded Doogie panel (`.hn-agent .doogie-panel-embedded ...`) to the Apple aesthetic (white header, rounded bubbles, pill input) without touching the shared component.
- Route added in `App.js`: `/visual-agent-demo-next` (lazy, noindex/nofollow preview). Original `/visual-agent-demo` (VisualAgentDemo.jsx) left untouched.

**Verification**
- Testing agent (iteration_22.json): 100% of listed acceptance criteria passed — page renders (not stuck on Suspense), consent gate works, chip populates input, SSE assistant reply streams & renders, listing-search query submits, zero horizontal overflow at 390px.
- Lazy chunk `src_pages_VisualAgentDemoNext_jsx.chunk.js` serves HTTP 200 via localhost and the preview proxy; clean webpack compile.

**Notes for next agent**
- The internal screenshot tool captures the brief `Loading…` Suspense fallback for this app's lazy routes (returns an early frame regardless of in-script waits). Use the testing agent or `wait_for_selector('[data-testid="visual-agent-next"]', timeout>=20s)` for reliable visual checks.
- Assistant message bubbles still lack a dedicated `data-testid` (shared component) — optional future improvement for test reliability.
- Deployed together with the earlier late UI tweaks (mobile hamburger menu, testimonial font, white-eyes Doogie on `/`) that missed the previous deploy.
