---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 6.3: 火焰图时间轴 ruler + hover 游标 + tooltip

Status: review

## Story

As a 排障用户,
I want 火焰图上方有时间刻度、鼠标移动时有竖线游标显示时刻、hover 矩形有 tooltip,
so that 能读出每个 span 的精确时间位置与信息（对齐 Datadog Flame Graph 的 ruler + 游标 + tooltip）。

## Acceptance Criteria

1. 火焰图上方时间轴 ruler：ms 刻度等距（复用 `DdTicks` 数学），随 `viewRange` 重映射标签。
2. 火焰图区淡色竖直 gridline（复用 `DdTicks` showLabels=false）。
3. hover：鼠标在火焰图区移动 → 竖直游标线跟随 + 顶部时间标签（如 `39.3ms`，按 viewRange 换算）。
4. hover 矩形 → 自定义 tooltip（operation / service / 耗时），跟随光标。
5. typecheck/test/build 通过，不回归。

## Tasks / Subtasks

- [x] Task 1：新增 `src/presentation/DdFlameRuler.tsx`：定高带状容器（~22px，relative）内嵌 `DdTicks`（numTicks/viewDuration/viewStart/viewEnd, showLabels）。导出。
- [x] Task 2：`DdFlameGraphView` 增 `numTicks?`（默认 5）：渲染 gridline 背景层（`DdTicks showLabels=false`，absolute inset:0，置于矩形之下）。
- [x] Task 3：`DdFlameGraphView` hover 游标：root `ref` + `onMouseMove` 计算光标 x 分数 → 竖线（absolute full-height）+ 顶部时间标签 `data-testid="FlameCursor"`；时间 = `(viewStart + frac×(viewEnd−viewStart)) × trace.duration` 经 `formatDuration`。`onMouseLeave` 隐藏。
- [x] Task 4：`DdFlameGraphView` tooltip：矩形 `onMouseEnter` 记录 hovered span → 浮层 `data-testid="FlameTooltip"`（operation / service 名 / 耗时），跟随光标定位；离开清除。
- [x] Task 5：`api/TraceTimeline.tsx` 火焰图模式下在滚动容器上方渲染 `DdFlameRuler`（numTicks + viewDuration=trace.duration + viewRange）。
- [x] Task 6：单测：DdFlameRuler 出刻度标签；DdFlameGraphView mouseMove → 出 FlameCursor；rect mouseEnter → 出 FlameTooltip 含 operation。
- [x] Task 7：自验 typecheck/test/build + Chrome DevTools。

## Dev Notes

- **复用 `DdTicks`**（`numTicks` 等分 + `formatDuration` 标签 + viewStart/viewEnd 缩放重映射）——ruler 与 gridline 同源，零新刻度数学。
- service 名：`getServiceDisplayName(span.process)`（model 导出）。
- jsdom 下 `getBoundingClientRect` 宽 0 → 游标 frac=0（测试只断言元素出现，不验像素）。
- 颜色/令牌走 theme（游标线、tooltip 底色用 theme.colors）。AD：纯 presentation。
- 参考 [investigations/datadog-trace-flamegraph-layout §4（ruler/hover 游标 39.3ms/tooltip）]、[DdTicks]、[6.1/6.2]。

## Dev Agent Record
### Agent Model Used
claude-opus-4-8[1m]（dev-story）
### Debug Log References
- typecheck 0 错 · `npm test` **158 passed**（155→158，+3：cursor/tooltip/ruler）· build ESM 174.27KB。
- Chrome DevTools 实测（火焰图视图）：ruler 刻度 0μs/25.5ms/51ms/76.5ms(+102ms 末端) + 5 gridline；mousemove → 游标「40.39ms」@left449px；hover s7 → tooltip「GET /order · user-service · 18.5ms」。
### Completion Notes List
- ruler + gridline 复用 `DdTicks`（零新刻度数学，viewStart/viewEnd 缩放重映射）。
- 游标：root mousemove 算 frac → 竖线 + 时间标签（按 viewRange×trace.duration）；mouseLeave 清除。
- tooltip：rect mouseEnter 记 hovered span → 浮层 operation/service(`getServiceDisplayName`)/耗时，跟随光标。
- 纯 presentation；AC 全满足。
### File List
- 新增 `src/presentation/DdFlameRuler.tsx`
- 修改 `src/presentation/DdFlameGraphView.tsx`（grid+cursor+tooltip+numTicks）、`src/presentation/flamegraph.test.tsx`、`src/presentation/index.ts`、`src/api/TraceTimeline.tsx`
### Change Log
- 2026-06-28：创建+实现 Story 6.3。火焰图 ruler + gridline + hover 竖线游标 + tooltip。158 测试全绿；浏览器验证。Status → review。
