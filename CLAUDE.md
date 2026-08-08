# Tempo

A habit tracker and pomodoro timer. **The whole application is `index.html`** — markup, CSS
and JS in one file, no build step, no framework, no package manager.

**Read [ARCHITECTURE.md](ARCHITECTURE.md) before editing.** It covers the data model, the
habits track, the grouping-axis/lens system, where things live in the file, and the
conventions.

The things most likely to trip you up:

1. **Read sessions through `visibleSessions()`, never `store.sessions`.** The latter is for
   mutation and export only. Reading it directly makes a view silently ignore the user's
   active filter and disagree with every other number on screen.
2. **Don't split the file or add a dependency.** Single-file is the deployment story.
3. **Run `node test.mjs`** after touching the heatmap, the habit math, or adding any
   aggregation logic.
4. **Habits are their own track.** They're hand-logged into `store.habitLog` and never
   derived from sessions — don't "helpfully" wire them to the timer.

Serve it locally with `python3 -m http.server 8765` — Google sign-in and some browser APIs
don't work from `file://`.

<!-- code-graph-mcp:begin v2 -->
## Code Graph (repo-wide AST index)

AST + FTS + vector index of the whole repo — prefer over multi-round Grep/Read for
structural queries (LSP only sees open files; this sees everything). Fastest path = Bash CLI:

| Intent | Command |
|--------|---------|
| Who calls X / what X calls | `code-graph-mcp callgraph X` |
| Impact before editing a fn | `code-graph-mcp impact X` |
| Unfamiliar dir / module | `code-graph-mcp overview <dir>` |
| Symbol source / signature | `code-graph-mcp show X` |
| Concept search (no exact name) | `code-graph-mcp search "…"` (vector: MCP `semantic_code_search`) |
| grep + AST context | `code-graph-mcp grep "pat" [paths] [-t lang] [-g glob] [-c]` |

Still use Grep for literal strings/regex in non-code files; still Read files you'll edit.
Full command + MCP-tool table: `.claude/plugin_code_graph_mcp.md`
<!-- code-graph-mcp:end -->
