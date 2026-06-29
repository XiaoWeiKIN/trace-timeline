// 服务色缩进竖线（AD-6 / FR-25 / UX-DR2）——取代 Grafana 灰树线。
// 按 ancestorSpanIds（根→父）逐层画一条服务色竖线；末尾是当前 span 的折叠箭头。
import { css } from '@emotion/css';

import { useStyles2, type Theme } from '../theme';
import { Icon } from '../ui';

const INDENT_STEP = 14;

const getStyles = (theme: Theme) => ({
  root: css({
    label: 'DdIndentGuides',
    display: 'inline-flex',
    alignSelf: 'stretch',
    flex: 'none',
  }),
  guide: css({
    label: 'DdIndentGuide',
    width: INDENT_STEP,
    alignSelf: 'stretch',
  }),
  toggle: css({
    label: 'DdIndentToggle',
    width: INDENT_STEP,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 'none',
    color: theme.colors.text.secondary,
    cursor: 'pointer',
    '&:hover': { color: theme.colors.text.primary },
  }),
  spacer: css({ width: INDENT_STEP, flex: 'none' }),
});

interface Props {
  /** 根→父有序（= RenderableRow.ancestorSpanIds，length===depth）。 */
  ancestorSpanIds: string[];
  hasChildren: boolean;
  isCollapsed: boolean;
  /** 解析某 spanID 的服务色（祖先色）。 */
  colorForSpanId: (id: string) => string;
  onToggle?: () => void;
  /** hover 高亮：同祖先的多行竖线统一高亮（AD-5 容器状态）。 */
  hoverIndentGuideIds?: Set<string>;
  addHoverIndentGuideId?: (id: string) => void;
  removeHoverIndentGuideId?: (id: string) => void;
}

export function DdIndentGuides({
  ancestorSpanIds,
  hasChildren,
  isCollapsed,
  colorForSpanId,
  onToggle,
  hoverIndentGuideIds,
  addHoverIndentGuideId,
  removeHoverIndentGuideId,
}: Props) {
  const styles = useStyles2(getStyles);
  const lineWidth = useStyles2((t) => t.trace.indentLine.width);
  return (
    <span className={styles.root}>
      {ancestorSpanIds.map((id, i) => {
        const active = hoverIndentGuideIds?.has(id);
        return (
          <span
            key={`${id}-${i}`}
            className={styles.guide}
            data-ancestor-id={id}
            style={{
              borderLeft: `${active ? lineWidth + 1 : lineWidth}px solid ${colorForSpanId(id)}`,
              opacity: active ? 1 : 0.7,
            }}
            onMouseEnter={() => addHoverIndentGuideId?.(id)}
            onMouseLeave={() => removeHoverIndentGuideId?.(id)}
          />
        );
      })}
      {hasChildren ? (
        <span
          className={styles.toggle}
          role="button"
          aria-label={isCollapsed ? 'expand' : 'collapse'}
          onClick={onToggle}
        >
          <Icon name={isCollapsed ? 'angle-right' : 'angle-down'} size={14} />
        </span>
      ) : (
        <span className={styles.spacer} />
      )}
    </span>
  );
}
