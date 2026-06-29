import { render } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockTrace } from '../model';

import VirtualizedTraceView, { type VirtualizedTraceViewProps } from './VirtualizedTraceView';

// scrollToIndex 是 ListView 的实例字段（箭头函数），无法 spy 原型——改 mock 整个模块，
// 用模块级共享 spy 捕获引擎对 listView.scrollToIndex 的调用。
const scrollToIndexSpy = vi.hoisted(() => vi.fn());
vi.mock('./ListView', async () => {
  // async factory：用动态 import 取 react（勿引用被提升的顶层 import）。
  const React = await import('react');
  class MockListView extends React.Component {
    scrollToIndex = scrollToIndexSpy;
    render() {
      return React.createElement('div', { 'data-mock-listview': true });
    }
  }
  return { default: MockListView };
});

function noop() {}
const HEADER = 28;

function baseProps(override: Partial<VirtualizedTraceViewProps> = {}): VirtualizedTraceViewProps {
  return {
    trace: mockTrace,
    currentViewRangeTime: [0, 1],
    childrenHiddenIDs: new Set(),
    detailStates: new Map(),
    findMatchesIDs: null,
    showSpanFilterMatchesOnly: false,
    criticalPath: [],
    spanNameColumnWidth: 0.25,
    hoverIndentGuideIds: new Set(),
    headerHeight: HEADER,
    rowRenderer: (row) => createElement('span', { 'data-span': row.span.spanID }),
    childrenToggle: noop,
    detailToggle: noop,
    addHoverIndentGuideId: noop,
    removeHoverIndentGuideId: noop,
    ...override,
  };
}

describe('VirtualizedTraceView — scrollToSpan (FR-7)', () => {
  afterEach(() => {
    scrollToIndexSpy.mockReset();
  });

  it('挂载时按 focusedSpanId 索引滚动，且补偿 headerHeight', () => {
    render(createElement(VirtualizedTraceView, baseProps({ focusedSpanId: 's4' })));
    expect(scrollToIndexSpy).toHaveBeenCalled();
    const [index, headerHeight] = scrollToIndexSpy.mock.calls[scrollToIndexSpy.mock.calls.length - 1];
    expect(headerHeight).toBe(HEADER);
    expect(index).toBeGreaterThan(0); // s4 非根，行号 > 0
  });

  it('根 s1 解析到行号 0', () => {
    render(createElement(VirtualizedTraceView, baseProps({ focusedSpanId: 's1' })));
    expect(scrollToIndexSpy.mock.calls[scrollToIndexSpy.mock.calls.length - 1][0]).toBe(0);
  });

  it('focusedSpanId 变化时重滚；无关 prop 变化不滚', () => {
    const { rerender } = render(createElement(VirtualizedTraceView, baseProps({ focusedSpanId: 's1' })));

    scrollToIndexSpy.mockClear();
    rerender(createElement(VirtualizedTraceView, baseProps({ focusedSpanId: 's7' })));
    expect(scrollToIndexSpy).toHaveBeenCalled();

    scrollToIndexSpy.mockClear();
    rerender(createElement(VirtualizedTraceView, baseProps({ focusedSpanId: 's7', spanNameColumnWidth: 0.5 })));
    expect(scrollToIndexSpy).not.toHaveBeenCalled();
  });

  it('focusedSpanId 未设置时挂载不滚动', () => {
    render(createElement(VirtualizedTraceView, baseProps()));
    expect(scrollToIndexSpy).not.toHaveBeenCalled();
  });
});
