import { describe, expect, it } from 'vitest';

import { formatDuration } from './date';
import { toFloatPrecision } from './number';

describe('formatDuration', () => {
  it('µs/ms/s 小数单位', () => {
    expect(formatDuration(500)).toBe('500μs');
    expect(formatDuration(1500)).toBe('1.5ms');
    expect(formatDuration(2_000_000)).toBe('2s');
  });
  it('复合单位 d/h', () => {
    const us = (2 * 86400 + 3 * 3600) * 1_000_000;
    expect(formatDuration(us)).toBe('2d 3h');
  });
});

describe('toFloatPrecision', () => {
  it('按精度截断', () => {
    expect(toFloatPrecision(3.55, 1)).toBe(3.5);
    expect(toFloatPrecision(0.04422, 2)).toBe(0.04);
  });
});
