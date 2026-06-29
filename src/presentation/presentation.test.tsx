import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import type { RenderableRow } from '../core';
import { mockTrace } from '../model';
import type { TraceSpan } from '../model';
import { createTheme, ThemeProvider } from '../theme';

import { defaultColorAccessor, httpStatusToken } from './colorAccessor';
import { createDatadogRowRenderer } from './rowRenderer';

const theme = createTheme({ colorMode: 'light' });

function makeRow(span: TraceSpan, over: Partial<RenderableRow> = {}): RenderableRow {
  return {
    span,
    spanIndex: 0,
    isDetail: false,
    depth: span.depth,
    ancestorSpanIds: [],
    viewBounds: { start: 0, end: 1, clippingLeft: false, clippingRight: false },
    isCollapsed: false,
    isMatchingFilter: false,
    isFocused: false,
    isError: false,
    descendantHasError: false,
    criticalPathSections: [],
    columnWidth: 0.3,
    hoverIndentGuideIds: new Set(),
    onChildrenToggle: () => {},
    onDetailToggle: () => {},
    addHoverIndentGuideId: () => {},
    removeHoverIndentGuideId: () => {},
    ...over,
  };
}

function renderRow(row: RenderableRow) {
  const renderer = createDatadogRowRenderer({ theme, trace: mockTrace });
  return render(createElement(ThemeProvider, { theme, children: renderer(row) }));
}

describe('httpStatusToken', () => {
  it('按状态码段映射到 status 令牌', () => {
    expect(httpStatusToken(200, theme)).toBe(theme.trace.status.ok);
    expect(httpStatusToken(301, theme)).toBe(theme.trace.status.info);
    expect(httpStatusToken(404, theme)).toBe(theme.trace.status.warn);
    expect(httpStatusToken(500, theme)).toBe(theme.trace.status.error);
  });
});

describe('defaultColorAccessor', () => {
  it('同服务稳定取色、落在分类色板内', () => {
    const accessor = defaultColorAccessor(theme);
    const s1 = mockTrace.spans[0];
    expect(accessor(s1)).toBe(accessor(s1));
    expect(theme.trace.categoricalPalette).toContain(accessor(s1));
  });
});

describe('DdSpanRow（经 rowRenderer 工厂）', () => {
  it('瀑布条按 viewBounds 定位、仅顶圆角、服务色', () => {
    const s1 = mockTrace.spans.find((s) => s.spanID === 's1')!;
    const { container } = renderRow(makeRow(s1, { viewBounds: { start: 0, end: 1, clippingLeft: false, clippingRight: false } }));
    const bar = container.querySelector('[class$="DdSpanBar"]') as HTMLElement;
    expect(bar).toBeTruthy();
    expect(bar.style.left).toBe('0%');
    expect(bar.style.width).toBe('100%');
    expect(bar.style.background).toBeTruthy();
  });

  it('渲染服务名/操作名 + HTTP 状态 + 错误图标', () => {
    const s4 = mockTrace.spans.find((s) => s.spanID === 's4')!; // statusCode 2 + http 500
    const { container, getByText } = renderRow(makeRow(s4, { isError: true, httpStatus: 500 }));
    expect(getByText('GET /error')).toBeTruthy();
    // HTTP 状态 pill
    expect(getByText('500')).toBeTruthy();
    // 错误图标
    expect(container.querySelector('[class*="DdLabelError"]')).toBeTruthy();
  });

  it('缩进竖线数量 = ancestorSpanIds 长度', () => {
    const s3 = mockTrace.spans.find((s) => s.spanID === 's3')!;
    const { container } = renderRow(makeRow(s3, { depth: 2, ancestorSpanIds: ['s1', 's2'] }));
    // 每条祖先竖线 label 以 DdIndentGuide 结尾（root 容器是 DdIndentGuides，toggle 是 DdIndentToggle）
    const lineGuides = container.querySelectorAll('[class$="DdIndentGuide"]');
    expect(lineGuides.length).toBe(2);
  });
});
