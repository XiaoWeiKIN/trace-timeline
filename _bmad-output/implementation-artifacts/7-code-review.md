# Epic 7 代码评审记录（2026-06-29）

BMad code-review 工作流：3 个独立 agent（不同上下文）并行对抗式评审 Epic 7（火焰图服务图例，Story 7.1–7.4）全部新/改代码。trace-timeline 非 git 仓库，故按文件列表评审全文（9 主文件 1671 行 + theme token/index 小改）。

- **Blind Hunter**（无 spec/意图，纯代码）· **Edge Case Hunter**（边界穷举 + 项目读权限）· **Acceptance Auditor**（对 4 story AC + 调研规格验收）。

## 验收结论（Acceptance Auditor）

**通过（Pass）。** 7.1–7.4 共 **18 条 AC 全部满足**；hover 临时/click 持久 toggle、`#C2C8DD` 定值灰显、% Exec Time/Spans 双指标、Service/Host/Entity Type 维度（colorByAttr service/hostname/inferred.catalog）、URL `highlight`/`shouldShowLegend`/`colorByAttr` 契约均忠实于调研实测。**AD 分层未破坏**（core 零颜色 AD-2、颜色仅 presentation AD-6，经 grep 验证）。

## 总体结论

评审判定 Epic 7 为**可上线水准**。三层去重后得 1 High + 3 patch + 2 defer + 9 dismiss。**所有 patch（含三方共识的 High）已全部修复并补回归测试**。**202 单测全绿**（199→202），build ESM 202KB，typecheck 0 错，浏览器实测确认 F1 修复。

## Findings 与处置

### 已修复（patch）

- **F1（High，三方共识）切 Color by 维度 / 换 trace 后 pinned 高亮 key 变孤儿 → 整张火焰图 + 图例永久全灰。** `setColorBy` 原只清 hover 不清 pinned，旧维度 service key（如 `redis`）在新维度下对所有 span 都不匹配 → 全帧 `dimmed`、图例全行 dimmed 且无行可点恢复。
  - **修复**：① `useHighlightGroup` 新增 `clearPinned()`，`setColorBy` 切维度时调用清持久高亮；② api 加**孤儿 key 守卫** `safeHighlightKey`——`effectiveKey` 若不在当前维度的合法分组 key 集（`computeLegendGroups` 算）内，降级为 null（同时覆盖受控 `highlightedGroupKey` 跨 trace 变孤儿的同源场景）。下传火焰图与图例都用 `safeHighlightKey`。
  - **回归**：`api.test.tsx` CR-F1（pin 后切 Host → 主图 0 帧灰显）；浏览器实测 dimmedAfterPin=8 → dimmedAfterSwitch=0。

- **F2（Med）受控 `colorBy`/`legendMetric` 读 `??` 写 `=== undefined` 不一致** → 传 `null` 时控件冻结。**修复**：读路径统一为 `!== undefined`（与 `useHighlightGroup` 一致）。

- **F6（Med）拖拽平移途中 rect `onMouseEnter` 仍弹 tooltip + 改高亮分组**（卡住浮层 + 高亮乱闪）。**修复**：rect `onMouseEnter` 在 `dragRef.current` 存在时早退。回归：`flamegraph.test.tsx` CR-F6。

- **F7（Low）URL 空串高亮 key 往返不对称**（to 写 `highlight=`、from 丢空串）。**修复**：`toFlameLegendUrlParams` 加 `!== ''` 守卫。回归：`flamelegendurl.test.ts` CR-F7。

### 已记账（defer，非本次引入 / 低优）

- **F3（Med）`focusedRootSpanId` 跨 trace 不重置 → 聚焦态残留**。属 Epic 6（Story 6.7 Focus=re-root）既有代码，非 Epic 7 引入。记 `deferred-work.md`。
- **F5（Med）`totalExec=0`（全 span duration=0 / 全被子覆盖）→ 图例全 0.0%、空 bar、无兜底文案**。`||1` 已防 NaN，仅展示语义，退化 trace 罕见。记 `deferred-work.md`。

### 已驳回（dismiss，9 条）

URL 大小写敏感/重复 key（我方产出固定小写，对齐 Datadog）；受控未传 onChange footgun（React by-design）；空 spans 非 null trace 空壳面板（外层空态已覆盖真实场景）；对象型 tag 值 `[object Object]`（OTel tag 为原语，病态）；`DdFlameLegend` per-render 重建 Map（性能噪音，`computeLegendGroups` 已 memoize）；「复用 6.x self-time」文档措辞（Epic 6 无此计算可复用，实现新写且口径正确，属文档前提不成立）；name 元素 title 归属（功能等价，AC 满足）；灰显帧改文字色 secondary（无害可读性增量）；bar 填充色用 link 蓝（调研未采集填充色，未约束）。

## 残留（非阻塞）

defer 两项见 `deferred-work.md`。dismiss 项不跟进。

## Post-CR 修复（用户实测发现，2026-06-29）

- **图例占比 bar 填充完全不可见（视觉 bug，jsdom 测不出）。** 用户截图指出 bar 只有空灰槽、无填充。DevTools 实证：`barFill` 是 `<span>`、父 `barTrack` 非 flex 容器 → fill 未被块级化 → `display:inline` 下 width/height 百分比失效 → 渲染成 `rectW=0/rectH=0`。三层 CR agent 未覆盖（DOM 属性都在、仅布局塌陷，纯视觉）。
  - **修复**：`barFill` 加 `display:block`。顺带按实测对齐 Datadog：track 与 fill 均 30×12px、灰槽 `rgba(197,203,219,0.5)`、填充固定蓝 `rgb(53,152,236)`（所有行同色，非服务色）。
  - **占比算法本身正确**：Datadog 实测 bar = **绝对占比**（填充=百分比×轨道宽，52.8%→52.8%…逐位吻合），非归一化到最大值；我方 `ratio=execTimeRatio` 一致，未改。
  - **复验**：浏览器实测 mall-order-api 76.4%→fill 22.91/30=76.4%、user-service 13.1%、redis 6.0%、mysql 4.4% 逐位精确，`display:block` 生效。202 测试仍绿，build 204KB。
  - **教训**：纯布局/视觉 bug（inline 元素吞 width%）jsdom 无布局测不出，必须真机核验；自验时除了「状态/属性」也要看「实际渲染尺寸」。
