// 瀑布条（FR-24 / UX-DR1）：left/width 按 viewBounds 投影，仅顶圆角 2px、高 ~19px、无边框、上下 gap。
import { css } from '@emotion/css';

import type { RenderableRow } from '../core';
import { useStyles2, type Theme } from '../theme';
import { formatDuration } from '../utils';

const getStyles = (theme: Theme) => ({
  container: css({
    label: 'DdSpanBarContainer',
    position: 'relative',
    height: '100%',
    width: '100%',
  }),
  bar: css({
    label: 'DdSpanBar',
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    height: theme.trace.barHeight,
    minWidth: 2,
    borderRadius: theme.trace.barRadius,
    border: 'none',
  }),
  label: css({
    label: 'DdSpanBarDuration',
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    fontFamily: theme.trace.fontFamily,
    fontSize: 11,
    color: theme.colors.text.secondary,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  }),
  // 关键路径区段（Story 4.3）——条底部高对比描边带，叠在 bar 上。
  cp: css({
    label: 'DdSpanBarCriticalPath',
    position: 'absolute',
    bottom: `calc(50% - ${theme.trace.barHeight / 2}px)`,
    height: 3,
    background: theme.isDark ? '#fff' : '#111',
    pointerEvents: 'none',
  }),
});

interface Props {
  row: RenderableRow;
  color: string;
}

export function DdSpanBar({ row, color }: Props) {
  const styles = useStyles2(getStyles);
  const { start, end } = row.viewBounds;
  const leftPct = Math.max(0, Math.min(100, start * 100));
  const rightPct = Math.max(0, Math.min(100, end * 100));
  const widthPct = Math.max(0, rightPct - leftPct);
  // 时长标签贴条右侧；条若靠右则改贴左侧，避免溢出。
  const labelOnLeft = rightPct > 88;

  // 关键路径区段：把绝对时间戳投影回 view 分数（与 span 同一映射）。
  const { span } = row;
  const cpSegments = (row.criticalPathSections ?? [])
    .map((sec) => {
      const f0 = span.duration ? (sec.section_start - span.startTime) / span.duration : 0;
      const f1 = span.duration ? (sec.section_end - span.startTime) / span.duration : 0;
      const segLeft = (start + f0 * (end - start)) * 100;
      const segRight = (start + f1 * (end - start)) * 100;
      const l = Math.max(0, Math.min(100, Math.min(segLeft, segRight)));
      const r = Math.max(0, Math.min(100, Math.max(segLeft, segRight)));
      return { left: l, width: Math.max(0, r - l) };
    })
    .filter((s) => s.width > 0);

  return (
    <div className={styles.container}>
      <div className={styles.bar} style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: color }} />
      {cpSegments.map((s, i) => (
        <div key={i} className={styles.cp} style={{ left: `${s.left}%`, width: `${s.width}%` }} data-testid="cp-seg" />
      ))}
      <span
        className={styles.label}
        style={labelOnLeft ? { right: `${100 - leftPct}%`, marginRight: 6 } : { left: `${rightPct}%`, marginLeft: 6 }}
      >
        {formatDuration(row.span.duration)}
      </span>
    </div>
  );
}
