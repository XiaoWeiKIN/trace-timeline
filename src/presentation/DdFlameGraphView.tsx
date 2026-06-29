// Trace 火焰图视图（Epic 6）——按调用深度堆叠 + 横轴线性时间，对齐 Datadog Flame Graph。
// 渲染方式：绝对定位 div 矩形（非 canvas），复用既有 emotion 皮肤/配色/选中样式，且可被 RTL 测试。
// 布局几何来自 core computeFlameLayout（零皮肤）；颜色在本层算（AD-6）；行高走 theme.trace.flame（AD-7）。
// 6.1 静态渲染 · 6.2 点击联动（onSelectSpan）· 6.3 gridline + hover 竖线游标 + tooltip。
import { css, cx } from '@emotion/css';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';

import { computeFlameLayout, type FlameViewRange } from '../core';
import { getServiceDisplayName, type Trace, type TraceSpan } from '../model';
import { useStyles2, type Theme } from '../theme';
import { formatDuration } from '../utils';

import { defaultColorAccessor, type ColorAccessor } from './colorAccessor';
import { DdTicks } from './DdTicks';

const getStyles = (theme: Theme) => ({
  root: css({
    label: 'DdFlameGraphView',
    position: 'relative',
    width: '100%',
    fontFamily: theme.trace.fontFamily,
    overflow: 'hidden',
    boxSizing: 'border-box',
  }),
  grid: css({ label: 'DdFlameGrid', position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }),
  rect: css({
    label: 'DdFlameRect',
    position: 'absolute',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `0 ${theme.trace.flame.labelPadding}px`,
    fontSize: 12,
    color: '#fff',
    borderRadius: 2,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    cursor: 'default',
    border: 'none',
    textAlign: 'left',
    fontFamily: 'inherit',
  }),
  clickable: css({ label: 'DdFlameRectClickable', cursor: 'pointer' }),
  selected: css({
    label: 'DdFlameRectSelected',
    boxShadow: `inset 0 0 0 2px ${theme.trace.flame.selectedOutline}`,
  }),
  op: css({
    label: 'DdFlameOp',
    flex: '1 1 auto',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  dur: css({ label: 'DdFlameDur', flex: 'none', marginLeft: 8, opacity: 0.9 }),
  cursor: css({
    label: 'DdFlameCursor',
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    background: theme.colors.text.secondary,
    pointerEvents: 'none',
    zIndex: 3,
  }),
  cursorLabel: css({
    label: 'DdFlameCursorLabel',
    position: 'absolute',
    top: 0,
    transform: 'translateX(-50%)',
    padding: '0 4px',
    fontSize: 11,
    lineHeight: '16px',
    color: '#fff',
    background: theme.colors.text.secondary,
    borderRadius: 2,
    whiteSpace: 'nowrap',
  }),
  tooltip: css({
    label: 'DdFlameTooltip',
    position: 'absolute',
    zIndex: 4,
    pointerEvents: 'none',
    background: 'rgba(28,32,44,0.96)',
    color: '#fff',
    fontSize: 12,
    lineHeight: 1.4,
    padding: '6px 8px',
    borderRadius: 4,
    maxWidth: 320,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  }),
  ttOp: css({ label: 'DdFlameTtOp', fontWeight: 600, wordBreak: 'break-all' }),
  ttMeta: css({ label: 'DdFlameTtMeta', opacity: 0.8, marginTop: 2 }),
});

export interface DdFlameGraphViewProps {
  trace: Trace;
  /** 自定义着色（默认按 service）。 */
  colorAccessor?: ColorAccessor;
  /** 当前选中 span（描边高亮）。 */
  selectedSpanId?: string;
  /** 点矩形回调（Story 6.2：→ selectSpan → 共享底部抽屉）。 */
  onSelectSpan?: (spanID: string) => void;
  /** 缩放视口 [0,1]（默认全 trace）。 */
  viewRange?: FlameViewRange;
  /** 聚焦根 span（Story 6.7 re-root）：只渲子树 + depth 重基 + 时间映射到 root 区间。 */
  focusRootSpanId?: string;
  /** 缩放/平移回调（Story 6.4）：滚轮缩放 + 拖拽平移 → 新 viewRange。不传 → 无 pan/zoom。 */
  onViewRangeChange?: (viewStart: number, viewEnd: number) => void;
  /** 当前高亮分组 key（Story 7.1）：非匹配帧灰显为 theme.trace.flame.dimmedFill。null/undefined → 无灰显。 */
  highlightedGroupKey?: string | null;
  /** span → 分组 key（须与图例 LegendGroup.key 同口径，默认 service）。不传 → 不灰显。 */
  groupKeyForSpan?: (span: TraceSpan) => string;
  /** 悬停某帧 → 其分组 key（离开传 null）。驱动图例反向高亮（Story 7.1 AC4）。 */
  onSpanHover?: (key: string | null) => void;
  /** gridline 刻度数（Story 6.3），默认 5。 */
  numTicks?: number;
  className?: string;
  style?: CSSProperties;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const MIN_WINDOW = 0.01;

interface CursorState {
  x: number;
  label: string;
}
interface TooltipState {
  spanID: string;
  x: number;
  y: number;
}

export function DdFlameGraphView({
  trace,
  colorAccessor,
  selectedSpanId,
  onSelectSpan,
  viewRange,
  focusRootSpanId,
  onViewRangeChange,
  highlightedGroupKey,
  groupKeyForSpan,
  onSpanHover,
  numTicks = 5,
  className,
  style,
}: DdFlameGraphViewProps) {
  const styles = useStyles2(getStyles);
  const theme = useStyles2((t) => t);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [cursor, setCursor] = useState<CursorState | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const dragRef = useRef<{ startX: number; startVS: number; startVE: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  // 依赖原始数值而非 viewRange 对象（父级每渲染换新对象会废掉 memo，M3 修复）。
  const viewStart = viewRange?.viewStart ?? 0;
  const viewEnd = viewRange?.viewEnd ?? 1;
  const layout = useMemo(
    () => computeFlameLayout(trace, { viewStart, viewEnd }, focusRootSpanId),
    [trace, viewStart, viewEnd, focusRootSpanId]
  );
  const spanById = useMemo(() => new Map(trace.spans.map((s) => [s.spanID, s])), [trace]);

  const resolveColor = colorAccessor ?? defaultColorAccessor(theme);
  const { rowHeight, rowGap } = theme.trace.flame;
  const containerHeight = (layout.maxDepth + 1) * rowHeight;
  // 聚焦时游标时间相对 focus 根时长（Story 6.7）。
  const focusRoot = focusRootSpanId ? trace.spans.find((s) => s.spanID === focusRootSpanId) : undefined;
  const effectiveDuration = focusRoot ? focusRoot.duration : trace.duration;

  // 滚轮缩放（Story 6.4）——须原生非被动监听才能 preventDefault（React onWheel 默认 passive）。
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !onViewRangeChange) {
      return;
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const frac = r.width > 0 ? clamp((e.clientX - r.left) / r.width, 0, 1) : 0.5;
      const w = viewEnd - viewStart;
      const factor = e.deltaY < 0 ? 0.85 : 1 / 0.85;
      const nw = clamp(w * factor, MIN_WINDOW, 1);
      const anchor = viewStart + frac * w;
      let ns = anchor - frac * nw;
      let ne = ns + nw;
      if (ns < 0) {
        ns = 0;
        ne = nw;
      }
      if (ne > 1) {
        ne = 1;
        ns = 1 - nw;
      }
      onViewRangeChange(ns, ne);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onViewRangeChange, viewStart, viewEnd]);

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    // 新一次按下序列：清掉上一轮可能残留的 click 抑制（拖拽在背景/跨 rect 松开时 rect.onClick 不触发、
    // suppressClickRef 不会被消费，否则会吞掉下一次正常选中点击）。H1 修复。
    suppressClickRef.current = false;
    if (!onViewRangeChange || e.button !== 0) {
      return;
    }
    dragRef.current = { startX: e.clientX, startVS: viewStart, startVE: viewEnd, moved: false };
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = rootRef.current;
    if (!el) {
      return;
    }
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const frac = r.width > 0 ? clamp(x / r.width, 0, 1) : 0;
    const time = (viewStart + frac * (viewEnd - viewStart)) * effectiveDuration;
    setCursor({ x, label: formatDuration(time) });

    const drag = dragRef.current;
    if (drag && onViewRangeChange) {
      const dx = e.clientX - drag.startX;
      if (Math.abs(dx) > 3) {
        drag.moved = true;
      }
      if (r.width > 0) {
        const w = drag.startVE - drag.startVS;
        const shift = -(dx / r.width) * w;
        const ns = clamp(drag.startVS + shift, 0, 1 - w);
        onViewRangeChange(ns, ns + w);
      }
    } else {
      setTooltip((cur) => (cur ? { ...cur, x, y: e.clientY - r.top } : cur));
    }
  };

  const endDrag = () => {
    if (dragRef.current?.moved) {
      suppressClickRef.current = true;
    }
    dragRef.current = null;
  };

  const clearHover = () => {
    setCursor(null);
    setTooltip(null);
    onSpanHover?.(null);
    endDrag();
  };

  const hoveredSpan = tooltip ? spanById.get(tooltip.spanID) : undefined;

  return (
    <div
      ref={rootRef}
      className={className ? cx(styles.root, className) : styles.root}
      style={{ height: containerHeight, ...style }}
      data-testid="DdFlameGraphView"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={clearHover}
    >
      <div className={styles.grid}>
        <DdTicks numTicks={numTicks} viewDuration={trace.duration} viewStart={viewStart} viewEnd={viewEnd} showLabels={false} />
      </div>

      {layout.rows.map((row) => {
        const span = spanById.get(row.spanID);
        if (!span) {
          return null;
        }
        const isSelected = selectedSpanId === row.spanID;
        const dur = formatDuration(span.duration);
        const clickable = onSelectSpan != null;
        // 灰显（Story 7.1）：有高亮分组且本帧不属于该组 → 定值灰填充（非降透明/去饱和，实测对齐 Datadog）。
        const dimmed =
          highlightedGroupKey != null && groupKeyForSpan != null && groupKeyForSpan(span) !== highlightedGroupKey;
        const classes = [styles.rect];
        if (isSelected) {
          classes.push(styles.selected);
        }
        if (clickable) {
          classes.push(styles.clickable);
        }
        return (
          <div
            key={row.spanID}
            data-testid="FlameRect"
            data-span-id={row.spanID}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            className={cx(...classes)}
            data-dimmed={dimmed ? 'true' : undefined}
            style={{
              top: row.depth * rowHeight,
              height: rowHeight - rowGap,
              left: `${row.left * 100}%`,
              width: `${Math.max(row.width * 100, 0)}%`,
              background: dimmed ? theme.trace.flame.dimmedFill : resolveColor(span),
              color: dimmed ? theme.colors.text.secondary : '#fff',
            }}
            onMouseEnter={(e) => {
              // 拖拽平移进行中：抑制 rect 的 hover 副作用（否则 tooltip 卡在 enter 点、
              // 且 onSpanHover 让高亮分组在平移途中乱闪，CR-F6）。
              if (dragRef.current) {
                return;
              }
              const r = rootRef.current?.getBoundingClientRect();
              setTooltip({
                spanID: row.spanID,
                x: r ? e.clientX - r.left : 0,
                y: r ? e.clientY - r.top : 0,
              });
              onSpanHover?.(groupKeyForSpan ? groupKeyForSpan(span) : null);
            }}
            onClick={
              clickable
                ? () => {
                    if (suppressClickRef.current) {
                      suppressClickRef.current = false;
                      return;
                    }
                    onSelectSpan!(row.spanID);
                  }
                : undefined
            }
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSpan!(row.spanID);
                    }
                  }
                : undefined
            }
          >
            <span className={styles.op}>{span.operationName}</span>
            <span className={styles.dur}>{dur}</span>
          </div>
        );
      })}

      {cursor && (
        <div className={styles.cursor} style={{ left: cursor.x }} data-testid="FlameCursor">
          <span className={styles.cursorLabel}>{cursor.label}</span>
        </div>
      )}

      {tooltip && hoveredSpan && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
          data-testid="FlameTooltip"
        >
          <div className={styles.ttOp}>{hoveredSpan.operationName}</div>
          <div className={styles.ttMeta}>
            {getServiceDisplayName(hoveredSpan.process)} · {formatDuration(hoveredSpan.duration)}
          </div>
        </div>
      )}
    </div>
  );
}
