import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import type { TraceSpan } from '../model';
import { createTheme, ThemeProvider } from '../theme';

import { DdHttpRequestBar } from './DdHttpRequestBar';

const theme = createTheme({ colorMode: 'light' });

function spanWith(tags: Array<{ key: string; value: unknown }>): TraceSpan {
  return { spanID: 's', operationName: 'op', tags } as unknown as TraceSpan;
}

function mount(span: TraceSpan) {
  return render(createElement(ThemeProvider, { theme, children: <DdHttpRequestBar span={span} /> }));
}

describe('DdHttpRequestBar', () => {
  it('method pill + url 链接 + 状态 pill', () => {
    const { getByText, container, getByTestId } = mount(
      spanWith([
        { key: 'http.method', value: 'get' },
        { key: 'http.url', value: 'http://localhost:9001/user' },
        { key: 'http.status_code', value: 200 },
      ])
    );
    expect(getByTestId('DdHttpRequestBar')).not.toBeNull();
    expect(getByText('GET')).not.toBeNull(); // 大写
    expect(getByText('200')).not.toBeNull();
    const a = container.querySelector('a');
    expect(a!.getAttribute('href')).toBe('http://localhost:9001/user');
  });

  it('无任何 http 字段 → 不渲染', () => {
    const { queryByTestId } = mount(spanWith([{ key: 'db.system', value: 'redis' }]));
    expect(queryByTestId('DdHttpRequestBar')).toBeNull();
  });

  it('仅状态码也渲染（5xx 红 pill）', () => {
    const { getByText, getByTestId } = mount(spanWith([{ key: 'http.status_code', value: 500 }]));
    expect(getByTestId('DdHttpRequestBar')).not.toBeNull();
    expect(getByText('500')).not.toBeNull();
  });
});
