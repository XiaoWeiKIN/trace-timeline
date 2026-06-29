---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 1.6: 基础皮肤（瀑布条 + 标签列 + 缩进竖线 + 刻度表头）

Status: review

## Story

As a 使用方,
I want 一套注入式 Datadog 行渲染器（仅顶圆角瀑布条、左标签列、服务色缩进竖线、时间刻度表头）,
so that core 引擎派发的每个 `RenderableRow` 被画成 Datadog 风格的一行。

## Acceptance Criteria

1. **Given** presentation 经 `colorAccessor(span)`+`theme.trace` 着色 **When** 引擎用真实 rowRenderer 渲染 mockTrace **Then** 瀑布条 `left/width` 按 `viewBounds` 定位、圆角 `2px 2px 0 0`、高 `theme.trace.barHeight(~19)`、上下 gap、无边框（FR-24；UX-DR1）。
2. **And** 父子层级显示服务色缩进竖线：按 `ancestorSpanIds`（根→父）逐层取祖先 span 经**同一 colorAccessor** 着色（取代 Grafana 灰树线）（FR-25；UX-DR2；AD-6）。
3. **And** 左标签列含：折叠箭头（hasChildren 时，点击 `onChildrenToggle`）、子代计数、resource 文本（服务名·操作名，超长省略）、HTTP 状态 pill（圆角 4px，2xx 绿/3xx 蓝/4xx 橙/5xx 红，取 `theme.trace.status`）、错误 ⚠（isError/descendantHasError）（UX-DR3,4,9；FR-26 状态 pill 视觉）。
4. **And** 顶部刻度表头默认 5 刻度、人类可读耗时标签（`formatDuration`），随列宽分割（左标签列头 + 右刻度区）（FR-2）。
5. **And** 颜色**只**在 presentation 计算（core 仍零颜色）；皮肤视觉值一律取 `theme.trace.*`，禁硬编码色；`npm run typecheck`/`npm test`/`npm run build` 通过。

## Tasks / Subtasks

- [x] Task 1：colorAccessor + 状态映射（AC: #1,#3）`src/presentation/colorAccessor.ts` — `defaultColorAccessor(theme)=>(span)=>color`（service 维度，复用 getColorByKey+getServiceColorKey）；`httpStatusToken(code, theme)`（2xx/3xx/4xx/5xx→status token）
- [x] Task 2：缩进竖线（AC: #2）`src/presentation/DdIndentGuides.tsx` — 按 `ancestorSpanIds` 渲染服务色竖线（`colorForSpanId` 解析祖先色）+ 折叠箭头位
- [x] Task 3：标签列（AC: #3）`src/presentation/DdLabelCell.tsx` — 箭头/计数/resource/状态 pill/⚠
- [x] Task 4：瀑布条（AC: #1）`src/presentation/DdSpanBar.tsx` — left/width=viewBounds、barRadius/barHeight/gap、服务色 + 时长标签；clipping 提示位（Epic 2 细化）
- [x] Task 5：行（AC: #1,#3）`src/presentation/DdSpanRow.tsx` — 左标签列(columnWidth) | 右时间线(bar)；detail 行最小占位（Epic 3 填）
- [x] Task 6：刻度 + 表头（AC: #4）`src/presentation/DdTicks.tsx`（移植 Ticks 数学，formatDuration 标签）+ `src/presentation/DdTimelineHeader.tsx`（左标签头 + 右刻度；折叠全部按钮留 Epic 2）
- [x] Task 7：rowRenderer 工厂（AC: #1,#2,#5）`src/presentation/rowRenderer.tsx` — `createDatadogRowRenderer({theme, trace, colorAccessor?})`：建 spanMap 供祖先色解析 → 返回 `RowRenderer`
- [x] Task 8：导出 + 单测 + demo（AC: #5）`presentation/index.ts`；单测（colorAccessor/httpStatusToken/DdSpanBar 几何/DdIndentGuides）；demo 用真实皮肤替换占位
- [x] Task 9：自验 typecheck/test/build + Chrome DevTools 截图

## Dev Notes

### 架构定位（AD-1/AD-6/AD-7）
- presentation = **新写 FC**（非逐行 port），消费 core 的 `RenderableRow`（数据，无色）+ `theme.trace`（视觉令牌）。引擎与皮肤经 `rowRenderer` 接缝注入（api 在 1.7 注入；1.6 用工厂直接驱动 demo）。
- **颜色全在此层**：`colorAccessor(span)=>color` 默认 = `getColorByKey(getServiceColorKey(span.process), theme)`（service 维度，v1 唯一）。`RenderableRow.rpc.process`/外部服务同经 colorAccessor（Epic 4 细化）。

### 缩进竖线（AD-6 关键；参考 SpanTreeOffset.tsx 结构）
- `RenderableRow.ancestorSpanIds`（根→父，length===depth）→ 每个祖先一条服务色竖线。core 只给 ID；presentation 用 `colorForSpanId(id)` 解析祖先色——工厂从 `trace.spans` 建 `Map<spanID, span>`，`colorForSpanId(id)=colorAccessor(spanMap.get(id))`。
- Grafana 用灰线（`autoColor(theme,'lightgrey')`）；这里改服务色竖线（`theme.trace.indentLine.width`，颜色取祖先服务色）。折叠箭头放在最后一格（hasChildren 时显示 ▶/▼，点击 `onChildrenToggle(spanID)`）。

### Datadog 视觉令牌（datadog-visual-spec §2/§5；theme.trace）
- 条：`barRadius:'2px 2px 0 0'`、`barHeight:19`、`barGap:4`、无边框、服务色填充；行高 28（core），条不顶满 → 上下 gap。
- 状态 pill：圆角 4px、小号；2xx→status.ok / 3xx→status.info / 4xx→status.warn / 5xx→status.error（`{fg,bg}`）。
- 字体 `theme.trace.fontFamily`（NotoSans）；刻度 12px。

### 刻度（移植 Ticks.tsx 数学）
- `numTicks=5`；第 i 刻度 `portion=i/(numTicks-1)`，`left:portion*100%`；标签 `formatDuration(startTime + portion*viewingDuration)`（utils 已移植 formatDuration）。表头按 columnWidth 左右分割。

### 范围（留后续）
- 折叠/展开**全部**按钮（TimelineCollapser）→ Epic 2.2；列宽拖拽（ColumnResizer）→ 2.4；ViewingLayer 缩放 → 2.3。1.6 表头静态。
- detail 行渲染 → Epic 3（1.6 占位）。clipping 提示/RPC 叠层/关键路径带 → Epic 2/4。
- showServiceName（与上一行同服务时省略服务名）→ 可选，1.6 简单显示服务名。

### 工厂 ↔ 主题
- `createDatadogRowRenderer` 闭包捕获 theme（colorAccessor 需要）+ trace（祖先色）。主题切换时 api/demo 用 `useMemo([theme, trace])` 重建 renderer，避免 stale。

### References
- [Source: datadog-visual-spec.md §2/§3/§5]
- [Source: SpanTreeOffset.tsx]（缩进结构）、[Source: Ticks.tsx]（刻度数学）
- [Source: ARCHITECTURE-SPINE.md#AD-1/AD-6/AD-7]
- [Source: src/core/rowRenderer.types.ts]（RenderableRow 契约）
- [Source: epics.md#Story 1.6]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]（dev-story；presentation 新写 FC）

### Debug Log References

- `npm run typecheck` → 0 错误
- `npm test` → **46 passed**（+5：presentation httpStatusToken/colorAccessor/瀑布条几何/标签内容/缩进竖线数）
- `npm run build` → ESM 65.25KB + d.ts 30.78KB
- Chrome DevTools（localhost:5174）→ EngineDemo 用真实 Datadog 皮肤渲染 mockTrace：刻度表头 0µs→102ms（5 刻度）、折叠箭头、服务名(粗)+操作名、子代计数徽标(3/1/1/2)、HTTP 状态 pill（200 绿/500 红）、错误图标、**服务色缩进竖线**、按 viewBounds 投影的仅顶圆角瀑布条 + 时长标签。截图验证。

### Completion Notes List

- **presentation 新写 FC**（非 port）：消费 core `RenderableRow`（数据）+ `theme.trace`（视觉令牌），经 `rowRenderer` 接缝由工厂注入（AD-1/AD-2）。
- **AD-6 颜色全在此层**：`defaultColorAccessor(theme)` = `getColorByKey(getServiceColorKey(span.process), theme)`；缩进竖线祖先色由工厂建 `Map<spanID,span>` + `colorForSpanId` 解析（core 只给 `ancestorSpanIds`）。`httpStatusToken` 2xx→ok/3xx→info/4xx→warn/5xx→error 取 `theme.trace.status`。
- **AD-7 令牌**：条 `barRadius:'2px 2px 0 0'`/`barHeight`/服务色填充；状态 pill 4px；字体 `theme.trace.fontFamily`；选中行 `theme.trace.selectedRowBg`。无硬编码色。
- **AD-12 行高**：DdSpanRow 内在高度 = `DEFAULT_HEIGHTS.bar`（供 core/ListView 测量，承接 1.5 的测量循环修复）；detail 行 = `DEFAULT_HEIGHTS.detail` 占位。
- **emotion `label:` 后缀**：单测用 `[class$="DdSpanBar"]`/`[class$="DdIndentGuide"]` 精确选元素（label 在 className 末尾，避免 substring 误匹配容器）。borderRadius/字体等类样式 jsdom 不计算，仅断言 inline 几何（left/width/background）。
- **范围（留后续）**：折叠/展开全部按钮（TimelineCollapser）→ Epic 2.2；列宽拖拽 → 2.4；ViewingLayer 缩放 → 2.3；detail 面板 → Epic 3；clipping 提示/RPC 叠层/关键路径带 → Epic 2/4。1.6 表头静态。
- 5 条 AC 全满足；未新增依赖。

### File List

新增（`/Users/wangxiaowei1/xiaowei/trace-timeline/`）：
- `src/presentation/colorAccessor.ts`、`DdIndentGuides.tsx`、`DdLabelCell.tsx`、`DdSpanBar.tsx`、`DdSpanRow.tsx`、`DdTicks.tsx`、`DdTimelineHeader.tsx`、`rowRenderer.tsx`、`presentation.test.tsx`

修改：
- `src/presentation/index.ts`（出口）、`src/index.ts`（+ `export * from './presentation'`）、`demo/main.tsx`（EngineDemo 用真实皮肤 + DdTimelineHeader，移除占位 PlaceholderRow）

## Change Log

- 2026-06-25：创建 Story 1.6（基础皮肤）。
- 2026-06-26：实现 Story 1.6——新写 Datadog 皮肤（DdSpanRow/DdSpanBar/DdLabelCell/DdIndentGuides/DdTicks/DdTimelineHeader + colorAccessor + createDatadogRowRenderer 工厂）；颜色全在 presentation（AD-6）、令牌取 theme.trace（AD-7）、行高承接 core（AD-12）。46 单测通过；浏览器渲染出 Datadog 风格瀑布。Status → review。
