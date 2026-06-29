---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 5.4: 深耦合功能 stub（火焰图/分享/链接）

Status: review

## Story

As a 集成方,
I want 火焰图/Profiles/span-links/分享按钮只渲染外壳并走可注入回调,
so that 我能把这些动作接到自己的系统而库不内置实现。

## Acceptance Criteria

1. 传入对应回调并点击 → 触发回调并携带 span 上下文（FR-18）。
2. 不传回调时按钮隐藏或 no-op、不报错；火焰图区域显示占位可由回调接管（FR-19）。
3. typecheck/test/build 通过。

## Tasks / Subtasks

- [x] Task 1：`detailStubs.tsx` — `DetailStubs` 接口（onShareSpan/onSpanLinks/renderFlameGraph）+ `DdShareButton`/`DdSpanLinks`（无回调→null）/`DdFlameGraph`（renderFlameGraph 接管，否则占位文案）。
- [x] Task 2：接线——`createDatadogRowRenderer` opts.detailStubs → `DdSpanRow` → `DdSpanDetail`：share/links 入 `DdSpanDetailHeader` actions 槽；flamegraph 入详情卡底部（detailStubs 提供时）。
- [x] Task 3：`<TraceTimeline detailStubs={...}>` prop；demo 接入（share/links console + flamegraph 占位）。
- [x] Task 4：单测 `detailstubs.test.tsx`（share/links 回调携 span / 无回调隐藏 / flamegraph 占位↔接管）。
- [x] Task 5：自验 typecheck/test/build + Chrome DevTools。

## Dev Notes

- AD-11：火焰图/profiles 因缺外部依赖（@grafana/flamegraph、pyroscope，DataFox 无）只做外壳 + 回调，宿主接管。
- 不传 detailStubs → 详情卡无 share/links 按钮、无火焰图区（保持干净默认）。传则按钮按各自回调是否存在显隐。

### References
- [Source: prd FR-18/FR-19]、[Source: ARCHITECTURE-SPINE AD-11]、[Source: epics.md#Story 5.4]

## Dev Agent Record

### Agent Model Used
claude-opus-4-8[1m]（dev-story）

### Debug Log References
- typecheck 0 错误 · `npm test` **141 passed**（+5 detailStubs）· build ESM 161.3KB clean。
- Chrome DevTools：demo 传 detailStubs → 详情头出现分享/链接按钮，详情卡底部火焰图占位「火焰图（注入 renderFlameGraph 接管）」；点按钮 console.log 携 spanID。

### Completion Notes List
- `DetailStubs` 注入回调（onShareSpan/onSpanLinks/renderFlameGraph）经 rowRenderer 工厂闭包 → DdSpanRow → DdSpanDetail。
- DdShareButton/DdSpanLinks 无回调返回 null（隐藏）；DdFlameGraph renderFlameGraph 接管否则占位（FR-19）。share/links 入详情头 actions 槽，flamegraph 入卡底。
- `<TraceTimeline detailStubs>` prop；不传则详情卡干净无这些元素。5 单测。AC 全满足，未新增依赖。

### File List
新增：`src/presentation/{detailStubs.tsx,detailstubs.test.tsx}`
修改：`src/presentation/{rowRenderer.tsx,DdSpanRow.tsx,DdSpanDetail.tsx,DdSpanDetailHeader.tsx,index.ts}`、`src/api/TraceTimeline.tsx`、`demo/main.tsx`

### Change Log
- 2026-06-26：创建+实现 Story 5.4——深耦合 stub（火焰图/分享/链接外壳+注入回调，FR-18/19）；141 单测；浏览器验证。**Epic 5 完成 → 整个复刻目标达成**。Status → review。
