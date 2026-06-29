---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 5.2: fetchTrace 取数助手

Status: review

## Story

As a 使用方,
I want 可选 `fetchTrace(traceId, {from,to,baseUrl,fetch?})` 助手,
so that 不必自写 HTTP 即可从 DataFox 拉单条 trace。

## Acceptance Criteria

1. POST `{baseUrl}/api/v3/spans/search`，body `filter.query="trace_id:<id>"`，响应经 fromDataFox 返回 Trace（FR-29；AD-14）。
2. `fetch` 可注入（默认全局 fetch）、baseUrl 必填；`<TraceTimeline>` 仍 props 驱动不内置请求。
3. 测试用 mock fixture，不依赖真实网络。
4. typecheck/test/build 通过。

## Tasks / Subtasks

- [x] Task 1：`src/data/datafox/client.ts` — `fetchTrace(traceId, opts)`：POST search 端点，body `{filter:{query:"trace_id:<id>"}, from, to, limit}`，res→fromDataFox。
- [x] Task 2：`FetchLike` 注入类型（默认 globalThis.fetch）；baseUrl 尾斜杠归一化；headers 合并；必填校验；非 2xx 抛错。
- [x] Task 3：导出 `data/datafox/index.ts` + 根 `src/index.ts`。
- [x] Task 4：单测 `client.test.ts`（端点/body/headers/必填/非 2xx，注入 mock fetch + dataFoxFixture）。
- [x] Task 5：自验 typecheck/test/build。

## Dev Notes

- 库本身仍 props 驱动；fetchTrace 为**可选**助手（AD-14）。`<TraceTimeline trace={await fetchTrace(id, {baseUrl})} />`。
- 端点/body 实测见 addendum E2。fetch 注入便于测试/SSR/自定义鉴权。

### References
- [Source: addendum E2]、[Source: ARCHITECTURE-SPINE AD-14]、[Source: epics.md#Story 5.2]、[Source: prd FR-29]

## Dev Agent Record

### Agent Model Used
claude-opus-4-8[1m]（dev-story）

### Debug Log References
- typecheck 0 错误 · `npm test` **133 passed**（+5 fetchTrace）· build clean。

### Completion Notes List
- `fetchTrace`：POST search 端点 + `trace_id:<id>` 查询 → fromDataFox。fetch 可注入（默认全局）、baseUrl 必填+尾斜杠归一化、headers 合并、必填校验、非 2xx 抛错。5 单测（mock fetch，无网络）。AC 全满足，未新增依赖。

### File List
新增：`src/data/datafox/client.ts`、`src/data/datafox/client.test.ts`
修改：`src/data/datafox/index.ts`、`src/index.ts`

### Change Log
- 2026-06-26：创建+实现 Story 5.2——fetchTrace 助手（DataFox search 端点 → fromDataFox，fetch 可注入）；133 单测。Status → review。
