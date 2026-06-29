# Epic 8 代码评审记录（2026-06-29）

BMad code-review：3 个独立 agent（不同上下文）并行对抗式评审 Epic 8（数据源即插件 / AD-15，Story 8.1–8.4）全部新/改代码。trace-timeline 非 git 仓库，按文件列表评审。

- **Blind Hunter**（无 spec/意图，纯代码）· **Edge Case Hunter**（边界穷举 + 读权限）· **Acceptance Auditor**（对 4 story AC + AD-15/8/14 验收，并实跑 build/typecheck/test）。

## 验收结论（Acceptance Auditor）

**通过（Pass）。** 4 story AC 与 AD-15/AD-8/AD-14 **全部满足**，经实跑核验：build 后主 `dist/index.js` 后端专属符号 grep=0、契约 `adaptTrace`=2、子包自洽（含 `fetchTrace`）、typecheck 通过、测试全绿。**依赖方向未破坏**（`core/presentation/state/theme/ui` 零适配器引用，经 grep 验证；`adapter.ts`/`fromOtlp.ts` 零 UI 依赖，model 仍纯）。无 High。

## 总体结论

判定 Epic 8 为**可上线水准**。三层去重后得 0 High + 3 Med + 3 Low（patch）+ 3 dismiss。**所有 patch 已修复并补回归测试**。**225 单测全绿**（219→225，+6），build ESM 主 185.81KB（后端中立）+ datafox 9.53KB + otlp 8.89KB，typecheck 0，浏览器实测 OTLP 源经同一组件渲染（GET /checkout + Charge + Errors 1）。

## Findings 与处置

### 已修复（patch）

- **F1（Med，Blind+Edge 共识）ns→µs 大整数精度丢失。** 真实 OTLP `*UnixNano` 是 epoch 纳秒（~1.7e18 > 2^53），`Number(raw)/1000` 在除法前就量化失真（~256ns），`duration=end−start` 在 µs 域相减误差叠加。**修复**：`nsToUs` 用 `BigInt(s)/1000n`；新增 `nsDiffToUs` 在 ns 域 BigInt 相减再转 µs（钳 ≥0）。回归：CR-F1（1.7e18ns start + 30µs dur 精确）。
- **F2（Med，Blind+Edge 共识）OTLP exception 事件未派生 error，与 DataFox 口径不一致（且注释撒谎）。** OTLP 异常记录为 span event（`name='exception'` + `exception.*` 属性），原实现只看 `status.code===2`，漏掉「仅 exception event、status Unset」的错误 span。**修复**：检测 exception event → 强制 `error` tag + `statusCode=2` + `exception.type/message` tag（对齐 `fromDataFox`）。回归：CR-F2。
- **F3（Med，Edge）多 traceId 混入静默缝合成伪 trace。** 一个 OTLP payload 含多条 trace 时，全部 span 被混挂在首个 traceID 下建父子，且全局 `knownSpanIds` 孤儿过滤会跨 trace 撞 spanId 误连。**修复**：单组件只渲一条 trace——只保留首个 traceId 的 span，并把 traceID/reference 归一到主值（对齐 DataFox 单一 traceID 口径）。回归：CR-F3。
- **F4（Low，Blind+Edge 共识）`kvlistValue` 嵌套属性丢成空串。** `anyValue` 无 kvlist 分支 → 落末尾 `''`。**修复**：加分支 → JSON 串。回归：CR-F4。
- **F5（Low，Blind）字符串型数字 status `"2"` 误判 Unset。** `mapStatus` 对非 number 直接走正则，`"2"` 既不匹配 error/ok → 落 0。**修复**：先按数值解析。回归：CR-F5。
- **F6（Low，Edge）int64 属性超安全整数被 `Number()` 损坏。** **修复**：`anyValue` 的 intValue 超 `Number.MAX_SAFE_INTEGER` 保留字符串。回归：CR-F6。

### 已驳回（dismiss，3 条）

- **start=0 被 transformTraceData 过滤**：引擎既有口径（`filter(Boolean(startTime))`），DataFox 路径同源；真实 OTLP 绝对 epoch ns 永不为 0，仅缺字段/合成数据触发，非 Epic 8 引入。
- **同名 service 跨 resourceSpan 的 resource 属性合并丢发散值**：与 DataFox `processIdFor` 行为一致，按 service 聚合 process 属可接受设计取舍。
- **未知 status 数值（如 99）不夹到 0/1/2**：引擎 `isErrorSpan` 只认 `===2`，透传无害。

## 残留（非阻塞）

dismiss 项不跟进；无 defer。

## 教训

- **跨适配器口径一致性**是多后端的隐性验收点：F2（exception 派生）若不修，DataFox 与 OTLP 对「同一异常 span」给出不同标红结果——契约统一了「形状」，但「语义派生口径」要逐适配器对齐参考实现。
- **大整数（int64/epoch ns）是 wire 格式适配器的通用陷阱**：JSON 里 int64 编码为字符串正是为保精度，适配器无脑 `Number()` 会静默损坏（时间 + ID 双重）。BigInt 是默认正解。
- 三层对抗式：Blind+Edge 对 F1/F2 独立共识（高置信），Auditor 实跑 build/test 验证「后端中立」非纸面声明——分工有效。
