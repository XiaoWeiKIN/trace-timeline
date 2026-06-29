// 自研 JSON 语法着色器（Story 3.3）——把已解析的 JSON 值转成带 `json-markup-*` 类的 HTML 串，
// 供 DdKeyValuesTable 经 DOMPurify 净化后渲染。所有文本内容 HTML 转义（DOMPurify 为第二道防线）。
// 类名与上游一致（json-markup / -key / -string / -number / -bool / -null），便于 CSS 对齐。

const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c]);
}

function span(cls: string, text: string): string {
  return `<span class="${cls}">${escapeHtml(text)}</span>`;
}

const INDENT = '  ';

function markupValue(value: unknown, depth: number): string {
  if (value === null) {
    return span('json-markup-null', 'null');
  }
  const t = typeof value;
  if (t === 'string') {
    return span('json-markup-string', JSON.stringify(value));
  }
  if (t === 'number') {
    return span('json-markup-number', String(value));
  }
  if (t === 'boolean') {
    return span('json-markup-bool', String(value));
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const pad = INDENT.repeat(depth + 1);
    const close = INDENT.repeat(depth);
    const items = value.map((v) => `${pad}${markupValue(v, depth + 1)}`).join(',\n');
    return `[\n${items}\n${close}]`;
  }
  if (t === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return '{}';
    }
    const pad = INDENT.repeat(depth + 1);
    const close = INDENT.repeat(depth);
    const items = entries
      .map(([k, v]) => `${pad}${span('json-markup-key', `${JSON.stringify(k)}:`)} ${markupValue(v, depth + 1)}`)
      .join(',\n');
    return `{\n${items}\n${close}}`;
  }
  // 兜底（undefined/function 等不应出现在 JSON）
  return span('json-markup-null', 'null');
}

/** 把 JSON 值渲染为带 json-markup-* 类的 HTML 串（外层 .json-markup 容器，white-space:pre）。 */
export default function jsonMarkup(value: unknown): string {
  return `<div class="json-markup">${markupValue(value, 0)}</div>`;
}

const jsonObjectOrArrayStartRegex = /^(\[|\{)/;

/** 若 value 是表示 JSON 对象/数组的字符串则解析返回；否则返回 null（非复杂 JSON）。 */
export function parseIfComplexJson(value: unknown): unknown | null {
  if (typeof value === 'object' && value !== null) {
    return value;
  }
  if (typeof value === 'string' && jsonObjectOrArrayStartRegex.test(value.trim())) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}
