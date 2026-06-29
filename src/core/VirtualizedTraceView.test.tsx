import { render } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { mockTrace, transformTraceData } from '../model';
import type { Trace, TraceResponse, TraceSpanData } from '../model';

import VirtualizedTraceView, { type VirtualizedTraceViewProps } from './VirtualizedTraceView';
import type { RenderableRow } from './rowRenderer.types';

function noop() {}

/** 渲染引擎并收集派发的 RenderableRow（按 key 去重，取最后一次）。 */
function renderEngine(trace: Trace, override: Partial<VirtualizedTraceViewProps> = {}) {
  const rows = new Map<string, RenderableRow>();
  const props: VirtualizedTraceViewProps = {
    trace,
    currentViewRangeTime: [0, 1],
    childrenHiddenIDs: new Set(),
    detailStates: new Map(),
    findMatchesIDs: null,
    showSpanFilterMatchesOnly: false,
    criticalPath: [],
    spanNameColumnWidth: 0.25,
    hoverIndentGuideIds: new Set(),
    headerHeight: 0,
    rowRenderer: (row) => {
      rows.set(`${row.span.spanID}-${row.isDetail}`, row);
      return createElement('span', { 'data-span': row.span.spanID });
    },
    childrenToggle: noop,
    detailToggle: noop,
    addHoverIndentGuideId: noop,
    removeHoverIndentGuideId: noop,
    ...override,
  };
  const result = render(createElement(VirtualizedTraceView, props));
  return { rows, result };
}

describe('VirtualizedTraceView — rowRenderer 契约', () => {
  it('每行派发精确 RenderableRow：viewBounds 投影 [0,1]、ancestorSpanIds 根→父 length===depth', () => {
    const { rows } = renderEngine(mockTrace);

    // 9 个 span、无折叠/详情 → 9 个 bar 行
    const barRows = [...rows.values()].filter((r) => !r.isDetail);
    expect(barRows).toHaveLength(9);

    // 根 span s1 覆盖整个视图区间
    const s1 = rows.get('s1-false')!;
    expect(s1.depth).toBe(0);
    expect(s1.viewBounds.start).toBeCloseTo(0, 6);
    expect(s1.viewBounds.end).toBeCloseTo(1, 6);
    expect(s1.viewBounds.clippingLeft).toBe(false);
    expect(s1.viewBounds.clippingRight).toBe(false);

    // 不变量：ancestorSpanIds 长度 === depth，且根在最前
    for (const r of barRows) {
      expect(r.ancestorSpanIds).toHaveLength(r.depth);
      if (r.depth > 0) {
        expect(r.ancestorSpanIds[0]).toBe('s1'); // 根总是 s1
      }
    }

    // s9 (async post-process) 经 follows_from→s8→s7→s1，根→父 = [s1,s7,s8]
    const s9 = rows.get('s9-false')!;
    expect(s9.ancestorSpanIds).toEqual(['s1', 's7', 's8']);
  });

  it('isError 与 httpStatus 正确提取', () => {
    const { rows } = renderEngine(mockTrace);
    expect(rows.get('s4-false')!.isError).toBe(true); // statusCode 2 + error tag
    expect(rows.get('s4-false')!.httpStatus).toBe(500);
    expect(rows.get('s1-false')!.isError).toBe(false);
    expect(rows.get('s1-false')!.httpStatus).toBe(200);
  });

  it('缩放窗 [0.25,0.75] 时 viewBounds 重投影且置 clipping', () => {
    const { rows } = renderEngine(mockTrace, { currentViewRangeTime: [0.25, 0.75] });
    const s1 = rows.get('s1-false')!;
    // s1 占满 [0,1] → 在窗口 [0.25,0.75] 下被投影为 [-0.5,1.5]
    expect(s1.viewBounds.start).toBeCloseTo(-0.5, 6);
    expect(s1.viewBounds.end).toBeCloseTo(1.5, 6);
    expect(s1.viewBounds.clippingLeft).toBe(true);
    expect(s1.viewBounds.clippingRight).toBe(true);
  });

  it('折叠 span 后其后代行不派发', () => {
    const { rows } = renderEngine(mockTrace, { childrenHiddenIDs: new Set(['s4']) });
    expect(rows.has('s4-false')).toBe(true);
    // s5/s6 是 s4 的后代 → 折叠后不应出现
    expect(rows.has('s5-false')).toBe(false);
    expect(rows.has('s6-false')).toBe(false);
    // 折叠的 s4 子树含错误 → descendantHasError
    expect(rows.get('s4-false')!.isCollapsed).toBe(true);
    expect(rows.get('s4-false')!.descendantHasError).toBe(true);
  });

  it('1000 span trace 虚拟化：渲染行数 ≪ 总数（jsdom 走 initialDraw 上限 100）', () => {
    const big = makeBigTrace(1000);
    expect(big.spans).toHaveLength(1000);
    const { rows } = renderEngine(big);
    const rendered = [...rows.values()].filter((r) => !r.isDetail).length;
    expect(rendered).toBeLessThan(1000);
    expect(rendered).toBeLessThanOrEqual(100);
  });
});

/** 生成 root + (n-1) 个直接子的合成 trace。startTime 用非零微秒（上游会过滤 startTime 为 0 的 span）。 */
function makeBigTrace(n: number): Trace {
  const traceID = 'big0000000000000000000000000001';
  const T0 = 1_700_000_000_000_000;
  const spans: TraceSpanData[] = [
    {
      traceID,
      spanID: 'sp0',
      processID: 'p1',
      operationName: 'root',
      startTime: T0,
      duration: n * 10,
      logs: [],
      tags: [],
      flags: 0,
      references: [],
    },
  ];
  for (let i = 1; i < n; i++) {
    spans.push({
      traceID,
      spanID: `s${i}`,
      processID: 'p1',
      operationName: `op-${i}`,
      startTime: T0 + i * 5,
      duration: 5,
      logs: [],
      tags: [],
      flags: 0,
      references: [{ refType: 'CHILD_OF', spanID: 'sp0', traceID }],
    });
  }
  const resp: TraceResponse = {
    traceID,
    processes: { p1: { serviceName: 'svc', tags: [] } },
    spans,
  };
  return transformTraceData(resp)!;
}
