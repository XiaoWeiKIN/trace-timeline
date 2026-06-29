import { describe, expect, it } from 'vitest';

import { fromFlameLegendUrlParams, toFlameLegendUrlParams } from './flameLegendUrl';

describe('flameLegendUrl (Story 7.4)', () => {
  it('to：维度 → Datadog colorByAttr 名', () => {
    expect(toFlameLegendUrlParams({ colorBy: 'service' }).colorByAttr).toBe('service');
    expect(toFlameLegendUrlParams({ colorBy: 'host' }).colorByAttr).toBe('hostname');
    expect(toFlameLegendUrlParams({ colorBy: 'entity' }).colorByAttr).toBe('inferred.catalog');
  });

  it('to：highlight + shouldShowLegend', () => {
    const p = toFlameLegendUrlParams({ highlightedGroupKey: 'flux-service', showLegend: false });
    expect(p.highlight).toBe('flux-service');
    expect(p.shouldShowLegend).toBe('false');
  });

  it('to：未给定字段不写入；null 高亮不写', () => {
    expect(toFlameLegendUrlParams({})).toEqual({});
    expect(toFlameLegendUrlParams({ highlightedGroupKey: null })).toEqual({});
  });

  it('from：Record 解析（含未知 colorByAttr 忽略）', () => {
    expect(
      fromFlameLegendUrlParams({ highlight: 'redis', shouldShowLegend: 'false', colorByAttr: 'hostname' })
    ).toEqual({ highlightedGroupKey: 'redis', showLegend: false, colorBy: 'host' });
    expect(fromFlameLegendUrlParams({ colorByAttr: 'bogus' })).toEqual({});
    expect(fromFlameLegendUrlParams({ shouldShowLegend: 'maybe' })).toEqual({});
  });

  it('from：URLSearchParams 同样可解析', () => {
    const sp = new URLSearchParams('highlight=mysql&colorByAttr=inferred.catalog&shouldShowLegend=true');
    expect(fromFlameLegendUrlParams(sp)).toEqual({
      highlightedGroupKey: 'mysql',
      showLegend: true,
      colorBy: 'entity',
    });
  });

  it('round-trip：to ∘ from 还原', () => {
    const state = { highlightedGroupKey: 'flux-service', showLegend: true, colorBy: 'entity' as const };
    expect(fromFlameLegendUrlParams(toFlameLegendUrlParams(state))).toEqual(state);
  });

  it('CR-F7：空串高亮 key 不写入，往返对称', () => {
    expect(toFlameLegendUrlParams({ highlightedGroupKey: '' })).toEqual({});
    // 空串组配合其他字段：highlight 丢弃但其余保留，from 不应凭空造出空串高亮
    expect(
      fromFlameLegendUrlParams(toFlameLegendUrlParams({ highlightedGroupKey: '', showLegend: true }))
    ).toEqual({ showLegend: true });
  });
});
