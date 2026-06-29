---
title: Adversarial Architecture-Spine Review — Datadog 风格 Trace Timeline 组件库
type: review-adversarial
target: ARCHITECTURE-SPINE.md
reviewer: adversarial-spine-reviewer
date: 2026-06-24
gate-verdict: NEEDS-WORK
---

# Adversarial Review — ARCHITECTURE-SPINE (Datadog Trace Timeline)

## Method

I read the spine as a contract and tried to **build two conformant units one level down that each obey every AD to the letter yet still build incompatibly.** Each surviving pair is a hole the spine must close with a new or tightened AD. I focused fire on the seams the brief named: `RenderableRow`, AD-5 (controlled/uncontrolled), AD-7 (theme token contract), AD-6 (color seam vs. RPC/error features), AD-4 (immutability), AD-9 (Apache provenance), plus whole structural dimensions left silent.

The spine is genuinely strong on **physical layering, dependency direction, and provenance intent.** The mermaid dependency graph and the seam sequence diagram are unusually concrete. But the load-bearing contract — `RenderableRow` — is underspecified in exactly the places where core and presentation will diverge, and three structural dimensions (row height ownership, keying/measurement, label-text derivation) are silent at an altitude that should own them.

---

## Gate verdict: **NEEDS-WORK**

Not PASS-WITH-FIXES, because the divergences are not cosmetic — at least three of them (row-height ownership, RenderableRow field semantics, color-vs-RPC seam) will produce two units that compile, pass their own unit tests, and **still render wrong or crash at integration** with no AD to adjudicate. These are spine holes, not implementation TODOs. They are fixable with tightened ADs and do not require a paradigm change; hence NEEDS-WORK rather than a redesign.

---

## A. Attacks on the `RenderableRow` contract (AD-2)

AD-2 enumerates `RenderableRow` as: `{ span, spanIndex, isDetail, depth, ancestorSpanIds[], viewBounds:{start,end}, isCollapsed, isMatchingFilter, isFocused, showErrorIcon, rpc, criticalPathSections, columnWidth, on*Toggle 回调 }` — "数据 only, no color, no theme." Good intent. But "data only" is not the same as "fully specified." Here are conformant-yet-incompatible pairs.

### A-1 [CRITICAL] — Row height ownership is undefined; core (virtualization) and presentation (DdDetailPanel) both legitimately own it

The brief flagged this explicitly and it is the deepest hole. The engine is `VirtualizedTraceView/ListView/Positions` — **virtualization requires knowing each row's pixel height** to place rows and compute the scroll offset (`Positions` in Jaeger/Grafana is literally a height-accumulator). But `RenderableRow` carries **no height field**, and `isDetail` rows (detail panels) have *content-dependent* height — FR-10 says "含 logs 时行高更大," and the visual spec §2 says span rows are ~24-28px while detail rows are unbounded.

Two conformant units:
- **Core unit C1** assumes fixed per-row heights (a constant for span rows, a second constant for detail rows) — this is what Jaeger/Grafana `Positions` historically did, and AD-3 says "照搬 class + 上游行为." It tells `ListView` the height.
- **Presentation unit P1** renders a detail panel whose height depends on logs/tags/JSON content (FR-10/FR-12) and grows when sub-groups expand (FR-11).

Both obey every AD. They build. At integration the detail row is taller than the height `Positions` reserved → overlap/clipping, and every subsequent row's scroll offset is wrong → virtualization (FR-6, SM-3) breaks. There is **no AD naming who owns row height, nor a measurement protocol** (fixed constant vs. `react-virtualized`-style `measureRows`/`CellMeasurer` vs. `onHeightChange` callback up to `Positions`). Open Question #5 ("detail panel uses a fixed constant — keep as source?") gestures at this but the *spine* must decide, because it determines whether `RenderableRow` needs an `onMeasure`/height-report callback in the contract and whether `ListView` is variable-height-capable. This is a structural decision, not an implementation detail.

**Close with:** a new AD — "Row geometry is owned by core via `Positions`; presentation rows MUST be height-deterministic from `RenderableRow` data alone, OR `RenderableRow` carries a `reportHeight(index, px)` callback and `ListView` supports dynamic remeasure." Pick one and state it. Decide detail-row height policy (fixed-constant vs. measured) here, not in Open Questions.

### A-2 [HIGH] — `viewBounds` units & semantics undefined → core and presentation disagree on bar geometry

`viewBounds:{start,end}` has no stated unit or meaning. Is it the **normalized view range [0,1]** (per glossary "视图区间 [0,1]"), or **this span's already-projected bar extent** `{start,end}` within the row (Jaeger's `getViewedBounds()` returns per-span `{start,end,...}` in [0,1] *of the viewport after clipping*)? These are different objects:
- **Unit A** treats `viewBounds` as the global view range and recomputes the span's left/width in presentation from `span.startTime/duration` + `viewBounds`. → color seam clean, but presentation now re-implements time-mapping (AD-1 says engine owns 时间映射 — violation in spirit, and it will drift from `getViewedBounds`).
- **Unit B** treats `viewBounds` as the per-span projected `{start,end}` from `getViewedBounds()` and just multiplies by 100%. → correct, engine owns mapping.

Both literally satisfy "viewBounds:{start,end}." They produce different bar positions under zoom (FR-8) and different clip-indicator behavior (FR-8 "超出视口的条两端显示裁剪提示" — which requires the clipped-start/clipped-end booleans that `getViewedBounds` returns but the contract does not list). **The contract must say: `viewBounds` is the per-span projected extent in [0,1] viewport space, and MUST include `clippingLeft/clippingRight` (or equivalent), because FR-8's clip indicators are presentation but the data is core's.** Otherwise time-mapping leaks into presentation, breaking AD-1.

### A-3 [HIGH] — `depth` vs `ancestorSpanIds[]` ordering for indent guides is ambiguous; FR-25 service-color lines can't be drawn deterministically

AD-6 says service-color indent lines "由 `ancestorSpanIds` 逐层取祖先 span 经同一 accessor 着色." The brief asks: how does indent depth map to `ancestorSpanIds` ordering? The contract gives both `depth` (a number) and `ancestorSpanIds[]` (a list) with **no stated invariant that `ancestorSpanIds.length === depth`, and no stated order (root-first vs. parent-first).**

Two conformant units:
- **Presentation P-a** draws `depth` vertical guides, coloring guide *i* by `accessor(spanById(ancestorSpanIds[i]))`, assuming `ancestorSpanIds[0]` is the root.
- **Core C-a** populates `ancestorSpanIds` parent-first (nearest ancestor at index 0), which is the natural output of a parent-walk, and may *exclude* the root or *exclude self's immediate parent under RPC merge* (see A-4).

Result: guides colored in reversed order, or a count mismatch (`depth=5`, `ancestorSpanIds.length=4` because RPC-merged a level) → guides misaligned with rows, the single most visually distinctive Datadog feature (FR-25, visual-spec §7 "服务色竖线连接") renders wrong. **Close with:** state in the contract that `ancestorSpanIds` is root-first, `ancestorSpanIds.length === depth`, and define how RPC-merged levels (A-4) appear in it.

### A-4 [HIGH] — `rpc` field shape is unspecified and collides with `span`/`showErrorIcon` ownership (the color-seam-vs-RPC attack)

The brief specifically asked whether removing color from core "actually works given the engine's RPC-merge / error-propagation features that in Grafana used color." It does **not** cleanly work as written. RPC merge (FR-17) means a *collapsed client span is displayed using its server child's service name, operation, and color.* So when presentation calls `colorAccessor(row.span)`, **which span does `row.span` hold — the client or the merged server?**

Two conformant units:
- **Core C-r** keeps `row.span` = the real client span and puts the server peer info in `rpc: { serviceName, operationName, ... }`. Presentation must know to color by `rpc.serviceName` when `rpc` is present. But AD-6 says color = `colorAccessor(span)`, taking the *span*, not the rpc. So presentation colors by the client service → wrong color, contradicting FR-17 "折叠的 client Span 显示对端 server 的服务名/操作名/颜色."
- **Core C-r2** rewrites `row.span` to a merged synthetic span carrying the server's serviceName. Now `colorAccessor(span)` is right, but `showErrorIcon` and `criticalPathSections` and detail-panel content (which must show the *client's* tags) now disagree about which span identity they describe.

Both obey AD-2/AD-6 literally. The spine never says **whether `colorAccessor` receives `row.span` or a resolved "display span," nor what the `rpc` field's exact shape is, nor whether error/critical-path/detail use client or server identity under merge.** Same problem for FR-17 external-service inference (leaf client + `peer.service`) and FR-15 error *propagation* to a collapsed parent: `showErrorIcon` is a boolean, but the visual spec wants the parent to show it's an error *path* — is that the same boolean? Does the color of a propagated-error indent line follow the erroring descendant's service or the parent's?

**Close with:** an AD that (a) defines `rpc` shape precisely, (b) states `colorAccessor` receives a **`displaySpan`** (the engine resolves client-vs-server-vs-peer and hands presentation one span identity for color/label, while keeping `span` for detail), and (c) states whether `showErrorIcon` means "this span errored" vs. "this collapsed subtree contains an error" — or split into two fields. Error propagation in Grafana used color/icon; confirm the *icon* path is color-free but the *indent-guide color* path is governed by AD-6.

### A-5 [MEDIUM] — Duration label derivation is unowned; core and presentation can compute different numbers

Visual spec §2 and FR-2/FR-24 require a per-bar duration label ("102ms, 28.2ms") and FR-2 requires axis tick labels in "µs/ms/s." `RenderableRow` carries `span` (so `span.duration` in µs) but **no formatted duration string and no formatter contract.** Two conformant units: presentation formats `span.duration` itself with its own µs→ms rounding rule; core/theme exposes a `formatDuration` whose rounding differs. They'll disagree (28.2ms vs 28ms vs 28200µs), and the axis ticks (FR-2, core-owned per the Capability Map "core(映射)") vs. the bar labels (presentation) will use different formatters → inconsistent units in one view. **Close with:** name a single duration-formatting owner (theme util or model util), used by both axis and bar label. State whether the label is in `RenderableRow` or derived by presentation from `span.duration` via that shared util.

### A-6 [MEDIUM] — No row `key`/identity contract → virtualization reconciliation is unspecified

A span produces a bar row and (when expanded) a detail row (glossary: "展开后额外对应一行详情行"). Virtualization reuses DOM nodes (FR-6 "滚动时行复用"). The contract has `spanIndex` and `isDetail` but **no stable React `key` rule.** Two conformant units key by `spanIndex` vs. by `spanID + isDetail`. Under filter/collapse, `spanIndex` shifts → keying by index causes wrong-row state bleed (a classic React list bug; detail-open state attaches to the wrong span). This is squarely a spine-altitude decision because it's the engine's reconciliation contract. **Close with:** a keying rule in the contract (e.g., `key = ${spanID}${isDetail ? ':detail' : ''}`).

---

## B. Attacks on AD-5 (controlled/uncontrolled seam) — double source of truth

AD-5: default all-uncontrolled; `focusedSpanId` + search query controllable; "全量受控逃生舱" (pass full state + callbacks); column-width/hover uncontrolled only; `colorBy/errorsOnly` are Datadog-new, `errorsOnly` reuses the search filter pipeline.

### B-1 [HIGH] — Per-prop controlled + "full controlled escape hatch" can both be supplied → two sources of truth, no precedence rule

AD-5 offers *two* controlled mechanisms simultaneously: (1) individual controlled props (`focusedSpanId`, search query) and (2) a "全量受控逃生舱" that passes the complete state object + all toggle callbacks. Nothing says these are mutually exclusive or which wins. Two conformant units:
- **Unit U-1** wires `focusedSpanId` as a controlled prop AND a caller using the escape hatch passes a full state object that *also* contains a focused span. Now there are two inputs for focus. `useTraceTimelineState` has no stated precedence → one unit reads the prop, another reads the state-object field → flicker / ignored updates / the AD-5 "库不再内部改写该状态" guarantee is violated for whichever path it didn't honor.

**Close with:** AD-5 must state that the full-controlled escape hatch and per-field controlled props are **mutually exclusive** (or define strict precedence), and that mixing them is a dev-time error/warning.

### B-2 [MEDIUM] — `errorsOnly` "reuses the search filter pipeline" but `errorsOnly` is uncontrolled while search query is controllable → coupled state, split control

AD-5 makes search query controllable but lists `colorBy/errorsOnly` as Datadog-new without saying whether they're controllable; the structural seed shows them in `DdToolbar`. If `errorsOnly` writes into the same `findMatchesIDs`/search pipeline (FR-26 "复用 FR-14 过滤"), then a *controlled* search query and an *uncontrolled* `errorsOnly` both mutate one derived match-set. Two conformant units: one treats the controlled query as the sole source of `findMatchesIDs` (errorsOnly ignored); the other ORs them. **Close with:** state whether `errorsOnly` is controllable, and define how it composes with a (possibly controlled) search query into the single match-set — union? separate predicate AND-ed? This is the FR-14/FR-26 contract and belongs in the spine.

### B-3 [LOW] — Column width "uncontrolled only" contradicts SM-1/UJ persistence expectation

FR-9 says width "释放后保持"; AD-5 forbids controlling it. A consumer that wants to persist column width across mounts (reasonable for an APM console, UJ-1) cannot. Not a build incompatibility, but a spine-level capability gap worth an explicit "deferred/won't-do" note rather than silence, so a downstream story doesn't add a controlled prop that violates AD-5.

---

## C. Attacks on AD-7 (theme contract) — presentation vs. theme can disagree on token names

AD-7: tokens follow `GrafanaTheme2` subset shape + new `theme.trace.*` (bar height / radius `2px 2px 0 0` / gap / category palette / HTTP status colors / indent line color+width / selected-row bg `rgb(234,246,252)` / NotoSans); `override` deep-merges into base; skin reads only `theme.trace.*`.

### C-1 [HIGH] — `theme.trace.*` has no enumerated key schema → presentation reads keys theme never defines (silent `undefined`)

AD-7 lists the *concepts* in `theme.trace` prose ("条高/圆角/gap/分类色板/HTTP 状态色/缩进线色宽/选中行底/NotoSans") but **gives no typed key schema.** Two conformant units: theme defines `theme.trace.barHeight`; presentation reads `theme.trace.spanBarHeight`. TypeScript won't catch it if `theme.trace` is typed loosely (or if `override` widens it). Result: `undefined` → bar height collapses, no compile error. The whole point of a token contract is a shared, enumerated, typed key set. **Close with:** the spine must either inline the exact `TraceTokens` interface (every key, type, unit) or bind it to a single source-of-truth file the contract names. Prose is not a contract.

### C-2 [MEDIUM] — HTTP-status-pill colors live in two places: `theme.trace.HTTP状态色` AND DRUIDS semantic palette

Visual spec §5 says HTTP pills use DRUIDS semantic colors (2xx green `rgb(236,249,239)`, 5xx red, etc.) which are *also* the general `colors.success/error/warning` in the GrafanaTheme2 subset. AD-7 puts "HTTP 状态色" under `theme.trace.*`. Two conformant units: presentation reads `theme.trace.httpStatus['5xx']`; theme author only filled `theme.colors.error` and left `theme.trace.httpStatus` to fall back to base (empty). The deep-merge "回退内置" rule means missing `theme.trace.*` keys fall back to *built-in trace tokens*, not to `theme.colors.*` — so a consumer who recolors `theme.colors.error` expecting pills to follow will find pills unchanged. **Close with:** state whether HTTP-status pill colors derive from `theme.colors.*` (semantic) or are independent `theme.trace.httpStatus.*` tokens, and what FR-21 override of `colors.error` does to pills.

### C-3 [LOW] — `override` deep-merge semantics undefined for arrays (the category palette)

The category palette is an *array* (§3.1). Deep-merge of arrays is ambiguous: replace-whole vs. index-merge vs. concat. A consumer overriding one color could accidentally truncate the palette or get a hybrid. **Close with:** state that arrays in `override` replace wholesale (not deep-merged).

---

## D. AD-4 (immutability) enforcement

### D-1 [MEDIUM] — AD-4 is asserted but has no enforcement mechanism named; a conformant unit can mutate via lodash and pass

AD-4 mandates new `Set/Map/array/object` on every state update, to protect `memoizeOne` reference equality. But the spine names `lodash` and `classnames` as deps and ports class components with hand-written `shouldComponentUpdate` (AD-3). Two conformant units: U-imm builds fresh collections; U-mut uses `set.add(x); return set` (a single Set instance reused) — it still "obeys" AD-4's prose loosely ("一律新建" is intent, but a reviewer-proof rule needs teeth). With no `Object.freeze` in dev, no `readonly` types on the state shape, and no lint rule named, the mutation passes unit tests (the Set has the right contents) but silently defeats `memoizeOne` → `generateRowStates` returns stale rows → FR-4/FR-5 collapse appears to do nothing intermittently. **Close with:** name the enforcement — `readonly`/`ReadonlyArray`/`ReadonlySet` types on the `TTraceTimeline` state interface, and/or dev-mode `Object.freeze`, and/or `eslint-plugin-immutable`. An invariant with no enforcement is a hope.

---

## E. AD-9 (Apache provenance) — ambiguous modules

### E-1 [HIGH] — `theme/colorGenerator` + `autoColor` provenance is genuinely ambiguous and the rule contradicts itself

AD-9 says: only directly port files with the `Copyright (c) 2017 Uber Technologies` Apache header; Grafana self-developed increments → rewrite or port from Jaeger upstream. But FR-3 says "取色逻辑沿用 Grafana `color-generator` 的稳定散列+相邻去重规则（readability ≥ 1.5），但色值替换为 Datadog 色板." So the *algorithm* is to be "沿用" (carried over) from Grafana's color-generator. **Is Grafana's `color-generator` an Uber-Apache file or a Grafana increment?** If the former, port it (and AD-6's "core has no color" is irrelevant since it lives in theme). If the latter (Grafana-authored), AD-9 forbids "照搬" — you must rewrite the hash+dedupe from scratch or find it in Jaeger upstream. The spine doesn't resolve this for the *one algorithm the visual identity depends on.* The Deferred section punts "关键路径算法的具体实现来源" but **not** colorGenerator. **Close with:** explicitly classify `color-generator`/`autoColor` provenance (Jaeger-origin vs. Grafana-origin) and state port-vs-rewrite, since FR-3's "沿用" and AD-9's "不照搬 Grafana 增量" are in direct tension.

### E-2 [MEDIUM] — `transformTraceData` and `model/trace.ts` provenance unstated; these are the most likely Jaeger-origin files but the audit unit could mislabel

`transformTraceData` and the `Trace/TraceSpan` model are almost certainly Jaeger-UI-origin (Uber Apache) — but Grafana may have layered derived fields (`relativeStartTime`, critical-path hooks) into them. A conformant `LICENSE-AUDIT.md` author marks the whole file "Apache (Uber header present)" even though Grafana added increments inside it → copyleft leak. **Close with:** AD-9 should require *line-level / function-level* provenance notes for any ported file Grafana modified, not just file-level header presence. The current rule ("保留 Apache 头的文件才移植") under-detects in-file Grafana additions.

### E-3 [LOW] — `state/` ported hooks (`useChildrenState` etc.) provenance unstated

AD-3/AD-5 say these hooks are "移植." Jaeger UI's state was Redux/class-era; these hooks may be Grafana-authored FC ports → AD-9 forbids copying Grafana increments, but AD-5 says "移植 useChildrenState…." Tension. Classify them in the audit.

---

## F. Whole structural dimensions left SILENT (this altitude should own them)

1. **[HIGH] Row-height / measurement model** (see A-1) — the single biggest silence. Variable-height virtualization is an architectural property of `ListView`, not an implementation detail. The spine must declare fixed vs. measured.

2. **[HIGH] Keying / reconciliation identity** (see A-6) — engine-level contract for how rows map to React keys across filter/collapse/zoom. Silent.

3. **[MEDIUM] Error & loading & empty-state model.** "Consistency Conventions" says "非法 trace → 空态而非崩溃" and FR-14 wants an empty-state on no-match. But there's no AD owning *which layer* produces empty/invalid/loading states, and the search-empty (FR-14) vs. invalid-trace (convention) vs. zero-span states are three different empties with no owner. At least name the owner (api or presentation) and the contract (does `<TraceTimeline>` accept `trace=null`?).

4. **[MEDIUM] Accessibility ownership.** NFR §12 requires keyboard-reachable collapse/detail and labeled icons; the spine's ui/presentation split means focus management spans both (engine owns row virtualization → focus-into-virtualized-rows is an engine concern). No AD owns a11y/focus, and virtualized lists are notoriously a11y-hostile (rows not in DOM can't be focused). This is a structural concern, not just a story-level checklist. Name the owner and whether virtualization must keep focused rows mounted (interacts with A-1/A-6 and FR-7 scroll-to-focus).

5. **[LOW] i18n / `reportInteraction` / `config` injection points.** Conventions mention `t(id,...)` and stubbed `config/reportInteraction` "可注入," but no AD owns the injection-point contract (a context? props? a module-level setter?). Ported Grafana files reference these globally; the *shape* of replacing them is a seam that should be an AD, lest each ported file invent its own stub.

6. **[LOW] DOMPurify usage seam.** `dompurify` is in the stack (for FR-12 JSON/tag rendering presumably) but no AD says where sanitization happens or what the threat model is (tag/log values are attacker-influenced trace data). Name the sanitization boundary.

---

## G. Known gap (noted, not dwelt on)

The Stack table versions are all `[ASSUMPTION 待 web 核]` because web verification was unavailable. This is a real but *low-severity, mechanically-closable* gap: pin exact versions when web access returns, lock with a lockfile, and re-confirm React peer range `^18 || ^19` against the actual `react-virtualized`/ListView port's React requirements (the ported class components with `shouldComponentUpdate` are React-18/19-safe, but verify no legacy `componentWillReceiveProps` survives the port — that *would* break React 18 StrictMode and is worth a port-time check, arguably an AD-3 sub-rule).

---

## H. What the spine got RIGHT (so fixes don't regress it)

- Physical layering + one-directional dependency graph is crisp and the `core` purity (zero theme/ui import) is the correct backbone.
- The `rowRenderer` seam as the single inversion point is the right call and the sequence diagram makes it testable.
- AD-9's intent (only port Apache-headed files; rewrite Grafana increments) is the right legal posture; my E-findings tighten *detection*, not direction.
- AD-11 (deep-coupled features = shell + injected callback) is clean and matches UJ-3.
- The Deferred list honestly fences v2 (OTLP, color-by non-service, real flamegraph).

The fixes are additive AD tightenings, not a redesign. Re-gate to PASS-WITH-FIXES once A-1, A-4, C-1, and E-1 have explicit ADs and A-2/A-3/B-1/A-6/F-1/F-2 are resolved in the contract text.

---

## Prioritized fix list (for the architect)

| # | Severity | Seam/AD | Fix |
|---|----------|---------|-----|
| A-1 | CRITICAL | RenderableRow / ListView | New AD: row-height owner + fixed-vs-measured detail rows + (if measured) `reportHeight` in contract |
| A-4 | HIGH | RenderableRow / AD-6 / FR-17 | Define `rpc` shape; `colorAccessor` takes resolved `displaySpan`; split `showErrorIcon` (self vs subtree) |
| C-1 | HIGH | AD-7 | Inline typed `TraceTokens` key schema (no prose-only tokens) |
| E-1 | HIGH | AD-9 / FR-3 | Classify `colorGenerator`/`autoColor` provenance; resolve "沿用 Grafana" vs "不照搬增量" |
| A-2 | HIGH | RenderableRow | Define `viewBounds` as per-span projected [0,1] + add `clippingLeft/Right` |
| A-3 | HIGH | RenderableRow / AD-6 | State `ancestorSpanIds` root-first, `length===depth`, RPC-merge behavior |
| B-1 | HIGH | AD-5 | Per-field controlled vs full-controlled escape hatch are mutually exclusive (or precedence) |
| A-6 | MEDIUM | RenderableRow | Stable `key` rule (`spanID`+`isDetail`) |
| F-3..F-6 | MED/LOW | silent dims | Name owners: empty/invalid/loading; a11y+focus-in-virtualization; i18n/config injection seam; DOMPurify boundary |
| A-5,B-2,C-2,C-3,D-1,E-2 | MEDIUM | various | Duration formatter owner; errorsOnly controllability+composition; pill color source; array-override semantics; immutability enforcement teeth; in-file Grafana-increment provenance |
| G | LOW | Stack | Pin versions when web returns; port-time check for legacy lifecycle methods (AD-3 sub-rule) |
