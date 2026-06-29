// 详情 Tab 栏（Story 3.4）——对齐 Datadog：`Span:` + Overview(激活,蓝下划线) + 其余 stub 占位。
// Overview 之外为深耦合视图（基础设施/指标/Profiles 等），按 PRD stub：灰显占位、不可点。
import { css } from '@emotion/css';

import { useStyles2, type Theme } from '../theme';

const TABS = ['Overview', 'Infrastructure', 'Metrics', 'Logs', 'Network', 'Processes', 'Profiles'] as const;

const getStyles = (theme: Theme) => ({
  bar: css({
    label: 'DdSpanDetailTabs',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '0 8px',
    height: 32,
    borderBottom: `1px solid ${theme.trace.detail.border}`,
    fontFamily: theme.trace.fontFamily,
    fontSize: 13,
  }),
  label: css({ label: 'DdSpanDetailTabsLabel', fontWeight: theme.typography.fontWeightMedium, color: theme.colors.text.primary, marginRight: 2 }),
  tab: css({
    label: 'DdSpanDetailTab',
    height: 32,
    display: 'inline-flex',
    alignItems: 'center',
    color: theme.trace.detail.label,
    borderBottom: '2px solid transparent',
    boxSizing: 'border-box',
  }),
  active: css({
    label: 'DdSpanDetailTabActive',
    color: theme.colors.text.primary,
    borderBottom: `2px solid ${theme.trace.detail.link}`,
  }),
  stub: css({ label: 'DdSpanDetailTabStub', cursor: 'default', opacity: 0.55 }),
});

interface Props {
  active?: (typeof TABS)[number];
}

export function DdSpanDetailTabs({ active = 'Overview' }: Props) {
  const styles = useStyles2(getStyles);
  return (
    <div className={styles.bar} data-testid="DdSpanDetailTabs">
      <span className={styles.label}>Span:</span>
      {TABS.map((t) => {
        const isActive = t === active;
        return (
          <span
            key={t}
            className={`${styles.tab}${isActive ? ` ${styles.active}` : ` ${styles.stub}`}`}
            title={isActive ? undefined : '该视图为深耦合占位（stub）'}
            aria-disabled={!isActive}
          >
            {t}
          </span>
        );
      })}
    </div>
  );
}
