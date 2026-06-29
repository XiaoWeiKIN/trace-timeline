// 火焰图服务图例面板（Story 7.1）——对齐 Datadog Flame Graph 右侧 Color Legend。
// 列出各服务的 % Exec Time 排行，可悬停（临时高亮）/点击（持久高亮 toggle）某组，可收起。
// 高亮联动由 api 把 effectiveKey 回传给 DdFlameGraphView 做灰显（#C2C8DD）。
// 分组聚合来自 core computeLegendGroups（零皮肤）；色块用 colorAccessor 取组色（AD-6，与帧同源）。
import { css, cx } from '@emotion/css';
import { type CSSProperties } from 'react';

import { computeLegendGroups, type LegendDimension, type LegendMetric } from '../core';
import type { Trace } from '../model';
import { useStyles2, type Theme } from '../theme';

import { defaultColorAccessor, type ColorAccessor } from './colorAccessor';

const getStyles = (theme: Theme) => ({
  panel: css({
    label: 'DdFlameLegend',
    flex: 'none',
    width: 220,
    boxSizing: 'border-box',
    borderLeft: `1px solid ${theme.colors.border.weak}`,
    fontFamily: theme.trace.fontFamily,
    fontSize: 12,
    color: theme.colors.text.primary,
    overflowY: 'auto',
    userSelect: 'none',
  }),
  header: css({
    label: 'DdFlameLegendHeader',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    padding: '6px 10px',
    color: theme.colors.text.secondary,
    fontSize: 12,
    whiteSpace: 'nowrap',
  }),
  toggleBtn: css({
    label: 'DdFlameLegendToggleBtn',
    border: 'none',
    background: 'transparent',
    color: theme.trace.detail.link,
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 12,
    padding: 0,
    whiteSpace: 'nowrap',
  }),
  metricSelect: css({
    label: 'DdFlameLegendMetricSelect',
    border: 'none',
    background: 'transparent',
    color: theme.colors.text.secondary,
    fontFamily: 'inherit',
    fontSize: 12,
    cursor: 'pointer',
    outline: 'none',
    padding: 0,
  }),
  row: css({
    label: 'DdFlameLegendRow',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 10px',
    cursor: 'pointer',
    transition: 'opacity 120ms ease',
  }),
  dimmed: css({ label: 'DdFlameLegendRowDimmed', opacity: 0.4 }),
  highlighted: css({ label: 'DdFlameLegendRowHighlighted', opacity: 1 }),
  square: css({
    label: 'DdFlameLegendSquare',
    flex: 'none',
    width: 12,
    height: 12,
    borderRadius: 2,
  }),
  name: css({
    label: 'DdFlameLegendName',
    flex: '1 1 auto',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  numberAndBar: css({
    label: 'DdFlameLegendNumberAndBar',
    flex: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  }),
  percent: css({
    label: 'DdFlameLegendPercent',
    minWidth: 38,
    textAlign: 'right',
    color: theme.colors.text.secondary,
    fontVariantNumeric: 'tabular-nums',
  }),
  // 占比 bar——实测 Datadog：track 与 fill 均 30×12px、灰槽 rgba(197,203,219,0.5)、填充固定蓝 rgb(53,152,236)（所有行同色，非服务色）。
  barTrack: css({
    label: 'DdFlameLegendBarTrack',
    flex: 'none',
    width: 30,
    height: 12,
    borderRadius: 6,
    background: 'rgba(197,203,219,0.5)',
    overflow: 'hidden',
  }),
  barFill: css({
    label: 'DdFlameLegendBarFill',
    // display:block 必需——barFill 是 barTrack（非 flex 容器）的子 span，inline 时 width/height 百分比失效 → 塌成 0×0、填充不可见。
    display: 'block',
    height: '100%',
    background: 'rgb(53,152,236)',
    borderRadius: 6,
  }),
  collapsed: css({
    label: 'DdFlameLegendCollapsed',
    flex: 'none',
    padding: '6px 10px',
    textAlign: 'right',
  }),
});

export interface DdFlameLegendProps {
  trace: Trace;
  /** 自定义着色（默认按 service），用于色块取组色，与火焰图帧同源。 */
  colorAccessor?: ColorAccessor;
  /** 有效高亮 key（hover 或 pinned）→ 该行高亮、其余 dimmed。 */
  highlightedKey?: string | null;
  /** 悬停某行 → 临时高亮（进 key / 出 null）。 */
  onHoverChange?: (key: string | null) => void;
  /** 点击某行 → 持久高亮 toggle（由 api 决定与 pinned 比对）。 */
  onToggle?: (key: string) => void;
  /** 指标：'execTime'（% Exec Time，默认）/ 'spans'（计数，Story 7.2）。 */
  metric?: LegendMetric;
  /** 指标切换回调（Story 7.2）；传则表头渲染下拉，否则静态文本。 */
  onMetricChange?: (metric: LegendMetric) => void;
  /** 分组维度（Story 7.3：service/host/entity，默认 service）。 */
  dimension?: LegendDimension;
  /** 显隐（默认显示）；收起时只剩 Show Legend 角标。 */
  showLegend?: boolean;
  onShowLegendChange?: (show: boolean) => void;
  className?: string;
  style?: CSSProperties;
}

const fmtPercent = (r: number) => `${(r * 100).toFixed(1)}%`;

export function DdFlameLegend({
  trace,
  colorAccessor,
  highlightedKey,
  onHoverChange,
  onToggle,
  metric = 'execTime',
  onMetricChange,
  dimension = 'service',
  showLegend = true,
  onShowLegendChange,
  className,
  style,
}: DdFlameLegendProps) {
  const styles = useStyles2(getStyles);
  const theme = useStyles2((t) => t);
  const resolveColor: ColorAccessor = colorAccessor ?? defaultColorAccessor(theme);
  const spanById = new Map(trace.spans.map((s) => [s.spanID, s]));
  const groups = computeLegendGroups(trace, { dimension, metric });
  const metricLabel = metric === 'spans' ? 'Spans' : '% Exec Time';

  if (!showLegend) {
    return (
      <div className={styles.collapsed} style={style} data-testid="DdFlameLegendCollapsed">
        <button
          type="button"
          className={styles.toggleBtn}
          data-testid="DdFlameLegendToggle"
          onClick={() => onShowLegendChange?.(true)}
        >
          Show Legend
        </button>
      </div>
    );
  }

  const hasHighlight = highlightedKey != null;

  return (
    <div
      className={className ? cx(styles.panel, className) : styles.panel}
      style={style}
      data-testid="DdFlameLegend"
    >
      <div className={styles.header}>
        {onMetricChange ? (
          <select
            className={styles.metricSelect}
            data-testid="DdFlameLegendMetric"
            aria-label="图例指标"
            value={metric}
            onChange={(e) => onMetricChange(e.target.value as LegendMetric)}
          >
            <option value="execTime">% Exec Time</option>
            <option value="spans">Spans</option>
          </select>
        ) : (
          <span>{metricLabel}</span>
        )}
        <button
          type="button"
          className={styles.toggleBtn}
          data-testid="DdFlameLegendToggle"
          onClick={() => onShowLegendChange?.(false)}
        >
          Hide Legend
        </button>
      </div>

      {groups.map((g) => {
        const rep = spanById.get(g.representativeSpanId);
        const color = rep ? resolveColor(rep) : '#888';
        const isHl = highlightedKey === g.key;
        const rowCls = [styles.row];
        if (isHl) {
          rowCls.push(styles.highlighted);
        } else if (hasHighlight) {
          rowCls.push(styles.dimmed);
        }
        const number = metric === 'spans' ? String(g.spanCount) : fmtPercent(g.execTimeRatio);
        return (
          <div
            key={g.key}
            className={cx(...rowCls)}
            data-testid="DdFlameLegendRow"
            data-group-key={g.key}
            data-state={isHl ? 'highlighted' : hasHighlight ? 'dimmed' : 'default'}
            title={`${g.label} (${g.spanCount} span${g.spanCount === 1 ? '' : 's'})`}
            onMouseEnter={() => onHoverChange?.(g.key)}
            onMouseLeave={() => onHoverChange?.(null)}
            onClick={() => onToggle?.(g.key)}
          >
            <span className={styles.square} style={{ background: color }} />
            <span className={styles.name}>{g.label}</span>
            <span className={styles.numberAndBar}>
              <span className={styles.percent}>{number}</span>
              <span className={styles.barTrack}>
                <span className={styles.barFill} style={{ width: `${Math.min(g.ratio * 100, 100)}%` }} />
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
