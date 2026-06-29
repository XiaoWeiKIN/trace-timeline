---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 6.5: 火焰图 minimap 导航（Epic 6 收官）

Status: review

## Story

As a 排障用户,
I want 火焰图上方有一个整 trace 缩略 minimap，带当前视口框，可点击/拖拽定位、可收起,
so that 在放大后仍能纵览全局并快速跳转（对齐 Datadog Flame Graph 的 minimap）。

## Acceptance Criteria

1. minimap 显示**整条 trace** 缩略（所有 span 按 depth 堆叠的微缩矩形，按 service 配色），不随主视图缩放。
2. 视口框：覆盖当前 `[viewStart,viewEnd]`，可视化当前主视图所在区间。
3. 点击 minimap → 视口窗口居中到点击处（保持窗口宽度）；拖拽 → 连续平移（scrub）。经 `onViewRangeChange` 写回。
4. 可收起/展开（toggle 按钮）。
5. typecheck/test/build 通过，不回归。

## Tasks / Subtasks

- [x] Task 1：新增 `src/presentation/DdFlameMinimap.tsx`：
  - props：`{ trace; colorAccessor?; viewStart; viewEnd; onViewRangeChange(vs,ve); height? }`。
  - `computeFlameLayout(trace)`（全量，无 viewRange）→ 微缩矩形：`miniRowH = height/(maxDepth+1)`，top=depth×miniRowH，left%/width% 来自布局，bg=service 色。
  - 视口框 overlay：absolute，left=`viewStart×100%`，width=`(viewEnd−viewStart)×100%`，半透明 + 边框，`data-testid="FlameMinimapViewport"`。
  - 交互：`onMouseDown` 起拖 + 居中跳转（frac=clientX 相对宽度，w=viewEnd−viewStart，ns=clamp(frac−w/2,0,1−w)→onViewRangeChange(ns,ns+w)）；`onMouseMove` 拖拽中持续 jump；`onMouseUp/Leave` 结束。
  - 收起：内部 `collapsed` state + 角标按钮（`data-testid="FlameMinimapToggle"`）；收起时只留按钮条。
  - `data-testid="DdFlameMinimap"`。导出。
- [x] Task 2：`api/TraceTimeline.tsx`：火焰图模式在 DdFlameControls/ruler 上方渲染 `DdFlameMinimap`（viewStart/viewEnd=tt.viewRange.time.current，onViewRangeChange=tt.updateViewRangeTime，colorAccessor）。
- [x] Task 3：单测：
  - minimap 渲染微缩矩形（数=spans）+ 视口框；
  - 点击 minimap → onViewRangeChange 被调用（窗口宽度不变）；
  - toggle 收起/展开。
- [x] Task 4：自验 typecheck/test/build + Chrome DevTools（minimap 视口框随缩放、点击跳转、收起）。

## Dev Notes

- **复用 `computeFlameLayout`**（全量 viewRange 默认 [0,1]）出微缩布局，与主图同源。配色复用 colorAccessor（AD-6）。
- minimap 不缩放（永远显示整 trace）；视口框反映主图 viewRange；二者通过 onViewRangeChange→`tt.updateViewRangeTime` 双向联动（与 6.4 共享）。
- 窗口宽度在 click/drag 中保持（只移动中心），符合 minimap 直觉。
- jsdom 宽 0 → click frac=0；测试断言 onViewRangeChange 被调用即可（不验像素）。
- AD：纯 presentation；core/state 复用。
- 参考 [investigations/datadog-trace-flamegraph-layout §4（minimap 复用 profiling minimap + 视口框 + Collapse minimap）]、[6.1 computeFlameLayout]、[6.4 onViewRangeChange]。

## Dev Agent Record
### Agent Model Used
claude-opus-4-8[1m]（dev-story）
### Debug Log References
- typecheck 0 错 · `npm test` **165 passed**（162→165，+3）· build ESM 183.26KB。
- Chrome DevTools 实测：minimap 显示整 trace 缩略 + 视口框；滚轮缩放后视口框=left7.5%/width85%；点 minimap 20% 处 → 视口框移到 left0%（窗口宽 0.85 clamp）、ruler 同步 0..86.7ms；收起/展开 toggle 正常。
### Completion Notes List
- minimap 复用 `computeFlameLayout`（全量）出微缩矩形 + colorAccessor 配色；视口框反映 viewRange。
- 点击/拖拽 jump：保持窗口宽度只移中心（clamp）→ onViewRangeChange → `tt.updateViewRangeTime`，与主图/ruler/6.4 双向联动。
- collapsed 内部 state + 角标 toggle。纯 presentation；AC 全满足。**Epic 6 收官。**
### File List
- 新增 `src/presentation/DdFlameMinimap.tsx`、`src/presentation/flameminimap.test.tsx`
- 修改 `src/presentation/index.ts`、`src/api/TraceTimeline.tsx`
### Change Log
- 2026-06-28：创建+实现 Story 6.5。火焰图 minimap（缩略+视口框+点击/拖拽定位+可收起）。165 测试全绿；浏览器验证。Status → review。Epic 6 全部 5 story 完成。
