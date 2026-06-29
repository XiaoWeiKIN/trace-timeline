// 子路径导出入口（Story 8.3；AD-15）：`@datafox/trace-timeline/adapters/otlp`。
// OpenTelemetry OTLP/JSON trace 导出 → 内部 Trace。证明 TraceSourceAdapter 契约对异构后端有效。
export {
  fromOtlp,
  decodeOtlp,
  otlpAdapter,
  type OtlpResponse,
} from '../../model/adapters/fromOtlp';
export { otlpFixture } from '../../model/adapters/otlp-fixture';
