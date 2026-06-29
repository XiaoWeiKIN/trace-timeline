import { describe, expect, it } from 'vitest';

import { mockTrace } from '../model';

import { computeFlameLayout } from './flameLayout';

describe('computeFlameLayout', () => {
  it('每个 span 出一行，depth 与 span.depth 一致', () => {
    const { rows, maxDepth } = computeFlameLayout(mockTrace);
    expect(rows.length).toBe(mockTrace.spans.length);
    rows.forEach((row, i) => {
      expect(row.depth).toBe(mockTrace.spans[i].depth);
    });
    expect(maxDepth).toBe(Math.max(...mockTrace.spans.map((s) => s.depth)));
  });

  it('全视图：width ≈ duration/trace.duration，root left≈0', () => {
    const { rows } = computeFlameLayout(mockTrace);
    rows.forEach((row, i) => {
      const span = mockTrace.spans[i];
      const expectedWidth = span.duration / mockTrace.duration;
      expect(row.width).toBeCloseTo(expectedWidth, 5);
      const expectedLeft = (span.startTime - mockTrace.startTime) / mockTrace.duration;
      expect(row.left).toBeCloseTo(expectedLeft, 5);
    });
    // root（depth 0，startTime = trace.startTime）left≈0、width≈1
    const root = rows.find((_, i) => mockTrace.spans[i].depth === 0)!;
    expect(root.left).toBeCloseTo(0, 5);
    expect(root.width).toBeCloseTo(1, 5);
  });

  it('缩放视口 [0.25,0.75]：位置按窗口重映射', () => {
    const full = computeFlameLayout(mockTrace, { viewStart: 0, viewEnd: 1 });
    const zoom = computeFlameLayout(mockTrace, { viewStart: 0.25, viewEnd: 0.75 });
    // 窗口缩到一半 → 同一 span 宽度翻倍
    zoom.rows.forEach((row, i) => {
      expect(row.width).toBeCloseTo(full.rows[i].width * 2, 5);
    });
    // root 左缘从 0 移到 -0.5（视口起点在 root 内部）
    const rootIdx = mockTrace.spans.findIndex((s) => s.depth === 0);
    expect(zoom.rows[rootIdx].left).toBeCloseTo(-0.5, 5);
  });

  it('memoize：相同入参返回同一引用', () => {
    const a = computeFlameLayout(mockTrace);
    const b = computeFlameLayout(mockTrace);
    expect(a).toBe(b);
  });

  it('同深度并发兄弟时间重叠 → 严格 depth 共行（不 lane-pack，对齐 Datadog depth 模型）', () => {
    // mockTrace 中 s2[20–48.2ms] 与 s7[40–58.5ms] 同为 s1 的子（depth 1）、时间重叠 ~8.2ms。
    const { rows } = computeFlameLayout(mockTrace);
    const s2 = rows.find((r) => r.spanID === 's2')!;
    const s7 = rows.find((r) => r.spanID === 's7')!;
    expect(s2.depth).toBe(1);
    expect(s7.depth).toBe(1); // 同行
    // 时间区间重叠（s7 起点 < s2 终点）→ 严格 depth 下视觉重叠（Datadog 不下推泳道）
    expect(s7.left).toBeLessThan(s2.left + s2.width);
    expect(s7.left).toBeGreaterThan(s2.left);
  });

  it('退化区间（trace.duration=0）不产 NaN（M1 修复）', () => {
    const degen = { ...mockTrace, duration: 0 };
    const { rows } = computeFlameLayout(degen);
    expect(rows.length).toBe(mockTrace.spans.length);
    rows.forEach((r) => {
      expect(Number.isFinite(r.left)).toBe(true);
      expect(Number.isFinite(r.width)).toBe(true);
    });
  });

  it('focusRootSpanId（re-root，Story 6.7）：只取子树 + depth 重基 + root 铺满', () => {
    // s7 = GET /order（depth1），子树 = {s7,s8,s9}
    const { rows } = computeFlameLayout(mockTrace, undefined, 's7');
    const ids = rows.map((r) => r.spanID).sort();
    expect(ids).toEqual(['s7', 's8', 's9']);
    // 祖先 s1/s2 不在
    expect(rows.find((r) => r.spanID === 's1')).toBeUndefined();
    // root s7 depth 重基为 0、铺满
    const root = rows.find((r) => r.spanID === 's7')!;
    expect(root.depth).toBe(0);
    expect(root.left).toBeCloseTo(0, 5);
    expect(root.width).toBeCloseTo(1, 5);
    // 子孙 depth 重基（s8=1, s9=2）
    expect(rows.find((r) => r.spanID === 's8')!.depth).toBe(1);
    expect(rows.find((r) => r.spanID === 's9')!.depth).toBe(2);
  });
});
