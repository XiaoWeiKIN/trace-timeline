// HTTP 请求摘要条（Story 5.3；UX-DR11）——详情头风格：method pill + url + HTTP 状态 pill。
// 仅在 span 含 http.method/http.url/http.status_code 时渲染。配色复用 theme + httpStatusToken。
import { css } from '@emotion/css';

import type { TraceSpan } from '../model';
import { useStyles2, type Theme } from '../theme';

import { httpStatusToken } from './colorAccessor';

const getStyles = (theme: Theme) => ({
  bar: css({
    label: 'DdHttpRequestBar',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 8px',
    fontFamily: theme.trace.fontFamily,
    fontSize: 13,
    borderBottom: `1px solid ${theme.trace.detail.border}`,
    minWidth: 0,
  }),
  method: css({
    label: 'DdHttpMethodPill',
    flex: 'none',
    padding: '1px 6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: theme.typography.fontWeightMedium,
    color: '#fff',
    background: theme.colors.primary.main,
    letterSpacing: 0.3,
  }),
  url: css({
    label: 'DdHttpUrl',
    color: theme.trace.detail.link,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
    textDecoration: 'none',
    '&:hover': { textDecoration: 'underline' },
  }),
  status: css({
    label: 'DdHttpStatusPill',
    flex: 'none',
    marginLeft: 'auto',
    padding: '1px 6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: theme.typography.fontWeightMedium,
  }),
});

function tagValue(span: TraceSpan, keys: string[]): unknown {
  for (const k of keys) {
    const kv = span.tags?.find((t) => t.key === k);
    if (kv != null) {
      return kv.value;
    }
  }
  return undefined;
}

interface Props {
  span: TraceSpan;
}

export function DdHttpRequestBar({ span }: Props) {
  const styles = useStyles2(getStyles);
  const theme = useStyles2((t) => t);

  const method = tagValue(span, ['http.method', 'http.request.method']);
  const url = tagValue(span, ['http.url', 'url.full']);
  const statusRaw = tagValue(span, ['http.status_code', 'http.response.status_code']);

  // 无任何 HTTP 字段 → 不渲染。
  if (method == null && url == null && statusRaw == null) {
    return null;
  }

  const code = statusRaw != null ? Number(statusRaw) : NaN;
  const statusColor = !Number.isNaN(code) ? httpStatusToken(code, theme) : null;
  const urlText = url != null ? String(url) : '';
  const isLink = /^https?:\/\//.test(urlText);

  return (
    <div className={styles.bar} data-testid="DdHttpRequestBar">
      {method != null && <span className={styles.method}>{String(method).toUpperCase()}</span>}
      {urlText &&
        (isLink ? (
          <a className={styles.url} href={urlText} target="_blank" rel="noreferrer noopener" title={urlText}>
            {urlText}
          </a>
        ) : (
          <span className={styles.url} title={urlText}>
            {urlText}
          </span>
        ))}
      {statusColor && !Number.isNaN(code) && (
        <span className={styles.status} style={{ color: statusColor.fg, background: statusColor.bg }}>
          {code}
        </span>
      )}
    </div>
  );
}
