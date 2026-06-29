---
baseline_commit: n/a（trace-timeline 非 git 仓库）
---

# Story 7.2: 图例指标切换（% Exec Time / Spans）

Status: done

> Epic 7 backlog 项。规格：[investigations/datadog-flamegraph-legend-investigation §2/§3]（实测 Datadog 图例表头下拉 = % Exec Time / Spans）。

## Story

As a 排障用户,
I want 图例表头能在「% Exec Time」和「Spans」间切换,
so that 我既能看耗时占比，也能看各服务 span 数量（对齐 Datadog 图例指标下拉）。

## Acceptance Criteria

1. 图例表头渲染指标下拉：`% Exec Time`（execTime）/ `Spans`（spans）。
2. 选 `Spans` → 每行显示 span **计数**（非百分比）、按计数降序、bar 按计数占比。
3. 指标状态受控/非受控（`legendMetric`/`onLegendMetricChange`/`defaultLegendMetric`）。
4. typecheck/test/build 通过，不回归。

## Tasks / Subtasks

- [x] `DdFlameLegend`：表头 `onMetricChange` 提供时渲染 `<select data-testid="DdFlameLegendMetric">`（execTime/spans），否则静态文本；行数字/bar 已按 metric 切换（7.1 已就绪）。
- [x] `TraceTimeline`：`legendMetric` 受控/非受控 state；传 `metric`+`onMetricChange` 给图例。
- [x] 单测：下拉选项 = [execTime, spans]；切 spans → onMetricChange('spans')；metric='spans' 行显示计数。
- [x] 自验 typecheck/test/build + DevTools。

## Dev Notes

- 指标聚合早在 7.1 的 `computeLegendGroups` 已支持 `metric` 参数（execTime/spans，降序）；7.2 只补 UI 下拉 + state。
- 指标**不写 URL**（实测 Datadog 不持久化指标，见调研 §2）。

## Dev Agent Record
### Agent Model Used
claude-opus-4-8[1m]（dev-story）
### Debug Log References
- 含在 Epic 7 合并验证：**199 测试全绿**，typecheck 0，build ESM 202KB。
- DevTools：切 Spans → 图例 mall-order-api 5 / user-service 2 / mysql 1 / redis 1（计数降序）；切回 % Exec Time 正常。
### Completion Notes List
- 表头下拉 + 受控/非受控 metric；复用 7.1 聚合，零新增聚合逻辑。
### File List
- 修改 `src/presentation/DdFlameLegend.tsx`、`src/presentation/flamelegend.test.tsx`、`src/api/TraceTimeline.tsx`
### Change Log
- 2026-06-29：实现 7.2（图例指标 % Exec Time / Spans 下拉 + 受控）。Status → review。

- 2026-06-29：Epic 7 code-review 通过（3 agent 对抗式）。本 story 相关 CR-patch 已修+回归。详见 [7-code-review.md]。Status → done。
