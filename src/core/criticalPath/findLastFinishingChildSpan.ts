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
// 原样移植自 grafana CriticalPath/utils/findLastFinishingChildSpan.tsx；类型 → ../../model。

import type { TraceSpan } from '../../model';

/**
 * 返回剩余子 span 中最后完成的那个；若给定 returningChildStartTime，
 * 则返回在该时间点之前完成的子 span。
 */
const findLastFinishingChildSpan = (
  spanMap: Map<string, TraceSpan>,
  currentSpan: TraceSpan,
  returningChildStartTime?: number
): TraceSpan | undefined => {
  let lastFinishingChildSpanId: string | undefined;
  if (returningChildStartTime) {
    lastFinishingChildSpanId = currentSpan?.childSpanIds.find(
      (each) =>
        spanMap.has(each) && spanMap.get(each)!.startTime + spanMap.get(each)!.duration < returningChildStartTime
    );
  } else {
    lastFinishingChildSpanId = currentSpan.childSpanIds[0];
  }
  return lastFinishingChildSpanId ? spanMap.get(lastFinishingChildSpanId) : undefined;
};

export default findLastFinishingChildSpan;
