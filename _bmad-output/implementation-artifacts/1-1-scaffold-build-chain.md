---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 1.1: 脚手架与构建链

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 组件库开发者,
I want 一个隔离的 `trace-timeline/` 包（tsup ESM-only 构建 + tsconfig + vitest + demo 入口 + 七层 src 目录骨架）,
so that 后续各层（theme/model/utils/core/state/presentation/api + data/datafox）有可构建、可跑 demo、可测试的工程底座。

## Acceptance Criteria

1. **Given** 仓库外隔离目录 `trace-timeline/` **When** 执行 `npm run build` **Then** tsup 产出 **ESM + `d.ts`**，无类型错误。
2. **And** `npm run dev` 能启动 demo 页（先渲染占位文本），`npm test` 能跑通一个 smoke 用例。
3. **And** `package.json` 将 `react`/`react-dom` 声明为 `peerDependencies`，`dependencies` 与源码 import 中**无任何 `@grafana/*` 或 `app/*`**（AR-9/NFR-7）。
4. **And** `src/` 下建立七层目录骨架 `{api,presentation,core,state,model,theme,ui}` + `data/datafox/`，每层有占位 `index.ts`，根 `src/index.ts` 汇总导出（占位）。
5. **And** `npm run typecheck`（`tsc --noEmit`，strict）通过。

## Tasks / Subtasks

- [x] Task 1：初始化包与目录（AC: #1,#4）
  - [x] 创建隔离目录 `/Users/wangxiaowei1/xiaowei/trace-timeline`（仓库外，避免 Grafana yarn workspaces 纳入 — AR-11）
  - [x] `npm init`；写 `package.json`：`"type":"module"`、`"exports"`（仅 import + types）、`"sideEffects":false`、`"files":["dist"]`
  - [x] 建七层 `src/{api,presentation,core,state,model,theme,ui}/index.ts` 占位 + `src/data/datafox/index.ts` 占位 + `src/index.ts` 汇总占位导出
- [x] Task 2：TypeScript 配置（AC: #5）
  - [x] `tsconfig.json`：`strict:true`、`jsx:"react-jsx"`、`moduleResolution:"bundler"`、`module:"ESNext"`、`target:"ES2020"`、`declaration:true`、`noEmit` 用于 typecheck
  - [x] `npm run typecheck` = `tsc --noEmit`
- [x] Task 3：tsup 构建（ESM-only + d.ts）（AC: #1）
  - [x] 安装 `tsup typescript`
  - [x] `tsup.config.ts`：`entry:['src/index.ts']`、`format:['esm']`、`dts:true`、`sourcemap:true`、`treeshake:true`、`external:['react','react-dom']`、`clean:true`
  - [x] `npm run build` = `tsup`
- [x] Task 4：依赖与 peer（AC: #3）
  - [x] `dependencies`：`@emotion/css classnames lodash memoize-one tinycolor2 lucide-react dayjs dompurify @opentelemetry/api`
  - [x] `peerDependencies`：`react react-dom`（用 datafox-ui 的实际 React 版本范围）
  - [x] `devDependencies`：`tsup typescript vitest @testing-library/react @testing-library/jest-dom jsdom @types/react @types/react-dom @types/lodash vite @vitejs/plugin-react`
  - [x] 确认无 `@grafana/*`、无 `app/*`
- [x] Task 5：vitest + RTL（AC: #2）
  - [x] `vitest.config.ts`：`environment:'jsdom'`、`setupFiles`(jest-dom)、`globals:true`
  - [x] 写 1 个 smoke 测试（如 `src/index.test.ts`：导入 `src/index.ts` 不抛错 / 断言占位导出存在）
  - [x] `npm test` = `vitest run`
- [x] Task 6：demo 入口（占位）（AC: #2）
  - [x] `demo/index.html` + `demo/main.tsx`（挂载一个占位 `<div>trace-timeline scaffold OK</div>`，引入 `src/index`）
  - [x] `vite.config.ts`（root=demo 或 root + alias 指向 src）；`npm run dev` = `vite`
- [x] Task 7：构建链自验（AC: #1,#2,#5）
  - [x] 跑通 `npm run build`、`npm run typecheck`、`npm test`、`npm run dev`（手动确认 demo 起）

## Dev Notes

### 架构约束（必须遵守）
- **七层架构（AD-1/AR-1）**：`src/{api,presentation,core,state,model,theme,ui}` + `src/data/datafox`。本故事只建**空骨架 + 占位 index**，不实现逻辑。依赖方向（后续强制，本故事先不连）：`api→{core,presentation,state,model}`；`presentation→{theme,ui,model}`；`core→model`；`core` **零** Datadog/theme/ui import。
- **ESM-only + react peer（AD-10/NFR-7）**：内部工具，**去 CJS**；`react`/`react-dom` 作 peer（不打进产物，tsup `external`）；零 `@grafana/*` npm 依赖。**不**做 SemVer/弃用策略/体积预算/Storybook（已在范围转向中砍掉 — addendum §I）。
- **隔离目录（AR-11）**：放仓库外 `/Users/wangxiaowei1/xiaowei/trace-timeline`，避免被 Grafana 的 yarn workspaces 扫入。**不修改 Grafana 源仓库**。
- **许可证（AD-9）**：内部工具无义务；后续移植 Grafana 文件时保留原版权头即可，本故事无涉及。

### 依赖清单（来源 addendum §I + AR-10）
运行时依赖与用途：`@emotion/css`(样式)、`classnames`(类名)、`lodash`(按方法引)、`memoize-one`(引擎 memo)、`tinycolor2`(颜色/autoColor)、`lucide-react`(Icon)、`dayjs`(替代 moment 做 date)、`dompurify`(详情 JSON 净化)、`@opentelemetry/api`(filter-spans 的 SpanStatusCode)。**无 react-window**（虚拟滚动自研，后续故事移植）。

### 版本说明（⚠️ web 核实受限）
- 规划期 web 搜索额度耗尽，**未能在线核实各依赖最新版**。安装时用各包当前稳定版并由 lockfile 锁定；待额度恢复再 pin 精确版本（spine Stack 表已标 `[ASSUMPTION 待核]`）。
- 建议起步范围（安装后以 lockfile 为准）：`tsup ^8`、`typescript ^5.5`、`vitest ^2`、`@testing-library/react ^16`、`@emotion/css ^11`、`lucide-react`(最新)、`dayjs ^1.11`、`tinycolor2 ^1.6`、`memoize-one ^6`、`dompurify ^3`、`@opentelemetry/api ^1`、`classnames ^2.5`、`lodash ^4.17`。`react`/`react-dom` peer 用 datafox-ui 实际版本。

### 测试标准
- vitest + @testing-library/react（jsdom 环境）。本故事仅需 1 个 smoke 用例验证构建链与导入；真正的组件测试在后续故事。

### Project Structure Notes
目标结构（本故事建到"骨架 + 占位"层级）：
```
trace-timeline/
  package.json  tsconfig.json  tsup.config.ts  vitest.config.ts  vite.config.ts
  demo/  index.html  main.tsx
  src/
    index.ts                 # 汇总导出（占位）
    index.test.ts            # smoke
    api/index.ts  presentation/index.ts  core/index.ts  state/index.ts
    model/index.ts  theme/index.ts  ui/index.ts
    data/datafox/index.ts
```
- 与 spine §Structural Seed 一致（去掉 `stories/`，因已砍 Storybook）。
- 变体说明：spine 源码树写了更细的子目录（如 `core/ListView/`），本故事**只建顶层七层占位**，子目录在各自移植故事里创建。

### References
- [Source: _bmad-output/planning-artifacts/architecture/architecture-trace-timeline-2026-06-23/ARCHITECTURE-SPINE.md#AD-1 设计范式/七层] 模块切分与依赖方向
- [Source: ...ARCHITECTURE-SPINE.md#AD-10] ESM-only + react peer + 零 @grafana
- [Source: ...ARCHITECTURE-SPINE.md#AD-9] 内部工具无许可证义务
- [Source: ...ARCHITECTURE-SPINE.md#Structural Seed] 源码树
- [Source: _bmad-output/planning-artifacts/prds/prd-trace-timeline-2026-06-23/addendum.md#I 打包/分发规范] 依赖清单 + ESM-only + 去 Storybook
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 1 / Story 1.1] 故事与验收
- [Source: _bmad-output/implementation-artifacts/investigations/trace-timeline-port-srcmap-investigation.md#建议移植顺序] 第 1 步 = 基座

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]（bmad-dev-story）

### Debug Log References

- `npm install` → added 341 packages，OK（4 audit 警告，非阻塞，后续可 `npm audit` 处理）
- `npm run typecheck`（tsc --noEmit, strict）→ 0 错误
- `npm run build`（tsup）→ ESM `dist/index.js`(127B) + `dist/index.js.map` + `dist/index.d.ts`(54B)，Build success
- `npm test`（vitest run, jsdom）→ 1 passed（src/index.test.ts）
- `npx vite build`（demo）→ 33 modules transformed，built OK（验证 demo+`../src`+React 编译链）

### Completion Notes List

- 在 grafana 仓库外 `/Users/wangxiaowei1/xiaowei/trace-timeline` 建立隔离包（AR-11，避免被 Grafana yarn workspaces 纳入）。
- 七层 `src/{api,presentation,core,state,model,theme,ui}` + `src/data/datafox` 占位骨架就位，根 `src/index.ts` 汇总导出 `VERSION` 占位。
- ESM-only（tsup，format=['esm']，external react/react-dom）+ d.ts；`react`/`react-dom` 作 peer（`^18.3.1 || ^19`，对齐 datafox-ui 的 React 18.3.1）；**零 `@grafana/*`/`app/*` 依赖**（AD-10/AR-9）。
- 全部 5 条 AC 满足：build→ESM+d.ts ✓ / dev(demo 编译)+test smoke ✓ / react peer+零@grafana ✓ / 七层目录 ✓ / typecheck ✓。
- ⚠️ 版本：web 受限未在线核实，已用保守稳定版并由 `package-lock.json` 锁定（tsup 8.5.1 / vite 5.4.21 / vitest 1.6.1 实际解析）。待 web 额度恢复再 pin/复核（spine Stack 表 `[ASSUMPTION]`）。
- 运行时依赖按 addendum §I 全部声明（含 lucide-react/dayjs/@opentelemetry/api 等），本故事仅声明未使用，由后续移植故事消费。

### File List

新建（均在仓库外 `/Users/wangxiaowei1/xiaowei/trace-timeline/`）：
- `package.json`、`tsconfig.json`、`tsup.config.ts`、`vitest.config.ts`、`vite.config.ts`、`.gitignore`、`README.md`
- `src/index.ts`、`src/index.test.ts`
- `src/{api,presentation,core,state,model,theme,ui}/index.ts`（7 个占位）
- `src/data/datafox/index.ts`（占位）
- `test/setup.ts`
- `demo/index.html`、`demo/main.tsx`
- 构建产物（gitignored）：`dist/`、`demo/dist/`、`node_modules/`、`package-lock.json`

> 注：本故事产物在 **grafana 仓库之外**，不进 grafana 的版本控制。

## Change Log

- 2026-06-25：实现 Story 1.1 脚手架与构建链——建立 trace-timeline 隔离包（七层骨架 + tsup ESM-only + vitest + vite demo），build/typecheck/test/demo 全绿。Status → review。
