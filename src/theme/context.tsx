import { createContext, type ReactNode } from 'react';

import { createTheme } from './createTheme';
import type { Theme } from './types';

/** 默认 light 主题，便于无 Provider 时也可工作。 */
export const ThemeContext = createContext<Theme>(createTheme({ colorMode: 'light' }));

export interface ThemeProviderProps {
  theme: Theme;
  children: ReactNode;
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
