// 火焰图图例 URL 状态契约（Story 7.4）——把图例可控状态 ↔ Datadog 风格 URL 查询参数互转，
// 让宿主应用做 deep-link（分享/还原高亮、显隐、Color by 维度）。纯函数，无副作用、不读 window。
// 参数名实测自 Datadog（investigations/datadog-flamegraph-legend-investigation §5）：
//   highlight=<分组 key> · shouldShowLegend=true|false · colorByAttr=service|hostname|inferred.catalog
import type { LegendDimension } from '../core';

export interface FlameLegendUrlState {
  /** 持久高亮分组 key（无则不设）。 */
  highlightedGroupKey?: string | null;
  /** 图例显隐。 */
  showLegend?: boolean;
  /** Color by 维度。 */
  colorBy?: LegendDimension;
}

const DIM_TO_ATTR: Record<LegendDimension, string> = {
  service: 'service',
  host: 'hostname',
  entity: 'inferred.catalog',
};
const ATTR_TO_DIM: Record<string, LegendDimension> = {
  service: 'service',
  hostname: 'host',
  'inferred.catalog': 'entity',
};

/** 状态 → URL 查询参数（仅含已给定字段）。 */
export function toFlameLegendUrlParams(state: FlameLegendUrlState): Record<string, string> {
  const out: Record<string, string> = {};
  // 空串 key（如空 serviceName 组）不写：from 会丢空串，写了往返不对称（CR-F7）。
  if (state.highlightedGroupKey != null && state.highlightedGroupKey !== '') {
    out.highlight = state.highlightedGroupKey;
  }
  if (state.showLegend != null) {
    out.shouldShowLegend = state.showLegend ? 'true' : 'false';
  }
  if (state.colorBy != null) {
    out.colorByAttr = DIM_TO_ATTR[state.colorBy];
  }
  return out;
}

/** URL 查询参数 → 状态（接受 Record 或 URLSearchParams；忽略未知/非法值）。 */
export function fromFlameLegendUrlParams(
  params: Record<string, string | null | undefined> | URLSearchParams
): FlameLegendUrlState {
  const get = (k: string): string | null | undefined =>
    params instanceof URLSearchParams ? params.get(k) : params[k];
  const state: FlameLegendUrlState = {};
  const highlight = get('highlight');
  if (highlight != null && highlight !== '') {
    state.highlightedGroupKey = highlight;
  }
  const show = get('shouldShowLegend');
  if (show === 'true' || show === 'false') {
    state.showLegend = show === 'true';
  }
  const attr = get('colorByAttr');
  if (attr != null && ATTR_TO_DIM[attr] != null) {
    state.colorBy = ATTR_TO_DIM[attr];
  }
  return state;
}
