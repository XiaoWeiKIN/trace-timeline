import { describe, expect, it } from 'vitest';

import type { TraceSpan } from '../model';

import { buildAttributeGroups } from './attributeGroups';

function spanWith(tags: Array<{ key: string; value: unknown }>): TraceSpan {
  return {
    spanID: 's',
    traceID: 't',
    operationName: 'op',
    startTime: 0,
    duration: 1,
    tags: tags as TraceSpan['tags'],
    logs: [],
    references: [],
    process: { serviceName: 'svc', tags: [] },
  } as unknown as TraceSpan;
}

describe('buildAttributeGroups', () => {
  it('http.* 归入 HTTP Requests 并用友好标签', () => {
    const groups = buildAttributeGroups(
      spanWith([
        { key: 'http.method', value: 'GET' },
        { key: 'http.status_code', value: 200 },
        { key: 'http.url', value: 'http://x/y' },
      ])
    );
    const http = groups.find((g) => g.title === 'HTTP Requests')!;
    expect(http).toBeTruthy();
    const labels = http.rows.map((r) => r.label);
    expect(labels).toContain('Method');
    expect(labels).toContain('Status Code');
    expect(labels).toContain('URL');
    // Status Code 标记 status kind；URL 标记 link kind
    expect(http.rows.find((r) => r.label === 'Status Code')!.kind).toBe('status');
    expect(http.rows.find((r) => r.label === 'URL')!.kind).toBe('link');
  });

  it('url.* 归入 URL Details；db.* 归入 Database', () => {
    const groups = buildAttributeGroups(
      spanWith([
        { key: 'url.path', value: '/y' },
        { key: 'db.system', value: 'mysql' },
      ])
    );
    expect(groups.find((g) => g.title === 'URL Details')).toBeTruthy();
    expect(groups.find((g) => g.title === 'Database')).toBeTruthy();
  });

  it('未命中 key 落 Span Attributes catch-all（原样 key），且排末尾', () => {
    const groups = buildAttributeGroups(
      spanWith([
        { key: 'http.method', value: 'GET' },
        { key: 'custom.flag', value: 'x' },
      ])
    );
    const last = groups[groups.length - 1];
    expect(last.title).toBe('Span Attributes');
    expect(last.rows.map((r) => r.label)).toContain('custom.flag');
  });

  it('组顺序：HTTP Requests 在 Span Attributes 之前', () => {
    const groups = buildAttributeGroups(
      spanWith([
        { key: 'custom.a', value: 1 },
        { key: 'http.method', value: 'GET' },
      ])
    );
    const titles = groups.map((g) => g.title);
    expect(titles.indexOf('HTTP Requests')).toBeLessThan(titles.indexOf('Span Attributes'));
  });

  it('无 tags → 空数组', () => {
    expect(buildAttributeGroups(spanWith([]))).toEqual([]);
  });
});
