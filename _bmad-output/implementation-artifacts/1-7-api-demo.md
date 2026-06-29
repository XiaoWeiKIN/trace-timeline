---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 1.7: api 入口与静态 demo

Status: review

## Story

As a 使用方,
I want 对外 `<TraceTimeline trace={...} />` 组件（把 Datadog 皮肤注入 core 引擎）+ index 导出 + 一个用 mock 渲染静态瀑布的 demo,
so that 一行即可渲染出 Datadog 风格的静态追踪瀑布图。

## Acceptance Criteria

1. **Given** `api/<TraceTimeline>` 已把 presentation 的 `createDatadogRowRenderer` 注入 core（VirtualizedTraceView） **When** `<ThemeProvider><TraceTimeline trace={mockTrace} /></ThemeProvider>` **Then** 渲染出完整静态瀑布（刻度表头 + 条/缩进/服务色），布局为左标签列 | 右时间线（FR-1；AR-1）。
2. **And** demo 提供 light/dark 切换，观感切换正确（FR-20）。
3. **And** `trace==null/undefined` 时显示空态而非崩溃；`loading` 时显示占位（AR-12；AD-12 §空/加载态归 api）。
4. **And** `npm run typecheck`/`npm test`/`npm run build` 通过（含 TraceTimeline 渲染 + 空态测试）。

## Tasks / Subtasks

- [x] Task 1：对外组件（AC: #1,#3）`src/api/TraceTimeline.tsx` — props `{trace, colorAccessor?, columnWidth?, numTicks?, rowHeights?, loading?, height?, className?, style?}`；内部静态 state（viewRange[0,1]/空 childrenHiddenIDs/空 detailStates/noop 回调，交互留 Epic 2）；建 scrollEl ref；`useMemo` 建 rowRenderer；渲染 DdTimelineHeader + 滚动容器 + VirtualizedTraceView
- [x] Task 2：空/加载态（AC: #3）`trace==null`→空态文案"无追踪数据"；`loading`→"加载中…"；均用 theme 令牌
- [x] Task 3：导出（AC: #1）`src/api/index.ts` 导出 `TraceTimeline` + props 类型（根 index 已 `export * from './api'`）
- [x] Task 4：单测（AC: #4）`src/api/api.test.tsx` — 渲染 mockTrace 出条/服务名/表头；trace=null 出空态不挂载 ListView；loading 出占位
- [x] Task 5：demo（AC: #1,#2,#3）用 `<TraceTimeline trace={mockTrace}/>` 渲染主瀑布；保留 light/dark；加 trace=null 空态展示
- [x] Task 6：自验 typecheck/test/build + Chrome DevTools 截图（light + dark）

## Dev Notes

### 定位（AR-1/AD-1/AD-2）
- api = 注入皮肤入口。把 presentation 的 `createDatadogRowRenderer({theme,trace,colorAccessor})` 注入 core `VirtualizedTraceView` 的 `rowRenderer` prop——完成依赖反转闭环（core 不识皮肤）。
- **本故事静态**：交互状态（折叠/缩放/列宽/详情/受控）全留 Epic 2（Story 2.1 `useTraceTimelineState`）。1.7 用最小静态 state：`currentViewRangeTime=[0,1]`、`childrenHiddenIDs=new Set`、`detailStates=new Map`、toggle 回调 noop。折叠箭头可见但点击无效（Epic 2 接通）。

### 空/加载/无效态归 api（AD-12 §一致性约定）
- `trace==null/undefined` → 空态（"No trace data" 文案，theme 令牌），core 仅在有合法 Trace 时挂载。
- `loading` prop → 占位（骨架/文案）。
- 渲染层不抛业务错误。

### 主题
- `<TraceTimeline>` 读 `useTheme2()`，**要求 ThemeProvider 祖先**（demo 提供）。theme 变化时 `useMemo([theme, trace, colorAccessor])` 重建 rowRenderer。
- headerHeight 传 `HEADER_HEIGHT(28)` 给 VirtualizedTraceView（scrollToSpan 补偿，Epic 2.5 用）。

### 范围（留后续）
- 受控/非受控 props、折叠/缩放/列宽/详情/搜索 → Epic 2–4。1.7 只读渲染 + 空/加载态。
- 自带 ThemeProvider 的便捷包装 → 可选，本故事要求外部 Provider。

### References
- [Source: ARCHITECTURE-SPINE.md#AD-1/AD-2/AD-12（空态）/Structural Seed api]
- [Source: src/presentation/rowRenderer.tsx（createDatadogRowRenderer）]
- [Source: src/core/VirtualizedTraceView.tsx（引擎 props）]
- [Source: epics.md#Story 1.7]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]（dev-story）

### Debug Log References

- `npm run typecheck` → 0 错误
- `npm test` → **49 passed**（+3：TraceTimeline 渲染瀑布 / trace=null 空态 / loading 占位）
- `npm run build` → ESM 67.85KB + d.ts
- Chrome DevTools（localhost:5174）→ `<TraceTimeline trace={mockTrace}/>` 渲染完整静态瀑布（刻度表头 + 9 行 + 服务色 + 200/500 pill + 错误图标 + 缩进竖线）；**light/dark 切换正确**（dark 下 colorGenerator 按背景对比重算服务色）；`trace={null}` → "无追踪数据" 空态不崩溃。截图验证。

### Completion Notes List

- **依赖反转闭环（AD-2）**：`<TraceTimeline>` 用 `createDatadogRowRenderer({theme,trace,colorAccessor})` 建皮肤 rowRenderer，注入 core `VirtualizedTraceView.rowRenderer`——core 不识皮肤、皮肤经 api 注入。`useMemo([theme,trace,colorAccessor])` 重建避免 stale。
- **空/加载态归 api（AD-12）**：`!trace`→空态、`loading`→占位，core 仅在合法 Trace 时挂载（空态时不渲染 ListView，测试断言无 `[data-testid="ListView"]`）。
- **本故事静态**：交互 state 用最小静态值（viewRange[0,1]/空 Set/Map/noop）。折叠箭头可见但点击 noop——折叠/缩放/列宽/详情/受控全留 Epic 2（Story 2.1 `useTraceTimelineState` 替换这些静态值）。
- **主题**：组件读 `useTheme2()`，要求 ThemeProvider 祖先（demo 提供）；headerHeight 传 `HEADER_HEIGHT(28)`（Epic 2.5 scrollToSpan 补偿用）。
- 4 条 AC 全满足；未新增依赖。**Epic 1（Walking Skeleton）完成**——一行 `<TraceTimeline trace>` 即渲染 Datadog 风格静态瀑布。

### File List

新增（`/Users/wangxiaowei1/xiaowei/trace-timeline/`）：
- `src/api/TraceTimeline.tsx`、`src/api/api.test.tsx`

修改：
- `src/api/index.ts`（导出 TraceTimeline）、`demo/main.tsx`（主瀑布改用 `<TraceTimeline>` + 空态展示，移除 EngineDemo 直连引擎）

## Change Log

- 2026-06-26：创建 Story 1.7（api + 静态 demo）。
- 2026-06-26：实现 Story 1.7——`<TraceTimeline>` 注入皮肤到引擎、空/加载态归 api；demo 改用对外组件 + 空态；49 单测；light/dark + 空态浏览器验证。**Epic 1 完成**。Status → review。
