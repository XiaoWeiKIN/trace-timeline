# Addendum — TraceTimeline 独立组件库

> 本文件承载从 PRD 主体剥离出的**技术"如何做"**与下游（架构/方案）所需的深度，不属于 PRD 主叙事。来源：plan 文档 `stateful-wibbling-thunder.md` + 调研子代理摘要。

## A. 源与目标

- 源：`public/app/features/explore/TraceView/`（记为 `<TV>`），核心 `<TV>/components/TraceTimelineViewer/` ≈ 6100 行，加依赖层（utils/types/constants/settings/DraggableManager/common/Theme/createSpanLink）≈ 1万行量级。
- 目标隔离目录：`/Users/wangxiaowei1/xiaowei/trace-timeline`（仓库外，避免 Grafana yarn workspaces 纳入）。

## B. @grafana 依赖替换矩阵

| 来源 | 用到的符号 | 替换方案 |
|------|-----------|---------|
| `@grafana/ui` | `useStyles2` `useTheme2` `stylesFactory` `withTheme2` | `src/theme/useStyles2.ts`（ThemeContext + memoize） |
| `@grafana/ui` | `colors` | `src/theme/colors.ts`（拷贝 hex 数组） |
| `@grafana/ui` | `Icon` `Tooltip` `Button` `ToolbarButton` `ContextMenu` `Menu` `MenuItem` `Dropdown` `Counter` `DataLinkButton` | `src/ui/*`（lucide-react + 最小实现） |
| `@grafana/data` | `GrafanaTheme2` | `src/theme/types.ts`（子集，见 D） |
| `@grafana/data` | `createTheme` | `src/theme/createTheme.ts` |
| `@grafana/data` | `dateTime` `DateTimeInput` | `dayjs`，封装在 `utils/date.tsx` |
| `@grafana/data` | `TraceKeyValuePair` `TraceLog` `LinkModel` `Field` `TimeRange` `CoreApp` `PluginExtensionLink` | `src/types/grafana-data.ts` |
| `@grafana/i18n` | `t` | `src/i18n.ts`（`(id, def, vars) => 插值(def, vars)`，默认英文） |
| `@grafana/runtime` | `config` `reportInteraction` | `src/runtime.ts`（stub：`buildInfo.version='0.0.0'`；reportInteraction no-op，可注入） |
| `@grafana/schema` | `TimeZone` | `type TimeZone = string` |
| `@grafana/o11y-ds-frontend` | `TraceToProfilesOptions` `SpanBarOptions` | 本地 type |
| `@grafana/flamegraph` | `FlameGraph` | **stub**（占位 + 回调） |
| `@grafana/e2e-selectors` | selectors | 删除/普通常量 |
| `app/plugins/.../pyroscope` `app/features/plugins/datasource_srv` | 类型/服务 | 删除（仅 flamegraph/链接用，已 stub） |

## C. 组件移植清单（依赖顺序）

1. 基础：`TimelineRow` `Ticks` `types` `utils`
2. 表头：`TimelineHeaderRow/`（`TimelineHeaderRow` `TimelineCollapser` `TimelineColumnResizer` `TimelineViewingLayer`）+ `DraggableManager`
3. 瀑布条：`SpanBar` `SpanBarRow` `SpanTreeOffset`
4. 详情：`SpanDetailRow` + `SpanDetail/`（`index` `DetailState` `AccordianKeyValues(+markers)` `AccordianLogs` `AccordianReferences` `KeyValuesTable` `TextList` `jsonMarkup.js`）；**stub** `SpanFlameGraph` `ShareSpanButton` `SpanDetailLinkButtons`
5. 链接：`SpanLinks`（简化为回调，去 datasource_srv）
6. 调度核心：`VirtualizedTraceView` + `ListView/`（`index` `Positions`）
7. 入口：`TraceTimelineViewer`（轻量化 keyboard-shortcuts）

**直接拷贝（自包含，仅改 import）**：`autoColor`（`<TV>/components/Theme.tsx`）、`color-generator` `filter-spans` `span-ancestor-ids` `DraggableManager/` `ListView/Positions` `model/transform-trace-data` `demo/trace-generators`。

## D. Theme 类型子集（实测仅用到这些）
`isLight`/`isDark`；`spacing(...n)`；`colors.text.{primary,secondary,link,disabled}`；`colors.background.{primary,secondary,canvas}`；`colors.border.{weak,strong}`；`colors.primary.main`；`colors.error.{transparent,borderTransparent}`；`colors.success.text`；`colors.emphasize(color,amount)`；`typography.{bodySmall.fontSize, fontWeightMedium, h{1..6}, size.{sm,lg}}`；`shape.radius.{sm,md,default}`；`breakpoints.down(key)`。→ `createTheme` 内置 light/dark 两套常量。

## E. 数据模型（调研支撑）
- 内部模型沿用 `transform-trace-data` 产出的 `Trace`/`TraceSpan`（raw + 派生字段：`depth/hasChildren/childSpanCount/relativeStartTime/process/subsidiarilyReferencedBy` 与 trace 级 `startTime/endTime/duration/traceName/services[]`）。
- 时间单位统一**微秒**，适配边界归一化。
- 适配层（**范围转向 2026-06-25**）：`fromDataFox(resp): Trace`——DataFox 是唯一后端；不做通用 Jaeger/OTLP 适配。

## E2. DataFox API 实测速查（2026-06-25）
- 端点：`POST http://datafox.example.com/api/v3/spans/search`，`content-type: application/json`。
- 请求：`{filter:{query, from, to}, sort, page:{size}}`；`query` 支持 `service:x AND env:y`、`trace_id:<id>`；`from/to` 支持 `now-1h`/`now`。
- **拉单 trace**：`filter.query="trace_id:<id>"` + 大 `page.size`（验证 6 span 全同 trace_id）。
- 响应：**Grafana DataFrame 列式** `data.A.frames[0].{schema.fields[], data.values[][]}`（values 按字段列存）。
- 字段（OTLP 风格）：`timestamp`(epoch **ms**)、`trace_id`、`span_id`、`parent_span_id`、`env`、`bz_cluster`、`domain`、`host_ip`、`service_name`、`resource_name`、`operation_name`、`span_name`、`span_kind`(client/server/internal)、`status_code`(Ok/…)、`status_message`、`exception_type`、`exception_message`、`duration`(**纳秒** uint64)、`resource_attributes_raw`(JSON 串)、`span_attributes_raw`(JSON 串)、`scope_name`、`scope_version`、`retained_by`、`events.{timestamp,name,attributes}`(嵌套 JSON)。
- 父链：`parent_span_id`（OTLP）；**孤儿父**（parent 不在结果集，如跨服务远端父）→ 按 root 处理。
- 适配要点：列式→行式；`parent_span_id`→references[CHILD_OF]；`{resource,span}_attributes_raw` JSON.parse→tags/process；`events.*`→logs；ms/ns→µs；service 身份 = `service_name`(+namespace?)。

## F. 虚拟滚动（关键架构注意）
- Jaeger/Grafana **不用** `react-window`/`react-virtualized`，而是自研 `ListView` + `Positions`（变高、感知 accordion 展开）。**必须照搬**——朴素定高虚拟器在详情面板展开时会错位。

## G. 状态容器
- `TraceTimelineViewer` 为受控组件；源码用 React hooks（非 Redux）：`useChildrenState` `useDetailState` `useViewRange` `useSearch` `useHoverIndentGuide`（在 `<TV>/TraceView.tsx` 汇总）。
- 合并成 `src/state/useTraceTimelineState.ts`，对外 `<TraceTimeline>` 默认非受控、可受控接管。

## H. 许可证（已废 — 内部工具 2026-06-25）
- **作废**：本库为内部工具、不对外分发 → AGPL copyleft 不触发，**无逐文件审计/重写义务**（见架构 AD-9）。
- 现状：Grafana 代码（含 CriticalPath/filter-spans adhoc/useSearch）**一律原样移植**，仅保留源文件原版权头作基本尊重；不产 `LICENSE-AUDIT.md`、不做 Apache 发布/NOTICE。
- 仅 flamegraph/profiles 因缺外部依赖（@grafana/flamegraph、pyroscope，DataFox 无）继续 stub（技术原因）。

## I. 打包/分发规范（内部工具，已简化）
- **仅 ESM**（去 CJS/SemVer/弃用策略/体积预算等外发机制）；出 `.d.ts`。
- `react`/`react-dom` 作 peer（项目实际版本）。
- 依赖精简：`@emotion/css` `classnames` `lodash`(按方法引) `memoize-one` `tinycolor2` `lucide-react` `dayjs` `dompurify` `@opentelemetry/api`；**无** react-window、**无** @grafana/*。
- 构建 `tsup`（ESM-only）；**去 Storybook**，用 demo 页。

## K. Datadog 视觉皮肤层（范围转向新增）
- 架构分两层：**引擎层**（移植/参考 Grafana：虚拟滚动 `ListView/Positions`、span 树折叠、`transform-trace-data`、`getViewedBounds` 时间映射、交互 hooks）+ **皮肤层**（实现 Datadog 外观）。
- 皮肤层落点：
  - `src/theme/`：`createTheme` 内置 **DRUIDS 令牌**（`datadog-visual-spec.md` §3.2/§4），替换原 Grafana 主题值；中性/文本透明度阶照搬 DRUIDS。
  - `utils/color-generator`：保留散列+相邻去重算法，**色数组替换为 Datadog 分类色板**（§3.1）。
  - `SpanBar`：圆角改 `2px 2px 0 0`、高 ~19px、上下 gap；duration 文本样式。
  - `SpanTreeOffset`/缩进：从灰色折叠树线改为**服务色竖线连接**。
  - `SpanBarRow` 左标签列：展开箭头 + 深度/子代计数 + 服务图标 + resource 文本(smart-ellipsis) + **HTTP 状态 pill（4px 圆角，按状态码配色）** + ⚠ 错误图标。
  - 工具条：`Filter spans` + `Errors N` 计数开关 + `Color by` 下拉。
  - 详情头：DRUIDS `HttpRequestBar` 风格（method pill + url + 状态 pill）。
- 字体：NotoSans（CJK 回退 PingFang SC）。
- 证据来源：`datadog-visual-spec.md`（Chrome DevTools 实测）。

## J. 调研摘要原文（要点）
- 市场无成熟、后端无关、独立 React span 瀑布图；Jaeger UI / Grafana fork 是仅有 1:1 实现，均 Apache-2.0 但耦合。
- 两种数据格式：Jaeger JSON（微秒、process 承载 service）vs OTLP（纳秒、resource.attributes、parentSpanId）。建议适配层 → 单一内部模型。
- table-stakes：span 条按 relativeStartTime+duration、服务配色、view-range minimap 拖拽缩放、树折叠+缩进、自研虚拟滚动、详情面板、搜索过滤、刻度、键盘快捷键、span 深链。
- differentiating（可选）：关键路径、span links to logs/metrics/profiles、内嵌火焰图、error/status 徽标。
- 许可证：Apache-2.0 允许 fork/改/再分发，须保留版权与许可文本、声明重大修改、不滥用商标；Grafana 自研增量可能 AGPL，需逐文件核对。
