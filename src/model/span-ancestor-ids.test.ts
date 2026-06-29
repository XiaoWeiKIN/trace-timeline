import { describe, expect, it } from 'vitest';

import spanAncestorIds from './span-ancestor-ids';
import transformTraceData from './transform-trace-data';
import type { TraceResponse, TraceSpanData } from './types';

const TID = 'anc-0001';
function mk(
  p: Partial<TraceSpanData> & Pick<TraceSpanData, 'spanID' | 'startTime'>
): TraceSpanData {
  return {
    traceID: TID,
    processID: 'p1',
    operationName: p.spanID,
    duration: 1,
    logs: [],
    tags: [],
    flags: 0,
    references: [],
    ...p,
  };
}

describe('spanAncestorIds', () => {
  it('沿 references 返回祖先链（最近在前）', () => {
    const resp: TraceResponse = {
      traceID: TID,
      processes: { p1: { serviceName: 's', tags: [] } },
      spans: [
        mk({ spanID: 'r', startTime: 1 }),
        mk({ spanID: 'c', startTime: 2, references: [{ refType: 'CHILD_OF', spanID: 'r', traceID: TID }] }),
        mk({ spanID: 'g', startTime: 3, references: [{ refType: 'CHILD_OF', spanID: 'c', traceID: TID }] }),
      ],
    };
    const t = transformTraceData(resp)!;
    const g = t.spans.find((s) => s.spanID === 'g')!;
    expect(spanAncestorIds(g)).toEqual(['c', 'r']);
  });

  it('root span 无祖先', () => {
    const resp: TraceResponse = {
      traceID: TID,
      processes: { p1: { serviceName: 's', tags: [] } },
      spans: [mk({ spanID: 'r', startTime: 1 })],
    };
    const t = transformTraceData(resp)!;
    expect(spanAncestorIds(t.spans[0])).toEqual([]);
  });
});
