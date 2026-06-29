---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 2.4: 列宽拖拽

Status: review

## Story

As a 使用方,
I want 拖拽名称列与时间线列之间的分隔条来调整列宽,
so that 按需在标签文本与瀑布之间分配显示空间。

## Acceptance Criteria

1. **Given** 覆盖整个表头宽度的列宽分隔条（移植的 DraggableManager）**When** 拖拽分隔条并释放 **Then** 名称列占比改为释放点比例、瀑布列相应增减，释放后保持（FR-9）。
2. **And** 拖拽时显示从原位到当前位的高亮指示 + col-resize 光标 + 贯穿整个瀑布高度的竖向参考线。
3. **And** 占比受 `min=0.2 / max=0.85` 钳制；列宽变化驱动表头与每行标签列同步重排（经 `RenderableRow.columnWidth`）。
4. **And** `npm run typecheck` / `npm test` / `npm run build` 全过；DdColumnResizer 带单测。

## Tasks / Subtasks

- [x] Task 1：移植 Resizer（AC: #1,#2）`src/presentation/DdColumnResizer.tsx` — 原样移植 TimelineColumnResizer（class + DraggableManager，AD-3），`classnames cx`→模板拼接，`@grafana` 去除，拖拽高亮配色走 theme（primary.main）。
- [x] Task 2：表头接入（AC: #1,#3）`DdTimelineHeader` 设 `position: relative`，叠加覆盖全宽的 `DdColumnResizer`（position=columnWidth，min0.2/max0.85），新增可选 `onColumnResize` + `columnResizeHandleHeight`，提供才渲染。
- [x] Task 3：api 接线（AC: #1,#3）`<TraceTimeline>` 传 `onColumnResize={tt.setSpanNameColumnWidth}`、`columnResizeHandleHeight = height + HEADER_HEIGHT`（参考线贯穿瀑布）。
- [x] Task 4：单测（AC: #4）`columnresizer.test.tsx`——拖拽分隔条松手触发 `onChange(newSize)`，min/max 钳制。
- [x] Task 5：自验 typecheck/test/build + Chrome DevTools（拖拽分隔条 → 名称列变宽/变窄、释放保持；越界被钳制）。

## Dev Notes

### 与 2.3 复用 DraggableManager
- DraggableManager 已在 2.3 移植到 `src/utils/DraggableManager/`。本故事复用，仅新增 Resizer 皮肤组件 + 接线。
- Resizer 的 `_getDraggingBounds` 取**自身根元素**（覆盖整个表头全宽）的 `clientXLeft/width` + `minValue/maxValue` → `value = clientX/全宽 = 列占比`。故 Resizer 必须绝对定位铺满整个表头（不是只在某一列内）。

### 写侧已通
- 状态容器（2.1）已暴露 `spanNameColumnWidth` + `setSpanNameColumnWidth`；引擎（1.5）已把 `spanNameColumnWidth` 经 `RenderableRow.columnWidth` 下发到每行。改 `setSpanNameColumnWidth` → 表头 labelHead flexBasis + 每行 labelCol flexBasis 同步重排。本故事只补 Resizer UI + 接线。
- `DdViewingLayer.boundsInvalidator = columnWidth`（2.3 已接）→ 列宽变化自动让缩放层 bounds 失效重算。

### 移植细节（TimelineColumnResizer）
- 拖拽中 `dragPosition` 存 local state；render 用 `Math.min/max(position, dragPosition)` 画原位↔当前位高亮带。
- `onDragEnd` → `manager.resetBounds()` + `onChange(value)`（提交新占比）；min/max 由 getBounds 的 minValue/maxValue 在 `_getPosition` 钳制。
- `columnResizeHandleHeight` 决定竖向参考线（dragger）高度——传「列表高 + 表头高」使其贯穿整个瀑布。

### 范围
- 只做名称列↔时间线列单分隔条；多列/可配置 min-max 不做（PRD 仅一条分隔）。

### References
- [Source: TimelineHeaderRow/TimelineColumnResizer.tsx]（class + DraggableManager，min0.2/max0.85）
- [Source: TimelineHeaderRow/TimelineHeaderRow.tsx:114-120]（挂载位置/参数）
- [Source: src/state/useTraceTimelineState.ts setSpanNameColumnWidth]
- [Source: epics.md#Story 2.4]、[Source: prd FR-9]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]（dev-story）

### Debug Log References

- typecheck 0 错误 · `npm test` **69 passed**（+3：DdColumnResizer 拖拽提交 + min/max 双向钳制）· build ESM 98.04 KB clean。
- Chrome DevTools（localhost:5174）：拖动分隔条 0.32→0.55 → 表头标签列 ratio `0.32→0.5499`，前 3 行 labelCol ratio 同步 `[0.55,0.55,0.55]`（经 RenderableRow.columnWidth 下发），瀑布列相应变窄、刻度重压缩；grip 双竖线在边界可见。

### Completion Notes List

- **复用 2.3 的 DraggableManager**：仅新增 `DdColumnResizer`（函数包装取主题 + 内层 class 持 DraggableManager/ref/dragState，AD-3）+ 接线，状态/引擎逻辑未改。
- Resizer 根元素绝对定位铺满整个表头（`position:relative` 的 header 容器内），`_getDraggingBounds` 取全宽 + minValue 0.2/maxValue 0.85 → `value=clientX/全宽=列占比`，越界由 DraggableManager `_getPosition` 钳制。
- 拖拽中 local `dragPosition` 画原位↔当前位高亮带（primary.main 配色）；`onDragEnd` → `resetBounds()` + `onChange(value)` 提交。
- api 传 `onColumnResize={tt.setSpanNameColumnWidth}`、`columnResizeHandleHeight = height + HEADER_HEIGHT` 使竖向参考线贯穿瀑布。释放后占比由状态容器保持（FR-9）。AC #1~4 全满足，未新增依赖。

### File List

新增：`src/presentation/{DdColumnResizer.tsx,columnresizer.test.tsx}`
修改：`src/presentation/{DdTimelineHeader.tsx,index.ts}`、`src/api/TraceTimeline.tsx`

### Change Log

- 2026-06-26：创建 + 实现 Story 2.4——移植 TimelineColumnResizer 为 DdColumnResizer，表头叠加全宽分隔条，拖拽改名称列占比、min0.2/max0.85 钳制、释放保持；69 单测；浏览器拖拽 0.32→0.55 表头+行同步验证。Status → review。
