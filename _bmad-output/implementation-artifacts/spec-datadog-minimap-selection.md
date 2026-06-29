---
title: 'Datadog minimap placement and selection dimming'
type: 'bugfix'
created: '2026-06-29T18:20:00+0800'
status: 'done'
baseline_commit: 'NO_VCS'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/6-5-minimap.md'
  - '{project-root}/_bmad-output/implementation-artifacts/6-6-minimap-align.md'
  - '{project-root}/_bmad-output/implementation-artifacts/7-1-color-legend.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** Datadog's current flamegraph minimap is observed at the lower-left of the flamegraph area, while this implementation anchors it at the upper-left. Selecting a flamegraph span also currently leaves the pointer over that span, triggering reverse legend hover and making non-matching spans turn fully gray, which does not match Datadog's selection behavior.

**Approach:** Move the minimap overlay to the lower-left of the flamegraph viewport. Decouple flamegraph span hover from graph-level dimming: span hover may still notify the legend for row highlighting, but it must not feed back into `highlightedGroupKey` for the flamegraph itself.

## Boundaries & Constraints

**Always:** Preserve explicit legend hover and legend click behavior: hovering/clicking a legend row still dims non-matching flamegraph spans with the existing Datadog gray. Preserve minimap pan/click jump, zoom buttons, focus, reset, and collapse behavior.

**Ask First:** Ask before changing Datadog legend URL semantics, removing reverse legend row highlighting entirely, or replacing the div-based minimap renderer with canvas.

**Never:** Do not alter core flame layout math, focus re-root semantics, color-by dimension grouping, or waterfall behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Minimap placement | Flamegraph mode renders `TraceTimeline` | `DdFlameMinimap` is absolutely anchored with `bottom: 6px` and `left: 6px` | N/A |
| Span selection | User clicks a flamegraph span while no legend row is hovered/clicked | Selected span gets selection outline; no flamegraph rect receives `data-dimmed="true"` | N/A |
| Explicit legend highlight | User hovers or clicks a legend row | Matching group remains colored and non-matching flamegraph rects dim as before | N/A |

</frozen-after-approval>

## Code Map

- `src/api/TraceTimeline.tsx` -- wires minimap position and splits graph dimming key from legend row hover state.
- `src/presentation/DdFlameGraphView.tsx` -- selected outline and dimming are rendered here; hover callbacks originate here.
- `src/state/useHighlightGroup.ts` -- current `effectiveKey = hoveredKey ?? pinnedKey` explains why span hover feeds back into graph dimming.
- `src/presentation/flamegraph.test.tsx` -- covers flamegraph dimming and hover callbacks.
- `src/api/api.test.tsx` -- covers integrated `TraceTimeline` behavior.

## Tasks & Acceptance

**Execution:**
- [x] `src/api/TraceTimeline.tsx` -- anchor minimap bottom-left and pass only explicit legend/pinned state to `DdFlameGraphView.highlightedGroupKey`.
- [x] `src/api/api.test.tsx` -- add regression coverage for minimap bottom-left placement and span click without implicit dimming.
- [x] Existing flamegraph/legend tests -- keep explicit legend hover/click dimming behavior intact.

**Acceptance Criteria:**
- Given flamegraph mode is active, when `TraceTimeline` renders, then minimap style uses `bottom: 6px` and `left: 6px`.
- Given no legend group is explicitly highlighted, when a flamegraph span is clicked or hovered, then the graph does not dim other spans.
- Given a legend row is hovered or clicked, when a group highlight is active, then non-matching flamegraph spans still use `theme.trace.flame.dimmedFill`.

## Spec Change Log

## Verification

**Commands:**
- `npm test -- src/api/api.test.tsx src/presentation/flamegraph.test.tsx src/presentation/flamelegend.test.tsx src/presentation/flameminimap.test.tsx` -- expected: targeted tests pass.
- `npm run typecheck` -- expected: TypeScript passes.

**Actual Results:**
- `/Users/wangxiaowei1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vitest/vitest.mjs run src/api/api.test.tsx src/presentation/flamegraph.test.tsx src/presentation/flamelegend.test.tsx src/presentation/flameminimap.test.tsx` -- passed, 43 tests.
- `/Users/wangxiaowei1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/typescript/bin/tsc --noEmit` -- passed.
- `/Users/wangxiaowei1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/vitest/vitest.mjs run` -- passed, 204 tests; existing act(...) warnings in viewinglayer/columnresizer tests.
- `/Users/wangxiaowei1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node ./node_modules/tsup/dist/cli-default.js` -- passed.

## Suggested Review Order

**Interaction State Split**

- Separate span hover from graph dimming state.
  [`TraceTimeline.tsx:223`](../../src/api/TraceTimeline.tsx#L223)

- Validate hover keys for legend-only highlighting.
  [`TraceTimeline.tsx:260`](../../src/api/TraceTimeline.tsx#L260)

- Pass explicit legend state to the graph, span hover to legend state.
  [`TraceTimeline.tsx:378`](../../src/api/TraceTimeline.tsx#L378)

- Render the legend from span-hover-or-explicit highlight.
  [`TraceTimeline.tsx:417`](../../src/api/TraceTimeline.tsx#L417)

**Minimap Placement**

- Anchor the minimap overlay at lower-left.
  [`TraceTimeline.tsx:445`](../../src/api/TraceTimeline.tsx#L445)

**Regression Tests**

- Lock minimap lower-left placement.
  [`api.test.tsx:58`](../../src/api/api.test.tsx#L58)

- Lock span hover/selection without graph dimming.
  [`api.test.tsx:67`](../../src/api/api.test.tsx#L67)
