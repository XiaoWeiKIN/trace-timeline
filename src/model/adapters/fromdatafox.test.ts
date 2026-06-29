import { describe, expect, it } from 'vitest';

import { dataFoxFixture } from './datafox-fixture';
import { fromDataFox, type DataFoxResponse } from './fromDataFox';

describe('fromDataFox', () => {
  it('列式 DataFrame → 内部 Trace（3 span）', () => {
    const trace = fromDataFox(dataFoxFixture)!;
    expect(trace).not.toBeNull();
    expect(trace.spans).toHaveLength(3);
    expect(trace.traceID).toBe('aabbccddeeff00112233445566778899');
  });

  it('parent_span_id → CHILD_OF references；建立父子 depth', () => {
    const trace = fromDataFox(dataFoxFixture)!;
    const root = trace.spans.find((s) => s.spanID === 'sp-root')!;
    const order = trace.spans.find((s) => s.spanID === 'sp-order')!;
    expect(root.depth).toBe(0);
    expect(root.references).toHaveLength(0); // 根无 parent
    expect(order.depth).toBe(1);
    expect(order.references[0]).toMatchObject({ refType: 'CHILD_OF', spanID: 'sp-root' });
  });

  it('时间单位归一化：ms→µs、ns→µs', () => {
    const trace = fromDataFox(dataFoxFixture)!;
    const root = trace.spans.find((s) => s.spanID === 'sp-root')!;
    // 102ms in ns → 102_000 µs
    expect(root.duration).toBe(102_000);
    // root.startTime 是相对 trace 起点（transform 后 relativeStartTime=0）
    expect(root.relativeStartTime).toBe(0);
  });

  it('attrs_raw JSON → tags/process.tags', () => {
    const trace = fromDataFox(dataFoxFixture)!;
    const root = trace.spans.find((s) => s.spanID === 'sp-root')!;
    expect(root.tags.some((t) => t.key === 'http.method' && t.value === 'GET')).toBe(true);
    expect(root.process.serviceName).toBe('mall-order-api');
    expect(root.process.tags.some((t) => t.key === 'telemetry.sdk.language')).toBe(true);
  });

  it('status_code Error / exception → statusCode 2（错误）', () => {
    const trace = fromDataFox(dataFoxFixture)!;
    const err = trace.spans.find((s) => s.spanID === 'sp-err')!;
    expect(err.statusCode).toBe(2);
    expect(err.tags.some((t) => t.key === 'error' && t.value === true)).toBe(true);
    expect(err.tags.some((t) => t.key === 'exception.type')).toBe(true);
  });

  it('events → logs', () => {
    const trace = fromDataFox(dataFoxFixture)!;
    const order = trace.spans.find((s) => s.spanID === 'sp-order')!;
    expect(order.logs.length).toBe(1);
    expect(order.logs[0].name).toBe('rpc.start');
    expect(order.logs[0].fields.some((f) => f.key === 'rpc')).toBe(true);
  });

  it('孤儿父按 root：parent 不在结果集 → 无 reference', () => {
    const orphan: DataFoxResponse = {
      data: {
        A: {
          frames: [
            {
              schema: { fields: [{ name: 'trace_id' }, { name: 'span_id' }, { name: 'parent_span_id' }, { name: 'timestamp' }, { name: 'duration' }, { name: 'service_name' }, { name: 'operation_name' }] },
              data: { values: [['t'], ['sp1'], ['missing-parent'], [1_700_000_000_000], [1_000_000], ['svc'], ['op']] },
            },
          ],
        },
      },
    };
    const trace = fromDataFox(orphan)!;
    expect(trace.spans).toHaveLength(1);
    expect(trace.spans[0].references).toHaveLength(0); // 孤儿父 → root
    expect(trace.spans[0].depth).toBe(0);
  });

  it('空/坏响应 → null', () => {
    expect(fromDataFox({})).toBeNull();
    expect(fromDataFox({ data: { A: { frames: [] } } })).toBeNull();
  });
});
