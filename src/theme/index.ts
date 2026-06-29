// theme 层公共导出（Story 1.2）。
export { createTheme, type CreateThemeOptions } from './createTheme';
export { ThemeContext, ThemeProvider, type ThemeProviderProps } from './context';
export { useTheme2, useStyles2, stylesFactory, withTheme2, type GetStyles } from './useStyles2';
export { autoColor } from './autoColor';
export { getColorByKey, getRgbColorByKey } from './colorGenerator';
export { DATADOG_CATEGORICAL_PALETTE } from './tokens/trace';
export type {
  Theme,
  ThemeColorMode,
  ThemeOverride,
  TraceThemeTokens,
  StatusColor,
  HeadingToken,
  BreakpointKey,
} from './types';
