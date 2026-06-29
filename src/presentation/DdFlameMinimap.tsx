// 火焰图 minimap（Story 6.5 + 6.6 高保真对齐）——整 trace 缩略 + 视口框 + 点击/拖拽定位 + 控件停靠 + 可收起。
// 对齐 Datadog profiling_minimap：浮层小框覆盖火焰图左上角；浅蓝调遮罩 + 透明蓝边视口框；缩放控件停靠 minimap 内；cursor grab 抓拖平移。
import { css } from '@emotion/css';
import { useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react';

import { computeFlameLayout } from '../core';
import type { Trace } from '../model';
import { useStyles2, type Theme } from '../theme';

import { defaultColorAccessor, type ColorAccessor } from './colorAccessor';
import { DdFlameControls } from './DdFlameControls';

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

const getStyles = (theme: Theme) => ({
  panel: css({
    label: 'DdFlameMinimap',
    position: 'absolute',
    zIndex: 5,
    width: theme.trace.flame.minimapWidth,
    background: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.md,
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    fontFamily: theme.trace.fontFamily,
    overflow: 'hidden',
  }),
  canvas: css({ label: 'DdFlameMinimapCanvas', position: 'relative', width: '100%', cursor: 'grab', overflow: 'hidden', '&:active': { cursor: 'grabbing' } }),
  rect: css({ label: 'DdFlameMiniRect', position: 'absolute', borderRadius: 1 }),
  mask: css({
    label: 'DdFlameMiniMask',
    position: 'absolute',
    inset: 0,
    background: theme.trace.flame.minimapMask,
    pointerEvents: 'none',
  }),
  viewport: css({
    label: 'DdFlameMiniViewport',
    position: 'absolute',
    top: 0,
    bottom: 0,
    background: 'transparent',
    border: `1px solid ${theme.trace.flame.minimapViewportBorder}`,
    boxSizing: 'border-box',
    pointerEvents: 'none',
  }),
  footer: css({
    label: 'DdFlameMinimapFooter',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    borderTop: `1px solid ${theme.colors.border.weak}`,
    background: theme.colors.background.secondary,
  }),
  collapseBtn: css({
    label: 'DdFlameMinimapCollapse',
    fontFamily: 'inherit',
    fontSize: 11,
    color: theme.colors.text.secondary,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 6px',
    whiteSpace: 'nowrap',
  }),
  collapsed: css({
    label: 'DdFlameMinimapCollapsed',
    position: 'absolute',
    zIndex: 5,
    background: theme.colors.background.primary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.md,
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    fontFamily: theme.trace.fontFamily,
    fontSize: 11,
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    padding: '3px 8px',
  }),
});

export interface DdFlameMinimapProps {
  trace: Trace;
  colorAccessor?: ColorAccessor;
  viewStart: number;
  viewEnd: number;
  onViewRangeChange: (viewStart: number, viewEnd: number) => void;
  /** 聚焦根 span（Story 6.7）：概览只显示该子树（铺满 minimap）。 */
  focusRootSpanId?: string;
  /** minimap 概览画布高（px），默认 64。 */
  height?: number;
  /** 停靠控件回调（Story 6.6）。 */
  onZoomFull: () => void;
  onZoomSelected: () => void;
  onFocusSelected: () => void;
  hasSelection: boolean;
  /** 聚焦态 + 重置（Story 6.7），转发给停靠的 DdFlameControls。 */
  isFocused?: boolean;
  onResetFocus?: () => void;
  className?: string;
  /** 浮层定位（由父传入 top/left）。 */
  style?: CSSProperties;
}

export function DdFlameMinimap({
  trace,
  colorAccessor,
  viewStart,
  viewEnd,
  onViewRangeChange,
  focusRootSpanId,
  height = 64,
  onZoomFull,
  onZoomSelected,
  onFocusSelected,
  hasSelection,
  isFocused = false,
  onResetFocus,
  className,
  style,
}: DdFlameMinimapProps) {
  const styles = useStyles2(getStyles);
  const theme = useStyles2((t) => t);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const [collapsed, setCollapsed] = useState(false);

  const layout = useMemo(() => computeFlameLayout(trace, undefined, focusRootSpanId), [trace, focusRootSpanId]);
  const spanById = useMemo(() => new Map(trace.spans.map((s) => [s.spanID, s])), [trace]);
  const resolveColor = colorAccessor ?? defaultColorAccessor(theme);
  const miniRowH = height / (layout.maxDepth + 1);

  const jumpTo = (clientX: number) => {
    const el = canvasRef.current;
    if (!el) {
      return;
    }
    const r = el.getBoundingClientRect();
    const frac = r.width > 0 ? clamp((clientX - r.left) / r.width, 0, 1) : 0;
    const w = viewEnd - viewStart;
    const ns = clamp(frac - w / 2, 0, 1 - w);
    onViewRangeChange(ns, ns + w);
  };

  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) {
      return;
    }
    draggingRef.current = true;
    jumpTo(e.clientX);
  };
  const onMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (draggingRef.current) {
      jumpTo(e.clientX);
    }
  };
  const stop = () => {
    draggingRef.current = false;
  };

  if (collapsed) {
    return (
      <button
        type="button"
        className={className ? `${styles.collapsed} ${className}` : styles.collapsed}
        style={style}
        data-testid="FlameMinimapToggle"
        onClick={() => setCollapsed(false)}
      >
        展开 minimap
      </button>
    );
  }

  return (
    <div className={className ? `${styles.panel} ${className}` : styles.panel} style={style} data-testid="DdFlameMinimap">
      <div
        ref={canvasRef}
        className={styles.canvas}
        style={{ height }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stop}
        onMouseLeave={stop}
      >
        {layout.rows.map((row) => {
          const span = spanById.get(row.spanID);
          if (!span) {
            return null;
          }
          return (
            <div
              key={row.spanID}
              data-testid="FlameMiniRect"
              className={styles.rect}
              style={{
                top: row.depth * miniRowH,
                height: Math.max(miniRowH - 0.5, 1),
                left: `${row.left * 100}%`,
                width: `${Math.max(row.width * 100, 0.3)}%`,
                background: resolveColor(span),
              }}
            />
          );
        })}
        {/* 遮罩反转：浅蓝调覆盖全图（pointer-events:none，不挡拖拽） */}
        <div className={styles.mask} />
        {/* 视口框：透明 + 蓝边 */}
        <div
          className={styles.viewport}
          data-testid="FlameMinimapViewport"
          style={{ left: `${viewStart * 100}%`, width: `${(viewEnd - viewStart) * 100}%` }}
        />
      </div>
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.collapseBtn}
          data-testid="FlameMinimapToggle"
          onClick={() => setCollapsed(true)}
        >
          收起
        </button>
        <DdFlameControls
          onZoomFull={onZoomFull}
          onZoomSelected={onZoomSelected}
          onFocusSelected={onFocusSelected}
          hasSelection={hasSelection}
          isFocused={isFocused}
          onResetFocus={onResetFocus}
        />
      </div>
    </div>
  );
}
