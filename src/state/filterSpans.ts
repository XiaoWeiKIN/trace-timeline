// 本地文本搜索（本项目自研，Story 4.1）。
// 跨 operationName / serviceName / tags(key+value) / process.tags / logs(field key+value, log.name) / spanID 做子串匹配。
// 多词空格分隔，任一词命中任一字段（大小写不敏感）即命中；spanID 走整词相等。纯函数、零第三方依赖。
import type { TraceSpan } from '../model';

function asText(value: unknown): string {
  return value == null ? '' : String(value);
}

/**
 * 文本查询命中的 spanID 集合；query 为空返回 undefined（= 无过滤）。
 * 多个词以空格分隔，任一词命中任一字段（子串，大小写不敏感）即算命中；spanID 需整词相等。
 */
export function filterSpans(query: string, spans: TraceSpan[] | null | undefined): Set<string> | undefined {
  if (!spans || !query || !query.trim()) {
    return undefined;
  }
  const parts = query
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  if (parts.length === 0) {
    return undefined;
  }

  const hit = (text: string) => {
    const lc = text.toLowerCase();
    return parts.some((p) => lc.includes(p));
  };
  const hitKVs = (kvs: TraceSpan['tags'] | undefined) =>
    Array.isArray(kvs) ? kvs.some((kv) => hit(kv.key) || hit(asText(kv.value))) : false;

  const matched = spans.filter((span) => {
    return (
      hit(span.operationName) ||
      hit(span.process?.serviceName ?? '') ||
      hitKVs(span.tags) ||
      hitKVs(span.process?.tags) ||
      (Array.isArray(span.logs) && span.logs.some((log) => hitKVs(log.fields) || (log.name ? hit(log.name) : false))) ||
      parts.some((p) => p === span.spanID.toLowerCase())
    );
  });

  return new Set(matched.map((s) => s.spanID));
}
