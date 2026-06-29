import { describe, expect, it } from 'vitest';

import { mockTrace, type Trace } from '../model';

import { computeLegendGroups, dimensionKeyFor } from './legendGroups';

// 手搓最小 trace 验 self-time 精度：父 [0,100] 含一子 [10,50]（dur 40），父=A 子=B。
// 期望 self：A=100−40=60，B=40 → execTimeRatio A=0.6 / B=0.4。
function tinyTrace(): Trace {
  const mk = (spanID: string, svc: string, startTime: number, duration: number, depth: number, childSpanIds: string[]) => ({
    spanID,
    startTime,
    duration,
    depth,
    childSpanIds,
    process: { serviceName: svc, tags: [] },
  });
  return {
    spans: [mk('a', 'svc-A', 0, 100, 0, ['b']), mk('b', 'svc-B', 10, 40, 1, [])],
    startTime: 0,
    duration: 100,
  } as unknown as Trace;
}

describe('computeLegendGroups', () => {
  it('mockTrace：按 service 分 4 组，spanCount 合计 = 总 span 数', () => {
    const g = computeLegendGroups(mockTrace);
    expect(g.length).toBe(4);
    expect(g.reduce((n, x) => n + x.spanCount, 0)).toBe(mockTrace.spans.length);
    expect(g.map((x) => x.key).sort()).toEqual(['mall-order-api', 'mysql', 'redis', 'user-service']);
  });

  it('execTimeRatio 合计 ≈ 1', () => {
    const g = computeLegendGroups(mockTrace);
    const sum = g.reduce((n, x) => n + x.execTimeRatio, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('默认按 execTime 降序', () => {
    const g = computeLegendGroups(mockTrace);
    for (let i = 1; i < g.length; i++) {
      expect(g[i - 1].execTime).toBeGreaterThanOrEqual(g[i].execTime);
    }
  });

  it("metric='spans' 按计数降序，top = mall-order-api(5)", () => {
    const g = computeLegendGroups(mockTrace, { metric: 'spans' });
    expect(g[0].key).toBe('mall-order-api');
    expect(g[0].spanCount).toBe(5);
    for (let i = 1; i < g.length; i++) {
      expect(g[i - 1].spanCount).toBeGreaterThanOrEqual(g[i].spanCount);
    }
    // spans 指标下 ratio = 计数占比
    expect(g[0].ratio).toBeCloseTo(5 / mockTrace.spans.length, 5);
  });

  it('self-time：父扣除子覆盖区间 → A=0.6 / B=0.4', () => {
    const g = computeLegendGroups(tinyTrace());
    const a = g.find((x) => x.key === 'svc-A')!;
    const b = g.find((x) => x.key === 'svc-B')!;
    expect(a.execTime).toBe(60);
    expect(b.execTime).toBe(40);
    expect(a.execTimeRatio).toBeCloseTo(0.6, 5);
    expect(b.execTimeRatio).toBeCloseTo(0.4, 5);
  });

  it("dimension='entity'：带 db.system/peer.service 的下游标 (inferred)（Story 7.3）", () => {
    const redis = mockTrace.spans.find((s) => s.process.serviceName === 'redis')!;
    expect(dimensionKeyFor(redis, 'entity')).toBe('redis (inferred)');
    // 真实服务（无 db/peer 标签的 server span）不带 inferred
    const api = mockTrace.spans.find((s) => s.process.serviceName === 'mall-order-api')!;
    expect(dimensionKeyFor(api, 'entity')).toBe('mall-order-api');
    const g = computeLegendGroups(mockTrace, { dimension: 'entity' });
    expect(g.some((x) => /\(inferred\)$/.test(x.key))).toBe(true);
  });

  it("dimension='host'：用 host 标签，缺失回退 'unknown host'", () => {
    // s1 含 http.host=localhost
    const s1 = mockTrace.spans.find((s) => s.spanID === 's1')!;
    expect(dimensionKeyFor(s1, 'host')).toBe('localhost');
    const g = computeLegendGroups(mockTrace, { dimension: 'host' });
    expect(g.length).toBeGreaterThanOrEqual(1);
    expect(g.reduce((n, x) => n + x.spanCount, 0)).toBe(mockTrace.spans.length);
  });
});
