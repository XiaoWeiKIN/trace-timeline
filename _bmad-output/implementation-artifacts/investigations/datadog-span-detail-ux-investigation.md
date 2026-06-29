# Investigation: Datadog Span 详情面板 UX / 视觉规格（高保真对齐）

## Hand-off Brief

1. **What happened.** 为 trace-timeline 复刻项目 Story 3.2（SpanDetail 详情卡 + 子分组独立折叠）实测了 Datadog APM Trace 瀑布页「Span 详情面板」的 DOM 结构、交互与视觉令牌（Confirmed，经 Chrome DevTools 实测）。
2. **Where the case stands.** 详情面板锚定为底部 dock（tab 栏 + 多个可折叠 section + 键值表）；section 折叠交互、字号/间距/颜色令牌、状态 pill、链接色、列布局均已实测确认。
3. **What's needed next.** 用本文「§5 3.2 实现映射」直接驱动 Story 3.2 皮肤实现（DdSpanDetail + DdAccordian + DdKeyValuesTable）。

## Case Info

| Field | Value |
| --- | --- |
| Ticket | N/A（UX 研究，服务于 Story 3.2） |
| Date opened | 2026-06-26 |
| Status | Concluded（exploration——心智模型对 3.2 已充分） |
| System | Datadog APM us5，trace 6a3a259…，span 4772934576223654562，graphType=waterfall |
| Evidence sources | 用户 Chrome 实时页面（Chrome DevTools MCP 实测 computed styles + DOM + 交互） |

## Problem Statement

复刻组件当前详情行（Story 3.1）是最小信息体。Story 3.2 要把它升级为高保真对齐 Datadog 的 **SpanDetail 卡**：tags/process 键值表 + logs/references 等子分组独立折叠。需要 Datadog 详情面板的实测规格（结构 / 交互 / 视觉令牌）作为皮肤实现依据。约束：仅视觉/交互层（Datadog 皮肤 RESTYLE），不动 Grafana 引擎逻辑。

## Evidence Inventory

| Source | Status | Notes |
| --- | --- | --- |
| Datadog 详情面板 DOM | Available | 底部 dock，实测 computed styles |
| Section 折叠交互 | Available | 实测 click→chevron 旋转 + section 高度 372↔35 |
| 视觉令牌（字号/色/间距） | Available | computed styles 实测 |
| 详情面板完整 tab 内容（Logs/Network/Processes/Profiles） | Partial | 仅实测 Overview tab；其余 tab 未逐一展开（本组件范围外） |
| Datadog 私有 CSS 源码 | Missing | 不可得也不需要——只抽取可观察的视觉/交互规格 |

## Confirmed Findings

### Finding 1: 详情面板 = 底部 dock（非内联行），但视觉词汇可内联复用

**Evidence:** 实测页面布局——瀑布在上、详情面板在下方独立 dock；header 含「服务图标 + 服务名 + `servlet.request`(斜体) + 操作名 + ⋮」+ 右上「⏱ 50.6ms · 100% total exec time」。
**Detail:** Datadog 在**整页 trace 视图**用底部 dock；我们组件按 Grafana 引擎是**内联详情行**。差异仅在容器位置——内部的 section/键值表/折叠**视觉词汇可 1:1 复用**到内联行。`servlet.request` 为 NotoSans **斜体 13px**。

### Finding 2: 基础排版令牌

**Evidence:** computed styles 实测。
**Detail:**
- 字体族：`NotoSans, "Lucida Grande", "Lucida Sans Unicode", sans-serif`（与 datadog-visual-spec 一致）。
- 详情区基准字号 **13px**；行高 **18.2px**（≈1.4）。
- 文本主色 `rgba(28, 43, 52, 0.98)`；次要/标签色 `rgba(28, 43, 52, 0.68)`；图标/chevron 静默 `rgba(28, 43, 52, 0.66)`。
- 链接色 `rgb(0, 107, 194)`（Datadog 蓝），`text-decoration: none`，13px。

### Finding 3: 可折叠 section header（= Accordion 头）

**Evidence:** `<header>` 实测 + click 交互实测。
**Detail:**
- `<header>`：`display:flex; align-items:center; cursor:pointer; padding:0 8px; height:34.5px`。
- 顶部分隔：`border-top: 1px solid rgb(226, 229, 237)`（section 之间的分隔线令牌）。
- 左侧 chevron：**16×16**，色 `rgba(28,43,52,0.66)`；**展开** = `rotate(90deg)`（`matrix(0,1,-1,0,0,0)`，朝下）；**折叠** = 无旋转（`matrix(1,0,0,1,0,0)`，朝右）。
- 折叠交互：点 header → section 高度 `372px ↔ 35px`（35 = 仅 header 行）；各 section 独立。
- 标题文本 13px / weight 400（非全大写、无字间距）。

### Finding 4: 键值表（KeyValuesTable）两列布局

**Evidence:** Method 标签 x=192 / 值 x=348 实测。
**Detail:**
- 两列：**标签列固定 ≈156px**（label x=192→value x=348）+ 值列自适应。
- 标签：13px / weight 400 / 色 `rgba(28,43,52,0.68)`。
- 值：13px / 主色或链接色；URL 等渲染为链接（蓝、无下划线）。
- 行：`display:flex`，无显式行边框，靠行高 18.2px 分隔（紧凑）。

### Finding 5: 状态 / 方法 pill 令牌

**Evidence:** computed styles 实测。
**Detail:**
- **KV 内联状态 pill「200」**：bg `rgb(236, 249, 239)`（浅绿）/ 文 `rgb(42, 126, 65)`（深绿）/ `border-radius:4px` / `padding:0 4px` / 11px / weight 600。
- **顶部 method+status 组合 pill**：`GET`（左半）+ `200 OK`（右半 `rgb(65,196,100)` 实底绿 / 白字 / `border-radius:0 4px 4px 0` / `padding:0 8px` / 11px / 600）。
- 与本库已有 `theme.trace.status`（Story 1.6 HTTP 状态 pill）配色同源——3.2 详情内复用即可。

### Finding 6: tab 栏（Overview / Infrastructure / Metrics / Logs / Network / Processes / Profiles）

**Evidence:** 截图 + DOM。
**Detail:** 详情面板顶部一排 tab，`Overview` 默认激活（蓝色下划线指示）。**本组件范围**：Grafana 引擎的内联 SpanDetail 不分这么多 tab——3.2 只做 Overview 等价内容（tags/process 键值表 + logs/references/warnings/stackTraces 子分组）。多 tab（Infrastructure/Metrics/Profiles）属深耦合，**stub 或不做**（与 PRD 一致）。

## Deduced Conclusions

### Deduction 1: 3.2 的 Accordion = 「可点 header（chevron 90°旋转）+ 内容区显隐」

**Based on:** Finding 3。
**Reasoning:** Datadog section 折叠 = header(cursor:pointer) + chevron rotate(0↔90deg) + 内容高度 0↔auto，与 Grafana `Accordian*` 组件的 `isOpen` 模型同构。
**Conclusion:** 直接把 Grafana AccordianKeyValues/Logs/References 的折叠逻辑保留，皮肤换成 Datadog 令牌（chevron 16px 旋转、header 34.5px / border-top 分隔、13px 标题）。

### Deduction 2: 颜色/字号令牌应进 theme.trace（AD-7）

**Based on:** Finding 2/3/5。
**Reasoning:** 详情面板的 border `rgb(226,229,237)`、次要文本 `rgba(28,43,52,0.68)`、链接 `rgb(0,107,194)` 等是稳定令牌。
**Conclusion:** 在 `theme.trace` 增 detail 相关令牌（detailBorder / detailLabel / detailLink / sectionHeaderHeight）供皮肤引用，勿散落硬编码。

## §5 3.2 实现映射（直接驱动）

| Grafana 源组件 | 本库皮肤组件 | 关键 Datadog 令牌 |
| --- | --- | --- |
| `SpanDetail/index` | `DdSpanDetail`（详情卡容器） | 容器内边距、section 垂直堆叠；NotoSans 13px |
| `AccordianKeyValues` | `DdAccordian` + `DdKeyValuesTable` | header 34.5px / cursor:pointer / border-top `rgb(226,229,237)` / chevron 16px rotate(0↔90°) |
| `KeyValuesTable` | `DdKeyValuesTable` | 标签列 ≈156px / 标签色 `rgba(28,43,52,0.68)` / 行高 18.2px / 值链接 `rgb(0,107,194)` |
| `AccordianLogs` | `DdAccordianLogs` | 同 Accordion；log 项可二级展开 |
| `AccordianReferences` | `DdAccordianReferences` | 同 Accordion |
| 状态 pill | 复用 Story 1.6 `theme.trace.status` | 浅绿 `rgb(236,249,239)`/深绿文 `rgb(42,126,65)`，radius 4 |

**子分组（独立折叠）清单**：Tags、Process、Logs、References、Warnings、Stack Traces —— 与 `useDetailState` 已暴露的 `detailTagsToggle/detailProcessToggle/detailLogsToggle/detailReferencesToggle/detailWarningsToggle/detailStackTracesToggle`（Story 3.1）一一对应，3.2 直接接 UI。

**令牌速查（实测）**
```
font-family: NotoSans, ...           font-size: 13px    line-height: 18.2px
text.primary:   rgba(28,43,52,0.98)  text.label: rgba(28,43,52,0.68)  chevron: rgba(28,43,52,0.66)
link:           rgb(0,107,194)       section-border-top: rgb(226,229,237)
section header: height 34.5px, padding 0 8px, cursor:pointer, chevron 16px rotate(0=收/90deg=展)
kv label column: ≈156px
status pill(绿): bg rgb(236,249,239) / fg rgb(42,126,65) / radius 4 / pad 0 4 / 11px 600
```

## Hypothesized Paths

### Hypothesis 1: 行 hover 高亮态

**Status:** Open
**Theory:** KV 行/section 可能有 hover 背景高亮（Datadog 惯例）。
**Would confirm:** 实测 `:hover` 背景（静态 computed style 取不到）。
**Would refute:** 行无 hover 态。
**Resolution:** 未确认——静态实测取不到 `:hover`。低优先（不影响 3.2 主体）；实现时给 KV 行加轻微 hover bg（与瀑布行 selectedRowBg 同源）即可，无需精确对齐。

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | --- | --- |
| `:hover` 态 | 行/section 悬停高亮精度 | DevTools 强制 `:hover` 伪类（人工）或忽略 |
| Logs/References 子项二级展开内视觉 | logs 项内部布局 | 实测点开一条 log 项（本 trace 该 span 无 logs，需换含 logs 的 span） |
| 暗色模式令牌 | dark theme 详情面板配色 | 切 Datadog 暗色主题再实测（本库已有 colorMode，可后续补） |

## Final Conclusion

**Confidence: High.** Datadog 详情面板的结构（底部 dock → tab → 可折叠 section → 键值表）、折叠交互（header click → chevron rotate 0↔90° + 内容显隐）、视觉令牌（NotoSans 13px、文本/标签/链接/边框色、section header 34.5px、KV 标签列 156px、状态 pill 绿）均经 Chrome DevTools 实测 Confirmed。差异点（Datadog 是底部 dock + 多 tab，本组件是内联行 + 仅 Overview 等价内容）已厘清，内部视觉词汇可 1:1 复用。**§5 映射表 + 令牌速查**可直接驱动 Story 3.2。

**Verification plan（3.2 实现后）**：Chrome DevTools 并排比对——section header 高度/ chevron 旋转 / KV 标签列宽 / 13px 字号 / 状态 pill 绿，与本文实测值一致。

## Status: Concluded

## Follow-up: 2026-06-26 — 详情面板「结构」深抓（修正首轮只抓令牌的缺口）

### 触发
用户实测对比发现详情面板与 Datadog 差距大。根因：首轮只抓视觉令牌、未抓**结构/分组**，导致 3.2 照搬了 Grafana(Jaeger) 的 `Span attributes/Resource attributes` 分组而非 Datadog 的语义分组。本 Follow-up 补全结构实测，作为「全量重绘」依据。

### Finding 7: 顶部 Span Header（Confirmed）
锚行文本顺序：`my-order-service`(服务 chip：图标+名) · `servlet.request`(operationName，斜体 13px，色 rgba(28,43,52,0.98)) · `GET /user`(resource，**粗 600 / 15px** / 色 rgba(28,43,52,0.68)) · `⋮`(更多菜单)。右侧：`⏱ 50.6ms` + `100% total exec time` + 其下**蓝色进度条** + 折叠按钮(▾)。
→ 本库实现：服务 chip 用通用图标（**不复制 Datadog 商标/logo**）；op 斜体 + resource 粗体；右侧耗时 + exec-time 条。

### Finding 8: Tab 栏（Confirmed 结构）
`Span:` 标签 + tabs：**Overview**(默认激活，蓝下划线) / Infrastructure / Metrics / Logs / Network / Processes / Profiles（13px）。
→ 本库：Overview 实做；其余按 PRD「深耦合 stub」渲染为占位 tab（点击 no-op 或灰显），保证视觉 1:1。

### Finding 9: Pinned Span Attributes（Confirmed）
Overview 顶部独立区：`Pinned Span Attributes` + pin 图标 + 空态 `No pinned tags found ⓘ`。
→ 本库：渲染该区（空态文案对齐）；pin 持久化可后续。

### Finding 10: 语义属性分组（关键 Confirmed）
Overview 主体 = **按语义命名空间分组 + 友好标签**，不是原始 key 平铺：
- **HTTP Requests** 组（实测行序）：`Method`=GET · `Status Code`=200(绿 pill) · `URL`=http://...(蓝链接+外链icon) · `User Agent`=Mozilla...(蓝链接) · `http.route`=/user(原始 key 保留) · 子组 **URL Details**：`HTTP Host`=localhost · `HTTP Path`=/user。
- **Span Attributes** 组：catch-all，未被语义分组吸收的原始 key。
- 值样式：多为**蓝链接** rgb(0,107,194)；状态码绿 pill；普通文本主色。

### Deduction 3: 友好标签映射（务实集，驱动重绘）
Datadog 把 OTel/语义约定 key 映射到友好标签并归组。**全量穷举不现实**（用户已确认走务实集）。落地映射（覆盖常见命名空间，未命中 key 落 Span Attributes catch-all 原样显示）：

| 友好标签 | 源 key（任一命中） | 组 |
| --- | --- | --- |
| Method | http.method / http.request.method | HTTP Requests |
| Status Code | http.status_code / http.response.status_code | HTTP Requests（绿/红 pill） |
| URL | http.url / url.full | HTTP Requests（链接） |
| User Agent | http.useragent / user_agent.original | HTTP Requests（链接） |
| HTTP Host | http.host / server.address / url.domain | URL Details |
| HTTP Path | http.path / url.path | URL Details |
| http.route | http.route | HTTP Requests（原样 key） |
| DB Statement | db.statement / db.query.text | Database |
| DB System | db.system | Database |
| Peer Service | peer.service / net.peer.name | Network |

→ 组顺序：Pinned → HTTP Requests → URL Details → Database → Network → Span Attributes(catch-all)。仅有数据的组才渲染。值为 URL→链接、状态码→pill、JSON→着色(已有)、其余文本。

### §6 重绘实现映射（替代首轮 §5）
| 新皮肤组件 | 职责 |
| --- | --- |
| `DdSpanDetailHeader` | 顶部：服务 chip(通用图标)+op斜体+resource粗体+⋮ \| 右侧耗时+exec-time 条+折叠 |
| `DdSpanDetailTabs` | `Span:` + Overview(实做)/其余 stub tab；蓝下划线激活态 |
| `DdAttributeGroups` | 语义分组引擎：按映射表把 span.tags 归组+友好标签；Pinned 区；Span Attributes catch-all |
| `DdKeyValuesTable`(改) | 值渲染：URL→蓝链接 / 状态→pill / JSON→着色(已有) / 文本 |
| `DdSpanDetail`(重写) | 组合 Header+Tabs+AttributeGroups；保留 Logs/References 入 Span Attributes 或 Logs tab |

复用既有：DdAccordian(分组头折叠)、DdKeyValuesTable(值)、jsonMarkup(JSON 着色)、theme.trace.detail(令牌)。引擎/状态零改动（detailState/detailToggles 仍驱动各组折叠）。

### Status: Concluded（结构 + 令牌均 Confirmed；务实映射已定，可驱动全量重绘）
