// 公共入口（占位）。后续故事按七层逐步填充导出。
// 依赖方向（AD-1/AD-2）：api → {core, presentation, state, model}；presentation → {theme, ui, model}；core → model。

export const VERSION = '0.0.0';

// 对外公共表面（占位再导出；各层逐步填充）
export * from './api';
export * from './core';
export * from './presentation';
export * from './state';
export * from './theme';
export * from './model';
export * from './utils';
export * from './ui';
// 后端中立：具体数据源（DataFox/OTLP）不在主入口，走子路径导出（AD-15）：
//   `@datafox/trace-timeline/datasources/datafox` | `.../datasources/otlp`
// 主入口仅暴露后端中立契约 `TraceDataSource` / `loadTrace`（经 ./model 再导出）。
