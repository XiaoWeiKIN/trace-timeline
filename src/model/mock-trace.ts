// 手写 mock trace（多服务 + 深嵌套 + 错误 span + references + FOLLOWS_FROM），供 demo/测试。
// 时间单位微秒。经 transformTraceData 得到派生 mockTrace。
import transformTraceData from './transform-trace-data';
import type { Trace, TraceResponse, TraceSpanData, TraceSpanReference } from './types';

const TRACE_ID = 'a1b2c3d4e5f600000000000000000001';
const T0 = 1_700_000_000_000_000; // 基准微秒

function childOf(spanID: string): TraceSpanReference[] {
  return [{ refType: 'CHILD_OF', spanID, traceID: TRACE_ID }];
}
function followsFrom(spanID: string): TraceSpanReference[] {
  return [{ refType: 'FOLLOWS_FROM', spanID, traceID: TRACE_ID }];
}

function span(p: Partial<TraceSpanData> & Pick<TraceSpanData, 'spanID' | 'processID' | 'operationName' | 'startTime' | 'duration'>): TraceSpanData {
  return {
    traceID: TRACE_ID,
    logs: [],
    tags: [],
    flags: 0,
    references: [],
    ...p,
  };
}

export const mockTraceResponse: TraceResponse = {
  traceID: TRACE_ID,
  processes: {
    p1: { serviceName: 'mall-order-api', tags: [{ key: 'telemetry.sdk.language', value: 'java' }] },
    p2: { serviceName: 'redis', tags: [] },
    p3: { serviceName: 'user-service', tags: [] },
    p4: { serviceName: 'mysql', tags: [] },
  },
  spans: [
    span({
      spanID: 's1',
      processID: 'p1',
      operationName: 'GET /user',
      startTime: T0,
      duration: 102_000,
      kind: 'server',
      tags: [
        { key: 'http.method', value: 'GET' },
        { key: 'http.status_code', value: 200 },
        { key: 'http.url', value: 'http://localhost:9001/user' },
        { key: 'http.host', value: 'localhost' },
        { key: 'http.path', value: '/user' },
        { key: 'http.route', value: '/user' },
        { key: 'span.kind', value: 'server' },
        // JSON 结构值——演示详情卡 JSON 着色（Story 3.3）
        { key: 'http.request.headers', value: '{"accept":"application/json","x-request-id":"abc-123","retries":2,"cached":false}' },
      ],
    }),
    span({
      spanID: 's2',
      processID: 'p1',
      operationName: 'HelloController.create',
      startTime: T0 + 20_000,
      duration: 28_200,
      references: childOf('s1'),
      tags: [{ key: 'component', value: 'spring-webmvc' }],
    }),
    span({
      spanID: 's3',
      processID: 'p2',
      operationName: 'redis SET',
      startTime: T0 + 35_000,
      duration: 7_340,
      kind: 'client',
      references: childOf('s2'),
      // 叶子 client + peer.service → 未插桩外部服务推断（FR-17，Story 4.4）
      tags: [
        { key: 'db.system', value: 'redis' },
        { key: 'peer.service', value: 'redis-cache' },
      ],
      logs: [{ timestamp: T0 + 36_000, fields: [{ key: 'event', value: 'cache miss' }] }],
    }),
    span({
      spanID: 's4',
      processID: 'p1',
      operationName: 'GET /error',
      startTime: T0 + 60_000,
      duration: 34_900,
      statusCode: 2,
      references: childOf('s1'),
      tags: [
        { key: 'error', value: true },
        { key: 'http.status_code', value: 500 },
      ],
    }),
    span({
      spanID: 's5',
      processID: 'p1',
      operationName: 'BasicErrorController.errorHtml',
      startTime: T0 + 70_000,
      duration: 13_000,
      references: childOf('s4'),
    }),
    span({
      spanID: 's6',
      processID: 'p1',
      operationName: 'response.render error',
      startTime: T0 + 78_000,
      duration: 20_900,
      statusCode: 2,
      references: childOf('s4'),
      tags: [{ key: 'error', value: true }],
      warnings: ['render failed'],
    }),
    span({
      spanID: 's7',
      processID: 'p3',
      operationName: 'GET /order',
      startTime: T0 + 40_000,
      duration: 18_500,
      kind: 'client',
      references: childOf('s1'),
      tags: [{ key: 'http.status_code', value: 200 }],
    }),
    span({
      spanID: 's8',
      processID: 'p4',
      operationName: 'SELECT mall_order.sales_order',
      startTime: T0 + 44_000,
      duration: 5_436,
      kind: 'client',
      references: childOf('s7'),
      tags: [{ key: 'db.system', value: 'mysql' }],
    }),
    span({
      spanID: 's9',
      processID: 'p3',
      operationName: 'async post-process',
      startTime: T0 + 50_000,
      duration: 3_000,
      references: followsFrom('s8'),
    }),
  ],
};

export const mockTrace: Trace = transformTraceData(mockTraceResponse)!;
