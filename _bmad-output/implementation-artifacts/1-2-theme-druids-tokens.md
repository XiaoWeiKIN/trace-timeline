---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 1.2: 主题层（DRUIDS 令牌 + light/dark + 注入覆盖）

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 使用方,
I want `ThemeProvider` + `createTheme({colorMode, override})` 提供内置 light/dark 与可注入覆盖（含 Datadog `theme.trace` 令牌）,
so that 组件配色/排版/几何统一走主题令牌、可切换、可定制。

## Acceptance Criteria

1. **Given** `theme` 层导出 TS 接口（GrafanaTheme2 子集形状 + `theme.trace: TraceThemeTokens`）**When** 用 `<ThemeProvider theme={createTheme({colorMode:'dark'})}>` 包裹并在子组件调 `useStyles2(getStyles)` **Then** 取到 dark 令牌（面板底/选中行/文本透明度阶/NotoSans/分类色板/条几何），`getStyles(theme)` 正常工作。
2. **And** 传入 `override` 时对内置令牌**深合并**、未覆盖项回退内置值（FR-21）。
3. **And** light/dark 切换后无残留硬编码色（FR-20/28）；`theme.trace` 字段齐全（barHeight/barRadius/barGap/categoricalPalette/status/indentLine/selectedRowBg/fontFamily）。
4. **And** `useStyles2` 按 theme 引用 memo（同一 theme 多次调用返回同一 styles 对象）；`autoColor` 移植正确（light 原样返回、dark 取可读变体）。
5. **And** `npm run typecheck`/`npm test` 通过；demo 接 `ThemeProvider` 且提供 light/dark 切换按钮，观感切换正确。

## Tasks / Subtasks

- [x] Task 1：Theme 类型（AC: #1,#3）
  - [x] `src/theme/types.ts`：定义 `Theme`（GrafanaTheme2 子集形状，见 Dev Notes 子集清单）+ `TraceThemeTokens` 接口（AD-7 字段）
  - [x] `Theme` 含 `isLight/isDark`、`colors.*`、`spacing(...n)`、`typography.*`、`shape.radius.*`、`breakpoints.down(key)`、`colors.emphasize(color,amount)`、`trace: TraceThemeTokens`
- [x] Task 2：DRUIDS 令牌值（AC: #1,#3）
  - [x] `src/theme/tokens/druids.ts`：light + dark 两套 DRUIDS 色值常量（datadog-visual-spec §3.2）
  - [x] `src/theme/tokens/trace.ts`：light + dark 的 `TraceThemeTokens`（含 Datadog 分类色板 §3.1）
- [x] Task 3：createTheme（AC: #1,#2）
  - [x] `src/theme/createTheme.ts`：`createTheme({colorMode:'light'|'dark', override?}): Theme`，组装子集形状 + `trace`
  - [x] `spacing(...n)` 实现（如 `n*8px`，与 Grafana 一致：`theme.spacing(2)`→`16px`）；`emphasize`(tinycolor 提亮/压暗)；`breakpoints.down` 返回 media query 字符串
  - [x] `override` 用 `lodash.merge`（或自写深合并）对 base 深合并，未覆盖回退
- [x] Task 4：autoColor 移植（AC: #4）
  - [x] `src/theme/autoColor.ts`：移植 grafana `Theme.tsx` 的 `autoColor(theme, hex, base?)`（保留 Uber 版权头），把入参 `GrafanaTheme2`→本库 `Theme`（只用到 `theme.isLight` 与 `theme.colors.background.primary`）
- [x] Task 5：ThemeContext + Provider（AC: #1）
  - [x] `src/theme/context.tsx`：`ThemeContext`（默认 `createTheme({colorMode:'light'})`）+ `ThemeProvider`
- [x] Task 6：useStyles2 / useTheme2 / withTheme2 / stylesFactory（AC: #1,#4）
  - [x] `src/theme/useStyles2.ts`：`useTheme2()` 读 context；`useStyles2(getStyles)` = `getStyles(theme)` 且按 theme 引用 memo（`memoize-one` 或 `useMemo`）；`withTheme2(Comp)` HOC 注入 `theme` prop；`stylesFactory(fn)` 直接返回 fn（兼容上游写法）
- [x] Task 7：导出（AC: #1）
  - [x] `src/theme/index.ts`：导出 `createTheme/ThemeProvider/useTheme2/useStyles2/withTheme2/stylesFactory/autoColor` + 类型 `Theme/TraceThemeTokens/ThemeColorMode`
- [x] Task 8：单测（AC: #2,#4,#5）
  - [x] `createTheme('dark')` 返回 dark 令牌；`override` 深合并生效且未覆盖项回退
  - [x] `useStyles2` 同 theme 返回同一引用（memo）
  - [x] `autoColor` light 原样、dark 返回不同值
- [x] Task 9：demo 接主题（AC: #5）
  - [x] `demo/main.tsx`：用 `ThemeProvider` 包裹；加 light/dark 切换按钮；用 `useStyles2` 渲染一小块带令牌的占位（验证切换观感）
- [x] Task 10：自验（AC: #5）：`npm run typecheck`、`npm test`、`npm run build`、`npm run dev` 全绿

## Dev Notes

### 架构约束（AD-7 / AR-6）
- **沿用 GrafanaTheme2 子集形状，值填 DRUIDS**：这样后续移植的引擎/皮肤里 `getStyles(theme)` 的 `theme.colors.text.primary`、`theme.spacing(2)` 等访问几乎不用改。
- **`theme.trace` 必须是导出的 TS 接口 `TraceThemeTokens`**（枚举 key，拼错即编译报错）。
- `createTheme({colorMode, override})`；`override` 深合并回退内置；`useStyles2` 按 theme memo。
- 皮肤层只读 `theme.trace.*` 与 `theme.colors.*`；**禁止硬编码色值**（conventions）。

### Theme 子集清单（实测自源码 — addendum §D，只实现这些）
`isLight`/`isDark`；`spacing(...n:number[])=>string`；
`colors.text.{primary,secondary,link,disabled}`；`colors.background.{primary,secondary,canvas}`；`colors.border.{weak,strong}`；`colors.primary.main`；`colors.error.{transparent,borderTransparent}`；`colors.success.text`；`colors.emphasize(color,amount)=>string`；
`typography.{bodySmall.fontSize, fontWeightMedium, h1..h6, size.{sm,lg}}`；`shape.radius.{sm,md,default}`；`breakpoints.down(key)=>string`。
> 不要实现整个 GrafanaTheme2（巨大）——只这些被实际用到。

### TraceThemeTokens（AD-7）
```ts
interface TraceThemeTokens {
  barHeight: number;            // ~19（条内部视觉高，与行高 28 正交，见 AD-12）
  barRadius: string;            // '2px 2px 0 0'（仅顶圆角）
  barGap: number;               // 条上下留白
  categoricalPalette: string[]; // Datadog 分类色板（见下）
  status: { ok: {fg,bg}; info: {fg,bg}; warn: {fg,bg}; error: {fg,bg} }; // HTTP 状态 pill
  indentLine: { width: number; colorFrom: 'service' };
  selectedRowBg: string;        // 'rgb(234,246,252)'
  fontFamily: string;           // 'NotoSans, "PingFang SC", sans-serif'
}
```

### DRUIDS 令牌值（datadog-visual-spec §3.2/§3.3/§4 — light）
- 面板底 background.primary `rgb(249,250,251)`；background.secondary/canvas 取中性（`rgb(239,241,245)` 等）；border.weak `rgb(226,229,237)`、border.strong `rgb(194,200,221)`
- 文本透明度阶（叠在浅底）：primary `rgba(28,43,52,0.98)`、secondary `.68`、disabled `.35`；text.link 主蓝 `rgb(53,152,236)`
- 语义：success.text `#008645`（底 `#ECF9EF`）；error `#EB364B`（底 `#FDEBED`，error.transparent/borderTransparent 用红低透明）；warn `#F99D02`（底 `#FFF6E3`）；primary.main 主蓝 `#3598EC`
- selectedRowBg `rgb(234,246,252)`；fontFamily `NotoSans, "PingFang SC", sans-serif`；刻度 12px
- **dark**：用 DRUIDS dark 对应值（暗底 + 文本反相）；本故事 dark 可先给一套合理暗色常量（不必逐一对齐 Datadog dark，标注 `[ASSUMPTION dark 值后续校准]`）。

### Datadog 分类色板（§3.1，categoricalPalette）
`['#FCAF2B','#C68CCD','#50931F','#CC3C71','#DD8451','#C86B74', ...]`（橙/紫/绿/品红/棕褐/鲑红，可再补几色）。本故事只**定义数组**；散列+去重取色算法在 Story 1.4（color-generator）消费。

### autoColor 源（直接移植，保留版权头）
- 源：`public/app/features/explore/TraceView/components/Theme.tsx`（Uber Apache 头）。逻辑：`theme.isLight` → 原样返回 hex；dark → tinycolor 反相亮度或 `mostReadable(base, [lighten/darken 变体])`。只依赖 `theme.isLight`，`base` 缺省走亮度反相。入参类型从 `GrafanaTheme2` 换成本库 `Theme`。

### useStyles2 设计
- 上游用法：`const styles = useStyles2(getStyles)`，`getStyles` 形如 `(theme)=>({row: css({...})})` 或 `()=>({...})`（TimelineRow 不接 theme）。
- 实现：`useTheme2()` 从 context 取 theme；`useStyles2(fn)` = 按 `[fn, theme]` memo 后 `fn(theme)`（`memoize-one` 或 `useMemo`）。同 theme + 同 fn → 同一引用（AC#4）。
- `stylesFactory(fn)` 上游用来包 getStyles，本库**直接返回 fn** 即可（占位兼容）。`withTheme2(Comp)` 给 class 组件注入 `theme` prop（后续引擎 class 用，AD-3）。

### Project Structure Notes
新增/改：
```
src/theme/
  index.ts          # 改：从占位改为真实导出
  types.ts          # 新：Theme + TraceThemeTokens + ThemeColorMode
  createTheme.ts    # 新
  tokens/druids.ts  # 新：light/dark DRUIDS 色值
  tokens/trace.ts   # 新：light/dark TraceThemeTokens
  context.tsx       # 新：ThemeContext + ThemeProvider
  useStyles2.ts     # 新：useStyles2/useTheme2/withTheme2/stylesFactory
  autoColor.ts      # 新：移植 Theme.tsx
  theme.test.ts     # 新：单测
demo/main.tsx       # 改：接 ThemeProvider + light/dark 切换
```
- 与 spine 源码树一致（theme 层）。依赖：用已装的 `@emotion/css`、`tinycolor2`、`lodash`(merge)、`memoize-one`。

### 前序 Story 1.1 学习
- 脚手架已就位：tsup ESM-only、vitest(jsdom, globals)、`src/theme/index.ts` 当前为 `export {}` 占位。
- 版本以 lockfile 锁定；本故事不新增依赖（所需均在 1.1 已装）。
- 测试用 vitest + @testing-library/react（jsdom）。

### References
- [Source: _bmad-output/planning-artifacts/architecture/architecture-trace-timeline-2026-06-23/ARCHITECTURE-SPINE.md#AD-7] theme = GrafanaTheme2 子集 + theme.trace 接口 + 深合并
- [Source: ...ARCHITECTURE-SPINE.md#AD-12] barHeight(视觉) 与行高(28/161/197 归 core) 正交
- [Source: _bmad-output/planning-artifacts/prds/prd-trace-timeline-2026-06-23/addendum.md#D Theme 类型子集] 实测子集清单
- [Source: _bmad-output/planning-artifacts/prds/prd-trace-timeline-2026-06-23/datadog-visual-spec.md#3 配色 / #4 排版] DRUIDS 令牌值 + 分类色板 + NotoSans
- [Source: public/app/features/explore/TraceView/components/Theme.tsx] autoColor 移植源（Uber Apache）
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1 / Story 1.2] 故事与验收
- [Source: _bmad-output/implementation-artifacts/1-1-scaffold-build-chain.md] 前序脚手架

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]（dev-story 纪律，直接实现）

### Debug Log References

- `npm run typecheck` → 0 错误（首轮 1 处 createElement children 类型，已修：children 放进 props）
- `npm test`（vitest）→ **8 passed**（1 smoke + 7 theme：light/dark、trace 令牌、spacing、override 深合并、autoColor、useStyles2 memo）
- `npm run build`（tsup）→ ESM `dist/index.js` 6.33KB + `dist/index.d.ts` 4.49KB，Build success
- demo（vite HMR）→ light/dark 切换实测：light 底 rgb(249,250,251)、dark 底 rgb(24,27,31)；分类色板条**仅顶圆角 2px 2px 0 0** 可见；状态 pill OK/INFO/WARN/ERROR 配色随主题切换（Chrome DevTools 截图验证）

### Completion Notes List

- 实现 theme 层：`Theme`(GrafanaTheme2 子集形状) + `TraceThemeTokens` 接口 + `createTheme({colorMode,override})`(lodash.merge 深合并) + `ThemeProvider/useTheme2/useStyles2/withTheme2/stylesFactory` + `autoColor`(移植 grafana Theme.tsx，保留 Uber 版权头)。
- DRUIDS 令牌：light 用实测值（面板底 rgb(249,250,251)、选中行 rgb(234,246,252)、文本透明度阶 .98/.68/.5/.35、success #008645/error #EB364B/warn #F99D02/主蓝 #3598EC、NotoSans）；dark 给合理暗色，标注 `[ASSUMPTION dark 值后续校准]`。
- Datadog 分类色板（10 色）+ theme.trace（barHeight 19 / barRadius '2px 2px 0 0' / barGap / status / indentLine / selectedRowBg / fontFamily）。
- `useStyles2` 按 theme+fn 引用 memo（useRef），同 theme 返回同一引用（单测验证）。
- 5 条 AC 全满足：dark 令牌 ✓ / override 深合并回退 ✓ / theme.trace 齐全+light-dark 切换 ✓ / useStyles2 memo+autoColor ✓ / typecheck+test+demo ✓。
- 未新增依赖（@emotion/css、tinycolor2、lodash、memoize-one 均 Story 1.1 已装）。

### File List

新增（`/Users/wangxiaowei1/xiaowei/trace-timeline/`）：
- `src/theme/types.ts`（Theme + TraceThemeTokens + ThemeOverride 等）
- `src/theme/tokens/druids.ts`、`src/theme/tokens/trace.ts`
- `src/theme/createTheme.ts`、`src/theme/context.tsx`、`src/theme/useStyles2.tsx`、`src/theme/autoColor.ts`
- `src/theme/theme.test.tsx`

修改：
- `src/theme/index.ts`（占位 → 真实导出）
- `demo/main.tsx`（接 ThemeProvider + light/dark 切换 + 色板/状态 pill 展示）

## Change Log

- 2026-06-25：实现 Story 1.2 主题层——createTheme(DRUIDS light/dark) + TraceThemeTokens 接口 + ThemeProvider/useStyles2/withTheme2 + autoColor 移植；override 深合并；8 单测通过；demo light/dark 切换实测（Datadog 仅顶圆角条 + 状态 pill）。Status → review。
