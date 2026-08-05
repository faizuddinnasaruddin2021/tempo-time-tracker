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
