// 详情面板展开态（本项目自研）——`detailStates: Map<spanID, DetailState>` 记录哪些 span 的详情已打开、
// 及其内部各子项（tags/process/logs/warnings/references/stackTraces/section/逐条 log·reference）的展开状态。
// `DetailState`（不可变 class，源自 Jaeger，保留其 Apache 头）封装单个 span 的子项状态；本 hook 只做 Map 容器 + React 包装。
// trace 变化时清空（不跨 trace 残留）。每次变更换新 Map 引用 + 调 DetailState 的不可变 toggle（AD-4）。
import { useCallback, useEffect, useState } from 'react';

import type { Trace, TraceLog, TraceSpanReference } from '../model';

import DetailState from './DetailState';

/** DetailState 上「无参子分组」toggle 方法名（tags/process/logs/...）。 */
type SubsectionMethod =
  | 'toggleTags'
  | 'toggleProcess'
  | 'toggleLogs'
  | 'toggleWarnings'
  | 'toggleReferences'
  | 'toggleStackTraces';

export function useDetailState(trace: Trace | null | undefined) {
  const [detailStates, setDetailStates] = useState<Map<string, DetailState>>(() => new Map());

  // 换 trace → 清空详情态。
  useEffect(() => {
    setDetailStates(new Map());
  }, [trace]);

  // 对某 span 的现有 DetailState 应用一个变换，写回新 Map；条目不存在则原样返回（no-op）。
  const mutateDetail = useCallback((spanID: string, transform: (s: DetailState) => DetailState) => {
    setDetailStates((prev) => {
      const current = prev.get(spanID);
      if (!current) {
        return prev;
      }
      const next = new Map(prev);
      next.set(spanID, transform(current));
      return next;
    });
  }, []);

  // 打开/关闭某 span 的详情行。
  const toggleDetail = useCallback((spanID: string) => {
    setDetailStates((prev) => {
      const next = new Map(prev);
      if (next.has(spanID)) {
        next.delete(spanID);
      } else {
        next.set(spanID, new DetailState());
      }
      return next;
    });
  }, []);

  // 幂等确保某 span 有详情条目（Story 5.5：选中进抽屉时调用，不覆盖已有）。
  const ensureDetail = useCallback((spanID: string) => {
    setDetailStates((prev) => {
      if (prev.has(spanID)) {
        return prev;
      }
      const next = new Map(prev);
      next.set(spanID, new DetailState());
      return next;
    });
  }, []);

  // 无参子分组 toggle 工厂。
  const subsectionToggle = useCallback(
    (method: SubsectionMethod) => (spanID: string) => mutateDetail(spanID, (s) => s[method]()),
    [mutateDetail]
  );

  return {
    detailStates,
    toggleDetail,
    ensureDetail,
    detailSectionToggle: useCallback(
      (spanID: string, name: string) => mutateDetail(spanID, (s) => s.toggleSection(name)),
      [mutateDetail]
    ),
    detailLogItemToggle: useCallback(
      (spanID: string, log: TraceLog) => mutateDetail(spanID, (s) => s.toggleLogItem(log)),
      [mutateDetail]
    ),
    detailReferenceItemToggle: useCallback(
      (spanID: string, reference: TraceSpanReference) => mutateDetail(spanID, (s) => s.toggleReferenceItem(reference)),
      [mutateDetail]
    ),
    detailTagsToggle: useCallback((spanID: string) => subsectionToggle('toggleTags')(spanID), [subsectionToggle]),
    detailProcessToggle: useCallback((spanID: string) => subsectionToggle('toggleProcess')(spanID), [subsectionToggle]),
    detailLogsToggle: useCallback((spanID: string) => subsectionToggle('toggleLogs')(spanID), [subsectionToggle]),
    detailWarningsToggle: useCallback((spanID: string) => subsectionToggle('toggleWarnings')(spanID), [subsectionToggle]),
    detailReferencesToggle: useCallback(
      (spanID: string) => subsectionToggle('toggleReferences')(spanID),
      [subsectionToggle]
    ),
    detailStackTracesToggle: useCallback(
      (spanID: string) => subsectionToggle('toggleStackTraces')(spanID),
      [subsectionToggle]
    ),
  };
}
