---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 6.6: minimap 高保真对齐 Datadog

Status: review

## 背景

Story 6.5 的 minimap 是「全宽 band 在火焰图上方」。实测 Datadog（调研 Follow-up 2026-06-29）：minimap 是**210×105 小框浮在火焰图左上角之上**，控件**停靠在 minimap 内**，视口框是**透明 + 蓝边**、外覆**浅蓝调遮罩**，cursor `grab` 抓拖平移。本故事把形态/视觉/控件停靠对齐 Datadog（能力层 6.5 已具，仅重塑形态）。

## Acceptance Criteria

1. minimap 改为**浮层 overlay**：定位在火焰图区**左上角、覆盖**在火焰图之上（不再独占横幅高度）；尺寸 ~240×（自适应高），白底 + 边框 + 阴影。
2. **控件停靠**：全览/放大到选中/聚焦选中 + 折叠按钮，均**位于 minimap 内**（移除独立 `DdFlameControls` 行）。
3. **遮罩反转**：minimap 概览上覆 `rgba(234,246,252,0.5)` 浅蓝调遮罩；视口框 = **透明 + 1px solid rgb(0,107,194) 蓝边**（不再蓝色填充）。
4. **grab 拖动**：视口/画布 `cursor:grab`（拖拽 grabbing）→ 抓拖平移；click-jump 保留为增强。
5. 折叠 → 浮层缩成小恢复按钮（展开 minimap）。
6. typecheck/test/build 通过，不回归；既有 minimap 联动（视口随缩放、点击/拖拽定位）保持。

## Tasks / Subtasks

- [x] Task 1：`DdFlameMinimap` 重塑为浮层面板：
  - wrap：`position:absolute`（由父定位）、宽 `width`（默认 240）、白底、`border` + `boxShadow`、圆角、zIndex 高。
  - 概览区：现有微缩矩形 + **覆盖一层遮罩 div**（`background: theme.trace.flame.minimapMask`，全覆盖）。
  - 视口框：改 `background: transparent` + `border: 1px solid theme.trace.flame.minimapViewportBorder`，`cursor: grab`（拖拽时 grabbing）。
  - 新增 props：`onZoomFull/onZoomSelected/onFocusSelected/hasSelection`（控件停靠）；footer 内嵌 `DdFlameControls` + 折叠 toggle。
  - 折叠：`collapsed` → 仅渲染小恢复按钮条。
- [x] Task 2：令牌 `theme.trace.flame` 增 `minimapMask: 'rgba(234,246,252,0.5)'`（dark 取等价）、`minimapViewportBorder: 'rgb(0,107,194)'`（dark 取浅蓝）、`minimapWidth: 240`。
- [x] Task 3：`api/TraceTimeline.tsx`：火焰图分支用 `position:relative` 包裹（ruler+scroll），把 `DdFlameMinimap` 作为**绝对定位 overlay**（top/left 小偏移）渲染于其上，传入 zoom 控件回调 + hasSelection；**移除独立 `DdFlameControls` 行**（其按钮进 minimap）。
- [x] Task 4：单测更新：
  - minimap 内出现控件按钮（zoom-full/zoom-selected/focus-selected）；
  - 视口框 border 样式存在、无填充；
  - 折叠/展开；点击仍触发 onViewRangeChange。
  - api：火焰图模式不再有独立 DdFlameControls 行（控件在 minimap 内），minimap overlay 存在。
- [x] Task 5：自验 typecheck/test/build + Chrome DevTools 与 Datadog 并排（浮层位置/遮罩/蓝边/控件停靠/grab）。

## Dev Notes

- 实测规格见 [investigations/datadog-trace-flamegraph-layout 的 Follow-up（2026-06-29 minimap 深度规格）]：框 210×105（我方取 240 宽自适应高）、遮罩 `rgba(234,246,252,0.5)`、视口边 `1px solid rgb(0,107,194)`、控件停靠、grab、无 brush 拖边缩放。
- **能力不变**：平移/视口/缩放联动/折叠 6.5+6.4 已具；本故事仅重塑形态+视觉+控件位置，复用 `DdFlameControls`（6.4）。
- 浮层覆盖火焰左上角属预期（Datadog 同款）。父容器 `position:relative` 以承载 absolute minimap。
- AD：纯 presentation + api 装配；core/state 零改动。
- 参考 [6.5 DdFlameMinimap]、[6.4 DdFlameControls]、[investigations Follow-up]。

## Dev Agent Record
### Agent Model Used
claude-opus-4-8[1m]（dev-story）
### Debug Log References
- typecheck 0 错 · `npm test` **166 passed**（165→166）· build ESM 185.28KB。
- Chrome DevTools 与 Datadog 并排实测：minimap `position:absolute` 242×115 z5、**overlapWithFlame=true（浮于火焰图左上角之上）**；遮罩 bg `rgba(234,246,252,0.5)`、视口框 bg 透明 + border `rgb(0,107,194)`；控件停靠 minimap 内（zoom-full/zoom-selected/focus-selected + 收起）；滚轮缩放后视口框收窄 7.5%/85%。与 Datadog `profiling_minimap` 形态一致。
### Completion Notes List
- minimap 由「全宽 band」改「浮层 overlay」：`DdFlameMinimap` 自身 absolute（父 `flameWrap` relative 承载），覆盖火焰图左上角。
- 遮罩反转：概览上覆 `theme.trace.flame.minimapMask`（pointer-events:none）+ 视口透明 + 蓝边 `minimapViewportBorder`。
- 控件停靠：footer 内嵌复用 6.4 `DdFlameControls` + 收起按钮；移除 TraceTimeline 独立控件行。
- grab 拖动（canvas cursor grab/grabbing），click-jump 保留。能力（平移/视口/缩放联动/折叠）不变，仅重塑形态/视觉/控件位置。AD：纯 presentation + api 装配。AC 全满足。
### File List
- 修改 `src/presentation/DdFlameMinimap.tsx`（浮层+遮罩反转+控件停靠+折叠）、`src/presentation/flameminimap.test.tsx`、`src/theme/types.ts`、`src/theme/tokens/trace.ts`（minimap 令牌）、`src/api/TraceTimeline.tsx`（flameWrap relative + minimap overlay + 移除独立 DdFlameControls 行）
### Change Log
- 2026-06-29：创建+实现 Story 6.6。minimap 浮层化 + 遮罩反转 + 控件停靠 + grab，对齐 Datadog profiling_minimap。166 测试全绿；浏览器并排验证。Status → review。
