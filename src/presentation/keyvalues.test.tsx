import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { createTheme, ThemeProvider } from '../theme';

import type { AttrRow } from './attributeGroups';
import { DdKeyValuesTable } from './DdKeyValuesTable';

const theme = createTheme({ colorMode: 'light' });

function mount(rows: AttrRow[]) {
  return render(createElement(ThemeProvider, { theme, children: <DdKeyValuesTable rows={rows} /> }));
}

describe('DdKeyValuesTable', () => {
  it('渲染 label 与文本值', () => {
    const { getByText } = mount([
      { label: 'Method', value: 'GET', kind: 'text' },
      { label: 'http.route', value: '/user', kind: 'text' },
    ]);
    expect(getByText('Method')).not.toBeNull();
    expect(getByText('GET')).not.toBeNull();
    expect(getByText('/user')).not.toBeNull();
  });

  it('空 rows 渲染占位「无」', () => {
    const { getByText } = mount([]);
    expect(getByText('无')).not.toBeNull();
  });

  it('status kind → 状态码 pill（绿底）', () => {
    const { container, getByText } = mount([{ label: 'Status Code', value: 200, kind: 'status' }]);
    const pill = container.querySelector('[class*="DdKeyValuesPill"]');
    expect(pill).not.toBeNull();
    expect(getByText('200')).not.toBeNull();
  });

  it('link kind 的 URL → 蓝链接（新窗）', () => {
    const { container } = mount([{ label: 'URL', value: 'http://localhost:9001/user', kind: 'link' }]);
    const a = container.querySelector('a');
    expect(a).not.toBeNull();
    expect(a!.getAttribute('href')).toBe('http://localhost:9001/user');
    expect(a!.getAttribute('target')).toBe('_blank');
  });

  it('JSON 值 → jsonMarkup 着色容器', () => {
    const { container } = mount([{ label: 'payload', value: '{"name":"x","n":1,"ok":true}', kind: 'text' }]);
    expect(container.querySelector('.json-markup')).not.toBeNull();
    expect(container.querySelector('.json-markup-key')).not.toBeNull();
    expect(container.querySelector('.json-markup-number')).not.toBeNull();
  });

  it('恶意 HTML JSON 值经 DOMPurify 净化——无 onerror/script', () => {
    const { container } = mount([{ label: 'evil', value: '{"x":"<img src=x onerror=alert(1)>"}', kind: 'text' }]);
    expect(container.querySelector('img')?.getAttribute('onerror') ?? null).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });
});
