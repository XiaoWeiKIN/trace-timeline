---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 5.1: DataFox 适配器 fromDataFox

Status: review

## Story

As a 使用方,
I want `fromDataFox(resp): Trace` 把 DataFox 响应（DataFrame 列式/OTLP 字段）转成内部 Trace,
so that DataFox 数据可直接渲染。

## Acceptance Criteria

1. 列式→行式，按 `parent_span_id` 建父子 references、孤儿父按 root，attrs_raw JSON.parse→tags/process，events→logs（FR-22）。
2. 时间单位 ms/ns→µs 在边界归一化，复用 Apache transform 派生 depth 等。
3. typecheck/test/build 通过；带 fixture + 单测。

## Tasks / Subtasks

- [x] Task 1：`src/model/adapters/fromDataFox.ts` — 解析 `data.A.frames[0].{schema.fields,data.values}` 列式；字段映射（trace_id/span_id/parent_span_id/timestamp(ms)/duration(ns)/service_name/operation_name/span_name/span_kind/status_code/exception_*/{resource,span}_attributes_raw/events/scope_*）。
- [x] Task 2：parent_span_id→references[CHILD_OF]；孤儿父（不在结果集）→ 无 ref（按 root）；service_name→processID/process.tags(resource_attrs)。
- [x] Task 3：attrs_raw JSON.parse→KV（对象/数组/坏 JSON 容错）；events→logs（timestamp ns/ms→µs）；status_code 字符串→0/1/2，exception→error tag+statusCode 2。
- [x] Task 4：ms→µs(*1000)、ns→µs(/1000)；末尾 transformTraceData 派生 depth/process/relativeStartTime。
- [x] Task 5：fixture `datafox-fixture.ts`（3 span 列式）+ 单测 `fromdatafox.test.ts`（8 例）。
- [x] Task 6：自验 typecheck/test/build。

## Dev Notes

- 实测 DataFox 字段/形状见 addendum E2；适配器自写列式解析（无 IP 顾虑），派生复用 Apache `transformTraceData`（AD-8）。
- 渲染仍 props 驱动：`<TraceTimeline trace={fromDataFox(resp)} />`。
- status_code 实测为字符串（Ok/Error/…）→ 映射 OTLP 数值（Error=2 触发引擎 isErrorSpan）。

### References
- [Source: addendum E2 DataFox API 速查]、[Source: ARCHITECTURE-SPINE AD-8/AD-14]
- [Source: src/model/transform-trace-data.ts]、[Source: epics.md#Story 5.1]、[Source: prd FR-22]

## Dev Agent Record

### Agent Model Used
claude-opus-4-8[1m]（dev-story）

### Debug Log References
- typecheck 0 错误 · `npm test` **128 passed**（+8 fromDataFox）· build clean。

### Completion Notes List
- `fromDataFox` 自写列式解析 + 复用 transformTraceData 派生。覆盖：列式→行式、parent→CHILD_OF（孤儿父→root）、attrs_raw JSON→tags/process、events→logs、ms/ns→µs、status/exception→错误语义、空/坏响应→null。
- fixture 3 span（root server / client 跨服务含 event / error span 含 exception）。8 单测全过。AC 全满足，未新增依赖。

### File List
新增：`src/model/adapters/{fromDataFox.ts,datafox-fixture.ts,fromdatafox.test.ts}`
修改：`src/model/index.ts`

### Change Log
- 2026-06-26：创建+实现 Story 5.1——fromDataFox 列式适配器（parent/孤儿父/attrs/events/单位归一化，复用 transform 派生）；128 单测。Status → review。
