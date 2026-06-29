// OTLP/JSON 适配器（Story 8.3；AD-15）——把 OpenTelemetry OTLP trace 导出（protojson 形状）
// 解码成规范 `TraceResponse`，验证 `TraceSourceAdapter` 契约对「嵌套 + 异构 wire 格式」同样成立
// （DataFox 是列式 DataFrame，OTLP 是 resourceSpans 嵌套树 + AnyValue 包裹的属性 + 十六进制 id + 纳秒时间）。
// 单位归一化：startTimeUnixNano/endTimeUnixNano(ns)→µs，在此边界完成。
import type { TraceSourceAdapter } from '../adapter';
import transformTraceData from '../transform-trace-data';
import type { Trace, TraceKeyValuePair, TraceLog, TraceProcess, TraceResponse, TraceSpanData } from '../types';

// ——— OTLP/JSON 形状（OpenTelemetry proto → JSON 映射，节选所需字段）———
interface OtlpAnyValue {
  stringValue?: string;
  boolValue?: boolean;
  intValue?: string | number;
  doubleValue?: number;
  arrayValue?: { values?: OtlpAnyValue[] };
  kvlistValue?: { values?: OtlpKeyValue[] };
}
interface OtlpKeyValue {
  key: string;
  value?: OtlpAnyValue;
}
interface OtlpEvent {
  timeUnixNano?: string | number;
  name?: string;
  attributes?: OtlpKeyValue[];
}
interface OtlpSpan {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  name?: string;
  kind?: string | number;
  startTimeUnixNano?: string | number;
  endTimeUnixNano?: string | number;
  attributes?: OtlpKeyValue[];
  status?: { code?: string | number; message?: string };
  events?: OtlpEvent[];
}
interface OtlpScopeSpans {
  scope?: { name?: string; version?: string };
  spans?: OtlpSpan[];
}
interface OtlpResourceSpans {
  resource?: { attributes?: OtlpKeyValue[] };
  scopeSpans?: OtlpScopeSpans[];
  // proto 旧字段名兼容（instrumentationLibrarySpans）。
  instrumentationLibrarySpans?: OtlpScopeSpans[];
}
export interface OtlpResponse {
  resourceSpans?: OtlpResourceSpans[];
}

// SPAN_KIND 数值（OTLP proto）→ OTel span.kind 文本（与引擎/详情面板口径一致）。
const SPAN_KIND_TEXT: Record<number, string> = {
  0: 'unspecified',
  1: 'internal',
  2: 'server',
  3: 'client',
  4: 'producer',
  5: 'consumer',
};

/** OTLP AnyValue → 原语（用于 tag 值与 service.name 查找）。 */
function anyValue(v: OtlpAnyValue | undefined): TraceKeyValuePair['value'] {
  if (v == null) {
    return '';
  }
  if (v.stringValue != null) {
    return v.stringValue;
  }
  if (v.boolValue != null) {
    return v.boolValue;
  }
  if (v.intValue != null) {
    // OTLP 规范用字符串编码 int64：超安全整数则保留字符串，避免 Number() 精度损坏（CR-F6）。
    const n = Number(v.intValue);
    return Number.isSafeInteger(n) ? n : String(v.intValue);
  }
  if (v.doubleValue != null) {
    return v.doubleValue;
  }
  if (v.arrayValue?.values) {
    return v.arrayValue.values.map((x) => anyValue(x)).join(',');
  }
  if (v.kvlistValue?.values) {
    // 嵌套 map 属性 → JSON 串（CR-F4：原先落到末尾静默变空串）。
    const entries = v.kvlistValue.values
      .filter((kv) => kv && kv.key != null)
      .map((kv) => [kv.key, anyValue(kv.value)] as const);
    return JSON.stringify(Object.fromEntries(entries));
  }
  return '';
}

/** OTLP attributes（KeyValue[]）→ 内部 KV 列表。 */
function attrs(list: OtlpKeyValue[] | undefined): TraceKeyValuePair[] {
  if (!Array.isArray(list)) {
    return [];
  }
  return list
    .filter((kv) => kv && kv.key != null)
    .map((kv) => ({ key: kv.key, value: anyValue(kv.value) }));
}

/** 取属性里某 key 的字符串值（如 service.name）。 */
function attrString(list: OtlpKeyValue[] | undefined, key: string): string | undefined {
  const found = (list ?? []).find((kv) => kv?.key === key);
  if (!found) {
    return undefined;
  }
  const v = anyValue(found.value);
  return v != null && v !== '' ? String(v) : undefined;
}

/** OTLP status.code（0 Unset / 1 Ok / 2 Error，或字符串 STATUS_CODE_*）→ 引擎数值（2=error）。 */
function mapStatus(code: string | number | undefined): number | undefined {
  if (code == null || code === '') {
    return undefined;
  }
  if (typeof code === 'number') {
    return code;
  }
  // 字符串型数字（如 "2"）：先按数值解析，避免误落 Unset（CR-F5）。
  const asNum = Number(code);
  if (code.trim() !== '' && !Number.isNaN(asNum)) {
    return asNum;
  }
  if (/error/i.test(code)) {
    return 2;
  }
  if (/ok/i.test(code)) {
    return 1;
  }
  return 0;
}

/** ns（字符串/数值，可超 2^53）→ µs。用 BigInt 避免 epoch 纳秒精度丢失（CR-F1）。 */
function nsToUs(raw: string | number | undefined): number {
  if (raw == null || raw === '') {
    return 0;
  }
  try {
    const s = typeof raw === 'number' ? Math.trunc(raw).toString() : String(raw).trim();
    return Number(BigInt(s) / 1000n);
  } catch {
    return Math.round(Number(raw) / 1000);
  }
}

/** ns 时段差（end−start，可超 2^53）→ µs，钳到 ≥0。在 ns 域用 BigInt 相减再转 µs（CR-F1）。 */
function nsDiffToUs(start: string | number | undefined, end: string | number | undefined): number {
  try {
    const a = BigInt(typeof start === 'number' ? Math.trunc(start).toString() : String(start ?? '0').trim() || '0');
    const b = BigInt(typeof end === 'number' ? Math.trunc(end).toString() : String(end ?? '0').trim() || '0');
    const d = b - a;
    return d > 0n ? Number(d / 1000n) : 0;
  } catch {
    return Math.max(0, nsToUs(end) - nsToUs(start));
  }
}

function kindText(kind: string | number | undefined): string | undefined {
  if (kind == null || kind === '') {
    return undefined;
  }
  if (typeof kind === 'number') {
    return SPAN_KIND_TEXT[kind] ?? String(kind);
  }
  // 字符串形如 "SPAN_KIND_SERVER" → "server"。
  const m = /SPAN_KIND_(\w+)/.exec(kind);
  return (m ? m[1] : kind).toLowerCase();
}

/**
 * OTLP/JSON 响应 → 规范 `TraceResponse`（AD-15 契约的 `decode`）。
 * 遍历 resourceSpans→scopeSpans→spans；resource.service.name 建 process；
 * parentSpanId→references[CHILD_OF]（孤儿父按 root）；events→logs；status.code/exception 派生 error tag；ns→µs。
 */
export function decodeOtlp(resp: OtlpResponse): TraceResponse | null {
  const resourceSpans = resp?.resourceSpans;
  if (!Array.isArray(resourceSpans) || resourceSpans.length === 0) {
    return null;
  }

  const processes: Record<string, TraceProcess> = {};
  const serviceToProcessId = new Map<string, string>();
  let pCounter = 0;
  const processIdFor = (serviceName: string, resAttrs: TraceKeyValuePair[]): string => {
    let pid = serviceToProcessId.get(serviceName);
    if (!pid) {
      pid = `p${++pCounter}`;
      serviceToProcessId.set(serviceName, pid);
      processes[pid] = { serviceName, tags: resAttrs };
    }
    return pid;
  };

  const spans: TraceSpanData[] = [];
  let traceID = '';

  for (const rs of resourceSpans) {
    const resAttrs = attrs(rs.resource?.attributes);
    const serviceName = attrString(rs.resource?.attributes, 'service.name') ?? 'unknown';
    const processID = processIdFor(serviceName, resAttrs);
    const scopeGroups = rs.scopeSpans ?? rs.instrumentationLibrarySpans ?? [];

    for (const sg of scopeGroups) {
      const scopeName = sg.scope?.name;
      const scopeVersion = sg.scope?.version;
      for (const sp of sg.spans ?? []) {
        const spanID = sp.spanId != null ? String(sp.spanId) : '';
        if (!spanID) {
          continue;
        }
        if (!traceID && sp.traceId != null) {
          traceID = String(sp.traceId);
        }
        const spanTraceID = sp.traceId != null ? String(sp.traceId) : traceID;

        const tags: TraceKeyValuePair[] = attrs(sp.attributes);
        const kind = kindText(sp.kind);
        if (kind) {
          tags.push({ key: 'span.kind', value: kind });
        }

        // 异常派生（CR-F2，对齐 DataFox）：OTLP 异常记录为 span event（name='exception' 或带 exception.* 属性）。
        // 有异常 → 强制 error tag + statusCode 2 + exception.type/message tag，即使 status.code 为 Unset。
        let status = mapStatus(sp.status?.code);
        const exEvent = (sp.events ?? []).find(
          (ev) =>
            ev.name === 'exception' ||
            (ev.attributes ?? []).some((a) => a.key === 'exception.type' || a.key === 'exception.message'),
        );
        if (status === 2 || exEvent) {
          status = 2;
          tags.push({ key: 'error', value: true });
          const exType = exEvent?.attributes?.find((a) => a.key === 'exception.type');
          const exMsg = exEvent?.attributes?.find((a) => a.key === 'exception.message');
          if (exType) {
            tags.push({ key: 'exception.type', value: anyValue(exType.value) });
          }
          if (exMsg) {
            tags.push({ key: 'exception.message', value: anyValue(exMsg.value) });
          }
        }
        const statusMessage = sp.status?.message;

        const parentId = sp.parentSpanId != null ? String(sp.parentSpanId) : '';
        // references 先全建，孤儿父在下方按已知 spanID 集过滤。
        // ns→µs 走 BigInt（CR-F1）：start 转 µs，duration 在 ns 域相减再转，避免大整数精度丢失。
        const startTime = nsToUs(sp.startTimeUnixNano);
        const duration = nsDiffToUs(sp.startTimeUnixNano, sp.endTimeUnixNano);

        const logs: TraceLog[] = (sp.events ?? []).map((ev) => ({
          timestamp: nsToUs(ev.timeUnixNano),
          fields: attrs(ev.attributes),
          name: ev.name != null ? String(ev.name) : undefined,
        }));

        spans.push({
          spanID,
          traceID: spanTraceID,
          processID,
          operationName: sp.name != null ? String(sp.name) : 'span',
          startTime,
          duration,
          logs,
          tags,
          kind,
          statusCode: status,
          statusMessage: statusMessage != null ? String(statusMessage) : undefined,
          instrumentationLibraryName: scopeName != null ? String(scopeName) : undefined,
          instrumentationLibraryVersion: scopeVersion != null ? String(scopeVersion) : undefined,
          references: parentId ? [{ refType: 'CHILD_OF' as const, spanID: parentId, traceID: spanTraceID }] : [],
          flags: 0,
        });
      }
    }
  }

  if (spans.length === 0) {
    return null;
  }

  // 多 trace 混入（CR-F3）：单组件只渲一条 trace。若 payload 含多个 traceId，
  // 只保留首个 traceId 的 span（避免跨 trace 缝合 / spanId 撞车误连父子）；并把 traceID 归一到主值（对齐 DataFox 单一 traceID 口径）。
  const primaryTraceID = traceID || 'unknown-trace';
  const kept = traceID ? spans.filter((s) => s.traceID === traceID) : spans;
  for (const s of kept) {
    s.traceID = primaryTraceID;
    if (s.references) {
      for (const r of s.references) {
        r.traceID = primaryTraceID;
      }
    }
  }

  // 孤儿父按 root：parent 不在结果集 → 去掉 reference。
  const knownSpanIds = new Set(kept.map((s) => s.spanID));
  for (const s of kept) {
    if (s.references && s.references.length && !knownSpanIds.has(s.references[0].spanID)) {
      s.references = [];
    }
  }

  return { traceID: primaryTraceID, processes, spans: kept };
}

/** OTLP/JSON 响应 → 内部派生 `Trace`（= decodeOtlp + transformTraceData）。 */
export function fromOtlp(resp: OtlpResponse): Trace | null {
  const response = decodeOtlp(resp);
  return response ? transformTraceData(response) : null;
}

/** OTLP 数据源适配器（AD-15 契约实例）。供 `adaptTrace(otlpAdapter, resp)` 使用。 */
export const otlpAdapter: TraceSourceAdapter<OtlpResponse> = {
  id: 'otlp',
  decode: decodeOtlp,
};
