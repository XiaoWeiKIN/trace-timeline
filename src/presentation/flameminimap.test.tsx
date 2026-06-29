import { fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { mockTrace } from '../model';
import { createTheme, ThemeProvider } from '../theme';

import { DdFlameMinimap } from './DdFlameMinimap';

const theme = createTheme({ colorMode: 'light' });

function mount(props: Parameters<typeof DdFlameMinimap>[0]) {
  return render(createElement(ThemeProvider, { theme, children: <DdFlameMinimap {...props} /> }));
}

describe('DdFlameMinimap', () => {
  const base = {
    trace: mockTrace,
    viewStart: 0.25,
    viewEnd: 0.5,
    onViewRangeChange: () => {},
    onZoomFull: () => {},
    onZoomSelected: () => {},
    onFocusSelected: () => {},
    hasSelection: false,
  };

  it('渲染微缩矩形（=spans 数）+ 视口框', () => {
    const { getAllByTestId, getByTestId } = mount({ ...base });
    expect(getAllByTestId('FlameMiniRect').length).toBe(mockTrace.spans.length);
    const vp = getByTestId('FlameMinimapViewport') as HTMLElement;
    expect(vp.style.left).toBe('25%');
    expect(vp.style.width).toBe('25%');
  });

  it('点击 minimap → onViewRangeChange（窗口宽度不变）', () => {
    const onViewRangeChange = vi.fn();
    const { getByTestId } = mount({ ...base, onViewRangeChange });
    fireEvent.mouseDown(getByTestId('DdFlameMinimap').querySelector('[class$="MinimapCanvas"]')!, {
      button: 0,
      clientX: 30,
    });
    expect(onViewRangeChange).toHaveBeenCalled();
    const [vs, ve] = onViewRangeChange.mock.calls[0];
    expect(ve - vs).toBeCloseTo(0.25, 5); // 宽度保持
  });

  it('toggle 收起/展开', () => {
    const { getByTestId, queryByTestId } = mount({ ...base });
    expect(queryByTestId('FlameMinimapViewport')).toBeTruthy();
    fireEvent.click(getByTestId('FlameMinimapToggle')); // 收起
    expect(queryByTestId('FlameMinimapViewport')).toBeNull();
    fireEvent.click(getByTestId('FlameMinimapToggle')); // 展开
    expect(queryByTestId('FlameMinimapViewport')).toBeTruthy();
  });

  it('控件停靠 minimap 内（Story 6.6）+ 视口框透明蓝边无填充', () => {
    const onZoomFull = vi.fn();
    const { getByTestId, container } = mount({ ...base, onZoomFull });
    // DdFlameControls 三按钮在 minimap 内
    const mm = getByTestId('DdFlameMinimap');
    expect(mm.querySelector('[data-action="zoom-full"]')).toBeTruthy();
    expect(mm.querySelector('[data-action="zoom-selected"]')).toBeTruthy();
    fireEvent.click(mm.querySelector('[data-action="zoom-full"]')!);
    expect(onZoomFull).toHaveBeenCalled();
    // 遮罩层存在
    expect(container.querySelector('[class$="DdFlameMiniMask"]')).toBeTruthy();
    // 视口框：透明背景
    const vp = getByTestId('FlameMinimapViewport') as HTMLElement;
    expect(getComputedStyle(vp).backgroundColor).toMatch(/transparent|rgba\(0, 0, 0, 0\)/);
  });
});
