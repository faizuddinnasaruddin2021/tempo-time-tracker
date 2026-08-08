// Self-check for the heatmap's hour bucketing — the one bit of non-obvious arithmetic in
// the app. Pulls the real function out of index.html so the test can't drift from it.
//   node test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const src = html.match(/\/\/ BEGIN bucketByHour.*\n([\s\S]*?)\/\/ END bucketByHour/);
assert.ok(src, 'bucketByHour markers not found in index.html');
const bucketByHour = new Function(src[1] + '; return bucketByHour;')();

const MIN = 60000;
// A fixed Monday, so weekday keys are predictable regardless of when this runs
const at = (day, h, m = 0) => new Date(2026, 0, 5 + day, h, m).getTime();
const mins = (buckets, key) => (buckets[key] || 0) / MIN;
const total = b => Object.values(b).reduce((a, x) => a + x, 0) / MIN;

// 1. A session inside one hour stays in one cell
let b = bucketByHour([{ start: at(0, 9, 10), end: at(0, 9, 40) }]);
assert.deepEqual(Object.keys(b), ['1-9']);
assert.equal(mins(b, '1-9'), 30);

// 2. The regression: 09:50–11:30 splits 10 / 60 / 30 instead of dumping 100 into 9am
b = bucketByHour([{ start: at(0, 9, 50), end: at(0, 11, 30) }]);
assert.equal(mins(b, '1-9'), 10);
assert.equal(mins(b, '1-10'), 60);
assert.equal(mins(b, '1-11'), 30);
assert.equal(total(b), 100, 'no minutes invented or lost');

// 3. Crossing midnight bills the second half to the *next* weekday
b = bucketByHour([{ start: at(0, 23, 30), end: at(1, 0, 30) }]);
assert.equal(mins(b, '1-23'), 30);   // Mon 11pm
assert.equal(mins(b, '2-0'), 30);    // Tue midnight
assert.equal(total(b), 60);

// 4. Sunday is key 7, not 0 — it's the last row of the grid, not the first
b = bucketByHour([{ start: at(6, 14), end: at(6, 15) }]);
assert.deepEqual(Object.keys(b), ['7-14']);

// 5. Exact hour boundaries don't leak an empty cell into the next hour
b = bucketByHour([{ start: at(0, 9), end: at(0, 10) }]);
assert.deepEqual(Object.keys(b), ['1-9']);

// 6. Totals across many sessions match the raw sum — the property the old code broke
const sessions = [
  { start: at(0, 8, 5), end: at(0, 12, 35) },
  { start: at(2, 22, 45), end: at(3, 1, 15) },
  { start: at(4, 0, 0), end: at(4, 0, 20) },
];
const raw = sessions.reduce((a, s) => a + (s.end - s.start), 0) / MIN;
assert.equal(total(bucketByHour(sessions)), raw);

// 7. A zero-length session contributes nothing and doesn't spin
assert.deepEqual(bucketByHour([{ start: at(0, 9), end: at(0, 9) }]), {});

console.log('bucketByHour: 7 checks passed');

// ---- Habit periods, progress and streaks -------------------------------------------
const hsrc = html.match(/\/\/ BEGIN habitMath.*\n([\s\S]*?)\/\/ END habitMath/);
assert.ok(hsrc, 'habitMath markers not found in index.html');
const { habitDayKey, habitPeriodDays, habitProgress, habitStreak } =
  new Function(hsrc[1] + '; return { habitDayKey, habitPeriodDays, habitProgress, habitStreak };')();

const daily = { kind: 'count', target: 10, period: 'day' };
const weekly = { kind: 'check', target: 3, period: 'week' };
const day = (y, m, d) => new Date(y, m - 1, d);

// 1. Day keys are local, not UTC — a late-evening log stays on its own date
assert.equal(habitDayKey(new Date(2026, 7, 8, 23, 30)), '2026-08-08');
assert.equal(habitDayKey(new Date(2026, 0, 1, 0, 5)), '2026-01-01');

// 2. A weekly period is the Monday–Sunday week containing the date, whichever day you ask on
const week = habitPeriodDays(weekly, day(2026, 8, 8));      // a Saturday
assert.deepEqual(week, ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09']);
assert.deepEqual(habitPeriodDays(weekly, day(2026, 8, 9)), week, 'Sunday belongs to the week that just ended');
assert.deepEqual(habitPeriodDays(weekly, day(2026, 8, 10)), habitPeriodDays(weekly, day(2026, 8, 16)));
assert.deepEqual(habitPeriodDays(daily, day(2026, 8, 8)), ['2026-08-08']);

// 3. Weekly progress sums the whole week; daily progress sees only its own day
assert.deepEqual(
  habitProgress(weekly, { '2026-08-04': 1, '2026-08-06': 1, '2026-08-10': 1 }, day(2026, 8, 8)),
  { done: 2, target: 3, complete: false });
assert.equal(habitProgress(weekly, { '2026-08-04': 1, '2026-08-06': 1, '2026-08-08': 1 }, day(2026, 8, 8)).complete, true);
assert.equal(habitProgress(daily, { '2026-08-07': 40, '2026-08-08': 10 }, day(2026, 8, 8)).done, 10);
assert.equal(habitProgress(daily, {}, day(2026, 8, 8)).done, 0, 'a missing day is 0, not NaN');
assert.equal(habitProgress({ ...daily, target: 0 }, { '2026-08-08': 1 }, day(2026, 8, 8)).target, 1,
  'a zero target would make everything trivially complete');

// 4. An unfinished today doesn't break the streak — it just doesn't extend it yet
const log = { '2026-08-05': 10, '2026-08-06': 10, '2026-08-07': 10 };
assert.equal(habitStreak(daily, log, day(2026, 8, 8)), 3, 'today still pending: yesterday-back counts');
assert.equal(habitStreak(daily, { ...log, '2026-08-08': 10 }, day(2026, 8, 8)), 4, 'today done: today counts too');
assert.equal(habitStreak(daily, { ...log, '2026-08-08': 4 }, day(2026, 8, 8)), 3, 'short of target is not done');

// 5. A missed day ends the streak there rather than counting through the gap
assert.equal(habitStreak(daily, { '2026-08-03': 10, '2026-08-05': 10, '2026-08-06': 10, '2026-08-07': 10 }, day(2026, 8, 8)), 3,
  'stops at the Aug 4 gap instead of counting Aug 3 as well');
assert.equal(habitStreak(daily, { '2026-08-05': 10, '2026-08-06': 10 }, day(2026, 8, 8)), 0,
  'yesterday missed, so there is no live streak left to protect');
assert.equal(habitStreak(daily, {}, day(2026, 8, 8)), 0);

// 6. Weekly streaks step a week at a time
assert.equal(habitStreak(weekly, {
  '2026-07-20': 1, '2026-07-21': 1, '2026-07-22': 1,   // week of Jul 20
  '2026-07-27': 1, '2026-07-28': 1, '2026-07-29': 1,   // week of Jul 27
  '2026-08-03': 1, '2026-08-04': 1,                    // this week: 2 of 3, not yet
}, day(2026, 8, 8)), 2);

// 7. DST doesn't drop or duplicate a day in a week (US spring forward: Mar 8 2026)
assert.deepEqual(habitPeriodDays(weekly, day(2026, 3, 10)),
  ['2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14', '2026-03-15']);

console.log('habitMath: 7 checks passed');
