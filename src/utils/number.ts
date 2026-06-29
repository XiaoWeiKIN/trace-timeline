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
// 移植自 grafana TraceView/components/utils/number.tsx（原样）。

/**
 * 给定数字与目标小数精度，返回该精度下的数字。
 * toFloatPrecision(3.55, 1) // 3.5
 * toFloatPrecision(0.04422, 2) // 0.04
 */
export function toFloatPrecision(num: number, precision: number): number {
  const log10Length = Math.floor(Math.log10(Math.abs(num))) + 1;
  const targetPrecision = precision + log10Length;
  if (targetPrecision <= 0) {
    return Math.trunc(num);
  }
  return Number(num.toPrecision(targetPrecision));
}
