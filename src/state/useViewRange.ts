// 缩放视图区间状态（本项目自研）——记录当前显示的时间窗 `time.current=[start,end]`（归一化 0..1），
// 以及拖拽缩放过程中临时预览的 next 区间（updateNextViewRangeTime 浅合并进 time）。供瀑布/火焰图/minimap 共享。
import { useCallback, useState } from 'react';

import type { ViewRange, ViewRangeTimeUpdate } from '../core';

const INITIAL: ViewRange = { time: { current: [0, 1] } };

export function useViewRange() {
  const [viewRange, setViewRange] = useState<ViewRange>(INITIAL);

  // 提交确定的时间窗：替换 current。
  const updateViewRangeTime = useCallback((start: number, end: number) => {
    setViewRange((prev) => ({ ...prev, time: { current: [start, end] } }));
  }, []);

  // 拖拽中的预览更新：把部分字段（如 cursor/shiftStart/shiftEnd/reframe）浅合并进 time，不动 current。
  const updateNextViewRangeTime = useCallback((update: ViewRangeTimeUpdate) => {
    setViewRange((prev) => ({ ...prev, time: { ...prev.time, ...update } }));
  }, []);

  return { viewRange, updateViewRangeTime, updateNextViewRangeTime };
}
