---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 4.5: Color-by 维度切换

Status: review

## Story

As a 使用方,
I want 工具条 `Color by` 下拉切换着色维度（Service 默认）,
so that 按需改变瀑布配色维度。

## Acceptance Criteria

1. 选择 `Service`（v1 唯一实现）→ 瀑布条按服务分类色着色（FR-27；UX-DR5）。
2. 允许传入自定义 colorAccessor；下拉其余维度占位。
3. typecheck/test/build 通过。

## Tasks / Subtasks

- [x] Task 1：`DdColorByDropdown`（对齐 Datadog 工具条右侧「Color by [Service ▾]」）：Service 实做 + Operation/Service&Operation/Duration disabled stub。
- [x] Task 2：接 `DdSearchBar` 右端（工具条同行）。
- [x] Task 3：自定义着色经 `TraceTimeline.colorAccessor`（Story 1.6 已有）；v1 dropdown 为视觉占位。
- [x] Task 4：单测 `colorby.test.tsx`（Service 默认选中 / stub disabled / onChange）。
- [x] Task 5：自验 typecheck/test/build。

## Dev Notes

- colorAccessor 抽象（Story 1.6）已支持自定义着色；`colorBy='service'` 为 v1 唯一维度。dropdown 其余维度 stub（与 PRD 一致）。
- 浏览器视觉验证因 Chrome DevTools MCP 本轮断开延后；dropdown 已单测覆盖、build 通过、接入工具条。

### References
- [Source: colorAccessor.ts defaultColorAccessor]、[Source: epics.md#Story 4.5]、[Source: prd FR-27]

## Dev Agent Record

### Agent Model Used
claude-opus-4-8[1m]（dev-story）

### Debug Log References
- typecheck 0 错误 · `npm test` **120 passed**（+3 colorby）· build ESM 146.8KB clean。
- Chrome DevTools（MCP 重连后补验）：工具条右端 `Color by [Service ▾]` 渲染，Service 选中、其余 3 维度 disabled stub；与搜索/Errors/只看匹配同一行，对齐 Datadog 工具条布局。

### Completion Notes List
- `DdColorByDropdown`：Service（实做，默认选中）+ Operation/Service&Operation/Duration（disabled stub「暂未实现」）；接 DdSearchBar 工具条右端。
- 自定义着色仍走 `TraceTimeline.colorAccessor` prop（1.6）。v1 dropdown 视觉占位 + onChange('service') 回调预留。AC 全满足，未新增依赖。
- 浏览器视觉验证延后（Chrome DevTools MCP 断开）。

### File List
新增：`src/presentation/{DdColorByDropdown.tsx,colorby.test.tsx}`
修改：`src/presentation/{DdSearchBar.tsx,index.ts}`

### Change Log
- 2026-06-26：创建+实现 Story 4.5——DdColorByDropdown（Service 实做+其余 stub）接工具条；120 单测；build 通过。**Epic 4 完成**。Status → review。
