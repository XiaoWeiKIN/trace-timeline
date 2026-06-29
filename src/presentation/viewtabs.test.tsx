import { fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createTheme, ThemeProvider } from '../theme';

import { DdViewTabs } from './DdViewTabs';

const theme = createTheme({ colorMode: 'light' });

function mount(props: Parameters<typeof DdViewTabs>[0]) {
  return render(createElement(ThemeProvider, { theme, children: <DdViewTabs {...props} /> }));
}

describe('DdViewTabs', () => {
  it('点 tab 触发 onChange', () => {
    const onChange = vi.fn();
    const { container } = mount({ value: 'waterfall', onChange });
    fireEvent.click(container.querySelector('[data-view="flamegraph"]')!);
    expect(onChange).toHaveBeenCalledWith('flamegraph');
  });

  it('active 态 aria-selected 正确', () => {
    const { container } = mount({ value: 'flamegraph', onChange: () => {} });
    expect(container.querySelector('[data-view="flamegraph"]')!.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[data-view="waterfall"]')!.getAttribute('aria-selected')).toBe('false');
  });
});
