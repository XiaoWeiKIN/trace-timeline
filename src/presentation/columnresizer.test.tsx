import { fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createTheme, ThemeProvider } from '../theme';

import { DdColumnResizer } from './DdColumnResizer';

const theme = createTheme({ colorMode: 'light' });

function mount(onChange: ReturnType<typeof vi.fn>, position = 0.3) {
  const utils = render(
    createElement(ThemeProvider, {
      theme,
      children: (
        <DdColumnResizer position={position} min={0.2} max={0.85} onChange={onChange} columnResizeHandleHeight={400} />
      ),
    })
  );
  const root = utils.getByTestId('DdColumnResizer');
  const dragger = utils.getByTestId('DdColumnResizer--dragger');
  // jsdom 无布局——根元素覆盖全宽 [0,100] → value = clientX/100。
  root.getBoundingClientRect = () =>
    ({ left: 0, width: 100, top: 0, right: 100, bottom: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  return { ...utils, dragger };
}

describe('DdColumnResizer', () => {
  it('拖拽分隔条松手提交新占比 onChange(value)', () => {
    const onChange = vi.fn();
    const { dragger } = mount(onChange, 0.3);

    fireEvent.mouseDown(dragger, { clientX: 30, button: 0 }); // DragStart @ 0.3
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 55, button: 0 })); // → 0.55
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 55, button: 0 }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toBeCloseTo(0.55);
  });

  it('越界拖拽被 min/max 钳制（拖到 95% → 钳到 max=0.85）', () => {
    const onChange = vi.fn();
    const { dragger } = mount(onChange, 0.3);

    fireEvent.mouseDown(dragger, { clientX: 30, button: 0 });
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 95, button: 0 }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 95, button: 0 }));

    expect(onChange.mock.calls[0][0]).toBeCloseTo(0.85);
  });

  it('向左越界被钳到 min=0.2（拖到 5%）', () => {
    const onChange = vi.fn();
    const { dragger } = mount(onChange, 0.3);

    fireEvent.mouseDown(dragger, { clientX: 30, button: 0 });
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 5, button: 0 }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 5, button: 0 }));

    expect(onChange.mock.calls[0][0]).toBeCloseTo(0.2);
  });
});
