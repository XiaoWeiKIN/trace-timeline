import { describe, expect, it } from 'vitest';

import { decodeOtlp, fromOtlp, otlpAdapter, type OtlpResponse } from './fromOtlp';
import { otlpFixture } from './otlp-fixture';

describe('decodeOtlp（OTLP/JSON → TraceResponse）', () => {
  it('遍历 resourceSpans/scopeSpans/spans，按 service.name 建 process', () => {
    const resp = decodeOtlp(otlpFixture)!;
    expect(resp).not.toBeNull();
    expect(resp.traceID).toBe('trace-abc');
    expect(resp.spans).toHaveLength(2);
    const services = Object.values(resp.processes).map((p) => p.serviceName).sort();
    expect(services).toEqual(['frontend', 'payment']);
  });

  it('ns → µs 归一化（start/duration）', () => {
    const resp = decodeOtlp(otlpFixture)!;
    const root = resp.spans.find((s) => s.spanID === 'span-root')!;
    expect(root.startTime).toBe(1000); // 1_000_000_000ns / 1000
    expect(root.duration).toBe(50); // (1.05ms - 1ms) → 50µs
    const pay = resp.spans.find((s) => s.spanID === 'span-pay')!;
    expect(pay.startTime).toBe(1010);
    expect(pay.duration).toBe(30);
  });

  it('parentSpanId → references[CHILD_OF]', () => {
    const resp = decodeOtlp(otlpFixture)!;
    const pay = resp.spans.find((s) => s.spanID === 'span-pay')!;
    expect(pay.references).toEqual([{ refType: 'CHILD_OF', spanID: 'span-root', traceID: 'trace-abc' }]);
    const root = resp.spans.find((s) => s.spanID === 'span-root')!;
    expect(root.references).toEqual([]); // 无父
  });

  it('status ERROR（字符串或数值）→ statusCode 2 + error tag；kind 数值→文本', () => {
    const resp = decodeOtlp(otlpFixture)!;
    const pay = resp.spans.find((s) => s.spanID === 'span-pay')!;
    expect(pay.statusCode).toBe(2);
    expect(pay.statusMessage).toBe('card declined');
    expect(pay.tags?.find((t) => t.key === 'error')?.value).toBe(true);
    expect(pay.tags?.find((t) => t.key === 'span.kind')?.value).toBe('client');
    const root = resp.spans.find((s) => s.spanID === 'span-root')!;
    expect(root.tags?.find((t) => t.key === 'span.kind')?.value).toBe('server');
  });

  it('AnyValue 解包：string/int/bool；events → logs（ns→µs）', () => {
    const resp = decodeOtlp(otlpFixture)!;
    const root = resp.spans.find((s) => s.spanID === 'span-root')!;
    expect(root.tags?.find((t) => t.key === 'http.method')?.value).toBe('GET');
    expect(root.tags?.find((t) => t.key === 'http.status_code')?.value).toBe(200); // intValue → number
    expect(root.logs).toHaveLength(1);
    expect(root.logs[0]).toMatchObject({ timestamp: 1010, name: 'cache.miss' });
    expect(root.logs[0].fields.find((f) => f.key === 'cache.key')?.value).toBe('cart:42');
  });

  it('孤儿父按 root：parent 不在结果集 → 去掉 reference', () => {
    const orphan: OtlpResponse = {
      resourceSpans: [
        {
          resource: { attributes: [{ key: 'service.name', value: { stringValue: 'svc' } }] },
          scopeSpans: [
            {
              spans: [
                {
                  traceId: 't1',
                  spanId: 'child',
                  parentSpanId: 'missing-parent',
                  name: 'op',
                  startTimeUnixNano: '1000',
                  endTimeUnixNano: '2000',
                },
              ],
            },
          ],
        },
      ],
    };
    const resp = decodeOtlp(orphan)!;
    expect(resp.spans[0].references).toEqual([]);
  });

  it('空/非法输入 → null', () => {
    expect(decodeOtlp({} as OtlpResponse)).toBeNull();
    expect(decodeOtlp({ resourceSpans: [] })).toBeNull();
    expect(decodeOtlp({ resourceSpans: [{ scopeSpans: [{ spans: [] }] }] })).toBeNull();
  });

  it('fromOtlp = decode + 派生：产出可渲染 Trace（depth/services）', () => {
    const trace = fromOtlp(otlpFixture)!;
    expect(trace.traceID).toBe('trace-abc');
    expect(trace.spans).toHaveLength(2);
    expect(trace.services.map((s) => s.name).sort()).toEqual(['frontend', 'payment']);
    const root = trace.spans.find((s) => s.spanID === 'span-root')!;
    const pay = trace.spans.find((s) => s.spanID === 'span-pay')!;
    expect(root.depth).toBe(0);
    expect(pay.depth).toBe(1);
    expect(trace.startTime).toBe(1000);
    expect(trace.duration).toBe(50);
  });

  it('otlpAdapter 实现 TraceSourceAdapter 契约', () => {
    expect(otlpAdapter.id).toBe('otlp');
    expect(otlpAdapter.decode(otlpFixture)).not.toBeNull();
  });
});

describe('decodeOtlp CR 修复', () => {
  // 单 span 包成最小 OTLP 响应。
  const wrap = (sp: Record<string, unknown>): OtlpResponse => ({
    resourceSpans: [
      {
        resource: { attributes: [{ key: 'service.name', value: { stringValue: 'svc' } }] },
        scopeSpans: [{ spans: [sp as never] }],
      },
    ],
  });

  it('CR-F1：真实 epoch 纳秒（>2^53）BigInt 精度——duration 精确', () => {
    // start=1_700_000_000_000_000_500ns, end=+30000ns(=30µs)；Number() 路径会量化失真，BigInt 精确。
    const resp = decodeOtlp(
      wrap({
        traceId: 't',
        spanId: 's',
        name: 'op',
        startTimeUnixNano: '1700000000000000500',
        endTimeUnixNano: '1700000000000030500',
      }),
    )!;
    expect(resp.spans[0].duration).toBe(30); // 30000ns / 1000
    // start µs = floor(1700000000000000500 / 1000) = 1700000000000000
    expect(resp.spans[0].startTime).toBe(1700000000000000);
  });

  it('CR-F2：exception event（status Unset）→ error tag + statusCode 2 + exception.* tag', () => {
    const resp = decodeOtlp(
      wrap({
        traceId: 't',
        spanId: 's',
        name: 'op',
        startTimeUnixNano: '1000000',
        endTimeUnixNano: '1010000',
        // 无 status.code（Unset），仅靠 exception event
        events: [
          {
            timeUnixNano: '1005000',
            name: 'exception',
            attributes: [
              { key: 'exception.type', value: { stringValue: 'IOError' } },
              { key: 'exception.message', value: { stringValue: 'boom' } },
            ],
          },
        ],
      }),
    )!;
    const s = resp.spans[0];
    expect(s.statusCode).toBe(2);
    expect(s.tags?.find((t) => t.key === 'error')?.value).toBe(true);
    expect(s.tags?.find((t) => t.key === 'exception.type')?.value).toBe('IOError');
    expect(s.tags?.find((t) => t.key === 'exception.message')?.value).toBe('boom');
  });

  it('CR-F3：多 traceId 混入 → 只保留主 trace，不跨 trace 缝合', () => {
    const resp = decodeOtlp({
      resourceSpans: [
        {
          resource: { attributes: [{ key: 'service.name', value: { stringValue: 'a' } }] },
          scopeSpans: [
            {
              spans: [
                { traceId: 'T1', spanId: 'a1', name: 'r1', startTimeUnixNano: '1000000', endTimeUnixNano: '1010000' },
                { traceId: 'T2', spanId: 'b1', name: 'r2', startTimeUnixNano: '2000000', endTimeUnixNano: '2010000' },
              ],
            },
          ],
        },
      ],
    })!;
    expect(resp.traceID).toBe('T1');
    expect(resp.spans).toHaveLength(1);
    expect(resp.spans[0].spanID).toBe('a1');
    expect(resp.spans[0].traceID).toBe('T1');
  });

  it('CR-F4：kvlistValue 嵌套属性 → JSON 串（不再丢成空串）', () => {
    const resp = decodeOtlp(
      wrap({
        traceId: 't',
        spanId: 's',
        name: 'op',
        startTimeUnixNano: '1000000',
        endTimeUnixNano: '1010000',
        attributes: [
          { key: 'http', value: { kvlistValue: { values: [{ key: 'method', value: { stringValue: 'GET' } }] } } },
        ],
      }),
    )!;
    expect(resp.spans[0].tags?.find((t) => t.key === 'http')?.value).toBe('{"method":"GET"}');
  });

  it('CR-F5：字符串型数字 status "2" → statusCode 2（不再误判 Unset）', () => {
    const resp = decodeOtlp(
      wrap({
        traceId: 't',
        spanId: 's',
        name: 'op',
        startTimeUnixNano: '1000000',
        endTimeUnixNano: '1010000',
        status: { code: '2' },
      }),
    )!;
    expect(resp.spans[0].statusCode).toBe(2);
    expect(resp.spans[0].tags?.find((t) => t.key === 'error')?.value).toBe(true);
  });

  it('CR-F6：int64 属性超安全整数 → 保留字符串（不损坏精度）', () => {
    const big = '9223372036854775807';
    const resp = decodeOtlp(
      wrap({
        traceId: 't',
        spanId: 's',
        name: 'op',
        startTimeUnixNano: '1000000',
        endTimeUnixNano: '1010000',
        attributes: [{ key: 'big.id', value: { intValue: big } }],
      }),
    )!;
    expect(resp.spans[0].tags?.find((t) => t.key === 'big.id')?.value).toBe(big);
  });
});
