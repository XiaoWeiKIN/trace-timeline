---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 2.5: 滚动定位到指定 span

Status: review

## Story

As a 使用方,
I want 设置 `focusedSpanId` 时视图自动滚动到该 span,
so that 能从外部（搜索结果 / span 列表 / 深链）定位到具体 span。

## Acceptance Criteria

1. **Given** 一个超出视口的目标 spanID **When** 设置 `focusedSpanId` 为该值 **Then** 视图滚动到该 span，且不被表头遮挡（补偿 headerHeight + 留白）（FR-7）。
2. **And** 首次挂载滚动一次；后续 `focusedSpanId` 变化时再次滚动；无关 props 变化不触发滚动。
3. **And** 定位行高亮（isFocused → selectedRowBg）。
4. **And** `npm run typecheck` / `npm test` / `npm run build` 全过；带 scrollToSpan 回归单测。

## Tasks / Subtasks

- [x] Task 1：回归单测（AC: #1,#2）`src/core/scroll-to-span.test.tsx` — mock `./ListView`（scrollToIndex 是实例字段无法 spy 原型）共享 spy：挂载即按 focusedSpanId 索引滚动 + 补偿 headerHeight；rerender 改 focusedSpanId 触发重滚；无关 prop 变化不重滚；未设置 focusedSpanId 不滚。
- [x] Task 2：demo 暴露（AC: #1,#3）`demo/main.tsx` 增受限高度（120px 使尾部 span 出视口）的受控 `<TraceTimeline>` 实例 + 「定位顶部/底部/清除」按钮（focusedSpanId + onFocusedSpanIdChange）。
- [x] Task 3：自验 typecheck/test/build + Chrome DevTools。
- [x] Task 4（联调发现的缺陷修复）：ListView 双滚动容器 bug——api 外层 `overflow:auto` 容器 + ListView 内层 wrapper 同样 `overflow:auto;height:100%` → 内层抢走滚动、`_wrapperElm.scrollTop` 恒 0、scrollToIndex 滚错元素失效。修复：ListView 仅在「无外部 scrollElement」时才给 wrapper 加 overflow（有外部 scrollElement 时它是唯一滚动容器，与 `_wrapperElm = scrollElement` 的本意一致）。

## Dev Notes

### 引擎侧已完整移植（Story 1.5）——本故事只验证 + 暴露
- `VirtualizedTraceView` 已含：`componentDidMount → scrollToSpan(headerHeight, focusedSpanId)`；`componentDidUpdate` 在 `focusedSpanId !== prev` 时重滚，并用 `hasScrolledToSpan` 守卫首次只滚一次；`scrollToSpan` 按 `getRowStates().findIndex(spanID)` 求行号 → `listView.scrollToIndex(i, headerHeight)`。
- `ListView.scrollToIndex(index, headerHeight)` 已含表头补偿：`scrollElement.scrollTo({ top: itemOffset + listViewOffset - headerHeight - 80 })`（额外 80px 留白，使目标上方可见少量内容）。
- api `<TraceTimeline>` 已把 `focusedSpanId`（三态受控，AD-5）+ `headerHeight=HEADER_HEIGHT` + `scrollElement` 透传引擎；`isFocused` 已驱动 `selectedRowBg`。

### 不需新增引擎/状态逻辑
- 仅补：① 回归测试锁住「mount 滚 / 变化重滚 / 无关不滚」三条不变量；② demo 给一个可交互入口，便于浏览器核对（mockTrace 仅 9 行，需用较小 height 让尾部 span 出视口才能观察到滚动）。

### 范围
- focusedSpanIdForSearch（搜索定位）→ Epic 4 搜索故事接入（引擎分支已就位）。本故事只覆盖 focusedSpanId。

### References
- [Source: VirtualizedTraceView.tsx:186-215, 293-301]（mount/update/scrollToSpan）
- [Source: ListView/index.tsx scrollToIndex]（headerHeight 补偿）
- [Source: src/api/TraceTimeline.tsx focusedSpanId 透传]
- [Source: epics.md#Story 2.5]、[Source: prd FR-7]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]（dev-story）

### Debug Log References

- typecheck 0 错误 · `npm test` **73 passed**（+4 scrollToSpan）· build ESM clean。
- Chrome DevTools（120px 受限实例）：修复前 `scrollHeight===clientHeight===120`（无溢出）→ 修复后 `sh=244 / ch=120`；点「定位底部」→ `scrollTop 0→108`（补偿 headerHeight+80），尾行 `response.render error` 背景 `rgb(234,246,252)`=selectedRowBg 高亮，其余透明；点「定位顶部」→ `scrollTop→0`。
- **联调发现并修复 ListView 双滚动容器 bug**（详见 Task 4）：合成验证用动态延迟事件（受控回环需 React 重渲染）。

### Completion Notes List

- **引擎滚动逻辑（Story 1.5 已移植）零改动**：componentDidMount/Update + hasScrolledToSpan 守卫 + scrollToIndex(headerHeight 补偿) 全部既有。本故事补回归测试 + demo 交互入口。
- **scrollToIndex 是 ListView 实例字段（箭头函数）→ 无法 spy 原型**：改用 `vi.mock('./ListView', async () => {...})` + `vi.hoisted` 共享 spy（async factory 内动态 import react，避开被提升的顶层 import；`require` 因无 @types/node 报错）。
- **核心缺陷修复（ListView 双滚动容器）**：api 外层滚动容器与 ListView 内层 wrapper 同时 `overflow:auto`，内层抢走滚动使外层（=scrollElement，scrollToIndex 的目标）永不滚动。上游因 scrollElement 是无高度约束的页面级祖先而幸免；本库 api 自管固定高度容器才暴露。修复：ListView 仅在无外部 scrollElement 时给 wrapper 加 overflow。这同时修正了之前被掩盖的虚拟化测量（`_wrapperElm.scrollTop` 此前恒 0）。已记入项目记忆「关键移植坑」。
- AC #1~4 全满足，未新增依赖。focusedSpanIdForSearch（搜索定位）引擎分支已就位，留 Epic 4。

### File List

新增：`src/core/scroll-to-span.test.tsx`
修改：`src/core/ListView/index.tsx`（双滚动容器修复）、`demo/main.tsx`（focusedSpanId 交互实例）

### Change Log

- 2026-06-26：创建 + 实现 Story 2.5——验证引擎 scrollToSpan（FR-7）+ 4 回归测试 + demo 受控 focusedSpanId 交互；联调发现并修复 ListView 双滚动容器 bug（内层 wrapper overflow 抢滚动致 scrollToIndex 失效）；73 单测；浏览器滚动 0→108 + 行高亮验证。Status → review。
