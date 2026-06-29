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
// 原样移植自 grafana CriticalPath/utils/sanitizeOverFlowingChildren.tsx；类型 → ../../model。

import type { TraceSpan } from '../../model';

/**
 * 修正越界子 span（时间范围超出父 span）的 startTime/duration，使其落入父 span 范围；
 * 完全越界的子 span 被丢弃。返回修正后的 spanMap。
 */
const sanitizeOverFlowingChildren = (spanMap: Map<string, TraceSpan>): Map<string, TraceSpan> => {
  let spanIds: string[] = [...spanMap.keys()];

  spanIds.forEach((spanId) => {
    const span = spanMap.get(spanId)!;
    if (!(span && span.references.length && span.depth)) {
      return;
    }
    const parentSpan = spanMap.get(span.references[0].spanID);

    if (!parentSpan) {
      spanMap.delete(span.spanID);
      return;
    }
    const childEndTime = span.startTime + span.duration;
    const parentEndTime = parentSpan.startTime + parentSpan.duration;
    if (span.startTime >= parentSpan.startTime) {
      if (span.startTime >= parentEndTime) {
        spanMap.delete(span.spanID);
        parentSpan.childSpanIds = parentSpan.childSpanIds.filter((id) => id !== span.spanID);
        return;
      }
      if (childEndTime > parentEndTime) {
        spanMap.set(span.spanID, { ...span, duration: parentEndTime - span.startTime });
        return;
      }
      return;
    }
    if (childEndTime <= parentSpan.startTime) {
      spanMap.delete(span.spanID);
      parentSpan.childSpanIds = parentSpan.childSpanIds.filter((id) => id !== span.spanID);
    } else if (childEndTime <= parentEndTime) {
      spanMap.set(span.spanID, {
        ...span,
        startTime: parentSpan.startTime,
        duration: childEndTime - parentSpan.startTime,
      });
    } else {
      spanMap.set(span.spanID, {
        ...span,
        startTime: parentSpan.startTime,
        duration: parentEndTime - parentSpan.startTime,
      });
    }
  });

  spanIds = [...spanMap.keys()];
  spanIds.forEach((spanId) => {
    const span = spanMap.get(spanId)!;
    if (span.references.length) {
      const parentSpan = spanMap.get(span.references[0].spanID);
      span.references[0].span = parentSpan;
      spanMap.set(spanId, { ...span });
    }
  });

  return spanMap;
};

export default sanitizeOverFlowingChildren;
