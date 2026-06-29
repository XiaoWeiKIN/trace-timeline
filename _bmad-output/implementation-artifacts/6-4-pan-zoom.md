---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 6.4: 火焰图 pan / zoom + 缩放按钮

Status: review

## Story

As a 排障用户,
I want 在火焰图上滚轮缩放、拖拽平移，并有「全览 / 放大到选中 / 聚焦选中」按钮,
so that 能深入查看密集区域（对齐 Datadog Flame Graph 的缩放/平移交互）。

## Acceptance Criteria

1. 滚轮缩放：在火焰图上滚轮 → 以光标处为中心放大/缩小（更新 viewRange），阻止页面滚动。
2. 拖拽平移：按住拖动 → 平移 viewRange（不触发选中）。
3. 按钮：`Zoom Out to Full Trace`（→[0,1]）、`Zoom In to Selected`（→选中 span 时间边界）、`Focus on Selected`（选中 span 边界 + padding）；无选中时后两者禁用。
4. viewRange 经 `tt.updateViewRangeTime` 落入状态容器（与瀑布共享，ruler/gridline/布局随之重映射）。
5. typecheck/test/build 通过，不回归。

## Tasks / Subtasks

- [x] Task 1：`DdFlameGraphView` 增 `onViewRangeChange?(viewStart,viewEnd)`：
  - 原生非被动 wheel 监听（useEffect+rootRef，`{passive:false}`）：`e.preventDefault()`；factor=deltaY<0?0.85:1/0.85；以光标 frac 为锚算新窗口，clamp [0,1]，最小窗口 0.01。
  - 拖拽平移：mousedown 记 {startX, startViewStart, startViewEnd, dragging}；mousemove 若 dragging → 按 dx/width×window 反向平移，clamp；mouseup/leave 结束。dragging 中不触发 onClick 选中（拖动阈值 >3px 标记 moved，moved 时 click 抑制）。
- [x] Task 2：新增 `src/presentation/DdFlameControls.tsx`：三按钮（全览 / 放大到选中 / 聚焦选中），`onZoomFull`/`onZoomSelected`/`onFocusSelected` + `hasSelection` 禁用后两者。导出。
- [x] Task 3：`api/TraceTimeline.tsx`：火焰图模式渲染 `DdFlameControls`；`onViewRangeChange→tt.updateViewRangeTime`；`onZoomFull→updateViewRangeTime(0,1)`；选中 span → 由 `selectedSpanId` 求 `[start,end]` frac（`(s.startTime-trace.startTime)/trace.duration` …）→ zoomSelected 紧贴 / focusSelected ±padding(clamp)。给 `DdFlameGraphView` 传 `onViewRangeChange`。
- [x] Task 4：单测：
  - `DdFlameGraphView` wheel → onViewRangeChange 被调用且窗口变小（zoom in）。
  - 拖拽（mousedown→mousemove→mouseup）→ onViewRangeChange 平移；moved 后不触发 onSelectSpan。
  - `DdFlameControls` 三按钮回调；hasSelection=false 时后两者 disabled。
- [x] Task 5：自验 typecheck/test/build + Chrome DevTools（滚轮缩放、拖拽、按钮）。

## Dev Notes

- **viewRange 单一真相**：`tt.viewRange.time.current` ∈[0,1]；`tt.updateViewRangeTime(start,end)` 写入。火焰图 zoom/pan 只调它，ruler/gridline/布局（`computeFlameLayout` 已接 viewRange）自动重映射。与瀑布缩放共享同一状态。
- wheel 须原生非被动监听才能 `preventDefault`（React onWheel 默认 passive）。useEffect 注册/清理。
- 拖拽 vs 选中：用移动阈值区分（moved>3px → 判定为平移，抑制其后的 click 选中）。
- 选中 span 边界：`focusSelected` padding 取窗口 ~20%，clamp [0,1]；窗口过小时给最小 0.02。
- AD：纯 presentation + api 装配；core/state 复用既有 updateViewRangeTime（Story 2.3）。
- 参考 [investigations/datadog-trace-flamegraph-layout §4（pan/zoom、3 按钮）]、[Story 2.3 updateViewRangeTime]、[6.1-6.3]。

## Dev Agent Record
### Agent Model Used
claude-opus-4-8[1m]（dev-story）
### Debug Log References
- typecheck 0 错 · `npm test` **162 passed**（158→162，+4：wheel/drag-suppress/controls×2）· build ESM 179.02KB。
- 修复：测试文件多余 `});`（语法）→ 删除；`.at(-1)` 不在 TS lib → 改索引访问。
- Chrome DevTools 实测：滚轮(deltaY−300, 光标居中)→ ruler 0μs..102ms 变 7.65..94.35ms(以 51ms 为锚)、root 宽 1134→1334(放大裁切)；「全览」复位 0..102ms；选 s7→「放大到选中」→ ruler 40..58.5ms、s7 占满视口。
### Completion Notes List
- 滚轮缩放：原生非被动 wheel 监听（useEffect+ref）preventDefault，以光标 frac 为锚，factor 0.85，clamp [MIN_WINDOW,1]。
- 拖拽平移：mousedown/move/up，moved>3px 标记并抑制其后 click 选中（suppressClickRef）；mousemove 仍更新游标。
- 3 按钮 `DdFlameControls`：全览→(0,1)；放大到选中→span 边界；聚焦选中→±20% padding clamp。无选中禁用后两者。
- viewRange 经 `tt.updateViewRangeTime`（Story 2.3）单一真相，ruler/gridline/布局自动重映射，与瀑布共享。AC 全满足。
### File List
- 新增 `src/presentation/DdFlameControls.tsx`
- 修改 `src/presentation/DdFlameGraphView.tsx`（wheel+drag+onViewRangeChange）、`src/presentation/flamegraph.test.tsx`、`src/presentation/index.ts`、`src/api/TraceTimeline.tsx`（DdFlameControls+selectedSpanBounds+onViewRangeChange）
### Change Log
- 2026-06-28：创建+实现 Story 6.4。火焰图滚轮缩放 + 拖拽平移 + 全览/放大到选中/聚焦选中。162 测试全绿；浏览器验证缩放/平移/按钮。Status → review。
