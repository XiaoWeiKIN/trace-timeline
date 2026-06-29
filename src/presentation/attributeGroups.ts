// 语义属性分组引擎（Story 3.4）——把 span.tags 按 OTel/语义命名空间归组 + 友好标签，
// 对齐 Datadog 详情面板「HTTP Requests / URL Details / Database / Network + Span Attributes(catch-all)」。
// 映射为务实集（覆盖常见命名空间，未命中落 catch-all 原样显示），见调研 Deduction 3。
import type { TraceKeyValuePair, TraceSpan } from '../model';

export type AttrKind = 'status' | 'link' | 'text';

export interface AttrRow {
  label: string;
  value: unknown;
  kind: AttrKind;
}

export interface AttrGroup {
  title: string;
  rows: AttrRow[];
}

/** 友好字段定义：命中任一源 key → 用 label 显示，归入 group。 */
interface FieldDef {
  label: string;
  keys: string[];
  group: string;
  kind: AttrKind;
}

// 组顺序（仅有数据的组渲染）。
const GROUP_ORDER = ['HTTP Requests', 'URL Details', 'Database', 'Network'] as const;
const CATCH_ALL = 'Span Attributes';

const FIELD_DEFS: FieldDef[] = [
  { label: 'Method', keys: ['http.method', 'http.request.method'], group: 'HTTP Requests', kind: 'text' },
  { label: 'Status Code', keys: ['http.status_code', 'http.response.status_code'], group: 'HTTP Requests', kind: 'status' },
  { label: 'URL', keys: ['http.url', 'url.full'], group: 'HTTP Requests', kind: 'link' },
  { label: 'User Agent', keys: ['http.useragent', 'user_agent.original', 'http.user_agent'], group: 'HTTP Requests', kind: 'link' },
  { label: 'http.route', keys: ['http.route'], group: 'HTTP Requests', kind: 'text' },
  { label: 'HTTP Host', keys: ['http.host', 'server.address', 'url.domain'], group: 'URL Details', kind: 'text' },
  { label: 'HTTP Path', keys: ['http.path', 'url.path'], group: 'URL Details', kind: 'text' },
  { label: 'HTTP Scheme', keys: ['http.scheme', 'url.scheme'], group: 'URL Details', kind: 'text' },
  { label: 'DB System', keys: ['db.system'], group: 'Database', kind: 'text' },
  { label: 'DB Statement', keys: ['db.statement', 'db.query.text'], group: 'Database', kind: 'text' },
  { label: 'DB Name', keys: ['db.name', 'db.namespace'], group: 'Database', kind: 'text' },
  { label: 'Peer Service', keys: ['peer.service', 'net.peer.name', 'server.address'], group: 'Network', kind: 'text' },
  { label: 'Peer Port', keys: ['net.peer.port', 'server.port'], group: 'Network', kind: 'text' },
];

// key → {def, order} 快查（首个定义优先；order = FIELD_DEFS 定义序，用于组内排序对齐 Datadog）。
const KEY_TO_FIELD = new Map<string, { def: FieldDef; order: number }>();
FIELD_DEFS.forEach((def, order) => {
  for (const k of def.keys) {
    if (!KEY_TO_FIELD.has(k)) {
      KEY_TO_FIELD.set(k, { def, order });
    }
  }
});

/** 把 span 的 tags 归组为有序 AttrGroup[]（仅含有行的组；catch-all 末尾）。 */
export function buildAttributeGroups(span: TraceSpan): AttrGroup[] {
  const tags: TraceKeyValuePair[] = span.tags ?? [];
  const grouped = new Map<string, Array<AttrRow & { _order: number }>>();
  const catchAll: AttrRow[] = [];
  const usedFieldLabels = new Set<string>();

  for (const kv of tags) {
    const hit = KEY_TO_FIELD.get(kv.key);
    if (hit) {
      const { def, order } = hit;
      // 同一友好字段去重（多源 key 命中只取首个）
      const dedupeKey = `${def.group}::${def.label}`;
      if (usedFieldLabels.has(dedupeKey)) {
        catchAll.push({ label: kv.key, value: kv.value, kind: inferKind(kv.value) });
        continue;
      }
      usedFieldLabels.add(dedupeKey);
      const rows = grouped.get(def.group) ?? [];
      rows.push({ label: def.label, value: kv.value, kind: def.kind, _order: order });
      grouped.set(def.group, rows);
    } else {
      catchAll.push({ label: kv.key, value: kv.value, kind: inferKind(kv.value) });
    }
  }

  const result: AttrGroup[] = [];
  for (const title of GROUP_ORDER) {
    const rows = grouped.get(title);
    if (rows && rows.length) {
      // 组内按 FIELD_DEFS 定义序排列（对齐 Datadog 字段顺序），剥掉 _order。
      rows.sort((a, b) => a._order - b._order);
      result.push({ title, rows: rows.map(({ _order, ...r }) => r) });
    }
  }
  if (catchAll.length) {
    result.push({ title: CATCH_ALL, rows: catchAll });
  }
  return result;
}

/** catch-all 行的 kind 推断：URL→link，其余保守 text。 */
function inferKind(value: unknown): AttrKind {
  if (typeof value === 'string' && /^https?:\/\//.test(value)) {
    return 'link';
  }
  return 'text';
}

export const ATTR_CATCH_ALL_TITLE = CATCH_ALL;
