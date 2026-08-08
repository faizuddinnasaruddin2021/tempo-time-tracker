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
const { habitDayKey, habitPeriodDays, habitProgress, habitStreak,
        habitPeriodsIn, habitCompletionRate, habitWeekdayRate, habitTotal,
        habitBestStreak, habitDaysSinceLog, habitObservations,
        sessionMinutesByDay, habitMergedEntries, habitTimeEntries, habitGroupStats,
        habitDayTarget, habitLastMinutes } =
  new Function(hsrc[1] + `; return { habitDayKey, habitPeriodDays, habitProgress, habitStreak,
    habitPeriodsIn, habitCompletionRate, habitWeekdayRate, habitTotal,
    habitBestStreak, habitDaysSinceLog, habitObservations,
    sessionMinutesByDay, habitMergedEntries, habitTimeEntries, habitGroupStats,
    habitDayTarget, habitLastMinutes };`)();

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

// 8. A window holds one period per day for a daily habit, but one per *week* for a weekly
//    one — counting a weekly habit per day would peg a perfect 1-of-1 week at 14%
assert.equal(habitPeriodsIn(daily, day(2026, 8, 8), 30).length, 30);
assert.equal(habitPeriodsIn(weekly, day(2026, 8, 8), 30).length, 5, '30 days spans 5 Mon–Sun weeks here');
assert.equal(habitDayKey(habitPeriodsIn(daily, day(2026, 8, 8), 3)[0]), '2026-08-06', 'oldest first, window includes today');

// 9. Completion rate counts completed periods, not logged days
const month = { '2026-08-08': 10, '2026-08-07': 10, '2026-08-06': 4 };
assert.deepEqual(habitCompletionRate(daily, month, day(2026, 8, 8), 30), { done: 2, total: 30, rate: 2 / 30 });
assert.deepEqual(habitCompletionRate(weekly, { '2026-08-03': 1, '2026-08-04': 1, '2026-08-05': 1 }, day(2026, 8, 8), 30),
  { done: 1, total: 5, rate: 1 / 5 }, 'one complete week out of the five in the window');
assert.equal(habitCompletionRate(daily, {}, day(2026, 8, 8), 30).rate, 0);

// 10. Weekday buckets are Monday-first and count every occurrence of that weekday
const wd = habitWeekdayRate({ '2026-08-03': 5, '2026-08-04': 5, '2026-08-10': 5 }, day(2026, 8, 15), 14);
assert.equal(wd[0].total, 2, 'two Mondays in a fortnight');
assert.equal(wd[0].hit, 2, 'Aug 3 and Aug 10 are both Mondays');
assert.equal(wd[1].hit, 1);            // Tue: only Aug 4
assert.equal(wd[5].hit + wd[6].hit, 0, 'nothing logged on a weekend');
assert.equal(wd.reduce((a, s) => a + s.total, 0), 14, 'every day in the window lands in exactly one bucket');

// 11. Lifetime total sums every entry, and is a days-done count for a yes/no habit
assert.equal(habitTotal({ '2026-08-01': 30, '2026-08-02': 45 }), 75);
assert.equal(habitTotal({ '2026-08-01': 1, '2026-08-02': 1, '2026-08-03': 1 }), 3);
assert.equal(habitTotal(undefined), 0);

// 12. Best streak is the longest run ever, not the live one
const runs = { '2026-08-01': 10, '2026-08-02': 10, '2026-08-03': 10, '2026-08-05': 10, '2026-08-06': 10 };
assert.equal(habitBestStreak(daily, runs, day(2026, 8, 8)), 3, 'the Aug 1–3 run, not the later two');
assert.equal(habitStreak(daily, runs, day(2026, 8, 8)), 0, 'and the live streak is separately broken');
assert.equal(habitBestStreak(daily, {}, day(2026, 8, 8)), 0);
assert.equal(habitBestStreak(weekly, { '2026-07-20': 1, '2026-07-21': 1, '2026-07-22': 1,
  '2026-07-27': 1, '2026-07-28': 1, '2026-07-29': 1 }, day(2026, 8, 8)), 2, 'two complete weeks back to back');

// 13. "Never logged" is not the same as "logged today" — one invites, the other reassures
assert.equal(habitDaysSinceLog({ '2026-08-05': 1 }, day(2026, 8, 8)), 3);
assert.equal(habitDaysSinceLog({ '2026-08-08': 1 }, day(2026, 8, 8)), 0);
assert.equal(habitDaysSinceLog({}, day(2026, 8, 8)), null);

// ---- Observations ------------------------------------------------------------------
const now = day(2026, 8, 8);
const span = (y, m, d, count, value) => {
  const o = {};
  for (let i = 0; i < count; i++) o[habitDayKey(new Date(y, m - 1, d + i))] = value;
  return o;
};
const h = (id, extra = {}) => ({ id, name: id, kind: 'count', target: 10, unit: 'pages', period: 'day', ...extra });

// 14. A decline names both numbers, so "it dropped" comes with "from what"
const slipping = { ...span(2026, 6, 10, 20, 10), ...span(2026, 8, 5, 3, 10) };
const [drop] = habitObservations([h('Read')], { Read: slipping }, now);
assert.equal(drop.tone, 'bad');
assert.match(drop.text, /slipping/);
assert.match(drop.text, /10%.*from 67%/, 'states where it is now and where it was');
assert.match(drop.text, /last 30 days/);

// 14b. A weekly habit counts its own periods — "the last 30 weeks" would be a lie
const weeklyHabit = h('Gym', { kind: 'check', target: 3, unit: '', period: 'week' });
const weeklySlip = { ...span(2026, 6, 15, 3, 1), ...span(2026, 6, 22, 3, 1), ...span(2026, 8, 3, 1, 1) };
const [weeklyDrop] = habitObservations([weeklyHabit], { Gym: weeklySlip }, now);
assert.match(weeklyDrop.text, /last 5 weeks/, 'a month is five weeks, not thirty');
assert.doesNotMatch(habitObservations([weeklyHabit], { Gym: weeklySlip }, now, 10)
  .map(o => o.text).join(' '), /30 weeks/);

// 14c. A yes/no habit has no unit, so its target reads as "3 per week", not a bare "3"
const noReach = habitObservations([weeklyHabit], { Gym: span(2026, 8, 3, 2, 1) }, now, 10);
assert.match(noReach.map(o => o.text).join(' '), /never reaches 3 per week/);

// 15. A dormant habit reports only that — its rate would just restate the silence
const quiet = habitObservations([h('Gym')], { Gym: { '2026-07-01': 10 } }, now);
assert.equal(quiet.length, 1);
assert.equal(quiet[0].tone, 'bad');
assert.match(quiet[0].text, /gone quiet.*38 days/);

// 16. Never logged invites a first entry instead of scolding
const fresh = habitObservations([h('Meditate')], { Meditate: {} }, now);
assert.deepEqual(fresh.map(o => o.tone), ['warn']);
assert.match(fresh[0].text, /nothing logged yet/);

// 17. Logging every day but never hitting the number blames the target, not the person
const short = habitObservations([h('Write')], { Write: span(2026, 7, 20, 20, 4) }, now);
assert.equal(short[0].tone, 'bad');
assert.match(short[0].text, /never reaches 10 pages/);

// 18. Good news is reported too, and a streak is its own observation
const perfect = habitObservations([h('Read')], { Read: span(2026, 6, 30, 40, 10) }, now);
assert.deepEqual(perfect.map(o => o.tone), ['good', 'good', 'good']);
const perfectText = perfect.map(o => o.text).join(' ');
assert.match(perfectText, /holding strong at 100%/);
assert.match(perfectText, /on a 40-day streak/);
assert.match(perfectText, /is up — 100%, from 33%/, 'the run only covers part of the previous window');

// 19. A weekday hole is called out by name — the "weekends kill my streak" case
const weekdaysOnly = {};
for (let i = 0; i < 90; i++) {
  const d = new Date(2026, 7, 8 - i);
  if (d.getDay() !== 0 && d.getDay() !== 6) weekdaysOnly[habitDayKey(d)] = 10;
}
const gap = habitObservations([h('Standup')], { Standup: weekdaysOnly }, now, 10);
assert.match(gap.map(o => o.text).join(' '), /never happens on Sats or Suns/);

// 20. Worst news first, and the limit is respected — nobody reads a wall of lines
const many = habitObservations(
  [h('Read'), h('Gym'), h('Meditate'), h('Write')],
  { Read: slipping, Gym: { '2026-07-01': 10 }, Meditate: {}, Write: span(2026, 7, 20, 20, 4) },
  now, 2);
assert.equal(many.length, 2);
assert.deepEqual(many.map(o => o.habitId), ['Gym', 'Read'], 'dormant outranks slipping');
assert.ok(many[0].score > many[1].score);

// ---- Linking habits to focus sessions -----------------------------------------------
const ms = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min).getTime();

// 21. Only the linked category counts, and an unlinked habit gets nothing
const feed = [
  { catId: 'deep', start: ms(2026, 8, 8, 9), end: ms(2026, 8, 8, 9, 50) },
  { catId: 'deep', start: ms(2026, 8, 8, 14), end: ms(2026, 8, 8, 14, 30) },
  { catId: 'admin', start: ms(2026, 8, 8, 16), end: ms(2026, 8, 8, 17) },
];
assert.deepEqual(sessionMinutesByDay(feed, 'deep'), { '2026-08-08': 80 });
assert.deepEqual(sessionMinutesByDay(feed, 'admin'), { '2026-08-08': 60 });
assert.deepEqual(sessionMinutesByDay(feed, ''), {}, 'no link, no minutes');
assert.deepEqual(sessionMinutesByDay([], 'deep'), {});

// 22. A session running past midnight bills each day its own minutes
const overnight = sessionMinutesByDay(
  [{ catId: 'deep', start: ms(2026, 8, 8, 23, 30), end: ms(2026, 8, 9, 0, 45) }], 'deep');
assert.deepEqual(overnight, { '2026-08-08': 30, '2026-08-09': 45 });
assert.equal(Object.values(overnight).reduce((a, v) => a + v, 0), 75, 'no minutes invented or lost');

// 23. Linked minutes count toward the target only for a habit that measures minutes —
//     a "read 10 pages" habit can't infer pages from time
const exercise = { id: 'x', kind: 'duration', target: 30, period: 'day', catId: 'deep' };
const read = { id: 'r', kind: 'count', target: 10, period: 'day', catId: 'deep' };
const focusMins = { '2026-08-08': 80, '2026-08-07': 20 };
assert.deepEqual(habitMergedEntries(exercise, { '2026-08-08': 10 }, focusMins),
  { '2026-08-08': 90, '2026-08-07': 20 }, 'hand-logged minutes and focus minutes add up');
assert.deepEqual(habitMergedEntries(read, { '2026-08-08': 4 }, focusMins), { '2026-08-08': 4 },
  'pages are untouched by time');
assert.deepEqual(habitMergedEntries({ ...exercise, catId: '' }, { '2026-08-08': 10 }, focusMins),
  { '2026-08-08': 10 }, 'unlinked stays hand-logged');

// 24. The time track: minutes for habits that count something else
assert.deepEqual(habitTimeEntries(read, { '2026-08-06': 15 }, focusMins, {}),
  { '2026-08-06': 15, '2026-08-08': 80, '2026-08-07': 20 });
assert.deepEqual(habitTimeEntries(exercise, {}, focusMins, { '2026-08-08': 90 }),
  { '2026-08-08': 90 }, 'a duration habit is already its own time track');
assert.deepEqual(habitTimeEntries({ id: 'p', kind: 'check', target: 1, period: 'day' }, { '2026-08-08': 20 }, {}, {}),
  { '2026-08-08': 20 }, 'every habit can carry time — it used to need a checkbox nobody found');
assert.deepEqual(habitTimeEntries({ id: 'p', kind: 'check', target: 1, period: 'day' }, {}, {}, {}), {},
  'but an untouched habit still has an empty track, not a zero');

// 25. Habit maths reads the merged view, so a linked focus session completes the habit
assert.equal(habitProgress(exercise, habitMergedEntries(exercise, {}, focusMins), day(2026, 8, 8)).complete,
  true, '80 focus minutes clears a 30-minute target with nothing hand-logged');
assert.equal(habitStreak(exercise, habitMergedEntries(exercise, {}, focusMins), day(2026, 8, 8)), 1,
  'and the streak counts it');

// ---- Group rollups -------------------------------------------------------------------
// 26. A group pools its habits' *periods*, so a weekly habit can't outvote six daily ones
const groupDaily = h('A');
const groupWeekly = h('B', { period: 'week', kind: 'check', target: 1, unit: '' });
const pooled = habitGroupStats([groupDaily, groupWeekly],
  { A: span(2026, 8, 5, 4, 10), B: span(2026, 8, 5, 4, 1) }, now, 30);
assert.equal(pooled.total, 35, '30 days for the daily habit plus 5 weeks for the weekly one');
assert.equal(pooled.done, 4 + 1, 'four days, and the one week those days fall in');
assert.equal(Math.round(pooled.rate * 100), 14);

// 27. The weakest habit is named, so a group's number has somewhere to point
const weak = habitGroupStats([h('Strong'), h('Weak')],
  { Strong: span(2026, 7, 20, 25, 10), Weak: span(2026, 8, 7, 1, 10) }, now, 30);
assert.equal(weak.weakest.name, 'Weak');
assert.ok(weak.weakest.rate < 0.2);

// 28. An empty group has no weakest habit and no best day — nothing to point at
const empty = habitGroupStats([], {}, now, 30);
assert.deepEqual(empty, { done: 0, total: 0, rate: 0, weakest: null, bestWeekday: null });
assert.equal(habitGroupStats([h('New')], { New: {} }, now, 30).bestWeekday, null,
  'a habit with nothing logged has no best day');

// 29. Best weekday is Monday-first, pooled across the group
const mondays = {};
for (let i = 0; i < 30; i++) {
  const d = new Date(2026, 7, 8 - i);
  if (d.getDay() === 1) mondays[habitDayKey(d)] = 10;
}
const byDay = habitGroupStats([h('A'), h('B')], { A: mondays, B: mondays }, now, 30);
assert.equal(byDay.bestWeekday.index, 0, 'Monday is index 0');
assert.equal(byDay.bestWeekday.rate, 1);

// ---- One-click logging ---------------------------------------------------------------
// 30. A click on one square is worth a day, not a whole week's target
assert.equal(habitDayTarget({ kind: 'count', target: 10, period: 'day' }), 10);
assert.equal(habitDayTarget({ kind: 'check', target: 3, period: 'week' }), 1,
  'ticking one day of a "3x a week" habit is one tick, not three');
assert.equal(habitDayTarget({ kind: 'count', target: 70, period: 'week' }), 10);
assert.equal(habitDayTarget({ kind: 'count', target: 3, period: 'week' }), 1, 'never rounds to zero');
assert.equal(habitDayTarget({ kind: 'count', target: 0, period: 'day' }), 1);

// 31. The suggested time is the last one actually logged, before the day in question
const timeLog = { '2026-08-03': 45, '2026-08-05': 30, '2026-08-08': 5 };
assert.equal(habitLastMinutes(timeLog, '2026-08-08'), 30, 'the 5 logged today is not a suggestion for today');
assert.equal(habitLastMinutes(timeLog, '2026-08-04'), 45);
assert.equal(habitLastMinutes({ '2026-08-05': 0 }, '2026-08-08'), null, 'a zero is absence, not a suggestion');
assert.equal(habitLastMinutes({}, '2026-08-08'), null);
assert.equal(habitLastMinutes(undefined, '2026-08-08'), null);

console.log('habitMath: 31 checks passed');
