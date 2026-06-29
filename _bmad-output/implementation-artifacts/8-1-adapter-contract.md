---
baseline_commit: n/a（trace-timeline 非 git 仓库）
---

# Story 8.1: 适配器契约 + DataFox 重构为契约实例

Status: done

> Epic 8 开张项。规格：[ARCHITECTURE-SPINE AD-15]（数据源即插件：decode 契约）。承袭 AD-8/AD-14。

## Story

As a 库维护者,
I want 一个后端中立的 `TraceSourceAdapter.decode(raw): TraceResponse` 契约，并把 DataFox 重构成它的实例,
so that 新增后端只需实现 decode，渲染层零改动。

## Acceptance Criteria

1. model 新增 `adapter.ts`：`TraceSourceAdapter<Raw>{id, decode(raw): TraceResponse|null}` + `adaptTrace(adapter, raw): Trace|null`（= decode + transformTraceData）。
2. `fromDataFox` 拆出 `decodeDataFox(resp): TraceResponse`（只解码不派生）；`fromDataFox` 保留为 `decodeDataFox + transformTraceData` 便捷包装（向后兼容，行为零变化）。
3. `datafoxAdapter = {id:'datafox', decode: decodeDataFox}`。
4. `adaptTrace(datafoxAdapter, resp)` 与既有 `fromDataFox(resp)` 等价（测试断言 toEqual）。
5. decode 返回 null → adaptTrace 返回 null。
6. typecheck/test 通过，既有 `fromdatafox.test.ts` 不回归。

## Tasks / Subtasks

- [x] 新增 `src/model/adapter.ts`（契约 + adaptTrace），从 `model/index.ts` 主入口导出（后端中立）。
- [x] 重构 `src/model/adapters/fromDataFox.ts`：`decodeDataFox` 返回 TraceResponse、`fromDataFox` 包装、`datafoxAdapter` 实例。
- [x] 单测 `src/model/adapter.test.ts`：契约/decode 只产 TraceResponse（无 depth）/adaptTrace 等价 fromDataFox/异构后端共用/null 空态/第三方内联适配器。

## Dev Notes

- **AD-15**：核心包后端中立——契约住 model 主入口，具体适配器走子路径（见 8.2）。
- **教训复用**：内联适配器测试 span 须 `startTime!==0`（transformTraceData 过滤 startTime===0 的 span，移植口径）。

## Dev Agent Record
### Agent Model Used
claude-opus-4-8[1m]（dev-story）
### Completion Notes List
- 契约最小（decode-only），派生统一交 adaptTrace；DataFox 重构后向后兼容（fromDataFox 签名/行为不变）。
### File List
- 新增 `src/model/adapter.ts`、`src/model/adapter.test.ts`；改 `src/model/adapters/fromDataFox.ts`、`src/model/index.ts`
### Change Log
- 2026-06-29：实现 8.1（契约 + DataFox 重构为契约实例）。Status → done。
