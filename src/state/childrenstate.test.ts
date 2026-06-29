// useChildrenState 折叠逻辑特征化测试。
// 锁定逐层 collapseOne/expandOne 在 mockTrace 上的语义基准，防回归漂移。
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { mockTrace } from '../model';

import { useChildrenState } from './useChildrenState';

const sorted = (s: Set<string>) => [...s].sort();
const spans = mockTrace.spans;

describe('useChildrenState — 逐层折叠/展开（collapseOne/expandOne）', () => {
  it('collapseOne 自底向上逐层收（最深可见未折叠父）', () => {
    const { result } = renderHook(() => useChildrenState());
    act(() => result.current.collapseOne(spans));
    expect(sorted(result.current.childrenHiddenIDs)).toEqual(['s2', 's4', 's8']);
    act(() => result.current.collapseOne(spans));
    expect(sorted(result.current.childrenHiddenIDs)).toEqual(['s2', 's4', 's7', 's8']);
    act(() => result.current.collapseOne(spans));
    expect(sorted(result.current.childrenHiddenIDs)).toEqual(['s1', 's2', 's4', 's7', 's8']);
  });

  it('expandOne 自顶向下逐层放（最浅可见折叠点），与 collapseOne 互逆', () => {
    const { result } = renderHook(() => useChildrenState());
    act(() => result.current.collapseOne(spans));
    act(() => result.current.collapseOne(spans));
    act(() => result.current.collapseOne(spans)); // {s1,s2,s4,s7,s8}
    act(() => result.current.expandOne(spans));
    expect(sorted(result.current.childrenHiddenIDs)).toEqual(['s2', 's4', 's7', 's8']);
    act(() => result.current.expandOne(spans));
    expect(sorted(result.current.childrenHiddenIDs)).toEqual(['s8']);
  });

  it('collapseAll 折叠全部父；全折叠后 collapseOne/collapseAll 为 no-op（返回同引用）', () => {
    const { result } = renderHook(() => useChildrenState());
    act(() => result.current.collapseAll(spans));
    const all = result.current.childrenHiddenIDs;
    // mockTrace 的父：s1,s2,s7,s8,s4
    expect(sorted(all)).toEqual(['s1', 's2', 's4', 's7', 's8']);
    act(() => result.current.collapseOne(spans));
    expect(result.current.childrenHiddenIDs).toBe(all); // 同引用 = 未变更
    act(() => result.current.collapseAll(spans));
    expect(result.current.childrenHiddenIDs).toBe(all);
  });

  it('childrenToggle 单 span 开关 + 不可变新引用；expandAll 清空', () => {
    const { result } = renderHook(() => useChildrenState());
    const empty = result.current.childrenHiddenIDs;
    act(() => result.current.childrenToggle('s1'));
    expect(result.current.childrenHiddenIDs.has('s1')).toBe(true);
    expect(result.current.childrenHiddenIDs).not.toBe(empty); // 新引用
    act(() => result.current.childrenToggle('s1'));
    expect(result.current.childrenHiddenIDs.has('s1')).toBe(false);
    act(() => result.current.collapseAll(spans));
    act(() => result.current.expandAll());
    expect(result.current.childrenHiddenIDs.size).toBe(0);
  });

  it('expandOne 空集为 no-op（返回同引用）', () => {
    const { result } = renderHook(() => useChildrenState());
    const empty = result.current.childrenHiddenIDs;
    act(() => result.current.expandOne(spans));
    expect(result.current.childrenHiddenIDs).toBe(empty);
  });
});
