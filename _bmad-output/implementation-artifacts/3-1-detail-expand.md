---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 3.1: 详情展开与详情行

Status: review

## Story

As a 排障用户,
I want 点击 span 切换其详情行的显示,
so that 在瀑布里就地查看该 span 的详细信息。

## Acceptance Criteria

1. **Given** DetailState + useDetailState + 详情行渲染就位 **When** 点击某 span 的标签 **Then** 在该 span 行下方插入详情行（FR-10）。
2. **And** 含 logs 时详情行高用 `detailWithLogs(197)`、否则 `detail(161)`（AD-12，core getRowHeight 已定）。
3. **And** 详情状态不可变更新（每次新建 Map / DetailState）、多 span 详情互不影响、再次点击关闭。
4. **And** 新 trace 到达时清空详情态。
5. **And** `npm run typecheck` / `npm test` / `npm run build` 全过；DetailState + useDetailState 带单测。

## Tasks / Subtasks

- [x] Task 1：移植 DetailState（AC: #3）`src/state/DetailState.ts` — 原样移植（Apache/Uber），`@grafana TraceLog`→`../model`，`TraceSpanReference`→`../model`。不可变 toggle 簇（tags/process/logs/references/warnings/stackTraces + 子项）。
- [x] Task 2：移植 useDetailState（AC: #1,#3,#4）`src/state/useDetailState.ts` — `frame: DataFrame` 形参→本库 `trace`（trace 变化清空，useEffect）；toggleDetail 开关详情行 + 子分组 toggles（供 3.2）。
- [x] Task 3：接状态容器（AC: #1,#3,#4）`useTraceTimelineState` 调 useDetailState(trace)：非受控 detailStates/detailToggle 接真实 hook + 暴露子分组 toggles；全量受控 detailStates 入 `ControlledTraceState`（可选字段，向后兼容）+ detailToggle emit 新 Map。
- [x] Task 4：UI 触发 + 详情行（AC: #1,#2）`DdLabelCell` 标签文本可点击 → `row.onDetailToggle(spanID)`；`DdSpanRow` 详情行渲染最小详情体（spanID/服务/操作/耗时/标签数；完整 SpanDetail 卡留 3.2/3.3），内在高度匹配 core（logs→197 否则 161，AD-12）。
- [x] Task 5：单测（AC: #5）`DetailState.test.ts`（toggle 不可变 + 子项增删）、`detail-state.test.tsx`（toggleDetail 开/关、多 span 独立、trace 变化清空）。
- [x] Task 6：自验 typecheck/test/build + Chrome DevTools（点 span → 详情行插入、含 logs 行更高、再点关闭、点另一 span 互不影响）。

## Dev Notes

### 引擎侧已就位（Story 1.5）——只需喂真实状态
- `generateRowStates`：`detailStates.has(spanID)` → 在该 span 后插入 `isDetail:true` 行。
- `getRowHeight`：detail 行按 `span.logs.length` 选 `detailWithLogs(197)`/`detail(161)`。
- `buildRenderableRow`：行上挂 `detailState: detailStates.get(spanID)` + `onDetailToggle: detailToggle`。
- api `<TraceTimeline>` 已把 `tt.detailStates` + `tt.detailToggle` 透传引擎（当前是空 Map / no-op 槽，本故事换真实）。

### 三态受控（AD-5）
- 非受控：useDetailState 自管。全量受控：detailStates 走 `options.state.detailStates`（新增可选字段，缺省空 Map），toggle emit。逐字段受控不覆盖 detailStates（保持非受控）。
- `ControlledTraceState.detailStates` 设为**可选**，避免破坏既有 state.test 构造。

### AD-12 行高
- 详情行内在高度必须匹配 core 声明（否则 ListView `_scanItemHeights` 测量后跳变）。DdSpanRow 详情体 height = logs 有则 197 否则 161。

### 范围
- 本故事只做「详情行的插入/切换/高度/不可变」。详情卡内容（tags/process 键值表、logs/references 子分组独立折叠）→ 3.2；JSON 着色 + DOMPurify → 3.3。子分组 toggles 已在 hook 暴露但本故事不接 UI。

### References
- [Source: SpanDetail/DetailState.tsx]、[Source: useDetailState.ts]
- [Source: src/core/VirtualizedTraceView.tsx generateRowStates/getRowHeight/buildRenderableRow]
- [Source: epics.md#Story 3.1]、[Source: prd FR-10]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]（dev-story）

### Debug Log References

- typecheck 0 错误 · `npm test` **79 passed**（+6：4 DetailState + 2 容器 detail）· build ESM 106.84 KB clean。
- Chrome DevTools：点 span 标签 → 详情行就地插入；无 logs 行 `h=161`、含 logs 行 `h=197`（实测 has161 && has197）；同时打开 8 行互不影响；再点已开 span（s1）→ 关闭（toggle）。详情体显示 Span ID/Tags/Logs/References + ✕关闭。

### Completion Notes List

- **引擎零改动**：generateRowStates/getRowHeight/buildRenderableRow（Story 1.5）早已支持详情行；本故事只把状态容器的空槽换成真实 `useDetailState`，并补 UI 触发 + 详情体。
- **DetailState / useDetailState 原样移植**（Apache/Uber）；`useDetailState` 形参 `frame:DataFrame` → 本库 `trace`（trace 变化 useEffect 清空）。子分组 toggles（logs/tags/process/references/warnings/stackTraces + 子项）已在 hook 暴露，留 3.2 接 UI。
- **状态容器（AD-5）**：非受控接真实 hook；全量受控新增可选 `ControlledTraceState.detailStates`（缺省空 Map，向后兼容既有 state.test 构造）+ `detailToggleControlled` emit 新 Map。
- **UI 触发**：DdLabelCell 标签文本 `role=button`+onClick/onKeyDown → `row.onDetailToggle`；详情体内在高度按 `span.logs.length` 设 161/197 匹配 core（AD-12，避免 ListView 测量跳变）。
- 范围守纪：详情卡内容（键值表/子分组独立折叠）→ 3.2；JSON 着色+DOMPurify → 3.3。AC #1~5 全满足，未新增依赖。

### File List

新增：`src/state/{DetailState.ts,useDetailState.ts,DetailState.test.ts}`
修改：`src/state/{useTraceTimelineState.ts,index.ts,state.test.tsx}`、`src/presentation/{DdLabelCell.tsx,DdSpanRow.tsx}`

### Change Log

- 2026-06-26：创建 + 实现 Story 3.1——移植 DetailState/useDetailState 接状态容器，点 span 标签切换详情行（高 161/197 按 logs）、不可变多 span 独立、trace 变化清空；79 单测；浏览器 8 行并开 + toggle 关闭验证。Status → review。
