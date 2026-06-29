// SpanDetail 详情卡（Story 3.4 重绘——对齐 Datadog 结构）：
// 顶部 span header + Tab 栏 + Pinned 区 + 语义属性分组（友好标签）+ Logs/References 分组。
// 引擎/状态零改动：detailState 驱动各组折叠（closedSections + 既有 logs/references 标志）。
import { css } from '@emotion/css';

import type { TraceSpan } from '../model';
import type { DetailState, DetailToggles } from '../state';
import { useStyles2, type Theme } from '../theme';
import { formatDuration } from '../utils';

import { buildAttributeGroups } from './attributeGroups';
import { DdAccordian } from './DdAccordian';
import { DdFlameGraph, DdShareButton, DdSpanLinks, type DetailStubs } from './detailStubs';
import { DdHttpRequestBar } from './DdHttpRequestBar';
import { DdKeyValuesTable } from './DdKeyValuesTable';
import { DdSpanDetailHeader } from './DdSpanDetailHeader';
import { DdSpanDetailTabs } from './DdSpanDetailTabs';

const getStyles = (theme: Theme) => ({
  card: css({
    label: 'DdSpanDetail',
    fontFamily: theme.trace.fontFamily,
    fontSize: 13,
    color: theme.colors.text.primary,
    // 自然高度——由内容决定（ListView _scanItemHeights 测量真实高，AD-12）；勿设 height:100%。
    boxSizing: 'border-box',
    background: theme.colors.background.primary,
  }),
  pinned: css({ label: 'DdSpanDetailPinned' }),
  pinnedEmpty: css({ label: 'DdSpanDetailPinnedEmpty', color: theme.trace.detail.label, fontSize: 12, padding: '2px 8px 6px 30px' }),
  textList: css({ label: 'DdSpanDetailTextList', margin: 0, paddingLeft: 16, lineHeight: '18.2px' }),
  pre: css({ label: 'DdSpanDetailPre', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, lineHeight: '17px' }),
  logTime: css({ label: 'DdSpanDetailLogTime', color: theme.trace.detail.label, fontSize: 12 }),
});

interface Props {
  span: TraceSpan;
  detailState: DetailState;
  detailToggles: DetailToggles;
  /** 服务色（顶部 chip 图标）。 */
  color: string;
  /** 深耦合注入回调（火焰图/分享/链接；Story 5.4）。 */
  detailStubs?: DetailStubs;
  onClose: () => void;
}

export function DdSpanDetail({ span, detailState, detailToggles, color, detailStubs, onClose }: Props) {
  const styles = useStyles2(getStyles);
  const { spanID } = span;
  const groups = buildAttributeGroups(span);
  const logs = span.logs ?? [];
  const references = (span.references ?? []).filter((r) => r.refType);
  const warnings = span.warnings ?? [];
  const stackTraces = span.stackTraces ?? [];

  return (
    <div className={styles.card} data-testid="DdSpanDetail">
      <DdSpanDetailHeader
        serviceName={span.process?.serviceName ?? ''}
        operationName={span.operationName}
        duration={span.duration}
        color={color}
        actions={
          detailStubs && (
            <>
              <DdSpanLinks span={span} onSpanLinks={detailStubs.onSpanLinks} />
              <DdShareButton span={span} onShareSpan={detailStubs.onShareSpan} />
            </>
          )
        }
        onClose={onClose}
      />
      <DdSpanDetailTabs active="Overview" />

      {/* HTTP 请求摘要条（UX-DR11；仅含 http 字段时渲染） */}
      <DdHttpRequestBar span={span} />

      {/* Pinned Span Attributes（空态对齐 Datadog） */}
      <DdAccordian
        label="Pinned Span Attributes"
        isOpen={detailState.isSectionOpen('Pinned Span Attributes')}
        onToggle={() => detailToggles.section(spanID, 'Pinned Span Attributes')}
      >
        <div className={styles.pinnedEmpty}>No pinned tags found</div>
      </DdAccordian>

      {/* 语义属性分组（HTTP Requests / URL Details / … / Span Attributes catch-all） */}
      {groups.map((g) => (
        <DdAccordian
          key={g.title}
          label={g.title}
          count={g.rows.length}
          isOpen={detailState.isSectionOpen(g.title)}
          onToggle={() => detailToggles.section(spanID, g.title)}
        >
          <DdKeyValuesTable rows={g.rows} />
        </DdAccordian>
      ))}

      {/* Logs（分组级 + 每条二级展开） */}
      {logs.length > 0 && (
        <DdAccordian
          label="Logs"
          count={logs.length}
          isOpen={detailState.logs.isOpen}
          onToggle={() => detailToggles.logs(spanID)}
        >
          {logs.map((log, i) => (
            <DdAccordian
              key={`${log.timestamp}-${i}`}
              label={<span className={styles.logTime}>{formatDuration(Math.max(0, log.timestamp - span.startTime))}</span>}
              count={log.fields.length}
              isOpen={detailState.logs.openedItems.has(log)}
              onToggle={() => detailToggles.logItem(spanID, log)}
            >
              <DdKeyValuesTable rows={log.fields.map((f) => ({ label: f.key, value: f.value, kind: 'text' as const }))} />
            </DdAccordian>
          ))}
        </DdAccordian>
      )}

      {/* References */}
      {references.length > 0 && (
        <DdAccordian
          label="References"
          count={references.length}
          isOpen={detailState.references.isOpen}
          onToggle={() => detailToggles.references(spanID)}
        >
          <DdKeyValuesTable
            rows={references.map((r) => ({
              label: r.refType,
              value: r.span ? `${r.span.operationName} (${r.spanID})` : r.spanID,
              kind: 'text' as const,
            }))}
          />
        </DdAccordian>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <DdAccordian
          label="Warnings"
          count={warnings.length}
          isOpen={detailState.isWarningsOpen}
          onToggle={() => detailToggles.warnings(spanID)}
        >
          <ul className={styles.textList}>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </DdAccordian>
      )}

      {/* Stack traces */}
      {stackTraces.length > 0 && (
        <DdAccordian
          label="Stack traces"
          count={stackTraces.length}
          isOpen={detailState.isStackTracesOpen}
          onToggle={() => detailToggles.stackTraces(spanID)}
        >
          {stackTraces.map((st, i) => (
            <pre className={styles.pre} key={i}>
              {st}
            </pre>
          ))}
        </DdAccordian>
      )}

      {/* 火焰图占位区（Story 5.4；宿主经 renderFlameGraph 接管） */}
      {detailStubs && <DdFlameGraph span={span} renderFlameGraph={detailStubs.renderFlameGraph} />}
    </div>
  );
}
