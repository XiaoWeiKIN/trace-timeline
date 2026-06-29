// 后端数据源适配器契约（Story 8.1；AD-15 数据源即插件）。
// 唯一接缝：把任意 trace 后端的 wire 格式解码成规范 `TraceResponse`；
// 派生 `Trace`（depth/relativeStartTime/services…）由通用 `adaptTrace` 复用 transformTraceData 统一完成，适配器不碰。
// 核心包后端中立——具体适配器（datafox/otlp/…）走子路径导出，第三方按本契约实现自己的后端。
import transformTraceData from './transform-trace-data';
import type { Trace, TraceResponse } from './types';

/**
 * 后端数据源适配器：把后端原始响应（`Raw`）解码为规范 `TraceResponse`。
 * 仅负责「解码」——单位归一化（→µs）、列式/嵌套→行式、父子 references 建立都在 `decode` 内；
 * 不负责取数（取数归宿主或可选 transport 助手），不负责派生（交 `adaptTrace`）。
 */
export interface TraceSourceAdapter<Raw = unknown> {
  /** 适配器标识，如 `'datafox'` | `'otlp'`。用于诊断/注册，渲染不依赖。 */
  readonly id: string;
  /** 解码：后端原始响应 → 规范 `TraceResponse`；无法解析（空/格式不符）返回 `null`。 */
  decode(raw: Raw): TraceResponse | null;
}

/**
 * 用适配器把后端原始数据转成可渲染的派生 `Trace`：`adapter.decode(raw)` → `transformTraceData`。
 * 宿主拿到 `Trace` 后直接喂 `<TraceTimeline trace={...}/>`。decode 返回 null 时整体返回 null（空态）。
 */
export function adaptTrace<Raw>(adapter: TraceSourceAdapter<Raw>, raw: Raw): Trace | null {
  const response = adapter.decode(raw);
  return response ? transformTraceData(response) : null;
}
