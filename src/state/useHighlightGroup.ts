// 火焰图图例高亮状态（Story 7.1）——hover（临时/内存）+ pinned（持久/可 toggle）双层 + 图例显隐。
// 对齐 Datadog：悬停某组临时高亮（不持久），点击某组持久高亮（再点取消）。effective = hover ?? pinned。
// pinned 与 showLegend 各支持受控/非受控（与 useTraceTimelineState 三态范式一致）。
import { useCallback, useMemo, useState } from 'react';

export interface UseHighlightGroupOptions {
  /** 受控持久高亮 key（传则受控）。 */
  highlightedKey?: string | null;
  onHighlightChange?: (key: string | null) => void;
  /** 非受控初始持久高亮。 */
  defaultHighlightedKey?: string | null;
  /** 受控图例显隐（传则受控）。 */
  showLegend?: boolean;
  onShowLegendChange?: (show: boolean) => void;
  /** 非受控初始显隐（默认 true）。 */
  defaultShowLegend?: boolean;
}

export interface HighlightGroupState {
  /** 持久高亮（点击）。 */
  pinnedKey: string | null;
  /** 临时高亮（hover），不持久。 */
  hoveredKey: string | null;
  /** 有效高亮 = hover 优先，否则 pinned。火焰图灰显 / 图例行高亮都看它。 */
  effectiveKey: string | null;
  /** 设置临时高亮（hover 进/出；出传 null）。 */
  setHovered: (key: string | null) => void;
  /** 点击某组：与当前 pinned 相同则取消，否则置为该组（toggle）。 */
  togglePinned: (key: string) => void;
  /** 清空持久高亮（切维度/换 trace 时调，避免陈旧 key 变孤儿致全灰）。 */
  clearPinned: () => void;
  /** 图例显隐。 */
  showLegend: boolean;
  setShowLegend: (show: boolean) => void;
}

export function useHighlightGroup(opts: UseHighlightGroupOptions = {}): HighlightGroupState {
  const {
    highlightedKey,
    onHighlightChange,
    defaultHighlightedKey = null,
    showLegend,
    onShowLegendChange,
    defaultShowLegend = true,
  } = opts;

  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [pinnedUC, setPinnedUC] = useState<string | null>(defaultHighlightedKey);
  const [showUC, setShowUC] = useState<boolean>(defaultShowLegend);

  const pinnedControlled = highlightedKey !== undefined;
  const pinnedKey = pinnedControlled ? (highlightedKey as string | null) : pinnedUC;
  const showControlled = showLegend !== undefined;
  const showLegendVal = showControlled ? (showLegend as boolean) : showUC;

  const setHovered = useCallback((key: string | null) => {
    setHoveredKey(key);
  }, []);

  const togglePinned = useCallback(
    (key: string) => {
      const next = pinnedKey === key ? null : key;
      if (!pinnedControlled) {
        setPinnedUC(next);
      }
      onHighlightChange?.(next);
    },
    [pinnedKey, pinnedControlled, onHighlightChange]
  );

  const clearPinned = useCallback(() => {
    if (!pinnedControlled) {
      setPinnedUC(null);
    }
    if (pinnedKey != null) {
      onHighlightChange?.(null);
    }
  }, [pinnedControlled, pinnedKey, onHighlightChange]);

  const setShowLegend = useCallback(
    (show: boolean) => {
      if (!showControlled) {
        setShowUC(show);
      }
      onShowLegendChange?.(show);
    },
    [showControlled, onShowLegendChange]
  );

  const effectiveKey = hoveredKey ?? pinnedKey;

  return useMemo(
    () => ({
      pinnedKey,
      hoveredKey,
      effectiveKey,
      setHovered,
      togglePinned,
      clearPinned,
      showLegend: showLegendVal,
      setShowLegend,
    }),
    [pinnedKey, hoveredKey, effectiveKey, setHovered, togglePinned, clearPinned, showLegendVal, setShowLegend]
  );
}
