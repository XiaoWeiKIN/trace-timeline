// state 层公共导出（Story 2.1）——受控/非受控状态容器 + 移植的状态 hook。
export {
  useTraceTimelineState,
  DEFAULT_COLUMN_WIDTH,
  __resetWarnings,
  type TraceTimelineState,
  type UseTraceTimelineStateOptions,
  type ControlledTraceState,
  type DetailToggles,
} from './useTraceTimelineState';
export { useChildrenState } from './useChildrenState';
export { useViewRange } from './useViewRange';
export { useHoverIndentGuide } from './useHoverIndentGuide';
export { useDetailState } from './useDetailState';
export { default as DetailState } from './DetailState';
export { useSearch, type SearchState } from './useSearch';
export {
  useHighlightGroup,
  type HighlightGroupState,
  type UseHighlightGroupOptions,
} from './useHighlightGroup';
export { filterSpans } from './filterSpans';
