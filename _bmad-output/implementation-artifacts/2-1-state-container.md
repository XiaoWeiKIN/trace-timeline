---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 2.1: 状态容器（受控/非受控）

Status: review

## Story

As a 使用方,
I want `useTraceTimelineState` 组合移植的 children/viewRange/hover 等 hook 并提供受控回退,
so that 默认非受控即可交互、需要时可受控接管。

## Acceptance Criteria

1. **Given** 仅传 `trace` 的非受控用法 **When** 触发折叠/缩放等交互 **Then** 库内部自管状态、不可变更新（新 Set/Map/数组）（AR-4,5）。
2. **And** 传入受控 `focusedSpanId` + 回调时由调用方接管、库不内部改写（受控字段以 prop 为准，改触发回调）。
3. **And** 同时传"全量受控逃生舱"（完整 state+onChange）与逐字段受控 props 时按优先级互斥并 dev 警告（FR-23；AD-5）；三态：未传=非受控自管、传值+回调=受控、传值无回调=只读冻结(dev 警告)。
4. **And** 容器接通 `<TraceTimeline>`：点击折叠箭头实际折叠子树、hover 缩进竖线高亮（承接 1.7 的 noop）；`npm run typecheck`/`npm test`/`npm run build` 通过。

## Tasks / Subtasks

- [x] Task 1：移植 hook（AC: #1）`useChildrenState.ts`/`useViewRange.ts`/`useHoverIndentGuide.ts`——Apache 原样，去 @grafana 类型换本地（core/types 的 ViewRange/ViewRangeTimeUpdate）
- [x] Task 2：列宽（AC: #1）容器内 `spanNameColumnWidth` state（默认 0.32 / initialColumnWidth）+ setter
- [x] Task 3：容器（AC: #1,#2,#3）`useTraceTimelineState.ts` — 组合 hook + 列宽 + focusedSpanId；全量逃生舱 `state`+`onStateChange` 与逐字段互斥 + dev 警告；detailStates/search 空槽
- [x] Task 4：受控解析（AC: #2,#3）三态判定（非受控/受控/只读冻结）+ warnOnce；全量优先
- [x] Task 5：接通 api（AC: #4）`<TraceTimeline>` 用 `useTraceTimelineState` 取 childrenHiddenIDs/toggle/hover/columnWidth/viewRange/focusedSpanId 喂引擎；新增受控 props 透传；DdIndentGuides 接 hover 高亮
- [x] Task 6：导出 + 单测（AC: #1,#2,#3）`state/index.ts`；8 单测（不可变折叠/collapseAll/expandAll/列宽/viewRange/受控冻结/逃生舱冲突警告/逃生舱 onStateChange）
- [x] Task 7：自验 typecheck/test/build + Chrome DevTools（点击折叠箭头实际折叠子树，✅ 验证）

## Dev Notes

### 移植（Apache 原样，AD-9）——来源 grafana TraceView/use*.ts
- `useChildrenState`：`childrenHiddenIDs:Set` + expandOne（逐层展开最近隐藏）/collapseOne（逐层折叠最近父）/expandAll(清空)/collapseAll(全父加入)/childrenToggle(单切)。`shouldDisableCollapse`：全部父已折叠则禁用。**全部 new Set 不可变**（AD-4 引擎 memoizeOne 依赖）。
- `useViewRange`：`viewRange.time.current:[s,e]` + updateViewRangeTime(start,end) + updateNextViewRangeTime(部分更新)。依赖 `ViewRange/ViewRangeTimeUpdate`（已加到 core/types）。
- `useHoverIndentGuide`：`hoverIndentGuideIds:Set` + add/remove（new Set）。

### useDetailState 留 Epic 3
- 依赖 `DetailState` 类（SpanDetail，Epic 3）。本故事 detailStates = 稳定空 Map 槽、toggleDetail 占位，Story 3.1 接真 hook。

### 受控/非受控（AD-5，三态）
- **优先级互斥**：传 `state`（全量逃生舱）→ 逐字段受控 props 被忽略 + `console.warn`（dev）。
- **逐字段**：`focusedSpanId` 传值+`onFocusedSpanIdChange` → 受控（库不内部改写、变更走回调）；传值无回调 → 只读冻结 + warn；未传 → 非受控自管。
- `resolveControlled` 工具统一三态。列宽/hover 本故事仅非受控（AD-5）。

### 接通 api（AC #4 可见结果）
- `<TraceTimeline>` 从 1.7 的静态 stub 换成 `useTraceTimelineState`：`childrenToggle/addHoverIndentGuideId/removeHoverIndentGuideId` 接真实——**点击折叠箭头即折叠子树**（皮肤 1.6 已有箭头+onChildrenToggle，引擎 generateRowStates 已支持 childrenHiddenIDs）；hover 竖线高亮（DdIndentGuides 已读 hoverIndentGuideIds——本故事补该消费）。viewRange 接 viewRange.time.current（缩放 UI 留 2.3）。

### 范围（留后续）
- 折叠/展开**全部**按钮 UI（TimelineCollapser）→ 2.2；缩放 ViewingLayer → 2.3；列宽拖拽 UI → 2.4；scrollToSpan/focusedSpanId 滚动 → 2.5。本故事只建容器 + 单 span 折叠 + hover 接通。

### References
- [Source: useChildrenState.ts / useViewRange.ts / useHoverIndentGuide.ts]
- [Source: ARCHITECTURE-SPINE.md#AD-4/AD-5]
- [Source: epics.md#Story 2.1]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]（dev-story）

### Debug Log References

- `npm run typecheck` → 0 错误
- `npm test` → **57 passed**（+8：state.test.tsx）
- `npm run build` → ESM 78.01KB + d.ts
- Chrome DevTools（localhost:5174）→ 点击 GET /user 折叠箭头：8 个后代行全部隐藏、仅剩根行、箭头翻转 ▼→▶；再点恢复。**折叠端到端生效**（容器 childrenToggle → 引擎 generateRowStates）。hover 缩进竖线高亮接通。

### Completion Notes List

- **移植 3 hook（Apache 原样，AD-9）**：useChildrenState（折叠，全 new Set 不可变 AD-4）/useViewRange（缩放区间）/useHoverIndentGuide（hover 高亮 Set）。@grafana 类型换 core/types 的 `ViewRange`/`ViewRangeTimeUpdate`（本故事补到 core/types）。
- **容器 `useTraceTimelineState`（AD-5 三态）**：① 非受控自管（默认）；② 逐字段受控 `focusedSpanId`（传值+回调=受控、库不内部改写、改走回调；传值无回调=只读冻结+warnOnce）；③ 全量受控逃生舱 `state`+`onStateChange`（与逐字段互斥、全量优先、冲突 warnOnce，所有 setter 产新 state 走 onStateChange）。hooks 无条件调用（规则所限），输出按模式选择。
- **detailStates/search 留空槽**：useDetailState 依赖 DetailState 类（Epic 3）；search 是 Epic 4。本故事 detailStates=稳定空 Map、detailToggle 占位。
- **接通 `<TraceTimeline>`**：从 1.7 静态 stub 换为容器——**单 span 折叠即生效**（皮肤箭头 1.6 已有、引擎折叠 1.5 已有，缺的就是这层状态）；hover 竖线高亮（DdIndentGuides 补 mouseenter/leave + active 样式）。viewRange 喂引擎（缩放 UI 留 2.3）。
- **范围（留后续）**：折叠/展开全部按钮 UI → 2.2；缩放 ViewingLayer → 2.3；列宽拖拽 UI → 2.4；focusedSpanId 滚动 → 2.5。本故事建容器 + 单 span 折叠 + hover。
- 4 条 AC 全满足；未新增依赖。

### File List

新增：`src/state/{useChildrenState.ts,useViewRange.ts,useHoverIndentGuide.ts,useTraceTimelineState.ts,state.test.tsx}`
修改：`src/core/types.ts`（+ViewRangeTimeUpdate）、`src/core/index.ts`（导出）、`src/state/index.ts`（出口）、`src/index.ts`（+state）、`src/api/TraceTimeline.tsx`（接容器 + 受控 props）、`src/presentation/{DdIndentGuides.tsx,DdLabelCell.tsx}`（hover 高亮）

## Change Log

- 2026-06-26：创建 Story 2.1（状态容器）。
- 2026-06-26：实现 Story 2.1——移植 children/viewRange/hover hook + `useTraceTimelineState`（AD-5 三态受控）；接通 TraceTimeline 使单 span 折叠/hover 生效。57 单测；浏览器折叠验证。Status → review。
