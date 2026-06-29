---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 5.5: 详情底部抽屉（对齐 Datadog 交互模型）

Status: review

## 背景（修正）
3.1–3.4 把详情做成「点 span → 行内插入详情行」（Grafana/Jaeger 模型，可多开）。用户实测指出 Datadog 是**底部固定抽屉**：点 span 单选 → 下方固定抽屉显示该 span 详情。本故事把交互从「行内行」改为「底部抽屉 + 单选」。引擎/详情卡组件不变，仅改交互装配。

## Story

As a 排障用户,
I want 点击 span 在瀑布下方的固定抽屉里查看其详情（单选）,
so that 与 Datadog 一致的详情交互。

## Acceptance Criteria

1. 点 span → 单选该 span（行高亮）；瀑布**不再插入行内详情行**。
2. 瀑布下方固定抽屉显示选中 span 的完整详情卡（header/Tab/Pinned/HttpRequestBar/语义分组），抽屉内部滚动。
3. 再点选中 span / 抽屉 ✕ → 取消选中、关闭抽屉。
4. typecheck/test/build 通过。

## Tasks / Subtasks

- [x] Task 1：`useDetailState` 增 `ensureDetail(spanID)`（幂等创建 DetailState，供抽屉子分组折叠）。
- [x] Task 2：`useTraceTimelineState` 增 `selectedSpanId` + `selectSpan`（toggle 单选 + ensureDetail）；`detailToggle` 改为 selectSpan（行点击入口）；受控/非受控均暴露。
- [x] Task 3：引擎 `detailStates` 传**空 Map**（不再产行内详情行）；`rowRenderer` 工厂 + `DdSpanRow` 增 `selectedSpanId/isSelected` → 选中行高亮（主色左竖条+底色，优先级 selected>focused>matched）。
- [x] Task 4：api 在瀑布滚动容器下方渲染 `styles.drawer`（fixed `drawerHeight=340`，overflow auto）→ `DdSpanDetail`（选中 span + detailState + detailToggles + detailStubs + onClose=selectSpan）。
- [x] Task 5：单测改 state.test（selectSpan 单选 toggle / detailToggle 等价 / trace 变化清空）。
- [x] Task 6：自验 typecheck/test/build + Chrome DevTools 与 Datadog 并排。

## Dev Notes

- 引擎仍保留行内详情行能力（faithful Grafana，传非空 detailStates 即可用）；Datadog 皮肤传空 Map → 走抽屉。
- DdSpanDetail 组件零改动（3.4 重绘的卡直接进抽屉，自然高度 + 抽屉 overflow 滚动）。
- selectedSpanId/selectSpan 为视图态（受控/非受控一致，类似 search）。

### References
- [Source: investigations/datadog-span-detail-ux-investigation.md Finding 1（底部 dock）]
- [Source: epics.md#Epic 3/5]、[Source: prd FR-10]

## Dev Agent Record

### Agent Model Used
claude-opus-4-8[1m]（dev-story）

### Debug Log References
- typecheck 0 错误 · `npm test` **141 passed** · build ESM 163.4KB clean。
- Chrome DevTools 与 Datadog 并排：点 GET /user → 行高亮（主色左竖条）+ 瀑布下方固定抽屉（342px）显示详情卡（header chip+op+耗时+🔗/share/✕ + Tab + HttpRequestBar `GET http://localhost:9001/user 200` + Pinned + HTTP Requests 4 + URL Details）；**行内详情行 0**；再点/✕ 关闭。结构 1:1 对齐 Datadog 底部抽屉。

### Completion Notes List
- **交互模型修正**：行内详情行 → 底部固定抽屉 + 单选（对齐 Datadog）。`detailStates` 传空使引擎不产行内行；`selectedSpanId` 驱动抽屉 + 选中高亮。
- `ensureDetail` 幂等保证抽屉子分组折叠状态持久。DdSpanDetail/3.4 重绘卡零改动直接进抽屉。`detailStubs`（share/links/flamegraph）在抽屉头/底正常工作。AC 全满足，未新增依赖。

### File List
修改：`src/state/{useDetailState.ts,useTraceTimelineState.ts,state.test.tsx}`、`src/presentation/{rowRenderer.tsx,DdSpanRow.tsx}`、`src/api/TraceTimeline.tsx`

### Change Log
- 2026-06-27：创建+实现 Story 5.5——详情交互从行内行改为 Datadog 底部固定抽屉 + 单选（selectedSpanId/selectSpan，引擎 detailStates 置空，选中行高亮，DdSpanDetail 进抽屉）；141 单测；浏览器与 Datadog 并排 1:1 验证。Status → review。
