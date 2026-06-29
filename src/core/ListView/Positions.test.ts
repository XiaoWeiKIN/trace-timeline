import { describe, expect, it } from 'vitest';

import Positions from './Positions';

const H = 28;
const constHeight = () => H;

describe('Positions', () => {
  it('calcHeights/getRowPosition 累积 y 正确', () => {
    const p = new Positions(0);
    p.profileData(10);
    p.calcHeights(9, constHeight);
    expect(p.getRowPosition(0, constHeight)).toEqual({ height: H, y: 0 });
    expect(p.getRowPosition(5, constHeight)).toEqual({ height: H, y: 5 * H });
    expect(p.getRowPosition(9, constHeight)).toEqual({ height: H, y: 9 * H });
  });

  it('findFloorIndex 二分定位到 y 所在行', () => {
    const p = new Positions(0);
    p.profileData(10);
    p.calcHeights(9, constHeight);
    // ys = [0,28,56,84,112,140,...]；y=150 落在 index 5 (140) 与 index 6 (168) 之间 → 5
    expect(p.findFloorIndex(150, constHeight)).toBe(5);
    expect(p.findFloorIndex(0, constHeight)).toBe(0);
    // y 恰在行边界 ys[5]=140 时上游 floor 取下界行 → 4
    expect(p.findFloorIndex(5 * H, constHeight)).toBe(4);
  });

  it('getEstimatedHeight 全量已知时返回精确总高', () => {
    const p = new Positions(0);
    p.profileData(4);
    p.calcHeights(3, constHeight);
    expect(p.getEstimatedHeight()).toBe(4 * H);
  });

  it('confirmHeight 高度变化时顺移后续 y', () => {
    const p = new Positions(0);
    p.profileData(5);
    p.calcHeights(4, constHeight);
    // 把 index 1 的高度改成 28+10
    const taller = (i: number) => (i === 1 ? H + 10 : H);
    p.confirmHeight(1, taller);
    expect(p.getRowPosition(2, taller).y).toBe(2 * H + 10);
  });
});
