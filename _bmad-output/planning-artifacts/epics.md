---
stepsCompleted: ['step-01', 'step-02', 'step-03', 'step-04']
inputDocuments:
  - prds/prd-trace-timeline-2026-06-23/prd.md
  - prds/prd-trace-timeline-2026-06-23/addendum.md
  - prds/prd-trace-timeline-2026-06-23/datadog-visual-spec.md
  - architecture/architecture-trace-timeline-2026-06-23/ARCHITECTURE-SPINE.md
  - ../implementation-artifacts/investigations/trace-timeline-port-srcmap-investigation.md
---

# Datadog 风格 Trace Timeline 组件库 - Epic Breakdown

## Overview

把「Datadog 风格 Trace Timeline 独立 React 组件库（内部工具 / Grafana 引擎照搬 / Datadog 皮肤 / DataFox 数据）」的 PRD + 架构 + Datadog 视觉规格 + 源码移植地图，分解为可实现的 epic 与故事。

## Requirements Inventory

### Functional Requirements

- FR-1: 渲染合法 `Trace` 为时间线表头 + 全部可见 span 瀑布条（左列名/右列条；left/width 按时间相对视图区间成正比）
- FR-2: 时间线刻度表头（默认 5 刻度，人类可读耗时标签，随缩放更新）
- FR-3: 服务配色稳定一致（Datadog 分类色板；同服务同色；相邻 readability≥1.5）
- FR-4: 折叠/展开单个 span 子树（折叠隐藏全部后代，有视觉标识）
- FR-5: 全部折叠/展开、逐层折叠/展开
- FR-6: 行虚拟化（1000+ span 仅渲染视口+缓冲；行复用不重建）
- FR-7: 滚动定位到指定 span（focusedSpanId；补偿表头高度）
- FR-8: 拖拽缩放时间窗（新 [start,end]∈[0,1]；裁剪提示）
- FR-9: 列宽拖拽（名称列占比可调，释放保持）
- FR-10: 展开/折叠 span 详情（下方插详情行；含 logs 行更高）
- FR-11: 详情内子分组独立折叠（tags/process/logs/references/warnings/stackTraces）
- FR-12: 键值/JSON 友好展示（JSON 语法着色）
- FR-13: 搜索并高亮命中（基于服务名/操作名/tags；命中可定位）
- FR-14: 只看匹配项（仅渲染命中；无命中空态提示）
- FR-15: 错误 span 标识（错误图标；折叠时子孙含错在父条提示）
- FR-16: 关键路径高亮（CriticalPath 直接移植；折叠合并显示）
- FR-17: RPC 合并与外部服务推断（折叠 client 显对端 server；叶子 client+peer.service 标外部）
- FR-18: 可注入的链接/动作回调（火焰图/Profiles/span links/分享，默认 no-op/可隐藏不报错）
- FR-19: 火焰图占位（外壳，可回调接管；不内置实现）
- FR-20: 内置 light/dark 主题（全量响应切换）
- FR-21: 自定义主题注入（覆盖令牌子集，未覆盖回退内置）
- FR-22: 数据契约 = 内部 Trace + DataFox 适配器 `fromDataFox(resp): Trace`（DataFrame 列式/OTLP 字段；parent_span_id 建父子；ms/ns→µs；孤儿父按 root）
- FR-23: 非受控默认 + 受控可选（仅传 trace 即可交互；受控接管生效；优先级互斥）
- FR-24: Datadog 瀑布条样式（圆角 2px 仅顶部，高~19px，无边框，上下 gap）
- FR-25: 服务色缩进连接线（取代灰树线；按 ancestorSpanIds 逐层着色）
- FR-26: 行内 HTTP 状态 pill + 错误标识（pill 4px：2xx绿/3xx蓝/4xx橙/5xx红；⚠；Errors 计数开关）
- FR-27: Color by 维度切换（下拉；Service 默认 v1 唯一实现；其余占位）
- FR-28: DRUIDS 视觉令牌（面板底/选中行/文本透明度阶/刻度 NotoSans 12px；高密度）
- FR-29: 可选 DataFox 取数助手 `fetchTrace(traceId,{from,to,baseUrl,fetch?})`（POST /api/v3/spans/search，query=trace_id:<id>；可注入 fetch）

### NonFunctional Requirements

- NFR-1（性能）：1000-span trace 时 DOM 瀑布条行数 ≤ 视口可见 + 2×缓冲(BUFFER_SIZE=33)；首屏可交互 ≤ 200ms；滚动帧 p95 ≤ 20ms（≈50fps）。`[阈值初定，实现期校准]`
- NFR-2（可访问性）：键盘可达折叠/详情切换；图标含可读标签；主题切换后对比仍达标（WCAG AA 目标，内部工具放宽，完整 roving-tabindex 入 v2）
- NFR-3（国际化）：所有可见文案经统一注入点，默认英文
- NFR-4（浏览器）：最近两个版本 Chrome/Edge/Firefox/Safari
- NFR-5（样式隔离）：emotion 运行时，className 带 label，避免与宿主冲突
- NFR-6（SSR）：v1 CSR 为主，SSR 尽力而为不硬保证
- NFR-7（运行时/打包）：React 作 peer；**ESM-only** + d.ts；零 `@grafana/*`/`app/*` npm 依赖

### Additional Requirements

来自架构 ARCHITECTURE-SPINE（AD-1~14）与源码 case file：
- AR-1：七层架构 `src/{core,presentation,state,model,theme,ui,api}` + `src/data/datafox`；依赖单向向下（AD-1/AD-4 模块图）
- AR-2：**rowRenderer(RenderableRow) 接缝依赖反转**——core 零 Datadog/theme/ui import，api 注入皮肤；RenderableRow 精确字段（span/spanIndex/isDetail/depth/ancestorSpanIds[根→父,length===depth]/viewBounds{start,end,clippingLeft,clippingRight}/isCollapsed/isMatchingFilter/isFocused/isError/descendantHasError/httpStatus?/rpc?{serviceName,operationName,process,viewStart,viewEnd}/criticalPathSections/columnWidth/回调）（AD-2/AD-6/AD-10）
- AR-3：引擎核心（ListView/Positions/VirtualizedTraceView）保 class + memoizeOne + shouldComponentUpdate，逐行对照移植；新代码 FC+hooks（AD-3）
- AR-4：状态不可变（新 Set/Map/数组）——memoizeOne 引用相等依赖（AD-4）
- AR-5：状态容器组合 5 hook（children/detail/viewRange/search/hover）+ 列宽 + 受控回退优先级互斥（AD-5）；useSearch 剥 Redux/Explore
- AR-6：theme = GrafanaTheme2 子集形状(值填 DRUIDS) + 导出 TS 接口 `TraceThemeTokens`（theme.trace.*）；override 深合并（AD-7）
- AR-7：行高归 core 固定常量 DEFAULT_HEIGHTS{bar28/detail161/detailWithLogs197}，api 可覆盖（AD-12）；行 key 归 core（AD-13）
- AR-8：DataFox 适配器自写列式解析 + 复用 Apache transform-trace-data（AD-8）；其隐藏依赖 getTraceSpanIdsAsTree/getTraceName/topTagPrefixes 一并移植
- AR-9：内部工具无许可证义务，Grafana 代码原样移植（含 CriticalPath/filter-spans/useSearch），保留版权头；仅 flamegraph/profiles stub（AD-9/AD-11）
- AR-10：date.tsx 由 moment 换 dayjs；color-generator 换 Datadog 色板去 @grafana/ui colors
- AR-11：隔离目录 `trace-timeline/`（仓库外，避免 Grafana yarn workspaces 纳入）；tsup ESM-only 构建；vitest+RTL 单测；demo 页（去 Storybook）
- AR-12：空/加载/无效态归 api（trace==null→空态；loading→占位；搜索无命中→空态）

### UX Design Requirements

来自 datadog-visual-spec.md（实测 Datadog Waterfall）：
- UX-DR1：瀑布条几何——圆角 `2px 2px 0 0`（仅顶部）、高~18-19px、无边框、上下 gap（条不顶满行高 28px）
- UX-DR2：服务色缩进竖线——父子层级用服务色竖线做缩进引导（取代 Grafana 灰树线）
- UX-DR3：行内 HTTP 状态 pill——圆角 4px，2xx 绿(底 rgb(236,249,239))/3xx 蓝/4xx 橙/5xx 红(如 500 红底)
- UX-DR4：错误标识——错误 span/路径 ⚠ 图标；工具条 `Errors N` 计数开关（只看错误）
- UX-DR5：Color by 下拉——着色维度切换（Service 默认 v1 唯一）
- UX-DR6：Datadog 分类色板——橙 #FCAF2B/紫 #C68CCD/绿 #50931F/品红 #CC3C71/棕褐 #DD8451/鲑红 #C86B74，稳定按服务分配
- UX-DR7：DRUIDS 语义色 + 中性——成功 #008645/底 #ECF9EF；危险 #EB364B/底 #FDEBED；警告 #F99D02；主蓝 #3598EC/底 #EAF6FC；面板底 rgb(249,250,251)；选中行 rgb(234,246,252)；文本透明度阶 .98/.68/.5/.35
- UX-DR8：排版——字体栈 NotoSans（CJK 回退 PingFang SC）；刻度 12px/400；高密度小字号
- UX-DR9：布局——左标签列（展开箭头+深度/子代计数+服务图标+resource 文本 smart-ellipsis+HTTP 状态 pill+⚠）| 右时间线（刻度表头+条）；列宽可拖
- UX-DR10：工具条——Filter spans 搜索框 + Errors 计数开关 + Color by 下拉 + 展开/折叠全部按钮
- UX-DR11：详情头——DRUIDS HttpRequestBar 风格（method pill + url + 状态 pill）
- UX-DR12：主题——内置 light/dark + 可注入自定义主题覆盖

### FR Coverage Map

- FR-1: Epic 1 — 渲染 Trace 为瀑布图
- FR-2: Epic 1 — 时间线刻度表头
- FR-3: Epic 1 — 服务配色（Datadog 色板）
- FR-6: Epic 1 — 行虚拟化
- FR-20: Epic 1 — 内置 light/dark 主题
- FR-21: Epic 1 — 自定义主题注入
- FR-22: Epic 1（内部 Trace 契约 + transformTraceData/mock）+ Epic 5（fromDataFox 适配）
- FR-24: Epic 1 — Datadog 瀑布条样式
- FR-25: Epic 1 — 服务色缩进竖线
- FR-28: Epic 1 — DRUIDS 视觉令牌
- FR-4: Epic 2 — 折叠/展开单个子树
- FR-5: Epic 2 — 全部/逐层折叠展开
- FR-7: Epic 2 — 滚动定位
- FR-8: Epic 2 — 拖拽缩放时间窗
- FR-9: Epic 2 — 列宽拖拽
- FR-23: Epic 2 — 非受控默认 + 受控可选
- FR-10: Epic 3 — 展开/折叠详情
- FR-11: Epic 3 — 详情子分组独立折叠
- FR-12: Epic 3 — 键值/JSON 着色
- FR-13: Epic 4 — 搜索高亮
- FR-14: Epic 4 — 只看匹配
- FR-15: Epic 4 — 错误 span 标识
- FR-16: Epic 4 — 关键路径高亮
- FR-17: Epic 4 — RPC 合并/外部服务推断
- FR-26: Epic 4 — 行内 HTTP 状态 pill + 错误计数
- FR-27: Epic 4 — Color by 维度切换
- FR-18: Epic 5 — 可注入链接/动作回调
- FR-19: Epic 5 — 火焰图占位
- FR-29: Epic 5 — DataFox 取数助手

## Epic List

### Epic 1: 静态瀑布图渲染（Walking Skeleton）
传入一份 mock `Trace` 即可渲染出 Datadog 风格的静态瀑布图——服务色仅顶圆角条、时间刻度、服务色缩进竖线、light/dark 主题。建立脚手架 + 七层骨架 + core 引擎 + 基础皮肤 + api + demo，是整个库的可立起骨架。
**FRs covered:** FR-1, FR-2, FR-3, FR-6, FR-20, FR-21, FR-22(内部 Trace+transform), FR-24, FR-25, FR-28

### Epic 2: 交互导航（折叠/缩放/列宽/定位）
能折叠展开 span 树（单个/全部/逐层）、拖拽缩放时间窗、拖列宽、滚动定位到指定 span；受控/非受控状态容器就位。
**FRs covered:** FR-4, FR-5, FR-7, FR-8, FR-9, FR-23

### Epic 3: Span 详情面板
点击 span 展开详情，查看 tags/process/logs/references/warnings/stackTraces，子分组独立折叠，JSON 着色。
**FRs covered:** FR-10, FR-11, FR-12

### Epic 4: 搜索过滤 + 错误/状态语义
搜索高亮 / 只看匹配 / 空态；行内 HTTP 状态 pill、错误 ⚠ + Errors 计数、关键路径高亮、RPC 合并、Color-by 切换。
**FRs covered:** FR-13, FR-14, FR-15, FR-16, FR-17, FR-26, FR-27

### Epic 5: DataFox 数据接入 + 深耦合 stub
接 DataFox 真实数据渲染（`fromDataFox` 适配 + 可选 `fetchTrace` 助手）；详情头 HttpRequestBar 风格；火焰图/Profiles/span-links/分享走外壳 + 注入回调。
**FRs covered:** FR-18, FR-19, FR-22(DataFox 适配), FR-29

---

## Epic 1: 静态瀑布图渲染（Walking Skeleton）

传入一份 mock `Trace` 即可渲染出 Datadog 风格的静态瀑布图。建立脚手架 + 七层骨架 + core 引擎 + 基础皮肤 + api + demo。

### Story 1.1: 脚手架与构建链

As a 组件库开发者,
I want 一个隔离的 `trace-timeline/` 包（tsup ESM-only 构建 + tsconfig + vitest + demo 入口）,
So that 后续各层代码有可构建、可跑 demo、可测试的工程底座。

**Acceptance Criteria:**

**Given** 仓库外隔离目录 `trace-timeline/`
**When** 执行 `npm run build`
**Then** tsup 产出 ESM + `d.ts`，无类型错误
**And** `npm run dev` 能启动 demo 页（先渲染占位），`npm test` 能跑通空用例
**And** `package.json` 将 react/react-dom 声明为 peerDependencies，无任何 `@grafana/*` 依赖（AR-11/NFR-7）

### Story 1.2: 主题层（DRUIDS 令牌 + light/dark）

As a 使用方,
I want `ThemeProvider` + `createTheme({colorMode, override})` 提供内置 light/dark 与可注入覆盖,
So that 组件配色/排版统一走主题令牌、可切换、可定制。

**Acceptance Criteria:**

**Given** `theme` 层导出 TS 接口 `TraceThemeTokens`（GrafanaTheme2 子集形状 + `theme.trace.*`）
**When** 用 `<ThemeProvider theme={createTheme({colorMode:'dark'})}>` 包裹并调 `useStyles2`
**Then** 子组件取到 dark 令牌（面板底/选中行/文本透明度阶/NotoSans/分类色板/条几何）
**And** 传入 `override` 时深合并、未覆盖项回退内置（FR-21）
**And** light/dark 切换后无残留硬编码色（FR-20/28；UX-DR7,8,12；AR-6）

### Story 1.3: 内部 Trace 模型与 mock

As a 组件库开发者,
I want 移植 `types/trace` + `transform-trace-data`（含隐藏依赖 getTraceSpanIdsAsTree/getTraceName/topTagPrefixes）并提供一份 mock `Trace` fixture,
So that 引擎/皮肤有合法的内部 Trace 数据可渲染（DataFox 适配留到 Epic 5）。

**Acceptance Criteria:**

**Given** 一份 raw `TraceResponse` fixture（含多服务、深嵌套、错误 span、references）
**When** 调用 `transformTraceData(resp)`
**Then** 得到派生 `Trace`（depth/relativeStartTime/childSpanIds 按结束降序/process/services/subsidiarilyReferencedBy），时间单位微秒
**And** 导出一份现成 mock `Trace` 供 demo/测试使用（FR-22 内部契约；AR-8 部分）

### Story 1.4: utils 与 ui 原语

As a 组件库开发者,
I want 移植 utils（color-generator 换 Datadog 色板、date→dayjs、number/sort/TreeNode/span-ancestor-ids、DraggableManager）与 ui 原语（Icon=lucide、Tooltip 等）,
So that 上层引擎与皮肤有稳定的取色、时间格式化、拖拽、图标基础。

**Acceptance Criteria:**

**Given** `color-generator` 已移植并把色数组换成 Datadog 分类色板、去掉 `@grafana/ui` colors
**When** 对同一 serviceName 多次取色
**Then** 颜色稳定一致，相邻 readability≥1.5（FR-3；UX-DR6；AR-10）
**And** `date` 用 dayjs 输出人类可读耗时（µs/ms/s）；Icon 用 lucide 映射 grafana 图标名；DraggableManager 可用且 resize 监听有清理

### Story 1.5: core 引擎移植（虚拟滚动 + rowRenderer 契约）

As a 组件库开发者,
I want 移植 `Positions/ListView/VirtualizedTraceView/TimelineViewer/TimelineRow/Ticks/utils`，保 class+memoizeOne，解耦 @grafana 并改为调用注入的 `rowRenderer(RenderableRow)`、颜色外移、行高归 core 常量,
So that 引擎能压平 span 树、虚拟滚动、做时间映射，并把整行数据交给皮肤渲染。

**Acceptance Criteria:**

**Given** 引擎已接入 mock `Trace` 与一个占位 rowRenderer
**When** 渲染含 1000+ span 的 trace 并滚动
**Then** DOM 行数 ≤ 视口可见 + 2×缓冲(33)，行复用不重建（FR-6/NFR-1）
**And** `rowRenderer` 收到精确的 `RenderableRow`（含 viewBounds 已投影 [0,1]+clipping、ancestorSpanIds 根→父 length===depth、isError/descendantHasError、rpc.process 等数据，无颜色/主题）（AR-2）
**And** core 不 import presentation/theme/ui；行高用常量 28/161/197、行 key 由 core 拥有（AR-3,4,7；AD-12,13）

### Story 1.6: 基础皮肤（瀑布条 + 标签列 + 缩进竖线 + 刻度表头）

As a 使用方,
I want 注入式 Datadog 行渲染器：仅顶圆角瀑布条、左标签列（箭头/深度计数/服务图标/resource/服务色）、服务色缩进竖线、时间刻度表头,
So that 引擎派发的每行被画成 Datadog 风格。

**Acceptance Criteria:**

**Given** presentation 经 `colorAccessor`+`theme.trace` 着色
**When** 引擎用真实 rowRenderer 渲染 mock trace
**Then** 瀑布条 left/width 按 viewBounds 定位、圆角 `2px 2px 0 0`、高~19px、上下 gap（FR-24；UX-DR1）
**And** 父子层级显示服务色缩进竖线（用 ancestorSpanIds 逐层着色）（FR-25；UX-DR2）
**And** 顶部刻度表头默认 5 刻度、人类可读耗时标签（FR-2）；左标签列含箭头/深度计数/服务图标/resource 文本（UX-DR9）

### Story 1.7: api 入口与静态 demo

As a 使用方,
I want `<TraceTimeline trace={...} />` 对外组件（把 Datadog 皮肤注入引擎）+ index 导出 + 一个用 mock 渲染静态瀑布的 demo,
So that 一行即可渲染出 Datadog 风格的静态追踪瀑布图。

**Acceptance Criteria:**

**Given** `api/<TraceTimeline>` 已把 presentation 的 rowRenderer 注入 core
**When** 在 demo 中 `<ThemeProvider><TraceTimeline trace={mockTrace} /></ThemeProvider>`
**Then** 渲染出完整静态瀑布（条/刻度/缩进/服务色），布局为左标签列 | 右时间线（FR-1；AR-1）
**And** demo 提供 light/dark 切换按钮，观感切换正确
**And** `trace==null` 时显示空态而非崩溃（AR-12）

## Epic 2: 交互导航（折叠/缩放/列宽/定位）

折叠展开、拖拽缩放、列宽、滚动定位；受控/非受控状态容器就位。

### Story 2.1: 状态容器（受控/非受控）

As a 使用方,
I want `useTraceTimelineState` 组合 children/viewRange/hover 等 hook 并提供受控回退,
So that 默认非受控即可交互、需要时可受控接管。

**Acceptance Criteria:**

**Given** 仅传 `trace` 的非受控用法
**When** 触发折叠/缩放等交互
**Then** 库内部自管状态、不可变更新（新 Set/Map）（AR-4,5）
**And** 传入受控 `focusedSpanId`/搜索 query + 回调时由调用方接管、库不内部改写
**And** 同时传"全量受控逃生舱"与逐字段受控 props 时按优先级互斥并 dev 警告（FR-23；AD-5）

### Story 2.2: 折叠 / 展开

As a 排障用户,
I want 折叠/展开单个 span 子树，以及全部折叠/展开、逐层折叠/展开,
So that 在深层 trace 里聚焦关注的分支。

**Acceptance Criteria:**

**Given** 已渲染的多层 trace
**When** 点击某 span 的折叠控件
**Then** 其所有 `depth>当前` 后代行不再渲染，折叠态有图标 + 子代计数标识（FR-4）
**And** 表头"全部折叠"后只剩根级；"全部展开"后全部可见；逐层按钮生效（FR-5）

### Story 2.3: 拖拽缩放时间窗

As a 排障用户,
I want 在时间线视图层按下拖拽以缩放当前时间窗,
So that 放大关注的时间区间。

**Acceptance Criteria:**

**Given** 时间线表头的 ViewingLayer（基于 DraggableManager）
**When** 在其上按下并拖拽出一段区间
**Then** 产生新的 viewRange [start,end]∈[0,1]，瀑布条与刻度随之重映射（FR-8）
**And** 处于缩放态时超出视口的条两端显示裁剪提示（clippingLeft/Right）

### Story 2.4: 列宽拖拽

As a 使用方,
I want 拖拽名称列与时间列间的分隔条调整列宽,
So that 按需分配标签与瀑布的显示空间。

**Acceptance Criteria:**

**Given** 列宽分隔条（TimelineColumnResizer）
**When** 拖拽分隔条并释放
**Then** 名称列占比改变、瀑布区相应增减，释放后保持（FR-9）

### Story 2.5: 滚动定位到指定 span

As a 使用方,
I want 设置 `focusedSpanId` 时视图滚动到该 span,
So that 从外部（如搜索/列表）定位到具体 span。

**Acceptance Criteria:**

**Given** 一个超出视口的目标 spanID
**When** 设置 `focusedSpanId` 为该值
**Then** 视图滚动到该 span 且不被表头遮挡（补偿 headerHeight）（FR-7）
**And** 首次仅滚动一次，后续 focusedSpanId 变化时再滚

## Epic 3: Span 详情面板

点击 span 展开详情，查看 tags/process/logs/references/warnings/stackTraces。

### Story 3.1: 详情展开与详情行

As a 排障用户,
I want 点击 span 切换其详情行的显示,
So that 查看该 span 的详细信息。

**Acceptance Criteria:**

**Given** DetailState + useDetailState + SpanDetailRow 就位
**When** 点击某 span 切换详情
**Then** 在该 span 行下方插入详情行；含 logs 时行高用 detailWithLogs(197) 否则 detail(161)（FR-10；AD-12）
**And** 详情状态不可变更新、多 span 详情互不影响

### Story 3.2: 详情卡与子分组独立折叠

As a 排障用户,
I want 详情卡内 tags/process/logs/references/warnings/stackTraces 各自可独立展开折叠,
So that 按需查看不同维度信息。

**Acceptance Criteria:**

**Given** SpanDetail + AccordianKeyValues + AccordianLogs + AccordianReferences 就位
**When** 切换任一子分组
**Then** 该分组展开/折叠且不影响其他分组（FR-11）
**And** tags/process 以键值表渲染，logs/references/warnings 以可折叠分组渲染（FR-10）

### Story 3.3: 键值表与 JSON 着色

As a 排障用户,
I want tag/log 值若为 JSON 结构则语法着色展示,
So that 复杂结构化值可读。

**Acceptance Criteria:**

**Given** KeyValuesTable + jsonMarkup + DOMPurify + TextList 就位
**When** 渲染一个值为 JSON 的 tag
**Then** key/string/number/bool/null 有区分样式，HTML 经 DOMPurify 净化（FR-12）

## Epic 4: 搜索过滤 + 错误/状态语义

搜索高亮/只看匹配/空态；状态 pill、错误计数、关键路径、RPC 合并、Color-by。

### Story 4.1: 搜索与只看匹配

As a 排障用户,
I want 输入查询匹配 span 并高亮命中、可只看匹配,
So that 在大 trace 里快速定位。

**Acceptance Criteria:**

**Given** useSearch（剥离 Redux/Explore，仅本地）+ filter-spans + SearchBar
**When** 输入查询（服务名/操作名/tags 等）
**Then** 命中 span 行高亮、可在命中间定位（FR-13）
**And** 开"只看匹配"后仅渲染命中；无命中时显示明确空态提示（FR-14；AR-12）

### Story 4.2: 错误标识与 HTTP 状态 pill

As a 排障用户,
I want 错误 span 显示 ⚠、行内显示 HTTP 状态 pill、工具条有 Errors 计数开关,
So that 一眼识别错误与状态。

**Acceptance Criteria:**

**Given** RenderableRow 提供 isError/descendantHasError/httpStatus
**When** 渲染含错误/带状态码的 span
**Then** 错误 span/错误路径显示 ⚠；折叠父 span 时子树含错也提示（FR-15）
**And** 行内 HTTP 状态 pill 圆角 4px、按状态码配色（2xx 绿/3xx 蓝/4xx 橙/5xx 红）（FR-26；UX-DR3,4）
**And** 工具条 `Errors N` 计数开关可只看错误（复用搜索过滤）

### Story 4.3: 关键路径高亮

As a 排障用户,
I want 传入关键路径区段时在瀑布条上高亮、折叠时合并显示,
So that 直接看到决定总耗时的链路。

**Acceptance Criteria:**

**Given** CriticalPath（直接移植，含 utils/*）计算出区段
**When** 渲染带关键路径的 trace
**Then** 关键路径区段在条上以区分样式渲染（FR-16）
**And** 折叠 span 时合并显示其后代关键路径

### Story 4.4: RPC 合并与外部服务推断

As a 排障用户,
I want 折叠 client span 时显示其 server 子 span 对端信息、叶子 client+peer.service 标注外部服务,
So that 折叠态下仍看清跨服务调用。

**Acceptance Criteria:**

**Given** core 经 findServerChildSpan/peer.service 把对端 `process` 等数据放入 RenderableRow.rpc（无颜色）
**When** 折叠一个含 server 子的 client span
**Then** presentation 用 colorAccessor 对 rpc.process 着色并显示对端服务名/操作名（FR-17；AD-6）
**And** 满足条件的叶子 client span 标注 peer service 名与配色

### Story 4.5: Color-by 维度切换

As a 使用方,
I want 工具条 `Color by` 下拉切换着色维度（Service 默认）,
So that 按需改变瀑布配色维度。

**Acceptance Criteria:**

**Given** colorAccessor 抽象 + colorBy 下拉
**When** 选择 `Service`（v1 唯一实现）
**Then** 瀑布条按服务分类色着色（FR-27；UX-DR5）
**And** 允许传入自定义 colorAccessor；下拉其余维度占位

## Epic 5: DataFox 数据接入 + 深耦合 stub

接 DataFox 真实数据；详情头 HttpRequestBar；深耦合外壳 + 注入回调。

### Story 5.1: DataFox 适配器 fromDataFox

As a 使用方,
I want `fromDataFox(resp): Trace` 把 DataFox 响应（DataFrame 列式/OTLP 字段）转成内部 Trace,
So that DataFox 数据可直接渲染。

**Acceptance Criteria:**

**Given** 一份 DataFox `/spans/search` 响应 fixture（DataFrame 列式）
**When** 调用 `fromDataFox(resp)`
**Then** 列式→行式，按 `parent_span_id` 建父子 references、孤儿父按 root，attrs_raw JSON.parse→tags/process，events→logs（FR-22）
**And** 时间单位 ms/ns→µs 在边界归一化，复用 Apache transform 派生 depth 等

### Story 5.2: fetchTrace 取数助手

As a 使用方,
I want 可选 `fetchTrace(traceId, {from,to,baseUrl,fetch?})` 助手,
So that 不必自写 HTTP 即可从 DataFox 拉单条 trace。

**Acceptance Criteria:**

**Given** `data/datafox/client` + DataFox mock fixture
**When** 调 `fetchTrace('<id>', {from:'now-1h',to:'now',baseUrl})`
**Then** POST `/api/v3/spans/search`，body `filter.query="trace_id:<id>"`，响应经 fromDataFox 返回 Trace（FR-29；AD-14）
**And** `fetch` 可注入（默认全局 fetch）、baseUrl 必填；`<TraceTimeline>` 仍 props 驱动不内置请求
**And** Storybook/测试用 mock fixture，不依赖真实网络

### Story 5.3: 详情头 HttpRequestBar 风格

As a 使用方,
I want 详情头按 DRUIDS HttpRequestBar 风格显示 method pill + url + 状态 pill,
So that 详情头观感对标 Datadog。

**Acceptance Criteria:**

**Given** span 含 method/url/status
**When** 展开详情
**Then** 详情头渲染 method pill + url + HTTP 状态 pill（UX-DR11）

### Story 5.4: 深耦合功能 stub（火焰图/分享/链接）

As a 集成方,
I want 火焰图/Profiles/span-links/分享按钮只渲染外壳并走可注入回调,
So that 我能把这些动作接到自己的系统而库不内置实现。

**Acceptance Criteria:**

**Given** presentation/stubs（DdFlameGraph 占位 + ShareButton + SpanLinks）
**When** 传入对应回调并点击
**Then** 触发回调并携带 span 上下文（FR-18）
**And** 不传回调时按钮隐藏或 no-op、不报错；火焰图区域显示占位可由回调接管（FR-19）


---

## Epic 8: 数据源即插件（可插拔后端适配器）

把 DataFox 从「内置数据源」抽象为**可插拔适配器**，以适配多种 trace 后端（AD-15）。核心包后端中立；具体适配器走子路径导出。**范围**：契约 + DataFox 重构为契约实例 + 1 个二号适配器（OTLP/JSON）验证契约有效 + 子路径打包 + 文档/demo。**传输层不在范围**（只插件化 decode；取数仍 props 驱动 / AD-14）。

**承袭**：AD-8（数据契约=派生 Trace，适配器为边界）+ AD-14（取数可选助手）。**新增** AD-15。

### Story 8.1: 适配器契约 + DataFox 重构为契约实例

As a 库维护者,
I want 一个后端中立的 `TraceSourceAdapter.decode(raw): TraceResponse` 契约，并把 DataFox 重构成它的实例,
So that 新增后端只需实现 decode，渲染层零改动。

**Acceptance Criteria:**

**Given** model 新增 `adapter.ts`（`TraceSourceAdapter` 接口 + `adaptTrace(adapter, raw): Trace`）
**When** 调 `adaptTrace(datafoxAdapter, resp)`
**Then** 等价于既有 `fromDataFox(resp)`（向后兼容，行为零变化）
**And** `fromDataFox` 拆出 `decodeDataFox(resp): TraceResponse`（只解码不派生）+ `datafoxAdapter={id:'datafox',decode:decodeDataFox}`
**And** `adaptTrace = decode + transformTraceData`；decode 返回 null → adaptTrace 返回 null
**And** typecheck/test 通过，既有 datafox 测试不回归

### Story 8.2: 核心包后端中立 + 子路径导出

As a 集成方,
I want 核心包不打包任何后端专属代码，适配器按子路径 `@datafox/trace-timeline/adapters/datafox` 引入,
So that 我能 tree-shake 掉不用的后端、核心保持中立。

**Acceptance Criteria:**

**Given** tsup 多入口（index + adapters/datafox + adapters/otlp）+ `package.json#exports` 子路径映射
**When** 构建产物
**Then** 主 `dist/index.js` **不含** datafox/otlp 专属符号（`decodeDataFox`/`spans/search`/`resourceSpans` 等 grep=0），仅含契约 `adaptTrace`
**And** `dist/adapters/datafox.*`、`dist/adapters/otlp.*` 自洽可独立引入
**And** 主入口移除 `export * from './data/datafox'`；model 主 barrel 移除 datafox 具体导出，仅导出契约

### Story 8.3: 二号适配器（OTLP/JSON）验证契约

As a 排障用户,
I want 一个 OpenTelemetry OTLP/JSON 适配器,
So that 我能直接渲染 OTel 导出的 trace，并证明契约对异构后端成立。

**Acceptance Criteria:**

**Given** `src/model/adapters/fromOtlp.ts`（`decodeOtlp`/`fromOtlp`/`otlpAdapter`）+ fixture
**When** 解码 OTLP `resourceSpans→scopeSpans→spans`
**Then** resource.service.name 建 process；AnyValue（string/int/bool/array）解包；ns→µs；parentSpanId→references（孤儿父按 root）；status ERROR→statusCode 2 + error tag；kind 数值/字符串→文本；events→logs
**And** 经**同一** `adaptTrace` 产出派生 Trace（depth/services），与 DataFox 路径一致
**And** 空/非法输入→null；单测覆盖各分支

### Story 8.4: 文档 + 多源 demo

As a 适配器作者,
I want 一份"如何写后端适配器"文档 + demo 里切换两个数据源,
So that 我能照着实现自己的后端、并直观看到多源经同一组件渲染。

**Acceptance Criteria:**

**Given** `docs/writing-a-trace-source-adapter.md`（契约/`adaptTrace`/`TraceResponse` 形状/打包约定/两参考实现）
**When** demo 点"数据源"切换按钮
**Then** 主 `<TraceTimeline>` 在 mock ⇄ OTLP（经 `adaptTrace(otlpAdapter, otlpFixture)`）间切换并正确渲染
**And** 浏览器实测 OTLP 源渲染（frontend GET /checkout + payment Charge error span + Errors 计数 + ns→µs 时间轴）
