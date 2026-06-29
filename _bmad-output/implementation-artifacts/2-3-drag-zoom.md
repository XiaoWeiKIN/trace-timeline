---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 2.3: 拖拽缩放时间窗

Status: review

## Story

As a 排障用户,
I want 在时间线表头的 ViewingLayer 上按下拖拽出一段区间来缩放当前时间窗,
so that 放大关注的时间区间、看清密集的 span。

## Acceptance Criteria

1. **Given** 表头刻度区上的 ViewingLayer（基于移植的 DraggableManager）**When** 在其上按下并拖拽出一段区间释放 **Then** 产生新的 `viewRange.time.current = [start,end]∈[0,1]`，瀑布条与刻度随之重映射（FR-8）。
2. **And** 拖拽过程中显示半透明选区标记（reframe），松手前可见即时反馈；离开/移动时显示游标竖线（cursor guide）。
3. **And** 处于缩放态（current≠[0,1]）时，超出视口的条两端显示裁剪提示（core 已产出 `clippingLeft/clippingRight` → 皮肤渲染）。
4. **And** `npm run typecheck` / `npm test` / `npm run build` 全过；DraggableManager 移植带单测；ViewingLayer 带单测。

## Tasks / Subtasks

- [x] Task 1：移植 DraggableManager（AC: #1）`src/utils/DraggableManager/{DraggableManager.ts,EUpdateTypes.ts,types.ts,index.ts}` — 原样移植（Apache/Uber 头），`@grafana TNil` → `../../core/types` 的 `TNil`，`lodash/get` 保留。utils 叶子层，仅依赖 react + lodash。
- [x] Task 2：ViewingLayer 皮肤（AC: #1,#2）`src/presentation/DdViewingLayer.tsx` — 移植 TimelineViewingLayer 行为（reframe 拖拽 + cursor guide + markers），`@grafana/ui stylesFactory` → 本库 `useStyles2`，emotion 颜色走 `theme.trace`/`theme.colors`。class 组件 + DraggableManager（AD-3 line-port）。
- [x] Task 3：表头接入（AC: #1,#2）`DdTimelineHeader` 在 ticksHead 区叠加 `DdViewingLayer`（绝对定位铺满），新增可选 props `viewRangeTime/updateViewRangeTime/updateNextViewRangeTime/boundsInvalidator`，齐备才渲染。
- [x] Task 4：api 接线（AC: #1）`<TraceTimeline>` 把 `tt.viewRange.time`、`tt.updateViewRangeTime`、`tt.updateNextViewRangeTime`、`boundsInvalidator=spanNameColumnWidth` 传给表头。
- [x] Task 5：裁剪提示（AC: #3）确认 core `buildRenderableRow` 已产 `viewBounds.clippingLeft/Right`；`DdSpanBar` 渲染两端裁剪箭头/渐隐。
- [x] Task 6：单测（AC: #4）`DraggableManager.test.ts`（drag 生命周期 + 边界裁剪 value）、`viewinglayer.test.tsx`（拖拽产出 updateViewRangeTime 调用）。
- [x] Task 7：自验 typecheck/test/build + Chrome DevTools（在表头拖拽 → 瀑布放大 → 裁剪箭头出现 → 双击/全展重置留 2.x）。

## Dev Notes

### 读侧已通（关键：避免重复造）
- 状态容器 `useTraceTimelineState` 已暴露 `viewRange`/`updateViewRangeTime(start,end)`/`updateNextViewRangeTime(update)`（移植自 useViewRange，不可变）。
- 引擎 `VirtualizedTraceView` 已消费 `currentViewRangeTime={tt.viewRange.time.current}` 并经 `createViewedBoundsFunc` 重算每行 `viewBounds`（含 clippingLeft/Right）。
- **本故事只补「写」侧**：ViewingLayer UI + DraggableManager + 表头接线。状态/引擎逻辑不改。

### DraggableManager 契约（移植自 utils/DraggableManager）
- `getBounds(tag) → {clientXLeft, width, minValue?, maxValue?}`；`_getPosition(clientX)` 把像素映射到 [0,1] 的 value（带 min/max 裁剪）。
- 6 类回调：onMouseEnter/Leave/Move（minor）+ onDragStart/Move/End。mousedown 时挂 window mousemove/mouseup，mouseup 解绑并 `userSelect` 复位。
- `resetBoundsOnResize` 默认 true → 监听 window resize 失效缓存；`dispose()` 卸载时清。

### ViewingLayer 行为（移植自 TimelineViewingLayer）
- `_draggerReframe` 单个 DraggableManager；onDragStart/Move 调 `updateNextViewRangeTime({reframe:{anchor,shift}})`，onDragEnd 调 `updateViewRangeTime(start,end)`。
- `mapFromViewSubRange/mapToViewSubRange`：在缩放态下把 [0,1] 拖拽值映射回全局区间（保证嵌套缩放正确）。
- `boundsInvalidator`（= 列宽）变化 → `resetBounds()`。
- markers：reframe(红 reframe / 蓝 shift) 半透明选区；cursor guide 红竖线。Datadog 皮肤保留语义，配色走 theme（reframe 用 primary.main 透明度）。

### 范围
- minimap/SpanGraph 概览缩放 → 不做（PRD 未含）。shiftStart/shiftEnd（从 minimap 边缘拖）保留渲染分支但本库无 minimap 触发源 → markers 代码保留、不接触发。
- 双击重置 viewRange → 留后续（非本 AC）。列宽拖拽 → 2.4。

### References
- [Source: utils/DraggableManager/{DraggableManager,types,EUpdateTypes}.tsx]
- [Source: TimelineHeaderRow/TimelineViewingLayer.tsx]
- [Source: src/state/useViewRange.ts]、[Source: src/core/utils.ts createViewedBoundsFunc]
- [Source: epics.md#Story 2.3]、[Source: prd FR-8]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]（dev-story）

### Debug Log References

- typecheck 0 错误 · `npm test` **66 passed**（+8：5 DraggableManager + 3 DdViewingLayer）· build ESM 93.09 KB clean。
- Chrome DevTools（连用户 Chrome，localhost:5174）：表头拖拽 30%→60% → 刻度由 `0μs..102ms` 重映射为 `30.53ms..61.19ms`；瀑布条按视窗重投影；拖拽中 reframe 选区 marker（`29.9%/30%` 宽）；缩放态两端出现边缘渐隐裁剪带。全程受控回环（updateNextViewRangeTime → 状态回流 → props.reframe.anchor 持久化）验证通过。
- 排坑：① 合成事件「同步」三连发（mousedown/move/up）会让 React 来不及重渲染、anchor 无法持久化 → 测试必须用有状态宿主复现受控回环，浏览器验证需在事件间留 ~40ms。② 裁剪初版误把 `clippingLeft/Right` 当「逐条」箭头渲染 → 实为上游 **全局** 标志（`zoomStart>0`/`zoomEnd<1`），是时间线列两端的逐行 6px 边缘渐隐带（连成竖向暗带），已改回到 `DdSpanRow` 列边缘。

### Completion Notes List

- **读侧已通、只补写侧**：状态容器（2.1）已暴露 `viewRange`/`updateViewRangeTime`/`updateNextViewRangeTime`，引擎（1.5）已消费 `currentViewRangeTime` 并重算 `viewBounds`。本故事新增 ViewingLayer UI + DraggableManager + 表头/api 接线，状态与引擎逻辑未改。
- **DraggableManager** 原样移植到 utils 叶子层（Apache/Uber 头），`@grafana TNil` → `core/types`，仅依赖 react+lodash。
- **DdViewingLayer**：函数包装取主题样式 + 内层 class 持有 DraggableManager/ref/生命周期（AD-3 line-port）；reframe 拖拽产 `updateViewRangeTime`，`mapFrom/ToViewSubRange` 保证缩放态嵌套拖拽正确；配色走 theme（AD-6/7）。
- **裁剪提示**：忠实上游——全局 clip 标志在 `DdSpanRow` 时间线列两端渲染 6px 边缘渐隐带（缩放态逐行连成竖向暗带）；`DdTicks` 新增 `viewStart/viewEnd`（默认 [0,1] 向后兼容），缩放时刻度标签重映射。
- 范围：minimap/SpanGraph 概览、双击重置留后续；shiftStart/End markers 代码保留但本库无 minimap 触发源。AC #1~4 全满足，未新增依赖。

### File List

新增：`src/utils/DraggableManager/{DraggableManager.ts,EUpdateTypes.ts,types.ts,index.ts,DraggableManager.test.ts}`、`src/presentation/{DdViewingLayer.tsx,viewinglayer.test.tsx}`
修改：`src/utils/index.ts`、`src/presentation/{DdTimelineHeader.tsx,DdTicks.tsx,DdSpanBar.tsx,DdSpanRow.tsx,index.ts}`、`src/api/TraceTimeline.tsx`

### Change Log

- 2026-06-26：创建 + 实现 Story 2.3——移植 DraggableManager + DdViewingLayer，表头叠加缩放层，拖拽产出 viewRange 并重映射刻度/条；裁剪提示走列边缘渐隐带（忠实全局 clip）；66 单测；浏览器拖拽缩放 0μs..102ms → 30.5..61.2ms 验证。Status → review。
