import { type ComponentType, useContext, useRef } from 'react';

import { ThemeContext } from './context';
import type { Theme } from './types';

/** 从 context 取当前主题。 */
export function useTheme2(): Theme {
  return useContext(ThemeContext);
}

export type GetStyles<T> = (theme: Theme) => T;

/**
 * 按 theme + getStyles 引用 memo 计算样式。
 * 同一 theme 与同一 getStyles 多次调用返回同一对象引用（AC#4）。
 * 兼容上游既有写法：getStyles 可接收 theme，也可无参。
 */
export function useStyles2<T>(getStyles: GetStyles<T>): T {
  const theme = useTheme2();
  const ref = useRef<{ theme: Theme; fn: GetStyles<T>; styles: T } | null>(null);
  if (!ref.current || ref.current.theme !== theme || ref.current.fn !== getStyles) {
    ref.current = { theme, fn: getStyles, styles: getStyles(theme) };
  }
  return ref.current.styles;
}

/** 上游用 stylesFactory 包 getStyles；本库直接返回（占位兼容）。 */
export function stylesFactory<T extends (...args: never[]) => unknown>(fn: T): T {
  return fn;
}

/** 给 class 组件注入 `theme` prop（引擎 class 组件用，AD-3）。 */
export function withTheme2<P extends { theme: Theme }>(Component: ComponentType<P>) {
  function WithTheme(props: Omit<P, 'theme'>) {
    const theme = useTheme2();
    return <Component {...(props as P)} theme={theme} />;
  }
  WithTheme.displayName = `WithTheme(${Component.displayName ?? Component.name ?? 'Component'})`;
  return WithTheme;
}
