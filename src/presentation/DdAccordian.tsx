// 可折叠分组（FR-11）——SpanDetail 子分组的通用折叠头 + 内容。
// 结构忠实 Jaeger AccordianKeyValues（header click → chevron + 内容显隐）；视觉高保真对齐 Datadog
// （header 34px / cursor:pointer / border-top 分隔 / chevron 16px rotate(0=收,90deg=展)），见 datadog-span-detail-ux 调研。
import { css } from '@emotion/css';
import type { ReactNode } from 'react';

import { useStyles2, type Theme } from '../theme';
import { Icon } from '../ui';

const getStyles = (theme: Theme) => ({
  section: css({ label: 'DdAccordian' }),
  header: css({
    label: 'DdAccordianHeader',
    display: 'flex',
    alignItems: 'center',
    height: theme.trace.detail.sectionHeaderHeight,
    padding: '0 8px',
    boxSizing: 'border-box',
    borderTop: `1px solid ${theme.trace.detail.border}`,
    fontFamily: theme.trace.fontFamily,
    fontSize: 13,
    color: theme.colors.text.primary,
  }),
  headerInteractive: css({
    label: 'DdAccordianHeaderInteractive',
    cursor: 'pointer',
    '&:hover': { background: theme.trace.selectedRowBg },
  }),
  chevron: css({
    label: 'DdAccordianChevron',
    display: 'inline-flex',
    color: theme.trace.detail.chevron,
    marginRight: 6,
    transition: 'transform 120ms ease',
    flex: 'none',
  }),
  chevronOpen: css({ label: 'DdAccordianChevronOpen', transform: 'rotate(90deg)' }),
  label: css({ label: 'DdAccordianLabel', fontWeight: theme.typography.fontWeightMedium }),
  count: css({
    label: 'DdAccordianCount',
    marginLeft: 6,
    color: theme.trace.detail.label,
    fontWeight: 400,
  }),
  body: css({ label: 'DdAccordianBody', padding: '4px 8px 8px' }),
});

interface Props {
  label: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  /** 数量徽标（如 tag 数）。 */
  count?: number;
  children?: ReactNode;
}

export function DdAccordian({ label, isOpen, onToggle, count, children }: Props) {
  const styles = useStyles2(getStyles);
  return (
    <div className={styles.section}>
      <div
        className={`${styles.header} ${styles.headerInteractive}`}
        role="switch"
        aria-checked={isOpen}
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        data-testid="DdAccordian--header"
      >
        <span className={`${styles.chevron}${isOpen ? ` ${styles.chevronOpen}` : ''}`}>
          <Icon name="angle-right" size={16} />
        </span>
        <span className={styles.label}>{label}</span>
        {count != null && <span className={styles.count}>{count}</span>}
      </div>
      {isOpen && <div className={styles.body}>{children}</div>}
    </div>
  );
}
