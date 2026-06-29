// 火焰图时间轴 ruler（Story 6.3 / Epic 6）——复用 DdTicks 数学，定高带状容器显示 ms 刻度。
import { css } from '@emotion/css';

import { useStyles2, type Theme } from '../theme';

import { DdTicks } from './DdTicks';

const getStyles = (theme: Theme) => ({
  ruler: css({
    label: 'DdFlameRuler',
    position: 'relative',
    height: 22,
    borderBottom: `1px solid ${theme.colors.border.weak}`,
    background: theme.colors.background.primary,
  }),
});

export interface DdFlameRulerProps {
  numTicks: number;
  /** trace 总时长（微秒）= trace.duration。 */
  viewDuration: number;
  viewStart?: number;
  viewEnd?: number;
}

export function DdFlameRuler({ numTicks, viewDuration, viewStart = 0, viewEnd = 1 }: DdFlameRulerProps) {
  const styles = useStyles2(getStyles);
  return (
    <div className={styles.ruler} data-testid="DdFlameRuler">
      <DdTicks numTicks={numTicks} viewDuration={viewDuration} viewStart={viewStart} viewEnd={viewEnd} />
    </div>
  );
}
