// 视图切换 tab（Story 6.2 / Epic 6）——瀑布 ⇄ 火焰图，对齐 Datadog 的 Flame Graph/Waterfall tab。
// Span List/Map 非本项目范围，先做两项。受控组件（value + onChange）。
import { css } from '@emotion/css';

import { useStyles2, type Theme } from '../theme';

export type TraceViewMode = 'waterfall' | 'flamegraph';

const TABS: Array<{ id: TraceViewMode; label: string }> = [
  { id: 'waterfall', label: '瀑布 Waterfall' },
  { id: 'flamegraph', label: '火焰图 Flame Graph' },
];

const getStyles = (theme: Theme) => ({
  bar: css({
    label: 'DdViewTabs',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '0 10px',
    height: 34,
    borderBottom: `1px solid ${theme.trace.detail.border}`,
    fontFamily: theme.trace.fontFamily,
    fontSize: 13,
  }),
  tab: css({
    label: 'DdViewTab',
    height: 34,
    display: 'inline-flex',
    alignItems: 'center',
    color: theme.trace.detail.label,
    borderBottom: '2px solid transparent',
    boxSizing: 'border-box',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    padding: 0,
  }),
  active: css({
    label: 'DdViewTabActive',
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeightMedium,
    borderBottom: `2px solid ${theme.trace.detail.link}`,
  }),
});

export interface DdViewTabsProps {
  value: TraceViewMode;
  onChange: (mode: TraceViewMode) => void;
}

export function DdViewTabs({ value, onChange }: DdViewTabsProps) {
  const styles = useStyles2(getStyles);
  return (
    <div className={styles.bar} data-testid="DdViewTabs" role="tablist">
      {TABS.map((t) => {
        const isActive = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-view={t.id}
            className={isActive ? `${styles.tab} ${styles.active}` : styles.tab}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
