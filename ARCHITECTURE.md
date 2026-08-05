# Tempo — architecture notes

Orientation for anyone (human or agent) picking this project up cold. Read this before
editing `index.html`; it will save you from re-deriving the parts that aren't obvious.

## The shape of the thing

**Tempo is one file.** `index.html` (~5,900 lines) holds the markup, the CSS and every line
of JavaScript in a single inline `<script>`. There is no build step, no bundler, no package
manager, no framework. Open the file in a browser and it runs.

This is deliberate, not neglect: the app is small enough that a build step would cost more
than it returns, and a single file is trivially hostable and trivially backed up. **Don't
add a bundler, a framework, or an `npm install` without a concrete reason.** If you split
the file, you break "drag one file onto Netlify" as a deployment story.

Files in the repo:

| File | What it is |
|---|---|
| `index.html` | The entire application |
| `test.mjs` | `node test.mjs` — self-check for the heatmap's hour bucketing |
| `ARCHITECTURE.md` | This file |
| `CHANGELOG.md` | What changed and why, newest first. Add to it. |
| `SYNC-SETUP.md` | End-user instructions for wiring up Firebase cloud sync |
| `DEPLOY.md` | How the site gets published |
| `SPEC.md`, `SPEC-V2.md` | Original design specs. Historical — the code has moved past them. |

Only two external dependencies, both loaded from a CDN in `<head>`: Google Fonts (cosmetic;
falls back cleanly) and the Firebase compat SDK (only used if sync is configured). Everything
else is vanilla DOM.

## Data model

Everything lives in one `store` object, serialised to `localStorage` under the key
`tempo.v1`, and optionally mirrored to Firestore. Its shape:

```js
store = {
  categories: [{ id, name, color, groups: { [axisId]: 'value' } }],
  axes:       [{ id, name }],              // grouping dimensions — see below
  lens:       { axis: 'group', hidden: { [axisId]: ['Office'] } },
  sessions:   [{ id, start, end, catId, note, taskId }],   // start/end are epoch ms
  tasks:      [{ id, text, pomodoros, done }],
  settings:   { work, short, long, longEvery, dailyGoalMin, theme, reminderOn, … },
  timer:      { mode, running, startedAt, remainingMs, sessionStartedAt, catId, … },
}
```

A **session** is the atomic record: a start time, an end time, and a category. Everything
in Insights and Calendar is a different projection of the same session list.

`saveStore()` writes to localStorage and schedules a debounced push to Firestore.
`loadStore()` reads it back and runs the migrations.

### Migrations

There is no schema version. Instead, `loadStore()` defensively fills in fields that older
saves lack (`if (store.settings.x === undefined) store.settings.x = default`). Adding a new
persisted field means adding a line there. Grouping-specific migration lives in
`normalizeGrouping()`, which is **idempotent and called from two places** — `loadStore()`
and `cloudSync.applyRemote()` — because a second device may still be running an older
build and push you a store without the new fields.

## Grouping axes and the lens

This is the least obvious part of the app, and the part most likely to be misunderstood.

A category has a `name` and a `color`. On top of that, it carries a value on each
**grouping axis** — an independent way of slicing the same set of categories:

```
Category "Standup":  Context = Office,  Type = Admin
Category "Reading":  Context = Home,    Type = Deep
```

`store.axes` lists the axes. `cat.groups[axisId]` holds that category's value on one. Axes
are independent, not nested — "Context" and "Type" are two different questions about the
same category, and neither is a sub-division of the other.

Exactly one axis is active at a time (`store.lens.axis`). Values on the active axis can be
**hidden**, which excludes every session in those categories from every view — the point
being "don't show me office work in my analysis" as one click rather than a per-card
setting. Hidden values are tracked **per axis** (`store.lens.hidden[axisId]`), so switching
axes and switching back restores what you'd hidden there.

### The one rule

> **Every view reads sessions through `visibleSessions()`, never `store.sessions`.**

`visibleSessions()` applies the lens. Raw `store.sessions` is for **mutation** (add, edit,
delete, split) and for **export** (CSV/JSON export deliberately includes everything —
exporting a filtered subset silently would be a data-loss trap).

If you add a card, a chart, or a stat and read `store.sessions` directly, it will quietly
ignore the user's filter and disagree with every other number on screen. This is the single
easiest way to introduce a bug here.

The deliberate exception is the quick-log "since your last session" gap chip
(`renderQuickLog`), which reads raw sessions: it's a *logging affordance*, not analysis, and
it should reflect real elapsed time regardless of what's filtered out.

### Helpers

| Helper | Does |
|---|---|
| `activeAxis()` | The axis object currently selected |
| `groupOf(catId, axisId?)` | A category's value on an axis; blank → `'Ungrouped'` |
| `axisValues(axisId?)` | Every value in use on an axis, `Ungrouped` sorted last |
| `hiddenValues(axisId?)` | The excluded values for an axis |
| `visibleSessions()` | Sessions surviving the lens — **use this** |
| `setLensAxis(id)` / `toggleLensValue(v)` | Mutate the lens, save, re-render everything |

Every category always lands in exactly one bucket per axis (blank collapses to
`Ungrouped`), so no session can fall out of a rollup and totals always reconcile.

### UI surfaces

The lens bar (`ui.renderLensBars()`) renders into three containers — `focusLensBar`,
`calendarLensBar`, `insightsLensBar` — from one function, so all three views always show
the same state. Axes are created, renamed and deleted in the Categories modal
(`ui.modals.renderAxisManager()`); per-category values are edited either there or in the
Insights "Assign …" card.

## Code layout inside `index.html`

Roughly in file order:

| Region | What's there |
|---|---|
| `<head>` | CDN links, then all CSS in one `<style>`. CSS custom properties at the top drive both themes. |
| `<body>` | Top bar, then three sibling `.view` divs (`focusView`, `calendarView`, `insightsView`) — only one has `.active`. Then the modals. |
| `INITIALIZATION & STORAGE` | `store` defaults, grouping helpers, `bucketByHour()`, `refreshAll()`, `showToast()`, `loadStore()`/`saveStore()` |
| `CLOUD SYNC` | `cloudSync` — Firebase auth + Firestore mirror. Inert unless `FIREBASE_CONFIG` is set. |
| `TIMER MODULE` | `timer` — the pomodoro state machine |
| `HELPER FUNCTIONS` | streaks, `formatMinutes()` |
| `UI MODULE` | `ui.renderLensBars`, `ui.focus`, `ui.calendar`, `ui.insights`, `ui.modals` |
| `EVENT LISTENERS` | `setupEventListeners()`, including keyboard shortcuts |
| `INIT` | `DOMContentLoaded` — load, wire up, render, restore a mid-flight timer |

Rendering is deliberately dumb: there is no virtual DOM and no reactivity. A mutation calls
`saveStore()` then `refreshAll()`, which re-renders every session-derived view from scratch.
At the scale of a personal time log this is fast enough and is far easier to reason about
than incremental updates. Don't optimise it until it's measurably slow.

`refreshAll()` skips Insights unless that view is on screen. If you add a new view, add it
there.

## Timer

Two facts worth knowing before touching it:

- `remainingMs` is what was left **when the current run segment started**, not the full
  duration. Elapsed time is measured against it, so a paused-and-resumed timer restores
  correctly across a reload.
- `sessionStartedAt` is persisted and stamped only when a *fresh* session begins. Resuming
  or reloading keeps the original stamp, so a session that completes while the tab is shut
  still logs its true length.

Anything with a deadline (the check-in reminder) stores an absolute timestamp rather than
counting down on a `setInterval` — intervals stop firing when the machine sleeps or the tab
is throttled, and the countdown silently freezes. Follow that pattern for new timers.

## The heatmap

`bucketByHour(sessions)` spreads each session across every weekday/hour cell it actually
covers, keyed `"<1-7>-<0-23>"` with **Monday as 1** and Sunday as 7.

It walks real `Date` boundaries rather than adding 3,600,000 ms, so DST-short/long days
land correctly, and a session crossing midnight bills its second half to the *next*
weekday.

The property that matters: **the sum of all cells equals the sum of all session durations.**
No minute is invented or lost. `test.mjs` asserts this, along with the specific regression
it was written for — an earlier version bucketed a session's whole duration into its start
hour, so 09:50–11:30 read as 100 minutes at 9am and nothing at 10 or 11.

Cell opacity is `sqrt`-scaled so a few outlier cells don't wash the rest of the map out;
empty cells render as `--surface-1` rather than a faint tint, so "no focus" reads as
genuinely absent.

## Testing

```bash
node test.mjs
```

`test.mjs` extracts `bucketByHour` from `index.html` by sentinel comments
(`// BEGIN bucketByHour` … `// END bucketByHour`) and asserts against it, so the test can't
drift away from the shipped code. If you move or rename that function, keep the markers.

There is no other test suite, by choice. Most of the app is DOM assembly where a test would
just restate the code. For UI work, serve the file and drive it in a browser:

```bash
python3 -m http.server 8765
```

If you add logic with real arithmetic or branching — a new aggregation, a date calculation,
a parser — pull it out as a named top-level function with the same sentinel treatment and
add a case to `test.mjs`. Don't introduce a test framework for it.

## Conventions

- **Comments explain *why*, not *what*.** The existing comments name the bug a piece of code
  exists to prevent. Match that; don't narrate the obvious.
- **Deletion over addition.** No abstraction with one caller, no config for a constant.
- **Reversible actions use `showToast(msg, undoFn)`, not `confirm()`.** Deleting a category,
  a session or an axis all offer Undo. Keep that.
- Prefer native platform features (`<input type="color">`, `<datalist>`, CSS grid) over
  hand-rolled equivalents.
- **Fix bugs at the shared function, not per caller.** Before patching, grep for other
  callers — that's how the `visibleSessions()` rule came about in the first place.
- Update `CHANGELOG.md` when you ship something a user would notice.
