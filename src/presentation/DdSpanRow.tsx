// 一整行（UX-DR9）：左标签列（columnWidth）| 右时间线（瀑布条）。
// 行须有内在高度供 core/ListView 测量（AD-12，= DEFAULT_HEIGHTS.bar）。
import { css } from '@emotion/css';

import { DEFAULT_HEIGHTS, type RenderableRow } from '../core';
import { DetailState, type DetailToggles } from '../state';
import { useStyles2, type Theme } from '../theme';

import type { ColorAccessor } from './colorAccessor';
import { DdLabelCell } from './DdLabelCell';
import type { DetailStubs } from './detailStubs';
import { DdSpanBar } from './DdSpanBar';
import { DdSpanDetail } from './DdSpanDetail';

const getStyles = (theme: Theme) => ({
  row: css({
    label: 'DdSpanRow',
    display: 'flex',
    alignItems: 'stretch',
    height: DEFAULT_HEIGHTS.bar,
    boxSizing: 'border-box',
    borderBottom: `1px solid ${theme.colors.border.weak}`,
    background: 'transparent',
    '&:hover': { background: theme.trace.selectedRowBg },
  }),
  focused: css({ background: theme.trace.selectedRowBg }),
  // 选中行高亮（Story 5.5）——左侧主色竖条 + 底色，对齐 Datadog 选中态。
  selected: css({
    label: 'DdSpanRowSelected',
    background: theme.trace.selectedRowBg,
    boxShadow: `inset 3px 0 0 ${theme.colors.primary.main}`,
  }),
  // 搜索命中高亮（Story 4.1）——琥珀色，区别于 focus 蓝。
  matched: css({ label: 'DdSpanRowMatched', background: theme.isDark ? 'rgba(255,196,0,0.16)' : 'rgba(255,196,0,0.22)' }),
  labelCol: css({
    label: 'DdSpanRowLabelCol',
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    paddingLeft: 8,
    paddingRight: 8,
    boxSizing: 'border-box',
    borderRight: `1px solid ${theme.colors.border.weak}`,
  }),
  timelineCol: css({
    label: 'DdSpanRowTimelineCol',
    position: 'relative',
    flex: 1,
    minWidth: 0,
  }),
  // 缩放裁剪提示（FR-8）——时间线列两端 6px 渐隐带；缩放态下逐行连成一条竖向暗带，
  // 暗示内容延伸到视窗之外（移植自上游 rowClippingLeft/Right 的边缘 ::before 渐变）。
  clipEdge: css({
    label: 'DdSpanRowClipEdge',
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 6,
    pointerEvents: 'none',
    zIndex: 1,
  }),
  clipLeft: css({
    label: 'DdSpanRowClipLeft',
    left: 0,
    backgroundImage: `linear-gradient(to right, ${theme.isDark ? 'rgba(255,255,255,0.22)' : 'rgba(25,25,25,0.22)'}, rgba(0,0,0,0))`,
  }),
  clipRight: css({
    label: 'DdSpanRowClipRight',
    right: 0,
    backgroundImage: `linear-gradient(to left, ${theme.isDark ? 'rgba(255,255,255,0.22)' : 'rgba(25,25,25,0.22)'}, rgba(0,0,0,0))`,
  }),
  // 详情行容器——自然高度（ListView 测量真实内容高，AD-12）。
  detail: css({
    label: 'DdSpanDetailRow',
    boxSizing: 'border-box',
    borderBottom: `1px solid ${theme.colors.border.weak}`,
    background: theme.colors.background.primary,
  }),
});

interface Props {
  row: RenderableRow;
  colorAccessor: ColorAccessor;
  colorForSpanId: (id: string) => string;
  /** 详情子分组 toggle（详情行需要；缺省 no-op）。 */
  detailToggles?: DetailToggles;
  /** 深耦合注入回调（火焰图/分享/链接；Story 5.4）。 */
  detailStubs?: DetailStubs;
  /** 该行 span 是否为当前选中（底部抽屉，Story 5.5）。 */
  isSelected?: boolean;
}

const NOOP = () => {};
const NOOP_DETAIL_TOGGLES: DetailToggles = {
  tags: NOOP,
  process: NOOP,
  logs: NOOP,
  references: NOOP,
  warnings: NOOP,
  stackTraces: NOOP,
  logItem: NOOP,
  referenceItem: NOOP,
  section: NOOP,
};

export function DdSpanRow({ row, colorAccessor, colorForSpanId, detailToggles, detailStubs, isSelected }: Props) {
  const styles = useStyles2(getStyles);

  if (row.isDetail) {
    // 详情行——渲染完整 SpanDetail 卡（Story 3.4 重绘）。自然高度：ListView _scanItemHeights
    // 测量真实内容高并修正定位（AD-12；勿固定高/height:100%，否则测量坍塌）。getRowHeight 仅初始估值。
    const { span } = row;
    const detailState = (row.detailState as DetailState | undefined) ?? new DetailState();
    return (
      <div className={styles.detail}>
        <DdSpanDetail
          span={span}
          detailState={detailState}
          detailToggles={detailToggles ?? NOOP_DETAIL_TOGGLES}
          detailStubs={detailStubs}
          color={colorAccessor(span)}
          onClose={() => row.onDetailToggle(span.spanID)}
        />
      </div>
    );
  }

  const color = colorAccessor(row.span);
  return (
    <div
      className={`${styles.row}${
        isSelected ? ` ${styles.selected}` : row.isFocused ? ` ${styles.focused}` : row.isMatchingFilter ? ` ${styles.matched}` : ''
      }`}
    >
      <div className={styles.labelCol} style={{ flexBasis: `${row.columnWidth * 100}%`, maxWidth: `${row.columnWidth * 100}%` }}>
        <DdLabelCell row={row} colorForSpanId={colorForSpanId} />
      </div>
      <div className={styles.timelineCol}>
        {row.viewBounds.clippingLeft && (
          <div className={`${styles.clipEdge} ${styles.clipLeft}`} data-testid="clip-left" />
        )}
        <DdSpanBar row={row} color={color} />
        {row.viewBounds.clippingRight && (
          <div className={`${styles.clipEdge} ${styles.clipRight}`} data-testid="clip-right" />
        )}
      </div>
    </div>
  );
}
