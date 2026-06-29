import { describe, it, expect } from 'vitest';

import { VERSION } from './index';

describe('trace-timeline scaffold', () => {
  it('暴露 VERSION 占位导出', () => {
    expect(VERSION).toBe('0.0.0');
  });
});
