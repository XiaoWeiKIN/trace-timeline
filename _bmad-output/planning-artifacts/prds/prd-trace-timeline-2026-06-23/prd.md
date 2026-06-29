---
title: Datadog 风格 Trace Timeline 独立 React 组件库
status: draft
created: 2026-06-23
updated: 2026-06-25
---

# PRD: Datadog 风格 Trace Timeline 独立 React 组件库
*Working title — 待确认。*

> **范围转向**：
> - **（2026-06-23）视觉目标 = Datadog Waterfall 风格**，**实现引擎参考 = Grafana TraceTimeline**（虚拟滚动 / span 树 / 数据模型 / 交互）。视觉规格见 `datadog-visual-spec.md`。
> - **（2026-06-25）后端 = DataFox**（放弃"后端无关"硬目标）：实测 `/api/v3/spans/search` 返回 Grafana DataFrame 列式 / OTLP 字段；`fromDataFox` 适配器 + 可选 `fetchTrace` 助手，渲染仍 props 驱动，保留内部 Trace 模型。见架构 AD-8/AD-14。

## 0. 文档目的

本 PRD 面向 PM、组件库维护者，以及下游 BMAD 工作流（架构 → Epic/故事 → Sprint）。它描述构建一个**零 `@grafana/*` 依赖、可在任意 React 项目使用的独立组件库**应具备的**能力与约束**：**外观对标 Datadog Waterfall**，**实现引擎移植/参考 Grafana `TraceTimelineViewer`**（其源自 Jaeger UI）。不描述实现细节——技术"如何做"（依赖替换矩阵、逐文件移植清单、主题子集）见 `addendum.md`；Datadog 视觉令牌见 `datadog-visual-spec.md`。词汇以 §3 术语表为准；功能按特性分组、FR 全局编号；推断处用 `[ASSUMPTION]` 标注并在 §16 汇总。核心输入：plan 文档 `stateful-wibbling-thunder.md` + `datadog-visual-spec.md`（实测）。

## 1. 愿景

分布式追踪的瀑布图是排障时最常用的可视化，但今天高质量的实现（Grafana / Jaeger UI）都深度绑定各自的宿主框架——想在自己的可观测平台、内部工具或 SaaS 里嵌一个"和 Grafana 一样好用"的 trace 瀑布图，要么从零造轮子，要么把半个 Grafana 搬进来。

本组件库把 Grafana 久经打磨的 TraceTimeline **引擎**（虚拟滚动、span 树、时间窗映射、交互）**原样保留、彻底解耦**，再套上 **Datadog Waterfall 的视觉皮肤**（仅顶圆角的瀑布条、服务色缩进竖线、行内 HTTP 状态 pill、Color-by 切换、DRUIDS 调色板与 NotoSans）：一个 `<TraceTimeline trace={...} />` 即可渲染一张**外观对标 Datadog、引擎源自 Grafana** 的完整追踪瀑布视图，且不拖入任何 `@grafana/*` 包。它接收与 Grafana 一致的 `Trace`/`TraceSpan` 数据结构，自带 light/dark 主题并支持自定义主题注入，以 Apache-2.0 对外发布。

对使用方而言，价值是：**用最低的集成成本，得到生产级、视觉与交互接近 1:1 的 trace 瀑布图**，把精力放在自己的数据接入与业务上，而不是重新实现虚拟滚动、时间窗映射和 span 树折叠这些硬骨头。

**市场空白（调研支撑）**：当前 npm 上不存在成熟、后端无关、可直接嵌入的 React span 瀑布图组件——Jaeger UI 与 Grafana 的分叉是仅有的两个"1:1"实现，均为 Apache-2.0，但都深度绑定各自的 Redux/store 与数据通道（Grafana 入口吃 `DataFrame[]`），无法干净复用。本库正是要填补这个空白：抽取经过验证的核心、用标准数据契约替换 Grafana 数据通道、把主题与 `@grafana/ui` 解耦。

## 2. 目标用户

### 2.1 Jobs To Be Done
- 作为**可观测平台/APM 产品的前端工程师**，我要在自家产品里嵌入一个成熟的 trace 瀑布图，而不引入 Grafana 整套依赖或自研。
- 作为**内部工具/平台团队**，我要给排障页面快速加上"看一条 trace 的瀑布展开"的能力，且能接我们已有的 trace 数据格式。
- 作为**组件库使用者**，我要清晰稳定的 TypeScript API、可控的主题、可预期的版本与体积，能放心升级。
- 作为**集成方**，我要能把详情面板里的"跳转 profiles / 关联日志 / 分享 span"等动作，接到我自己的路由与后端上（而库不替我决定这些）。

### 2.2 非目标用户（v1）
- 需要**数据采集/查询**能力的用户：本库只负责渲染，不负责拉取、查询、聚合 trace（数据由调用方提供）。
- 需要**完整 Grafana Explore/面板**体验（minimap 总览、trace 对比、节点图、服务图等）的用户：v1 聚焦时间线瀑布图本身。
- 需要**非 React 框架**（Vue/Angular/原生）直接使用的用户：v1 仅 React。

### 2.3 关键用户旅程

- **UJ-1. 周明给自家 APM 控制台嵌入 trace 瀑布图。**
  - **角色 + 背景：** 周明是某可观测 SaaS 的前端，控制台已有 trace 列表，缺"点开一条看瀑布"。
  - **进入状态：** 已有后端返回的 trace JSON；React 18 项目，用 emotion。
  - **路径：** `npm i` 本库 → 把后端 JSON 适配成 `Trace` → `<ThemeProvider><TraceTimeline trace={trace} /></ThemeProvider>` → 按钮接上自家 dark 主题。
  - **高潮：** 列表点击后右侧渲染出与 Grafana 几乎一致的瀑布图，span 条按时间正确铺开，可折叠、可点开详情。
  - **解决：** 周明只写了数据适配与一个主题切换，没碰任何渲染逻辑。

- **UJ-2. 李婷在一条 800+ span 的深层 trace 里定位错误根因。**
  - **角色 + 背景：** 李婷在排查一个跨多服务、调用很深的慢请求。
  - **进入状态：** 已渲染出完整 trace。
  - **路径：** 全部折叠 → 顺着耗时最长的分支逐层展开 → 搜索框输入服务名/错误关键字，命中行高亮 → 打开"只看匹配" → 点开命中的 error span 看 tags/logs。
  - **高潮：** 红色错误图标 + 关键路径高亮把根因 span 一眼锁定；详情里的 stack trace 印证。
  - **解决：** 在不卡顿（虚拟滚动）的前提下完成定位。
  - **边界：** 若搜索无命中，过滤后列表为空并给出明确提示，而非空白。

- **UJ-3. 集成方把详情面板的"跳转 Profiles"接到自己的系统。**
  - **角色 + 背景：** 平台团队希望点 span 上的"火焰图/Profiles"按钮时跳到自家 profiling 页面。
  - **进入状态：** 详情面板已显示这些深耦合功能的按钮外壳。
  - **路径：** 给 `<TraceTimeline>` 传入 `createSpanLink` / `onProfileOpen` 等回调 → 点击按钮触发回调，库不内置任何 datasource 逻辑。
  - **高潮：** 按钮位置/样式与 Grafana 一致，但行为完全由集成方掌控。
  - **解决：** 不传回调时按钮走默认 no-op（或隐藏），不报错。

## 3. 术语表

- **Trace（追踪）** — 一次分布式请求的完整记录，由一个根 Span 及其后代组成。对应数据结构 `Trace`。
- **Span（跨度）** — Trace 中的一个操作单元，含起止时间、服务、操作名、tags、logs、references。对应 `TraceSpan`。一个 Trace 含 1..N 个 Span。
- **瀑布条（Span Bar）** — 单个 Span 在时间线上按 [起始, 结束] 映射出的横条。
- **时间线表头（Timeline Header）** — 顶部刻度尺，含时间刻度、折叠/展开控制、列宽分隔。
- **视图区间（View Range）** — 当前时间窗 [0,1] 归一化缩放范围，决定瀑布条的可见映射。
- **行（Row）** — 列表中的一项；一个 Span 对应一行瀑布条行，展开后额外对应一行详情行。
- **详情面板（Span Detail）** — 展开某 Span 后显示其 tags/logs/process/references/warnings 的区域。
- **关键路径（Critical Path）** — Trace 中决定总耗时的 Span 区段集合，可在瀑布条上高亮。
- **RPC 合并** — 折叠 client Span 时，把其 server 子 Span 的对端服务信息并入同一条显示。
- **受控/非受控** — 交互状态（折叠集合、详情展开、视图区间等）由调用方管理（受控）或由库内部管理（非受控）。
- **主题（Theme）** — 一组驱动配色/间距/排版的令牌；库内置 light/dark，并支持调用方注入覆盖。
- **深耦合功能** — 原本绑定 Grafana 应用的能力：火焰图、Profiles 跳转、插件扩展 span links、分享按钮。本库只保留其 UI 外壳 + 可注入回调。

## 4. 特性

### 4.1 时间线与瀑布条渲染
**描述：** 库的核心。给定一个 `Trace`，渲染顶部时间线表头（含刻度）与每个 Span 的瀑布条；条的水平位置/宽度由 Span 时间相对当前视图区间映射得到，颜色按服务区分。实现 UJ-1。使用术语表词汇。

**Functional Requirements:**

#### FR-1：渲染 Trace 为瀑布图
调用方传入合法 `Trace`，库渲染出时间线表头 + 全部可见 Span 的瀑布条。实现 UJ-1。
**Consequences (testable):**
- 每个 Span 渲染为一行，左列显示服务名/操作名，右列显示瀑布条。
- 瀑布条的 left/width 与 `(span.startTime, span.startTime+duration)` 相对 trace 时间窗成正比；视图区间为 [0,1] 时根 Span 横跨满宽。
- 相邻同服务的 Span 不重复显示服务名；不同服务切换时显示。

#### FR-2：时间线刻度表头
表头按当前视图区间显示 N 个时间刻度与对应耗时标签。
**Consequences (testable):**
- 默认 5 个刻度（含两端），标签为人类可读耗时（µs/ms/s）。
- 缩放后刻度标签随视图区间更新。

#### FR-3：服务配色稳定一致（Datadog 分类色板）
同一服务在整图中颜色一致，且相邻 Span 颜色具备可读对比。使用 **Datadog 分类调色板**（见 `datadog-visual-spec.md` §3.1：橙 #FCAF2B、紫 #C68CCD、绿 #50931F、品红 #CC3C71、棕褐 #DD8451、鲑红 #C86B74…），而非 Grafana classic 色板。
**Consequences (testable):**
- 同 `serviceName` 多次出现颜色相同；按服务名稳定分配。
- 取色逻辑沿用 Grafana `color-generator` 的稳定散列+相邻去重规则（`readability ≥ 1.5`），但**色值替换为 Datadog 分类色板**。

### 4.2 Span 树折叠 / 展开
**描述：** Span 以父子树呈现，可按子树折叠/展开，单个或全局。实现 UJ-2。

#### FR-4：折叠/展开单个 Span 子树
点击 Span 行的折叠控件，隐藏/显示其所有后代。
**Consequences (testable):**
- 折叠后该 Span 的所有 `depth > 当前` 后代行不再渲染，直到深度回到折叠点以上。
- 折叠态有明确视觉标识（如折叠图标 + 子代计数）。

#### FR-5：全部折叠/展开、逐层折叠/展开
表头提供"全部折叠""全部展开""折叠一层""展开一层"控制。
**Consequences (testable):**
- "全部折叠"后只剩根级可见；"全部展开"后所有 Span 可见。

### 4.3 虚拟化滚动
**描述：** 大 trace 下只渲染视口内（含缓冲）行，保证性能。实现 UJ-2。

#### FR-6：行虚拟化
列表仅渲染可见区域 + 上下缓冲区内的行。
**Consequences (testable):**
- 给定 1000+ Span 的 trace，DOM 中实际渲染的行数远小于总行数（约等于视口可见数 + 缓冲）。
- 滚动时行复用，不出现整列表重建。

#### FR-7：滚动定位
支持滚动定位到指定 Span（如聚焦/搜索命中），并补偿表头高度避免被遮挡。
**Consequences (testable):**
- 设置 `focusedSpanId` 后视图滚动到该 Span 且不被表头覆盖。

### 4.4 视图缩放、导航与列宽
**描述：** 通过表头的"视图层"拖拽缩放时间窗，并可拖拽调整左侧名称列宽。实现 UJ-2。

#### FR-8：拖拽缩放时间窗
在时间线视图层按下并拖拽，缩放当前视图区间。
**Consequences (testable):**
- 拖拽产生新的 [start,end]∈[0,1]，瀑布条与刻度随之重映射。
- 处于缩放态时，超出视口的条两端显示裁剪提示。

#### FR-9：列宽拖拽
拖拽名称列与时间列之间的分隔条调整列宽。
**Consequences (testable):**
- 拖拽改变名称列占比，瀑布条区域相应增减；释放后保持。

### 4.5 Span 详情面板
**描述：** 点击 Span 展开详情，显示 tags、logs、process、references、warnings、stack traces，并保留深耦合功能的外壳。实现 UJ-2、UJ-3。

#### FR-10：展开/折叠 Span 详情
点击 Span 行切换其详情行的显示。
**Consequences (testable):**
- 展开后在该 Span 行下方插入详情行；含 logs 时行高更大。
- tags/process 以键值表渲染，logs/references/warnings 以可折叠分组渲染。

#### FR-11：详情内子分组独立折叠
tags、process、logs、references、warnings、stack traces 各自可独立展开/折叠。
**Consequences (testable):**
- 切换任一分组不影响其他分组状态。

#### FR-12：键值/JSON 友好展示
tag/log 字段值若为 JSON 结构，做语法着色展示。
**Consequences (testable):**
- JSON 值的 key/string/number/bool/null 有区分样式。

### 4.6 搜索、过滤与高亮
**描述：** 输入关键字匹配 Span，命中高亮，并可"只看匹配"。实现 UJ-2。

#### FR-13：搜索并高亮命中
输入查询，匹配的 Span 行高亮。
**Consequences (testable):**
- 匹配基于 Span 的服务名/操作名/tags 等字段（沿用源实现的匹配规则）。
- 命中行有可见高亮；可在命中间定位。

#### FR-14：只看匹配项
开启后仅渲染命中的 Span。
**Consequences (testable):**
- 开启后非命中 Span 不出现在列表。
- 无命中时给出明确空态提示（UJ-2 边界）。

### 4.7 语义增强
**描述：** 错误标识、关键路径高亮、RPC 合并、未插桩外部服务推断。实现 UJ-2。

#### FR-15：错误 Span 标识
错误 Span 显示错误图标；折叠时若子孙含错误也在父条提示。
**Consequences (testable):**
- `isErrorSpan` 为真的 Span 显示错误图标。
- 折叠父 Span 时，其后代含错误则父条显示错误提示。

#### FR-16：关键路径高亮
传入关键路径区段时在对应瀑布条上高亮；折叠时合并显示后代关键路径。
**Consequences (testable):**
- 关键路径区段在条上以区分样式渲染。
**Notes:** 内部工具、无许可证义务（§13）——`CriticalPath` **直接原样移植**（含 `CriticalPath/utils/*`），不重写。

#### FR-17：RPC 合并与外部服务推断
折叠 client Span 时并入其 server 子 Span 的对端信息；叶子 client + `peer.service` 时标注外部服务。
**Consequences (testable):**
- 折叠的 client Span 显示对端 server 的服务名/操作名/颜色。
- 满足条件的叶子 client Span 标注 peer service 名与配色。

### 4.8 深耦合功能外壳（stub）
**描述：** 火焰图、Profiles 跳转、插件扩展 span links、分享按钮——保留与 Grafana 一致的按钮/菜单位置与样式，行为走可注入回调，默认 no-op。实现 UJ-3。

#### FR-18：可注入的链接/动作回调
详情面板的火焰图、Profiles、span links、分享等动作均通过 props 回调暴露。
**Consequences (testable):**
- 传入对应回调时点击触发回调并携带 Span 上下文。
- 不传回调时按钮可隐藏或为 no-op，且不抛错。

#### FR-19：火焰图占位
火焰图区域渲染占位/外壳，不内置火焰图实现。
**Consequences (testable):**
- 火焰图区域有可见占位；可由回调接管渲染。
**Out of Scope:** 不复刻 `@grafana/flamegraph` 的火焰图渲染本身。

### 4.9 主题系统
**描述：** 内置 light/dark 两套主题，经 `ThemeProvider` 提供，并允许注入部分覆盖。实现 UJ-1。

#### FR-20：内置 light/dark 主题
通过 Provider 选择 light/dark，组件全量响应。
**Consequences (testable):**
- 切换主题后配色/背景随之变化，无残留硬编码色导致的对比问题。

#### FR-21：自定义主题注入
调用方可传入主题对象覆盖内置令牌的子集。
**Consequences (testable):**
- 注入的令牌生效并与内置令牌合并；未覆盖项回退内置值。

### 4.10 数据输入与受控/非受控 API
**描述：** 接收与 Grafana 一致的 `Trace`/`TraceSpan` 结构；交互状态默认由库内部管理（非受控），同时允许受控接管。实现 UJ-1、UJ-3。

#### FR-22：数据契约 = 内部 Trace + DataFox 适配器
渲染层只认内部派生 `Trace`（含派生字段，时间微秒）。具体后端 = **DataFox**（`/api/v3/spans/search`，返回 Grafana DataFrame 列式 / OTLP 字段）。
**Consequences (testable):**
- 传入符合 `Trace` 类型的数据即可渲染，无需额外配置。
- 提供 `fromDataFox(resp): Trace` 适配器：解析 DataFrame 列（`trace_id/span_id/parent_span_id/timestamp(ms)/duration(ns)/span_kind/status_code/exception_*/{resource,span}_attributes_raw/events.*`），由 `parent_span_id` 建父子（**孤儿父按 root**），复用派生逻辑得 `Trace`；单位 ms/ns→**µs** 在此归一化。
- 适配器自写列式解析，派生复用 Apache `transform-trace-data`。
**Out of Scope（v1）：** 非 DataFox 的其他后端适配（"后端无关"非目标，但保留 `model/adapters/` 边界以便未来加）。

#### FR-29：可选 DataFox 取数助手
提供独立的 `fetchTrace` 助手，库本身仍 props 驱动（不强制内置网络）。
**Consequences (testable):**
- `fetchTrace(traceId, {from,to,baseUrl,fetch?}): Promise<Trace>`：POST `/api/v3/spans/search`，`filter.query="trace_id:<id>"`，响应经 `fromDataFox`。
- `fetch` 可注入（默认全局 fetch）、`baseUrl` 必填；`<TraceTimeline>` 不内置请求，宿主可用助手或自拉。
- Storybook/单测用 mock fixture，不依赖真实网络。

#### FR-23：非受控默认 + 受控可选
不传状态 props 时库自管折叠/详情/视图区间/列宽/搜索；传入对应 props + 回调时由调用方接管。
**Consequences (testable):**
- 仅传 `trace` 即可完整交互（非受控）。
- 传入受控 props 时库不再内部改写该状态，改为触发回调。

### 4.11 Datadog 视觉皮肤（本次转向新增）
**描述：** 在 Grafana 引擎之上实现 Datadog Waterfall 的外观与若干交互。详见 `datadog-visual-spec.md`。

#### FR-24：Datadog 瀑布条样式
瀑布条按 Datadog 规格渲染。
**Consequences (testable):**
- 条圆角 **`2px 2px 0 0`（仅顶部两角）**、高 ~18-19px、无边框；条与行有上下间隙（top/bottom gap）。
- 条按服务分类色填充（FR-3）；duration 文本在条旁显示。

#### FR-25：服务色缩进连接线
父子层级用**服务色竖线**做缩进引导（取代 Grafana 灰色折叠树线）。
**Consequences (testable):**
- 子 Span 左侧出现与其所属/父服务色一致的竖线缩进，深度越深竖线越多。

#### FR-26：行内 HTTP 状态 Pill 与错误标识
错误/HTTP 状态用 DRUIDS 风格 pill + 错误图标 + 错误计数表达。
**Consequences (testable):**
- 行内显示 HTTP 状态 pill（圆角 4px）：2xx 绿 / 3xx 蓝 / 4xx 橙 / 5xx 红（如 `500` 红底）。
- 错误 span/错误路径显示 ⚠ 图标；工具条显示 `Errors N` 计数开关，可只看错误（复用 FR-14 过滤）。

#### FR-27：Color by 维度切换
着色维度可切换（至少 Service；预留 duration/其他）。
**Consequences (testable):**
- 提供 `Color by` 下拉，切换后瀑布条配色按所选维度重新着色。
**Out of Scope（v1）：** 非 Service 维度的具体着色算法可 v2 细化；v1 至少实现 Service。`[ASSUMPTION: v1 Color by 仅 Service，下拉占位其余维度]`

#### FR-28：DRUIDS 视觉令牌（配色/排版/密度）
整体配色、排版、密度对齐 DRUIDS（见 `datadog-visual-spec.md` §3.2-§4）。
**Consequences (testable):**
- 面板底 `rgb(249,250,251)`、选中行 `rgb(234,246,252)`、文本透明度阶（.98/.68/.5/.35）、刻度 NotoSans 12px。
- 高密度小字号布局观感与 Datadog 一致。

## 5. 非目标（显式）
- 不做通用数据**采集/聚合**；数据来自 DataFox（`fromDataFox` 适配 + 可选 `fetchTrace` 助手，FR-22/29）。
- 不做**后端无关**（已非目标）；只对接 DataFox，但保留内部 Trace + 适配边界。
- 不做 **DataFox trace-list / 多 trace 搜索视图**；v1 聚焦单 trace 瀑布，宿主负责列表与选中 traceId。
- 不内置**真实**的火焰图 / Profiles / datasource 驱动的 span links / 分享逻辑（仅外壳 + 回调）。
- v1 不支持 **React 以外**的框架。
- 不复刻 Grafana 的 **trace minimap 总览、trace 对比、节点/服务关系图**。
- 不提供**国际化文案翻译**包（仅保留可替换的文案注入点，默认英文）。`[ASSUMPTION: i18n 仅做注入点，不内置多语言包]`
- 不保证与 Grafana 像素级完全一致；目标是**接近 1:1** 的观感与交互。

## 6. MVP 范围

### 6.1 In Scope
- §4.1–4.7 全部能力（瀑布渲染、折叠、虚拟滚动、缩放/列宽、详情面板、搜索过滤、语义增强）。
- §4.8 深耦合功能的**外壳 + 回调**（stub）。
- §4.9 主题（light/dark + 注入）。
- §4.10 数据契约与受控/非受控 API。
- **ESM + `d.ts`** 构建产物（内部包，去 CJS）；React 作 peer。
- mock 数据 + DataFox 实数驱动的可运行 demo + 关键逻辑单测 + README（**去 Storybook**，内部工具）。

### 6.2 Out of Scope for MVP
- 真实火焰图/Profiles/datasource 链接实现（v2，按需）。
- 非 React 适配（无计划）。
- 内置多语言包（v2，按需）。`[NOTE FOR PM]` i18n 注入点要预留好，否则后续补多语言成本高。
- trace minimap / 对比 / 关系图（无计划）。

## 7. 成功指标

**Primary**
- **SM-1**：集成成本 — 一个会用 React 的工程师，从 `npm i` 到渲染出第一张瀑布图 ≤ 30 分钟（仅写数据适配与挂载）。验证 FR-1、FR-22、FR-23。
- **SM-2a**：行为保真 — §末"功能保真验收清单"自动/手动行为项 100% 通过。验证 FR-1..FR-23。
- **SM-2b**：视觉保真 — 按 §14 视觉并排核对流程，与 Grafana 同数据参考截图逐元素核对，关键元素（条位置/刻度/折叠图标/详情排版/错误红/关键路径/缩放手感）人工 checkpoint 评审通过，无"明显版式漂移/对比退化"。验证 §14。
- **SM-3**：渲染性能（可量化）— 在基准机（定义见架构阶段）渲染 1000-span trace 时：① 挂载后 DOM 中瀑布条行数 ≤ 视口可见行数 + 2×缓冲(BUFFER_SIZE=33)；② 首屏可交互 ≤ 200ms；③ 连续滚动帧时间 p95 ≤ 20ms（≈50fps）。验证 FR-6。`[ASSUMPTION: 200ms/20ms 为初定阈值，架构阶段据基准机校准]`

**Secondary**
- **SM-4**：~~体积预算~~ 内部工具，不设硬性体积指标（合理即可）。
- **SM-5**：零 `@grafana/*`/`app/*` npm 依赖 — 源码 import 中不含（移植源码+换 import 实现）。验证 §11。

**Counter-metrics（不要优化）**
- **SM-C1**：不可为压体积而牺牲 §4 的功能/视觉保真（SM-2a/SM-2b）。反向制衡 SM-4。
- **SM-C2**：不可为"30 分钟集成"（SM-1）而过度收窄 API 导致受控场景（UJ-3）无法接入。反向制衡 SM-1。

## 8. API 契约 / 公共表面
- **主组件** `<TraceTimeline>`：必填 `trace: Trace`；可选交互受控 props（折叠集合、详情状态、视图区间、列宽、搜索）及对应回调；可选深耦合回调（`createSpanLink`、profiles/分享等）；可选 `options`（如 span bar 标签来源）。
- **主题**：`<ThemeProvider theme?>`、`createTheme({ colorMode, override? })`、`useTheme`。
- **数据**：`fromDataFox(resp): Trace` 适配器、`fetchTrace(traceId, opts): Promise<Trace>` 可选助手、`Trace`/`TraceSpan` 等类型导出。
- **稳定性**：以上为公共表面，遵循 §9 版本策略；内部子组件（VirtualizedTraceView/ListView 等）不属公共 API。
- `[ASSUMPTION: 公共表面以 TraceTimeline + ThemeProvider + transformTraceData + 类型为主，子组件不导出]`

## 9. 版本与弃用策略
- **内部工具，不做正式 SemVer/弃用策略**；按内部需要演进，破坏性变更走内部沟通即可。

## 10. 性能预算
- 1000+ Span trace：首屏 ≤ 既定阈值、滚动 60fps 目标；虚拟滚动确保 DOM 行数与视口成正比（FR-6）。
- 体积：gzip 后核心库（不含 react peer）控制在合理预算内。`[ASSUMPTION: 具体 KB 阈值在架构阶段确定，初定核心 ≤ 80KB gzip]`

## 11. 运行时目标与依赖策略
- **运行时**：React（项目实际版本，作 peerDependency）。现代浏览器（见 §12）。**构建仅 ESM**（内部包）。
- **依赖策略**：**零 `@grafana/*`、零 `app/*`**；允许的第三方：`@emotion/css`、`classnames`、`lodash`（按需）、`memoize-one`、`tinycolor2`、`lucide-react`、`dayjs`、`dompurify`。
- TypeScript 严格模式；产物含 `d.ts`。

## 12. 跨切面 NFR
- **可访问性**：键盘可达的折叠/展开与详情切换；图标含可读标签；对比度满足主题切换后仍达标。`[ASSUMPTION: a11y 目标对齐 WCAG AA，具体审计在架构阶段细化]`
- **国际化**：所有用户可见文案经统一注入点（默认英文），便于调用方替换。
- **浏览器**：最近两个版本的 Chrome/Edge/Firefox/Safari。
- **样式隔离**：使用 emotion 运行时，className 带 label，避免与宿主样式冲突。
- **SSR**：`[ASSUMPTION: v1 以 CSR 为主，SSR 兼容为尽力而为，不作硬性保证]`

## 13. 约束与护栏（许可）
- **内部工具、不对外分发/不对外提供网络服务** → AGPL copyleft **不触发**，无重写/开源/NOTICE 义务（详见架构 AD-9）。
- 因此 **Grafana 代码（含 CriticalPath、filter-spans adhoc、useSearch 等原疑似 AGPL 部分）一律原样移植**，不再重写规避。
- 基本尊重：移植文件**保留原版权头**；不产出 `LICENSE-AUDIT.md`、不做 Apache-2.0 发布。
- 不修改 Grafana 源仓库代码；新库置于隔离目录。

## 14. 观感与保真
- **视觉目标 = Datadog Waterfall**（`datadog-visual-spec.md`）；**交互/引擎参考 = Grafana**。视觉与交互**接近 Datadog**：仅顶圆角瀑布条、服务色缩进竖线、行内 HTTP 状态 pill、Color-by、刻度、详情头(HttpRequestBar 风格)、DRUIDS 配色与 NotoSans、高密度布局。
- 反例（要避免）：套用 Grafana 外观（直角条/灰树线/Grafana 色板）、明显版式漂移、配色对比退化、滚动卡顿。
- **视觉保真验收流程（支撑 SM-2b）**：① 用同一份 mock trace 在本库 demo 渲染，与 **Datadog Waterfall 参考截图**并排（`datadog-visual-spec.md` §8）；② 按核对清单逐元素比对——条圆角/高度/间隙、服务色缩进竖线、刻度与标签、HTTP 状态 pill 配色、错误 ⚠/Errors 计数、选中行蓝底、Color-by、详情头排版、light/dark；③ 偏差分级（可接受像素差 / 需修明显漂移），明显漂移必修；④ 人工 `bmad-checkpoint` 签字。像素级完全一致非目标。

## 15. 开放问题
1. 性能预算的**具体数值**（首屏 ms、体积 KB）——架构阶段定。
2. a11y 的**目标等级与审计范围**——架构阶段定。
3. 受控 API 的**粒度**（已给默认，架构阶段可调）：v1 默认——`focusedSpanId`、搜索查询为可受控，外加"全量受控逃生舱"（调用方可传完整 `TTraceTimeline` 状态 + 全部 toggle 回调接管）；其余（列宽、hover 引导线等）仅非受控。
4. SSR 是否需要硬性支持。
5. 详情面板行高用固定常量（源码即如此）——内容超长是否需要改进，还是保持与源码一致。
6. 包名与发布渠道（私有 registry / 公开 npm）。
7. ~~许可证策略~~ **已定**：保 Apache-2.0 纯净，自研增量（关键路径等）重写/上游移植，见 §13。
8. OTLP 原生适配是否要提前到 v1（影响数据契约设计）。`[暂定 v2]`

## 16. 假设索引
- §5 — i18n 仅做注入点，不内置多语言包。
- §8 — 公共表面以 TraceTimeline + ThemeProvider + transformTraceData + 类型为主，子组件不导出。
- §10 — 核心库体积初定 ≤ 80KB gzip，待架构确认。
- §12 — a11y 目标对齐 WCAG AA，待细化；SSR 为尽力而为。
- §4.10/FR-22 — OTLP 原生适配 `fromOTLP()` 推到 v2，v1 仅 Jaeger JSON 模型；§8 预留适配层边界。
- §7/SM-3 — 性能阈值（200ms 首屏、20ms 帧 p95）为初定值，架构阶段据基准机校准。

---

## 验证（功能保真验收清单，支撑 SM-2）
> 用静态 mock（含错误 span、深层嵌套、跨 span references、1000+ span 性能样本）逐项核对：
- 瀑布条位置/宽度随时间正确映射；表头刻度对齐（FR-1、FR-2）。
- 服务配色稳定且相邻可区分（FR-3）。
- 单个/全部/逐层折叠展开（FR-4、FR-5）。
- 虚拟滚动只渲染视口行；滚动定位生效（FR-6、FR-7）。
- 拖拽缩放时间窗 + 裁剪提示；列宽拖拽（FR-8、FR-9）。
- 详情展开、子分组独立折叠、JSON 着色（FR-10、FR-11、FR-12）。
- 搜索高亮、只看匹配、空态提示（FR-13、FR-14）。
- 错误图标（含折叠传播）、关键路径高亮、RPC 合并、外部服务推断（FR-15、FR-16、FR-17）。
- 深耦合按钮可见、回调触发、无回调不报错；火焰图占位（FR-18、FR-19）。
- light/dark 切换 + 自定义主题注入（FR-20、FR-21）。
- 仅传 trace 即可交互（非受控）；受控接管生效（FR-22、FR-23）。
