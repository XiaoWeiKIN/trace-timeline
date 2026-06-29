---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 4.3: 关键路径高亮

Status: review

## Story

As a 排障用户,
I want 在瀑布条上高亮关键路径区段、折叠时合并显示,
so that 直接看到决定总耗时的链路。

## Acceptance Criteria

1. 关键路径区段在条上以区分样式渲染（FR-16）。
2. 折叠 span 时合并显示其后代关键路径。
3. typecheck/test/build 通过；关键路径算法带单测。

## Tasks / Subtasks

- [x] Task 1：移植 CriticalPath 算法（Apache/Jaeger，4 文件）→ `src/core/criticalPath/{index,findLastFinishingChildSpan,getChildOfSpans,sanitizeOverFlowingChildren}.ts`（保留 Apache 头，类型 → model；memoizeOne）。
- [x] Task 2：core 导出 `computeTraceCriticalPath`。
- [x] Task 3：条上渲染——`DdSpanBar` 把 `row.criticalPathSections`（绝对时间戳）投影回 view 分数，渲染条底部高对比描边带（cp-seg）。
- [x] Task 4：api 接线——`computeTraceCriticalPath(trace)` → 引擎 `criticalPath`；`showCriticalPath` prop（默认 true）。引擎已做折叠合并（criticalPathSections 折叠时并入后代）。
- [x] Task 5：单测 `criticalpath.test.ts`（非空/区段有效/根在路径/memoize）。
- [x] Task 6：自验 typecheck/test/build + Chrome DevTools。

## Dev Notes

- 引擎 `buildRenderableRow` 已产 `criticalPathSections`（非折叠=本 span；折叠=并入全部后代），Story 1.5 就位。本故事补算法 compute + 条上渲染 + 接线。
- 算法忠实移植（Apache-2.0 Jaeger，AD-9 直接移植类）：computeCriticalPath 沿「最后完成子 span」递归 + 回溯；getChildOfSpans 去 FOLLOWS_FROM；sanitizeOverFlowingChildren 修正越界子 span。
- 渲染：区段绝对时间戳 → `(sec - span.startTime)/span.duration` → 投影到 bar 的 view 分数（与 span 同映射），底部 3px 描边带（light #111 / dark #fff）。

### References
- [Source: CriticalPath/index.tsx + utils/*]、[Source: VirtualizedTraceView criticalPathSections]
- [Source: epics.md#Story 4.3]、[Source: prd FR-16]

## Dev Agent Record

### Agent Model Used
claude-opus-4-8[1m]（dev-story）

### Debug Log References
- typecheck 0 错误 · `npm test` **114 passed**（+4 criticalpath）· build clean。
- Chrome DevTools：mockTrace 渲染 8 个 cp-seg 描边带（投影正确，#111），分布于根/各链路 span 条底部。

### Completion Notes List
- CriticalPath 算法 4 文件原样移植到 core/criticalPath（Apache 头保留，类型→model，memoizeOne）。
- DdSpanBar 渲染关键路径区段：绝对时间戳投影回 view 分数（与 span 同一映射），条底部高对比描边带。
- api `showCriticalPath`（默认 true）→ computeTraceCriticalPath → 引擎 criticalPath。折叠合并由引擎既有逻辑处理。AC 全满足，未新增依赖。

### File List
新增：`src/core/criticalPath/{index.ts,findLastFinishingChildSpan.ts,getChildOfSpans.ts,sanitizeOverFlowingChildren.ts}`、`src/core/criticalpath.test.ts`
修改：`src/core/index.ts`、`src/presentation/DdSpanBar.tsx`、`src/api/TraceTimeline.tsx`

### Change Log
- 2026-06-26：创建+实现 Story 4.3——移植 CriticalPath 算法接 core，条上渲染关键路径描边带（投影+折叠合并）；114 单测；浏览器 8 段验证。Status → review。
