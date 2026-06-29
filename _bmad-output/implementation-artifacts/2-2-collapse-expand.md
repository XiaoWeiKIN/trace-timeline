---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 2.2: 折叠 / 展开

Status: review

## Story

As a 排障用户,
I want 折叠/展开单个 span 子树，以及全部折叠/展开、逐层折叠/展开,
so that 在深层 trace 里聚焦关注的分支。

## Acceptance Criteria

1. **Given** 已渲染的多层 trace **When** 点击某 span 的折叠控件 **Then** 其所有后代行不再渲染、折叠态有箭头标识（FR-4）（Story 2.1 已实现单 span 折叠——本故事保持）。
2. **And** 表头"全部折叠"后只剩根级；"全部展开"后全部可见；"逐层展开/折叠"按钮各推进一层（FR-5）。
3. **And** 按钮接容器 `expandAll/collapseAll(spans)/expandOne(spans)/collapseOne(spans)`；`npm run typecheck`/`npm test`/`npm run build` 通过。

## Tasks / Subtasks

- [x] Task 1：Collapser（AC: #2）`src/presentation/DdTimelineCollapser.tsx` — 4 图标按钮（逐层展开 angle-down / 逐层折叠 angle-up / 全展开 angle-double-down / 全折叠 angle-double-up）+ Tooltip
- [x] Task 2：表头接入（AC: #2）`DdTimelineHeader` 增可选 `onExpandAll/onCollapseAll/onExpandOne/onCollapseOne`，四者齐备则在标签列头渲染 DdTimelineCollapser
- [x] Task 3：api 接线（AC: #2,#3）`<TraceTimeline>` 把 `tt.expandAll / () => tt.collapseAll(trace.spans) / ...` 传给表头
- [x] Task 4：单测（AC: #2）DdTimelineCollapser 4 按钮触发对应回调
- [x] Task 5：自验 typecheck/test/build + Chrome DevTools（全部折叠 9→1 行；全部展开 1→9 行）

## Dev Notes

### 容器已就位（Story 2.1）
- `useTraceTimelineState` 已暴露 `expandAll()`/`collapseAll(spans)`/`expandOne(spans)`/`collapseOne(spans)`（移植自 useChildrenState，不可变）。本故事只补 UI 按钮 + 接线，不改状态逻辑。
- `expandOne/collapseOne/collapseAll` 需 `spans` 入参 → api 闭包传 `trace.spans`。

### 图标（lucide 映射已在 ui/Icon）
- 全展开 `angle-double-down`(ChevronsDown) / 全折叠 `angle-double-up`(ChevronsUp) / 逐层展开 `angle-down`(ChevronDown) / 逐层折叠 `angle-up`(ChevronUp)。

### 位置（datadog-visual-spec §6）
- Datadog 把展开/折叠全部按钮放在 span-label-header（标签列头）。本库放在 `DdTimelineHeader` 的 labelHead 区。

### 范围
- 缩放 ViewingLayer → 2.3；列宽拖拽 → 2.4。本故事仅折叠按钮组。

### References
- [Source: TimelineHeaderRow/TimelineCollapser.tsx]（4 按钮语义）
- [Source: src/state/useChildrenState.ts]、[Source: datadog-visual-spec.md §6]
- [Source: epics.md#Story 2.2]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]（dev-story）

### Debug Log References

- typecheck 0 错误 · `npm test` **58 passed**（+1）· build ESM clean
- Chrome DevTools：点 "collapse all" → 9 行变 1 行（仅根）；"expand all" → 1 行恢复 9 行。FR-5 验证。

### Completion Notes List

- `DdTimelineCollapser`：4 lucide 图标按钮（逐层展开/折叠 + 全部展开/折叠）+ Tooltip，放 `DdTimelineHeader` 标签列头（datadog-visual-spec §6）。
- 四回调齐备时才渲染（`hasCollapser` 守卫）；`<TraceTimeline>` 闭包传 `tt.expandAll`/`() => tt.collapseAll(trace.spans)`/expandOne/collapseOne（容器 Story 2.1 已有，状态逻辑未改）。
- 单 span 折叠（Story 2.1）保持；本故事补全部/逐层。AC 全满足，未新增依赖。

### File List

新增：`src/presentation/DdTimelineCollapser.tsx`、`src/presentation/collapser.test.tsx`
修改：`src/presentation/{DdTimelineHeader.tsx,index.ts}`、`src/api/TraceTimeline.tsx`

## Change Log

- 2026-06-26：创建 + 实现 Story 2.2——DdTimelineCollapser 4 按钮接容器，全部/逐层折叠展开；58 单测；浏览器 9↔1 行验证。Status → review。
