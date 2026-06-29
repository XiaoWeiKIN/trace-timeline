# Investigation: Datadog Trace 火焰图（Flame Graph）布局规格（高保真对齐）

## Hand-off Brief

1. **What happened.** 为 trace-timeline 复刻项目「Trace 火焰图视图」(候选 Epic 6) 实测了 Datadog APM Trace 详情页 **Flame Graph** 视图的布局算法、坐标系、配色、导航与交互（Confirmed，经 Chrome DevTools 实测 + canvas 像素采样 + 时间轴标定）。
2. **Where the case stands.** 火焰图 = 同一棵 trace 树的**时间冰柱布局**:**y = 严格调用深度(depth)、x = 线性时间、矩形宽 = 耗时**;canvas 渲染;按 service 配色;复用 profiling minimap 导航 + 可平移/缩放;**底部详情抽屉与 Waterfall 完全共用**。
3. **What's needed next.** 用本文「§6 实现映射」驱动新 Epic 的 story:`DdFlameGraphView`(canvas 或 div 布局 + 复用 `createViewedBoundsFunc` 时间映射 + depth→y + 视图切换 toggle)。**一个未决项**:同深度兄弟 span **时间重叠(真并发/async)** 时的排布未实测(本 trace 无并发)——见 §5 Open Question。

## Case Info

| Field | Value |
| --- | --- |
| Ticket | N/A（布局研究，服务于候选 Epic 6 火焰图视图） |
| Date opened | 2026-06-28 |
| Status | Concluded（基本盘充分；并发重叠 1 项待补测） |
| System | Datadog APM us5，trace `6a3a259d0000000009a3853a6cd91884`，env:prod，`graphType=flamegraph` |
| Evidence sources | 用户 Chrome 实时页面（Chrome DevTools MCP：DOM + **canvas getImageData 像素采样** + 时间轴标定 + 交互） |

## Problem Statement

Datadog trace 详情页支持把 trace 以**火焰图**形式展示(`Flame Graph` tab,与 `Waterfall` 并列)。复刻组件目前只有瀑布视图。要新增「trace 火焰图视图」并 1:1 对齐 Datadog,需实测其**布局算法**(depth→行、时间→x、并发兄弟如何排)、坐标系、配色、导航与交互。约束:Grafana 内核只约束引擎数据(`trace.spans` 的 depth/startTime/duration 现成);火焰图是**纯 presentation 层新视图**,不碰 core/transform。

## Evidence Inventory

| Source | Status | Notes |
| --- | --- | --- |
| 火焰图渲染方式 | Confirmed | **canvas** 绘制(`canvas.trace_component_flamegraph`,DPR-2 backing),非 DOM;条上文字/矩形均为 canvas 像素 |
| 行高 / depth→y | Confirmed | 像素采样:行高 ≈**24px** CSS,**紧贴堆叠无间隙**,yTop = top + depth×24 |
| 严格 depth 布局 | Confirmed | SET(depth2) 与 GET /order(depth2) 共享同一行 → row = 调用深度,非 lane-packing |
| 时间→x 线性映射 | Confirmed | 轴刻度等距(每 5ms 固定 px);按已知耗时反算 18.5ms→18.48 / 8.96ms→8.94,误差 <0.5% |
| 配色 | Confirmed | Color by: **Service**;每 service 一个色相;未插桩/推断 span = **虚线边框** |
| 选中态 | Confirmed | 选中 span = **黑色 ~2px 描边** |
| 导航(minimap/平移/缩放) | Confirmed | 复用 profiling minimap(200×100,可收起);容器 `--can-move` 可拖拽平移;3 个缩放按钮 |
| 底部详情抽屉 | Confirmed | 与 Waterfall **完全共用**(同 span header + Overview/.../Profiles tab + HTTP Requests) |
| 工具条 | Confirmed | Filter 输入 + Color by 下拉 + Hide Legend + 右侧 % Exec Time 图例 |
| **同深度并发兄弟(时间重叠)排布** | **Unconfirmed** | 本 trace 为纯线性嵌套 + 顺序兄弟,无真并发;重叠时是否叠加/推子行未实测 |

---

## §1 整体结构(实测)

火焰图视图 = 顶部 tab 栏 + 工具条 + **canvas 火焰图区(含 minimap)** + 右侧图例 + **底部详情抽屉**。

```
┌ Trace: [Flame Graph] Waterfall  Span List 6  Map ────────────────────┐
├ 🔍 Filter spans by any attribute        Color by [Service ▾] Hide Legend┤
├ ┌minimap┐  0   5ms  10ms ... 50ms (时间轴 ruler)        ┊ % Exec Time ┊
│ │ ▮▮▮▮  │ �═══════════ GET /user 50.6ms ═══════════     ┊ my-order…52.8%┊
│ │ ▮ ▮▮  │  ══════ HelloController.create 47.5ms ════     ┊ 10.121…  18.4%┊
│ └───────┘  ░SET░        ▓▓▓ GET /order 18.5ms ▓▓(选中)   ┊ flux…    18.1%┊
│ [<][－][＋][⊙]              ▒ GET /order 8.96ms ▒         ┊             ┊
│                             ▒ OrderController.hello ▒    ┊             ┊
├──────────────────────────────────────────────────────────────────────┤
│ 🌐 my-order-service → ⊟ 192.0.2.10 via http.request GET /order  ⋮ │ ← 底部抽屉
│ Span: [Overview] Infrastructure Metrics Logs Network Processes Profiles│   (与瀑布共用)
│ > Pinned Span Attributes   ∨ HTTP Requests: Method GET / 200 / URL …  │
└──────────────────────────────────────────────────────────────────────┘
```

- **画布几何**:`canvas.trace_component_flamegraph` CSS 809×102(本窗口 innerW=1200),backing 1618×204(DPR 2)。父容器 `trace-flame-graph trace-flame-graph--can-move`。
- 渲染方式 = **canvas**:条上的 operation 名 / 耗时 / 矩形全是 canvas 像素,DOM 里查不到(只有 minimap、时间轴文字、图例、详情抽屉是 DOM)。

## §2 布局算法(核心,实测)

### 2.1 y 轴 = 严格调用深度

- **行高 ≈ 24px CSS**,**紧贴堆叠、行间无间隙**。`yTop(depth) = canvasTop + depth × 24`。
  - 像素采样实测各行 yTop:row0=277, row1=301, row2=325, row3=349(步长 24)。
- **row = span 的调用深度(depth)**,不是「一行一 span」(那是瀑布)。
- **关键证据(推翻 lane-packing 假设)**:`SET`(5.41ms)与 `GET /order`(18.5ms)**同为 depth 2**(都是 `HelloController.create` 的子),二者在 real time 上不重叠(SET≈3–8ms,order≈30–48ms),实测**共享同一行 row2**。
  - → Datadog 用**严格 depth**,**不做** lane-packing/泳道下推;同深度的多个子 span 只要时间不重叠就同行,各按自己 startTime 摆。

### 2.2 x 轴 = 线性时间

- 时间轴刻度**严格等距**:全貌视图每 5ms 固定像素(实测 0→50ms 区间约 16px/ms;放大视图约 35px/ms)。
- 反算校验(放大视图,30ms@x261 / 50ms@x961,35px/ms):
  - 选中 span 实测宽 → **18.48ms**(标称 18.5ms)✅
  - GET /order(olive)实测宽 → **8.94ms**(标称 8.96ms)✅
  - root 右边缘 → **50.46ms** ≈ trace 终点 50.6ms ✅
- → **可直接复用 core 已移植的 `createViewedBoundsFunc`**(瀑布同款线性时间→[0,1] 映射,含 zoom)。火焰图与瀑布共用同一套时间数学,只是 y 轴换成 depth。
- root 矩形左边缘 = trace 起点(t=0),右边缘 = trace 终点;子 span 左边缘 = 其 startTime。

### 2.3 矩形内容

- 左对齐:**operation 名**(白字,如 `GET /user`、`HelloController.create`、`SET`、`OrderController.hello`)。
- 右对齐:**耗时**(白字,如 `50.6ms`)。
- 宽度不足时文字截断(canvas 内裁剪)。

## §3 配色与状态(实测)

- **Color by: Service**(下拉,与瀑布同款 §4.5 已实现的 DdColorByDropdown)。每 service 一个色相:
  - `my-order-service` → 浅绿 `rgb(87,183,154)`(row0/row1)
  - `192.0.2.10` → 深绿 `rgb(69,117,87)`(row2 选中态读到的填充)
  - `flux-service` → 橄榄绿 `rgb(80,147,31)`(row3/row4)
  - `SET` → 紫/薰衣草(redis 类依赖)
- **选中 span**:**黑色 ~2px 描边**(像素采样在选中行上下各读到 2px 纯黑 `0,0,0`)。
- **未插桩/推断 span**:**虚线边框**(`SET` 紫色虚线框;图例里 `192.0.2.10` 也是虚线圈标记)。
- 右侧 **% Exec Time 图例**:各 service 占比条(my-order-service 52.8% / 192.0.2.10 18.4% / flux-service 18.1%),`Hide Legend` 可收起。

## §4 导航与交互(实测)

| 交互 | 实测 |
| --- | --- |
| **minimap** | 左上角,复用 **profiling minimap 组件**(`profiling_minimap__content`,canvas 200×100);显示整棵 trace 缩略 + 当前视口框;`Collapse minimap` 按钮可收起 |
| **平移(pan)** | 容器 class `trace-flame-graph--can-move` → 鼠标拖拽平移画布 |
| **缩放按钮** | 三个:`Zoom Out to Full Trace`(适配全 trace)、`Zoom In to Selected Span`(放大到选中)、`Focus on Selected Span`(聚焦选中子树) |
| **hover** | 鼠标处 **竖直游标线 + 时间标签**(实测 `39.3ms`);有 tooltip(容器 `trace_flame-graph-with-tooltip`) |
| **点击 span** | 选中(黑描边)→ **更新底部详情抽屉**(与瀑布共用同一抽屉) |
| **时间轴 ruler** | 画布顶部,ms 刻度等距 |
| **视图状态入 URL** | `graphType=flamegraph` + `spanID=…`(可深链/前进后退) |

## §5 与 Waterfall 的共用 / 差异

**共用(零改动复用)**:
- tab 栏 `Flame Graph | Waterfall | Span List N | Map`
- 工具条:`Filter spans by any attribute` 输入 + `Color by` 下拉 + `Hide Legend`
- 右侧 `% Exec Time` service 图例
- **底部详情抽屉 100% 共用**:同 span header(service chip → 对端 via http.request op + 耗时 + ⋮)、`Overview/Infrastructure/Metrics/Logs/Network/Processes/Profiles` tab、`Pinned Span Attributes`、`HTTP Requests`(Method/Status Code/URL/URL Details)。
  - → 复刻项目已有的 `DdSpanDetail` + 底部抽屉(Story 3.4/5.5)**直接复用**,火焰图视图只替换上半部的「瀑布 ↔ 火焰图」。

**差异(火焰图独有)**:
- y 轴 depth 而非 span 序;canvas 渲染;minimap;pan;3 个缩放按钮;hover 竖线游标。
- 火焰图**无折叠列/无名称列/无列宽拖拽**(那些是瀑布表格特性)。

### Open Question(唯一未决)

> **同深度兄弟 span 在时间上重叠(真并发 / async fan-out)时如何排?**
> 本 trace 是纯线性嵌套 + 顺序兄弟(SET 与 order 不重叠),**没有真并发**,故无法实测重叠情形。两种可能:(a) 严格 depth → 重叠的同深度兄弟**视觉叠加**(Datadog 可能就这么做,接受叠加);(b) 局部下推到子行。**§2.1 的强证据偏向 (a) 严格 depth**。
> **建议**:补测一条含并发子 span 的 trace(async/线程池/并行 RPC)确认;在确认前,实现按 **(a) 严格 depth** 做(最忠实、最简单),把重叠处理留为后续增强。

---

## §6 实现映射(驱动候选 Epic 6 / `DdFlameGraphView`)

| 维度 | 实现指引 |
| --- | --- |
| **数据** | 现成:`trace.spans[*]` 已有 `depth` / `startTime` / `duration`。无需碰 core/transform/fromDataFox。 |
| **x / 宽度** | **复用 `createViewedBoundsFunc`**(core 已移植):`{start,end} = fn(span.startTime, span.startTime+span.duration)` → `left%`/`width%`。与瀑布同源,自动支持缩放视口。 |
| **y** | `top = depth × ROW_H`;`ROW_H ≈ 24px`(落 `theme.trace` 令牌,沿用 AD-7/AD-12)。容器高 = `maxDepth × ROW_H`。 |
| **渲染方式** | **建议先用绝对定位 div**(每 span 一个 `<div>` 矩形)而非 canvas:① 复用现有 emotion 皮肤/配色/hover/选中样式;② DOM 可测试(RTL,符合项目 testid 习惯);③ span 数通常 < 数百,div 性能足够。canvas 留作后续大 trace 优化。**(对齐 Datadog 视觉,不必对齐其 canvas 实现细节。)** |
| **配色** | 复用 §4.5 `colorForService` + `DdColorByDropdown`(Service 维度已实现)。 |
| **选中** | 复用 Story 5.5 `selectedSpanId`/`selectSpan`:点矩形 → 选中(黑/主色描边)→ 同一底部抽屉。**与瀑布共享选中态**(切视图保持选中)。 |
| **未插桩 span** | 虚线边框(复用 §4.4 `noInstrumentedServer`/RPC 对端判定)。 |
| **视图切换** | 工具条加 `Waterfall | Flame Graph` toggle(对齐 Datadog tab);切换只换上半区组件,工具条/抽屉/状态容器不变。 |
| **导航(增量)** | MVP 可省 minimap;pan/zoom 用现有 `viewRange` + 滚轮/拖拽(瀑布已有 DraggableManager,可复用手势)。minimap 作为后续 story。 |
| **hover** | 竖线游标 + 时间标签 + tooltip(operation/service/耗时/% exec)。 |
| **AD 合规** | 纯 presentation 新视图;core 引擎/状态容器/详情抽屉零改动;颜色全在 presentation(AD-6);行高令牌走 theme(AD-7)。 |

### 建议 story 切分(候选 Epic 6:火焰图视图)

1. **6.1 火焰图布局引擎 + 静态渲染**:depth→y + 复用 `createViewedBoundsFunc`,div 矩形,按 service 配色,operation/耗时标签,严格 depth(暂不处理重叠)。
2. **6.2 视图切换 + 选中联动**:Waterfall⇄FlameGraph toggle;点矩形 → 共享 `selectedSpanId` → 同一底部抽屉;选中描边。
3. **6.3 时间轴 ruler + hover 游标 + tooltip**。
4. **6.4 pan/zoom**(复用 DraggableManager + viewRange)+ Zoom to Full / Zoom to Selected / Focus。
5. **6.5(可选)minimap 导航**。
6. **(补测后)6.x 并发兄弟重叠排布**——按 Open Question 实测结论实现。

## Follow-up（2026-06-29）：minimap 深度规格（实测，驱动对齐）

用户指出我方 minimap（Story 6.5）与 Datadog 未对齐。Chrome DevTools 重新实测 `profiling_minimap` 的 DOM/几何/样式/交互，结论：

### 形态与几何（DOM 实测）
- 容器 `figure.profiling_minimap__content`：**210×105**，`position:relative`，白底；**与火焰图重叠（overlapWithFlame=true）= 浮在火焰图左上角之上**，不是独立占高的横幅。
- `div.profiling_minimap__content__overlay-mask`：**200×100**，bg `rgba(234,246,252,0.5)`（= 浅蓝 50% 调，等于 theme selectedRowBg）——覆盖整个 minimap 的色调遮罩层。
- `div.profiling_minimap__content__overlay-rect`：**视口框**，bg 透明，**border 1px solid rgb(0,107,194)（Datadog 蓝）**，无子手柄元素。
- minimap 概览本体 = **1 个 canvas**（整 trace 缩略，永远显示全程）。
- minimap 内**停靠按钮**：`Collapse minimap` + `Zoom Out to Full Trace` + `Zoom In to Selected Span` + `Focus on Selected Span`（缩放/聚焦/折叠控件**锚在 minimap 内**，不是独立工具行）。

### 交互模型（实测）
- 视口框与遮罩 `cursor:grab`（拖拽中 `grabbing`）→ **抓取拖动 = 平移视口**。
- overlay-rect **无 resize 手柄**；模拟拖右边缘无变化（x295→298，宽不变）→ **minimap 不做 brush/拖边缩放**。
- **缩放只经 滚轮 + minimap 内 3 按钮**（Zoom Out to Full / Zoom In to Selected / Focus on Selected）；minimap 仅负责**平移 + 概览 + 视口可视化**。
- 收起 = `Collapse minimap` → 浮层折叠成小恢复按钮（`Expand minimap`）。

### 与我方 Story 6.5 的差距（对齐清单）
| 维度 | Datadog | 我方 6.5（现状） | 对齐动作 |
| --- | --- | --- | --- |
| 形态/位置 | **210×105 小框浮于火焰图左上角之上**（overlap） | 全宽 band 在火焰图**上方**独占高度 | 改浮层 overlay（absolute，左上角，z-index 高于火焰区） |
| 暗化 | overlay-mask 浅蓝 50% 调 + 透明蓝边视口框 | 半透明蓝**填充**视口框，框外不调 | 反转：遮罩调全图 + 视口透明+蓝边 |
| 缩放控件位置 | **停靠 minimap 内**（折叠+3 缩放钮） | 独立 `DdFlameControls` 行 | 把 controls 停靠进 minimap |
| 平移模型 | grab 抓视口框拖动（不 click-jump） | click 跳转 + 拖动平移 | 视口框 grab 拖动为主（click-jump 可保留为增强） |
| 概览渲染 | canvas | div 微缩矩形 | 保持 div（刻意决策，视觉等价即可，非能力差距） |
| 缩放来源 | 滚轮 + 3 按钮（minimap 不缩放） | 同（6.4 已具） | 已对齐 |

→ **结论（形态）**：未对齐的是形态（浮层 vs 横幅）+ 控件停靠 + 暗化视觉 + grab 拖动模型 → Story 6.6 已落实。

### minimap/导航**能力**深度规格（官方文档 Confirmed，2026-06-29）

Datadog 官方文档（[Trace View](https://docs.datadoghq.com/tracing/trace_explorer/trace_view/)）原文：
- "**Scroll to zoom, click and drag to move around**, and use the minimap to **zoom into the selected span or zoom out to the full trace**."
- "select a span, then click the **focus icon** next to the minimap... The visualization **rescales with the selected span as the new root, and its descendants fill the timeline**." "To return to the full trace, **reset the focus**. Focusing only changes what is displayed."

→ 三个 minimap 停靠按钮的**真实语义**：
| 按钮 | 语义 | 我方现状 | 差距 |
| --- | --- | --- | --- |
| Zoom Out to Full Trace | viewRange → [0,1] | ✅ 全览 | 已对齐 |
| Zoom In to Selected Span | 横向 zoom 到 span 时间边界（祖先/子孙仍在，仅窗口缩到 span 区间） | ✅ 放大到选中 | 已对齐 |
| **Focus on Selected Span** | **re-root**：选中 span 成新 root（depth 0 铺满宽），**只渲染其子树（祖先隐藏）+ depth 重基**，可 **reset focus** 返回全 trace | ❌ 我方「聚焦选中」只是加 padding 的 zoom | **真能力缺失** |

→ **Story 6.7「Focus = re-root」**：core `computeFlameLayout` 增 `focusRootSpanId`（取子树[用 span-ancestor-ids 判定]、depth 重基、时间映射到 root 区间）；TraceTimeline 增 `focusedRootSpanId` 态 + 「聚焦选中」改 re-root + 出「重置聚焦」；ruler/minimap 随 focus 根重映射。pan（drag）/scroll-zoom 我方已具（6.4）。

规格令牌：框 210×105、遮罩 `rgba(234,246,252,0.5)`、视口边 `1px solid rgb(0,107,194)`。

## Loose Ends

- [x] ~~补测含**真并发**子 span 的 trace,确认 §5 Open Question(同深度重叠排布)。~~ **已定论(2026-06-29)**:mockTrace 本就含并发重叠（s2[20–48.2ms] 与 s7[40–58.5ms] 同 depth1 重叠 ~8.2ms；s5/s6 同 depth2 重叠）。我方 **strict depth** 直接渲染重叠（后绘 span 覆盖先绘），**对齐 Datadog 已确认的「严格 depth=调用深度、不下推泳道」模型**（§2.1）。决策:**不擅自加 lane-packing**（会 DIVERGE Datadog 的 depth 模型）；并发重叠为忠实行为。已加单测 `flameLayout.test.ts` 锁定（s2/s7 同 depth1 且 left 区间重叠）。如未来 live 确认 Datadog 对重叠有特殊下推再做增强。
- [ ] 火焰图 hover tooltip 的**具体字段**(本次 synthetic mousemove 未触发 canvas tooltip 内容,只确认其存在)。
- [ ] Color by 其它维度(非 Service)在火焰图下的表现(本次仅测 Service)。
- [ ] minimap 对齐落实到 Story 6.6（浮层+控件停靠+遮罩反转+grab 拖动，见上 Follow-up）。
