// 键值表（FR-10/3.4）——渲染语义分组的 AttrRow[]（label + 值）。
// 视觉对齐 Datadog（标签列 ≈156px / label 0.68 / 行高 18.2px）。
// 值按 kind 渲染：status→pill / link→蓝链接 / 复杂 JSON→jsonMarkup 着色(DOMPurify 净化) / 其余文本。
import { css } from '@emotion/css';
import DOMPurify from 'dompurify';

import { useStyles2, type Theme } from '../theme';

import type { AttrRow } from './attributeGroups';
import { httpStatusToken } from './colorAccessor';
import jsonMarkup, { parseIfComplexJson } from './jsonMarkup';

const getStyles = (theme: Theme) => ({
  table: css({ label: 'DdKeyValuesTable', fontFamily: theme.trace.fontFamily, fontSize: 13, width: '100%' }),
  row: css({ label: 'DdKeyValuesRow', display: 'flex', alignItems: 'baseline', lineHeight: '18.2px', padding: '1px 0' }),
  key: css({
    label: 'DdKeyValuesKey',
    flex: 'none',
    width: theme.trace.detail.keyColumnWidth,
    paddingRight: 12,
    boxSizing: 'border-box',
    color: theme.trace.detail.label,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  value: css({ label: 'DdKeyValuesValue', minWidth: 0, color: theme.colors.text.primary, wordBreak: 'break-word' }),
  link: css({ label: 'DdKeyValuesLink', color: theme.trace.detail.link, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }),
  empty: css({ label: 'DdKeyValuesEmpty', color: theme.trace.detail.label, fontSize: 12, padding: '2px 0' }),
  pill: css({
    label: 'DdKeyValuesPill',
    display: 'inline-block',
    padding: '0 6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: theme.typography.fontWeightMedium,
  }),
  json: css({
    label: 'DdKeyValuesJson',
    '& .json-markup': { whiteSpace: 'pre', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, lineHeight: '16px', margin: 0 },
    '& .json-markup-key': { color: theme.trace.detail.json.key },
    '& .json-markup-string': { color: theme.trace.detail.json.string },
    '& .json-markup-number': { color: theme.trace.detail.json.number },
    '& .json-markup-bool': { color: theme.trace.detail.json.bool },
    '& .json-markup-null': { color: theme.trace.detail.json.null },
  }),
});

type Styles = ReturnType<typeof getStyles>;

function isUrl(v: string): boolean {
  return /^https?:\/\//.test(v);
}

function renderValue(row: AttrRow, theme: Theme, styles: Styles) {
  const { value, kind } = row;
  const text = typeof value === 'string' ? value : value == null ? '' : String(value);

  // 状态码 pill（绿/红，复用 Story 1.6 令牌）
  if (kind === 'status') {
    const code = Number(value);
    if (!Number.isNaN(code)) {
      const c = httpStatusToken(code, theme);
      return (
        <span className={styles.pill} style={{ color: c.fg, background: c.bg }}>
          {code}
        </span>
      );
    }
  }

  // 复杂 JSON → 着色 + 净化
  const parsed = parseIfComplexJson(value);
  if (parsed !== null) {
    const safe = DOMPurify.sanitize(jsonMarkup(parsed));
    return <span className={styles.json} dangerouslySetInnerHTML={{ __html: safe }} />;
  }

  // 链接（显式 link kind 或看着像 URL）
  if ((kind === 'link' || isUrl(text)) && isUrl(text)) {
    return (
      <a className={styles.link} href={text} target="_blank" rel="noreferrer noopener">
        {text}
      </a>
    );
  }

  return text;
}

interface Props {
  rows: AttrRow[];
}

export function DdKeyValuesTable({ rows }: Props) {
  const styles = useStyles2(getStyles);
  const theme = useStyles2((t) => t);
  if (!Array.isArray(rows) || rows.length === 0) {
    return <div className={styles.empty}>无</div>;
  }
  return (
    <div className={styles.table} data-testid="DdKeyValuesTable">
      {rows.map((row, i) => (
        <div className={styles.row} key={`${row.label}-${i}`}>
          <span className={styles.key} title={row.label}>
            {row.label}
          </span>
          <span className={styles.value}>{renderValue(row, theme, styles)}</span>
        </div>
      ))}
    </div>
  );
}
