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
// 移植自 grafana TraceView/components/utils/color-generator.tsx。
// 变更：色数组由 @grafana/ui colors → theme.trace.categoricalPalette；contrast 用 theme 背景。
import memoizeOne from 'memoize-one';
import tinycolor from 'tinycolor2';

import type { Theme } from './types';

function strToRgb(s: string): [number, number, number] {
  if (s.length !== 7) {
    return [0, 0, 0];
  }
  const r = s.slice(1, 3);
  const g = s.slice(3, 5);
  const b = s.slice(5);
  return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
}

class ColorGenerator {
  colorsHex: string[];
  colorsRgb: Array<[number, number, number]>;
  cache: Map<string, number>;
  prevColorIndex: number | undefined;

  constructor(colorsHex: string[], background: string) {
    const filtered = getFilteredColors(colorsHex, background);
    this.colorsHex = filtered;
    this.colorsRgb = filtered.map(strToRgb);
    this.cache = new Map();
    this.prevColorIndex = undefined;
  }

  _getColorIndex(key: string): number {
    let i = this.cache.get(key);
    if (i == null) {
      const hash = this.hashCode(key ? key.toLowerCase() : '');
      i = Math.abs(hash % this.colorsHex.length);

      if (this.prevColorIndex !== undefined) {
        if (this.prevColorIndex === i) {
          i = this.getNextIndex(i);
        }
        const prevColor = this.colorsHex[this.prevColorIndex];
        if (tinycolor.readability(prevColor, this.colorsHex[i]) < 1.5) {
          let newIndex = i;
          for (let j = 0; j < this.colorsHex.length; j++) {
            newIndex = this.getNextIndex(newIndex);
            if (tinycolor.readability(prevColor, this.colorsHex[newIndex]) > 1.5) {
              i = newIndex;
              break;
            }
          }
        }
      }
      this.cache.set(key, i);
      this.prevColorIndex = i;
    }
    return i;
  }

  getNextIndex(i: number) {
    return i + 1 < this.colorsHex.length ? i + 1 : 0;
  }

  hashCode(key: string) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const chr = key.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
    }
    return hash;
  }

  /** 给任意 key 分配颜色；同 key 同色。 */
  getColorByKey(key: string) {
    const i = this._getColorIndex(key);
    return this.colorsHex[i];
  }

  getRgbColorByKey(key: string): [number, number, number] {
    const i = this._getColorIndex(key);
    return this.colorsRgb[i];
  }

  clear() {
    this.cache.clear();
  }
}

const getGenerator = memoizeOne((colors: string[], background: string) => new ColorGenerator(colors, background));

export function getColorByKey(key: string, theme: Theme): string {
  return getGenerator(theme.trace.categoricalPalette, theme.colors.background.primary).getColorByKey(key);
}

export function getRgbColorByKey(key: string, theme: Theme): [number, number, number] {
  return getGenerator(theme.trace.categoricalPalette, theme.colors.background.primary).getRgbColorByKey(key);
}

export function getFilteredColors(colorsHex: string[], background: string) {
  const filtered = [...colorsHex];
  // 去掉看起来像错误的红色
  const redIndex = filtered.indexOf('#E24D42');
  if (redIndex > -1) {
    filtered.splice(redIndex, 1);
  }
  const redIndex2 = filtered.indexOf('#BF1B00');
  if (redIndex2 > -1) {
    filtered.splice(redIndex2, 1);
  }
  // 仅保留与背景对比度 >= 3 的颜色
  const out: string[] = [];
  for (const color of filtered) {
    if (tinycolor.readability(background, color) >= 3) {
      out.push(color);
    }
  }
  // 兜底：若全被过滤（如极端背景），回退原色板，避免空数组
  return out.length ? out : filtered.length ? filtered : colorsHex;
}
