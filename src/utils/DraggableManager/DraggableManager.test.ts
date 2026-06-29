import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import DraggableManager from './DraggableManager';
import EUpdateTypes from './EUpdateTypes';
import type { DraggableBounds } from './types';

const BOUNDS: DraggableBounds = { clientXLeft: 100, width: 200, minValue: 0, maxValue: 1 };

function makeManager(overrides = {}) {
  const getBounds = vi.fn(() => BOUNDS);
  const cbs = {
    onMouseEnter: vi.fn(),
    onMouseLeave: vi.fn(),
    onMouseMove: vi.fn(),
    onDragStart: vi.fn(),
    onDragMove: vi.fn(),
    onDragEnd: vi.fn(),
  };
  const dm = new DraggableManager({ getBounds, resetBoundsOnResize: false, ...cbs, ...overrides });
  return { dm, getBounds, cbs };
}

function evt(type: string, clientX: number, button = 0) {
  return { type, clientX, button } as unknown as React.MouseEvent;
}

describe('DraggableManager', () => {
  let dm: DraggableManager;
  let cbs: ReturnType<typeof makeManager>['cbs'];

  beforeEach(() => {
    ({ dm, cbs } = makeManager());
  });
  afterEach(() => dm.dispose());

  it('_getPosition 把 clientX 映射到 [0,1] 并按 min/max 裁剪', () => {
    // clientX=200 → x=100 → value=0.5
    expect(dm._getPosition(200)).toEqual({ value: 0.5, x: 100 });
    // 超左：clientX=0 → value 应被裁到 minValue=0
    expect(dm._getPosition(0)).toEqual({ value: 0, x: 0 });
    // 超右：clientX=999 → value 应被裁到 maxValue=1，x=width
    expect(dm._getPosition(999)).toEqual({ value: 1, x: 200 });
  });

  it('mousedown→mousemove→mouseup 触发 DragStart/Move/End 生命周期', () => {
    dm.handleMouseDown(evt('mousedown', 200));
    expect(dm.isDragging()).toBe(true);
    expect(cbs.onDragStart).toHaveBeenCalledTimes(1);
    expect(cbs.onDragStart.mock.calls[0][0]).toMatchObject({ type: EUpdateTypes.DragStart, value: 0.5 });

    // mousemove 经 window 监听器派发（drag 中）
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 300, button: 0 }));
    expect(cbs.onDragMove).toHaveBeenCalledTimes(1);
    expect(cbs.onDragMove.mock.calls[0][0]).toMatchObject({ type: EUpdateTypes.DragMove, value: 1 });

    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 250, button: 0 }));
    expect(cbs.onDragEnd).toHaveBeenCalledTimes(1);
    expect(dm.isDragging()).toBe(false);
  });

  it('非左键 mousedown 不开始拖拽', () => {
    dm.handleMouseDown(evt('mousedown', 200, 1));
    expect(dm.isDragging()).toBe(false);
    expect(cbs.onDragStart).not.toHaveBeenCalled();
  });

  it('minor 事件（mousemove/enter/leave）在非拖拽态触发对应回调', () => {
    dm.handleMouseMove(evt('mousemove', 200));
    expect(cbs.onMouseMove).toHaveBeenCalledTimes(1);
    dm.handleMouseEnter(evt('mouseenter', 200));
    expect(cbs.onMouseEnter).toHaveBeenCalledTimes(1);
    dm.handleMouseLeave(evt('mouseleave', 200));
    expect(cbs.onMouseLeave).toHaveBeenCalledTimes(1);
  });

  it('resetBounds 使缓存失效，getBounds 重新调用', () => {
    const { dm: dm2, getBounds } = makeManager();
    dm2._getPosition(150);
    expect(getBounds).toHaveBeenCalledTimes(1);
    dm2._getPosition(160);
    expect(getBounds).toHaveBeenCalledTimes(1); // 缓存
    dm2.resetBounds();
    dm2._getPosition(170);
    expect(getBounds).toHaveBeenCalledTimes(2);
    dm2.dispose();
  });
});
