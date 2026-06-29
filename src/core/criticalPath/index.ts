// Copyright (c) 2023 The Jaeger Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// 原样移植自 grafana CriticalPath/index.tsx；类型 → ../../model。
// 计算 trace 的关键路径区段（从根 span 沿「最后完成子 span」递归 + 回溯）。

import memoizeOne from 'memoize-one';

import type { CriticalPathSection, Trace, TraceSpan } from '../../model';

import findLastFinishingChildSpan from './findLastFinishingChildSpan';
import getChildOfSpans from './getChildOfSpans';
import sanitizeOverFlowingChildren from './sanitizeOverFlowingChildren';

const computeCriticalPath = (
  spanMap: Map<string, TraceSpan>,
  spanId: string,
  criticalPath: CriticalPathSection[],
  returningChildStartTime?: number
): CriticalPathSection[] => {
  const currentSpan = spanMap.get(spanId);
  if (!currentSpan) {
    return criticalPath;
  }

  const lastFinishingChildSpan = findLastFinishingChildSpan(spanMap, currentSpan, returningChildStartTime);
  let spanCriticalSection: CriticalPathSection;

  if (lastFinishingChildSpan) {
    spanCriticalSection = {
      spanId: currentSpan.spanID,
      section_start: lastFinishingChildSpan.startTime + lastFinishingChildSpan.duration,
      section_end: returningChildStartTime || currentSpan.startTime + currentSpan.duration,
    };
    if (spanCriticalSection.section_start !== spanCriticalSection.section_end) {
      criticalPath.push(spanCriticalSection);
    }
    computeCriticalPath(spanMap, lastFinishingChildSpan.spanID, criticalPath);
  } else {
    spanCriticalSection = {
      spanId: currentSpan.spanID,
      section_start: currentSpan.startTime,
      section_end: returningChildStartTime || currentSpan.startTime + currentSpan.duration,
    };
    if (spanCriticalSection.section_start !== spanCriticalSection.section_end) {
      criticalPath.push(spanCriticalSection);
    }
    if (currentSpan.references.length) {
      const parentSpanId: string = currentSpan.references.filter((reference) => reference.refType === 'CHILD_OF')[0]
        .spanID;
      computeCriticalPath(spanMap, parentSpanId, criticalPath, currentSpan.startTime);
    }
  }
  return criticalPath;
};

function criticalPathForTrace(trace: Trace): CriticalPathSection[] {
  let criticalPath: CriticalPathSection[] = [];
  const rootSpanId = trace?.spans[0]?.spanID;
  if (rootSpanId) {
    const spanMap = trace.spans.reduce((map, span) => {
      map.set(span.spanID, span);
      return map;
    }, new Map<string, TraceSpan>());
    try {
      const refinedSpanMap = getChildOfSpans(spanMap);
      const sanitizedSpanMap = sanitizeOverFlowingChildren(refinedSpanMap);
      criticalPath = computeCriticalPath(sanitizedSpanMap, rootSpanId, criticalPath);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('error while computing critical path for a trace', error);
    }
  }
  return criticalPath;
}

const memoizedTraceCriticalPath = memoizeOne(criticalPathForTrace);

export default memoizedTraceCriticalPath;
