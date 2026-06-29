import { describe, expect, it } from 'vitest';

import { mockTrace } from './mock-trace';
import transformTraceData from './transform-trace-data';
import type { TraceResponse, TraceSpanData } from './types';

const TID = 'trace-test-0001';

function mkSpan(
  p: Partial<TraceSpanData> & Pick<TraceSpanData, 'spanID' | 'operationName' | 'startTime' | 'duration'>
): TraceSpanData {
  return { traceID: TID, processID: 'p1', logs: [], tags: [], flags: 0, references: [], ...p };
}

function resp(spans: TraceSpanData[]): TraceResponse {
  return { traceID: TID, processes: { p1: { serviceName: 'svc', tags: [] } }, spans };
}

describe('transformTraceData', () => {
  it('无数据/无 traceID 返回 null', () => {
    expect(transformTraceData(undefined)).toBeNull();
    // @ts-expect-error 测试缺 traceID
    expect(transformTraceData({ spans: [], processes: {} })).toBeNull();
  });

  it('派生 depth / childSpanIds（按结束时间降序）/ relativeStartTime', () => {
    const t = transformTraceData(
      resp([
        mkSpan({ spanID: 'r', operationName: 'root', startTime: 100, duration: 100 }),
        mkSpan({
          spanID: 'c1',
          operationName: 'c1',
          startTime: 110,
          duration: 50, // end 160
          references: [{ refType: 'CHILD_OF', spanID: 'r', traceID: TID }],
        }),
        mkSpan({
          spanID: 'c2',
          operationName: 'c2',
          startTime: 120,
          duration: 70, // end 190
          references: [{ refType: 'CHILD_OF', spanID: 'r', traceID: TID }],
        }),
      ])
    )!;
    const byId = Object.fromEntries(t.spans.map((s) => [s.spanID, s]));
    expect(byId.r.depth).toBe(0);
    expect(byId.c1.depth).toBe(1);
    expect(byId.r.hasChildren).toBe(true);
    expect(byId.r.childSpanCount).toBe(2);
    // 按结束时间降序：c2(190) 在 c1(160) 前
    expect(byId.r.childSpanIds).toEqual(['c2', 'c1']);
    expect(byId.c1.relativeStartTime).toBe(10);
    expect(t.startTime).toBe(100);
    expect(t.endTime).toBe(200); // root r 在 100+100=200 结束
    expect(t.duration).toBe(100);
  });

  it('多个顶层 span 挂在虚拟 root 下（depth 0）', () => {
    const t = transformTraceData(
      resp([
        mkSpan({ spanID: 'a', operationName: 'a', startTime: 10, duration: 5 }),
        mkSpan({ spanID: 'b', operationName: 'b', startTime: 20, duration: 5 }),
      ])
    )!;
    expect(t.spans).toHaveLength(2);
    expect(t.spans.every((s) => s.depth === 0)).toBe(true);
  });

  it('tags 去重并排序', () => {
    const t = transformTraceData(
      resp([
        mkSpan({
          spanID: 's',
          operationName: 's',
          startTime: 1,
          duration: 1,
          tags: [
            { key: 'x', value: 1 },
            { key: 'a', value: 2 },
            { key: 'x', value: 1 },
          ],
        }),
      ])
    )!;
    const s = t.spans[0];
    expect(s.tags.map((kv) => kv.key)).toEqual(['a', 'x']); // 去重 + 字母序
  });
});

describe('mockTrace', () => {
  it('多服务派生正确', () => {
    expect(mockTrace).toBeTruthy();
    expect(mockTrace.spans).toHaveLength(9);
    expect(mockTrace.services.map((s) => s.name).sort()).toEqual(
      ['mall-order-api', 'mysql', 'redis', 'user-service'].sort()
    );
    expect(mockTrace.traceName).toContain('mall-order-api');
    // 根 span depth 0
    expect(mockTrace.spans[0].depth).toBe(0);
  });
});
