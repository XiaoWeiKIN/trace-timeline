---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 3.2: 详情卡与子分组独立折叠

Status: review

## Story

As a 排障用户,
I want 详情行渲染完整的 SpanDetail 卡，且 tags/process/logs/references 等子分组各自独立折叠,
so that 按需查看 span 的不同维度信息而互不干扰。

## Acceptance Criteria

1. **Given** 详情行展开 **When** 渲染 **Then** 显示 SpanDetail 卡：Span attributes(tags)/Resource attributes(process) 以键值表渲染，Logs/References/Warnings/Stack Traces 以可折叠分组渲染（仅在有数据时显示）（FR-10/FR-11）。
2. **And** 点击某子分组头部，该分组独立展开/折叠（chevron 旋转 0↔90°），不影响其他分组（FR-11）。
3. **And** 高保真对齐 Datadog 实测令牌（NotoSans 13px / section header 高 34.5px,cursor:pointer,border-top / chevron 16px / KV 标签列 ≈156px / label 色 0.68 / link 蓝 / 行高 18.2px）（见调研案例文件）。
4. **And** `npm run typecheck` / `npm test` / `npm run build` 全过；DdAccordian + DdKeyValuesTable 带单测。

## Tasks / Subtasks

- [x] Task 1：状态容器暴露子分组 toggles（AC: #2）`useTraceTimelineState` 增 `detailToggles`（tags/process/logs/references/warnings/stackTraces + logItem/referenceItem），非受控接 useDetailState，全量受控 warn-once。
- [x] Task 2：rowRenderer 工厂透传（AC: #2）`createDatadogRowRenderer` opts 增可选 `detailToggles`，闭包传给 DdSpanRow → DdSpanDetail。
- [x] Task 3：DdAccordian（AC: #2,#3）`src/presentation/DdAccordian.tsx` — 可折叠分组：header(34.5px,cursor:pointer,border-top,chevron 16px rotate)+label+count，open→children。
- [x] Task 4：DdKeyValuesTable（AC: #1,#3）`src/presentation/DdKeyValuesTable.tsx` — 两列键值表（标签列 156px / label 0.68 / 值主色 / 行高 18.2px）。值暂纯文本，JSON 着色留 3.3。
- [x] Task 5：DdSpanDetail（AC: #1,#2）`src/presentation/DdSpanDetail.tsx` — 卡容器：Span attributes(tags KV)/Resource attributes(process KV)/Logs/References/Warnings/Stack Traces 各 DdAccordian，按 detailState.isXxxOpen + detailToggles 驱动；仅有数据才渲染各分组。
- [x] Task 6：接 DdSpanRow（AC: #1）详情行渲染 `<DdSpanDetail row detailState detailToggles/>`（替换 3.1 最小详情体）；高度仍由 core 决定，详情体可滚动。
- [x] Task 7：单测（AC: #4）`accordian.test.tsx`（点 header 触发 onToggle、open 渲染 children、chevron 态）、`keyvalues.test.tsx`（标签/值渲染、空数据）。
- [x] Task 8：自验 typecheck/test/build + Chrome DevTools（点 span → 卡渲染各分组、独立折叠、对齐 Datadog 令牌）。

## Dev Notes

### 调研依据（高保真）
- 实测令牌 + §5 实现映射见 `investigations/datadog-span-detail-ux-investigation.md`。关键：NotoSans 13px / 行高 18.2px / 文本主色 rgba(28,43,52,0.98)、label rgba(28,43,52,0.68)、chevron 0.66 / link rgb(0,107,194) / section-border-top rgb(226,229,237) / header 34.5px cursor:pointer / chevron 16px rotate(0=收,90deg=展) / KV 标签列 ≈156px / 状态 pill 绿。
- 配色走 theme（AD-6/7）：新增令牌进 `theme.trace`（detailBorder/detailLabel/detailLink/sectionHeaderHeight），勿散落硬编码。

### 引擎/状态已就位
- `DetailState`（3.1）已含 isTagsOpen/isProcessOpen/logs.isOpen/references.isOpen/isWarningsOpen/isStackTracesOpen + 子项 Set。
- `useDetailState`（3.1）已暴露全部子分组 toggles + logItem/referenceItem toggles，本故事接 UI。
- `RenderableRow.detailState`（=detailStates.get(spanID)，DetailState 实例）已下发；子分组 toggles 经 rowRenderer 工厂闭包注入（trace 级回调，不进 AD-2 逐行契约）。

### 移植来源（结构忠实 + Datadog RESTYLE）
- AccordianKeyValues：header(arrow+label+count)+open→KeyValuesTable 结构；onToggle/isOpen 模型。
- KeyValuesTable：两列键值。SpanDetail/index：分组顺序 = Span attributes → Resource attributes → Logs → References → Warnings → Stack Traces，各仅在有数据时渲染。

### 范围
- 值的 JSON 着色 + DOMPurify → **3.3**（本故事值为纯文本）。
- Logs/References 子项的二级展开（logItem/referenceItem）：本故事渲染分组级折叠；子项二级展开接 toggles 但 UI 最小（完整子项视觉可并入 3.3 或后续）。
- 火焰图/profiles/share 等深耦合 → stub/不做。

### References
- [Source: investigations/datadog-span-detail-ux-investigation.md §5 + 令牌速查]
- [Source: SpanDetail/index.tsx 分组顺序]、[Source: AccordianKeyValues.tsx]、[Source: KeyValuesTable.tsx]
- [Source: src/state/useDetailState.ts]、[Source: src/state/DetailState.ts]
- [Source: epics.md#Story 3.2]、[Source: prd FR-10/FR-11]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]（dev-story）

### Debug Log References

- typecheck 0 错误 · `npm test` **87 passed**（+8：4 DdAccordian + 4 DdKeyValuesTable）· build ESM 115.52 KB clean。
- Chrome DevTools：点 span → DdSpanDetail 卡渲染；2 个 accordion（Span attributes 3 / Resource attributes 1）header 高 **34px**（对齐 Datadog 34.5px）；独立折叠实测——展开#0 then #1 → 2 KV 表，折叠#0 → #1 仍开（aria1=true）互不影响。KV 令牌**精确对齐**：key 列宽 **156px** / label 色 **rgba(28,43,52,0.68)** / 13px（与调研实测逐项一致）。

### Completion Notes List

- **高保真对齐 Datadog**（依据 `investigations/datadog-span-detail-ux-investigation.md` §5 + 令牌速查）：theme.trace 新增 detail 令牌（border/label/chevron/link/sectionHeaderHeight=34/keyColumnWidth=156），皮肤引用不硬编码（AD-7）。实测 KV key 列 156px、label 0.68、13px 与 Datadog 完全一致。
- **3 个皮肤组件**：`DdAccordian`（header 34px/cursor:pointer/border-top 分隔/chevron 16px rotate(0↔90°)/role=switch+键盘可达）、`DdKeyValuesTable`（两列 156px+自适应/URL→蓝链接/对象→JSON 文本）、`DdSpanDetail`（分组顺序忠实 Jaeger：Span attributes→Resource attributes→Logs→References→Warnings→Stack traces，仅有数据才渲染）。
- **状态接线**：useTraceTimelineState 暴露 `detailToggles`（非受控接 useDetailState 8 个 toggle；全量受控 warn-once）；经 `createDatadogRowRenderer` opts 闭包注入 DdSpanRow→DdSpanDetail（trace 级回调，不进 AD-2 逐行契约）。`row.detailState`(DetailState 实例)驱动各 accordion isOpen。
- **Logs 子分组**：分组级 + 每条 log 二级 accordian（接 logItem toggle），子项展开渲染该 log fields 的 KV 表。
- 范围守纪：值的 JSON 着色 + DOMPurify 净化 → **3.3**（当前值纯文本/URL 链接）。AC #1~4 全满足，未新增依赖。

### File List

新增：`src/presentation/{DdAccordian.tsx,DdKeyValuesTable.tsx,DdSpanDetail.tsx,accordian.test.tsx,keyvalues.test.tsx}`
修改：`src/theme/{types.ts,tokens/trace.ts}`（detail 令牌）、`src/state/{useTraceTimelineState.ts,index.ts}`（detailToggles）、`src/presentation/{rowRenderer.tsx,DdSpanRow.tsx,index.ts}`、`src/api/TraceTimeline.tsx`

### Change Log

- 2026-06-26：创建 + 实现 Story 3.2——DdSpanDetail 卡 + DdAccordian + DdKeyValuesTable，tags/process/logs/references/warnings/stackTraces 各独立折叠；接 useDetailState 子分组 toggles；高保真对齐 Datadog 实测令牌（156px key 列 / 0.68 label / 34px header / chevron 旋转）；87 单测；浏览器独立折叠 + 令牌对齐验证。Status → review。
