---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 4.2: 错误标识与 HTTP 状态 pill

Status: review

## Story

As a 排障用户,
I want 错误 span 显示 ⚠、行内显示 HTTP 状态 pill、工具条有 Errors 计数开关,
so that 一眼识别错误与状态。

## Acceptance Criteria

1. 错误 span/错误路径显示 ⚠；折叠父 span 时子树含错也提示（FR-15）。
2. 行内 HTTP 状态 pill 圆角 4px、按状态码配色（2xx 绿/3xx 蓝/4xx 橙/5xx 红）（FR-26）。
3. 工具条 `Errors N` 计数开关可只看错误（复用搜索过滤）。
4. typecheck/test/build 通过。

## Tasks / Subtasks

- [x] Task 1：错误 ⚠ + 状态 pill —— **Story 1.6 已实现**（DdLabelCell：`showError = isError || descendantHasError` → ⚠；`httpStatus + httpStatusToken` → pill 圆角 4px 按 2xx/3xx/4xx/5xx 配色）。本故事确认无回归。
- [x] Task 2：`useSearch` 增 `errorsOnly`/`setErrorsOnly`/`errorCount`（用 core `isErrorSpan` 统计错误集；matches 与查询取交集，errorsOnly 隐含过滤）。
- [x] Task 3：`DdSearchBar` 增 `Errors N` 红描边开关（errorCount>0 才显示，⚠ 图标 + 计数，active 高亮）；api `showSpanFilterMatchesOnly = showMatchesOnly || errorsOnly`。
- [x] Task 4：单测（state.test errorsOnly + errorCount + 交集）。
- [x] Task 5：自验 typecheck/test/build + Chrome DevTools。

## Dev Notes

- 引擎 `RenderableRow.isError/descendantHasError/httpStatus`（Story 1.5）+ 皮肤 ⚠/pill（Story 1.6）已覆盖 FR-15/FR-26 主体；本故事补 Errors 计数开关（FR-15 工具条部分）。
- `isErrorSpan`（core/utils：otel status / error bool / error 字符串）。errorsOnly 复用搜索过滤管线（findMatchesIDs + showSpanFilterMatchesOnly）。

### References
- [Source: src/presentation/DdLabelCell.tsx（1.6 ⚠/pill）]、[Source: core/utils isErrorSpan]
- [Source: epics.md#Story 4.2]、[Source: prd FR-15/FR-26]

## Dev Agent Record

### Agent Model Used
claude-opus-4-8[1m]（dev-story）

### Debug Log References
- typecheck 0 错误 · `npm test` **110 passed** · build clean。
- Chrome DevTools：工具条 `Errors 2` 红描边按钮 → 点击仅渲染 2 个错误 span（GET /error、response.render error）。⚠/pill（1.6）保持。

### Completion Notes List
- 错误 ⚠ + 状态 pill 复用 Story 1.6（无回归）。新增 `Errors N` 开关：`useSearch.errorsOnly`（isErrorSpan 统计 + 与查询交集 + 隐含过滤），`DdSearchBar` 红描边按钮。AC 全满足，未新增依赖。

### File List
修改：`src/state/{useSearch.ts,state.test.tsx}`、`src/presentation/DdSearchBar.tsx`、`src/api/TraceTimeline.tsx`

### Change Log
- 2026-06-26：创建+实现 Story 4.2——Errors N 计数开关（只看错误，复用搜索过滤）；⚠/状态 pill 复用 1.6；110 单测；浏览器 Errors 2 验证。Status → review。
