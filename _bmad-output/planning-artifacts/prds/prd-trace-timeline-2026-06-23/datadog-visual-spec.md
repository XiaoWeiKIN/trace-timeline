# Datadog Waterfall 视觉规格（实测抓取）

> 来源：用 Chrome DevTools MCP 实测 Datadog APM Trace **Waterfall** 视图（us5.datadoghq.com，trace 6a3a2599…181daf）+ DRUIDS 设计系统（color foundation / HttpRequestBar 组件）。这是本组件库的**视觉目标**；实现引擎参考 Grafana（虚拟滚动/树/数据模型/交互）。

## 1. 整体布局
```
┌ 顶部头部：[服务图标] my-order-service > GET /user/ > trace_id … [Open Fullscreen][↗][×]
│           ⏱102ms  [GET] http://…/user  [500 INTERNAL SERVER ERROR(红pill)]  时间(43m ago)
├ Tabs：  Flame Graph | [Waterfall(选中,蓝下划线)] | Span List ⑥ | Map
├ 工具条： [🔍 Filter spans by any attribute]  [☐ Errors ③]            Color by: [Service ▾]
├ 时间轴头：0  5ms 10ms 15ms … 100ms（细竖刻度 + 标签）
├ 瀑布行 × N：  [左标签列] | [右时间轴瀑布条]
└ 底部详情面板（docked）：服务 > 操作 ⋮     ⏱20.9ms 20.5% total exec time
    Span: [Overview] Errors③ Infrastructure Metrics Logs Network Processes Profiles
    分组：Pinned Span Attributes / RUM View Attributes / Span Attributes …
```

## 2. 瀑布行（核心）
**左标签列**（`distributed-tracing-waterfall__span-label-cell`）：
- 展开/折叠箭头（▶/▼）
- 深度/子代计数数字（`__children-count`，如 5/1/2）
- 服务图标（🌐 globe 等）
- resource 文本（服务名 + 操作名，`__text`，超长省略 `smart-ellipsis`）
- HTTP 状态 pill（`__http-status-pill`，仅有状态时显示，如 500 红）
- 错误 ⚠ 图标（错误 span / 错误路径）

**右时间轴单元**（`distributed-tracing-waterfall__timeline-cell`）：
- `__bar-container` 容纳条
- `__span` 瀑布条：高 **~18-19px**，圆角 **`2px 2px 0 0`（仅顶部两角）**，无边框，opacity 1，按服务分类色填充
- `__span-separator--top-gap / --bottom-gap`：条与行上下的留白间隙（条不顶满行高）
- `--has-left-lockup`：条左侧带锁定标记（如 RPC/远端）
- **缩进连接线**：父子层级用**服务色竖线**做缩进引导（橙色竖线，Datadog 特色）
- 条右侧/内显示 duration 文本（如 102ms、28.2ms、7.34ms）

**行高**：约 24-28px（条 ~19px + 上下 gap）。行 hover/选中：浅蓝底 `rgb(234,246,252)`。

## 3. 配色

### 3.1 Color-by-Service 分类色（实测自 waterfall 条）
- 橙 `rgb(252,175,43)` (#FCAF2B)
- 紫 `rgb(198,140,205)` (#C68CCD)
- 绿 `rgb(80,147,31)` (#50931F)
- 品红 `rgb(204,60,113)` (#CC3C71)
- 棕褐 `rgb(221,132,81)` (#DD8451)
- 鲑红 `rgb(200,107,116)` (#C86B74)
> 分类色规则：同服务同色、按服务名稳定分配；需一套有序分类调色板（类似 Grafana 的 color-generator，但用 Datadog 这套色值）。

### 3.2 DRUIDS 语义色板（light，实测自 foundation/color）
| 用途 | 主色 | 深色 | 浅底 |
|------|------|------|------|
| 成功/绿 | `rgb(0,134,69)` / `rgb(3,128,67)` / `rgb(42,126,65)` | — | `rgb(236,249,239)` |
| 危险/红 | `rgb(235,54,75)` | `rgb(188,43,60)` | `rgb(253,235,237)` |
| 警告/橙 | `rgb(249,157,2)` | `rgb(193,88,0)`/`rgb(217,126,0)` | `rgb(255,246,227)` |
| 主/蓝 | `rgb(53,152,236)` / `rgb(0,107,194)` / `rgb(9,83,191)` | — | `rgb(234,246,252)`/`rgb(212,236,249)` |
| 强调/靛 | `rgb(94,109,214)` / `rgb(44,99,219)` | — | `rgb(240,242,255)`/`rgb(217,222,255)` |
| 紫 | `rgb(147,100,205)` | `rgb(99,44,166)`/`rgb(107,55,171)` | `rgb(242,236,252)` |
| 品红/粉 | `rgb(224,27,115)` / `rgb(255,0,153)` | — | `rgb(255,242,250)` |
| 黄 | `rgb(250,204,0)` | `rgb(204,148,25)` | — |

### 3.3 中性/文本
- 面板底 `rgb(249,250,251)`；分隔/边框 `rgb(226,229,237)`、`rgb(239,241,245)`、`rgb(194,200,221)`
- 灰阶 `rgb(130,139,164)` / `rgb(106,114,135)` / `rgb(88,95,112)` / `rgb(70,75,89)`
- 文本（叠加在浅底）：主 `rgba(28,43,52,.98)`、次 `.68`、三级 `.5`、禁用 `.35`

## 4. 排版
- 字体栈：`NotoSans, "Lucida Grande", "Lucida Sans Unicode", sans-serif`；CJK 回退 `PingFang SC`
- 时间轴刻度：**12px / 400 / `rgba(28,43,52,.98)`**
- 正文密度高、字号小（12-13px 为主）

## 5. 状态 Pill（DRUIDS StatusPill / HttpStatusPill）
- 圆角 **4px**，小尺寸（约 h17）
- HTTP 状态自动配色：200 绿（底 `rgb(236,249,239)`）/ 3xx 蓝 / 404 橙 / 5xx 红（`500 INTERNAL SERVER ERROR` 红底白字）
- 详情头部 method+url+statusCode = DRUIDS `HttpRequestBar`（method pill + url + 状态 pill，默认最大宽 400px，可 `isFullWidth`）

## 6. 控件
- `Filter spans by any attribute` 搜索框（全宽）
- `Errors ③` 计数开关（只看错误）
- `Color by: [Service ▾]` 下拉（着色维度切换）
- 展开全部/折叠全部按钮（`__span-label-header__expand-all-button / collapse-all-button`）
- 顶部视图 Tabs：Flame Graph / Waterfall / Span List / Map（本库聚焦 Waterfall）

## 7. 与 Grafana 的关键样式差异（复刻时要改的点）
| 维度 | Grafana | Datadog（目标） |
|------|---------|----------------|
| 条圆角 | 基本直角/小圆角 | **仅顶部 2px 圆角** |
| 缩进引导 | 灰色树形折叠线 | **服务色竖线连接** |
| 配色 | Grafana classic 调色板 | Datadog 分类色板（§3.1） |
| 状态 | error 红图标 | **行内 HTTP 状态 pill（4px 圆角）+ ⚠ + Errors 计数** |
| 着色维度 | 固定按 service | **Color by 可切换** |
| 主题底色 | Grafana light/dark | DRUIDS `rgb(249,250,251)` 等 |
| 字体 | Grafana Inter/Roboto | NotoSans |
| 详情头 | tags 表 | **HttpRequestBar 头 + 多 Tab** |

## 8. 截图证据
（已在会话中查看，未落盘——必要时可重抓）
- 多服务+错误 waterfall：trace 6a3a2599…181daf（GET /user/ 500，6 spans，橙/紫条 + 错误 pill/图标 + 选中行蓝底）
- DRUIDS HttpRequestBar 组件文档
- DRUIDS Color foundation 调色板
