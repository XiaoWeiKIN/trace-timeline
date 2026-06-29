import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockTrace } from '../model';

import { __resetWarnings, useTraceTimelineState, type ControlledTraceState } from './useTraceTimelineState';

beforeEach(() => __resetWarnings());

describe('useTraceTimelineState — 非受控', () => {
  it('childrenToggle 不可变折叠（新 Set 引用）', () => {
    const { result } = renderHook(() => useTraceTimelineState(mockTrace));
    const before = result.current.childrenHiddenIDs;
    act(() => result.current.childrenToggle('s1'));
    const after = result.current.childrenHiddenIDs;
    expect(after).not.toBe(before); // 新引用
    expect(after.has('s1')).toBe(true);
    act(() => result.current.childrenToggle('s1'));
    expect(result.current.childrenHiddenIDs.has('s1')).toBe(false);
  });

  it('collapseAll 折叠全部父、expandAll 清空', () => {
    const { result } = renderHook(() => useTraceTimelineState(mockTrace));
    act(() => result.current.collapseAll(mockTrace.spans));
    const parents = mockTrace.spans.filter((s) => s.hasChildren).map((s) => s.spanID);
    expect([...result.current.childrenHiddenIDs].sort()).toEqual(parents.sort());
    act(() => result.current.expandAll());
    expect(result.current.childrenHiddenIDs.size).toBe(0);
  });

  it('列宽默认 0.32、可设', () => {
    const { result } = renderHook(() => useTraceTimelineState(mockTrace, { initialColumnWidth: 0.4 }));
    expect(result.current.spanNameColumnWidth).toBe(0.4);
    act(() => result.current.setSpanNameColumnWidth(0.5));
    expect(result.current.spanNameColumnWidth).toBe(0.5);
  });

  it('viewRange 默认 [0,1]、updateViewRangeTime 生效', () => {
    const { result } = renderHook(() => useTraceTimelineState(mockTrace));
    expect(result.current.viewRange.time.current).toEqual([0, 1]);
    act(() => result.current.updateViewRangeTime(0.2, 0.8));
    expect(result.current.viewRange.time.current).toEqual([0.2, 0.8]);
  });

  it('selectSpan 单选 toggle → 底部抽屉选中态（Story 5.5）', () => {
    const { result } = renderHook(() => useTraceTimelineState(mockTrace));
    expect(result.current.selectedSpanId).toBeUndefined();

    // 点 s1 → 选中，并确保 DetailState 条目（供抽屉子分组折叠）
    act(() => result.current.selectSpan('s1'));
    expect(result.current.selectedSpanId).toBe('s1');
    expect(result.current.detailStates.has('s1')).toBe(true);

    // 点 s4 → 切到 s4（单选）
    act(() => result.current.selectSpan('s4'));
    expect(result.current.selectedSpanId).toBe('s4');

    // 再点 s4 → 取消选中（关闭抽屉）
    act(() => result.current.selectSpan('s4'));
    expect(result.current.selectedSpanId).toBeUndefined();

    // detailToggle 等价于 selectSpan（行点击入口）
    act(() => result.current.detailToggle('s1'));
    expect(result.current.selectedSpanId).toBe('s1');
  });

  it('trace 变化清空详情态（Story 3.1/5.5）', () => {
    const { result, rerender } = renderHook(({ t }) => useTraceTimelineState(t), {
      initialProps: { t: mockTrace },
    });
    act(() => result.current.selectSpan('s1'));
    expect(result.current.detailStates.size).toBe(1);
    // 传入 null（新 trace）→ 清空
    rerender({ t: null as unknown as typeof mockTrace });
    expect(result.current.detailStates.size).toBe(0);
  });

  it('search：查询命中、命中导航、只看匹配（Story 4.1）', () => {
    const { result } = renderHook(() => useTraceTimelineState(mockTrace));
    expect(result.current.search.matches).toBeUndefined();
    expect(result.current.search.matchCount).toBe(0);

    act(() => result.current.search.setQuery('mall-order-api'));
    expect(result.current.search.matchCount).toBeGreaterThan(1);
    expect(result.current.search.focusedMatchIndex).toBe(1);

    const first = result.current.search.focusedMatchId;
    act(() => result.current.search.nextMatch());
    expect(result.current.search.focusedMatchIndex).toBe(2);
    expect(result.current.search.focusedMatchId).not.toBe(first);

    act(() => result.current.search.setShowMatchesOnly(true));
    expect(result.current.search.showMatchesOnly).toBe(true);

    // 改查询重置游标到首个
    act(() => result.current.search.setQuery('redis'));
    expect(result.current.search.focusedMatchIndex).toBe(1);
  });

  it('search：只看错误（errorsOnly）+ errorCount（Story 4.2）', () => {
    const { result } = renderHook(() => useTraceTimelineState(mockTrace));
    expect(result.current.search.errorCount).toBeGreaterThan(0);
    expect(result.current.search.matches).toBeUndefined();

    act(() => result.current.search.setErrorsOnly(true));
    const m = result.current.search.matches!;
    expect(m).toBeInstanceOf(Set);
    expect(m.size).toBe(result.current.search.errorCount);
    // 错误集应含 s4（GET /error，500）
    expect(m.has('s4')).toBe(true);

    // 叠加查询取交集
    act(() => result.current.search.setQuery('redis'));
    expect(result.current.search.matches!.size).toBe(0); // redis 非错误
  });
});

describe('useTraceTimelineState — 受控（AD-5 三态）', () => {
  it('focusedSpanId 受控：库不内部改写、改走回调', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useTraceTimelineState(mockTrace, { focusedSpanId: 's1', onFocusedSpanIdChange: onChange })
    );
    expect(result.current.focusedSpanId).toBe('s1');
    act(() => result.current.setFocusedSpanId('s4'));
    expect(onChange).toHaveBeenCalledWith('s4');
    // 库不内部改写：仍为 prop 值 s1
    expect(result.current.focusedSpanId).toBe('s1');
  });

  it('focusedSpanId 受控无回调 → 只读冻结 + dev 警告', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useTraceTimelineState(mockTrace, { focusedSpanId: 's1' }));
    act(() => result.current.setFocusedSpanId('s4'));
    expect(result.current.focusedSpanId).toBe('s1'); // 冻结
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('全量逃生舱 + 逐字段同传 → 逐字段被忽略 + dev 警告', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const state: ControlledTraceState = {
      childrenHiddenIDs: new Set(['s2']),
      viewRange: { time: { current: [0, 1] } },
      spanNameColumnWidth: 0.3,
      hoverIndentGuideIds: new Set(),
      focusedSpanId: 's7',
    };
    const { result } = renderHook(() =>
      useTraceTimelineState(mockTrace, { state, onStateChange: vi.fn(), focusedSpanId: 's1' })
    );
    // 全量优先：focusedSpanId 取 state 的 s7（非逐字段 s1）
    expect(result.current.focusedSpanId).toBe('s7');
    expect(result.current.childrenHiddenIDs.has('s2')).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('全量逃生舱：childrenToggle 走 onStateChange 产出新 state', () => {
    const onStateChange = vi.fn();
    const state: ControlledTraceState = {
      childrenHiddenIDs: new Set(),
      viewRange: { time: { current: [0, 1] } },
      spanNameColumnWidth: 0.3,
      hoverIndentGuideIds: new Set(),
    };
    const { result } = renderHook(() => useTraceTimelineState(mockTrace, { state, onStateChange }));
    act(() => result.current.childrenToggle('s1'));
    expect(onStateChange).toHaveBeenCalledTimes(1);
    const next = onStateChange.mock.calls[0][0] as ControlledTraceState;
    expect(next.childrenHiddenIDs.has('s1')).toBe(true);
  });
});
