---
baseline_commit: n/a（trace-timeline 非 git 仓库）
---

# Story 7.4: 图例 URL 状态契约（deep-link 助手）

Status: done

> Epic 7 收官项。规格：[investigations/datadog-flamegraph-legend-investigation §5]（实测 URL 参数 `highlight` / `shouldShowLegend` / `colorByAttr`）。

## Story

As a 集成方,
I want 一对纯函数把图例可控状态 ↔ Datadog 风格 URL 参数互转,
so that 宿主应用能分享/还原高亮、显隐、Color by 维度（deep-link），无需自己拼参数名。

## Acceptance Criteria

1. `toFlameLegendUrlParams(state)` → `{ highlight?, shouldShowLegend?, colorByAttr? }`（仅含已给定字段；null 高亮不写）。
2. `fromFlameLegendUrlParams(params)` 接受 Record 或 URLSearchParams，解析回状态，忽略未知/非法值。
3. 维度 ↔ colorByAttr 名实测对齐：service↔service、host↔hostname、entity↔inferred.catalog。
4. round-trip：`from(to(state)) === state`。
5. 纯函数、无副作用、不读 window；从包入口导出。
6. typecheck/test/build 通过。

## Tasks / Subtasks

- [x] 新增 `src/api/flameLegendUrl.ts`（`toFlameLegendUrlParams`/`fromFlameLegendUrlParams` + `FlameLegendUrlState`）。
- [x] `src/api/index.ts` 导出。
- [x] 单测：维度名映射、highlight/shouldShowLegend、未给定不写、非法忽略、URLSearchParams、round-trip。

## Dev Notes

- 组件本身已在 7.1/7.2/7.3 暴露全部受控 props（`highlightedGroupKey`/`onHighlightGroupChange`、`showLegend`/`onShowLegendChange`、`colorBy`/`onColorByChange`、`legendMetric`/`onLegendMetricChange`）；本 story 只补「状态 ↔ Datadog 参数名」这层纯映射，组件不直接读写 URL（库不应触碰 window）。
- 指标（metric）不入 URL（实测 Datadog 不持久化）。

## Dev Agent Record
### Agent Model Used
claude-opus-4-8[1m]（dev-story）
### Debug Log References
- 含在 Epic 7 合并验证：**199 测试全绿**（其中 flamelegendurl 6 例），typecheck 0，build ESM 202KB。
### Completion Notes List
- 纯映射助手，Record/URLSearchParams 双入参，round-trip 通过；deep-link 由宿主用受控 props 接入。
### File List
- 新增 `src/api/flameLegendUrl.ts`、`src/api/flamelegendurl.test.ts`；修改 `src/api/index.ts`
### Change Log
- 2026-06-29：实现 7.4（图例 URL 状态契约助手）。Status → review。**Epic 7 全部 4 story 完成。**

- 2026-06-29：Epic 7 code-review 通过（3 agent 对抗式）。本 story 相关 CR-patch 已修+回归。详见 [7-code-review.md]。Status → done。
