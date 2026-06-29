// OTLP/JSON 测试 fixture（Story 8.3）——最小但完整：2 service、parent→child、1 个 error span、1 个 event。
// 时间为纳秒（OTLP 约定）；ns→µs = ÷1000。root 起点 1_000_000ns(=1000µs)，便于核对归一化。
import type { OtlpResponse } from './fromOtlp';

export const otlpFixture: OtlpResponse = {
  resourceSpans: [
    {
      resource: {
        attributes: [
          { key: 'service.name', value: { stringValue: 'frontend' } },
          { key: 'host.name', value: { stringValue: 'web-01' } },
        ],
      },
      scopeSpans: [
        {
          scope: { name: '@opentelemetry/instrumentation-http', version: '0.50.0' },
          spans: [
            {
              traceId: 'trace-abc',
              spanId: 'span-root',
              name: 'GET /checkout',
              kind: 2, // server
              startTimeUnixNano: '1000000', // 1000µs
              endTimeUnixNano: '1050000', // 1050µs（dur 50µs）
              attributes: [
                { key: 'http.method', value: { stringValue: 'GET' } },
                { key: 'http.status_code', value: { intValue: '200' } },
              ],
              status: { code: 1 }, // Ok
              events: [
                {
                  timeUnixNano: '1010000',
                  name: 'cache.miss',
                  attributes: [{ key: 'cache.key', value: { stringValue: 'cart:42' } }],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      resource: {
        attributes: [{ key: 'service.name', value: { stringValue: 'payment' } }],
      },
      scopeSpans: [
        {
          scope: { name: '@opentelemetry/instrumentation-grpc', version: '0.50.0' },
          spans: [
            {
              traceId: 'trace-abc',
              spanId: 'span-pay',
              parentSpanId: 'span-root',
              name: 'Charge',
              kind: 3, // client
              startTimeUnixNano: '1010000', // 1010µs
              endTimeUnixNano: '1040000', // 1040µs（dur 30µs）
              attributes: [{ key: 'rpc.system', value: { stringValue: 'grpc' } }],
              status: { code: 'STATUS_CODE_ERROR', message: 'card declined' },
            },
          ],
        },
      ],
    },
  ],
};
