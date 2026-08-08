# Habitus — Pomodoro Time-Tracking Dashboard (Design Spec)

Single self-contained `index.html` (all CSS+JS inline). Vanilla JS, no frameworks. Persists to `localStorage` under key `tempo.v1`. Must work opened as a local file.

## Visual language
- Dark, premium, calm. Background `#0B0D12` with a very subtle radial glow top-center (`rgba(124,111,247,0.08)`).
- Cards: `#12151D` with 1px border `rgba(255,255,255,0.06)`, radius 20px, soft shadow.
- Fonts (Google Fonts CDN): "Fraunces" (700, for big numerals + headings, use `font-variation-settings` optional) and "Inter" (400/500/600 for UI). Timer digits use Fraunces, tabular feel, letter-spacing -2px.
- Text: primary `#EDEFF7`, secondary `#8A90A6`.
- Accent = active category's color. Category palette (defaults):
  - Deep Work `#7C6FF7`, Study `#4FC3F7`, Reading `#FFB86B`, Exercise `#4ADE80`, Creative `#F472B6`.
- Micro-interactions: 160ms ease transitions on hover; buttons lift slightly; focus ring uses accent.
- Scrollbars styled thin dark.

## Layout
Top bar: left — wordmark "tempo." (Fraunces italic, lowercase, accent-colored period). Right — nav pills: **Focus** | **Calendar**, plus a small gear icon (settings modal).
Max width 1080px, centered, 24–32px padding. Responsive: stacks on <760px.

## Data model (localStorage JSON)
```js
{
  categories: [{id, name, color}],
  sessions: [{id, catId, start /*epoch ms*/, end, note}], // logged focus sessions only (not breaks)
  settings: {work:25, short:5, long:15, longEvery:4, autoStart:false, sound:true},
  timer: {mode:'work'|'short'|'long', running:bool, startedAt, remainingMs, catId, cycleCount} // persisted so refresh doesn't lose the timer
}
```
Timer must be timestamp-based: on tick compute remaining from `Date.now()` vs `startedAt` (never rely on setInterval accuracy). Update `document.title` with countdown while running. Restore running timer on page load.

## View 1 — Focus (default)
Two-column grid (timer 1.2fr, stats 1fr; stacks on mobile).

**Timer card:**
- Segmented control: Focus / Short Break / Long Break.
- Big SVG progress ring (~300px, stroke 10, rounded caps), track `rgba(255,255,255,0.07)`, progress stroke = category color with a soft glow (`filter: drop-shadow`). Ring depletes clockwise.
- Center: huge MM:SS (Fraunces, ~72px) + category chip below.
- Category selector: row of pill chips (colored dot + name); active chip filled with the color at 18% alpha + colored border. A "+" chip opens the category manager modal (add/rename/recolor via color swatches/delete categories; deleting keeps existing sessions but marks them "Archived" gray `#6B7280`).
- Controls: primary Start/Pause button (large, pill, filled with accent), Reset ghost button, Skip ghost button.
- When a focus session completes (or is stopped after ≥1 min), log a session {catId, start, end}. Play a short pleasant WebAudio chime (two sine notes) if sound on. Auto-advance mode work→break per `longEvery`; auto-start next if setting on. Pomodoro dots under timer show progress in the cycle (e.g. ● ● ○ ○).
- Stopping early (press Reset while running with ≥1 min elapsed): log the partial session.

**Stats column (two stacked cards):**
1. **Today** — total focused time (big number), sessions count, and a horizontal stacked bar showing today's split by category + legend rows: colored dot, name, h:mm, % of day’s total.
2. **This week** — 7 vertical stacked bars (Mon–Sun, today highlighted with brighter label), each bar segmented by category color, tooltip on hover (title attr ok), y auto-scale. Under it: week total.

Also a "Recent sessions" list card below the grid (last 8): colored dot, category, date/time range, duration, and on hover an edit ✎ and delete ✕ button. Edit opens the session modal.

## View 2 — Calendar
- Month view. Header: ‹ month name year ›, "Today" button, and a "+ Log time" button (opens session modal in create mode).
- 7-col grid, weekday header row. Each day cell (min-height ~96px): day number (today = accent circle), then up to 3 small colored bars/chips, each = one category's total that day ("Deep Work · 1h 40m" truncated); "+2 more" if overflow. Days outside month dimmed.
- Cell shading: subtle heatmap — background alpha of white scaled by total focused minutes that day (cap ~4h), so productive days visibly glow.
- Click a day → slide-over panel (right side, 380px, or bottom-sheet on mobile) listing that day's sessions chronologically: time range, category chip, duration, note, edit/delete per row, and "+ Add session for this day".

**Session modal (create/edit):** category select (chips), date input, start time input, duration (minutes, number input) — end computed; optional note; Save / Delete / Cancel. Validate duration ≥1.

## Settings modal
Work / short / long durations (minutes), long break every N, auto-start toggle, sound toggle, and "Export data" (downloads JSON) / "Import" (file input) / danger "Clear all data" with confirm.

## Empty states & seed
First run: seed the 5 default categories and ~12 demo sessions spread over the past 10 days across categories (so charts/calendar look alive), plus a dismissible hint banner "Demo data — clear it in settings."

## Quality bar
- No console errors. Works entirely offline except fonts (must degrade gracefully to system fonts).
- Keyboard: Space = start/pause when Focus view active (ignore when typing in inputs).
- All state changes re-render affected views; keep code organized: `store`, `timer`, `ui.focus`, `ui.calendar`, `modals` sections with comment banners.
