// DataFox 取数助手（Story 5.2；FR-29 / AD-14）——可选层：库本身仍 props 驱动。
// fetchTrace 从 DataFox `/api/v3/spans/search` 拉单条 trace，响应经 fromDataFox 返回内部 Trace。
import { fromDataFox, type DataFoxResponse } from '../../model/adapters/fromDataFox';
import type { Trace } from '../../model';

/** 最小 fetch 类型（注入用，避免依赖 DOM lib 的全局 fetch 形状）。 */
export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export interface FetchTraceOptions {
  /** DataFox 基址（必填），如 `http://datafox.example.com`。 */
  baseUrl: string;
  /** 时间窗起点（如 `now-1h`）。 */
  from?: string;
  /** 时间窗终点（如 `now`）。 */
  to?: string;
  /** 注入 fetch（默认全局 fetch）；便于测试/SSR。 */
  fetch?: FetchLike;
  /** 额外请求头（如鉴权）。 */
  headers?: Record<string, string>;
  /** 单页条数上限（默认 1000）。 */
  limit?: number;
}

const SEARCH_PATH = '/api/v3/spans/search';

/**
 * 拉取单条 trace：POST `{baseUrl}/api/v3/spans/search`，body `filter.query="trace_id:<id>"`，
 * 响应经 fromDataFox → Trace。`<TraceTimeline>` 仍 props 驱动（本助手可选）。
 */
export async function fetchTrace(traceId: string, opts: FetchTraceOptions): Promise<Trace | null> {
  if (!traceId) {
    throw new Error('fetchTrace: traceId 必填');
  }
  if (!opts || !opts.baseUrl) {
    throw new Error('fetchTrace: opts.baseUrl 必填');
  }
  const doFetch: FetchLike = opts.fetch ?? (globalThis.fetch as unknown as FetchLike);
  if (!doFetch) {
    throw new Error('fetchTrace: 无可用 fetch（请注入 opts.fetch）');
  }

  const url = `${opts.baseUrl.replace(/\/$/, '')}${SEARCH_PATH}`;
  const body = {
    filter: { query: `trace_id:${traceId}` },
    from: opts.from ?? 'now-1h',
    to: opts.to ?? 'now',
    limit: opts.limit ?? 1000,
  };

  const res = await doFetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(opts.headers ?? {}) },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`fetchTrace: DataFox 返回 ${res.status}`);
  }
  const json = (await res.json()) as DataFoxResponse;
  return fromDataFox(json);
}
