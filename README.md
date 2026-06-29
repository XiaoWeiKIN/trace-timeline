# @datafox/trace-timeline

Datadog 风格的 Trace Timeline React 组件库。

- **视觉**：对标 Datadog APM Waterfall（仅顶圆角条、服务色缩进竖线、行内 HTTP 状态 pill、Color-by、DRUIDS 令牌）+ Trace 火焰图视图 + 服务图例
- **引擎**：移植自 Grafana TraceTimeline（虚拟滚动 / span 树 / 时间映射 / 交互），其底层源自 Jaeger UI
- **数据**：**可插拔后端数据源**（AD-15）——核心包后端中立，只认规范 `Trace`；数据源经子路径按需引入：
  - `@datafox/trace-timeline/datasources/otlp` —— OpenTelemetry OTLP/JSON（公开参考实现）
  - `@datafox/trace-timeline/datasources/datafox` —— DataFox 后端
  - 写自己的后端：见 [`docs/writing-a-trace-data-source.md`](docs/writing-a-trace-data-source.md)
- **打包**：ESM-only + d.ts；`react`/`react-dom` 作 peer；零 `@grafana/*` 依赖

## 用法

```tsx
import { TraceTimeline, loadTrace } from '@datafox/trace-timeline';
import { otlpDataSource } from '@datafox/trace-timeline/datasources/otlp';

const trace = loadTrace(otlpDataSource, otlpResponse); // 后端 wire 格式 → 派生 Trace
<TraceTimeline trace={trace} />
```

## 脚本

| 命令 | 作用 |
|------|------|
| `npm run build` | tsup 构建 ESM + d.ts → `dist/`（主入口 + 各适配器子路径） |
| `npm run typecheck` | `tsc --noEmit` 严格类型检查 |
| `npm test` | vitest 单测（jsdom） |
| `npm run dev` | vite 启动 demo（含多数据源切换） |

## 目录（七层架构）

```
src/
  api/          对外 <TraceTimeline> + 导出（注入皮肤）
  presentation/ Datadog 皮肤（行/条/标签/缩进/详情/工具条/火焰图/图例）
  core/         引擎（虚拟滚动、rowRenderer 契约，零 Datadog import）
  state/        useTraceTimelineState（受控/非受控）
  model/        Trace 类型 + transform + dataSource 契约 + adapters/{fromDataFox,fromOtlp} 解码器
  theme/        createTheme(DRUIDS) + useStyles2 + colorGenerator
  ui/           Icon(lucide)/Tooltip/Menu 原语
  data/datafox/ 可选 fetchTrace 助手
  datasources/  子路径导出入口（datafox / otlp）
```

## 许可证

本库移植了 Grafana TraceView（底层源自 Jaeger UI）的引擎代码。移植文件保留上游
**Apache-2.0** 版权头（Uber / Jaeger Authors）。详见：

- [`LICENSE`](LICENSE) —— Apache License 2.0 全文
- [`NOTICE`](NOTICE) —— 归属声明（上游版权方与许可证）

> 数据源开发指南见 [`docs/writing-a-trace-data-source.md`](docs/writing-a-trace-data-source.md)。
