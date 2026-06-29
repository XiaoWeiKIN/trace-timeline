---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 4.1: 搜索与只看匹配

Status: review

## Story

As a 排障用户,
I want 输入查询匹配 span 并高亮命中、可只看匹配,
so that 在大 trace 里快速定位。

## Acceptance Criteria

1. 输入查询（服务名/操作名/tags 等）命中 span 行高亮、可在命中间定位（FR-13）。
2. 开「只看匹配」后仅渲染命中；无命中显示明确提示（FR-14；AR-12）。
3. `npm run typecheck`/`npm test`/`npm run build` 通过；filterSpans + useSearch 带单测。

## Tasks / Subtasks

- [x] Task 1：`src/state/filterSpans.ts` — 本地文本查询（剥 Redux），跨 operationName/serviceName/tags/logs/spanID 子串匹配 → Set<spanID>|undefined。
- [x] Task 2：`src/state/useSearch.ts` — 本地搜索态：query/matches/matchCount/showMatchesOnly/命中导航(focusedMatchId/Index, next/prev)。
- [x] Task 3：接状态容器 `useTraceTimelineState.search`（受控/非受控一致，视图态）；api 把 `search.matches→findMatchesIDs`、`showMatchesOnly→showSpanFilterMatchesOnly`、`focusedMatchId→focusedSpanIdForSearch` 喂引擎。
- [x] Task 4：`DdSearchBar`（对齐 Datadog「Filter spans by any attribute」）：🔍 输入 + 命中计数 + 上/下导航 + 只看匹配开关。行命中琥珀高亮（DdSpanRow.matched），focus 命中走蓝 focus。
- [x] Task 5：单测 `filterspans.test.ts`（服务/操作/tag/大小写/空查询/无命中）+ state.test 扩 search（命中/导航/只看匹配/改查询重置游标）。
- [x] Task 6：自验 typecheck/test/build + Chrome DevTools。

## Dev Notes

- 引擎 search 三件套（findMatchesIDs/showSpanFilterMatchesOnly/isMatchingFilter + focusedSpanIdForSearch→isFocused→scrollToSpan）Story 1.5 已就位；本故事补本地 search 状态 + UI + 接线。
- filterSpans 简化自 grafana getQueryMatches 文本路径；去掉 adhoc/tag/duration/regex（依赖 @grafana SelectableValue/TraceSearchProps，超出 v1）。
- search 为**视图态**（非 ControlledTraceState 文档态），受控/非受控均本地。
- 命中导航复用引擎 scrollToSpan（focusedSpanIdForSearch 变化即滚 + 高亮）。

### References
- [Source: useSearch.ts（剥 Redux）]、[Source: filter-spans.tsx getQueryMatches]
- [Source: VirtualizedTraceView findMatchesIDs/isMatchingFilter/focusedSpanIdForSearch]
- [Source: epics.md#Story 4.1]、[Source: prd FR-13/FR-14]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]（dev-story）

### Debug Log References

- typecheck 0 错误 · `npm test` **109 passed**（+10：filterSpans 6 + state search + 既有）· build ESM 134KB clean。
- Chrome DevTools：查 "mall-order-api" → 计数 `1/5`、4 行琥珀高亮 + 1 行 focus 蓝；点下一个 → `2/5`（scrollToSpan 联动）；勾「只看匹配」→ 仅 5 行命中渲染；查无命中词 → "无匹配"。

### Completion Notes List

- 本地 `filterSpans`（文本子串，跨 operationName/serviceName/tags/process.tags/logs.fields/spanID，多词 OR，大小写不敏感，spanID 整词）。
- `useSearch`：matches Set + orderedMatches(trace 序) 供导航；改 query 重置游标到首个；focusedMatchId 驱动引擎滚动 + focus 高亮。
- `DdSearchBar` 对齐 Datadog：🔍 占位 "Filter spans by any attribute" + `idx/total` 计数 + ↑↓ 导航 + 只看匹配 checkbox。命中行琥珀（区别 focus 蓝）。
- 接 `useTraceTimelineState.search`（视图态，受控/非受控一致）；engine props 全接。Icon 增 `search`(lucide Search)。AC 全满足，未新增依赖。

### File List

新增：`src/state/{filterSpans.ts,useSearch.ts,filterspans.test.ts}`、`src/presentation/DdSearchBar.tsx`
修改：`src/state/{useTraceTimelineState.ts,index.ts,state.test.tsx}`、`src/presentation/{DdSpanRow.tsx,index.ts}`、`src/api/TraceTimeline.tsx`、`src/ui/Icon.tsx`

### Change Log

- 2026-06-26：创建+实现 Story 4.1——本地 filterSpans+useSearch+DdSearchBar(对齐 Datadog)，命中琥珀高亮+导航(1/5↔2/5)+只看匹配+空态；109 单测；浏览器验证。Status → review。
