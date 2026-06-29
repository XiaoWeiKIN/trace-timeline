// 对外组件（AR-1/AD-1/AD-2）——把 Datadog 皮肤注入 core 引擎，渲染静态瀑布。
// 空/加载/无效态归此层（AD-12）。交互（折叠/缩放/列宽/详情/受控）留 Epic 2–4。
import { css } from '@emotion/css';
import { useMemo, useState, type CSSProperties } from 'react';

import {
  computeLegendGroups,
  computeTraceCriticalPath,
  DEFAULT_HEIGHTS,
  dimensionKeyFor,
  VirtualizedTraceView,
  type LegendDimension,
  type LegendMetric,
} from '../core';
import { type Trace } from '../model';
import {
  colorAccessorForDimension,
  createDatadogRowRenderer,
  DdFlameGraphView,
  DdFlameLegend,
  DdFlameMinimap,
  DdFlameRuler,
  DdSearchBar,
  DdSpanDetail,
  DdTimelineHeader,
  DdViewTabs,
  defaultColorAccessor,
  HEADER_HEIGHT,
  type ColorAccessor,
  type DetailStubs,
  type TraceViewMode,
} from '../presentation';
import {
  DetailState,
  useHighlightGroup,
  useTraceTimelineState,
  type ControlledTraceState,
} from '../state';
import { useStyles2, type Theme } from '../theme';

const EMPTY_DETAIL_STATES = new Map<string, DetailState>();

export interface TraceTimelineProps {
  /** 内部派生 Trace（DataFox 适配见 Epic 5）。null/undefined → 空态。 */
  trace: Trace | null | undefined;
  /** 自定义着色（默认 service 维度）。 */
  colorAccessor?: ColorAccessor;
  /** 名称列初始占比 [0,1]，默认 0.32（列宽拖拽见 Epic 2.4）。 */
  columnWidth?: number;
  /** 刻度数，默认 5。 */
  numTicks?: number;
  /** 覆盖 core 行高常量（AD-12）。 */
  rowHeights?: typeof DEFAULT_HEIGHTS;
  /** 加载中 → 占位。 */
  loading?: boolean;
  /** 列表区高度（默认 400）。 */
  height?: number;
  /** 高亮关键路径（默认 true）。 */
  showCriticalPath?: boolean;
  /** 深耦合功能注入回调（火焰图/分享/链接；Story 5.4）。不传 → 相应按钮隐藏 / 火焰图区不显示。 */
  detailStubs?: DetailStubs;
  /** 底部详情抽屉高度（默认 340，Story 5.5）。 */
  drawerHeight?: number;
  /** 视图模式（Story 6.2）：非受控默认 'waterfall'；传 viewMode+onViewModeChange 受控。 */
  viewMode?: TraceViewMode;
  onViewModeChange?: (mode: TraceViewMode) => void;
  /** 非受控初始视图（默认 'waterfall'）。 */
  defaultViewMode?: TraceViewMode;
  // —— 火焰图服务图例（Story 7.1；受控/非受控）——
  /** 受控持久高亮分组 key（图例点击）。不传 → 非受控。 */
  highlightedGroupKey?: string | null;
  onHighlightGroupChange?: (key: string | null) => void;
  /** 受控图例显隐。不传 → 非受控（默认显示）。 */
  showLegend?: boolean;
  onShowLegendChange?: (show: boolean) => void;
  /** Color by 维度（Story 7.3：service/host/entity）。受控/非受控。 */
  colorBy?: LegendDimension;
  onColorByChange?: (dimension: LegendDimension) => void;
  defaultColorBy?: LegendDimension;
  /** 图例指标（Story 7.2：execTime/spans）。受控/非受控。 */
  legendMetric?: LegendMetric;
  onLegendMetricChange?: (metric: LegendMetric) => void;
  defaultLegendMetric?: LegendMetric;
  // —— 受控（AD-5；三态见 useTraceTimelineState）——
  focusedSpanId?: string;
  onFocusedSpanIdChange?: (id: string | undefined) => void;
  /** 全量受控逃生舱（与逐字段受控互斥）。 */
  state?: ControlledTraceState;
  onStateChange?: (next: ControlledTraceState) => void;
  className?: string;
  style?: CSSProperties;
}

const getStyles = (theme: Theme) => ({
  root: css({
    label: 'TraceTimeline',
    border: `1px solid ${theme.colors.border.weak}`,
    background: theme.colors.background.primary,
    fontFamily: theme.trace.fontFamily,
    boxSizing: 'border-box',
  }),
  scroll: css({ label: 'TraceTimelineScroll', overflow: 'auto' }),
  // 火焰图相对容器（Story 6.6）——承载 minimap 浮层 overlay。
  flameWrap: css({ label: 'TraceTimelineFlameWrap', position: 'relative' }),
  // 底部详情抽屉（Story 5.5）——固定在瀑布下方，显示选中 span 详情，内部滚动。
  drawer: css({
    label: 'TraceTimelineDrawer',
    borderTop: `2px solid ${theme.trace.detail.border}`,
    overflow: 'auto',
    background: theme.colors.background.primary,
  }),
  state: css({
    label: 'TraceTimelineState',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.text.secondary,
    fontSize: 13,
    padding: theme.spacing(4),
  }),
});

const DEFAULT_COLUMN_WIDTH = 0.32;
const DEFAULT_NUM_TICKS = 5;

/**
 * 选中 span 的时间边界 → [startFrac, endFrac] ∈[0,1]，相对当前坐标系。
 * focusRootSpanId 给定（Story 6.7）时坐标系 = 该 focus 根的时间区间，否则整 trace。
 * 无选中/找不到 → null。
 */
function selectedSpanBounds(
  trace: Trace,
  selectedSpanId: string | undefined,
  focusRootSpanId?: string
): [number, number] | null {
  if (!selectedSpanId) {
    return null;
  }
  const span = trace.spans.find((s) => s.spanID === selectedSpanId);
  if (!span) {
    return null;
  }
  const root = focusRootSpanId ? trace.spans.find((s) => s.spanID === focusRootSpanId) : undefined;
  const baseStart = root ? root.startTime : trace.startTime;
  const baseDuration = root ? root.duration : trace.duration;
  if (!baseDuration) {
    return null;
  }
  const start = Math.max((span.startTime - baseStart) / baseDuration, 0);
  const end = Math.min((span.startTime + span.duration - baseStart) / baseDuration, 1);
  // 反转/空区间（聚焦态下选中子树外 span，或 clamp 后 end<=start）→ 无效，返回 null（M4）。
  if (end <= start) {
    return null;
  }
  return [start, end];
}

const MIN_FLAME_WINDOW = 0.01;
/** 把 [s,e] 钳到至少 MIN_FLAME_WINDOW 宽（避免缩到极窄/零宽产生 NaN，M2）。 */
function clampZoomWindow([s, e]: [number, number]): [number, number] {
  if (e - s >= MIN_FLAME_WINDOW) {
    return [s, e];
  }
  let ne = Math.min(s + MIN_FLAME_WINDOW, 1);
  const ns = ne - MIN_FLAME_WINDOW;
  return [Math.max(ns, 0), ne];
}

export function TraceTimeline({
  trace,
  colorAccessor,
  columnWidth = DEFAULT_COLUMN_WIDTH,
  numTicks = DEFAULT_NUM_TICKS,
  rowHeights,
  loading = false,
  height = 400,
  showCriticalPath = true,
  detailStubs,
  drawerHeight = 340,
  viewMode,
  onViewModeChange,
  defaultViewMode = 'waterfall',
  highlightedGroupKey,
  onHighlightGroupChange,
  showLegend,
  onShowLegendChange,
  colorBy,
  onColorByChange,
  defaultColorBy = 'service',
  legendMetric,
  onLegendMetricChange,
  defaultLegendMetric = 'execTime',
  focusedSpanId,
  onFocusedSpanIdChange,
  state,
  onStateChange,
  className,
  style,
}: TraceTimelineProps) {
  const styles = useStyles2(getStyles);
  const theme = useStyles2((t) => t);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  // 视图模式（Story 6.2）——受控（viewMode+onViewModeChange）/ 非受控（defaultViewMode）。
  const [viewModeUC, setViewModeUC] = useState<TraceViewMode>(defaultViewMode);
  const currentViewMode = viewMode ?? viewModeUC;
  const setViewMode = (m: TraceViewMode) => {
    if (viewMode === undefined) {
      setViewModeUC(m);
    }
    onViewModeChange?.(m);
  };
  // 聚焦根 span（Story 6.7 Focus=re-root）。
  const [focusedRootSpanId, setFocusedRootSpanId] = useState<string | undefined>(undefined);

  // 火焰图图例高亮（Story 7.1）——hover 临时 + click 持久 toggle + 显隐，受控/非受控。
  const hl = useHighlightGroup({
    highlightedKey: highlightedGroupKey,
    onHighlightChange: onHighlightGroupChange,
    showLegend,
    onShowLegendChange,
  });
  // Flame rect hover should light the matching legend row only. It must not feed back into
  // DdFlameGraphView.highlightedGroupKey, otherwise selecting a span leaves the pointer over
  // that rect and makes unrelated spans turn gray.
  const [spanHoverGroupKey, setSpanHoverGroupKey] = useState<string | null>(null);

  // Color by 维度（Story 7.3）+ 图例指标（Story 7.2）——受控/非受控。
  // 读写都以 `!== undefined` 判定受控（与 useHighlightGroup 一致；避免传 null 时读 `??` 回落 UC、
  // 写 `=== undefined` 当受控而冻结控件，CR-F2）。
  const [colorByUC, setColorByUC] = useState<LegendDimension>(defaultColorBy);
  const currentColorBy = colorBy !== undefined ? colorBy : colorByUC;
  const setColorBy = (d: LegendDimension) => {
    if (colorBy === undefined) {
      setColorByUC(d);
    }
    onColorByChange?.(d);
    // 切维度清临时 + 持久高亮，避免旧维度 key 在新维度变孤儿致整图全灰（CR-F1）。
    hl.setHovered(null);
    hl.clearPinned();
    setSpanHoverGroupKey(null);
  };
  const [legendMetricUC, setLegendMetricUC] = useState<LegendMetric>(defaultLegendMetric);
  const currentLegendMetric = legendMetric !== undefined ? legendMetric : legendMetricUC;
  const setLegendMetric = (m: LegendMetric) => {
    if (legendMetric === undefined) {
      setLegendMetricUC(m);
    }
    onLegendMetricChange?.(m);
  };

  // 当前维度下合法的分组 key 集（CR-F1 守卫）——effectiveKey 若不在其中（切维度/换 trace 后的孤儿
  // 受控 key），视为无高亮，避免「所有帧都不匹配 → 整图全灰且无行可点恢复」。
  const legendGroupKeys = useMemo(
    () => (trace ? new Set(computeLegendGroups(trace, { dimension: currentColorBy }).map((g) => g.key)) : new Set<string>()),
    [trace, currentColorBy]
  );
  const safeHighlightKey =
    hl.effectiveKey != null && legendGroupKeys.has(hl.effectiveKey) ? hl.effectiveKey : null;
  const safeSpanHoverKey =
    spanHoverGroupKey != null && legendGroupKeys.has(spanHoverGroupKey) ? spanHoverGroupKey : null;
  const legendHighlightKey = safeSpanHoverKey ?? safeHighlightKey;

  // 有效着色（Story 7.3）：service 维度用用户自定义/默认；host/entity 维度按维度散列。
  // 流向瀑布 rowRenderer + 火焰图 + 图例 + minimap，使 Color by 在两视图都生效。
  const effectiveColorAccessor = useMemo<ColorAccessor>(
    () =>
      currentColorBy === 'service'
        ? colorAccessor ?? defaultColorAccessor(theme)
        : colorAccessorForDimension(currentColorBy, theme),
    [currentColorBy, colorAccessor, theme]
  );

  // 状态容器（AD-5）——非受控自管 / 逐字段受控 / 全量逃生舱。
  const tt = useTraceTimelineState(trace, {
    focusedSpanId,
    onFocusedSpanIdChange,
    initialColumnWidth: columnWidth,
    state,
    onStateChange,
  });

  const rowRenderer = useMemo(
    () =>
      trace
        ? createDatadogRowRenderer({
            theme,
            trace,
            colorAccessor: effectiveColorAccessor,
            detailToggles: tt.detailToggles,
            detailStubs,
            selectedSpanId: tt.selectedSpanId,
          })
        : null,
    [theme, trace, effectiveColorAccessor, tt.detailToggles, detailStubs, tt.selectedSpanId]
  );

  const criticalPath = useMemo(
    () => (trace && showCriticalPath ? computeTraceCriticalPath(trace) : []),
    [trace, showCriticalPath]
  );

  const rootClass = className ? `${styles.root} ${className}` : styles.root;

  if (loading) {
    return (
      <div className={rootClass} style={style}>
        <div className={styles.state}>加载中…</div>
      </div>
    );
  }

  if (!trace || !rowRenderer) {
    return (
      <div className={rootClass} style={style}>
        <div className={styles.state}>无追踪数据</div>
      </div>
    );
  }

  const isFlame = currentViewMode === 'flamegraph';
  // 聚焦根（Story 6.7）——ruler/zoom 时间基于其时长。
  const focusRootSpan = focusedRootSpanId ? trace.spans.find((s) => s.spanID === focusedRootSpanId) : undefined;
  const flameViewDuration = focusRootSpan ? focusRootSpan.duration : trace.duration;
  const focusSelected = () => {
    if (tt.selectedSpanId) {
      setFocusedRootSpanId(tt.selectedSpanId);
      tt.updateViewRangeTime(0, 1);
    }
  };
  const resetFocus = () => {
    setFocusedRootSpanId(undefined);
    tt.updateViewRangeTime(0, 1);
  };

  return (
    <div className={rootClass} style={style}>
      <DdViewTabs value={currentViewMode} onChange={setViewMode} />
      <DdSearchBar search={tt.search} colorBy={currentColorBy} onColorByChange={setColorBy} />
      {!isFlame && (
        <DdTimelineHeader
          columnWidth={tt.spanNameColumnWidth}
          numTicks={numTicks}
          viewDuration={trace.duration}
          onExpandAll={tt.expandAll}
          onCollapseAll={() => tt.collapseAll(trace.spans)}
          onExpandOne={() => tt.expandOne(trace.spans)}
          onCollapseOne={() => tt.collapseOne(trace.spans)}
          viewRangeTime={tt.viewRange.time}
          updateViewRangeTime={tt.updateViewRangeTime}
          updateNextViewRangeTime={tt.updateNextViewRangeTime}
          onColumnResize={tt.setSpanNameColumnWidth}
          columnResizeHandleHeight={height + HEADER_HEIGHT}
        />
      )}
      {isFlame && (
        <DdFlameRuler
          numTicks={numTicks}
          viewDuration={flameViewDuration}
          viewStart={tt.viewRange.time.current[0]}
          viewEnd={tt.viewRange.time.current[1]}
        />
      )}
      <div className={styles.flameWrap} style={isFlame ? { display: 'flex' } : undefined}>
        <div
          ref={setScrollEl}
          className={styles.scroll}
          style={{ height, ...(isFlame ? { flex: 1, minWidth: 0 } : {}) }}
        >
          {isFlame ? (
            <DdFlameGraphView
              trace={trace}
              colorAccessor={effectiveColorAccessor}
              selectedSpanId={tt.selectedSpanId}
              onSelectSpan={tt.selectSpan}
              onViewRangeChange={tt.updateViewRangeTime}
              focusRootSpanId={focusedRootSpanId}
              highlightedGroupKey={safeHighlightKey}
              groupKeyForSpan={(s) => dimensionKeyFor(s, currentColorBy)}
              onSpanHover={setSpanHoverGroupKey}
              numTicks={numTicks}
              viewRange={{ viewStart: tt.viewRange.time.current[0], viewEnd: tt.viewRange.time.current[1] }}
            />
          ) : (
            scrollEl && (
              <VirtualizedTraceView
              trace={trace}
              currentViewRangeTime={tt.viewRange.time.current}
              childrenHiddenIDs={tt.childrenHiddenIDs}
              detailStates={EMPTY_DETAIL_STATES}
              findMatchesIDs={tt.search.matches ?? null}
              showSpanFilterMatchesOnly={tt.search.showMatchesOnly || tt.search.errorsOnly}
              criticalPath={criticalPath}
              spanNameColumnWidth={tt.spanNameColumnWidth}
              hoverIndentGuideIds={tt.hoverIndentGuideIds}
              focusedSpanId={tt.focusedSpanId}
              focusedSpanIdForSearch={tt.search.focusedMatchId}
              headerHeight={HEADER_HEIGHT}
              rowHeights={rowHeights}
              scrollElement={scrollEl}
              rowRenderer={rowRenderer}
              childrenToggle={tt.childrenToggle}
              detailToggle={tt.detailToggle}
              addHoverIndentGuideId={tt.addHoverIndentGuideId}
              removeHoverIndentGuideId={tt.removeHoverIndentGuideId}
            />
          )
        )}
        </div>
        {isFlame && (
          <DdFlameLegend
            trace={trace}
            colorAccessor={effectiveColorAccessor}
            dimension={currentColorBy}
            metric={currentLegendMetric}
            onMetricChange={setLegendMetric}
            highlightedKey={legendHighlightKey}
            onHoverChange={hl.setHovered}
            onToggle={hl.togglePinned}
            showLegend={hl.showLegend}
            onShowLegendChange={hl.setShowLegend}
            style={{ maxHeight: height }}
          />
        )}
        {isFlame && (
          <DdFlameMinimap
            trace={trace}
            colorAccessor={effectiveColorAccessor}
            viewStart={tt.viewRange.time.current[0]}
            viewEnd={tt.viewRange.time.current[1]}
            onViewRangeChange={tt.updateViewRangeTime}
            focusRootSpanId={focusedRootSpanId}
            hasSelection={tt.selectedSpanId != null}
            isFocused={focusedRootSpanId != null}
            onResetFocus={resetFocus}
            onZoomFull={() => tt.updateViewRangeTime(0, 1)}
            onZoomSelected={() => {
              const b = selectedSpanBounds(trace, tt.selectedSpanId, focusedRootSpanId);
              if (b) {
                const [s, e] = clampZoomWindow(b);
                tt.updateViewRangeTime(s, e);
              }
            }}
            onFocusSelected={focusSelected}
            style={{ bottom: 6, left: 6 }}
          />
        )}
      </div>
      {(() => {
        const selectedSpan = tt.selectedSpanId
          ? trace.spans.find((s) => s.spanID === tt.selectedSpanId)
          : undefined;
        if (!selectedSpan) {
          return null;
        }
        const resolveColor = effectiveColorAccessor;
        return (
          <div className={styles.drawer} style={{ height: drawerHeight }} data-testid="TraceTimelineDrawer">
            <DdSpanDetail
              span={selectedSpan}
              detailState={tt.detailStates.get(selectedSpan.spanID) ?? new DetailState()}
              detailToggles={tt.detailToggles}
              detailStubs={detailStubs}
              color={resolveColor(selectedSpan)}
              onClose={() => tt.selectSpan(selectedSpan.spanID)}
            />
          </div>
        );
      })()}
    </div>
  );
}
