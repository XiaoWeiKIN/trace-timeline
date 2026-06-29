import { fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { mockTrace } from '../model';
import { createTheme, ThemeProvider } from '../theme';

import { DdFlameLegend } from './DdFlameLegend';

const theme = createTheme({ colorMode: 'light' });

function mount(props: Parameters<typeof DdFlameLegend>[0]) {
  return render(createElement(ThemeProvider, { theme, children: <DdFlameLegend {...props} /> }));
}

describe('DdFlameLegend', () => {
  it('每个 service 分组渲染一行（mockTrace 4 组）', () => {
    const { getAllByTestId } = mount({ trace: mockTrace });
    expect(getAllByTestId('DdFlameLegendRow').length).toBe(4);
  });

  it('行含色块 + 占比% 文本', () => {
    const { getAllByTestId } = mount({ trace: mockTrace });
    const row = getAllByTestId('DdFlameLegendRow')[0];
    expect(row.querySelector('[class*="DdFlameLegendSquare"]')).not.toBeNull();
    expect(row.textContent).toMatch(/%$/);
  });

  it('点击行 → onToggle(分组 key)', () => {
    const onToggle = vi.fn();
    const { getAllByTestId } = mount({ trace: mockTrace, onToggle });
    const row = getAllByTestId('DdFlameLegendRow')[0];
    fireEvent.click(row);
    expect(onToggle).toHaveBeenCalledWith(row.getAttribute('data-group-key'));
  });

  it('hover 行 → onHoverChange(key)；离开 → onHoverChange(null)', () => {
    const onHoverChange = vi.fn();
    const { getAllByTestId } = mount({ trace: mockTrace, onHoverChange });
    const row = getAllByTestId('DdFlameLegendRow')[0];
    fireEvent.mouseEnter(row);
    expect(onHoverChange).toHaveBeenCalledWith(row.getAttribute('data-group-key'));
    fireEvent.mouseLeave(row);
    expect(onHoverChange).toHaveBeenLastCalledWith(null);
  });

  it('highlightedKey → 命中行 Highlighted、其余 Dimmed', () => {
    const { getAllByTestId, rerender } = mount({ trace: mockTrace });
    const key = getAllByTestId('DdFlameLegendRow')[0].getAttribute('data-group-key');
    rerender(createElement(ThemeProvider, { theme, children: <DdFlameLegend trace={mockTrace} highlightedKey={key} /> }));
    const rows2 = getAllByTestId('DdFlameLegendRow');
    expect(rows2[0].getAttribute('data-state')).toBe('highlighted');
    expect(rows2[1].getAttribute('data-state')).toBe('dimmed');
  });

  it('showLegend=false → 只剩 Show Legend，无行', () => {
    const onShowLegendChange = vi.fn();
    const { getByTestId, queryAllByTestId } = mount({
      trace: mockTrace,
      showLegend: false,
      onShowLegendChange,
    });
    const toggle = getByTestId('DdFlameLegendToggle');
    expect(toggle.textContent).toBe('Show Legend');
    expect(queryAllByTestId('DdFlameLegendRow').length).toBe(0);
    fireEvent.click(toggle);
    expect(onShowLegendChange).toHaveBeenCalledWith(true);
  });

  it('Hide Legend 按钮 → onShowLegendChange(false)', () => {
    const onShowLegendChange = vi.fn();
    const { getByTestId } = mount({ trace: mockTrace, onShowLegendChange });
    fireEvent.click(getByTestId('DdFlameLegendToggle'));
    expect(onShowLegendChange).toHaveBeenCalledWith(false);
  });

  it('onMetricChange 提供 → 表头渲染指标下拉，切 Spans 触发回调（Story 7.2）', () => {
    const onMetricChange = vi.fn();
    const { getByTestId } = mount({ trace: mockTrace, onMetricChange });
    const sel = getByTestId('DdFlameLegendMetric') as HTMLSelectElement;
    expect(Array.from(sel.options).map((o) => o.value)).toEqual(['execTime', 'spans']);
    fireEvent.change(sel, { target: { value: 'spans' } });
    expect(onMetricChange).toHaveBeenCalledWith('spans');
  });

  it("metric='spans' → 行显示计数而非百分比（Story 7.2）", () => {
    const { getAllByTestId } = mount({ trace: mockTrace, metric: 'spans' });
    const texts = getAllByTestId('DdFlameLegendRow').map((r) => r.textContent || '');
    expect(texts.some((t) => /%/.test(t))).toBe(false);
    // mall-order-api 5 spans
    expect(texts.some((t) => /mall-order-api5$/.test(t.replace(/\s/g, '')))).toBe(true);
  });

  it("dimension='entity' → 含 (inferred) 分组行（Story 7.3）", () => {
    const { getAllByTestId } = mount({ trace: mockTrace, dimension: 'entity' });
    const keys = getAllByTestId('DdFlameLegendRow').map((r) => r.getAttribute('data-group-key') || '');
    expect(keys.some((k) => /\(inferred\)$/.test(k))).toBe(true);
  });
});
