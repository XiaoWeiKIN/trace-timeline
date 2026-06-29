---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 6.1: Trace 火焰图布局引擎 + 静态渲染

Status: review

## Epic 6 背景（新增 Epic）

Datadog trace 详情页支持把 trace 以 **Flame Graph** 形式展示（与 Waterfall 并列的 tab）。复刻组件目前只有瀑布视图。Epic 6 新增「Trace 火焰图视图」，1:1 对齐 Datadog Flame Graph。

**关键认知（见调研 §1）**：Grafana **没有** trace 火焰图引擎；`@grafana/flamegraph` 是 profiling 火焰图（按值聚合、无时间轴），数据模型对 trace 是错的，**不可用**。但火焰图与瀑布**共用同一套时间数学**——而那套引擎（`createViewedBoundsFunc` + span 树 depth）**已经在 core 里**。所以 Epic 6 **没有新 Grafana 组件要移植**，只是在 presentation 加一个新视图，复用既有 core 引擎 + 数据 + 详情抽屉。三层模型不变：**引擎=已移植 core 数学 / 皮肤=新 DdFlameGraphView 对齐 Datadog / 数据=fromDataFox 零改动**。

Epic 6 切分：**6.1 布局引擎 + 静态渲染（本故事）** → 6.2 视图切换 + 选中联动 → 6.3 时间轴 ruler + hover 游标/tooltip → 6.4 pan/zoom → 6.5 minimap。

## Story

As a 排障用户,
I want 把 trace 以火焰图（按调用深度堆叠 + 横轴时间）形式静态渲染出来,
so that 一眼看清调用层级与各 span 的时间占用（对齐 Datadog Flame Graph 的视觉布局）。

## 范围（本故事只做静态渲染）

**做**：布局引擎（core）+ 静态视图组件（presentation）+ demo 挂载 + 单测。
**不做**（留后续）：视图切换 toggle（6.2）、点击选中/联动底部抽屉（6.2）、时间轴 ruler / hover 游标 / tooltip（6.3）、pan/zoom（6.4）、minimap（6.5）、**同深度兄弟时间重叠的特殊排布**（按调研严格 depth，重叠则视觉叠加，待补测后在 6.x 处理）。

## Acceptance Criteria

1. **布局引擎**：core 新增纯函数 `computeFlameLayout(trace, viewRange)`，对每个 span 输出 `{ spanID, depth, left, width }`（`left`/`width` ∈ [0,1]，由 `createViewedBoundsFunc` 计算）。零颜色/零皮肤 import（AD-2）。
2. **静态视图**：presentation 新增 `DdFlameGraphView`，按布局把每个 span 渲染为**绝对定位 div 矩形**：`top = depth × ROW_H`、`left/width` 由布局百分比换算、背景 = service 颜色（复用 `defaultColorAccessor`/`colorForService`，AD-6）、矩形内左对齐 operation 名 + 右对齐耗时（白字，宽度不足截断）。
3. **严格 depth**：`row = span.depth`，同深度多个 span 同行按各自 startTime 摆（与 Datadog 一致；本故事不处理时间重叠）。
4. **令牌**：行高 `ROW_H ≈ 24` 走 `theme.trace.flame.rowHeight`（AD-7），不写死。
5. **时间正确性**：矩形宽度/位置与 span 耗时成正比（root 左缘=trace 起点、右缘=trace 终点）；用 mockTrace 验证某 span 宽度比例 ≈ duration/trace.duration。
6. **demo**：demo 页新增一段独立渲染 `DdFlameGraphView`（mockTrace），可目视验证层级堆叠 + 时间布局 + service 配色。
7. **质量门**：typecheck 0 错；新增单测全绿（既有 141 不回归）；build ESM clean。

## Tasks / Subtasks

- [x] **Task 1（core 布局引擎）**：新增 `src/core/flameLayout.ts`：
  - `export interface FlameLayoutRow { spanID: string; depth: number; left: number; width: number; }`
  - `export function computeFlameLayout(trace: Trace, viewRange?: { viewStart: number; viewEnd: number }): FlameLayoutRow[]`
  - 内部：`const fn = createViewedBoundsFunc({ min: trace.startTime, max: trace.startTime + trace.duration, viewStart: viewRange?.viewStart ?? 0, viewEnd: viewRange?.viewEnd ?? 1 })`；对 `trace.spans` 逐个 `const { start, end } = fn(span.startTime, span.startTime + span.duration)` → `{ left: start, width: end - start, depth: span.depth, spanID: span.spanID }`。
  - 用 `memoizeOne` 包装（与 core 既有 `memoizedViewBoundsFunc` 一致风格）。
  - 从 `src/core/index.ts` 导出 `computeFlameLayout` + `FlameLayoutRow`。
  - **AD-2 守约**：core 只 import model + memoize-one；**禁止** import presentation/theme/ui。
- [x] **Task 2（theme 令牌）**：`src/theme/types.ts` 的 `TraceThemeTokens` 增 `flame: { rowHeight: number; rowGap: number; minLabelWidth: number; labelPadding: number }`；在 `createTheme`（light/dark）填值：`rowHeight: 24, rowGap: 1, minLabelWidth: 24, labelPadding: 6`（rowGap 用于矩形间 1px 描边缝，对齐 Datadog 紧贴堆叠观感）。
- [x] **Task 3（presentation 视图）**：新增 `src/presentation/DdFlameGraphView.tsx`：
  - props：`{ trace: Trace; colorAccessor?: ColorAccessor; selectedSpanId?: string; viewRange?: {viewStart;viewEnd}; className?; style? }`（`selectedSpanId` 本故事仅用于描边样式预留，不接点击）。
  - 用 `useStyles2` + `computeFlameLayout(trace, viewRange)`；容器高 = `(maxDepth + 1) × rowHeight`，`position: relative`。
  - 每 span 一个绝对定位 div：`top = depth × rowHeight`、`height = rowHeight - rowGap`、`left = ${left*100}%`、`width = ${width*100}%`、`background = resolveColor(span)`；内含 `<span class=op>operationName</span>` + `<span class=dur>formatDuration(span.duration)</span>`（复用既有 duration 格式化工具，若无则简单 ms 格式）。
  - `data-testid="DdFlameGraphView"`，每矩形 `data-span-id` + `data-testid="FlameRect"`，便于 RTL 断言。
  - 从 `src/presentation/index.ts` 导出 `DdFlameGraphView`。
- [x] **Task 4（demo）**：`demo/main.tsx` 增一段「火焰图视图（Epic 6 静态）」section，`<DdFlameGraphView trace={mockTrace} />`，固定宽度容器内渲染。
- [x] **Task 5（单测）**：
  - `src/core/flameLayout.test.ts`：mockTrace → 校验某 span 的 `width ≈ duration/trace.duration`（容差）、`depth` 与 span.depth 一致、root `left≈0`。
  - `src/presentation/DdFlameGraphView.test.tsx`（RTL）：渲染 → `FlameRect` 数量 = spans 数；某矩形 `top` 像素 = depth×rowHeight；operation 文本存在；selectedSpanId 命中矩形带选中类。
- [x] **Task 6（自验）**：typecheck + `npm test`（≥141+新增全绿）+ build；Chrome DevTools 目视 demo 火焰图（与 Datadog 截图比对层级/时间/配色）。

## Dev Notes

### 复用既有引擎（不要重造）
- **时间映射**：`createViewedBoundsFunc`（`src/core/utils.ts`，已导出）。签名 `({min,max,viewStart,viewEnd}) => (start,end) => {start,end}`，值域 [0,1]。瀑布（`VirtualizedTraceView` line 180/230/334）就是用它，火焰图复用**同一函数**，只是 y 轴换 depth。**不要**自己写时间数学。
- **span 字段**（`transform-trace-data.ts` 已填）：`span.depth`（= 调用深度，root=0）、`span.startTime`、`span.duration`、`span.relativeStartTime`、`span.operationName`、`span.process`。`trace.startTime`、`trace.duration` 为整 trace 边界。
- **着色（AD-6）**：`defaultColorAccessor(theme)`（按 service 散列分类色）/ `colorForService(name, theme)`，均在 `src/presentation/colorAccessor.ts`。**颜色只在 presentation 算**，core/flameLayout 不碰颜色。

### 架构守约（ARCHITECTURE-SPINE AD）
- **AD-2 依赖反转**：core 引擎零皮肤。`flameLayout.ts` 只产几何数据（depth/left/width），颜色/渲染留 presentation。与既有 `rowRenderer` 接缝同构。
- **AD-6 颜色全在 presentation**；**AD-7 令牌走 theme.trace**（新 `theme.trace.flame`）；**AD-12 行高归常量/令牌**（ROW_H 进 theme，不写死）；**AD-4 不可变**（布局是纯函数输出）。
- **零 @grafana/* 依赖**（同全项目）。**不引入** `@grafana/flamegraph`（profiling，模型错）。

### 渲染方式决策：div 而非 canvas
Datadog 用 canvas，但本项目用**绝对定位 div**：① 复用既有 emotion 皮肤/配色/选中样式；② DOM 可被 RTL 测试（符合项目 `[class$=]`/`data-testid` 习惯）；③ span 数通常 < 数百，div 性能足够。我们对齐 Datadog **视觉**，不必对齐其 canvas 实现（符合「内核约束引擎、表现层对齐 Datadog」原则）。canvas 留作后续大 trace 优化（非本故事）。

### 与瀑布/详情的关系
- 本故事是**独立静态视图组件**，先不接入 api 层 toggle（6.2 做）。demo 直接挂 `DdFlameGraphView` 验证。
- 选中/底部抽屉联动留 6.2：届时复用 Story 5.5 的 `selectedSpanId`/`selectSpan` + 既有 `DdSpanDetail` 底部抽屉（火焰图与瀑布**共享**同一选中态与抽屉）。

### 前序故事情报（Story 5.5 / 4.5 / 1.5）
- 5.5：`selectedSpanId` 为视图态（受控/非受控一致）；选中样式 = 主色左竖条/底色。火焰图选中预计为**矩形描边**（对齐 Datadog 黑/主色 2px），本故事仅预留样式钩子。
- 4.5：`DdColorByDropdown` + `colorForService` 已实现，6.2 工具条复用。
- 1.5/AD-12：core 行须有内在高度（火焰图矩形用显式 px 高，天然满足）。

### 调研规格（驱动视觉）
`investigations/datadog-trace-flamegraph-layout-investigation.md`：行高≈24px 紧贴堆叠、x 线性时间（误差<0.5%）、严格 depth（SET 与 GET/order 同 depth2 共行实测）、按 service 配色、选中黑2px、未插桩虚线框。**§6 实现映射**为本故事直接依据。

## References
- [Source: investigations/datadog-trace-flamegraph-layout-investigation.md §2 布局算法 / §6 实现映射]
- [Source: trace-timeline src/core/utils.ts createViewedBoundsFunc + src/core/index.ts 导出]
- [Source: trace-timeline src/presentation/colorAccessor.ts defaultColorAccessor/colorForService]
- [Source: trace-timeline src/model/transform-trace-data.ts span.depth/relativeStartTime 填充]
- [Source: ARCHITECTURE-SPINE AD-2/AD-6/AD-7/AD-12]

## Dev Agent Record

### Agent Model Used
claude-opus-4-8[1m]（dev-story）

### Debug Log References
- typecheck 0 错 · `npm test` **150 passed**（141→150，+9：4 flameLayout + 5 flamegraph，无回归）· build ESM 167.12KB clean。
- Chrome DevTools 实测 demo（localhost:5173）：9 矩形，行 top = 498/522/546/570 **步长 24px**（= rowHeight）✓；矩形高 23（=24-1 rowGap）✓；depth1 行 3 兄弟（HelloController.create / GET /order / GET /error）各按 startTime 并排（严格 depth）✓；按 service 配色（绿/品红/深绿多色）✓；容器高 96 = (maxDepth 3 + 1)×24 ✓；op+耗时标签显示（`GET /user 102ms` 等）。与上方同数据瀑布一致，结构对齐 Datadog Flame Graph。

### Completion Notes List
- **三层落地**：引擎 `core/flameLayout.ts`（`computeFlameLayout` 复用 `createViewedBoundsFunc`，零颜色/零皮肤，AD-2）+ 皮肤 `presentation/DdFlameGraphView.tsx`（绝对定位 div 矩形，`top=depth×rowHeight`，service 配色 AD-6，op/耗时标签）+ 令牌 `theme.trace.flame`（rowHeight 24 等，AD-7）+ 数据零改动。
- **严格 depth**：row=span.depth；同深度多兄弟同行各按 startTime 摆（实测 demo depth1 三兄弟并排，对齐 Datadog）。未处理同深度时间重叠的特殊排布（按调研推迟到 6.x）。
- **div 而非 canvas**：复用既有 emotion 皮肤 + 可 RTL 测试。`selectedSpanId` 仅驱动描边样式（点击联动留 6.2）。
- AC 1-7 全满足，未新增依赖。

### File List
- 新增 `src/core/flameLayout.ts`、`src/core/flameLayout.test.ts`
- 新增 `src/presentation/DdFlameGraphView.tsx`、`src/presentation/flamegraph.test.tsx`
- 修改 `src/core/index.ts`、`src/presentation/index.ts`、`src/theme/types.ts`、`src/theme/tokens/trace.ts`、`demo/main.tsx`

### Change Log
- 2026-06-28：创建 + 实现 Story 6.1（火焰图布局引擎 + 静态渲染）。core computeFlameLayout（复用 createViewedBoundsFunc）+ presentation DdFlameGraphView（div 矩形 depth→y + service 配色）+ theme.trace.flame 令牌 + demo + 9 单测。150 测试全绿；浏览器实测行高 24/严格 depth/配色对齐 Datadog。Status → review。
