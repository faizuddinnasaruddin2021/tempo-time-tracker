# Habitus v2 — Feature Additions (Design Spec)

Extend the existing `index.html` (do NOT rewrite it; edit incrementally, keep all v1 behavior). Keep the same visual language: dark, `#12151D` cards, Fraunces display numerals, Inter UI, category-color accents, 160ms transitions. Bump storage: keep key `tempo.v1` but add new fields with safe defaults when missing (migration on load).

New state fields:
```js
settings: { ...existing, dailyGoalMin: 120, notifications: false, theme: 'dark'|'light', tickSound: false }
tasks: [{id, text, catId, estPomos, donePomos, done, createdAt}]
```

## 1. Insights view (3rd nav pill: Focus | Calendar | Insights)
A grid of cards:
- **Lifetime stats row** (4 stat tiles): Total focused (h), Total sessions, Current streak 🔥 (consecutive days incl. today with ≥1 session), Best streak.
- **Hour-of-day heatmap**: 7 rows (Mon–Sun) × 24 cols; each cell colored by total minutes focused in that weekday+hour across all data (accent color alpha scale). Hover title shows "Tue 14:00 — 3h 20m". This shows when the user focuses best.
- **Monthly trend**: last 12 weeks as a simple line/area chart drawn in inline SVG — weekly total hours; area fill accent at 15% alpha; dots on points; labels every other week.
- **Category leaderboard**: categories ranked by all-time hours, horizontal bars with the category color, hours label.
- **Records card**: longest single session, most focused day (date + total), average session length, average per active day.

## 2. Daily goal + streak (Focus view)
- In the "Today" card add a thin goal progress bar: `today total / dailyGoalMin`, accent-filled, label "Goal · 1h 12m / 2h". When goal hit, bar turns green and label gets a ✓.
- Add goal minutes input to Settings.
- Small 🔥 streak count pill in the top bar next to nav (hidden if streak 0), title tooltip "N-day focus streak".

## 3. Tasks card (Focus view, below category chips inside timer column or as its own card)
- "What are you working on?" — list of tasks: checkbox, text, category dot, pomodoro progress "2/4 🍅".
- Add-task inline input (Enter to add) with category = currently selected chip and est pomos number stepper (default 1).
- Select a task (click) → it becomes the *active task*, highlighted; when a focus session completes, increment its donePomos and attach `taskId` to the logged session.
- Checkbox completes (strikethrough, moves to bottom, fades). ✕ on hover deletes. Persisted.

## 4. Zen mode
- Expand icon button (⛶) on the timer card → fullscreen overlay: pure `--bg`, only the ring + time + category name + start/pause, everything else hidden; Esc or ✕ exits. Uses the same timer state (no duplicate logic — same render targets or a mirrored render call).

## 5. Notifications + sounds
- Settings toggle "Browser notifications": on enable, request permission; on session/break end fire a Notification ("Focus complete — time for a break ☕" / "Break over — back to it 🔒") if permitted and tab not focused.
- Settings toggle "Ticking sound": soft tick each second while a focus session runs (WebAudio, very quiet, 1kHz blip at low gain). Off by default.

## 6. Light theme
- Settings toggle Dark/Light. Light: bg `#F4F5FA`, cards `#FFFFFF`, border `rgba(15,18,32,0.08)`, text `#171A26`/`#5A6072`, shadows softer. Implement by toggling `data-theme="light"` on `<html>` and overriding the CSS variables + a few hardcoded rgba whites (audit CSS for `rgba(255,255,255,...)` usages that need a variable). Ring glow stays category-colored.

## 7. Keyboard shortcuts + help
- Space start/pause (exists), R reset, S skip, 1/2/3 switch Focus/Calendar/Insights views, Z zen mode, ? opens a small shortcuts modal listing them. Ignore all when typing in an input/textarea.

## 8. CSV export
- In Settings next to JSON export: "Export CSV" — columns `date,start,end,category,minutes,note,task`.

## Quality bar
- After EVERY few edits, re-extract the script and `node --check` it. No console errors on load.
- New views must re-render when data changes (session logged/edited/deleted).
- Everything keyboard-accessible and working offline. Do not regress v1 features.
