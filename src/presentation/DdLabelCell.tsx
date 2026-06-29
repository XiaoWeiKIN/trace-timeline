// 左标签列（UX-DR9）：缩进竖线 + 折叠箭头 + 子代计数 + resource 文本 + HTTP 状态 pill + 错误 ⚠。
import { css } from '@emotion/css';

import type { RenderableRow } from '../core';
import { useStyles2, type Theme } from '../theme';
import { Icon } from '../ui';

import { colorForService, httpStatusToken } from './colorAccessor';
import { DdIndentGuides } from './DdIndentGuides';

const getStyles = (theme: Theme) => ({
  cell: css({
    label: 'DdLabelCell',
    display: 'flex',
    alignItems: 'center',
    minWidth: 0,
    height: '100%',
    fontFamily: theme.trace.fontFamily,
    fontSize: 12,
    color: theme.colors.text.primary,
  }),
  errorIcon: css({
    label: 'DdLabelError',
    color: theme.trace.status.error.fg,
    display: 'inline-flex',
    marginRight: 4,
    flex: 'none',
  }),
  text: css({
    label: 'DdLabelText',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    minWidth: 0,
    cursor: 'pointer',
    '&:hover': { textDecoration: 'underline' },
  }),
  service: css({ fontWeight: theme.typography.fontWeightMedium }),
  operation: css({ color: theme.colors.text.secondary, marginLeft: 6 }),
  count: css({
    label: 'DdLabelCount',
    flex: 'none',
    marginLeft: 6,
    padding: '0 5px',
    borderRadius: theme.shape.radius.md,
    background: theme.colors.background.secondary,
    color: theme.colors.text.secondary,
    fontSize: 11,
  }),
  pill: css({
    label: 'DdHttpStatusPill',
    flex: 'none',
    marginLeft: 6,
    padding: '1px 5px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: theme.typography.fontWeightMedium,
  }),
  // RPC 合并 / 未插桩外部服务（Story 4.4）。
  rpc: css({
    label: 'DdLabelRpc',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    marginLeft: 6,
    minWidth: 0,
    color: theme.colors.text.secondary,
  }),
  rpcDot: css({ label: 'DdLabelRpcDot', width: 8, height: 8, borderRadius: 2, flex: 'none' }),
  rpcArrow: css({ label: 'DdLabelRpcArrow', color: theme.colors.text.secondary, flex: 'none' }),
  rpcText: css({ label: 'DdLabelRpcText', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }),
});

interface Props {
  row: RenderableRow;
  colorForSpanId: (id: string) => string;
}

export function DdLabelCell({ row, colorForSpanId }: Props) {
  const styles = useStyles2(getStyles);
  const theme = useStyles2((t) => t);
  const { span } = row;
  const showError = row.isError || row.descendantHasError;
  const statusColor = row.httpStatus != null ? httpStatusToken(row.httpStatus, theme) : null;

  return (
    <div className={styles.cell}>
      <DdIndentGuides
        ancestorSpanIds={row.ancestorSpanIds}
        hasChildren={span.hasChildren}
        isCollapsed={row.isCollapsed}
        colorForSpanId={colorForSpanId}
        onToggle={() => row.onChildrenToggle(span.spanID)}
        hoverIndentGuideIds={row.hoverIndentGuideIds}
        addHoverIndentGuideId={row.addHoverIndentGuideId}
        removeHoverIndentGuideId={row.removeHoverIndentGuideId}
      />
      {showError && (
        <span className={styles.errorIcon} title={row.isError ? 'error' : 'descendant error'}>
          <Icon name="exclamation-circle" size={13} />
        </span>
      )}
      <span
        className={styles.text}
        title={`${span.process.serviceName} · ${span.operationName}（点击查看详情）`}
        onClick={() => row.onDetailToggle(span.spanID)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            row.onDetailToggle(span.spanID);
          }
        }}
      >
        <span className={styles.service}>{span.process.serviceName}</span>
        <span className={styles.operation}>{span.operationName}</span>
      </span>
      {/* RPC 合并：折叠 client 时显示其 server 子的对端服务/操作（服务色着色，AD-6） */}
      {row.rpc && (
        <span className={styles.rpc} title={`${row.rpc.serviceName} · ${row.rpc.operationName}`} data-testid="rpc-merge">
          <span className={styles.rpcArrow}>
            <Icon name="arrow-right" size={11} />
          </span>
          <span className={styles.rpcDot} style={{ background: colorForService(row.rpc.serviceName, theme) }} />
          <span className={styles.rpcText}>
            <span className={styles.service}>{row.rpc.serviceName}</span>
            <span className={styles.operation}>{row.rpc.operationName}</span>
          </span>
        </span>
      )}
      {/* 未插桩外部服务：叶子 client + peer.service */}
      {!row.rpc && row.noInstrumentedServer && (
        <span className={styles.rpc} title={`外部服务 ${row.noInstrumentedServer.serviceName}`} data-testid="peer-service">
          <span className={styles.rpcArrow}>
            <Icon name="arrow-right" size={11} />
          </span>
          <span className={styles.rpcDot} style={{ background: colorForService(row.noInstrumentedServer.serviceName, theme) }} />
          <span className={styles.rpcText}>{row.noInstrumentedServer.serviceName}</span>
        </span>
      )}
      {span.childSpanCount > 0 && <span className={styles.count}>{span.childSpanCount}</span>}
      {statusColor && row.httpStatus != null && (
        <span className={styles.pill} style={{ color: statusColor.fg, background: statusColor.bg }}>
          {row.httpStatus}
        </span>
      )}
    </div>
  );
}
