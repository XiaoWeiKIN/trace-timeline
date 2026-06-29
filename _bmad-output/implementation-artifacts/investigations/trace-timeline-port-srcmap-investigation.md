# 源码分析案件：TraceTimeline 移植源码地图

## Hand-off Brief
对 Grafana `TraceView`（`public/app/features/explore/TraceView`）做了面向移植的取证分析，建立文件级心智模型。**引擎（虚拟滚动/树/时间映射/数据转换）几乎全是 Apache-2.0（Uber 头，2017/2019），可合法移植**；Datadog 皮肤所需的视觉差异集中在表现层（条/标签/缩进/详情）；**真正需绕开的 Grafana 自研（无 Uber 头）只有 23 个文件，落在我们范围内的主要是 CriticalPath、SpanLinks/Flamegraph/Share/LinkButtons、AccordianReferences、若干 util/常量**。结论：移植可行，风险可控。

- **Case Info**：slug `trace-timeline-port-srcmap`；类型=探索（无症状/代码区分析）；状态=Concluded。
- **依据**：ARCHITECTURE-SPINE.md（AD-1..AD-13）、PRD、datadog-visual-spec.md。

## Evidence（Confirmed）

### 许可证扫描（AD-9 核心证据，已两轮更正 → 最终）
- 直接 grep `Uber Technologies|Jaeger Authors`（任意年份）于 `components/**`（排除 test/stories）。
- **最终：81 文件 Apache-2.0（Uber 或 Jaeger 头）→ 可直接移植**；**仅 14 文件纯 Grafana 自研（无 Uber 且无 Jaeger 头，疑似 AGPL）→ 重写/stub/丢弃**。
- ⚠️ 两处更正记录：① 首轮只匹配 `(c) 2017 Uber` 漏 **2019 Uber 头**（误判 filter-spans/span-ancestor-ids/TextList）；② 二轮漏 **"The Jaeger Authors" 头**（Jaeger 亦 Apache-2.0），误判 CriticalPath/AccordianReferences/ReferenceLink/trace-viewer/link-patterns。**教训：许可证 grep 须同时匹配 Uber 与 Jaeger、任意年份**。
- 🟢 **重大利好（推翻 AD-9 预测）**：`CriticalPath/*` 实为 **"Jaeger Authors"(Apache)**，**可直接移植，无需重写**。FR-16 的重写负担消失。建议据此**放宽 AD-9 与 FR-16**（关键路径改为 ADAPT）。

### 14 个纯 Grafana 自研文件（最终，需绕开）
| 文件 | 处置 | 关联 |
|------|------|------|
| `SpanDetail/SpanFlameGraph.tsx` | **stub**（@grafana/flamegraph+pyroscope） | FR-19 |
| `SpanDetail/ShareSpanButton.tsx`、`SpanDetail/SpanDetailLinkButtons.tsx`、`SpanLinks.tsx` | **stub**（注入回调外壳） | FR-18 |
| `utils/service-name.ts`、`constants/span.ts`、`types/links.ts` | **重写**（小型/类型/常量/字符串） | — |
| `common/Popover.tsx` | **重写**（UI 原语，归 ui 层） | — |
| `TracePageHeader/*`(5)、`settings/SpanBarSettings.tsx` | **丢弃/范围外**（仅保留 `SpanBarOptions` type） | — |

> 由上：`CriticalPath/*`、`AccordianReferences.tsx`、`url/ReferenceLink.tsx`、`model/trace-viewer.ts`、`model/link-patterns.tsx`、`common/ExternalLinks.tsx` 均为 Apache(Jaeger/Uber)，从"重写"上调为 **ADAPT（可移植）**。

## 双轴移植分类（许可证 × 动作）

> **许可证轴**（AD-9）：`APACHE`(Uber 头可拷) / `自研`(无头需绕)。**动作轴**：`ADAPT`(拷+换 @grafana import) / `RESTYLE`(拷+Datadog 视觉改) / `REWRITE`(新写) / `STUB` / `DROP`。

### 引擎 core（→ `src/core`，AD-2/AD-3）
| 文件 | 许可证 | 动作 | 要点 |
|------|--------|------|------|
| `ListView/index.tsx` | APACHE | **ADAPT**(保 class) | 虚拟滚动核心：`_yPositions`+`_knownHeights`，`_onScroll`→rAF→`_positionList`，`_calcViewIndexes`→`findFloorIndex`，`_scanItemHeights` 量 `clientHeight`，`viewBuffer` padding。零 @grafana。风险：windowScroller/`forceUpdate`/滚动监听清理 |
| `ListView/Positions.tsx` | APACHE | **ADAPT** | 纯类：`ys[]` 累积 y、`heights[]`、`calcHeights`/`findFloorIndex`(二分)/`getRowPosition`。零依赖。风险：浮点累积、`findFloorIndex` 抛错 |
| `VirtualizedTraceView.tsx` | APACHE | **ADAPT+解耦** | 行调度：`generateRowStates`(压平+折叠 depth 跟踪+详情插行)、`getRowHeight`(常量 28/161/197→AD-12)、`getViewedBounds`(memoizeOne)、`renderRow` 分派→**改为调用注入的 rowRenderer(AD-2)**。去掉 `reportInteraction/config/withTheme2`。**颜色搬去 presentation(AD-6/D10)** |
| `index.tsx`(TimelineViewer) | APACHE | **ADAPT+解耦** | 编排表头+列表；测高 ref；去 keyboard-shortcuts(`merge`) Grafana 实现/换轻量；去 reportInteraction |
| `TimelineRow.tsx` | APACHE | ADAPT | flex 行/cell，`width`→flexBasis%。仅换 `useStyles2` |
| `Ticks.tsx` | APACHE | RESTYLE | 刻度；依赖 `formatDuration`(util,Apache)+`autoColor`。Datadog 刻度样式 |
| `utils.tsx` | APACHE | ADAPT | `createViewedBoundsFunc`(时间→[0,1])、`isErrorSpan`(statusCode===2/tag error)、`findServerChildSpan`、`spanContainsErredSpan`、`isKindClient`。零耦合 |
| `types.tsx` | APACHE | ADAPT | ViewRangeTime 等类型 |

**viewedBounds 数学**（utils.tsx）：`duration=max-min; viewMin=min+viewStart*duration; viewMax=max-(1-viewEnd)*duration; pos=(t-viewMin)/(viewMax-viewMin)`。→ AD-2 `RenderableRow.viewBounds` 即此输出。

### 表现层（→ `src/presentation`，RESTYLE/STUB，AD-1/AD-6/AD-7）
| 文件 | 许可证 | 动作 | Datadog 改动要点 |
|------|--------|------|------|
| `SpanBar.tsx` | APACHE | RESTYLE | `left=toPercent(viewStart)`/`width=toPercent(viewEnd-viewStart)`；圆角→`2px 2px 0 0`；log 标记按 0.2% 聚类保留；RPC 叠层；关键路径带 |
| `SpanBarRow.tsx` | APACHE | RESTYLE | 左标签列+右时间线 cell（`columnDivision` 宽度分割）；错误红底→**行内 HTTP 状态 pill**；去 flash 动画 |
| `SpanTreeOffset.tsx` | APACHE | RESTYLE | 缩进引导：灰线→**服务色竖线**(AD-6,用 ancestorSpanIds)；折叠图标 |
| `TimelineHeaderRow/TimelineHeaderRow.tsx` | APACHE | RESTYLE | 表头编排 |
| `TimelineHeaderRow/TimelineCollapser.tsx` | APACHE | RESTYLE | 展开/折叠全部/逐层 4 按钮(FR-5) |
| `TimelineHeaderRow/TimelineColumnResizer.tsx` | APACHE | RESTYLE | 列宽拖拽(用 DraggableManager,FR-9) |
| `TimelineHeaderRow/TimelineViewingLayer.tsx` | APACHE | RESTYLE | 拖拽缩放(reframe/shift,FR-8)；游标线/选区色→Datadog |
| `SpanDetailRow.tsx` | APACHE | RESTYLE | 详情行：左缩进+右 SpanDetail，border-top 服务色 |
| `SpanDetail/index.tsx` | APACHE | RESTYLE | 详情卡：overview(LabeledList)+各 Accordian；去 usePluginLinks/profiles |
| `SpanDetail/DetailState.tsx` | APACHE | ADAPT | 纯状态类(各分组开关,不可变),无 UI |
| `SpanDetail/AccordianKeyValues.tsx`(+markers)、`AccordianLogs.tsx`、`KeyValuesTable.tsx`、`TextList.tsx`、`jsonMarkup` | APACHE | RESTYLE | tags/logs/KV 表/文本；JSON 着色(DOMPurify) |
| `SpanDetail/AccordianReferences.tsx` | APACHE(Jaeger) | RESTYLE | references 面板(用 ReferenceLink，可移植) |
| `SpanDetail/SpanFlameGraph.tsx` | **自研** | STUB | 火焰图占位+回调(FR-19) |
| `SpanDetail/ShareSpanButton.tsx`、`SpanDetailLinkButtons.tsx`、`SpanLinks.tsx` | **自研** | STUB | 外壳+注入回调(FR-18) |

### 状态（→ `src/state`，AD-5）
| hook | 许可证 | 动作 | state 形状 |
|------|--------|------|-----------|
| `useChildrenState.ts` | APACHE | ADAPT | `childrenHiddenIDs:Set` + expandOne/collapseOne/expandAll/collapseAll/toggle |
| `useDetailState.ts` | APACHE | ADAPT | `detailStates:Map<spanID,DetailState>` + 各 toggle |
| `useViewRange.ts` | APACHE | ADAPT | `viewRange.time.current:[s,e]` + update |
| `useHoverIndentGuide.ts` | APACHE | ADAPT | `hoverIndentGuideIds:Set` + add/remove |
| `useSearch.ts` | **自研** | **REWRITE** | `search`+`spanFilterMatches:Set`；**剥离 Redux/exploreId/explorePane**，只留本地 + `filterSpans()`(Apache) |
| `TraceView.tsx`(wiring) | **自研** | **REWRITE** | 5 hook 装配；剥离 Redux/Explore→ `useTraceTimelineState`(AD-5) |
| `types/TTraceTimeline.tsx` | APACHE | ADAPT | `{childrenHiddenIDs,detailStates,hoverIndentGuideIds,spanNameColumnWidth,traceID}` |

### 模型/工具（→ `src/model`、`src/theme`、`src/utils`）
| 文件 | 许可证 | 动作 | 要点/风险 |
|------|--------|------|-----------|
| `model/transform-trace-data.tsx` | APACHE | ADAPT | TraceResponse→派生 Trace(depth/relativeStartTime/childSpanIds 按结束时间降序/dedup tags/references+subsidiarilyReferencedBy)。**风险：依赖 `selectors/trace` 的 `getTraceSpanIdsAsTree`、`model/trace-viewer` 的 `getTraceName`、`utils/config` 的 topTagPrefixes——需一并移植/stub** |
| `utils/color-generator.tsx` | APACHE | ADAPT+换色板 | hash%palette + readability≥1.5 去重；`getFilteredColors` 去红+对比度≥3。**色数组换 Datadog 分类色板(AD-6)，去 @grafana/ui colors** |
| `utils/filter-spans.tsx` | APACHE(2019) | ADAPT | 搜索匹配(adhoc+legacy+全文+critical)。依赖 `@opentelemetry/api` SpanStatusCode、constants/span |
| `utils/span-ancestor-ids.tsx` | APACHE(2019) | ADAPT | 沿 references 走祖先链(CHILD_OF/FOLLOWS_FROM)→AD-2 ancestorSpanIds |
| `utils/{date,number,sort,TreeNode}` | APACHE | ADAPT | date 依赖 moment-timezone→**换 dayjs** |
| `utils/service-name.ts` | **自研** | REWRITE | getServiceDisplayName/getServiceColorKey(namespace/name 字符串) |
| `utils/DraggableManager/*` | APACHE | ADAPT | 拖拽事件机；窗口 resize 监听需清理 |
| `Theme.tsx`(autoColor) | APACHE | ADAPT | 暗色可读性变体(tinycolor)；接 Theme 子集 |
| `CriticalPath/*` | APACHE(Jaeger) | **ADAPT** | 关键路径算法(LFC 回溯)；**实为 Jaeger Apache，可直接移植**（推翻 AD-9 预测，FR-16 无需重写） |
| `model/trace-viewer.ts`(getTraceName)、`model/link-patterns.tsx` | APACHE(Jaeger) | ADAPT | transform 依赖的 getTraceName 可移植 |
| `types/trace.ts` | APACHE | ADAPT | Trace/TraceSpan/TraceProcess/Reference/CriticalPathSection |
| `types/links.ts` | **自研** | REWRITE | SpanLinkFunc 等(stub 相关) |

## 关键移植风险（Confirmed/Deduced）
1. **`transform-trace-data` 隐藏依赖链**（Deduced）：`getTraceSpanIdsAsTree`(selectors/trace)、`getTraceName`(model/trace-viewer 自研)、`topTagPrefixes`(utils/config)。移植 transform 必须连带处理这三个，其中 trace-viewer 自研需重写。**移植前先核对 `selectors/trace` 的许可证头与实现**。
2. **moment-timezone → dayjs**（date.tsx）：API 替换，注意时区/格式化。
3. **`@grafana/ui` colors 调色板**（color-generator）：本就要换 Datadog 色板，顺带消除该依赖。
4. **class 组件生命周期**（ListView/VirtualizedTraceView，AD-3）：`forceUpdate`、`shouldComponentUpdate`、ref 测高、滚动监听清理——照搬时逐行对照，勿改逻辑。
5. **`useSearch`/`TraceView` 的 Redux/Explore 耦合**：必须重写为受控/非受控容器(AD-5)。
6. **filter-spans 的 `@opentelemetry/api`**：轻量依赖，保留或内联 SpanStatusCode 常量。
7. ~~CriticalPath 自研需重写~~ **已澄清**：CriticalPath 为 Jaeger Apache，可直接移植（ADAPT），非重写。仍依赖 `CriticalPath/utils/*`（同为 Apache），一并移植。

## 建议移植顺序（喂给 Epic/故事）
1. 基座：types(trace/TNil/links) + theme(令牌/useStyles2/autoColor/colorGenerator 换色板) + i18n/runtime shim + ui 原语(Icon 等)
2. model：transform-trace-data + 隐藏依赖(selectors/tree、getTraceName、config) + adapters 边界 + mock
3. utils：date(dayjs)/number/sort/TreeNode/filter-spans/span-ancestor-ids/service-name(重写)/DraggableManager
4. core 引擎：Positions→ListView→VirtualizedTraceView(解耦+rowRenderer 契约)→TimelineViewer→TimelineRow/Ticks/utils
5. state：4 hook ADAPT + useSearch 重写 + useTraceTimelineState 容器
6. presentation：SpanBar/SpanBarRow/SpanTreeOffset → TimelineHeaderRow 簇 → SpanDetail 簇 → stubs（flamegraph/share/links）→ AccordianReferences 重写
7. CriticalPath 重写(或 Deferred) + api/<TraceTimeline> 注入 + demo + Storybook

## Final Conclusion（置信度：High）
源码移植**可行且风险可控**：**81/95 文件为 Apache（Uber/Jaeger），可直接移植**；Datadog 改动集中在表现层 RESTYLE；纯自研仅 14 个，范围内只需 4 个 stub + 少量小重写（service-name/types/links/constants/Popover）。最大单点风险降为 `transform-trace-data` 的隐藏依赖链（getTraceSpanIdsAsTree/getTraceName/topTagPrefixes，均 Apache 可移植）。**CriticalPath 经核为 Jaeger Apache，可移植**——建议据此放宽 AD-9/FR-16。双轴分类与移植顺序已就绪，可直接驱动 Epic/故事拆分。

**Status: Concluded.**

---

## Follow-up: 2026-06-25 — VirtualizedTraceView.tsx 深析

> 拉取 `components/TraceTimelineViewer/VirtualizedTraceView.tsx`（660 行，引擎调度中枢）单文件深线。许可证：Apache（Uber 2017 头）。动作：**ADAPT + 解耦 + 颜色外移**。

### 定位
数据→行的"编译器" + ListView 回调供给者。是 **AD-2 rowRenderer 接缝** 与 **AD-6 颜色外移** 改动最集中处。

### 数据流
`props(trace+交互态)` → `generateRowStates`(memoizeOne)→`RowState[]` → `render()` 挂 `<ListView dataLength/itemHeightGetter=getRowHeight/itemRenderer=renderRow/getKeyFromIndex/getIndexFromKey>` → 虚拟滚动仅对可见行回调 `renderRow(index)` → `isDetail? renderSpanDetailRow : renderSpanBarRow`，并算 ±`BUFFER_SIZE=33` 可见 spanIds 窗口。

### 关键机制（行号）
- `generateRowStates`(131–181)：遍历扁平 spans→`RowState{span,isDetail,spanIndex}`；折叠用 `collapseDepth` 游标(148–166)线性跳过 `depth>=collapseDepth`，**O(n) 无递归**；详情插行(172–178) `detailStates.has`→额外 `isDetail:true` 行；过滤(144–146) `showSpanFilterMatchesOnly`。
- 四 `memoizeOne`(224–227)：generateRowStates / viewBoundsFunc(isEqual) / getClipping(isEqual) / childSpansMap。`getRowStates()`(266)被 renderRow/getRowHeight/map* 高频调，全靠命中→**AD-4 不可变的根因**。
- `getViewedBounds`(284–294)：`createViewedBoundsFunc({min:trace.startTime,max:endTime,viewStart,viewEnd})`→`(s,e)=>{start,end}`=**RenderableRow.viewBounds 来源**；presentation 禁再映射(AD-1)。
- `getRowHeight`(363–372)：常量 bar28/detail161/detailWithLogs197，读 `span.logs.length`→**AD-12 core 拥有**。
- `renderSpanBarRow`(397–522)=**颜色外移改动最大**：移除 `getColorByKey`(431)；`showErrorIcon`(436)拆 `isError`+`descendantHasError`；RPC 合并(439–452 `findServerChildSpan`)与外部服务(454–463 `peer.service`)**只传 `process` 数据**、presentation 着色；`findAllDescendants`(467–478)+`criticalPathSections`(479–484)+`showServiceName`(514–516)保留为数据。
- `renderSpanDetailRow`(524–602)：profiles/flamegraph prop 走 **stub**。
- 生命周期(234–264)+`scrollToSpan`(387–395)：mount/focus 变化滚动、`hasScrolledToSpan` 守首次、`scrollToIndex(i,headerHeight)`→FR-7。`shouldComponentUpdate`(238–247)任一 prop 引用变即更新→**AD-3 照搬勿改 hooks**。
- key(343–361)=`traceID--spanID--detail|bar`→**AD-13 core 拥有**。

### 移植动作（本文件）
1. 去 @grafana：withTheme2/stylesFactory/ToolbarButton/config/reportInteraction/t/类型 → shim/本地。
2. `renderRow` 改调注入 `rowRenderer(RenderableRow)`(AD-2)，不再 import SpanBarRow/SpanDetailRow。
3. 剥所有颜色计算改传数据(AD-6)。
4. `getRowHeight` 常量 core 拥有、api 可覆盖(AD-12)。
5. 保 class+四 memoizeOne+shouldComponentUpdate(AD-3) 逐行对照。
6. `scrollToTop`/reportInteraction(604–613) 埋点去除或注入回调。

### 本文件特有风险
- **memoize↔不可变强绑定**：容器(AD-5)任一 slice 原地 mutate→静默漏渲染（最隐蔽）。
- `getRowStates()` 高频 + `mapSpanIndexToRowIndex`(326) O(n) 线性查找→大 trace 潜在 O(n²)，可选优化为 Map。
- 剥颜色时易误伤 RPC/错误/外部服务的数据流——"算什么"vs"画什么"要切干净。
- 死参数 `criticalPath`(137)传入未用(注释 143 已并入 findMatchesIDs)→可清理。

**Follow-up Status: Concluded.**
