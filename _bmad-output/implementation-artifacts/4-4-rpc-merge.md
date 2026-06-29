---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 4.4: RPC 合并与外部服务推断

Status: review

## Story

As a 排障用户,
I want 折叠 client span 时显示其 server 子 span 对端信息、叶子 client+peer.service 标注外部服务,
so that 折叠态下仍看清跨服务调用。

## Acceptance Criteria

1. 折叠含 server 子的 client span 时，presentation 用 colorAccessor 对 rpc.process 着色并显示对端服务名/操作名（FR-17；AD-6）。
2. 满足条件的叶子 client span 标注 peer service 名与配色。
3. typecheck/test/build 通过。

## Tasks / Subtasks

- [x] Task 1：`colorForService(name, theme)`（按服务名取分类色，AD-6）。
- [x] Task 2：`DdLabelCell` 渲染 `row.rpc`（→ 箭头 + 服务色点 + 对端 serviceName/operationName）+ `row.noInstrumentedServer`（→ 外部服务名+色点）；rpc 优先。
- [x] Task 3：mock s3（redis 叶子 client）加 `peer.service: redis-cache` 演示外部服务推断。
- [x] Task 4：单测 `rpc.test.tsx`（rpc 渲染 / peer 渲染 / rpc 优先）。
- [x] Task 5：自验 typecheck/test/build + Chrome DevTools。

## Dev Notes

- 引擎（Story 1.5）已产 `row.rpc`（折叠 client + findServerChildSpan → 对端 serviceName/operationName/process，无颜色 AD-6）+ `row.noInstrumentedServer`（叶子 client + peer.service → serviceName）。本故事补 presentation 渲染 + 着色。
- 着色在 presentation（AD-6）：`colorForService` = getColorByKey(serviceName, theme)。
- RPC 合并 browser demo 需 client→server 对（当前 mock 无该结构，span 数锁 9）；故 rpc 分支以单测覆盖，peer 分支以 mock s3 浏览器演示。

### References
- [Source: VirtualizedTraceView rpc/noInstrumentedServer]、[Source: core/utils findServerChildSpan/PEER_SERVICE]
- [Source: epics.md#Story 4.4]、[Source: prd FR-17]

## Dev Agent Record

### Agent Model Used
claude-opus-4-8[1m]（dev-story）

### Debug Log References
- typecheck 0 错误 · `npm test` **117 passed**（+3 rpc）· build clean。
- Chrome DevTools：s3（redis 叶子 client + peer.service）→ peer-service 标注 "redis-cache"（色点）。rpc-merge 分支单测覆盖（对端服务/操作 + rpc 优先于 peer）。

### Completion Notes List
- `colorForService` 按服务名取分类色（AD-6）。`DdLabelCell`：`row.rpc` → 箭头+服务色点+对端服务/操作；`row.noInstrumentedServer` → 外部服务名+色点；rpc 优先。
- mock s3 加 peer.service 演示外部服务推断。rpc 分支 3 单测（渲染/peer/优先级）。AC 全满足，未新增依赖。

### File List
新增：`src/presentation/rpc.test.tsx`
修改：`src/presentation/{colorAccessor.ts,DdLabelCell.tsx}`、`src/model/mock-trace.ts`

### Change Log
- 2026-06-26：创建+实现 Story 4.4——DdLabelCell 渲染 RPC 合并对端 + 未插桩外部服务（服务色着色，AD-6）；117 单测；浏览器 peer-service 验证。Status → review。
