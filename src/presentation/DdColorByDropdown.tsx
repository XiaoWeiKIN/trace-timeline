// Color by 维度下拉（Story 4.5 / 7.3）——对齐 Datadog 工具条右侧「Color by [Service ▾]」。
// 实测 Datadog 维度 = Service / Host / Entity Type（Story 7.3 调研修正旧的 operation/duration 占位）。
import { css } from '@emotion/css';

import type { LegendDimension } from '../core';

import { useStyles2, type Theme } from '../theme';

export type ColorByDimension = LegendDimension;

const OPTIONS: Array<{ value: ColorByDimension; label: string }> = [
  { value: 'service', label: 'Service' },
  { value: 'host', label: 'Host' },
  { value: 'entity', label: 'Entity Type' },
];

const getStyles = (theme: Theme) => ({
  wrap: css({
    label: 'DdColorBy',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: theme.trace.fontFamily,
    fontSize: 12,
    color: theme.colors.text.secondary,
    whiteSpace: 'nowrap',
  }),
  select: css({
    label: 'DdColorBySelect',
    height: 24,
    padding: '0 6px',
    border: `1px solid ${theme.colors.border.strong}`,
    borderRadius: theme.shape.radius.md,
    background: theme.colors.background.primary,
    color: theme.colors.text.primary,
    fontFamily: theme.trace.fontFamily,
    fontSize: 12,
    cursor: 'pointer',
    outline: 'none',
    '&:focus': { borderColor: theme.trace.detail.link },
  }),
});

interface Props {
  value?: ColorByDimension;
  onChange?: (value: ColorByDimension) => void;
}

export function DdColorByDropdown({ value = 'service', onChange }: Props) {
  const styles = useStyles2(getStyles);
  return (
    <span className={styles.wrap} data-testid="DdColorBy">
      <span>Color by</span>
      <select
        className={styles.select}
        value={value}
        aria-label="Color by 维度"
        onChange={(e) => onChange?.(e.target.value as ColorByDimension)}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  );
}
