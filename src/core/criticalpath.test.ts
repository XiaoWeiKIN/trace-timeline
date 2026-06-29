import { describe, expect, it } from 'vitest';

import { mockTrace } from '../model';

import computeTraceCriticalPath from './criticalPath';

describe('computeTraceCriticalPath', () => {
  it('为 mockTrace 产出非空关键路径区段', () => {
    const cp = computeTraceCriticalPath(mockTrace);
    expect(Array.isArray(cp)).toBe(true);
    expect(cp.length).toBeGreaterThan(0);
  });

  it('每个区段 section_start < section_end，且 spanId 存在于 trace', () => {
    const cp = computeTraceCriticalPath(mockTrace);
    const ids = new Set(mockTrace.spans.map((s) => s.spanID));
    for (const sec of cp) {
      expect(sec.section_start).toBeLessThan(sec.section_end);
      expect(ids.has(sec.spanId)).toBe(true);
    }
  });

  it('根 span 在关键路径上（其耗时决定总时长）', () => {
    const cp = computeTraceCriticalPath(mockTrace);
    const rootId = mockTrace.spans[0].spanID;
    expect(cp.some((s) => s.spanId === rootId)).toBe(true);
  });

  it('memoize：同一 trace 返回同一引用', () => {
    expect(computeTraceCriticalPath(mockTrace)).toBe(computeTraceCriticalPath(mockTrace));
  });
});
