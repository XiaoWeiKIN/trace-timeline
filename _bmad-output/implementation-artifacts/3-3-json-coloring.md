---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 3.3: 键值表与 JSON 着色

Status: review

## Story

As a 排障用户,
I want tag/log 值若为 JSON 结构则语法着色展示，且 HTML 值被净化,
so that 复杂结构化值可读且安全。

## Acceptance Criteria

1. **Given** KeyValuesTable + jsonMarkup + DOMPurify 就位 **When** 渲染一个值为 JSON 对象/数组的 tag **Then** key/string/number/bool/null 有区分样式（FR-12）。
2. **And** JSON 着色经 jsonMarkup 生成 HTML → **DOMPurify 净化** → 渲染（防 XSS）。
3. **And** 非 JSON 值保持纯文本/URL 链接（3.2 行为不回归）。
4. **And** `npm run typecheck` / `npm test` / `npm run build` 全过；jsonMarkup + 净化路径带单测（含恶意 HTML 被剥离）。

## Tasks / Subtasks

- [x] Task 1：自研 jsonMarkup（AC: #1）`src/presentation/jsonMarkup.ts` — 递归把 JSON 值转 HTML 串，类名 `json-markup / json-markup-key/string/number/bool/null`，**所有文本 HTML 转义**；缩进美化。
- [x] Task 2：JSON 检测 + 净化渲染（AC: #1,#2,#3）`DdKeyValuesTable` 值渲染：`parseIfComplexJson`（字符串以 `[`/`{` 开头且可 parse，或本身是对象/数组）→ jsonMarkup → `DOMPurify.sanitize` → `dangerouslySetInnerHTML`；否则纯文本/URL 链接（3.2 路径）。
- [x] Task 3：着色样式（AC: #1）emotion 针对 `& .json-markup-*` 子选择器配色（走 theme：key/string/number/bool/null 区分；light/dark）。令牌进 theme.trace.detail.json。
- [x] Task 4：单测（AC: #4）`jsonmarkup.test.ts`（各类型类名 + HTML 转义）、扩 `keyvalues.test.tsx`（JSON 值出 json-markup 容器；恶意 `<img onerror>` 经 DOMPurify 被剥离）。
- [x] Task 5：自验 typecheck/test/build + Chrome DevTools（JSON 值着色显示、普通值不受影响）。

## Dev Notes

### 移植来源（结构忠实 + 自研着色器）
- Grafana KeyValuesTable：`jsonObjectOrArrayStartRegex = /^(\[|\{)/`；`parseIfComplexJson(value)`（string 且 regex 命中 → `JSON.parse`，失败回退原值）；`jsonMarkup(parsed)` → `DOMPurify.sanitize(html)` → `dangerouslySetInnerHTML`。
- jsonMarkup 类名（与上游一致，便于 CSS 对齐）：`json-markup`(容器) / `json-markup-key` / `json-markup-string` / `json-markup-number` / `json-markup-bool` / `json-markup-null`。**自研生成器**（非拷贝第三方库），全程 HTML 转义 + DOMPurify 二次净化。

### 依赖
- `dompurify@3.4.11` + `@types/dompurify` 已在 package.json/lock（无需新增）。

### 安全
- 双重防护：① 生成时转义 `& < > " '`；② DOMPurify.sanitize 剥离任何标签/事件属性。单测验证恶意 HTML 值不产生可执行节点。

### 范围
- 仅值的 JSON 着色 + 净化。链接化（datalink/span link）→ Epic 4/后续。warnings/stackTraces 维持 3.2 文本渲染。

### References
- [Source: KeyValuesTable.tsx parseIfComplexJson + DOMPurify.sanitize + dangerouslySetInnerHTML]
- [Source: jsonMarkup.js 类名]、[Source: investigations/datadog-span-detail-ux-investigation.md]
- [Source: epics.md#Story 3.3]、[Source: prd FR-12]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]（dev-story）

### Debug Log References

- typecheck 0 错误 · `npm test` **96 passed**（+9：8 jsonMarkup + 1 keyvalues 净化）· build ESM 118.78 KB clean。
- Chrome DevTools：给 s1 加 JSON 值 tag（http.request.headers）→ 详情卡 Span attributes 展开见 `.json-markup` 容器，pretty-print `{ "accept": "application/json", ... }`，着色 key=紫 rgb(140,55,140)/string=绿 rgb(42,126,65)/number=蓝 rgb(0,107,194)/bool=橙 rgb(193,88,0) 四类区分。
- DOMPurify 净化经单测验证：`{"x":"<img onerror=...>"}` 渲染后无 onerror 属性、无 script 节点。

### Completion Notes List

- **自研 jsonMarkup**（`src/presentation/jsonMarkup.ts`，非拷贝第三方库）：递归 JSON→HTML 串，类名与上游一致（json-markup / -key/-string/-number/-bool/-null），**全程 HTML 转义** + 缩进美化；`parseIfComplexJson`（对象/数组 string 以 `[`/`{` 起且可 parse，或本身对象→返回；否则 null）。
- **DOMPurify 净化路径**：复杂 JSON → jsonMarkup → `DOMPurify.sanitize` → `dangerouslySetInnerHTML`（FR-12）。双重防护（转义 + sanitize）。`dompurify@3.4.11` 已在依赖，无需新增。
- **着色令牌进 theme.trace.detail.json**（key/string/number/bool/null，light/dark 双套，AD-7）；emotion `& .json-markup-*` 子选择器配色。
- **非 JSON 值不回归**：纯文本/URL 链接维持 3.2 行为（既有测试 + 新增测试覆盖）。
- demo 给 mockTrace s1 加一个 JSON 值 tag 演示着色（不影响任何单测——model.test 不断言 mockTrace tag 数）。AC #1~4 全满足。

### File List

新增：`src/presentation/{jsonMarkup.ts,jsonmarkup.test.ts}`
修改：`src/theme/{types.ts,tokens/trace.ts}`（detail.json 令牌）、`src/presentation/{DdKeyValuesTable.tsx,keyvalues.test.tsx}`、`src/model/mock-trace.ts`（demo JSON tag）

### Change Log

- 2026-06-26：创建 + 实现 Story 3.3——自研 jsonMarkup（json-markup-* 类 + HTML 转义）+ DOMPurify 净化，DdKeyValuesTable 值 JSON 检测→着色（key/string/number/bool/null 区分）；96 单测（含恶意 HTML 剥离）；浏览器 JSON tag 四类着色验证。**Epic 3 完成**。Status → review。
