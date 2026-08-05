# Changelog

All notable changes to Tempo. Newest first.

## [Unreleased] — 2026-08-05

### Added
- **Multiple grouping axes.** A category no longer has one group — it carries a value on
  each of any number of independent axes ("Context" = Office/Home, "Type" = Deep/Admin, …).
  Axes are created, renamed and deleted in the Categories modal; each category gets one
  field per axis. Your existing single group is migrated onto an axis named "Group".
- **The lens bar, on Focus, Calendar and Insights.** Pick which axis to group by, then
  click any of its values to exclude it — "don't show me office work" filters every stat,
  bar, chart, calendar cell and heatmap cell at once, not just one card. Exclusions are
  remembered per axis, so switching axes and back restores what you'd hidden there, and
  they survive a reload. A "Show all (n hidden)" link clears them.
- The Insights "By Group" card and its inline assignment editor follow the active axis and
  are titled after it.

### Fixed
- **The heatmap was wrong.** Each session's entire duration was bucketed into the hour it
  *started* in, so a 09:50–11:30 session read as 100 minutes at 9am and nothing at 10 or
  11 — the shape of the whole map was distorted, and the more long sessions you logged the
  worse it got. Time is now spread across every hour cell a session actually covers, so
  the cells sum to your real total. Sessions crossing midnight land on the next weekday,
  and DST-affected days are handled.
- Empty heatmap cells rendered at the same faint tint as the quietest active ones (a
  floor-clamp made the "no focus" branch unreachable), so idle hours looked like busy ones.
  They now render as empty. Cell shading is sqrt-scaled, so a couple of outlier hours no
  longer wash the rest of the map out to invisible.

### Documentation
- `ARCHITECTURE.md` — data model, the grouping/lens system, code layout, conventions.
  `CLAUDE.md` points agents at it. `DEPLOY.md` covers publishing.
- `test.mjs` — `node test.mjs` self-checks the heatmap's hour bucketing against the real
  function extracted from `index.html`.

### Fixed (second pass)
- **A running pomodoro was lost on reload.** `loadStore()` cleared `timer.running` before
  init's restore path read it, so the restore was dead code and the timer always came back
  at a full duration. The restore now runs, and its arithmetic is fixed: elapsed time is
  measured against `remainingMs` (what was left when this run segment started) rather than
  the full duration, so a resumed timer restores correctly too.
- **A session that finished while the tab was closed logged the wrong length**, or nothing.
  `sessionStartedAt` lived only in memory, so it was `null` after a reload. It's now
  persisted, and is stamped only when a *fresh* session starts — resuming or reloading keeps
  the original start, so the whole session gets logged, ending when it actually ended.

### Fixed
- **Check-in reminder got stuck at 0:00.** The reminder ran on a `setInterval`, which stops
  firing when the machine sleeps or the tab is throttled, so the countdown froze and never
  tinged again. It now stores the next-ting timestamp (`settings.reminderNextAt`) and the
  existing 100 ms tick fires it when the deadline passes.
- **Reloading the page restarted the reminder countdown.** `reminderNextAt` is persisted in
  the store, so a reload resumes where the countdown was instead of starting over.
- Category leaderboard bars used whole hours, so anything under an hour rendered a
  zero-width bar labelled `0h`. Bars now scale by milliseconds and are labelled in h/m.

### Added
- **Category groups.** Categories can carry an optional group (Categories modal, with a
  datalist so existing groups get reused). Groups appear only in Insights — the Focus view
  is unchanged.
- **"By Group" insights card.** Each group's total as a bar, with its member categories
  broken out underneath. Groups are assignable directly from this card ("Assign groups"),
  as well as from the Categories modal.
- **Weekly calendar view.** Month/Week toggle in the calendar header. The week is a real
  time grid: 24 hours down the Y axis, one column per day, sessions drawn to scale with a
  now-line on today. Click a session to edit it, a day header to open the day panel, or any
  empty slot to log time starting at that hour (snapped to 15 min). Prev/next step by week
  in week mode; scrolls sideways on narrow screens.
- The week grid is clipped to your active hours. **Settings → Week view hours** sets the
  range explicitly (24h clock); left blank it auto-fits to your earliest start and latest
  finish across all history, padded an hour each side (8a–10p until there's history to go
  on), and widens on its own when you log outside the range. A backwards or half-filled
  range falls back to auto and says so.
- Calendar remembers whether you were in Month or Week, and defaults to Week.
- **Drag editing in the week view.** Drag empty space to log a session of exactly that span
  (a dashed preview follows the pointer); drag a block to move it, including sideways into
  another day; drag its bottom edge to resize. Everything snaps to 15 minutes, clamps to the
  visible window, and lands with an Undo toast. A click without a drag behaves as before —
  open the session, or start a new 25-minute one.
- This changelog.
