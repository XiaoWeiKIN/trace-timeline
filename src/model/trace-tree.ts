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
// 移植自 grafana TraceView/components/selectors/trace.ts —— 仅取 getTraceSpanIdsAsTree + TREE_ROOT_ID。
// 去掉 reselect 与 getSpanId（getTraceSpansAsMap 不移植）。
import TreeNode from './tree-node';
import type { TraceResponse, TraceSpanData } from './types';

export const TREE_ROOT_ID = '__root__';

/**
 * 由 `span.references` 构建 { value: spanID, children } 树。
 * root 节点 `.value === TREE_ROOT_ID`（root span 不一定随 trace 返回，可有多个顶层 span，
 * 用虚拟 root 作为它们的共同父）。children 按 `span.startTime` 排序。
 */
export function getTraceSpanIdsAsTree(
  trace: TraceResponse,
  spanMap: Map<string, TraceSpanData> | null = null
) {
  const nodesById = new Map(trace.spans.map((span: TraceSpanData) => [span.spanID, new TreeNode(span.spanID)]));
  const spansById = spanMap ?? new Map(trace.spans.map((span: TraceSpanData) => [span.spanID, span]));
  const root = new TreeNode(TREE_ROOT_ID);
  trace.spans.forEach((span: TraceSpanData) => {
    const node = nodesById.get(span.spanID)!;
    if (Array.isArray(span.references) && span.references.length) {
      const { refType, spanID: parentID } = span.references[0];
      if (refType === 'CHILD_OF' || refType === 'FOLLOWS_FROM') {
        const parent = nodesById.get(parentID) || root;
        parent.children?.push(node);
      } else {
        throw new Error(`Unrecognized ref type: ${refType}`);
      }
    } else {
      root.children.push(node);
    }
  });
  const comparator = (nodeA: TreeNode<string>, nodeB: TreeNode<string>) => {
    const a: TraceSpanData | undefined = nodeA?.value ? spansById.get(nodeA.value.toString()) : undefined;
    const b: TraceSpanData | undefined = nodeB?.value ? spansById.get(nodeB.value.toString()) : undefined;
    return +((a?.startTime ?? 0) > (b?.startTime ?? 0)) || +(a?.startTime === b?.startTime) - 1;
  };
  trace.spans.forEach((span: TraceSpanData) => {
    const node = nodesById.get(span.spanID);
    if (node!.children.length > 1) {
      node?.children.sort(comparator);
    }
  });
  root.children.sort(comparator);
  return root;
}
