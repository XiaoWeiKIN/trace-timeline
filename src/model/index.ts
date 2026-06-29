// model 层公共导出（Story 1.3）。
export { default as transformTraceData, deduplicateTags, orderTags } from './transform-trace-data';
export { getTraceSpanIdsAsTree, TREE_ROOT_ID } from './trace-tree';
export { getTraceName } from './get-trace-name';
export { getServiceDisplayName, getServiceColorKey } from './service-name';
export { default as TreeNode } from './tree-node';
export { default as spanAncestorIds } from './span-ancestor-ids';
export { mockTrace, mockTraceResponse } from './mock-trace';
// 后端中立适配器契约（AD-15）。具体适配器（datafox/otlp）走子路径导出，不在主入口。
export { adaptTrace, type TraceSourceAdapter } from './adapter';
export type {
  Trace,
  TraceData,
  TraceResponse,
  TraceSpan,
  TraceSpanData,
  TraceProcess,
  TraceSpanReference,
  TraceLink,
  CriticalPathSection,
} from './types';
export type { TraceKeyValuePair, TraceLog } from './grafana-types';
