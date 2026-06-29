import { fireEvent, render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createTheme, ThemeProvider } from '../theme';

import { DdTimelineCollapser } from './DdTimelineCollapser';

const theme = createTheme({ colorMode: 'light' });

describe('DdTimelineCollapser', () => {
  it('4 按钮触发对应回调', () => {
    const onExpandAll = vi.fn();
    const onCollapseAll = vi.fn();
    const onExpandOne = vi.fn();
    const onCollapseOne = vi.fn();
    const { getByLabelText } = render(
      createElement(ThemeProvider, {
        theme,
        children: (
          <DdTimelineCollapser
            onExpandAll={onExpandAll}
            onCollapseAll={onCollapseAll}
            onExpandOne={onExpandOne}
            onCollapseOne={onCollapseOne}
          />
        ),
      })
    );
    fireEvent.click(getByLabelText('expand all'));
    fireEvent.click(getByLabelText('collapse all'));
    fireEvent.click(getByLabelText('expand one level'));
    fireEvent.click(getByLabelText('collapse one level'));
    expect(onExpandAll).toHaveBeenCalledTimes(1);
    expect(onCollapseAll).toHaveBeenCalledTimes(1);
    expect(onExpandOne).toHaveBeenCalledTimes(1);
    expect(onCollapseOne).toHaveBeenCalledTimes(1);
  });
});
