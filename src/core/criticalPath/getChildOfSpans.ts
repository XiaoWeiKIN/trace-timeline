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
// 原样移植自 grafana CriticalPath/utils/getChildOfSpans.tsx；类型 → ../../model。

import type { TraceSpan } from '../../model';

/**
 * 移除 refType 为 FOLLOWS_FROM 的子 span 及其后代，仅保留 CHILD_OF 的 span。
 */
const getChildOfSpans = (spanMap: Map<string, TraceSpan>): Map<string, TraceSpan> => {
  const followFromSpanIds: string[] = [];
  const followFromSpansDescendantIds: string[] = [];

  spanMap.forEach((each) => {
    if (each.references[0]?.refType === 'FOLLOWS_FROM') {
      followFromSpanIds.push(each.spanID);
      const parentSpan = spanMap.get(each.references[0].spanID)!;
      parentSpan.childSpanIds = parentSpan.childSpanIds.filter((a) => a !== each.spanID);
      spanMap.set(parentSpan.spanID, { ...parentSpan });
    }
  });

  const findDescendantSpans = (spanIds: string[]) => {
    spanIds.forEach((spanId) => {
      const span = spanMap.get(spanId)!;
      if (span.hasChildren) {
        followFromSpansDescendantIds.push(...span.childSpanIds);
        findDescendantSpans(span.childSpanIds);
      }
    });
  };
  findDescendantSpans(followFromSpanIds);
  const idsToBeDeleted = [...followFromSpanIds, ...followFromSpansDescendantIds];
  idsToBeDeleted.forEach((id) => spanMap.delete(id));

  return spanMap;
};

export default getChildOfSpans;
