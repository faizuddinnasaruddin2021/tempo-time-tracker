# Tempo

A pomodoro timer and time tracker. **The whole application is `index.html`** — markup, CSS
and JS in one file, no build step, no framework, no package manager.

**Read [ARCHITECTURE.md](ARCHITECTURE.md) before editing.** It covers the data model, the
grouping-axis/lens system, where things live in the file, and the conventions.

The three things most likely to trip you up:

1. **Read sessions through `visibleSessions()`, never `store.sessions`.** The latter is for
   mutation and export only. Reading it directly makes a view silently ignore the user's
   active filter and disagree with every other number on screen.
2. **Don't split the file or add a dependency.** Single-file is the deployment story.
3. **Run `node test.mjs`** after touching the heatmap or adding aggregation logic.

Serve it locally with `python3 -m http.server 8765` — Google sign-in and some browser APIs
don't work from `file://`.
