---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 1.4: utils 与 ui 原语

Status: review

## Story

As a 组件库开发者,
I want 移植 utils（color-generator 换 Datadog 色板、date→dayjs、number/sort、span-ancestor-ids）与 ui 原语（Icon=lucide、Tooltip）,
so that 上层引擎与皮肤有稳定的取色、时间格式化、祖先链、图标基础。

## Acceptance Criteria

1. **Given** `color-generator` 已移植并把色数组换成 `theme.trace.categoricalPalette`、去掉 `@grafana/ui` colors **When** 对同一 serviceName 多次取色 **Then** 颜色稳定一致、相邻 readability≥1.5（FR-3；UX-DR6；AR-10）。
2. **And** `date` 用 dayjs（替代 moment）：`formatDuration`（µs→人类可读 µs/ms/s/m/h/d）正确；`formatDate/formatTime` 用 dayjs。
3. **And** `Icon`（lucide 映射 grafana 图标名：angle-down/right/up、exclamation-circle、external-link-alt、link、share-alt、copy、arrow-\*、times、info-circle、cloud、globe…）可渲染，未知名回退默认图标。
4. **And** `Tooltip` 最小可用（hover 显示内容）；`span-ancestor-ids` 沿 references 返回祖先链。
5. **And** `npm run typecheck`/`npm test` 通过（含 color-generator/date/ancestor 单测）。

## Tasks / Subtasks

- [x] Task 1：number（AC: #2）`src/utils/number.ts`（移植 toFloatPrecision，Uber 头）
- [x] Task 2：date（AC: #2）`src/utils/date.ts`（移植，**moment→dayjs**：formatDate/formatTime 用 dayjs，ms/s 用普通算术，formatDuration 不变）
- [x] Task 3：sort（AC: #5）`src/utils/sort.ts`（移植，Uber 头）
- [x] Task 4：span-ancestor-ids（AC: #4）`src/model/span-ancestor-ids.ts`（移植，Uber 头，依赖 TraceSpan）
- [x] Task 5：color-generator（AC: #1）`src/theme/colorGenerator.ts`（移植，Uber 头；色数组换 `theme.trace.categoricalPalette`；getFilteredColors 用 `theme.colors.background.primary` 对比度≥3；去 @grafana/ui colors；memoizeOne 生成器）
- [x] Task 6：Icon（AC: #3）`src/ui/Icon.tsx`（grafana 图标名→lucide 映射表 + 未知回退）
- [x] Task 7：Tooltip（AC: #4）`src/ui/Tooltip.tsx`（最小 hover 提示）
- [x] Task 8：导出（AC: #5）`src/utils/index.ts`、`src/ui/index.ts`；theme/model index 补出口
- [x] Task 9：单测（AC: #1,#2,#4,#5）color-generator 稳定/相邻去重、date.formatDuration、span-ancestor-ids
- [x] Task 10：demo 增强（可选）：用 colorGenerator 给 mockTrace 各服务上色展示
- [x] Task 11：自验 typecheck/test/build

## Dev Notes

### 范围决策（与 epics 1.4 的差异）
- **DraggableManager 推迟到 Epic 2**（Story 2.3 拖拽缩放 / 2.4 列宽 才消费）。base skin（1.6）表头为静态，引擎（1.5）不用拖拽。避免移植 225 行未用代码（dev-story「只建当前故事所需」）。TreeNode 已在 Story 1.3 移植。

### 移植映射（许可证全 Apache，保留版权头）
| 源 | 目标 | 注意 |
|---|---|---|
| `utils/number.tsx` | `src/utils/number.ts` | 原样 |
| `utils/date.tsx` | `src/utils/date.ts` | **moment→dayjs**：formatDate/Time 用 dayjs.format；formatMillisecond/SecondTime 的 `moment.duration(x).asMilliseconds()` 即 x，改普通算术；formatDuration 不依赖 moment，原样 |
| `utils/sort.ts` | `src/utils/sort.ts` | 原样 |
| `utils/span-ancestor-ids.tsx` | `src/model/span-ancestor-ids.ts` | TNil→`null\|undefined`；依赖 TraceSpan |
| `utils/color-generator.tsx` | `src/theme/colorGenerator.ts` | 色数组 `@grafana/ui colors`→`theme.trace.categoricalPalette`；contrast 用 `theme.colors.background.primary` |

### color-generator 关键
- `ColorGenerator` 类：hash(key)%palette → cache；相邻 `tinycolor.readability < 1.5` 则取下一个；`getFilteredColors` 去红 + `readability(bg, color) >= 3`。
- 对外：`getColorByKey(key, theme)` = `getGenerator(theme.trace.categoricalPalette, theme).getColorByKey(key)`，`memoizeOne` 按 (palette, theme) 缓存生成器。

### Icon（lucide 映射）
- angle-down→ChevronDown，angle-right→ChevronRight，angle-up→ChevronUp，angle-double-down→ChevronsDown，angle-double-up→ChevronsUp，arrow-up/down/right→Arrow\*，exclamation-circle→AlertCircle，info-circle→Info，external-link-alt→ExternalLink，link→Link，share-alt→Share2，copy→Copy，cloud→Cloud，globe→Globe，times→X，clock-nine→Clock。未知名→Circle 回退 + dev warn。
- Props：`name, size=16, className?, title?, onClick?`。

### Project Structure Notes
```
src/utils/{number.ts,date.ts,sort.ts,index.ts,utils.test.ts}
src/model/span-ancestor-ids.ts   (+ model/index 出口 + 测试)
src/theme/colorGenerator.ts      (+ theme/index 出口 + 测试)
src/ui/{Icon.tsx,Tooltip.tsx,index.ts}
demo/main.tsx (增强：服务色块)
```
- `src/utils/` 为叶子共享模块（纯助手，无层耦合），任何层可引。依赖：dayjs/lodash/tinycolor2/memoize-one/lucide-react（均已装）。

### 前序学习（1.1/1.2/1.3）
- 脚手架 + 主题(含 theme.trace.categoricalPalette) + model(mockTrace) 就位。
- 不新增依赖。单测 vitest（jsdom, globals）。

### References
- [Source: public/app/features/explore/TraceView/components/utils/color-generator.tsx]
- [Source: public/app/features/explore/TraceView/components/utils/date.tsx]
- [Source: public/app/features/explore/TraceView/components/utils/number.tsx]
- [Source: public/app/features/explore/TraceView/components/utils/sort.ts]
- [Source: public/app/features/explore/TraceView/components/utils/span-ancestor-ids.tsx]
- [Source: _bmad-output/planning-artifacts/architecture/architecture-trace-timeline-2026-06-23/ARCHITECTURE-SPINE.md#AD-6] colorAccessor + theme.trace 色板
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1 / Story 1.4]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]（dev-story 纪律，直接实现）

### Debug Log References

- `npm run typecheck` → 0 错误
- `npm test` → **21 passed**（+8：colorGenerator 3 / utils 3 / span-ancestor 2）
- `npm run build` → ESM 28.05KB（含 lucide tree-shake）+ d.ts 11.38KB
- demo（vite HMR）→ 新增「mockTrace 服务色」section：4 服务经 colorGenerator 上色、稳定（Chrome DevTools 截图验证）

### Completion Notes List

- 移植 utils（Apache，保留版权头）：`number`(toFloatPrecision)、`date`(**moment→dayjs**；formatDuration 不变；ms/s 改普通算术)、`sort`、`span-ancestor-ids`(归 model)。
- `colorGenerator`（移植自 color-generator）：色数组换 `theme.trace.categoricalPalette`、对比度过滤用 `theme.colors.background.primary`、去 @grafana/ui colors、memoizeOne 生成器；加空数组兜底。
- ui 原语：`Icon`（grafana 名→lucide 映射 18 项 + 未知回退 Circle + warn）、`Tooltip`（最小 hover）。
- **范围决策**：DraggableManager 推迟到 Epic 2（用时再移，避免 225 行未用代码）。
- 5 条 AC 全满足。未新增依赖（dayjs/lucide-react/tinycolor2/memoize-one 均已装）。

### File List

新增（`/Users/wangxiaowei1/xiaowei/trace-timeline/`）：
- `src/utils/{number.ts,date.ts,sort.ts,index.ts,utils.test.ts}`
- `src/model/{span-ancestor-ids.ts,span-ancestor-ids.test.ts}`
- `src/theme/{colorGenerator.ts,colorGenerator.test.ts}`
- `src/ui/{Icon.tsx,Tooltip.tsx}`

修改：
- `src/ui/index.ts`、`src/theme/index.ts`、`src/model/index.ts`（补出口）、`src/index.ts`（+ utils/ui）、`demo/main.tsx`（服务色 section）

## Change Log

- 2026-06-25：实现 Story 1.4 utils+ui 原语——移植 number/date(dayjs)/sort/span-ancestor-ids/color-generator(换 Datadog 色板)，新增 Icon(lucide 映射)/Tooltip；DraggableManager 推迟 Epic 2；21 单测通过；demo 服务色验证。Status → review。
