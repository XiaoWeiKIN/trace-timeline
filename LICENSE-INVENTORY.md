# 第三方代码许可证清单（发布前法务核实用）

> 本库移植了 Grafana TraceView（其底层为 Jaeger UI）的引擎代码。Grafana 项目整库为 **AGPL-3.0**，
> 但其 TraceView 子树多数文件携带上游 **Jaeger/Uber 的 Apache-2.0** 文件头。**对外公开发布前，**
> **法务须逐文件确认实际适用许可证**——尤其下方「② 需重点核实」部分。

生成时间：发布准备阶段（trace-timeline-public）。脱敏后仓库，已移除全部内部域名/IP/内部 org 名。

## ① 携带明确 Apache-2.0 文件头的移植文件

这些文件头部含 `Copyright … / Licensed under the Apache License, Version 2.0`（上游 Jaeger Authors / Uber Technologies）。
Apache-2.0 允许再分发，**义务**：保留版权与许可文本（见 LICENSE）、在 NOTICE 注明、声明重大修改（各文件「变更」注释已记）。

| 文件 | 版权方 | 许可证头 | 移植来源 |
|---|---|---|---|
| `src/core/criticalPath/findLastFinishingChildSpan.ts` | Copyright (c) 2023 The Jaeger Authors | Apache-2.0 | 原样移植自 grafana CriticalPath/utils/findLastFinishingChildSpan.tsx；类型 → . |
| `src/core/criticalPath/getChildOfSpans.ts` | Copyright (c) 2023 The Jaeger Authors | Apache-2.0 | 原样移植自 grafana CriticalPath/utils/getChildOfSpans.tsx；类型 → ../../model。 |
| `src/core/criticalPath/index.ts` | Copyright (c) 2023 The Jaeger Authors | Apache-2.0 | 原样移植自 grafana CriticalPath/index.tsx；类型 → ../../model。 |
| `src/core/criticalPath/sanitizeOverFlowingChildren.ts` | Copyright (c) 2023 The Jaeger Authors | Apache-2.0 | 原样移植自 grafana CriticalPath/utils/sanitizeOverFlowingChildren.tsx；类型 →  |
| `src/core/ListView/index.tsx` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | — |
| `src/core/ListView/Positions.ts` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | — |
| `src/core/types.ts` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | 移植自 TraceTimelineViewer/types.tsx；TNil 本地化（原 ../types/TNil）。 |
| `src/core/utils.ts` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | 移植自 TraceTimelineViewer/utils.tsx；零 @grafana 耦合，仅依赖 model 类型。 |
| `src/core/VirtualizedTraceView.tsx` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | 移植自 TraceTimelineViewer/VirtualizedTraceView.tsx（660 行，引擎调度中枢）。 |
| `src/model/get-trace-name.ts` | Copyright (c) 2020 The Jaeger Authors | Apache-2.0 | 移植自 grafana TraceView/components/model/trace-viewer.ts —— 仅取 getTraceN |
| `src/model/span-ancestor-ids.ts` | Copyright (c) 2019 Uber Technologies, Inc. | Apache-2.0 | 移植自 grafana TraceView/components/utils/span-ancestor-ids.tsx。 |
| `src/model/trace-tree.ts` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | 移植自 grafana TraceView/components/selectors/trace.ts —— 仅取 getTraceSpan |
| `src/model/transform-trace-data.ts` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | 移植自 grafana TraceView/components/model/transform-trace-data.tsx。 |
| `src/model/tree-node.ts` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | 移植自 grafana TraceView/components/utils/TreeNode.ts（原样）。 |
| `src/model/types.ts` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | 移植自 grafana TraceView/components/types/trace.ts；@grafana/data 类型换成本地 g |
| `src/state/DetailState.ts` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | 原样移植自 grafana SpanDetail/DetailState.tsx；@grafana TraceLog / TraceSpan |
| `src/theme/autoColor.ts` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | 移植自 grafana public/app/features/explore/TraceView/components/Theme.tsx |
| `src/theme/colorGenerator.ts` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | 移植自 grafana TraceView/components/utils/color-generator.tsx。 |
| `src/utils/date.ts` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | 移植自 grafana TraceView/components/utils/date.tsx。变更：moment → dayjs； |
| `src/utils/DraggableManager/DraggableManager.ts` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | 原样移植自 grafana TraceView/utils/DraggableManager/DraggableManager.tsx；TN |
| `src/utils/DraggableManager/EUpdateTypes.ts` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | 原样移植自 grafana TraceView/utils/DraggableManager/EUpdateTypes.tsx。 |
| `src/utils/DraggableManager/types.ts` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | 原样移植自 grafana TraceView/utils/DraggableManager/types.tsx；TNil → core/t |
| `src/utils/number.ts` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | 移植自 grafana TraceView/components/utils/number.tsx（原样）。 |
| `src/utils/sort.ts` | Copyright (c) 2017 Uber Technologies, Inc. | Apache-2.0 | 移植自 grafana TraceView/components/utils/sort.ts（原样）。 |

## ② AGPL 派生代码——已 clean-room 重写为本库自研（已消除）

经核实（WebFetch grafana/grafana），下列 Grafana 自研状态 hook **在上游无任何 Apache 头**，属 grafana/grafana 仓库的 **AGPL-3.0**。
本库已按**行为规格**（见 `_bmad-output/implementation-artifacts/investigations/state-hooks-relicense-spec.md`）以独立表达**重写**，
不再保留 Grafana 的具体表达（算法结构 / 英文 JSDoc 原文均已替换），并以特征化测试锁定行为：

| 文件 | 原状态 | 处置 |
|---|---|---|
| `src/state/useChildrenState.ts` | 近逐行照搬 Grafana（AGPL） | ✅ 重写：逐层折叠改单趟 DFS 扫描+深度栈（O(n)），特征化测试 `childrenstate.test.ts` 锁定 |
| `src/state/useDetailState.ts` | 近逐行照搬 Grafana（AGPL） | ✅ 重写：Map 容器 + `mutateDetail`/工厂方法，委托 Apache 的 `DetailState` 类 |
| `src/state/useViewRange.ts` | 照搬 Grafana（AGPL，含其 JSDoc） | ✅ 重写：函数式 setState，自有注释 |
| `src/state/useHoverIndentGuide.ts` | 照搬 Grafana（AGPL） | ✅ 重写：Set 增删，自有注释 |
| `src/state/filterSpans.ts` | 本就自研简化，但注释自述派生 | ✅ 去派生注释，确认为原创文本匹配 |
| `src/state/useSearch.ts` | 本就自研，但注释自述派生 | ✅ 去派生注释，确认为原创搜索状态 |

> `src/state/DetailState.ts`（class）携带 **Uber 2017 Apache-2.0** 头、源自 Jaeger UI，属①类 Apache，保留不动。
> 重写后全量 230 测试绿、行为零回归（含新增 collapseOne/expandOne 特征化测试）。

## ③ 需核实（低风险）

| 文件 | 性质 | 建议 |
|---|---|---|
| `src/core/criticalPath/*.ts` | 文件头标 **Jaeger Authors 2023 Apache-2.0**，经 grafana 移植 | 头为 Apache（CriticalPath 本就源自 jaeger-ui）→ 建议比对 jaeger-ui 上游确认头属实即可 |

## ④ 本库自研（无第三方头，作者持有）

所有 `Dd*` 皮肤组件（presentation 层）、`adapter.ts`/`fromDataFox.ts`/`fromOtlp.ts`（适配器）、
重写后的 `src/state/*`（见②）、`api/*`、`theme/tokens/*`、`core/{flameLayout,legendGroups}.ts`、`mock-trace.ts` 等为本项目自研，按 Apache-2.0 发布。

## 发布前动作清单

- [x] ②AGPL 派生 hook 已 clean-room 重写为自研，消除传染风险。
- [ ] 法务比对 ③ `criticalPath/*` 上游确为 Jaeger Apache-2.0（头已标 Jaeger，低风险）。
- [ ] 确认整库对外许可证 = Apache-2.0（见 package.json `license`）。
- [ ] 保留所有上游版权头（勿删），LICENSE/NOTICE 随仓库分发。
