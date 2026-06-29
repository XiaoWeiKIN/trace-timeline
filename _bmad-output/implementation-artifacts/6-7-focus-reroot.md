---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 6.7: Focus on Selected = re-root（minimap 能力对齐）

Status: review

## 背景

深度 research（官方文档 + live 实测，2026-06-29，见调研 Follow-up）确认：Datadog minimap 停靠的 **Focus on Selected Span** ≠ 缩放，而是 **re-root**——选中 span 成新 root（depth 0 铺满宽），**只渲染其子树（祖先隐藏）+ depth 重基**，% Exec Time 图例/minimap 同步只剩子树，可 **reset focus** 返回全 trace。我方 6.6 的「聚焦选中」只是加 padding 的 zoom——**真能力缺失**。本故事实现 re-root。

live 实测：focus GET /order(18.5ms) → 它成顶行铺满，子孙 GET /order(8.96ms)/OrderController.hello 重基跟随，祖先消失，图例只剩 192.0.2.10/flux-service。

## Acceptance Criteria

1. `computeFlameLayout` 增 `focusRootSpanId`：聚焦时只取该 span 子树（含自身）、depth 重基（root→0）、时间映射到 root 区间（root 铺满 [0,1]，受 viewRange 再缩放）。
2. 「聚焦选中」(Focus) → 设 `focusedRootSpanId`=选中 span + 重置 viewRange[0,1]；火焰图 re-root（祖先隐藏、root 铺满、子孙重基）。
3. 聚焦态出「重置聚焦」→ 清 focus + 重置 viewRange，返回全 trace。
4. ruler / minimap / hover 游标随 focus 根重映射（minimap 显示子树铺满 + 视口框；ruler 时间基于 root 时长）。
5. 「放大到选中」(Zoom In) 仍为时间 zoom（focus 态下相对 root 坐标系）。
6. typecheck/test/build 通过，不回归。

## Tasks / Subtasks

- [x] Task 1：`core/flameLayout.ts`：增 `getFlameSubtreeIds(trace, rootSpanId)`（用 transform 的 DFS 顺序：root 后连续 depth>rootDepth 的 span 即子树）；`computeFlameLayout(trace, viewRange?, focusRootSpanId?)`：聚焦时 spans=子树、min/max=root 时间区间、depth−=rootDepth。导出 helper。
- [x] Task 2：`DdFlameGraphView` 增 `focusRootSpanId?`：传入 computeFlameLayout；hover 游标时间用有效时长（聚焦=root.duration，否则 trace.duration）。
- [x] Task 3：`DdFlameMinimap` 增 `focusRootSpanId?`：概览用聚焦子树（root 铺满 minimap）。
- [x] Task 4：`DdFlameControls` 增 `isFocused` + `onResetFocus`：聚焦态显示「重置聚焦」按钮。
- [x] Task 5：`api/TraceTimeline.tsx`：`focusedRootSpanId` 态；「聚焦选中」→ set + viewRange(0,1)；「重置聚焦」→ clear + viewRange(0,1)；focusRootSpanId 传 flame/minimap；ruler `viewDuration` = 聚焦?root.duration:trace.duration；`selectedSpanBounds` focus 感知（相对 root 坐标系）。
- [x] Task 6：单测：computeFlameLayout focus → 行数=子树、root depth 0 left0 width1、祖先不在；DdFlameControls isFocused 出重置；api 聚焦→祖先 span 矩形消失/重置恢复。
- [x] Task 7：自验 typecheck/test/build + Chrome DevTools（聚焦 re-root + 重置）。

## Dev Notes

- **子树判定**：transform-trace-data 已按 DFS 排序（子紧跟父），故子树 = 焦点 index 起、后续 depth>rootDepth 的连续段（健壮，不依赖 references.span）。
- **坐标系**：聚焦时把 root 当作新「trace」——min/max=root 区间、depth−rootDepth、viewRange ∈[0,1] 相对 focus。ruler 显示 focus 相对时间（0..root.duration）；与 Datadog 绝对时间显示有微差异（可接受，更清晰）。
- minimap 聚焦时概览=子树铺满、视口=focus 内 zoom。
- 能力定位：pan/scroll-zoom(6.4)、形态/控件停靠/遮罩(6.6) 已具；本故事补 **Focus=re-root** 这一真能力。
- AD：core 出几何（含 focus 子树/重基，零皮肤）；presentation/api 装配。
- 参考 [investigations Follow-up（官方文档 + live 实测 Focus=re-root）]、[6.5/6.6 minimap]、[6.4 DdFlameControls]。

## Dev Agent Record
### Agent Model Used
claude-opus-4-8[1m]（dev-story）
### Debug Log References
- typecheck 0 错 · `npm test` **170 passed**（166→170，+4：core focus / controls reset×2 / api focus）· build ESM 187.41KB。
- Chrome DevTools 实测 demo：聚焦 s7（GET /order）→ 火焰图 re-root：s7 成顶行铺满全宽，子孙 SELECT(5.44ms)/async post-process(3ms) depth 重基，**祖先 s1/s2 等消失**；ruler 变 0μs..18.5ms（相对 focus 时长）；minimap 同步 re-root；footer 出「重置聚焦」；抽屉「GET /order 18.5ms 100% total exec time」。重置聚焦 → 9 span 全回、ruler 复位 0..102ms、重置按钮消失。
- Datadog live 实测对照（同 trace）：Focus GET /order 同样 re-root（仅 ruler Datadog 显绝对时间、我方显相对，已记为可接受微差异）。
### Completion Notes List
- **Focus = re-root**（真能力补齐）：core `computeFlameLayout(trace, viewRange, focusRootSpanId)` 取子树（`getFlameSubtreeIds` 用 DFS 顺序+depth）+ depth 重基 + 时间映射到 root 区间；TraceTimeline `focusedRootSpanId` 态 + focusSelected/resetFocus；flame/minimap 传 focusRootSpanId；ruler viewDuration=focus?root.dur:trace.dur；selectedSpanBounds focus 感知；DdFlameControls isFocused→「重置聚焦」。
- 区分对齐 Datadog：放大到选中=时间 zoom（保留）；聚焦选中=re-root（本故事）。
- AD：core 出几何（含 focus 子树/重基，零皮肤）；presentation/api 装配。AC 全满足。
### File List
- 修改 `src/core/flameLayout.ts`（+getFlameSubtreeIds+focusRootSpanId）、`src/core/index.ts`、`src/core/flameLayout.test.ts`、`src/presentation/{DdFlameGraphView,DdFlameMinimap,DdFlameControls}.tsx`、`src/presentation/flamegraph.test.tsx`、`src/api/TraceTimeline.tsx`、`src/api/api.test.tsx`
### Change Log
- 2026-06-29：创建+实现 Story 6.7。Focus on Selected = re-root（子树+depth 重基+root 铺满+可重置），补齐 minimap 真能力。170 测试全绿；浏览器实测 + Datadog 对照。Status → review。
