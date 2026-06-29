// Copyright (c) 2017 Uber Technologies, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// 移植自 grafana public/app/features/explore/TraceView/components/Theme.tsx。
// 入参类型由 GrafanaTheme2 换成本库 Theme（仅用到 theme.isLight）。
import tinycolor from 'tinycolor2';

import type { Theme } from './types';

/**
 * 取暗色变体：light 主题原样返回；dark 主题反相亮度（或在提供 base 时取最可读变体）。
 */
export function autoColor(theme: Pick<Theme, 'isLight'>, hex: string, base?: string): string {
  if (theme.isLight) {
    return hex;
  }
  if (base) {
    const color = tinycolor(hex);
    return tinycolor
      .mostReadable(
        base,
        [
          color.clone().lighten(25),
          color.clone().lighten(10),
          color,
          color.clone().darken(10),
          color.clone().darken(25),
        ],
        { includeFallbackColors: false }
      )
      .toHex8String();
  }
  const color = tinycolor(hex).toHsl();
  color.l = 1 - color.l;
  const newColor = tinycolor(color);
  return newColor.isLight() ? newColor.darken(5).toHex8String() : newColor.lighten(5).toHex8String();
}
