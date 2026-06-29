// 搜索栏（Story 4.1）——对齐 Datadog「Filter spans by any attribute」：
// 输入框 + 命中计数 + 上/下命中导航 + 只看匹配开关。
import { css } from '@emotion/css';

import type { SearchState } from '../state';
import { useStyles2, type Theme } from '../theme';
import { Icon } from '../ui';

import { DdColorByDropdown, type ColorByDimension } from './DdColorByDropdown';

const getStyles = (theme: Theme) => ({
  bar: css({
    label: 'DdSearchBar',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: theme.spacing(1),
    fontFamily: theme.trace.fontFamily,
    fontSize: 13,
    borderBottom: `1px solid ${theme.colors.border.weak}`,
    background: theme.colors.background.primary,
  }),
  inputWrap: css({
    label: 'DdSearchInputWrap',
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  }),
  searchIcon: css({ label: 'DdSearchIcon', position: 'absolute', left: 8, color: theme.colors.text.secondary, display: 'inline-flex', pointerEvents: 'none' }),
  input: css({
    label: 'DdSearchInput',
    width: '100%',
    height: 28,
    boxSizing: 'border-box',
    padding: '0 8px 0 28px',
    border: `1px solid ${theme.colors.border.strong}`,
    borderRadius: theme.shape.radius.md,
    background: theme.colors.background.primary,
    color: theme.colors.text.primary,
    fontFamily: theme.trace.fontFamily,
    fontSize: 13,
    outline: 'none',
    '&:focus': { borderColor: theme.trace.detail.link },
    '&::placeholder': { color: theme.colors.text.secondary },
  }),
  count: css({ label: 'DdSearchCount', color: theme.colors.text.secondary, fontSize: 12, whiteSpace: 'nowrap', minWidth: 64, textAlign: 'right' }),
  navBtn: css({
    label: 'DdSearchNav',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.md,
    background: 'none',
    color: theme.colors.text.primary,
    cursor: 'pointer',
    '&:disabled': { opacity: 0.4, cursor: 'default' },
    '&:hover:not(:disabled)': { background: theme.trace.selectedRowBg },
  }),
  toggle: css({ label: 'DdSearchToggle', display: 'inline-flex', alignItems: 'center', gap: 4, color: theme.colors.text.secondary, fontSize: 12, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }),
  // Errors N 计数开关（Story 4.2）。
  errors: css({
    label: 'DdSearchErrors',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    height: 24,
    padding: '0 8px',
    border: `1px solid ${theme.trace.status.error.fg}`,
    borderRadius: theme.shape.radius.md,
    color: theme.trace.status.error.fg,
    background: 'none',
    fontSize: 12,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    '&:hover': { background: theme.trace.status.error.bg },
  }),
  errorsActive: css({ label: 'DdSearchErrorsActive', background: theme.trace.status.error.bg }),
});

interface Props {
  search: SearchState;
  placeholder?: string;
  /** Color by 维度（Story 7.3）。传则受控，否则下拉自管显示。 */
  colorBy?: ColorByDimension;
  onColorByChange?: (value: ColorByDimension) => void;
}

export function DdSearchBar({
  search,
  placeholder = 'Filter spans by any attribute',
  colorBy,
  onColorByChange,
}: Props) {
  const styles = useStyles2(getStyles);
  const hasQuery = search.query.trim().length > 0;
  const noMatch = hasQuery && search.matchCount === 0;

  return (
    <div className={styles.bar} data-testid="DdSearchBar">
      <span className={styles.inputWrap}>
        <span className={styles.searchIcon}>
          <Icon name="search" size={14} />
        </span>
        <input
          className={styles.input}
          type="text"
          value={search.query}
          placeholder={placeholder}
          onChange={(e) => search.setQuery(e.target.value)}
          aria-label="搜索 span"
        />
      </span>
      {hasQuery && (
        <span className={styles.count} data-testid="DdSearchCount">
          {noMatch ? '无匹配' : `${search.focusedMatchIndex} / ${search.matchCount}`}
        </span>
      )}
      <button
        className={styles.navBtn}
        onClick={search.prevMatch}
        disabled={search.matchCount === 0}
        title="上一个命中"
        aria-label="上一个命中"
      >
        <Icon name="angle-up" size={14} />
      </button>
      <button
        className={styles.navBtn}
        onClick={search.nextMatch}
        disabled={search.matchCount === 0}
        title="下一个命中"
        aria-label="下一个命中"
      >
        <Icon name="angle-down" size={14} />
      </button>
      {search.errorCount > 0 && (
        <button
          className={`${styles.errors}${search.errorsOnly ? ` ${styles.errorsActive}` : ''}`}
          onClick={() => search.setErrorsOnly(!search.errorsOnly)}
          title="只看错误 span"
          aria-pressed={search.errorsOnly}
          data-testid="DdSearchErrors"
        >
          <Icon name="exclamation-circle" size={12} />
          Errors {search.errorCount}
        </button>
      )}
      <label className={styles.toggle}>
        <input
          type="checkbox"
          checked={search.showMatchesOnly}
          onChange={(e) => search.setShowMatchesOnly(e.target.checked)}
        />
        只看匹配
      </label>
      <DdColorByDropdown value={colorBy} onChange={onColorByChange} />
    </div>
  );
}
