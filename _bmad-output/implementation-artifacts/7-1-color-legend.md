---
baseline_commit: n/a（trace-timeline 非 git 仓库，按文件列表追踪）
---

# Story 7.1: 火焰图服务图例（Color Legend — MVP：Service × % Exec Time + 双态高亮 + 显隐）

Status: done

> Epic 7：火焰图服务图例面板移植（对齐 Datadog Flame Graph 右侧 Legend）。
> 规格来源：[investigations/datadog-flamegraph-legend-investigation.md]（真机 DevTools 实测，证据分级）。
> 本 story = 调研 §6「MVP 切法」：Color by=Service + 指标=% Exec Time + hover/click 高亮 + 显隐。Spans 指标与 Host/Entity Type 维度见 Epic 7 backlog（7.2/7.3）。

## Story

As a 排障用户,
I want 火焰图右侧有一个服务图例，列出各服务的执行耗时占比并可点击/悬停高亮某个服务组（其余 span 灰显），还能收起,
so that 我能一眼看清哪个服务最耗时，并把注意力聚焦到单个服务的所有 span（对齐 Datadog Flame Graph 的 Color Legend）。

## Acceptance Criteria

1. **面板渲染**：火焰图模式下，图例面板列出 trace 内**各 service 分组**，每行 = `[色块] 服务名 … 占比% [占比 bar]`。
   - 色块色 = 该服务的火焰图配色（复用 `colorAccessor`，与帧同源）。
   - 占比 = 该服务 **% Exec Time**（self/exec time 口径，与火焰图一致）；bar 宽 = 占比，灰槽 `#E2E5ED` 作 100% 参考。
   - 行**按占比降序**排列。
   - 服务名超长省略 + `title` 全名；行 `title="<service> (N spans)"`（span 计数）。
2. **悬停 = 临时高亮（内存态）**：`mouseenter` 某行 → 该行高亮态、火焰图中**匹配该服务的帧保持服务色、其余帧刷成扁平灰 `#C2C8DD`**；`mouseleave` 恢复。不写任何持久状态。
3. **点击 = 持久高亮（可 toggle）**：点击某行 → 持久高亮该服务（同样的帧灰显联动）；再次点击同一行 → 取消。持久态经 `onHighlightChange(serviceKey | null)` 暴露（受控/非受控双轨，沿用 state hook 范式）。
4. **双向联动（本移植增益）**：悬停火焰图某帧 → 对应图例行也进入高亮态（我们的帧是 DOM，可做 Datadog canvas 难做的反向联动）。
5. **显隐**：图例可收起/展开（toggle 按钮，`Hide Legend` / `Show Legend`）；显隐状态经 `showLegend`/`onShowLegendChange` 暴露（默认显示）。
6. typecheck/test/build 通过，不回归（当前基线 173 测试）。

## Tasks / Subtasks

- [x] Task 1（core，纯聚合零着色 — AD-2）：新增 `src/core/legendGroups.ts`
  - `computeLegendGroups(trace, { dimension: 'service', metric: 'execTime' }): LegendGroup[]`
  - `LegendGroup = { key: string; label: string; spanCount: number; execTimeRatio: number /*0..1*/ }`
  - execTime 口径与火焰图 % 对齐（**复用 6.x 既有 self/exec-time 计算**，勿另起一套）；按 metric 降序排序。
  - 纯函数，零 theme/颜色 import。单测覆盖。
- [x] Task 2（presentation）：新增 `src/presentation/DdFlameLegend.tsx`
  - props：`{ trace; colorAccessor?; highlightedKey?: string | null; onHighlightChange?(key|null); showLegend?: boolean; onShowLegendChange?(b); metric?: 'execTime' /*7.2 加 'spans'*/; dimension?: 'service' /*7.3 加 host/entity*/ }`
  - 调 `computeLegendGroups` 得分组；色块色 = `(colorAccessor ?? defaultColorAccessor(theme))(代表 span)` 或 `colorForService(key, theme)`。
  - 行结构对齐调研 §1：`__square`（色块）+ 名称（emotion overflower 省略 + title）+ 数字 + bar（灰槽 `#E2E5ED` + 填充）。`data-testid="DdFlameLegendRow"`，行 `title="<svc> (N spans)"`。
  - 交互：`onMouseEnter`→`setHover(key)`；`onMouseLeave`→`setHover(null)`；`onClick`→`onHighlightChange(key===highlightedKey ? null : key)`（toggle）。**有效高亮 = hover ?? highlightedKey**（hover 优先，临时盖持久）。
  - 行三态 class：有效高亮 key === 本行 → highlighted；否则（存在任一有效高亮时）dimmed；无高亮 → 静息。对齐 Datadog `--is-highlighted/--is-dimmed`。
  - 显隐：`showLegend` false 时只渲染 `Show Legend` 角标按钮（`data-testid="DdFlameLegendToggle"`）。
  - `data-testid="DdFlameLegend"`。导出（`presentation/index.ts`）。
- [x] Task 3（灰显联动）：`DdFlameGraphView` 增 props `{ highlightedGroupKey?: string | null; groupKeyForSpan?(span): string; onSpanHover?(key|null) }`
  - 渲染每个 rect 时：若 `highlightedGroupKey != null && groupKeyForSpan(span) !== highlightedGroupKey` → 背景用 `theme.trace.flame.dimmedFill`（新增 token，light=`#C2C8DD`；dark 取等价中性灰，暗模式后续精修）。否则用 colorAccessor 服务色。
  - rect `onMouseEnter`→`onSpanHover(groupKeyForSpan(span))`、`onMouseLeave`→`onSpanHover(null)`（驱动 AC4 反向联动）。
  - 默认 props 不传时行为与现状完全一致（零回归）。
- [x] Task 4（api 接线）：`api/TraceTimeline.tsx`
  - 新增受控/非受控 highlight 与 showLegend（新 hook `useHighlightGroup`，参照 `useSearch` 范式，放 `src/state/`）。
  - 火焰图模式：在火焰图右侧渲染 `DdFlameLegend`（trace/colorAccessor/highlightedKey/onHighlightChange/showLegend/onShowLegendChange）。
  - 给 `DdFlameGraphView` 传 `highlightedGroupKey`、`groupKeyForSpan=(s)=>getServiceColorKey(s.process)`、`onSpanHover`（hover 帧 → set 临时高亮，复用 legend 的 hover 通道）。
  - 新增 token `theme.trace.flame.dimmedFill` 于 `src/theme/tokens/trace.ts`。
- [x] Task 5（state）：新增 `src/state/useHighlightGroup.ts`（受控/非受控，value=string|null + showLegend bool），`state/index.ts` 导出，并入 `useTraceTimeline` 聚合（若有）。
- [x] Task 6（单测）：
  - core：`computeLegendGroups` 出组数=服务数、占比和≈1、降序。
  - presentation：渲染行数=服务数 + 色块 + 占比文本；click 行 → `onHighlightChange` 收到 key、再点收到 null（toggle）；hover 行 → 行进入 highlighted；`showLegend=false` 只剩 toggle。
  - flame view：传 `highlightedGroupKey` → 非匹配 rect 背景=dimmedFill、匹配 rect=服务色（断言 style/class，不验像素）。
- [x] Task 7（自验）：typecheck/test/build + Chrome DevTools（图例排序、hover/click 高亮 + 帧灰显、反向 hover 帧→行、收起/展开）。

## Dev Notes

- **AD 分层**：聚合（core，零色）↔ 着色与图例皮肤（presentation，AD-6）↔ 状态（state hook，受控/非受控）。core 不得 import theme/颜色。
- **灰显 = 定值填充**（调研 §3.3 实测）：非高亮帧一律 `#C2C8DD`，**不是降透明度/去饱和**——直接换背景色即可，勿做 opacity/filter。
- **hover vs click 两态**（调研 §3.1/3.2）：hover 临时（不入持久态/URL），click 持久（toggle）。有效高亮 = `hover ?? persisted`。
- **反向联动**：Datadog 因火焰图是 canvas、帧无 DOM 节点而难做（调研 §7 遗留项①）；**我们的帧是绝对定位 div，天然可双向**，作为移植增益纳入本 story（AC4）。
- **配色复用**：服务色走既有 `colorAccessor`/`colorForService` + 20 色 `DATADOG_CATEGORICAL_PALETTE`；实测 4 服务色（`#57B79A`/`#457557`/`#50931F`/`#C68CCD`）全落在该色板内，色块与帧同源即可一致。
- **URL 状态契约**（调研 §5，本 story 仅暴露 value/onChange，不接 URL）：后续 deep-link 可映射 `highlight=<key>` / `shouldShowLegend` / `colorByAttr`，与 Story 5.x deep-link 思路一致——本 story 留好 hook 即可。
- **现有 `DdColorByDropdown`（Story 4.5）选项过时**：当前为 `service/operation/service-operation/duration`，而 Datadog 实际为 `Service/Host/Entity Type`（调研 §2）。**本 story 不动它**，留到 7.3 维度扩展时一并修正（`colorByAttr=service/hostname/inferred.catalog`）。
- **指标口径**：% Exec Time 必须复用火焰图既有 self/exec-time 计算（Epic 6），避免双实现漂移。
- jsdom 宽 0：bar 宽度断言走百分比 style，不验像素（参照 6.5 minimap 测试策略）。

## Epic 7 Backlog（本 story 之后）

- **7.2 指标切换**：图例表头下拉 `% Exec Time` / `Spans`（调研 §2/§3 实测：Spans 显示计数、按计数降序、bar 按计数占比）。
- **7.3 Color by 维度扩展**：`Host`（`colorByAttr=hostname`，按主机合组）、`Entity Type`（`colorByAttr=inferred.catalog`，下游依赖标 `(inferred)`）；并修正过时的 `DdColorByDropdown` 选项 + 接 `groupKeyForSpan` 维度切换。
- **7.4（可选）URL 状态契约**：`highlight` / `shouldShowLegend` / `colorByAttr` deep-link 序列化（依赖 Story 5.x deep-link 基建）。

## Dev Agent Record
### Agent Model Used
claude-opus-4-8[1m]（dev-story）
### Debug Log References
- typecheck 0 错 · `npm test` **188 passed**（173→188，+15）· build ESM 199.21KB（188→199）。
- Chrome DevTools 实测（demo localhost:5173，火焰图视图）：
  - 图例渲染 4 服务组降序：mall-order-api 76.4% / user-service 13.1% / redis 6.0% / mysql 4.4%（% Exec Time + bar + Hide Legend）。
  - 点 redis 行 → 持久高亮：主火焰图 s3(redis) 保留 `rgb(200,107,116)`，其余 8 帧全刷 `rgb(194,200,221)=#C2C8DD`（**与 Datadog 实测灰逐位一致**）；图例 redis=highlighted、余 dimmed；持久（+1500ms 不变）。
  - 反向联动：mouseover user-service 帧 s7 → 图例 user-service 行 highlighted、余 dimmed、s1 灰显（DOM 帧白捡 Datadog canvas 做不到的双向）。
  - Hide Legend → 0 行 + 按钮 "Show Legend"；再点恢复。
  - minimap 微缩帧不参与灰显（正确）。
### Completion Notes List
- **core**：`legendGroups.ts` `computeLegendGroups`（self-time 口径 = duration − 子区间并集，单测验 60/40；按 service 分组、按指标降序；按基本类型 memoize 避 M3）。零着色（AD-2）。
- **presentation**：`DdFlameLegend.tsx`（色块用 colorAccessor 与帧同源 AD-6；行三态 data-state；hover/click 回调；Hide/Show）；`DdFlameGraphView` 加 `highlightedGroupKey`+`groupKeyForSpan`+`onSpanHover`，非匹配帧背景 `theme.trace.flame.dimmedFill`（新 token，light `#C2C8DD`），rect mouseEnter 回传组 key（反向联动）。
- **state**：`useHighlightGroup`（hover 临时 + pinned 持久 toggle + showLegend；受控/非受控）。
- **api**：`TraceTimeline` 接 4 个受控/非受控 props，flameWrap 改 flex 容纳右侧图例，`groupKeyForSpan=getServiceColorKey(process)`，effective=hover??pinned 双投影给图例与火焰图。
- 6 条 AC 全满足（含 AC4 反向联动增益）。默认不传新 props 时火焰图零回归（单测锁定）。
### File List
- 新增 `src/core/legendGroups.ts(+legendgroups.test.ts)`、`src/presentation/DdFlameLegend.tsx(+flamelegend.test.tsx)`、`src/state/useHighlightGroup.ts`
- 修改 `src/core/index.ts`、`src/presentation/{DdFlameGraphView,index}.tsx`、`src/presentation/flamegraph.test.tsx`、`src/state/index.ts`、`src/theme/{types.ts,tokens/trace.ts}`、`src/api/TraceTimeline.tsx`
### Change Log
- 2026-06-29：实现 Story 7.1（火焰图服务图例 MVP：Service×%ExecTime + hover/click 双态高亮 + `#C2C8DD` 灰显 + 显隐 + 反向联动）。188 测试全绿；浏览器实测对齐 Datadog。Status → review。Epic 7 首 story 完成。

- 2026-06-29：Epic 7 code-review 通过（3 agent 对抗式）。本 story 相关 CR-patch 已修+回归。详见 [7-code-review.md]。Status → done。
