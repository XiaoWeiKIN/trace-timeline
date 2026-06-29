// 火焰图缩放控制（Story 6.4 / Epic 6）——对齐 Datadog：全览 / 放大到选中 / 聚焦选中。
import { css } from '@emotion/css';

import { useStyles2, type Theme } from '../theme';

const getStyles = (theme: Theme) => ({
  bar: css({
    label: 'DdFlameControls',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 10px',
    fontFamily: theme.trace.fontFamily,
  }),
  btn: css({
    label: 'DdFlameControlBtn',
    fontFamily: 'inherit',
    fontSize: 12,
    color: theme.colors.text.primary,
    background: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.sm,
    padding: '2px 8px',
    cursor: 'pointer',
    '&:disabled': { opacity: 0.45, cursor: 'default' },
  }),
});

export interface DdFlameControlsProps {
  onZoomFull: () => void;
  onZoomSelected: () => void;
  onFocusSelected: () => void;
  hasSelection: boolean;
  /** 当前是否处于聚焦（re-root）态（Story 6.7）。 */
  isFocused?: boolean;
  /** 重置聚焦回调（Story 6.7）。 */
  onResetFocus?: () => void;
}

export function DdFlameControls({
  onZoomFull,
  onZoomSelected,
  onFocusSelected,
  hasSelection,
  isFocused = false,
  onResetFocus,
}: DdFlameControlsProps) {
  const styles = useStyles2(getStyles);
  return (
    <div className={styles.bar} data-testid="DdFlameControls">
      <button type="button" className={styles.btn} onClick={onZoomFull} data-action="zoom-full">
        全览
      </button>
      <button
        type="button"
        className={styles.btn}
        onClick={onZoomSelected}
        disabled={!hasSelection}
        data-action="zoom-selected"
      >
        放大到选中
      </button>
      <button
        type="button"
        className={styles.btn}
        onClick={onFocusSelected}
        disabled={!hasSelection}
        data-action="focus-selected"
      >
        聚焦选中
      </button>
      {isFocused && (
        <button type="button" className={styles.btn} onClick={onResetFocus} data-action="reset-focus">
          重置聚焦
        </button>
      )}
    </div>
  );
}
