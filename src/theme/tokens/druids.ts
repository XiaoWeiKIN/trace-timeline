// DRUIDS 令牌色值（实测自 Datadog DRUIDS foundation/color — datadog-visual-spec §3.2/§3.3）。
// light 为实测主集；dark 先给一套合理暗色，标注待校准。
import type { ThemeColorMode } from '../types';

export interface DruidsTokens {
  text: { primary: string; secondary: string; link: string; disabled: string };
  background: { primary: string; secondary: string; canvas: string };
  border: { weak: string; strong: string };
  primaryMain: string;
  successText: string;
  errorText: string;
  errorTransparent: string;
  errorBorderTransparent: string;
  selectedRowBg: string;
}

// ——— light（实测）———
const LIGHT: DruidsTokens = {
  text: {
    primary: 'rgba(28,43,52,0.98)',
    secondary: 'rgba(28,43,52,0.68)',
    link: 'rgb(53,152,236)', // 主蓝 #3598EC
    disabled: 'rgba(28,43,52,0.35)',
  },
  background: {
    primary: 'rgb(249,250,251)',
    secondary: 'rgb(239,241,245)',
    canvas: 'rgb(255,255,255)',
  },
  border: {
    weak: 'rgb(226,229,237)',
    strong: 'rgb(194,200,221)',
  },
  primaryMain: '#3598EC',
  successText: '#008645', // 底 #ECF9EF
  errorText: '#EB364B', // 底 #FDEBED
  errorTransparent: 'rgba(235,54,75,0.10)',
  errorBorderTransparent: 'rgba(235,54,75,0.25)',
  selectedRowBg: 'rgb(234,246,252)',
};

// ——— dark（[ASSUMPTION] 后续按 DRUIDS dark 校准）———
const DARK: DruidsTokens = {
  text: {
    primary: 'rgba(255,255,255,0.92)',
    secondary: 'rgba(255,255,255,0.66)',
    link: 'rgb(99,160,245)',
    disabled: 'rgba(255,255,255,0.35)',
  },
  background: {
    primary: 'rgb(24,27,31)',
    secondary: 'rgb(33,37,43)',
    canvas: 'rgb(18,20,23)',
  },
  border: {
    weak: 'rgb(54,59,66)',
    strong: 'rgb(78,85,94)',
  },
  primaryMain: '#5BA4F0',
  successText: '#4FC47C',
  errorText: '#F2576B',
  errorTransparent: 'rgba(242,87,107,0.14)',
  errorBorderTransparent: 'rgba(242,87,107,0.30)',
  selectedRowBg: 'rgb(31,46,61)',
};

export function druidsTokens(mode: ThemeColorMode): DruidsTokens {
  return mode === 'light' ? LIGHT : DARK;
}
