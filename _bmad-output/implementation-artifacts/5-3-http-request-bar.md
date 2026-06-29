---
baseline_commit: 91c80f5230db8e12952cc4c706f5a9f9f8af04c1
---

# Story 5.3: 详情头 HttpRequestBar 风格

Status: review

## Story

As a 使用方,
I want 详情头按 DRUIDS HttpRequestBar 风格显示 method pill + url + 状态 pill,
so that 详情头观感对标 Datadog。

## Acceptance Criteria

1. span 含 method/url/status 时，详情头渲染 method pill + url + HTTP 状态 pill（UX-DR11）。
2. typecheck/test/build 通过。

## Tasks / Subtasks

- [x] Task 1：`DdHttpRequestBar` — 从 span.tags 提取 http.method/http.url/http.status_code（多源 key），渲染 method pill（primary 底）+ url（蓝链接）+ 状态 pill（httpStatusToken 配色）；无 http 字段不渲染。
- [x] Task 2：接 `DdSpanDetail`（Tab 栏之后、Pinned 之前）。
- [x] Task 3：单测 `httprequestbar.test.tsx`（method/url/status / 无字段不渲染 / 仅状态码）。
- [x] Task 4：自验 typecheck/test/build + Chrome DevTools。

## Dev Notes

- 配色复用 theme（method=primary.main，url=detail.link，status=httpStatusToken）。method 大写。
- 仅 HTTP span 渲染；DB/其它 span 不显示该条。

### References
- [Source: prd UX-DR11]、[Source: epics.md#Story 5.3]、[Source: src/presentation/colorAccessor httpStatusToken]

## Dev Agent Record

### Agent Model Used
claude-opus-4-8[1m]（dev-story）

### Debug Log References
- typecheck 0 错误 · `npm test` **136 passed**（+3 httpRequestBar）· build clean。
- Chrome DevTools：根 span 详情头渲染 `GET`(pill) + `http://localhost:9001/user`(链接) + `200`(绿 pill)。

### Completion Notes List
- `DdHttpRequestBar`：method pill（大写，primary 底）+ url 链接 + 状态 pill（2xx 绿/5xx 红）；无 http 字段 return null。接 DdSpanDetail 详情头。3 单测。AC 全满足，未新增依赖。

### File List
新增：`src/presentation/{DdHttpRequestBar.tsx,httprequestbar.test.tsx}`
修改：`src/presentation/{DdSpanDetail.tsx,index.ts}`

### Change Log
- 2026-06-26：创建+实现 Story 5.3——DdHttpRequestBar 详情头（method pill+url+状态 pill，UX-DR11）；136 单测；浏览器验证。Status → review。
