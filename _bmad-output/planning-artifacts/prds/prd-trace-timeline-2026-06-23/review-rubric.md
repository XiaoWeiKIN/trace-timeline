# PRD Quality Review — TraceTimeline 独立 React 组件库

## Overall verdict

This is a strong, unusually disciplined PRD for a technical capability spec. It has a real thesis (a market gap: no backend-agnostic, embeddable React span-waterfall component), feature scope that follows directly from that thesis, FRs that almost all carry testable consequences, and an honest separation of "what" (PRD) from "how" (addendum). The principal risks are concentrated in **done-ness**: several success metrics and NFRs lean on thresholds that are explicitly deferred to the architecture phase ("既定阈值", "合理预算", "≤ 80KB gzip 初定"), so SM-3/SM-4 and §10/§12 are not yet pass/fail testable. There is also one mechanical defect — a corrupted protagonist name in UJ-2 ("李�QA") — and a fidelity claim ("接近 1:1") that has no operational acceptance procedure. None of these are structural; this gates **PASS-WITH-FIXES**.

## Decision-readiness — strong

A decision-maker can act on this. The license strategy — the highest-stakes decision in the whole effort — is stated as a *decision*, not a consideration: §13 "许可证纯净策略（已定）" lays out a four-point concrete strategy (only port Apache-headed files; rewrite/upstream-port Grafana-original increments like CriticalPath; stub deep-coupled features; produce `LICENSE-AUDIT.md`). Open Question #7 is correctly struck through and marked resolved, with the resolution pointing back to §13. That is exactly how a resolved tension should read.

Trade-offs are named with what was given up, not smoothed to neutral. The counter-metrics (SM-C1, SM-C2) explicitly state what *not* to optimize — "不可为压体积而牺牲功能保真", "不可为 30 分钟集成而过度收窄 API". The `[NOTE FOR PM]` callouts sit at genuine tensions (FR-16 critical-path license risk; §6.2 i18n injection-point cost). The fidelity goal honestly concedes it is "接近 1:1，不保证像素级一致" (§5, §14) rather than overclaiming.

The remaining Open Questions (#1–#6, #8) are genuinely open — performance numbers, a11y level, controlled-API granularity, SSR, detail-row height, package name, OTLP timing. None are rhetorical.

### Findings
- **low** Open Question #3 (controlled-API granularity) is load-bearing but left fully open (§15) — it directly shapes the §8 public surface and UJ-3 integration, yet no leaning decision or default is offered. *Fix:* state a default position (e.g., "受控支持折叠集合 + 视图区间 + 搜索；其余仅非受控") so the architect has a starting contract to push back on rather than a blank.

## Substance over theater — strong

Very little furniture. The Vision (§1) is product-specific and could **not** swap into another PRD: it names the exact problem (high-quality waterfalls are bound to Grafana/Jaeger host frameworks), the exact mechanism (`<TraceTimeline trace={...} />`, zero `@grafana/*`), and the exact data contract (`Trace`/`TraceSpan`). The market-gap claim (§1, §1 "市场空白") is backed by research (addendum §J) rather than asserted — it names the only two 1:1 implementations and *why* they don't cleanly reuse (Redux/store coupling, `DataFrame[]` ingress). That is earned differentiation, not innovation theater.

JTBD (§2.1) are four crisp jobs, each tied to a real integrator decision (embed vs. self-build; connect existing trace format; stable TS API; inject own routing/backend). Non-target users (§2.2) are stated, which sharpens scope rather than padding. No persona theater — there are no decorative personas; the UJs carry named protagonists who drive actual FRs.

NFRs (§10–§12) mostly avoid boilerplate by being product-specific (zero `@grafana/*`, emotion runtime class labels for style isolation, React 18+19 peer). The exception is performance thresholds expressed as adjectives (see Done-ness).

### Findings
- **low** SM-4 / §10 size budget risks NFR-theater until a number lands — "合理预算内" is the kind of phrase the rubric flags, partially rescued by the `[ASSUMPTION] ≤ 80KB gzip` placeholder. *Fix:* promote the 80KB assumption from placeholder to provisional target, or explicitly mark it "architecture to confirm; treat as fail above 120KB" so it bounds something.

## Strategic coherence — strong

The PRD has a clear thesis and bets on it: *extract Grafana's battle-tested TraceTimeline, decouple it completely, ship Apache-2.0 clean.* Feature prioritization follows the thesis, not ease — the MVP keeps the genuinely hard, high-value core (§4.1–4.7: virtualization, time-window mapping, tree folding, semantic enhancements) in scope and pushes the easy-to-defer, low-differentiation deep-coupled features (§4.8 flamegraph/profiles/share) to stubs. That is the correct cut for a "platform/library" MVP kind, and the scope logic matches.

Success metrics validate the thesis rather than measuring activity: SM-1 (integration cost ≤ 30 min) tests the "lowest integration cost" promise; SM-5 (zero `@grafana/*`) tests the "completely decoupled" promise; SM-2 (functional fidelity) tests the "1:1 experience" promise. Counter-metrics are present and pointed. This is a thesis-driven spec, not a backlog with headings.

### Findings
*(No findings — dimension is strong.)*

## Done-ness clarity — adequate (weakest dimension)

Most FRs are genuinely testable. FR-1, FR-4, FR-6, FR-10, FR-11, FR-14, FR-15, FR-18, FR-21 each carry concrete, verifiable consequences (e.g., FR-6: "DOM 中实际渲染的行数远小于总行数（约等于视口可见数 + 缓冲）"; FR-15: "`isErrorSpan` 为真的 Span 显示错误图标"). The §-end "验证（功能保真验收清单）" is a real acceptance section mapping clusters of FRs to mock-data checks, which is exactly what downstream story creation needs. This lifts the dimension above "thin."

But several consequences hide adjectives the rubric tells me to flag:
- **FR-2** "标签为人类可读耗时（µs/ms/s）" — testable. But "默认 5 个刻度（含两端）" is good; fine.
- **FR-3** "相邻两条颜色对比度达到既定阈值" — "既定阈值" is undefined. Not testable until the number exists.
- **SM-3 / §10** "首屏渲染与滚动无明显卡顿", "首屏 ≤ 既定阈值", "滚动 60fps 目标" — "无明显卡顿" and "既定阈值" are adjectives. The DOM-row-count sub-clause *is* testable; the latency/fps part is not yet.
- **§14 fidelity** "接近 1:1", "手感尽量一致" — no acceptance procedure. The reverse-examples ("明显的版式漂移", "配色对比退化") are directionally helpful but not pass/fail.
- **§12 a11y** "键盘可达", "对比度满足" — bounded by the WCAG-AA assumption, but the assumption itself is "待细化".

The PRD is honest that these are deferred (Open Questions #1, #2; assumptions in §10/§12), so this is *adequate*, not *broken* — but every one of these is a place a story author will have to invent a threshold or punt.

### Findings
- **high** Performance metrics not yet pass/fail (SM-3, §10) — "无明显卡顿 / 既定阈值 / 60fps 目标" cannot be tested as written; an engineer cannot tell when SM-3 is met. *Fix:* even provisional bounds unblock stories: e.g., "1000-span first paint ≤ 200ms on mid-tier laptop; sustained scroll ≥ 50fps; DOM rows ≤ viewport+buffer." Mark "architecture to ratify."
- **high** Fidelity acceptance undefined (§14, SM-2 partially) — "接近 1:1" has no procedure, yet SM-2 claims "验收清单项 100% 通过." The §-end checklist tests *behavior*, not *visual fidelity*; the visual 1:1 claim has no test. *Fix:* define fidelity acceptance as side-by-side screenshot review against a fixed Grafana reference build for a named set of fixtures, with a checklist of must-match elements (bar geometry, tick labels, error red, collapse icons). Otherwise drop the visual-fidelity claim from SM-2's scope.
- **medium** FR-3 color-contrast "既定阈值" undefined (§4.1) — consequence references a threshold that does not exist anywhere in the doc. *Fix:* cite a concrete ratio (e.g., adjacent-bar luminance delta, or WCAG-style contrast ≥ X) or mark it an Open Question explicitly.
- **low** FR-13 "沿用源实现的匹配规则" defers the search-match spec to source code (§4.6) — acceptable for a port, but a story author without the source can't write the test. *Fix:* one sentence enumerating matched fields (serviceName / operationName / tag keys+values) — the addendum already implies `filter-spans` carries this.

## Scope honesty — strong

Omissions are explicit and do real work. §5 (非目标) is a genuine non-goals section: no data collection/query, no real flamegraph/profiles, no non-React frameworks, no minimap/compare/graph, no i18n bundle, no pixel-perfect guarantee. §6.2 (Out of Scope for MVP) distinguishes "v2, 按需" from "无计划" — a meaningful distinction most PRDs blur. FR-19 carries an explicit "Out of Scope" line ("不复刻 `@grafana/flamegraph`"), and FR-22 carries "Out of Scope（v1）" for OTLP with a forward-compat note ("§8 预留适配层边界以便后加").

`[ASSUMPTION]` tags are present on real inferences (i18n injection-only, public-surface shape, 80KB budget, WCAG-AA, SSR best-effort, OTLP→v2) and are rounded up in §16 "假设索引". `[NOTE FOR PM]` sits at two real tensions (FR-16 license, §6.2 i18n). De-scoping (OTLP, i18n, flamegraph) is proposed openly, not done silently.

Open-items density is appropriate for the stakes: ~6 assumptions + 8 open questions for a build-grade technical PRD with a deferred architecture phase is reasonable, *provided* the architecture phase is understood as the next gate (it is — Open Questions #1, #2 explicitly say "架构阶段定").

### Findings
- **low** §16 assumptions index is incomplete vs. inline tags — it lists §5, §8, §10, §12 but omits the inline `[ASSUMPTION]` in FR-22 (OTLP→v2) and the SSR assumption is folded into §12's line. *Fix:* add the FR-22 OTLP assumption to §16 for a clean roundtrip; the rubric wants every inline assumption indexed.

## Downstream usability — strong

This PRD feeds architecture → epics → stories, so traceability matters, and it largely holds. The Glossary (§3) is present and substantive; domain nouns (Trace, Span, 瀑布条, 视图区间, 关键路径, 受控/非受控, 深耦合功能) are used consistently across FRs and UJs. FR IDs are contiguous FR-1..FR-23 with no gaps or duplicates. UJ IDs UJ-1..UJ-3 and SM IDs SM-1..SM-5 + SM-C1/SM-C2 are clean.

Cross-references resolve well: each feature cluster cites which UJ it implements ("实现 UJ-1/UJ-2/UJ-3"), each SM cites which FRs it validates ("验证 FR-1、FR-22、FR-23"), and the §-end checklist maps back to FR IDs. I spot-checked the reverse: SM-1→{FR-1,FR-22,FR-23}, SM-2→{FR-1..FR-17}, SM-3→{FR-6} all resolve to existing FRs. Sections are mostly self-contained (cross-refs go through glossary terms and IDs, not "see above"). The addendum is correctly partitioned as the architect's source for the dependency-replacement matrix, port order, theme subset, and license audit.

### Findings
- **medium** UJ-2 protagonist name is corrupted — "李�QA" (§2.3) contains a mojibake/replacement character where the name should be; later text reads "李婷". A floating/garbled protagonist undercuts the rubric's "named protagonist" requirement and will confuse downstream readers. *Fix:* repair to "李婷（QA）" consistently.
- **low** SM-2 cites "FR-1..FR-17" but the functional-fidelity checklist also covers FR-18..FR-23 (stubs, themes, controlled API) — minor scope mismatch between SM-2's FR range and the §-end checklist it references. *Fix:* either widen SM-2 to FR-1..FR-21 (excluding the explicitly-stub FR-19 visual) or note the checklist is broader than SM-2's measured set.

## Shape fit — strong

The shape matches the product. This is a chain-top technical capability spec for a React library, and it is formalized correctly: UJs are present and load-bearing because there *are* distinct human integrators with different jobs (embed; deep-trace debugging; wire-up callbacks), and each UJ drives specific FR clusters — so UJs are not overhead here. SMs are a healthy mix of operational/library metrics (integration time, bundle size, zero-dependency) and user-facing fidelity, which fits a library product. The PRD is neither over-formalized (no gratuitous personas, no UJ density for a single operator) nor under-formalized (it has the UJs and acceptance checklist a downstream chain needs).

The brownfield-adjacent nature (porting existing Grafana/Jaeger code) is handled correctly: existing-code references in the addendum are specific and plausible (file paths under `public/app/features/explore/TraceView/`, line-count estimates, named hooks like `useChildrenState`/`useViewRange`), and the license-provenance distinction (Apache-headed vs. Grafana-original) is exactly the brownfield-accuracy concern the rubric flags. The "how" is correctly quarantined to the addendum so the PRD stays at the capability altitude.

### Findings
*(No findings — dimension is strong.)*

## Mechanical notes

- **Glossary drift:** None material. Terms are used verbatim from §3 across FRs/UJs. Minor: "深耦合功能" (§3) vs. "深耦合按钮/动作" in §4.8/checklist — same concept, acceptable shorthand.
- **ID continuity:** FR-1..FR-23 contiguous, unique, no gaps. UJ-1..UJ-3, SM-1..SM-5 + SM-C1/SM-C2 clean. All SM→FR and feature→UJ cross-references resolve to existing IDs.
- **Assumptions Index roundtrip:** Mostly clean, but the inline `[ASSUMPTION: OTLP 适配 v2 再做…]` in FR-22 is **not** listed in §16. Add it. The SSR assumption (§12) is indexed only via the bundled §12 line — acceptable but terse.
- **UJ protagonist naming:** UJ-1 (周明) and UJ-3 (平台团队 — a team, not a named individual; acceptable for a B2B integration journey) are fine. **UJ-2 protagonist is corrupted** ("李�QA" → should be "李婷") — fix required.
- **Required sections:** All expected sections present for a chain-top technical PRD: Vision, Users/JTBD/Non-users, UJs, Glossary, Features+FRs, Non-Goals, MVP scope, Success Metrics + Counter-metrics, API surface, Versioning, Performance budget, NFRs, Constraints/license, Fidelity, Open Questions, Assumptions Index, Acceptance checklist. The addendum supplies the architect-facing depth. Nothing structurally missing.

## Summary of gating findings

| Severity | Finding | Section |
|---|---|---|
| high | Performance metrics not pass/fail testable | SM-3, §10 |
| high | Visual fidelity ("接近 1:1") has no acceptance procedure | §14, SM-2 |
| medium | UJ-2 protagonist name corrupted ("李�QA") | §2.3 |
| medium | FR-3 color-contrast "既定阈值" undefined | §4.1 |
| low | OTLP assumption (FR-22) missing from §16 index | FR-22 / §16 |
| low | Controlled-API granularity left fully open (no default) | OQ #3 / §8 |
| low | SM-2 FR range vs. checklist scope mismatch | §7 / checklist |

**Gate verdict: PASS-WITH-FIXES.** The PRD is thesis-driven, scope-honest, and downstream-usable; the fixes are bounded and mostly about pinning deferred thresholds and one mechanical name repair. None require rethinking the product.
