import { css } from '@emotion/css';
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { TraceTimeline, VERSION, adaptTrace } from '../src';
import { mockTrace } from '../src/model';
// 子路径导出（AD-15）：OTLP 适配器按需引入，证明多后端经同一 adaptTrace 渲染。
import { otlpAdapter, otlpFixture } from '../src/adapters/otlp';
import { DdFlameGraphView } from '../src/presentation';
import {
  createTheme,
  getColorByKey,
  ThemeProvider,
  useStyles2,
  useTheme2,
  type Theme,
  type ThemeColorMode,
} from '../src/theme';

const getStyles = (theme: Theme) => ({
  panel: css({
    fontFamily: theme.trace.fontFamily,
    background: theme.colors.background.primary,
    color: theme.colors.text.primary,
    padding: theme.spacing(3),
    minHeight: '100vh',
    boxSizing: 'border-box',
  }),
  bar: css({
    height: theme.trace.barHeight,
    borderRadius: theme.trace.barRadius,
    marginRight: theme.spacing(0.5),
    display: 'inline-block',
    width: 48,
  }),
  toggle: css({
    fontFamily: theme.trace.fontFamily,
    background: theme.colors.primary.main,
    color: '#fff',
    border: 'none',
    borderRadius: theme.shape.radius.md,
    padding: theme.spacing(1, 2),
    cursor: 'pointer',
  }),
  pill: css({
    display: 'inline-block',
    borderRadius: theme.shape.radius.md,
    padding: theme.spacing(0.25, 1),
    fontSize: theme.typography.bodySmall.fontSize,
    marginRight: theme.spacing(1),
  }),
});

function Demo({ mode, onToggle }: { mode: ThemeColorMode; onToggle: () => void }) {
  const styles = useStyles2(getStyles);
  const theme = useTheme2();
  // 滚动定位演示（FR-7）：受控 focusedSpanId + 受限高度，使尾部 span 出视口可观察滚动。
  const [focusedSpanId, setFocusedSpanId] = useState<string | undefined>(undefined);
  // 数据源切换（AD-15）：mock（DataFox 风格派生 Trace）⇄ OTLP（经 adaptTrace 解码）。
  const [source, setSource] = useState<'mock' | 'otlp'>('mock');
  const otlpTrace = useMemo(() => adaptTrace(otlpAdapter, otlpFixture), []);
  const activeTrace = source === 'otlp' ? otlpTrace : mockTrace;
  const firstSpan = mockTrace.spans[0];
  const lastSpan = mockTrace.spans[mockTrace.spans.length - 1];
  return (
    <div className={styles.panel}>
      <h3>trace-timeline theme demo — v{VERSION}</h3>
      <button className={styles.toggle} onClick={onToggle}>
        切换主题（当前：{mode}）
      </button>

      <h4>Datadog 分类色板（仅顶圆角条 {theme.trace.barRadius}）</h4>
      <div>
        {theme.trace.categoricalPalette.map((c) => (
          <span key={c} className={styles.bar} style={{ background: c }} title={c} />
        ))}
      </div>

      <h4>mockTrace 服务色（colorGenerator）</h4>
      <div>
        {mockTrace.services.map((svc) => (
          <span key={svc.name} className={styles.pill} style={{ background: getColorByKey(svc.name, theme), color: '#fff' }}>
            {svc.name} ({svc.numberOfSpans})
          </span>
        ))}
      </div>

      <h4>HTTP 状态 pill</h4>
      <div>
        {(['ok', 'info', 'warn', 'error'] as const).map((k) => (
          <span
            key={k}
            className={styles.pill}
            style={{ color: theme.trace.status[k].fg, background: theme.trace.status[k].bg }}
          >
            {k.toUpperCase()}
          </span>
        ))}
      </div>

      <h4>&lt;TraceTimeline trace={'{trace}'} /&gt;（对外组件）</h4>
      <p style={{ opacity: 0.6, fontSize: 12, margin: '0 0 8px' }}>
        一行注入：api 把 Datadog 皮肤注入 core 引擎，渲染完整静态瀑布（仅顶圆角条 / 服务色缩进竖线 / HTTP 状态 pill / 错误 ⚠ / 刻度表头）。
      </p>
      <button className={styles.toggle} onClick={() => setSource((s) => (s === 'mock' ? 'otlp' : 'mock'))}>
        数据源（AD-15 可插拔适配器）：{source === 'mock' ? 'mock（内置）' : 'OTLP（adaptTrace）'} — 点击切换
      </button>
      <TraceTimeline
        trace={activeTrace}
        height={320}
        detailStubs={{
          onShareSpan: (s) => console.log('[demo] share span', s.spanID),
          onSpanLinks: (s) => console.log('[demo] span links', s.spanID),
          // renderFlameGraph 不传 → 显示占位（FR-19，可由宿主接管）
        }}
      />

      <h4 style={{ marginTop: 24 }}>滚动定位（focusedSpanId，FR-7）</h4>
      <p style={{ opacity: 0.6, fontSize: 12, margin: '0 0 8px' }}>
        受限高度（120px）使尾部 span 出视口；点按钮设置 focusedSpanId → 视图滚动到该 span 并高亮，表头不遮挡。
      </p>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
        <button className={styles.toggle} onClick={() => setFocusedSpanId(firstSpan.spanID)}>
          定位顶部：{firstSpan.operationName}
        </button>
        <button className={styles.toggle} onClick={() => setFocusedSpanId(lastSpan.spanID)}>
          定位底部：{lastSpan.operationName}
        </button>
        <button className={styles.toggle} onClick={() => setFocusedSpanId(undefined)}>
          清除
        </button>
      </div>
      <TraceTimeline
        trace={mockTrace}
        height={120}
        focusedSpanId={focusedSpanId}
        onFocusedSpanIdChange={setFocusedSpanId}
      />

      <h4 style={{ marginTop: 24 }}>火焰图视图（Epic 6 / Story 6.1 静态）</h4>
      <div style={{ border: `1px solid ${theme.colors.border.weak}`, padding: 8, background: theme.colors.background.primary }}>
        <DdFlameGraphView trace={mockTrace} />
      </div>

      <h4 style={{ marginTop: 24 }}>空态（trace={'{null}'}）</h4>
      <TraceTimeline trace={null} height={80} />
    </div>
  );
}

function App() {
  const [mode, setMode] = useState<ThemeColorMode>('light');
  const theme = useMemo(() => createTheme({ colorMode: mode }), [mode]);
  return (
    <ThemeProvider theme={theme}>
      <Demo mode={mode} onToggle={() => setMode((m) => (m === 'light' ? 'dark' : 'light'))} />
    </ThemeProvider>
  );
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('demo root element not found');
}
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
