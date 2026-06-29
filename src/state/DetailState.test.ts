import { describe, expect, it } from 'vitest';

import type { TraceLog, TraceSpanReference } from '../model';

import DetailState from './DetailState';

const log: TraceLog = { timestamp: 1, fields: [] };
const ref = { refType: 'CHILD_OF', spanID: 'sp', traceID: 'tr' } as unknown as TraceSpanReference;

describe('DetailState', () => {
  it('默认全部关闭', () => {
    const s = new DetailState();
    expect(s.isTagsOpen).toBe(false);
    expect(s.isProcessOpen).toBe(false);
    expect(s.logs.isOpen).toBe(false);
    expect(s.references.isOpen).toBe(false);
    expect(s.logs.openedItems.size).toBe(0);
  });

  it('toggle 不可变——返回新实例，原实例不变', () => {
    const s = new DetailState();
    const s2 = s.toggleTags();
    expect(s2).not.toBe(s);
    expect(s.isTagsOpen).toBe(false);
    expect(s2.isTagsOpen).toBe(true);
    // 再 toggle 关闭
    expect(s2.toggleTags().isTagsOpen).toBe(false);
  });

  it('各分组 toggle 互不影响', () => {
    const s = new DetailState().toggleProcess();
    expect(s.isProcessOpen).toBe(true);
    expect(s.isTagsOpen).toBe(false);
    const s2 = s.toggleLogs();
    expect(s2.logs.isOpen).toBe(true);
    expect(s2.isProcessOpen).toBe(true);
  });

  it('log/reference 子项增删（Set，不可变拷贝）', () => {
    const s = new DetailState().toggleLogItem(log);
    expect(s.logs.openedItems.has(log)).toBe(true);
    const s2 = s.toggleLogItem(log);
    expect(s2.logs.openedItems.has(log)).toBe(false);
    expect(s.logs.openedItems.has(log)).toBe(true); // 原实例不受影响

    const r = new DetailState().toggleReferenceItem(ref);
    expect(r.references.openedItems.has(ref)).toBe(true);
    expect(r.toggleReferenceItem(ref).references.openedItems.has(ref)).toBe(false);
  });
});
