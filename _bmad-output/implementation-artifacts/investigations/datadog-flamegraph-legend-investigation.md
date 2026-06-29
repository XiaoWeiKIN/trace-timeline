# Datadog Flame Graph —— 服务图例（Color Legend）交互调研

> 调研日期：2026-06-29
> 方法：Chrome DevTools 连真机，对 `us5.datadoghq.com` 实时 trace 页（`6a3a259d…`，Flame Graph 视图）做 DOM 探针 + 交互实测，证据分级。
> 目的：忠实移植右侧「% Exec Time」服务图例面板的结构与交互。
> 关联：[datadog-trace-flamegraph-layout-investigation.md]（火焰图布局），[datadog-categorical-palette]（20 色服务色板）。

---

## 0. 一句话结论

图例 = **「分组指标排行榜 + 高亮控制器」**：按所选维度（默认 Service）把火焰图分组，按所选指标（默认 % Exec Time）降序排行；**悬停某行 = 临时高亮该组（内存态），点击某行 = 持久高亮（写 URL `highlight=`，再点取消）**；高亮时火焰图里匹配组保持满色、其余 span 灰显。

---

## 1. 面板锚点与 DOM 类族（证据：直接读 DOM，强）

| 元素 | class / 选择器 | 说明 |
|---|---|---|
| 图例根/表头 | `trace_color-legend__table-header` | 含右上指标 select |
| 指标下拉 | `button.druids_form_select`，当前值 `% Exec Time` | DRUIDS react-select，`max-width:115px` |
| 图例行 | `span.trace_color-legend-element` | 每个分组一行，`title="Click to highlight this group"` |
| 行状态修饰类 | `--is-highlighted` / `--is-dimmed` | 见 §4 三态 |
| 色块 | `.trace_color-legend-element__square`，内联 `background-color` | 分组色，如 `rgb(87,183,154)=#57B79A` |
| 名称 | `.trace_color-legend-element__item`，`title="my-order-service (2 spans)"` | 含 span 计数 tooltip；超长走 `overflower` 省略+悬浮全名 |
| 数字+进度条 | `.trace_color-legend-element__number-and-percent-bar` | 百分比文字 + 占比 bar |
| 进度条空槽 | 背景 `#E2E5ED` | 灰色轨道（=100% 参考），填充部分按比例 |

> 注：探针一度把 `#E2E5ED`（bar 空槽）误读成色块色——真正的分组色取自行内 `__square` 的内联 `background-color`。`#57B79A` 正是我们 20 色板里的青绿，**反向印证色板与 Datadog 一致**。

---

## 2. 两个正交控制维度（证据：实测下拉项，强）

| 控件 | 位置 | 选项 | URL 参数 | 作用 |
|---|---|---|---|---|
| **Color by** | 工具栏右（"Color by" 标签旁） | `Service` / `Host` / `Entity Type` | `colorByAttr=service` / `hostname` / `inferred.catalog` | 决定火焰图 span **按什么分组着色**，图例随之换成该维度的分组 |
| **指标（图例表头下拉）** | 图例右上 | `% Exec Time` / `Spans` | 无（不写 URL） | 决定每行**显示与排序所依据的数值**：执行耗时占比 vs span 数量 |

- 两者正交：Color by 选「维度」，指标下拉选「度量」。
- 图例**按所选指标降序**排列（实测：% Exec Time → 52.8% > 18.4% > 18.1% > 10.7%；Spans → 2,2,1,1）。

**Color by 各维度实测（本 trace 6 span）：**
- `Service`：4 组 → my-order-service `#57B79A` / 192.0.2.10 `#457557` / flux-service `#50931F` / redis `#C68CCD`（均落在 20 色板内）。
- `Host`：1 组 → `MacBook-Air-38.local (6 spans)`（全同主机合一组，占 100%）。
- `Entity Type`：4 组 → my-order-service / flux-service 为真实服务；下游依赖标 `(inferred)`：`http (inferred)`、`redis (inferred)`（按推断目录实体分组）。

**指标切换实测：** `% Exec Time` 显示耗时占比%；`Spans` 显示 span 原始计数并按计数降序重排，bar 改为按计数占比。

---

## 3. 核心交互（证据：实测，强）

### 3.1 悬停行 = 临时高亮（内存态）
- `mouseenter` 图例行 → 该行 `--is-highlighted`、其余 `--is-dimmed`。
- **URL 不变**（`highlight` 参数保持空）。移开即恢复。
- 火焰图联动：匹配该组的 span 保持满色，其余 span 灰显（褪色）。

### 3.2 点击行 = 持久高亮（URL 态，可 toggle）
- 点击 → 写入 URL 查询参数 **`highlight=<group>`**（实测 `highlight=flux-service`），该行 `--is-highlighted`。
- **再次点击同一行 → 移除 `highlight` 参数**，回到全体 `--is-dimmed`（静息）。
- 即「单选 + toggle」语义；高亮态可通过 URL 分享/还原。

### 3.3 高亮的视觉效果（证据：canvas 像素采样，强）
- 实测 `highlight=flux-service`：flux-service 帧**保持服务色 `#50931F`**；其余帧全部变灰。
- **灰显算法 = 定值替换，不是降透明度/去饱和**：所有非匹配 span 一律刷成**同一个扁平灰 `#C2C8DD`**，与原服务色无关——
  - my-order-service `#57B79A` → `#C2C8DD`
  - 192.0.2.10 `#457557` → `#C2C8DD`
  - redis `#C68CCD` → `#C2C8DD`
  - flux-service（目标）`#50931F` → 不变
- 三个不同原色 dim 后得到**完全相同**的 `#C2C8DD`，证明是常量填充，移植时直接用该灰填非高亮帧即可。
- 火焰图为 **`<canvas>` 渲染**（backing store 2158×404，dpr 2），帧无 DOM/a11y 节点。

### 3.4 显示/隐藏图例
- "Hide Legend" 按钮 → URL `shouldShowLegend=false`，图例**从 DOM 移除**，按钮文字翻转为 "Show Legend"；再点恢复。
- 状态持久化在 URL，可分享。

---

## 4. 行状态三态模型

| 态 | class | 触发 | 火焰图 |
|---|---|---|---|
| 静息（无高亮） | 所有行 `--is-dimmed` | 默认 | 全部满色（无对比） |
| 高亮目标 | 该行 `--is-highlighted` | hover 或 click | 匹配组满色 |
| 被压暗 | 其余行 `--is-dimmed` | 有任一行高亮时 | 非匹配 span 灰显 |

> 命名注意：`--is-dimmed` 同时是「默认」与「被压暗」的类名——静息时全体 dimmed 只是因为没有对比对象，**视觉压暗只有在存在某行 highlighted 时才生效**。

---

## 5. URL 状态参数（移植时的状态契约）

| 参数 | 值例 | 含义 |
|---|---|---|
| `graphType` | `flamegraph` | 视图（图例仅火焰图视图出现） |
| `shouldShowLegend` | `true`/`false` | 图例显隐 |
| `highlight` | `flux-service` | 持久高亮的分组（点击写入，再点移除；hover 不写） |
| `colorByAttr` | `service` / `hostname` / `inferred.catalog` | Color by 维度 |

---

## 6. 移植映射建议（对接现有架构）

- **分层**：图例属「皮肤」层，core 不应感知。沿用 AD-2 接缝——core 暴露「分组聚合结果（组名/组色/指标值/spanCount）」+「当前高亮组」状态与回调，api 注入 Datadog 图例皮肤。
- **状态**：高亮组建议进 state 容器（受控/非受控双轨，沿用 Story 2.1 模式），并预留「序列化到 URL」的 hook（`highlight` / `shouldShowLegend`），与现有 Story 5.x 的 deep-link 思路一致。
- **两态高亮**：区分 hover（transient，不入持久状态/URL）与 click（persistent，入状态/URL，toggle）。
- **指标 × 维度**：Color-by（Service/Host/Entity Type）与指标（% Exec Time/Spans）两个独立 enum；图例行排序 = 选定指标降序。
- **复用**：分组色直接走已有 `getColorByKey` + 20 色 `DATADOG_CATEGORICAL_PALETTE`；进度条空槽 `#E2E5ED`。
- **MVP 切法**：先做 Color by=Service + 指标=% Exec Time + hover/click 高亮 + 显隐；Host/Entity Type 维度与 Spans 指标作为后续增量。

---

## 7. 证据分级与待验证项

**强证据（实测/DOM 直读/canvas 像素采样）**：DOM 类族、两维下拉选项、hover/click 高亮差异、`highlight` toggle、`shouldShowLegend` 显隐、`colorByAttr` 维度映射、Spans/% Exec Time 指标行为、分组色取值、**灰显=定值 `#C2C8DD`**。

**二轮已钉死（原待验证 2/3/4）**：
2. ✅ **Host / Entity Type 维度**：见 §2——Host 按主机名合组（`colorByAttr=hostname`），Entity Type 按推断目录实体分组、下游依赖标 `(inferred)`（`colorByAttr=inferred.catalog`）。
3. ✅ **指标=Spans**：显示 span 计数、按计数降序、bar 改计数占比（见 §2/§3）。
4. ✅ **灰显算法**：常量填充 `#C2C8DD`，非按原色变换（见 §3.3）。

**仍未验证（方法受限，非优先）**：
1. **反向联动**（悬停火焰图帧 → 反高亮图例行）：火焰图为 `<canvas>` 渲染，帧无 DOM/a11y 节点；canvas 命中测试仅认 trusted OS 指针事件，合成 pointer/mouse 事件（含 `offsetX/Y`）无法触发。现有工具（`hover` 仅接受 a11y uid、无坐标接口）无法瞄准单帧，故无法复现验证。**正向（图例→火焰图）已确认**；反向是否作为特性存在，需真实指针注入或读取前端源码进一步确认。
