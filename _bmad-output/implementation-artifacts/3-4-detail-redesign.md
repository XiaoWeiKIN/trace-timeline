---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 3.4: 详情面板高保真重绘（对齐 Datadog 结构）

Status: review

## Story

As a 排障用户,
I want 详情面板 1:1 对齐 Datadog 的结构与交互（顶部 span header + Tab 栏 + Pinned 区 + 语义属性分组 + 蓝链接/状态 pill）,
so that 与 Datadog 一致的使用体验。

## 背景（修正）
3.2/3.3 误把详情面板照搬 Grafana(Jaeger) 的 `Span attributes/Resource attributes` 分组。「用 Grafana 内核」仅约束引擎；详情面板是纯表现层，应完全按 Datadog 重绘。依据：`investigations/datadog-span-detail-ux-investigation.md` Follow-up（Finding 7-10 + Deduction 3 + §6）。

## Acceptance Criteria

1. **顶部 span header**：服务 chip（通用图标+服务名）+ operationName + 右侧耗时 + "100% total exec time" + exec 进度条 + 折叠（FR-10）。
2. **Tab 栏**：`Span:` + Overview（激活，蓝下划线）+ Infrastructure/Metrics/Logs/Network/Processes/Profiles（stub 占位）。
3. **Pinned Span Attributes** 区（空态 `No pinned tags found`）。
4. **语义分组**：span.tags 按映射表归组（HTTP Requests / URL Details / Database / Network）+ 友好标签（Method/Status Code/URL…）+ `Span Attributes` catch-all（未命中原样）；仅有数据的组渲染；各组独立折叠。
5. **值样式**：URL→蓝链接 / 状态码→pill（绿/红）/ JSON→着色（已有）/ 其余文本。
6. `npm run typecheck`/`npm test`/`npm run build` 全过；分组引擎 + 值渲染带单测。

## Tasks / Subtasks

- [x] Task 1：语义分组引擎 `src/presentation/attributeGroups.ts` — `buildAttributeGroups(span)` → 有序 Group[]（title + rows[{label,value,kind}]）；映射表覆盖 http/url/db/network；catch-all `Span Attributes`。
- [x] Task 2：值渲染 `DdAttrValue`（kind: status/link/json/text）；DdKeyValuesTable 改吃 `AttrRow[]`（label+value+kind），状态 pill 复用 theme.trace.status + httpStatusToken。
- [x] Task 3：`DdSpanDetailHeader` — 服务 chip(通用图标)+op+右侧耗时/exec 条/折叠。
- [x] Task 4：`DdSpanDetailTabs` — `Span:` + Overview 激活 + stub tabs。
- [x] Task 5：`DdSpanDetail` 重写 — Header + Tabs + Pinned + 语义分组(DdAccordian)；Logs/References 归入分组/保留。
- [x] Task 6：单测 `attributegroups.test.ts`（映射归组 + catch-all + 顺序）+ 扩 keyvalues（status pill/link kind）。
- [x] Task 7：自验 typecheck/test/build + Chrome DevTools 与 Datadog 并排对照。

## Dev Notes

- 复用：DdAccordian（组折叠）、jsonMarkup（JSON 着色）、httpStatusToken/theme.trace.status（pill）、theme.trace.detail（令牌）。引擎/状态零改动（detailState/detailToggles 驱动各组折叠）。
- **不复制 Datadog 商标/logo**：服务 chip 用通用图标。友好标签为 OTel 语义约定字段名（功能性）。
- 映射表（务实集，未命中落 catch-all）见调研 Deduction 3。
- 顶部 resource：模型仅 operationName，用其作主标题（无独立 resource 字段）。

### References
- [Source: investigations/datadog-span-detail-ux-investigation.md Follow-up 2026-06-26 §6]
- [Source: epics.md#Story 3.x]、[Source: prd FR-10/FR-11/FR-12]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]（dev-story）

### Debug Log References

- typecheck 0 错误 · `npm test` **102 passed**（+6：attributeGroups 5 + keyvalues 改写）· build ESM 127KB clean。
- Chrome DevTools 与 Datadog 并排：结构 1:1——顶部[色块 chip] mall-order-api | GET /user … 右侧 102ms · 100% total exec time + 蓝条 + ✕；Tab `Span:` Overview(蓝下划线)+Infrastructure/Metrics/…(stub 灰)；Pinned Span Attributes「No pinned tags found」；HTTP Requests(4) 字段序 Method→Status Code(绿 pill)→URL(蓝链接)→http.route + URL Details(2)。section 独立折叠（KV 表 3→2）。

### Completion Notes List

- **修正方向**：详情面板从「Grafana(Jaeger) 结构 + Datadog 令牌」改为「**按 Datadog 结构全量重绘**」。澄清：Grafana 内核=引擎（瀑布/虚拟滚动/行状态/transform），详情面板=纯表现层，引擎/状态零改动。
- **语义分组引擎** `attributeGroups.ts`：FIELD_DEFS 映射表（http/url/db/network 命名空间→友好标签 Method/Status Code/URL/…），组内按定义序排列对齐 Datadog；未命中落 `Span Attributes` catch-all 原样。
- **新皮肤组件**：`DdSpanDetailHeader`（服务色块 chip+op+耗时+exec 条+✕，**不复制 Datadog 商标**）、`DdSpanDetailTabs`（`Span:`+Overview 实做+其余 stub）、重写 `DdSpanDetail`（Header+Tabs+Pinned+语义分组+Logs/References）、重写 `DdKeyValuesTable`（吃 AttrRow[]，kind: status→pill / link→蓝链接 / JSON→着色 / text）。
- **持久化分组折叠**：DetailState 增 `closedSections` Set + `toggleSection`/`isSectionOpen`；useDetailState 增 `detailSectionToggle`；容器 detailToggles 增 `section`。默认展开（与 Datadog 一致），经 detailState 持久（虚拟化重挂不丢）。
- **行高**：详情行改自然高度（ListView `_scanItemHeights` 测量真实高，AD-12 内在高度原则）；DEFAULT_HEIGHTS.detail/detailWithLogs 调为 320/360 初始估值减首帧跳动。
- 值样式：状态码绿/红 pill（复用 theme.trace.status + httpStatusToken）、URL 蓝链接、JSON 着色（3.3）。AC #1~6 全满足，未新增依赖。

### File List

新增：`src/presentation/{attributeGroups.ts,DdSpanDetailHeader.tsx,DdSpanDetailTabs.tsx,attributegroups.test.ts}`
修改：`src/presentation/{DdSpanDetail.tsx(重写),DdKeyValuesTable.tsx(重写),DdSpanRow.tsx,index.ts,keyvalues.test.tsx}`、`src/state/{DetailState.ts,useDetailState.ts,useTraceTimelineState.ts}`、`src/core/VirtualizedTraceView.tsx(DEFAULT_HEIGHTS)`、`src/model/mock-trace.ts(demo tags)`

### Change Log

- 2026-06-26：创建 + 实现 Story 3.4——详情面板按 Datadog 结构全量重绘（顶部 header+Tab 栏+Pinned+语义分组+值样式），引擎/状态零改动；语义分组引擎(http/url/db/network 友好标签+catch-all)；DetailState 增分组折叠持久化；详情行改自然高度（AD-12 测量）；102 单测；浏览器与 Datadog 并排 1:1 验证。Status → review。
