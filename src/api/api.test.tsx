import { fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { mockTrace } from '../model';
import { createTheme, ThemeProvider } from '../theme';

import { TraceTimeline } from './TraceTimeline';

const theme = createTheme({ colorMode: 'light' });

function renderApp(node: React.ReactNode) {
  return render(createElement(ThemeProvider, { theme, children: node }));
}

describe('TraceTimeline', () => {
  it('渲染 mockTrace：出刻度表头 + 服务名 + 瀑布条', () => {
    const { container, getAllByText } = renderApp(<TraceTimeline trace={mockTrace} height={600} />);
    // 表头标签
    expect(container.querySelector('[class$="DdTimelineHeader"]')).toBeTruthy();
    // 服务名（多次出现）
    expect(getAllByText('mall-order-api').length).toBeGreaterThan(0);
    // 至少一条瀑布条
    expect(container.querySelector('[class$="DdSpanBar"]')).toBeTruthy();
  });

  it('trace=null → 空态文案，不崩溃', () => {
    const { getByText, container } = renderApp(<TraceTimeline trace={null} />);
    expect(getByText('无追踪数据')).toBeTruthy();
    expect(container.querySelector('[data-testid="ListView"]')).toBeNull();
  });

  it('loading → 占位文案', () => {
    const { getByText } = renderApp(<TraceTimeline trace={mockTrace} loading />);
    expect(getByText('加载中…')).toBeTruthy();
  });

  it('切到火焰图视图：出 DdFlameGraphView，隐藏 DdTimelineHeader（Story 6.2）', () => {
    const { container, getByTestId } = renderApp(<TraceTimeline trace={mockTrace} height={400} />);
    // 默认瀑布：有表头
    expect(container.querySelector('[class$="DdTimelineHeader"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="DdFlameGraphView"]')).toBeNull();
    // 点「火焰图」tab
    fireEvent.click(getByTestId('DdViewTabs').querySelector('[data-view="flamegraph"]')!);
    expect(container.querySelector('[data-testid="DdFlameGraphView"]')).toBeTruthy();
    expect(container.querySelector('[class$="DdTimelineHeader"]')).toBeNull();
  });

  it('火焰图点 span → 底部抽屉显示（共享 selectedSpanId，Story 6.2/5.5）', () => {
    const { container, getByTestId } = renderApp(<TraceTimeline trace={mockTrace} height={400} />);
    fireEvent.click(getByTestId('DdViewTabs').querySelector('[data-view="flamegraph"]')!);
    expect(container.querySelector('[data-testid="TraceTimelineDrawer"]')).toBeNull();
    const rect = container.querySelector('[data-testid="FlameRect"]')!;
    fireEvent.click(rect);
    expect(container.querySelector('[data-testid="TraceTimelineDrawer"]')).toBeTruthy();
  });

  it('火焰图 minimap 停靠左下角', () => {
    const { getByTestId } = renderApp(<TraceTimeline trace={mockTrace} height={400} />);
    fireEvent.click(getByTestId('DdViewTabs').querySelector('[data-view="flamegraph"]')!);
    const minimap = getByTestId('DdFlameMinimap') as HTMLElement;
    expect(minimap.style.left).toBe('6px');
    expect(minimap.style.bottom).toBe('6px');
    expect(minimap.style.top).toBe('');
  });

  it('hover/选中火焰图 span 只高亮图例行，不触发主图灰显', () => {
    const { container, getByTestId } = renderApp(<TraceTimeline trace={mockTrace} height={400} />);
    fireEvent.click(getByTestId('DdViewTabs').querySelector('[data-view="flamegraph"]')!);
    const flame = container.querySelector('[data-testid="DdFlameGraphView"]')!;
    const redisRect = flame.querySelector('[data-span-id="s3"]')!;

    fireEvent.mouseEnter(redisRect);
    expect(container.querySelector('[data-group-key="redis"]')?.getAttribute('data-state')).toBe('highlighted');
    expect(flame.querySelectorAll('[data-testid="FlameRect"][data-dimmed="true"]').length).toBe(0);

    fireEvent.click(redisRect);
    expect(container.querySelector('[data-testid="TraceTimelineDrawer"]')).toBeTruthy();
    expect(flame.querySelectorAll('[data-testid="FlameRect"][data-dimmed="true"]').length).toBe(0);
  });

  it('聚焦选中 → re-root（祖先隐藏），重置聚焦恢复（Story 6.7）', () => {
    const { container, getByTestId } = renderApp(<TraceTimeline trace={mockTrace} height={400} />);
    fireEvent.click(getByTestId('DdViewTabs').querySelector('[data-view="flamegraph"]')!);
    // 选中 s7（GET /order），再聚焦
    fireEvent.click(container.querySelector('[data-testid="DdFlameGraphView"] [data-span-id="s7"]')!);
    fireEvent.click(container.querySelector('[data-action="focus-selected"]')!);
    // re-root：祖先 s1 不再在火焰图，s7 仍在
    const flame = () => container.querySelector('[data-testid="DdFlameGraphView"]')!;
    expect(flame().querySelector('[data-span-id="s1"]')).toBeNull();
    expect(flame().querySelector('[data-span-id="s7"]')).toBeTruthy();
    // 重置聚焦 → s1 回来
    fireEvent.click(container.querySelector('[data-action="reset-focus"]')!);
    expect(flame().querySelector('[data-span-id="s1"]')).toBeTruthy();
  });

  it('CR-F1：pin 高亮后切 Color by 维度，不致整图全灰（孤儿 key 守卫）', () => {
    const { container, getByTestId } = renderApp(<TraceTimeline trace={mockTrace} height={400} />);
    fireEvent.click(getByTestId('DdViewTabs').querySelector('[data-view="flamegraph"]')!);
    const flame = () => container.querySelector('[data-testid="DdFlameGraphView"]')!;
    const mainDimmed = () =>
      Array.from(flame().querySelectorAll('[data-testid="FlameRect"][data-dimmed="true"]')).length;
    // pin 一个 service 组 → 其余帧灰显（正常）
    fireEvent.click(container.querySelector('[data-testid="DdFlameLegendRow"]')!);
    expect(mainDimmed()).toBeGreaterThan(0);
    // 切 Color by → Host：旧 service key 在 host 维度变孤儿，守卫应清高亮 → 无帧灰显
    fireEvent.change(container.querySelector('[data-testid="DdColorBy"] select') as HTMLSelectElement, {
      target: { value: 'host' },
    });
    expect(mainDimmed()).toBe(0);
  });
});
