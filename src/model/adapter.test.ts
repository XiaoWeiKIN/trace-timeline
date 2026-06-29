// 适配器契约测试（Story 8.1；AD-15）——验证 `TraceSourceAdapter` + `adaptTrace`
// 对两个异构后端（DataFox 列式 / OTLP 嵌套）一致工作，且 decode 只产 TraceResponse（不派生）。
import { describe, expect, it } from 'vitest';

import { datafoxAdapter, decodeDataFox, fromDataFox } from './adapters/fromDataFox';
import { dataFoxFixture } from './adapters/datafox-fixture';
import { otlpAdapter } from './adapters/fromOtlp';
import { otlpFixture } from './adapters/otlp-fixture';
import { adaptTrace, type TraceSourceAdapter } from './adapter';

describe('TraceSourceAdapter 契约 + adaptTrace', () => {
  it('decode 只产规范 TraceResponse（无 depth/services 派生字段）', () => {
    const resp = decodeDataFox(dataFoxFixture)!;
    expect(resp).toHaveProperty('spans');
    expect(resp).toHaveProperty('processes');
    expect(resp).toHaveProperty('traceID');
    // TraceResponse 的 span 是未派生的：没有 depth。
    expect(resp.spans[0]).not.toHaveProperty('depth');
    expect(resp).not.toHaveProperty('services');
  });

  it('datafoxAdapter.decode === decodeDataFox，id=datafox', () => {
    expect(datafoxAdapter.id).toBe('datafox');
    expect(datafoxAdapter.decode).toBe(decodeDataFox);
  });

  it('adaptTrace(datafoxAdapter, raw) 等价于 fromDataFox（向后兼容）', () => {
    const viaAdapter = adaptTrace(datafoxAdapter, dataFoxFixture);
    const viaLegacy = fromDataFox(dataFoxFixture);
    expect(viaAdapter).toEqual(viaLegacy);
    expect(viaAdapter?.spans.length).toBeGreaterThan(0);
  });

  it('同一 adaptTrace 函数驱动异构后端（DataFox 与 OTLP）产出派生 Trace', () => {
    const fromFox = adaptTrace(datafoxAdapter, dataFoxFixture)!;
    const fromOtlpTrace = adaptTrace(otlpAdapter, otlpFixture)!;
    // 两者都被归一成统一 Trace 形状（有 services + 派生 depth）。
    expect(fromFox.services.length).toBeGreaterThan(0);
    expect(fromOtlpTrace.services.length).toBe(2);
    expect(fromOtlpTrace.spans.every((s) => typeof s.depth === 'number')).toBe(true);
  });

  it('decode 返回 null → adaptTrace 返回 null（空态）', () => {
    const emptyAdapter: TraceSourceAdapter<unknown> = { id: 'empty', decode: () => null };
    expect(adaptTrace(emptyAdapter, {})).toBeNull();
  });

  it('第三方可实现契约：自定义内联适配器经 adaptTrace 渲染', () => {
    const inlineAdapter: TraceSourceAdapter<{ id: string }> = {
      id: 'inline',
      decode: (raw) => ({
        traceID: raw.id,
        processes: { p1: { serviceName: 'demo', tags: [] } },
        spans: [
          {
            spanID: 's1',
            traceID: raw.id,
            processID: 'p1',
            operationName: 'root',
            // 非 0 起点：transformTraceData 会过滤 startTime===0 的 span（移植口径）。
            startTime: 1000,
            duration: 100,
            logs: [],
            tags: [],
            references: [],
            flags: 0,
          },
        ],
      }),
    };
    const trace = adaptTrace(inlineAdapter, { id: 'custom-trace' })!;
    expect(trace.traceID).toBe('custom-trace');
    expect(trace.spans[0].depth).toBe(0);
    expect(trace.services[0].name).toBe('demo');
  });
});
