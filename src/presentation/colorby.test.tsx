import { fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createTheme, ThemeProvider } from '../theme';

import { DdColorByDropdown } from './DdColorByDropdown';

const theme = createTheme({ colorMode: 'light' });

function mount(props: Parameters<typeof DdColorByDropdown>[0] = {}) {
  return render(createElement(ThemeProvider, { theme, children: <DdColorByDropdown {...props} /> }));
}

describe('DdColorByDropdown', () => {
  it('渲染 Color by + Service 选项；Service 默认选中', () => {
    const { getByText, getByLabelText } = mount();
    expect(getByText('Color by')).not.toBeNull();
    const select = getByLabelText('Color by 维度') as HTMLSelectElement;
    expect(select.value).toBe('service');
  });

  it('维度选项 = Service / Host / Entity Type，全部可选（Story 7.3 修正旧 stub）', () => {
    const { getByLabelText } = mount();
    const select = getByLabelText('Color by 维度') as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(['service', 'host', 'entity']);
    expect(Array.from(select.options).some((o) => o.disabled)).toBe(false);
  });

  it('选 Host / Entity 都触发 onChange', () => {
    const onChange = vi.fn();
    const { getByLabelText } = mount({ onChange });
    fireEvent.change(getByLabelText('Color by 维度'), { target: { value: 'host' } });
    expect(onChange).toHaveBeenCalledWith('host');
    fireEvent.change(getByLabelText('Color by 维度'), { target: { value: 'entity' } });
    expect(onChange).toHaveBeenCalledWith('entity');
  });
});
