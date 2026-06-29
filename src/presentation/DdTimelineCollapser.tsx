// 折叠/展开按钮组（FR-5）——全展开/全折叠/逐层展开/逐层折叠。放在表头标签列（datadog-visual-spec §6）。
import { css } from '@emotion/css';

import { useStyles2, type Theme } from '../theme';
import { Icon, Tooltip } from '../ui';

const getStyles = (theme: Theme) => ({
  root: css({
    label: 'DdTimelineCollapser',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    marginRight: 8,
  }),
  btn: css({
    label: 'DdCollapserBtn',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    border: 'none',
    background: 'transparent',
    borderRadius: theme.shape.radius.sm,
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    padding: 0,
    '&:hover': { background: theme.colors.background.primary, color: theme.colors.text.primary },
  }),
});

export interface DdTimelineCollapserProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExpandOne: () => void;
  onCollapseOne: () => void;
}

export function DdTimelineCollapser({
  onExpandAll,
  onCollapseAll,
  onExpandOne,
  onCollapseOne,
}: DdTimelineCollapserProps) {
  const styles = useStyles2(getStyles);
  return (
    <span className={styles.root}>
      <Tooltip content="展开一层">
        <button type="button" className={styles.btn} onClick={onExpandOne} aria-label="expand one level">
          <Icon name="angle-down" size={14} />
        </button>
      </Tooltip>
      <Tooltip content="折叠一层">
        <button type="button" className={styles.btn} onClick={onCollapseOne} aria-label="collapse one level">
          <Icon name="angle-up" size={14} />
        </button>
      </Tooltip>
      <Tooltip content="全部展开">
        <button type="button" className={styles.btn} onClick={onExpandAll} aria-label="expand all">
          <Icon name="angle-double-down" size={14} />
        </button>
      </Tooltip>
      <Tooltip content="全部折叠">
        <button type="button" className={styles.btn} onClick={onCollapseAll} aria-label="collapse all">
          <Icon name="angle-double-up" size={14} />
        </button>
      </Tooltip>
    </span>
  );
}
