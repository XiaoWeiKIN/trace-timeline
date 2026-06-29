---
baseline_commit: n/a（trace-timeline 非 git 仓库）
---

# Story 8.2: 核心包后端中立 + 子路径导出

Status: done

> 规格：[ARCHITECTURE-SPINE AD-15]。

## Story

As a 集成方,
I want 核心包不打包任何后端专属代码，适配器按子路径引入,
so that 我能 tree-shake 掉不用的后端、核心保持中立。

## Acceptance Criteria

1. tsup 多入口：`index` + `adapters/datafox` + `adapters/otlp`。
2. `package.json#exports` 加 `./adapters/datafox`、`./adapters/otlp`（types+import 指向实际产物 `dist/adapters/<name>.{d.ts,js}`）。
3. 主 `dist/index.js` 不含 datafox/otlp 专属符号（grep `decodeDataFox`/`spans/search`/`resourceSpans`/`decodeOtlp` = 0），仅含契约 `adaptTrace`。
4. `dist/adapters/datafox.*`、`dist/adapters/otlp.*` 自洽可独立引入。
5. 主入口移除 `export * from './data/datafox'`；`model/index.ts` 移除 datafox 具体导出（仅留契约）；内部 importer（client.ts/测试）改直引具体文件。

## Tasks / Subtasks

- [x] 新增子路径 barrel `src/adapters/datafox/index.ts`、`src/adapters/otlp/index.ts`。
- [x] `tsup.config.ts` 改 `entry` 对象（多入口）。
- [x] `package.json` 加 exports 映射 + 改 description（DataFox 数据→可插拔后端适配器）。
- [x] `src/index.ts` 删 datafox 主入口导出；`model/index.ts` 删 fromDataFox/dataFoxFixture 导出、加 adapter 契约。
- [x] 修内部 importer：`data/datafox/client.ts` 与 `client.test.ts` 改直引 `model/adapters/*`。
- [x] 构建验证：主 bundle grep 后端符号=0、子包自洽。

## Dev Notes

- tsup 把 `entry` 的 key `adapters/datafox` 输出成 `dist/adapters/datafox.js`（非 `/index.js`）——exports 路径据实对齐。
- 主 bundle 185.81KB（较 Epic 7 的 204KB 降——datafox client/适配移出主入口）。

## Dev Agent Record
### Agent Model Used
claude-opus-4-8[1m]（dev-story）
### Debug Log References
- 构建：`dist/index.js` 185.81KB（grep decodeDataFox/spans-search/resourceSpans/decodeOtlp = 0，adaptTrace=2）；`dist/adapters/datafox.js` 9.53KB（自洽）、`dist/adapters/otlp.js` 7.03KB。
### File List
- 新增 `src/adapters/datafox/index.ts`、`src/adapters/otlp/index.ts`；改 `tsup.config.ts`、`package.json`、`src/index.ts`、`src/model/index.ts`、`src/data/datafox/client.ts`、`src/data/datafox/client.test.ts`
### Change Log
- 2026-06-29：实现 8.2（核心包后端中立 + 子路径导出）。Status → done。
