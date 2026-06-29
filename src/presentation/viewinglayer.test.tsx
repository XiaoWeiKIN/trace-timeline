import { fireEvent, render } from '@testing-library/react';
import { createElement, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { ViewRangeTime, ViewRangeTimeUpdate } from '../core';
import { createTheme, ThemeProvider } from '../theme';

import { DdViewingLayer } from './DdViewingLayer';

const theme = createTheme({ colorMode: 'light' });

/**
 * 有状态宿主——把 update 回写到 viewRangeTime 并重渲染，复现真实受控回环
 * （上游 `_handleReframeDragUpdate` 从 props.reframe 读 anchor，故必须有状态反馈）。
 */
function Host({
  initialCurrent,
  onCommit,
}: {
  initialCurrent: [number, number];
  onCommit: (start: number, end: number, src?: string) => void;
}) {
  const [time, setTime] = useState<ViewRangeTime>({ current: initialCurrent });
  const updateNextViewRangeTime = (update: ViewRangeTimeUpdate) =>
    setTime((t) => ({ ...t, ...update }));
  const updateViewRangeTime = (start: number, end: number, src?: string) => {
    onCommit(start, end, src);
    setTime({ current: [start, end] });
  };
  return (
    <DdViewingLayer
      boundsInvalidator={0.32}
      viewRangeTime={time}
      updateViewRangeTime={updateViewRangeTime}
      updateNextViewRangeTime={updateNextViewRangeTime}
    />
  );
}

function mount(initialCurrent: [number, number]) {
  const onCommit = vi.fn();
  const utils = render(
    createElement(ThemeProvider, { theme, children: <Host initialCurrent={initialCurrent} onCommit={onCommit} /> })
  );
  const layer = utils.getByTestId('DdViewingLayer');
  // jsdom 不计算布局——为 DraggableManager 提供确定 bounds（left=0, width=100）。
  layer.getBoundingClientRect = () =>
    ({ left: 0, width: 100, top: 0, right: 100, bottom: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  return { ...utils, layer, onCommit };
}

describe('DdViewingLayer', () => {
  it('在层上按下并拖拽出区间，松手产出 updateViewRangeTime(start,end)', () => {
    const { layer, onCommit } = mount([0, 1]);

    fireEvent.mouseDown(layer, { clientX: 20, button: 0 }); // value 0.2 → anchor 0.2
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 80, button: 0 })); // value 0.8
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 80, button: 0 }));

    expect(onCommit).toHaveBeenCalledTimes(1);
    const [start, end, src] = onCommit.mock.calls[0];
    expect(start).toBeCloseTo(0.2);
    expect(end).toBeCloseTo(0.8);
    expect(src).toBe('timeline-header');
  });

  it('反向拖拽（右→左）也产出归一化的 [start,end]', () => {
    const { layer, onCommit } = mount([0, 1]);

    fireEvent.mouseDown(layer, { clientX: 90, button: 0 }); // anchor 0.9
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 30, button: 0 }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 30, button: 0 }));

    const [start, end] = onCommit.mock.calls[0];
    expect(start).toBeCloseTo(0.3);
    expect(end).toBeCloseTo(0.9);
  });

  it('缩放态下拖拽值映射回全局子区间（current=[0.25,0.75]，拖满 → 全局 0.25..0.75）', () => {
    const { layer, onCommit } = mount([0.25, 0.75]);

    fireEvent.mouseDown(layer, { clientX: 0, button: 0 }); // value 0 → 全局 0.25
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, button: 0 })); // value 1 → 全局 0.75
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 100, button: 0 }));

    const [start, end] = onCommit.mock.calls[0];
    expect(start).toBeCloseTo(0.25);
    expect(end).toBeCloseTo(0.75);
  });
});
