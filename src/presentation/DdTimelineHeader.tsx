// 时间线表头（FR-2）：左标签列头（静态文案；折叠全部按钮留 Epic 2）| 右刻度区。
import { css } from '@emotion/css';

import type { TUpdateViewRangeTimeFunction, ViewRangeTime, ViewRangeTimeUpdate } from '../core';
import { useStyles2, type Theme } from '../theme';

import { DdColumnResizer } from './DdColumnResizer';
import { DdTicks } from './DdTicks';
import { DdTimelineCollapser } from './DdTimelineCollapser';
import { DdViewingLayer } from './DdViewingLayer';

const COLUMN_MIN = 0.2;
const COLUMN_MAX = 0.85;

const HEADER_HEIGHT = 28;

const getStyles = (theme: Theme) => ({
  header: css({
    label: 'DdTimelineHeader',
    position: 'relative',
    display: 'flex',
    alignItems: 'stretch',
    height: HEADER_HEIGHT,
    boxSizing: 'border-box',
    borderBottom: `1px solid ${theme.colors.border.strong}`,
    background: theme.colors.background.secondary,
    fontFamily: theme.trace.fontFamily,
    fontSize: 12,
  }),
  labelHead: css({
    label: 'DdTimelineHeaderLabel',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 8,
    boxSizing: 'border-box',
    borderRight: `1px solid ${theme.colors.border.weak}`,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeightMedium,
  }),
  ticksHead: css({ label: 'DdTimelineHeaderTicks', position: 'relative', flex: 1, minWidth: 0 }),
});

interface Props {
  columnWidth: number;
  numTicks: number;
  viewDuration: number;
  /** 左标签列头文案（默认 Datadog 风格）。 */
  labelText?: string;
  /** 折叠/展开按钮组回调（全部提供时渲染 DdTimelineCollapser，FR-5）。 */
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onExpandOne?: () => void;
  onCollapseOne?: () => void;
  // —— 缩放（FR-8；全部提供时在刻度区叠加 DdViewingLayer）——
  viewRangeTime?: ViewRangeTime;
  updateViewRangeTime?: TUpdateViewRangeTimeFunction;
  updateNextViewRangeTime?: (update: ViewRangeTimeUpdate) => void;
  // —— 列宽拖拽（FR-9；提供时叠加 DdColumnResizer）——
  onColumnResize?: (newSize: number) => void;
  columnResizeHandleHeight?: number;
}

export function DdTimelineHeader({
  columnWidth,
  numTicks,
  viewDuration,
  labelText = 'Service & Operation',
  onExpandAll,
  onCollapseAll,
  onExpandOne,
  onCollapseOne,
  viewRangeTime,
  updateViewRangeTime,
  updateNextViewRangeTime,
  onColumnResize,
  columnResizeHandleHeight = HEADER_HEIGHT,
}: Props) {
  const styles = useStyles2(getStyles);
  const hasCollapser = onExpandAll && onCollapseAll && onExpandOne && onCollapseOne;
  const hasZoom = viewRangeTime && updateViewRangeTime && updateNextViewRangeTime;
  return (
    <div className={styles.header}>
      <div className={styles.labelHead} style={{ flexBasis: `${columnWidth * 100}%`, maxWidth: `${columnWidth * 100}%` }}>
        {hasCollapser && (
          <DdTimelineCollapser
            onExpandAll={onExpandAll}
            onCollapseAll={onCollapseAll}
            onExpandOne={onExpandOne}
            onCollapseOne={onCollapseOne}
          />
        )}
        {labelText}
      </div>
      <div className={styles.ticksHead}>
        <DdTicks
          numTicks={numTicks}
          viewDuration={viewDuration}
          viewStart={viewRangeTime?.current[0] ?? 0}
          viewEnd={viewRangeTime?.current[1] ?? 1}
        />
        {hasZoom && (
          <DdViewingLayer
            boundsInvalidator={columnWidth}
            viewRangeTime={viewRangeTime}
            updateViewRangeTime={updateViewRangeTime}
            updateNextViewRangeTime={updateNextViewRangeTime}
          />
        )}
      </div>
      {onColumnResize && (
        <DdColumnResizer
          position={columnWidth}
          min={COLUMN_MIN}
          max={COLUMN_MAX}
          onChange={onColumnResize}
          columnResizeHandleHeight={columnResizeHandleHeight}
        />
      )}
    </div>
  );
}

export { HEADER_HEIGHT };
