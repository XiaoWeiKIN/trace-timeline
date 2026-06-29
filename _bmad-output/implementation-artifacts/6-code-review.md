# Epic 6 代码评审记录（2026-06-29）

独立 review agent（不同上下文）评审 Epic 6（火焰图视图）全部新代码。trace-timeline 非 git 仓库，故按文件列表评审而非 diff。

## 发现与处置

| 级别 | 发现 | 文件 | 处置 |
| --- | --- | --- | --- |
| **High** | H1：背景/跨 rect 拖拽松开时 `rect.onClick` 不触发，`suppressClickRef` 残留 true → **吞掉下一次正常选中点击**（高频可复现） | `DdFlameGraphView.tsx` | ✅ 修复：`handleMouseDown` 进入即 `suppressClickRef.current=false`（新按下序列复位）。加回归测试。 |
| Med | M1：`trace.duration=0` / focus 根瞬时 → `viewWindow=0` → `left/width=NaN` → 渲染 `NaN%` | `flameLayout.ts` | ✅ 修复：`compute` 对 `max−min<=0` 短路（left:0,width:0）+ `safe()` 兜 NaN。加测试。 |
| Med | M2：「放大到选中」对零宽/极窄 span → 除零 + 无 MIN_WINDOW 钳制 | `TraceTimeline.tsx` | ✅ 修复：`clampZoomWindow` 强制 ≥0.01 宽。 |
| Med | M3：`viewRange={{...}}` 对象字面量每渲染换引用 → 废掉 useMemo/memoizeOne，父级重渲染必重算布局 | `TraceTimeline.tsx` / `DdFlameGraphView.tsx` | ✅ 修复：view 的 `useMemo` 改依赖原始值 `viewStart/viewEnd`（消费端解决，与父传新对象无关）。 |
| Med | M4：focus 态下选中子树外 span → `selectedSpanBounds` 可返回反转区间 → viewWindow 负 | `TraceTimeline.tsx` | ✅ 修复：`end<=start` 返回 null。 |
| Low | L2 矩形文字色/tooltip 背景硬编码（行高类令牌已合规走 theme.trace.flame）；L3 minimap canvas/tabpanel a11y；L4 `DdTicks` numTicks=1 除零（既有代码，默认 5 不触发）；L5 accessor 每渲染重建 | 多处 | 记录，非阻塞，未改（保持范围）。 |

## AD 合规结论（评审确认）
- AD-2 ✅ `flameLayout.ts` 仅 import memoize-one + model 类型 + 同层 utils，零 presentation/theme/颜色。
- AD-6 ✅ 颜色全在 presentation（resolveColor/defaultColorAccessor）。
- AD-7 ⚠️ 行高/minimap 等关键令牌已走 theme.trace.flame；少量文字/提示色硬编码（L2，轻度偏离，非阻塞）。
- 零 `@grafana/*` ✅。

## 总体结论
评审判定 Epic 6 为**可上线水准**，分层严格遵守 AD。合并前需修的 High(H1) + 4 项 Med 边界/性能问题**已全部修复**并加回归测试。**173 单测全绿**，build ESM 187.97KB，typecheck 0 错。剩余 Low/nits 记录待后续（非阻塞）。
