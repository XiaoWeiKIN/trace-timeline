import { describe, expect, it } from 'vitest';

import { mockTrace } from '../model';

import { filterSpans } from './filterSpans';

describe('filterSpans', () => {
  it('空查询 → undefined（无过滤）', () => {
    expect(filterSpans('', mockTrace.spans)).toBeUndefined();
    expect(filterSpans('   ', mockTrace.spans)).toBeUndefined();
  });

  it('按服务名匹配（redis）', () => {
    const m = filterSpans('redis', mockTrace.spans)!;
    expect(m.size).toBeGreaterThan(0);
    const redisSpan = mockTrace.spans.find((s) => s.process.serviceName === 'redis')!;
    expect(m.has(redisSpan.spanID)).toBe(true);
  });

  it('按操作名匹配（GET /user）', () => {
    const m = filterSpans('GET /user', mockTrace.spans)!;
    const s = mockTrace.spans.find((sp) => sp.operationName === 'GET /user')!;
    expect(m.has(s.spanID)).toBe(true);
  });

  it('按 tag 值匹配（500 状态码 → GET /error）', () => {
    const m = filterSpans('500', mockTrace.spans)!;
    const errSpan = mockTrace.spans.find((sp) => sp.tags.some((t) => t.value === 500))!;
    expect(m.has(errSpan.spanID)).toBe(true);
  });

  it('大小写不敏感', () => {
    const lower = filterSpans('redis', mockTrace.spans)!;
    const upper = filterSpans('REDIS', mockTrace.spans)!;
    expect([...upper].sort()).toEqual([...lower].sort());
  });

  it('无命中 → 空 Set（非 undefined）', () => {
    const m = filterSpans('zzz-no-such-span', mockTrace.spans)!;
    expect(m).toBeInstanceOf(Set);
    expect(m.size).toBe(0);
  });
});
