---
baseline_commit: n/a（trace-timeline 非 git 仓库）
---

# Story 8.4: 文档 + 多源 demo

Status: done

> Epic 8 收官项。规格：[ARCHITECTURE-SPINE AD-15]。

## Story

As a 适配器作者,
I want 一份"如何写后端适配器"文档 + demo 里切换两个数据源,
so that 我能照着实现自己的后端、并直观看到多源经同一组件渲染。

## Acceptance Criteria

1. `docs/writing-a-trace-source-adapter.md`：契约 / `adaptTrace` / `TraceResponse` 形状 / 打包约定 / 两参考实现对照。
2. demo 加"数据源"切换按钮：主 `<TraceTimeline>` 在 mock ⇄ OTLP（经 `adaptTrace(otlpAdapter, otlpFixture)`）间切换。
3. 浏览器实测 OTLP 源渲染正确（frontend GET /checkout + payment Charge error span + Errors 计数 + ns→µs 时间轴）。
4. typecheck（含 demo）通过。

## Tasks / Subtasks

- [x] `docs/writing-a-trace-source-adapter.md`。
- [x] `demo/main.tsx`：`source` 态 + `adaptTrace(otlpAdapter, otlpFixture)` + 切换按钮 + `activeTrace`。
- [x] Chrome DevTools 实测切换。

## Dev Notes

- demo 直引 `../src` 与 `../src/adapters/otlp`（源码态，验证子路径 barrel 可用）。
- demo 是**仅本地**验证物，不进 `dist`/`files`，不影响发布表面。

## Dev Agent Record
### Agent Model Used
claude-opus-4-8[1m]（dev-story）
### Debug Log References
- 浏览器 localhost:5173 实测：切到 OTLP → 瀑布显 `frontend GET /checkout`(200, root, 50µs) + `payment Charge`(error ⚠, 30µs, 子) + `Errors 1` + 时间轴 0–50µs，Color by Service 生效。
### File List
- 新增 `docs/writing-a-trace-source-adapter.md`；改 `demo/main.tsx`
### Change Log
- 2026-06-29：实现 8.4（适配器文档 + 多源 demo）。**Epic 8 全部 4 story 完成。** Status → review。
- 2026-06-29：Epic 8 code-review 通过（3 agent 对抗式，Acceptance Auditor 判通过）。0 High + 6 patch 全修 + 回归、3 dismiss。225 测试绿，build 主 185.81KB（后端中立）。详见 [8-code-review.md]。Status → done。
