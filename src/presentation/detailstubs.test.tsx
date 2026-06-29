import { fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { TraceSpan } from '../model';
import { createTheme, ThemeProvider } from '../theme';

import { DdFlameGraph, DdShareButton, DdSpanLinks } from './detailStubs';

const theme = createTheme({ colorMode: 'light' });
const span = { spanID: 's1', operationName: 'op', tags: [] } as unknown as TraceSpan;

function wrap(node: React.ReactNode) {
  return render(createElement(ThemeProvider, { theme, children: node }));
}

describe('detailStubs（深耦合 stub）', () => {
  it('DdShareButton：传回调渲染并点击携 span', () => {
    const onShareSpan = vi.fn();
    const { getByTestId } = wrap(<DdShareButton span={span} onShareSpan={onShareSpan} />);
    fireEvent.click(getByTestId('DdShareButton'));
    expect(onShareSpan).toHaveBeenCalledWith(span);
  });

  it('DdShareButton：不传回调 → 不渲染（隐藏）', () => {
    const { queryByTestId } = wrap(<DdShareButton span={span} />);
    expect(queryByTestId('DdShareButton')).toBeNull();
  });

  it('DdSpanLinks：传回调渲染并点击携 span', () => {
    const onSpanLinks = vi.fn();
    const { getByTestId } = wrap(<DdSpanLinks span={span} onSpanLinks={onSpanLinks} />);
    fireEvent.click(getByTestId('DdSpanLinks'));
    expect(onSpanLinks).toHaveBeenCalledWith(span);
  });

  it('DdSpanLinks：不传回调 → 不渲染', () => {
    const { queryByTestId } = wrap(<DdSpanLinks span={span} />);
    expect(queryByTestId('DdSpanLinks')).toBeNull();
  });

  it('DdFlameGraph：不传 → 占位文案；传 → 接管渲染', () => {
    const { getByTestId, getByText, rerender } = wrap(<DdFlameGraph span={span} />);
    expect(getByTestId('DdFlameGraph').textContent).toContain('火焰图');

    rerender(
      createElement(ThemeProvider, {
        theme,
        children: <DdFlameGraph span={span} renderFlameGraph={(s) => <div>CUSTOM {s.spanID}</div>} />,
      })
    );
    expect(getByText('CUSTOM s1')).not.toBeNull();
  });
});
