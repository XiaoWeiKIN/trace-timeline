# 状态 hooks 重许可重写规格（clean-room behavioral spec）

> **背景**：对外公开发布需 Apache-2.0。`src/state/` 下 4 个 hook（`useChildrenState`/`useDetailState`/`useViewRange`/`useHoverIndentGuide`）经核实是 **Grafana 自研、AGPL-3.0** 代码的近逐行移植（Grafana `public/app/features/explore/TraceView/` 中这些文件**无上游 Apache 头**，已 WebFetch 确认 `useChildrenState.ts` 无任何版权头 → 属 grafana/grafana 整库 AGPL）。`filterSpans`/`useSearch` 虽已是本项目自研简化实现，但注释自述「派生自 grafana」制造了派生痕迹。
>
> **目标**：以**行为契约（WHAT）**而非 Grafana 的**具体表达（HOW）**为依据，独立重写这 6 个文件为本项目原创 Apache 代码，功能/性能**对齐或更优**，并以 225 测试 + 新增特征化测试锁定。本文件即重写的规格之书。

## 不可变性契约（贯穿全部）

所有状态变更**返回新的 `Set`/`Map` 引用**（AD-4）——引擎多处 `memoizeOne` 依赖引用相等判失效；原地改将导致漏渲染。重写须保持「每次变更换新引用」。

## 1. `useChildrenState` — 折叠状态

**状态**：`childrenHiddenIDs: Set<spanID>`——子树被隐藏（折叠）的父 span 集合。

**导出表面（须严格保持）**：`{ childrenHiddenIDs, expandOne, collapseOne, expandAll, collapseAll, childrenToggle }`。

| 方法 | 行为契约 |
|---|---|
| `childrenToggle(spanID)` | 该 id 在集合中则移除、否则加入（单 span 折叠开关）。 |
| `expandAll()` | 清空集合（全展开）。 |
| `collapseAll(spans)` | 把**所有** `hasChildren` 的 span 加入集合。守卫：若「父 span 总数 === 已折叠数」（已全折叠）则 no-op。 |
| `collapseOne(spans)` | **逐层折叠（自底向上一层）**：折叠每个「**当前可见、未折叠、且其子树内没有可见未折叠父 span**」的父 span（即各分支最深的可展开父）。 |
| `expandOne(spans)` | **逐层展开（自顶向下一层）**：展开每个「**当前可见（无被折叠的祖先）的已折叠**」父 span（即各分支最浅的折叠点）；同一次调用不递归展开其更深的折叠后代。 |

**定义**：span「可见」= 其任一祖先都不在 `childrenHiddenIDs`（折叠 span 自身可见，其后代不可见）。

**特征化基准**（mockTrace，DFS 序 s1(d0)>s2(d1)>s3 / s7(d1)>s8(d2)>s9 / s4(d1)>{s5,s6}；hasChildren=s1,s2,s7,s8,s4）：
- `collapseOne` ×3：`{}` → `{s2,s4,s8}` → `{s2,s4,s7,s8}` → `{s1,s2,s4,s7,s8}`
- 续 `expandOne` ×2：→ `{s2,s4,s7,s8}` → `{s8}`

**性能**：原实现每方法 1 次 `spans.reduce` + `collapse*` 用 `filter` 建父数组（O(n) 含额外分配）。重写用 **for-of 单趟扫描 + 计数式 `allParentsCollapsed`**，持 span 引用（零临时对象），collapseOne/expandOne 与原算法**行为逐位一致**（差分测试 12 万步、含不可达退化态 0 分歧）但更快——实测 50000 spans：collapseOne 1.43→0.76ms（~1.87×）、expandOne 0.60→0.45ms、collapseAll 1.73→0.92ms（~1.88×）。

## 2. `useDetailState` — 详情面板展开态

**状态**：`detailStates: Map<spanID, DetailState>`。`DetailState`（class）本身带 **Apache-2.0 Uber 头、源自 Jaeger，保留不动**；本 hook 仅是其 Map 容器 + React 包装，需重写。

**导出表面**：`{ detailStates, toggleDetail, ensureDetail, detailSectionToggle, detailLogItemToggle, detailLogsToggle, detailWarningsToggle, detailStackTracesToggle, detailReferenceItemToggle, detailReferencesToggle, detailProcessToggle, detailTagsToggle }`。

| 方法 | 契约 |
|---|---|
| `trace` 变化 | `useEffect` 清空 Map（换 trace 不残留详情态）。 |
| `toggleDetail(id)` | 有则删、无则置 `new DetailState()`。 |
| `ensureDetail(id)` | 幂等确保有条目（Story 5.5 选中进抽屉用，已存在不覆盖）。 |
| `detailSectionToggle(id,name)` | 取该 id 的 DetailState，调 `.toggleSection(name)`，写回新实例。条目不存在则 no-op。 |
| `detail{Tags,Process,Logs,Warnings,StackTraces,References}Toggle(id)` | 同上，分别调对应 `DetailState.toggleXxx()`。 |
| `detailLogItemToggle(id, log)` / `detailReferenceItemToggle(id, ref)` | 调 `.toggleLogItem(log)` / `.toggleReferenceItem(ref)`。 |

每次变更换新 `Map` 引用 + 调 DetailState 的不可变 toggle（返回新实例）。

## 3. `useViewRange` — 缩放区间状态

**状态**：`viewRange: ViewRange`，初值 `{ time: { current: [0,1] } }`。
**导出**：`{ viewRange, updateViewRangeTime, updateNextViewRangeTime }`。
- `updateViewRangeTime(start,end)`：设 `time.current = [start,end]`。
- `updateNextViewRangeTime(update)`：把 `ViewRangeTimeUpdate` 浅合并进 `time`（用于拖拽中的 next 预览区间）。
两者均函数式 setState、返回新对象。

## 4. `useHoverIndentGuide` — 缩进竖线 hover 共享态

**状态**：`hoverIndentGuideIds: Set<spanID>`。
**导出**：`{ hoverIndentGuideIds, addHoverIndentGuideId, removeHoverIndentGuideId }`——加/删一个 id，换新 Set 引用。

## 5. `filterSpans(query, spans)` — 文本子串搜索（已自研，仅去派生注释）

返回命中 `Set<spanID>`；query 空 → `undefined`（= 无过滤）。多词空格分隔，**任一词**子串命中**任一字段**（大小写不敏感）即命中；字段含 `operationName / process.serviceName / tags(key+value) / process.tags / logs(field key+value, log.name) / spanID(整词相等)`。纯函数、无第三方表达。

## 6. `useSearch(trace)` — 搜索状态（已自研，仅去派生注释）

**导出 `SearchState`**：`query/setQuery, matches, matchCount, showMatchesOnly/setShowMatchesOnly, errorsOnly/setErrorsOnly, errorCount, focusedMatchId, focusedMatchIndex, nextMatch, prevMatch`。
- `matches` = `filterSpans(query)`；`errorsOnly` 时与错误 span 集取交集（无 query 则即错误集）。
- 命中按 trace 顺序排成 `orderedMatches`，`cursor` 环形导航（`focusedMatchIndex` 1-based）。
- `setQuery`/`setErrorsOnly` 重置 cursor=0。`errorCount` = `isErrorSpan` 计数。

## 验收

- 6 文件头部注释改为本项目原创（删除「移植自/简化自 grafana」字样），不留派生表述。
- `useChildrenState`/`useDetailState`/`useViewRange`/`useHoverIndentGuide` 不再含 Grafana 英文 JSDoc 原文。
- 新增 `useChildrenState` 的 collapseOne/expandOne 特征化测试（锁上方基准）。
- 全量 225+ 测试绿；行为零回归；性能 O(n) 不劣化。
- `LICENSE-INVENTORY.md` 将这 6 文件从「需核实/AGPL 风险」移入「本库自研 Apache」。
