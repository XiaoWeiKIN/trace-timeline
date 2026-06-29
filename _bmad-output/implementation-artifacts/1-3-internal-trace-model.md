---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 1.3: 内部 Trace 模型与 mock

Status: review

## Story

As a 组件库开发者,
I want 移植 `types/trace` + `transform-trace-data`（含隐藏依赖 getTraceSpanIdsAsTree/getTraceName/TreeNode/service-name）并提供一份 mock `Trace` fixture,
so that 引擎/皮肤有合法的内部 Trace 数据可渲染（DataFox 适配留到 Epic 5）。

## Acceptance Criteria

1. **Given** 一份 raw `TraceResponse` fixture（多服务、深嵌套、错误 span、references）**When** 调用 `transformTraceData(resp)` **Then** 得到派生 `Trace`（depth/relativeStartTime/childSpanIds 按结束时间降序/process/services/subsidiarilyReferencedBy/dedup+order tags），时间单位微秒。
2. **And** `transformTraceData(null/无 traceID)` 返回 `null`；root span 缺失时多个顶层 span 挂在虚拟 root 下（TREE_ROOT_ID）。
3. **And** 导出一份现成 mock `Trace`（`mockTrace`）供 demo/测试使用。
4. **And** `npm run typecheck`/`npm test` 通过（含 transform 单测）。

## Tasks / Subtasks

- [x] Task 1：本地 grafana-data 类型（AC: #1）
  - [x] `src/model/grafana-types.ts`：`TraceKeyValuePair<T=any>{key,value}`、`TraceLog{timestamp,fields,name?}`（替换 `@grafana/data` 导入）
- [x] Task 2：Trace 类型（AC: #1）
  - [x] `src/model/types.ts`：移植 `types/trace.ts`（TraceLink/TraceProcess/TraceSpanReference/TraceSpanData/TraceSpan/TraceData/TraceResponse/Trace/CriticalPathSection），`@grafana/data` 类型换成本地 grafana-types
- [x] Task 3：TreeNode（AC: #1,#2）
  - [x] `src/model/tree-node.ts`：移植 `utils/TreeNode.ts`（Apache，保留版权头），泛型树 + walk/find/paths
- [x] Task 4：service-name（AC: #1）
  - [x] `src/model/service-name.ts`：移植 `getServiceDisplayName`/`getServiceColorKey`（无 Uber 头，重写，本库注释）
- [x] Task 5：trace 树构建（AC: #1,#2）
  - [x] `src/model/trace-tree.ts`：移植 `getTraceSpanIdsAsTree` + `TREE_ROOT_ID`（**去掉 reselect 与 getSpanId**，只保留纯函数；getTraceSpansAsMap 不移植）
- [x] Task 6：getTraceName（AC: #1）
  - [x] `src/model/get-trace-name.ts`：移植 `getTraceName`（Jaeger Apache，保留版权头，lodash.memoize）
- [x] Task 7：transformTraceData（AC: #1,#2）
  - [x] `src/model/transform-trace-data.ts`：移植（Apache 头）；`orderTags` 的 topPrefixes 传 `[]`（default-config 无 topTagPrefixes，**省掉 get-config 依赖**）；导出 `deduplicateTags`/`orderTags`/`transformTraceData`
- [x] Task 8：mock（AC: #3）
  - [x] `src/model/mock-trace.ts`：手写 TraceResponse fixture（多服务 + 深嵌套 + 错误 span + references），经 transform 导出 `mockTrace`
- [x] Task 9：导出 + 单测（AC: #1,#2,#4）
  - [x] `src/model/index.ts`：导出类型 + transformTraceData + mockTrace + service-name + tree
  - [x] `src/model/model.test.ts`：transform 派生字段、null 返回、虚拟 root、childSpanIds 排序、tags dedup/order
- [x] Task 10：自验：`npm run typecheck`、`npm test`、`npm run build`

## Dev Notes

### 移植清单（许可证全 Apache，AD-9 原样移植）
| 源（grafana TraceView/components/） | 目标 | 头 | 注意 |
|---|---|---|---|
| `model/transform-trace-data.tsx` | `src/model/transform-trace-data.ts` | Uber | 去 `@grafana/data` TraceKeyValuePair→本地；orderTags topPrefixes 传 `[]`；保留 mutate 语义注释 |
| `selectors/trace.ts`(部分) | `src/model/trace-tree.ts` | Uber | **只取 `getTraceSpanIdsAsTree`+`TREE_ROOT_ID`**；去 reselect/getSpanId |
| `utils/TreeNode.ts` | `src/model/tree-node.ts` | Uber | 原样 |
| `model/trace-viewer.ts`(getTraceName) | `src/model/get-trace-name.ts` | Jaeger | 只取 getTraceName；findHeaderTags 留到 Story 5.3 |
| `utils/service-name.ts` | `src/model/service-name.ts` | 无(自研) | 重写，本库注释 |
| `types/trace.ts` | `src/model/types.ts` | Uber | @grafana/data→本地 grafana-types |

### transform 关键逻辑（务必保留）
- 过滤 startTime 为空的 span；process tags orderTags；spanID 去重（dupe→`${id}_${count}`）。
- `getTraceSpanIdsAsTree(data, spanMap)` 建树（references[0] 的 CHILD_OF/FOLLOWS_FROM 决定父；无 ref 挂 root；children 按 startTime 排序）。
- `tree.walk`：depth=depth-1（root 占 0）；relativeStartTime=startTime-traceStartTime；childSpanIds 按 **结束时间(startTime+duration) 降序**；tags dedup+order；references 解析 + subsidiarilyReferencedBy（index>0）。
- 返回 services（按 svcCounts）、traceName（getTraceName）、duration/startTime/endTime。

### 本地类型替换
- `TraceKeyValuePair<T=any>{key,value}`、`TraceLog{timestamp,fields,name?}`（grafana-types.ts）。
- 注意 `noUnusedLocals`/`strict`：移植时清理未用 import（如 transform 里若不再用 get-config 就删）。

### mock 设计（FR 渲染用）
- ≥8 span，≥2 服务，≥3 层深，含 1 个错误 span（tag `error:true` 或 statusCode 2），含跨 span references。时间微秒。

### Project Structure Notes
```
src/model/
  index.ts            # 占位 → 真实导出
  grafana-types.ts    # TraceKeyValuePair/TraceLog
  types.ts            # Trace/TraceSpan/...
  tree-node.ts  trace-tree.ts  service-name.ts  get-trace-name.ts
  transform-trace-data.ts
  mock-trace.ts
  model.test.ts
```
- 依赖：lodash(memoize/isEqual)、已装。不新增依赖。**不引入 reselect**。

### 前序 Story 1.1/1.2 学习
- 脚手架 + 主题层就位；`src/model/index.ts` 当前 `export {}` 占位（root index 已 `export * from './model'`）。
- 单测 vitest（globals, jsdom）；版本 lockfile 锁定，不新增依赖。

### References
- [Source: public/app/features/explore/TraceView/components/model/transform-trace-data.tsx]
- [Source: public/app/features/explore/TraceView/components/selectors/trace.ts#getTraceSpanIdsAsTree]
- [Source: public/app/features/explore/TraceView/components/utils/TreeNode.ts]
- [Source: public/app/features/explore/TraceView/components/model/trace-viewer.ts#getTraceName]
- [Source: public/app/features/explore/TraceView/components/utils/service-name.ts]
- [Source: public/app/features/explore/TraceView/components/types/trace.ts]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-trace-timeline-2026-06-23/ARCHITECTURE-SPINE.md#AD-8] 数据契约
- [Source: _bmad-output/implementation-artifacts/investigations/trace-timeline-port-srcmap-investigation.md#transform-trace-data 隐藏依赖链]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1 / Story 1.3]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]（dev-story 纪律，直接实现）

### Debug Log References

- `npm run typecheck` → 0 错误
- `npm test` → 首轮 1 处测试用例**我自己算错**（endTime 应 200/duration 100，root r 在 100+100 结束），改正后 **13 passed**（5 model + 1 smoke + 7 theme）
- `npm run build`（tsup）→ ESM + d.ts(9.07KB) Build success

### Completion Notes List

- 移植内部 Trace 模型（许可证全 Apache，AD-9 原样移植，保留版权头）：
  - `transform-trace-data.ts`（Uber）：去 `@grafana/data` 类型→本地 grafana-types；**去 get-config**（default-config 无 topTagPrefixes，`orderTags` 传 `[]`）；保留 mutate 语义、spanID 去重、tree.walk 派生（depth/relativeStartTime/childSpanIds 按结束时间降序/dedup+order tags/subsidiarilyReferencedBy）。
  - `trace-tree.ts`（Uber）：仅取 `getTraceSpanIdsAsTree`+`TREE_ROOT_ID`，**去 reselect/getSpanId**。
  - `tree-node.ts`（Uber）、`get-trace-name.ts`（Jaeger，lodash.memoize）原样。
  - `service-name.ts` 重写（无原头）；`types.ts` 移植 trace.ts（@grafana/data→本地 `TraceKeyValuePair/TraceLog`）。
- `mock-trace.ts`：手写 9 span / 4 服务 / 3 层深 + 2 个错误 span + CHILD_OF/FOLLOWS_FROM references + 1 条 log；经 transform 导出 `mockTrace`。
- 单测覆盖：depth/childSpanIds 降序/relativeStartTime、null 返回、虚拟 root 多顶层、tags 去重排序、mockTrace 多服务派生。
- 4 条 AC 全满足。未新增依赖（lodash 已装）；**未引入 reselect**。

### File List

新增（`/Users/wangxiaowei1/xiaowei/trace-timeline/`）：
- `src/model/grafana-types.ts`、`src/model/types.ts`、`src/model/tree-node.ts`、`src/model/trace-tree.ts`、`src/model/service-name.ts`、`src/model/get-trace-name.ts`、`src/model/transform-trace-data.ts`、`src/model/mock-trace.ts`、`src/model/model.test.ts`

修改：
- `src/model/index.ts`（占位 → 真实导出）

## Change Log

- 2026-06-25：实现 Story 1.3 内部 Trace 模型——移植 transform-trace-data + 隐藏依赖（getTraceSpanIdsAsTree/getTraceName/TreeNode/service-name），去 reselect/get-config/@grafana 依赖；手写 mockTrace（9 span/4 服务/含错误+references）；13 单测通过。Status → review。
