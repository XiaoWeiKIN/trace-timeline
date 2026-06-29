import { describe, expect, it } from 'vitest';

import { getColorByKey } from './colorGenerator';
import { createTheme } from './createTheme';

describe('getColorByKey', () => {
  const theme = createTheme({ colorMode: 'light' });

  it('同 serviceName 多次取色稳定一致', () => {
    expect(getColorByKey('svc-a', theme)).toBe(getColorByKey('svc-a', theme));
  });

  it('返回的是调色板内的颜色', () => {
    const c = getColorByKey('svc-a', theme);
    expect(theme.trace.categoricalPalette).toContain(c);
  });

  it('不同 key 多数得到不同颜色', () => {
    const colors = ['alpha', 'bravo', 'charlie', 'delta', 'echo'].map((k) => getColorByKey(k, theme));
    expect(new Set(colors).size).toBeGreaterThan(1);
  });
});
