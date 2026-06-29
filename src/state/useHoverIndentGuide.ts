// 缩进竖线 hover 共享态（本项目自研）——多行共享同一祖先竖线时需统一高亮，故用一个 spanID 集合记录当前被 hover 的竖线。
// 每次增删返回新 Set 引用（AD-4 不可变；引擎 memoizeOne 依赖引用相等判失效）。
import { useCallback, useState } from 'react';

export function useHoverIndentGuide() {
  const [hoverIndentGuideIds, setHoverIndentGuideIds] = useState<Set<string>>(() => new Set());

  const addHoverIndentGuideId = useCallback((spanID: string) => {
    setHoverIndentGuideIds((prev) => {
      const next = new Set(prev);
      next.add(spanID);
      return next;
    });
  }, []);

  const removeHoverIndentGuideId = useCallback((spanID: string) => {
    setHoverIndentGuideIds((prev) => {
      if (!prev.has(spanID)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(spanID);
      return next;
    });
  }, []);

  return { hoverIndentGuideIds, addHoverIndentGuideId, removeHoverIndentGuideId };
}
