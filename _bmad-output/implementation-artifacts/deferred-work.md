# Deferred Work

## Deferred from: code review of Epic 7 (7-code-review) (2026-06-29)

- **F3（Med）`focusedRootSpanId` 跨 trace 不重置 → 聚焦态残留。** 宿主在 Focus 某 span 后换入不含该 spanID 的新 trace，`focusedRootSpanId` 本地 state 不清，`computeFlameLayout` 以不存在的根渲染、ruler 时间基不一致，须手动 Reset Focus。属 Epic 6（Story 6.7 Focus=re-root）既有代码，非 Epic 7 引入。修法：trace 变更（或 selectedSpanId 失效）时校验/复位 focusedRootSpanId（同 selectedSpanId 的 find→undefined→降级）。`src/api/TraceTimeline.tsx`。
- **F5（Med）`totalExec=0` → 图例全 0.0%、空 bar、无兜底文案。** 全 span `duration=0` 或每个父都被子完全覆盖时 self-time 全为 0，`execDenom = totalExec || 1` 已防 NaN/崩溃，但每组 `execTimeRatio=0` → 图例显示「全 0%」却无 "no exec time" 提示，破坏「100% 划分」语义观感。退化 trace 罕见。修法：`metric='execTime'` 且 totalExec=0 时显示兜底文案或回退到 spans 视图。`src/core/legendGroups.ts` + `src/presentation/DdFlameLegend.tsx`。
