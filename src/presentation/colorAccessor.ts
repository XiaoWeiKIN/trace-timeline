// presentation 着色（AD-6）——颜色只在此层计算，core 零颜色。
import { dimensionKeyFor, type LegendDimension } from '../core';
import type { TraceSpan } from '../model';
import { getServiceColorKey } from '../model';
import type { StatusColor, Theme } from '../theme';
import { getColorByKey } from '../theme';

/** span → 颜色 key → 分类色。 */
export type ColorAccessor = (span: TraceSpan) => string;

/** colorBy='service'：散列服务名到 Datadog 分类色板（getColorByKey 内含相邻 readability 去重）。 */
export function defaultColorAccessor(theme: Theme): ColorAccessor {
  return (span) => getColorByKey(getServiceColorKey(span.process), theme);
}

/** colorBy=维度（service/host/entity，Story 7.3）：散列维度 key 到分类色板，与图例分组同口径。 */
export function colorAccessorForDimension(dimension: LegendDimension, theme: Theme): ColorAccessor {
  return (span) => getColorByKey(dimensionKeyFor(span, dimension), theme);
}

/** 按服务名取分类色（RPC 合并 / 未插桩外部服务用，Story 4.4）。 */
export function colorForService(serviceName: string, theme: Theme): string {
  return getColorByKey(serviceName, theme);
}

/** HTTP 状态码 → 状态 pill 配色（2xx 绿 / 3xx 蓝 / 4xx 橙 / 5xx 红），取 theme.trace.status。 */
export function httpStatusToken(code: number, theme: Theme): StatusColor {
  const s = theme.trace.status;
  if (code >= 500) {
    return s.error;
  }
  if (code >= 400) {
    return s.warn;
  }
  if (code >= 300) {
    return s.info;
  }
  if (code >= 200) {
    return s.ok;
  }
  return s.info;
}
