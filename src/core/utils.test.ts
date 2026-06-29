import { describe, expect, it } from 'vitest';

import type { TraceSpan } from '../model';

import {
  createViewedBoundsFunc,
  findServerChildSpan,
  getHttpStatusCode,
  isErrorSpan,
  isKindClient,
  spanContainsErredSpan,
} from './utils';

type Tag = { key: string; value: unknown };
function mk(p: Partial<TraceSpan> & { spanID: string; depth: number }): TraceSpan {
  return {
    traceID: 't',
    processID: 'p',
    operationName: p.spanID,
    startTime: 0,
    duration: 1,
    logs: [],
    flags: 0,
    references: [],
    tags: [],
    hasChildren: false,
    childSpanCount: 0,
    childSpanIds: [],
    process: { serviceName: 's', tags: [] },
    relativeStartTime: 0,
    warnings: [],
    subsidiarilyReferencedBy: [],
    ...p,
  } as TraceSpan;
}

describe('createViewedBoundsFunc', () => {
  it('无缩放时映射到 [0,1]', () => {
    const fn = createViewedBoundsFunc({ min: 100, max: 200, viewStart: 0, viewEnd: 1 });
    expect(fn(100, 200)).toEqual({ start: 0, end: 1 });
    expect(fn(150, 150)).toEqual({ start: 0.5, end: 0.5 });
  });

  it('缩放后子区间相对新窗口投影', () => {
    // 窗口收窄到 [0.25,0.75] → viewMin=125, viewMax=175, window=50
    const fn = createViewedBoundsFunc({ min: 100, max: 200, viewStart: 0.25, viewEnd: 0.75 });
    expect(fn(125, 175)).toEqual({ start: 0, end: 1 });
    expect(fn(150, 150)).toEqual({ start: 0.5, end: 0.5 });
  });
});

describe('isErrorSpan', () => {
  it('OTel statusCode===2 判错', () => {
    expect(isErrorSpan(mk({ spanID: 'a', depth: 0, statusCode: 2 }))).toBe(true);
  });
  it('error=true / "true" tag 判错', () => {
    expect(isErrorSpan(mk({ spanID: 'a', depth: 0, tags: [{ key: 'error', value: true } as Tag] }))).toBe(true);
    expect(isErrorSpan(mk({ spanID: 'b', depth: 0, tags: [{ key: 'error', value: 'true' } as Tag] }))).toBe(true);
  });
  it('正常 span 不判错', () => {
    expect(isErrorSpan(mk({ spanID: 'a', depth: 0 }))).toBe(false);
  });
});

describe('spanContainsErredSpan', () => {
  it('后代含错返回 true，否则 false', () => {
    const spans = [
      mk({ spanID: 'root', depth: 0 }),
      mk({ spanID: 'child', depth: 1, statusCode: 2 }),
      mk({ spanID: 'sibling', depth: 0 }),
    ];
    expect(spanContainsErredSpan(spans, 0)).toBe(true);
    expect(spanContainsErredSpan(spans, 2)).toBe(false);
  });
});

describe('findServerChildSpan', () => {
  it('client 父 + server 直接子 → 返回 server 子', () => {
    const client = mk({ spanID: 'c', depth: 0, kind: 'client' });
    const server = mk({ spanID: 's', depth: 1, kind: 'server' });
    expect(findServerChildSpan([client, server])).toBe(server);
  });
  it('父非 client → false', () => {
    const a = mk({ spanID: 'a', depth: 0 });
    const b = mk({ spanID: 'b', depth: 1, kind: 'server' });
    expect(findServerChildSpan([a, b])).toBe(false);
  });
});

describe('isKindClient', () => {
  it('kind=client 或 span.kind tag=client', () => {
    expect(isKindClient(mk({ spanID: 'a', depth: 0, kind: 'client' }))).toBe(true);
    expect(
      isKindClient(mk({ spanID: 'b', depth: 0, tags: [{ key: 'span.kind', value: 'client' } as Tag] }))
    ).toBe(true);
    expect(isKindClient(mk({ spanID: 'c', depth: 0 }))).toBe(false);
  });
});

describe('getHttpStatusCode', () => {
  it('提取 http.status_code（旧）与 http.response.status_code（新）', () => {
    expect(getHttpStatusCode(mk({ spanID: 'a', depth: 0, tags: [{ key: 'http.status_code', value: 500 } as Tag] }))).toBe(500);
    expect(
      getHttpStatusCode(mk({ spanID: 'b', depth: 0, tags: [{ key: 'http.response.status_code', value: '200' } as Tag] }))
    ).toBe(200);
  });
  it('无状态码 tag 返回 undefined', () => {
    expect(getHttpStatusCode(mk({ spanID: 'a', depth: 0 }))).toBeUndefined();
  });
});
