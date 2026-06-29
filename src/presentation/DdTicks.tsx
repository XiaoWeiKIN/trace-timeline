// 时间刻度（FR-2）——移植 Ticks.tsx 数学：numTicks 等分，标签 formatDuration。
import { css } from '@emotion/css';

import { useStyles2, type Theme } from '../theme';
import { formatDuration } from '../utils';

const getStyles = (theme: Theme) => ({
  ticks: css({ label: 'DdTicks', position: 'absolute', inset: 0, pointerEvents: 'none' }),
  tick: css({
    label: 'DdTick',
    position: 'absolute',
    top: 0,
    height: '100%',
    width: 1,
    background: theme.colors.border.weak,
    '&:last-child': { width: 0 },
  }),
  label: css({
    label: 'DdTickLabel',
    position: 'absolute',
    left: 4,
    top: 2,
    fontFamily: theme.trace.fontFamily,
    fontSize: 12,
    color: theme.colors.text.secondary,
    whiteSpace: 'nowrap',
  }),
  labelEnd: css({ left: 'initial', right: 4 }),
});

interface Props {
  numTicks: number;
  /** trace 总时长（微秒）= trace.duration。 */
  viewDuration: number;
  /** 当前缩放视窗起点占比 [0,1]，默认 0（无缩放）。 */
  viewStart?: number;
  /** 当前缩放视窗终点占比 [0,1]，默认 1（无缩放）。 */
  viewEnd?: number;
  showLabels?: boolean;
}

export function DdTicks({ numTicks, viewDuration, viewStart = 0, viewEnd = 1, showLabels = true }: Props) {
  const styles = useStyles2(getStyles);
  const ticks = [];
  for (let i = 0; i < numTicks; i++) {
    const portion = i / (numTicks - 1);
    // 缩放态下，刻度标签反映视窗内的绝对耗时（viewStart..viewEnd 子区间映射回 trace 全程）。
    const labelPortion = viewStart + portion * (viewEnd - viewStart);
    ticks.push(
      <div key={portion} className={styles.tick} style={{ left: `${portion * 100}%` }}>
        {showLabels && (
          <span className={`${styles.label}${portion >= 1 ? ` ${styles.labelEnd}` : ''}`}>
            {formatDuration(labelPortion * viewDuration)}
          </span>
        )}
      </div>
    );
  }
  return <div className={styles.ticks}>{ticks}</div>;
}
