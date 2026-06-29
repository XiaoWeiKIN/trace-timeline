---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 6.2: 瀑布⇄火焰图视图切换 + 选中联动

Status: review

## Story

As a 排障用户,
I want 在瀑布和火焰图之间切换，并且点火焰图里的 span 也能在底部抽屉看详情,
so that 两种视图共享同一选中态与详情抽屉（对齐 Datadog 的 Flame Graph / Waterfall tab 切换）。

## Acceptance Criteria

1. `TraceTimeline` 顶部新增视图切换（瀑布 / 火焰图），非受控默认「瀑布」；可选受控 `viewMode`/`onViewModeChange`。
2. 切到火焰图 → 渲染 `DdFlameGraphView`（替换 `VirtualizedTraceView`），`viewRange` 接 `tt.viewRange.time.current`（缩放联动预留）。
3. 点火焰图矩形 → `tt.selectSpan(spanID)` → **底部抽屉显示该 span**（与瀑布共享 `selectedSpanId`，Story 5.5）；选中矩形描边（6.1 已具样式）。
4. `DdSearchBar`（filter / Errors / Color by）两视图都显示；`DdTimelineHeader`（折叠/列宽/ticks）仅瀑布视图显示。
5. typecheck / test / build 通过；既有测试不回归。

## Tasks / Subtasks

- [x] Task 1：`DdFlameGraphView` 增 `onSelectSpan?(spanID)`：矩形 `onClick` 调用之；有回调时 `cursor:pointer`。
- [x] Task 2：新增 `src/presentation/DdViewTabs.tsx`：受控 `value: 'waterfall'|'flamegraph'` + `onChange`，渲染两个 tab（data-testid="DdViewTabs"、每 tab data-view），active 下划线（复用既有 tab 风格，参考 DdSpanDetailTabs）。从 presentation index 导出。
- [x] Task 3：`api/TraceTimeline.tsx`：增 `viewMode` 状态（非受控默认 'waterfall'；可选 props `viewMode`/`onViewModeChange`）。在 `DdSearchBar` 上方渲染 `DdViewTabs`。`viewMode==='waterfall'` → 现有 `DdTimelineHeader`+滚动容器+`VirtualizedTraceView`；`==='flamegraph'` → 隐藏 `DdTimelineHeader`，滚动容器内渲染 `DdFlameGraphView trace + colorAccessor + selectedSpanId=tt.selectedSpanId + onSelectSpan=tt.selectSpan + viewRange={viewStart:cur[0],viewEnd:cur[1]}`。底部抽屉逻辑不变（已基于 tt.selectedSpanId，两视图自动共享）。
- [x] Task 4：单测：
  - `DdFlameGraphView` 点矩形触发 `onSelectSpan(spanID)`。
  - `DdViewTabs` 点 tab 触发 `onChange`，active 态正确。
  - api 层：切到火焰图 → 出现 `DdFlameGraphView`、消失 `DdTimelineHeader`；点矩形 → 出现底部抽屉 `TraceTimelineDrawer`。
- [x] Task 5：自验 typecheck/test/build + Chrome DevTools：切换两视图、火焰图点 span 弹同一底部抽屉。

## Dev Notes

- **共享选中态**：Story 5.5 已把详情改为「`selectedSpanId` + 底部抽屉」。火焰图只需调用同一个 `tt.selectSpan`，抽屉零改动即跟随。切视图保持选中。
- **viewRange 映射**：`tt.viewRange.time.current` 是 `[number,number]` ∈[0,1]；火焰图 `viewRange={ viewStart: cur[0], viewEnd: cur[1] }`。本故事缩放交互未做（6.4），但接好线，6.4 直接生效。
- **DdViewTabs 风格**：参考 `DdSpanDetailTabs`（active 蓝色下划线）。Datadog 实测 tab 文案 `Flame Graph | Waterfall | Span List | Map`；本组件先做 瀑布/火焰图 两项（Span List/Map 非本项目范围）。
- **AD 合规**：纯 presentation + api 装配；core/state/详情抽屉零改动。颜色仍走 colorAccessor（AD-6）。
- 参考 [Source: investigations/datadog-trace-flamegraph-layout §4/§5（tab 切换、共享抽屉）]、[6.1 DdFlameGraphView]、[Story 5.5 selectedSpanId/selectSpan]。

## Dev Agent Record
### Agent Model Used
claude-opus-4-8[1m]（dev-story）
### Debug Log References
- typecheck 0 错 · `npm test` **155 passed**（150→155，+5：2 viewtabs + 1 flame onSelect + 2 api）· build ESM 170.14KB。
- Chrome DevTools 实测 demo（localhost:5173）：tab「瀑布/火焰图」切换 → 火焰图视图渲染、DdTimelineHeader 隐藏、工具条(Filter/Errors/Color by)保留；点火焰图 s1 → 底部抽屉显示「mall-order-api GET /user 102ms 100% total exec time」+ 选中矩形高亮（共享 selectedSpanId）。
### Completion Notes List
- 视图切换：`DdViewTabs`（受控 waterfall/flamegraph）+ TraceTimeline 增 viewMode 三态（非受控默认 waterfall / 受控 viewMode+onViewModeChange）。
- 选中联动：`DdFlameGraphView.onSelectSpan` → `tt.selectSpan` → 与瀑布共享 Story 5.5 的 selectedSpanId + 同一底部抽屉（抽屉零改动自动跟随）。切视图保持选中。
- viewRange 已接 `tt.viewRange.time.current`（缩放联动 6.4 直接生效）。AD：纯 presentation+api 装配，core/state/抽屉零改动。AC 全满足。
### File List
- 新增 `src/presentation/DdViewTabs.tsx`、`src/presentation/viewtabs.test.tsx`
- 修改 `src/presentation/DdFlameGraphView.tsx`（onSelectSpan+clickable）、`src/presentation/flamegraph.test.tsx`、`src/presentation/index.ts`、`src/api/TraceTimeline.tsx`、`src/api/api.test.tsx`
### Change Log
- 2026-06-28：创建+实现 Story 6.2。DdViewTabs 视图切换 + 火焰图点 span 联动共享底部抽屉。155 测试全绿；浏览器验证切换+联动。Status → review。
