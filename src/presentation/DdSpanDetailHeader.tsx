// 详情顶部 span header（Story 3.4）——对齐 Datadog：服务 chip(通用色块图标)+operationName +
// 右侧 耗时 + "100% total exec time" + exec 进度条 + 折叠。不复制 Datadog 商标/logo。
import { css } from '@emotion/css';
import type { ReactNode } from 'react';

import { useStyles2, type Theme } from '../theme';
import { formatDuration } from '../utils';

const getStyles = (theme: Theme) => ({
  header: css({
    label: 'DdSpanDetailHeader',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderBottom: `1px solid ${theme.trace.detail.border}`,
  }),
  chip: css({
    label: 'DdSpanHeaderChip',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '1px 8px 1px 4px',
    border: `1px solid ${theme.trace.detail.border}`,
    borderRadius: 4,
    fontSize: 13,
    color: theme.colors.text.primary,
    flex: 'none',
  }),
  chipIcon: css({ label: 'DdSpanHeaderChipIcon', width: 12, height: 12, borderRadius: 3, flex: 'none' }),
  op: css({ label: 'DdSpanHeaderOp', fontWeight: theme.typography.fontWeightMedium, fontSize: 14, color: theme.colors.text.primary, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
  right: css({ label: 'DdSpanHeaderRight', marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flex: 'none' }),
  timing: css({ label: 'DdSpanHeaderTiming', display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12, color: theme.colors.text.primary }),
  duration: css({ fontWeight: theme.typography.fontWeightMedium }),
  execLabel: css({ color: theme.trace.detail.label }),
  execBar: css({ label: 'DdSpanHeaderExecBar', width: 160, height: 3, borderRadius: 2, background: theme.trace.detail.link }),
  close: css({
    label: 'DdSpanHeaderClose',
    cursor: 'pointer',
    color: theme.trace.detail.label,
    background: 'none',
    border: 'none',
    fontSize: 13,
    padding: '0 4px',
    '&:hover': { color: theme.colors.text.primary },
  }),
});

interface Props {
  serviceName: string;
  operationName: string;
  duration: number;
  /** 服务色（用作 chip 图标色块）。 */
  color: string;
  /** 右侧动作槽（分享/链接等 stub 按钮，Story 5.4）。 */
  actions?: ReactNode;
  onClose: () => void;
}

export function DdSpanDetailHeader({ serviceName, operationName, duration, color, actions, onClose }: Props) {
  const styles = useStyles2(getStyles);
  return (
    <div className={styles.header} data-testid="DdSpanDetailHeader">
      <span className={styles.chip}>
        <span className={styles.chipIcon} style={{ background: color }} />
        {serviceName}
      </span>
      <span className={styles.op} title={operationName}>
        {operationName}
      </span>
      <span className={styles.right}>
        <span className={styles.timing}>
          <span className={styles.duration}>{formatDuration(duration)}</span>
          <span className={styles.execLabel}>100% total exec time</span>
        </span>
        <span className={styles.execBar} />
      </span>
      {actions}
      <button className={styles.close} onClick={onClose} title="关闭详情">
        ✕
      </button>
    </div>
  );
}
