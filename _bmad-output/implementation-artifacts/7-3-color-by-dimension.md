---
baseline_commit: n/a（trace-timeline 非 git 仓库）
---

# Story 7.3: Color by 维度扩展（Service / Host / Entity Type）

Status: done

> Epic 7 backlog 项。规格：[investigations/datadog-flamegraph-legend-investigation §2]（实测 Datadog Color by = Service/Host/Entity Type，URL `colorByAttr=service/hostname/inferred.catalog`）。
> 同时修正 Story 4.5 遗留的过时 `DdColorByDropdown` 选项（service/operation/service-operation/duration → Service/Host/Entity Type）。

## Story

As a 排障用户,
I want Color by 能在 Service / Host / Entity Type 间切换,
so that 火焰图与图例可按服务、主机或推断实体重新分组着色（对齐 Datadog Color by）。

## Acceptance Criteria

1. `DdColorByDropdown` 选项 = `Service` / `Host` / `Entity Type`（全部可选；删除旧 operation/duration stub）。
2. 切维度 → 火焰图帧 + 图例分组/着色 + minimap + 瀑布 rowRenderer 全部按新维度重算。
3. **Host**：按 host 标签分组（process/span tags：host/hostname/host.name/net.host.name/http.host），缺失回退 `unknown host`。
4. **Entity Type**：按服务分组；带 `db.system`/`db.type`/`peer.service`/`messaging.system`/`rpc.system` 标签的下游依赖标 `(inferred)`。
5. 维度状态受控/非受控（`colorBy`/`onColorByChange`/`defaultColorBy`），切维度清临时 hover 高亮。
6. typecheck/test/build 通过，不回归（既有 colorby 测试同步更新）。

## Tasks / Subtasks

- [x] core `legendGroups.ts`：`LegendDimension='service'|'host'|'entity'`；导出 `dimensionKeyFor`/`dimensionLabelFor`（host 读 tag、entity inferred 检测）；`compute` 按维度分组。
- [x] presentation `colorAccessor.ts`：`colorAccessorForDimension(dimension, theme)`（散列维度 key 到色板）。
- [x] `DdColorByDropdown`：选项改 Service/Host/Entity Type，value=LegendDimension，onChange 透传。
- [x] `DdSearchBar`：加 `colorBy`/`onColorByChange` 透传给下拉。
- [x] `DdFlameLegend`：加 `dimension` prop，传给 computeLegendGroups。
- [x] `TraceTimeline`：`colorBy` 受控/非受控；`effectiveColorAccessor`（service→用户/默认；host/entity→维度散列）流向 rowRenderer/火焰图/图例/minimap/抽屉；`groupKeyForSpan=dimensionKeyFor(s,colorBy)`；接 DdSearchBar。
- [x] 单测：dropdown 选项 = [service,host,entity] 全可选 + onChange(host/entity)；core entity→(inferred)、host→tag/回退。
- [x] 自验 typecheck/test/build + DevTools。

## Dev Notes

- **AD-6**：颜色仍只在 presentation（`colorAccessorForDimension`）；core 仅给维度 key（零颜色）。
- **inferred 检测**靠真实 tag（mock redis 有 `db.system=redis`、mysql 有 db 标签）→ 忠实复现 Datadog `(inferred)`。
- Host 维度在 mock 上呈 `localhost`（server span 带 http.host）+ `unknown host`（其余）——数据所限的真实降级；真实 trace 带 hostname 标签时正常分组。
- 切维度清 hover 高亮，避免旧维度 key 残留。

## Dev Agent Record
### Agent Model Used
claude-opus-4-8[1m]（dev-story）
### Debug Log References
- 含在 Epic 7 合并验证：**199 测试全绿**，typecheck 0，build ESM 202KB。
- DevTools：colorByOptions=[service,host,entity]；Host → `unknown host` 76.6% / `localhost` 23.4%；Entity → `redis (inferred)` / `mysql (inferred)` + 真实服务，mysql 帧换色（维度 key 变→重新着色）。
### Completion Notes List
- 维度抽象 `dimensionKeyFor`/`colorAccessorForDimension` 贯通分组+着色，Color by 在两视图都生效。
- 修正过时 DdColorByDropdown 选项；既有 colorby 测试随之更新。
### File List
- 修改 `src/core/{legendGroups.ts,index.ts}`、`src/presentation/{colorAccessor,DdColorByDropdown,DdSearchBar,DdFlameLegend,index}.{ts,tsx}`、`src/presentation/colorby.test.tsx`、`src/core/legendgroups.test.ts`、`src/presentation/flamelegend.test.tsx`、`src/api/TraceTimeline.tsx`
### Change Log
- 2026-06-29：实现 7.3（Color by Service/Host/Entity Type + 维度着色/分组 + 修正过时 dropdown）。Status → review。

- 2026-06-29：Epic 7 code-review 通过（3 agent 对抗式）。本 story 相关 CR-patch 已修+回归。详见 [7-code-review.md]。Status → done。
