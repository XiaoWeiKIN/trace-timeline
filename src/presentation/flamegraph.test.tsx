import { fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { getServiceColorKey, mockTrace } from '../model';
import { createTheme, ThemeProvider } from '../theme';

import { DdFlameControls } from './DdFlameControls';
import { DdFlameGraphView } from './DdFlameGraphView';
import { DdFlameRuler } from './DdFlameRuler';

const theme = createTheme({ colorMode: 'light' });
const ROW_H = theme.trace.flame.rowHeight;

function mount(props: Parameters<typeof DdFlameGraphView>[0]) {
  return render(createElement(ThemeProvider, { theme, children: <DdFlameGraphView {...props} /> }));
}

describe('DdFlameGraphView', () => {
  it('每个 span 渲染一个矩形', () => {
    const { getAllByTestId } = mount({ trace: mockTrace });
    expect(getAllByTestId('FlameRect').length).toBe(mockTrace.spans.length);
  });

  it('top = depth × rowHeight', () => {
    const { container } = mount({ trace: mockTrace });
    mockTrace.spans.forEach((s) => {
      const el = container.querySelector(`[data-span-id="${s.spanID}"]`) as HTMLElement;
      expect(el).not.toBeNull();
      expect(el.style.top).toBe(`${s.depth * ROW_H}px`);
    });
  });

  it('容器高 = (maxDepth+1) × rowHeight', () => {
    const { getByTestId } = mount({ trace: mockTrace });
    const maxDepth = Math.max(...mockTrace.spans.map((s) => s.depth));
    expect((getByTestId('DdFlameGraphView') as HTMLElement).style.height).toBe(`${(maxDepth + 1) * ROW_H}px`);
  });

  it('矩形含 operation 名', () => {
    const { getByText } = mount({ trace: mockTrace });
    // 'GET /user' 为 root，唯一
    expect(getByText('GET /user')).toBeTruthy();
  });

  it('selectedSpanId 命中矩形带选中描边类，其余不带', () => {
    const sel = mockTrace.spans[1].spanID;
    const { container } = mount({ trace: mockTrace, selectedSpanId: sel });
    const selEl = container.querySelector(`[data-span-id="${sel}"]`) as HTMLElement;
    expect(selEl.className).toContain('Selected');
    const otherEl = container.querySelector(`[data-span-id="${mockTrace.spans[0].spanID}"]`) as HTMLElement;
    expect(otherEl.className).not.toContain('Selected');
  });

  it('点矩形触发 onSelectSpan(spanID)（Story 6.2）', () => {
    const onSelectSpan = vi.fn();
    const target = mockTrace.spans[2].spanID;
    const { container } = mount({ trace: mockTrace, onSelectSpan });
    fireEvent.click(container.querySelector(`[data-span-id="${target}"]`)!);
    expect(onSelectSpan).toHaveBeenCalledWith(target);
  });

  it('mouseMove → 出竖线游标（Story 6.3）', () => {
    const { getByTestId, queryByTestId } = mount({ trace: mockTrace });
    expect(queryByTestId('FlameCursor')).toBeNull();
    fireEvent.mouseMove(getByTestId('DdFlameGraphView'), { clientX: 10, clientY: 5 });
    expect(getByTestId('FlameCursor')).toBeTruthy();
  });

  it('hover 矩形 → tooltip 含 operation + service（Story 6.3）', () => {
    const { container, getByTestId } = mount({ trace: mockTrace });
    fireEvent.mouseEnter(container.querySelector('[data-span-id="s1"]')!);
    const tip = getByTestId('FlameTooltip');
    expect(tip.textContent).toContain('GET /user');
    expect(tip.textContent).toContain('mall-order-api');
  });

  it('滚轮 → onViewRangeChange 窗口变小（zoom in，Story 6.4）', () => {
    const onViewRangeChange = vi.fn();
    const { getByTestId } = mount({ trace: mockTrace, onViewRangeChange });
    fireEvent.wheel(getByTestId('DdFlameGraphView'), { deltaY: -100, clientX: 100, clientY: 5 });
    expect(onViewRangeChange).toHaveBeenCalled();
    const calls = onViewRangeChange.mock.calls;
    const [vs, ve] = calls[calls.length - 1];
    expect(ve - vs).toBeLessThan(1); // 比全量 [0,1] 窄
  });

  it('拖拽后抑制 click 选中（Story 6.4）', () => {
    const onSelectSpan = vi.fn();
    const onViewRangeChange = vi.fn();
    const { container, getByTestId } = mount({ trace: mockTrace, onSelectSpan, onViewRangeChange });
    const view = getByTestId('DdFlameGraphView');
    const rect = container.querySelector('[data-span-id="s1"]')!;
    fireEvent.mouseDown(view, { button: 0, clientX: 100 });
    fireEvent.mouseMove(view, { clientX: 140, clientY: 5 }); // dx=40 > 3 → moved
    fireEvent.mouseUp(view);
    fireEvent.click(rect);
    expect(onSelectSpan).not.toHaveBeenCalled(); // 拖动后不选中
  });

  it('背景拖拽后再点 rect 仍能选中（H1 回归：mousedown 复位抑制）', () => {
    const onSelectSpan = vi.fn();
    const onViewRangeChange = vi.fn();
    const { container, getByTestId } = mount({ trace: mockTrace, onSelectSpan, onViewRangeChange });
    const view = getByTestId('DdFlameGraphView');
    const rect = container.querySelector('[data-span-id="s1"]')!;
    // 背景拖拽（在 bg 松开，rect.onClick 不触发 → 旧实现残留 suppress）
    fireEvent.mouseDown(view, { button: 0, clientX: 100 });
    fireEvent.mouseMove(view, { clientX: 160, clientY: 5 });
    fireEvent.mouseUp(view);
    // 新一次对 rect 的完整点击：mousedown 冒泡到容器 → 复位 suppress → click 正常选中
    fireEvent.mouseDown(rect, { button: 0 });
    fireEvent.mouseUp(rect);
    fireEvent.click(rect);
    expect(onSelectSpan).toHaveBeenCalledWith('s1');
  });

  it('highlightedGroupKey → 非匹配帧灰显、匹配帧保留服务色（Story 7.1）', () => {
    const groupKeyForSpan = (s: (typeof mockTrace.spans)[number]) => getServiceColorKey(s.process);
    // s1 = mall-order-api（高亮）；s3 = redis（非匹配 → 灰显）
    const key = getServiceColorKey(mockTrace.spans[0].process); // 'mall-order-api'
    const { container } = mount({ trace: mockTrace, highlightedGroupKey: key, groupKeyForSpan });
    const match = container.querySelector('[data-span-id="s1"]') as HTMLElement;
    const dimmed = container.querySelector('[data-span-id="s3"]') as HTMLElement;
    expect(match.getAttribute('data-dimmed')).toBeNull();
    expect(dimmed.getAttribute('data-dimmed')).toBe('true');
    // 灰显帧背景 = dimmedFill，与匹配帧不同
    expect(dimmed.style.background).not.toBe(match.style.background);
  });

  it('无 highlightedGroupKey → 全部不灰显（零回归）', () => {
    const { container } = mount({ trace: mockTrace });
    expect(container.querySelector('[data-dimmed="true"]')).toBeNull();
  });

  it('hover 帧 → onSpanHover(分组 key)（Story 7.1 反向联动）', () => {
    const onSpanHover = vi.fn();
    const groupKeyForSpan = (s: (typeof mockTrace.spans)[number]) => getServiceColorKey(s.process);
    const { container } = mount({ trace: mockTrace, groupKeyForSpan, onSpanHover });
    fireEvent.mouseEnter(container.querySelector('[data-span-id="s3"]')!);
    expect(onSpanHover).toHaveBeenCalledWith('redis');
  });

  it('CR-F6：拖拽平移进行中 hover 帧不触发 onSpanHover/tooltip', () => {
    const onSpanHover = vi.fn();
    const groupKeyForSpan = (s: (typeof mockTrace.spans)[number]) => getServiceColorKey(s.process);
    const onViewRangeChange = vi.fn();
    const { container, getByTestId, queryByTestId } = mount({
      trace: mockTrace,
      groupKeyForSpan,
      onSpanHover,
      onViewRangeChange,
    });
    fireEvent.mouseDown(getByTestId('DdFlameGraphView'), { button: 0, clientX: 100 }); // 起拖
    fireEvent.mouseEnter(container.querySelector('[data-span-id="s3"]')!);
    expect(onSpanHover).not.toHaveBeenCalled();
    expect(queryByTestId('FlameTooltip')).toBeNull();
  });
});

describe('DdFlameControls (Story 6.4)', () => {
  function mountCtl(props: Parameters<typeof DdFlameControls>[0]) {
    return render(createElement(ThemeProvider, { theme, children: <DdFlameControls {...props} /> }));
  }
  it('全览按钮触发 onZoomFull；无选中时后两者禁用', () => {
    const onZoomFull = vi.fn();
    const { container } = mountCtl({ onZoomFull, onZoomSelected: () => {}, onFocusSelected: () => {}, hasSelection: false });
    fireEvent.click(container.querySelector('[data-action="zoom-full"]')!);
    expect(onZoomFull).toHaveBeenCalled();
    expect((container.querySelector('[data-action="zoom-selected"]') as HTMLButtonElement).disabled).toBe(true);
    expect((container.querySelector('[data-action="focus-selected"]') as HTMLButtonElement).disabled).toBe(true);
  });
  it('hasSelection 时放大/聚焦可用并回调', () => {
    const onZoomSelected = vi.fn();
    const onFocusSelected = vi.fn();
    const { container } = mountCtl({ onZoomFull: () => {}, onZoomSelected, onFocusSelected, hasSelection: true });
    fireEvent.click(container.querySelector('[data-action="zoom-selected"]')!);
    fireEvent.click(container.querySelector('[data-action="focus-selected"]')!);
    expect(onZoomSelected).toHaveBeenCalled();
    expect(onFocusSelected).toHaveBeenCalled();
  });

  it('isFocused 时出「重置聚焦」并回调（Story 6.7）', () => {
    const onResetFocus = vi.fn();
    const { container, queryByText } = mountCtl({
      onZoomFull: () => {},
      onZoomSelected: () => {},
      onFocusSelected: () => {},
      hasSelection: true,
      isFocused: true,
      onResetFocus,
    });
    fireEvent.click(container.querySelector('[data-action="reset-focus"]')!);
    expect(onResetFocus).toHaveBeenCalled();
    expect(queryByText('重置聚焦')).toBeTruthy();
  });

  it('未聚焦时无「重置聚焦」', () => {
    const { container } = mountCtl({
      onZoomFull: () => {},
      onZoomSelected: () => {},
      onFocusSelected: () => {},
      hasSelection: true,
      isFocused: false,
    });
    expect(container.querySelector('[data-action="reset-focus"]')).toBeNull();
  });
});

describe('DdFlameRuler', () => {
  it('渲染 ms 刻度标签', () => {
    const { container } = render(
      createElement(ThemeProvider, {
        theme,
        children: <DdFlameRuler numTicks={5} viewDuration={102_000} />,
      })
    );
    expect(container.querySelector('[data-testid="DdFlameRuler"]')).toBeTruthy();
    // DdTicks 标签：含末端 102ms 这类（formatDuration(102000)）
    expect(container.querySelector('[class$="DdTickLabel"]')).toBeTruthy();
  });
});
