---
baseline_commit: n/a（trace-timeline 非 git 仓库）
---

# Story 8.3: 二号适配器（OTLP/JSON）验证契约

Status: done

> 规格：[ARCHITECTURE-SPINE AD-15]。OTLP/JSON = OpenTelemetry proto→JSON 形状。

## Story

As a 排障用户,
I want 一个 OpenTelemetry OTLP/JSON 适配器,
so that 我能直接渲染 OTel 导出的 trace，并证明契约对异构后端成立。

## Acceptance Criteria

1. `src/model/adapters/fromOtlp.ts`：`decodeOtlp(resp): TraceResponse|null` + `fromOtlp` + `otlpAdapter`。
2. 遍历 `resourceSpans→scopeSpans→spans`（兼容旧 `instrumentationLibrarySpans`）；`resource.service.name` 建 process。
3. AnyValue 解包（stringValue/intValue/boolValue/doubleValue/arrayValue）；ns→µs（start/duration/event）；parentSpanId→references（孤儿父按 root）。
4. status code（数值 0/1/2 或字符串 STATUS_CODE_*）→ statusCode；ERROR→2 + `error` tag；kind 数值（0-5）/字符串→文本（server/client…）；events→logs。
5. 经同一 `adaptTrace` 产出派生 Trace（depth/services），与 DataFox 路径一致。
6. 空/非法→null；单测覆盖各分支。

## Tasks / Subtasks

- [x] `src/model/adapters/fromOtlp.ts`（decode/from/adapter + AnyValue/status/kind/ns 辅助）。
- [x] `src/model/adapters/otlp-fixture.ts`（2 service、parent→child、error span、event；ns 时间）。
- [x] 子路径 `src/adapters/otlp/index.ts` 导出。
- [x] 单测 `src/model/adapters/fromotlp.test.ts`（结构/ns→µs/references/孤儿父/status/kind/AnyValue/events/空态/fromOtlp 派生/adapter 契约）。

## Dev Notes

- **契约有效性证明**：OTLP 是嵌套树 + AnyValue 包裹 + ns 时间，与 DataFox 列式 DataFrame 完全异构，却经同一 `adaptTrace` 渲染——验证 AD-15 契约对异构后端成立。
- ns→µs = ÷1000（`1_000_000ns=1000µs`）；fixture 初版把 1e9ns 误标 1ms（实为 1s），测试抓出后校正。

## Dev Agent Record
### Agent Model Used
claude-opus-4-8[1m]（dev-story）
### Debug Log References
- 219 测试全绿（其中 fromotlp 9 例 + adapter 契约 6 例）；浏览器实测 OTLP 源经 demo 切换渲染（frontend GET /checkout 200 + payment Charge error + Errors 1 + ns→µs 时间轴 root 50µs/child 30µs）。
### File List
- 新增 `src/model/adapters/fromOtlp.ts`、`src/model/adapters/otlp-fixture.ts`、`src/model/adapters/fromotlp.test.ts`、`src/adapters/otlp/index.ts`
### Change Log
- 2026-06-29：实现 8.3（OTLP/JSON 适配器 + 契约验证）。Status → review。
- 2026-06-29：Epic 8 code-review（3 agent 对抗式）。本 story 集中承接全部 6 个 patch（CR-F1 BigInt ns 精度 / F2 exception event 派生 / F3 多 traceId 过滤 / F4 kvlist / F5 字符串 status / F6 int64）+ 回归测试。详见 [8-code-review.md]。225 测试绿。Status → done。
