---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 1.5: core 引擎移植（虚拟滚动 + rowRenderer 契约）

Status: review

## Story

As a 组件库开发者,
I want 移植 `Positions/ListView/VirtualizedTraceView` 引擎核心，保 class+memoizeOne+shouldComponentUpdate，解耦全部 `@grafana/*`，把行渲染改为调用注入的 `rowRenderer(RenderableRow)`、颜色与主题外移、行高归 core 固定常量,
so that 引擎能压平 span 树、虚拟滚动、做时间映射，并把每行所需**数据**（无颜色/主题）交给上层皮肤渲染。

## Acceptance Criteria

1. **Given** 引擎已接入 mock `Trace` 与一个占位 `rowRenderer` **When** 渲染含 1000+ span 的 trace **Then** 渲染的行数 ≪ 总 span 数（虚拟化：未一次性渲染全部 1000 行；jsdom 下走 initialDraw 上限，浏览器下 ≤ 视口+2×缓冲33）（FR-6；NFR-1；AR-3）。
2. **And** `rowRenderer` 收到精确的 `RenderableRow`：`viewBounds` 已投影到 [0,1]（= core `getViewedBounds(start,end)` 输出）+ `clippingLeft/Right`；`ancestorSpanIds` 根→父有序且 `length === depth`；`isError` 与 `descendantHasError` 分离；`rpc`（折叠 client 时含 server 子 span 的 `process`/`serviceName`/`operationName`/`viewStart/End`，**无颜色**）；`httpStatus?`、`criticalPathSections`、`columnWidth`（AR-2；AD-2）。
3. **And** `core` **不** import `presentation/theme/ui`（仅 `model` + React + 第三方 memoize-one/lodash）；行高用常量 `DEFAULT_HEIGHTS{bar:28,detail:161,detailWithLogs:197}`（住 core，api 可覆盖）；行 key = `${traceID}--${spanID}--${detail|bar}` 由 core 经 `getKeyFromIndex/getIndexFromKey` 拥有（AR-3,4,7；AD-12,13）。
4. **And** `VirtualizedTraceView/ListView/Positions` 保留 class + `memoizeOne` + 手写 `shouldComponentUpdate`，逐文件对照上游，逻辑不改（AD-3）。
5. **And** `npm run typecheck`/`npm test`/`npm run build` 通过（含 Positions/utils 单测 + VirtualizedTraceView 渲染契约测试）。

## Tasks / Subtasks

- [x] Task 1：行契约类型（AC: #2）`src/core/rowRenderer.types.ts` — 导出 `RenderableRow`/`ViewBounds`/`RpcInfo`/`RowRenderer`（AD-2 精确字段，无颜色/主题）
- [x] Task 2：core 本地类型（AC: #3）`src/core/types.ts` — `TNil`、`ViewRangeTime`（移植 TimelineViewer/types.tsx）
- [x] Task 3：Positions（AC: #1,#4）`src/core/ListView/Positions.ts` — 原样移植（Uber 头，零依赖）
- [x] Task 4：ListView（AC: #1,#4）`src/core/ListView/index.tsx` — 原样移植（Uber 头），`TNil` 换本地，零 @grafana；item-holder 内联 `width:100%`（等价上游注入 className）
- [x] Task 5：core utils（AC: #2）`src/core/utils.ts` — 移植 `createViewedBoundsFunc/isErrorSpan/spanContainsErredSpan/findServerChildSpan/isKindClient/isClientSpan/isServerSpan/spanHasTag`（Uber 头）+ 新增 `getHttpStatusCode`、`PEER_SERVICE` 常量
- [x] Task 6：VirtualizedTraceView（AC: #1,#2,#3,#4）`src/core/VirtualizedTraceView.tsx` — 移植+解耦：去 withTheme2/stylesFactory/ToolbarButton/config/reportInteraction/t/@grafana 类型；`renderRow` 改建 `RenderableRow` 调注入 `rowRenderer`；颜色/rpc.color 全移除只留数据；`getRowHeight` 常量；保 4 memoizeOne + shouldComponentUpdate
- [x] Task 7：导出（AC: #5）`src/core/index.ts` 出口 + 根 `src/index.ts` 补 `export * from './core'`
- [x] Task 8：单测（AC: #1,#2,#5）`Positions.test.ts`、`utils.test.ts`、`VirtualizedTraceView.test.tsx`（占位 rowRenderer 收集 RenderableRow 校验契约 + 1000 span 虚拟化）
- [x] Task 9：demo 增强（AC: #1,#2）滚动容器 + 占位 rowRenderer（按 viewBounds 画条）渲染 mockTrace，浏览器验证
- [x] Task 10：自验 typecheck/test/build + Chrome DevTools 截图

## Dev Notes

### 范围决策（与 epics 1.5 文字的差异——以 AD-2 为准）
- **`TimelineViewer(index.tsx)` / `Ticks.tsx` / `TimelineRow.tsx` 推迟到 Story 1.6（presentation 皮肤）**。理由：① `Ticks`=RESTYLE 属 presentation（结构 seed 明列 `presentation/DdTimelineHeader/{Ticks}`）；② `TimelineRow` 用 `useStyles2`（theme），`TimelineViewer` 编排表头（presentation）——二者引入 theme/ui 依赖，**违反 AD-2「core 仅 import model+React」**。Story 1.5 聚焦**纯引擎**（Positions/ListView/VirtualizedTraceView/utils/契约），由占位 rowRenderer + scrollElement 直接驱动验证。renderRow 的行包裹 `<div>`（原 `styles.row` 仅 `width:100%`）在 core 内联，不引 TimelineRow。
- **detail 子分组 toggles / SpanDetail** 属 Epic 3；本故事 `RenderableRow` 仅含 `onChildrenToggle/onDetailToggle` + hover guide 回调 + 不透明 `detailState`，detail 行的面板渲染留 Epic 3。

### RenderableRow 契约（AD-2，唯一接缝，无颜色/主题）
```ts
interface ViewBounds { start: number; end: number; clippingLeft: boolean; clippingRight: boolean; }
interface RpcInfo { serviceName: string; operationName: string; process: TraceProcess; viewStart: number; viewEnd: number; }
interface RenderableRow {
  span: TraceSpan; spanIndex: number; isDetail: boolean; depth: number;
  ancestorSpanIds: string[];            // 根→父；不变量 length === depth
  viewBounds: ViewBounds;               // = getViewedBounds(span.start, span.start+dur)
  isCollapsed: boolean; isMatchingFilter: boolean; isFocused: boolean;
  isError: boolean; descendantHasError: boolean;   // 分离（FR-15/26）
  httpStatus?: number;                  // 由 tags http.status_code 提取（FR-26）
  rpc?: RpcInfo;                        // 折叠 client 的 server 子（process 供 presentation 着色，AD-6）
  noInstrumentedServer?: { serviceName: string };  // 叶子 client+peer.service（FR-17）
  criticalPathSections: CriticalPathSection[]; columnWidth: number;
  detailState?: unknown;               // isDetail 行的不透明 DetailState（Epic 3 用）
  hoverIndentGuideIds: Set<string>;
  onChildrenToggle / onDetailToggle / addHoverIndentGuideId / removeHoverIndentGuideId;
}
type RowRenderer = (row: RenderableRow) => React.ReactNode;
```

### 解耦映射（VirtualizedTraceView，逐行对照 660 行）
| 上游 | 处置 |
|---|---|
| `withTheme2/stylesFactory/ToolbarButton`(@grafana/ui) | 删；行包裹用内联 style；scrollToTop ToolbarButton 删（埋点移除） |
| `config/reportInteraction`(@grafana/runtime)、`t`(@grafana/i18n) | 删（scrollToTop 埋点去除） |
| `getColorByKey/getServiceColorKey`(着色) | **移除**——renderSpanBarRow 的 `color`/`rpc.color`/`noInstrumentedServer.color` 删，只传 `process`/`serviceName`（AD-6 颜色外移） |
| `getServiceDisplayName`(model) | 保留（rpc.serviceName 取显示名，纯数据非颜色） |
| `SpanBarRow/SpanDetailRow` import | **删**——`renderRow` 改 `this.props.rowRenderer(buildRenderableRow(index))` |
| `@grafana/data` 类型(CoreApp/GrafanaTheme2/...) | 删；props 精简为引擎所需 |
| `spanAncestorIds`(model) | 新增调用：`ancestorSpanIds = spanAncestorIds(span).reverse()`（model 返回近→远，reverse 得根→父，length===depth） |
| `getRowHeight` 常量 28/161/197 | 住 core（`DEFAULT_HEIGHTS`），`rowHeights?` prop 可覆盖（AD-12） |
| 4×`memoizeOne`(generateRowStates/viewBounds isEqual/clipping isEqual/childSpansMap) + `shouldComponentUpdate` + `getVisibleSpanIds` | **逐行照搬**（AD-3,4） |

### viewedBounds 数学（utils.createViewedBoundsFunc，原样）
`duration=max-min; viewMin=min+viewStart*duration; viewMax=max-(1-viewEnd)*duration; pos=(t-viewMin)/(viewMax-viewMin)`，→ RenderableRow.viewBounds（[0,1]）。presentation 禁再映射（AD-1）。

### generateRowStates（原样照搬，O(n) 折叠游标）
`collapseDepth` 线性跳过 `depth>=collapseDepth`；`childrenHiddenIDs.has`→`collapseDepth=depth+1`；`detailStates.has`→插 `isDetail:true` 行；`showSpanFilterMatchesOnly && findMatchesIDs`→先 filter。`detailStates` 在 core 仅用 `.has/.get`，类型 `ReadonlyMap<string, unknown>`（不引 DetailState，保 AD-2）。

### ListView 关键（原样，jsdom 注意）
- `_wrapperElm = props.scrollElement`；mount/update 挂 `scroll` 监听并清理；`_onScroll`→rAF→`_positionList`→`forceUpdate`。
- **jsdom 无布局**：`clientHeight=0`、scrollElement 未真实滚动 → render 时 `_wrapperElm` 在首帧为 undefined → 走 `start=0,end=min(initialDraw=100,dataLength)-1`。故 1000 span 测试断言「渲染行数 == 100 (initialDraw) ≪ 1000」即证虚拟化；真实视口+缓冲行为靠 Chrome DevTools 浏览器验证。
- `redraw` 必填 prop；VirtualizedTraceView 透传 `redrawListView`（默认稳定 `{}`）。

### core 依赖边界（AD-2 校验）
core import 仅允许：`react`、`memoize-one`、`lodash`(isEqual)、`./` 内部、`../model`（types/service-name/span-ancestor-ids）。**禁** `../theme`、`../presentation`、`../ui`、`@emotion/css` 之外的样式。`@emotion/css` 本故事 core 不需要（行包裹用内联 style）。

### 前序就位（1.1–1.4）
- model：`Trace/TraceSpan/TraceProcess/CriticalPathSection`、`getServiceDisplayName`、`spanAncestorIds(默认导出，近→远)`、`mockTrace`。
- 不新增依赖（memoize-one/lodash 已装）。单测 vitest（jsdom, globals）+ @testing-library/react。

### References
- [Source: public/app/features/explore/TraceView/components/TraceTimelineViewer/ListView/Positions.tsx]
- [Source: public/app/features/explore/TraceView/components/TraceTimelineViewer/ListView/index.tsx]
- [Source: public/app/features/explore/TraceView/components/TraceTimelineViewer/VirtualizedTraceView.tsx]
- [Source: public/app/features/explore/TraceView/components/TraceTimelineViewer/utils.tsx]
- [Source: public/app/features/explore/TraceView/components/TraceTimelineViewer/types.tsx]
- [Source: ARCHITECTURE-SPINE.md#AD-2 / AD-3 / AD-4 / AD-6 / AD-12 / AD-13]
- [Source: investigations/trace-timeline-port-srcmap-investigation.md#Follow-up VirtualizedTraceView 深析]
- [Source: epics.md#Epic 1 / Story 1.5]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]（dev-story 纪律，逐文件对照上游移植）

### Debug Log References

- `npm run typecheck` → 0 错误
- `npm test` → **41 passed**（+20：Positions 4 / utils 9 / VirtualizedTraceView 5 + 既有）
- `npm run build` → ESM 54.32KB + d.ts 28.53KB
- Chrome DevTools（localhost:5174）→ EngineDemo 渲染 mockTrace 9 行瀑布：深度缩进正确、bars 按 viewBounds 时间比例定位、服务色（绿/品红/深绿）、HTTP 状态 [200]/[500]、错误 ⚠（GET /error、response.render error）。截图验证。

### 调试要点（2 个真实坑，均已定位根因）
1. **测量循环坍塌（height:0）**：占位皮肤用 `height:100%` → 与 ListView 的 `_scanItemHeights` 测量循环依赖，行高坍塌为 0。根因：上游行有「内在高度」（内容撑开）供测量，非 100%。修复在 demo 皮肤：行用 `DEFAULT_HEIGHTS.bar` 内在高度（AD-12 presentation 适配 core 声明高度）。**非 core 缺陷**。
2. **item-holder 无宽度（bars 坍成竖线）**：上游 ListView 的 item-holder `position:absolute` 无 width，靠注入的 `itemsWrapperClassName(width:100%)` 撑满；移植时该 class 被精简掉。修复：core 内 item-holder 内联 `width:100%`（行为等价，保 core 自含）。
3. **测试 fixture 两处自纠**：① `findFloorIndex(行边界 y)` 上游 floor 取下界行（期望从 5 改 4）；② 合成 trace root 用 `startTime:0` 被上游 `filter(Boolean(span.startTime))` 丢弃（这是 startTime 空值守卫，真实 trace 不受影响）→ 改用非零微秒。**均为测试期望错，port 忠实**。

### Completion Notes List

- **范围决策**：`TimelineViewer/Ticks/TimelineRow` 推迟到 Story 1.6（presentation）。理由：Ticks=RESTYLE 属表现层；TimelineRow 用 useStyles2、TimelineViewer 编排表头→引入 theme/ui，**违反 AD-2「core 仅 model+React」**。Story 1.5 聚焦纯引擎，行包裹 div 在 core 内联（不引 TimelineRow）。
- **AD-2 接缝**：`RenderableRow` 为唯一导出契约，**无颜色/无主题**——颜色（含 rpc/外部服务）全移除，只传 `process/serviceName` 数据，presentation 经 colorAccessor 着色（AD-6）。`ancestorSpanIds = spanAncestorIds(span).reverse()`（根→父，length===depth）。
- **AD-3/4 照搬**：`VirtualizedTraceView/ListView/Positions` 保 class + 4×memoizeOne(generateRowStates/viewBounds isEqual/clipping isEqual/childSpansMap) + 手写 shouldComponentUpdate，逐行对照，逻辑不改。
- **AD-12/13**：`DEFAULT_HEIGHTS{bar28/detail161/detailWithLogs197}` 住 core、`rowHeights?` 可覆盖；行 key `${traceID}--${spanID}--${detail|bar}` 由 core 经 getKeyFromIndex/getIndexFromKey 拥有。
- **core 纯净校验**：grep 实测 core import 仅 `../model`/react/lodash/memoize-one/内部 `./`，零 theme/ui/presentation/@grafana/@emotion。
- **新增 getHttpStatusCode**（FR-26 数据，纯提取无着色）；`detailStates` 类型 `ReadonlyMap<string,unknown>`（仅 .has/.get，不引 DetailState，保 AD-2）。
- 5 条 AC 全满足；未新增依赖。

### File List

新增（`/Users/wangxiaowei1/xiaowei/trace-timeline/`）：
- `src/core/rowRenderer.types.ts`、`src/core/types.ts`、`src/core/utils.ts`、`src/core/utils.test.ts`
- `src/core/VirtualizedTraceView.tsx`、`src/core/VirtualizedTraceView.test.tsx`
- `src/core/ListView/index.tsx`、`src/core/ListView/Positions.ts`、`src/core/ListView/Positions.test.ts`

修改：
- `src/core/index.ts`（出口）、`src/index.ts`（+ `export * from './core'`）、`demo/main.tsx`（EngineDemo + PlaceholderRow 占位皮肤）

## Change Log

- 2026-06-25：创建 Story 1.5（core 引擎）。
- 2026-06-25：实现 Story 1.5——移植 Positions/ListView/VirtualizedTraceView，解耦全部 @grafana、颜色外移、实现 rowRenderer(RenderableRow) 契约、行高/行 key 归 core 常量；保 class+4memoizeOne+shouldComponentUpdate。41 单测通过；demo 瀑布浏览器验证。TimelineViewer/Ticks/TimelineRow 推迟 Epic 1.6。Status → review。
