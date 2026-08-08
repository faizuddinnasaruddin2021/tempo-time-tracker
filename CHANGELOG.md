# Changelog

All notable changes to Habitus. Newest first.

## [Unreleased] — 2026-08-08

### Changed
- **"Group" now means habits only.** The session-side slicing is called an **axis**
  everywhere: "Axis" in the lens bar, "Manage axes…", "Add axis", and the no-value bucket is
  **Unassigned** rather than "Ungrouped". Saved filters migrate, so anything you had hidden
  stays hidden. Your one seeded axis still literally named "Group" is renamed to "Context"
  once — rename it to whatever you like and it won't be touched again.
- **Renamed to Habitus.** The app grew a habits track, and "Tempo" only described the timer
  half. Your data is untouched: the `localStorage` key stays `tempo.v1`, because renaming it
  would orphan every existing log behind a cosmetic change.

### Added
- **Habit groups.** Put habits under your own headings — Morning, Evening, whatever — by
  dragging a habit's handle onto another group, or by typing a name in the habit editor
  (which suggests the ones you already use). Each heading carries that day's completion and
  the group's 30-day consistency, and collapses.
- Dropping onto a row inserts above it, so the same drag also reorders. Groups have no
  existence of their own: empty one out and its heading goes away. The list stays flat until
  you make your first group.
- **A "Habit Groups" card in Insights**: each group's pooled consistency, how many habits
  are in it, the weekday it holds up best on, and which habit is dragging it down. Rates
  pool *periods*, so one weekly habit can't outvote six daily ones.
- **A week strip across the top of the habit list**, with weekday, date and a ring showing
  how much of each day was done. Picking a day moves **every** habit to it at once, and the
  card above retitles to that date — so fixing up Wednesday is one click, not one per habit.
  Arrows step week by week; "Today" jumps back.
- **A habit's "Last 30 Days" is now a calendar** — weekday columns, date numbers, and the
  month named where one starts — instead of thirty identical squares that told you nothing
  about which day was which. Today is outlined; days outside the window are dimmed but
  still drawn, so the weeks stay whole.
- The consistency grid in Insights names its ends ("10 Jul on the left through 8 Aug on the
  right"), since one row per habit can't carry date labels.
- The squares on each row are now the seven days of that week, in the same columns as the
  header above them, so it's obvious which day each square is. Future days are greyed and
  can't be logged. (The 30-day strip is still in a habit's detail view.)

- **Habits can be linked to a Focus category**, so a tracked hour isn't logged twice. Pick
  the category in the habit editor, or hit "Link … to a habit" straight from the Focus tab,
  which now says underneath the timer which habit the current category feeds.
  - A **minutes** habit counts linked sessions toward its target — a 40-minute Exercise
    session completes "exercise 30 min" on its own, streak and all.
  - A **count** or **yes/no** habit gets the *time* from those sessions but keeps its count
    hand-logged: no quantity of minutes tells you how many pages you read.
  - Typing over a linked habit's number stores only the hand-logged remainder, so re-typing
    the figure on screen doesn't quietly double it.
- **Optional time tracking on any habit** ("Also track time spent"), with hours shown in the
  detail view and in Insights — so "how long have I actually spent reading this year" has an
  answer even for a habit that counts pages.

### Added (earlier in this release)
- **Habits, and they're now the landing view.** Timing work is a poor fit for anything you
  want to record *after* the fact, so habits are a separate, hand-logged track: mark a
  habit done, count 10 pages, log 30 minutes. Each one has a target per day or per week
  (so "gym 3x/week" works), a progress bar, a streak, and a 14-day strip.
- Clicking any square in that 14-day strip points the row's stepper at that day, so
  logging yesterday's run takes one click and no modal.
- Habits are created and edited from **+ New habit** or by clicking a habit's name;
  deleting one offers Undo and restores its full history.
- View shortcuts shifted down one: **1** Habits, **2** Focus, **3** Calendar, **4** Insights.
- **Habit analysis, in two places.** Under the habit list: 30-day consistency, your longest
  running streak, and the weekday you're most reliable on. In Insights, above the session
  cards: per-habit completion rate, streak, lifetime total and a trend against the previous
  30 days; a 30-day consistency grid; and a weekday breakdown over 90 days — the
  "weekends kill my streak" view.
- **"How It's Going" at the top of the Habits page.** Beyond the three tiles, it now says
  in words what's actually happening: which habit is slipping and from what number, which
  has gone quiet, where the target looks too high to ever hit, which weekday never happens,
  and what's holding strong. Worst news first, capped at four lines. Click any line to open
  that habit.
- **Every habit row carries its own numbers** — 30-day completion rate and whether that's
  up or down on the previous 30 days, next to the streak.
- **Clicking a habit opens its own detail view**: 30-day rate, current and best streak,
  lifetime total, trend, its consistency strip and its weekday pattern. Editing moved
  inside it, so a click on the name no longer drops you into a form.
- **Quick-add chips.** Counting to ten pages one tap at a time was absurd; each habit now
  offers a step, half its target and the full target (`+1 / +5 / +10`, `+5 / +15 / +30`).
- Rates count *periods*, so a weekly habit that went 1-for-1 reads as 100%, not 14%.
  The lens bar on Insights notes that it filters sessions only — habits have no category
  for it to filter on.

## [Previously unreleased] — 2026-08-05

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
