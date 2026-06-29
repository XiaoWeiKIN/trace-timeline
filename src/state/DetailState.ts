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
// 原样移植自 grafana SpanDetail/DetailState.tsx；@grafana TraceLog / TraceSpanReference → ../model。

import type { TraceLog, TraceSpanReference } from '../model';

/**
 * 记录一个 {@link SpanDetail} 各子项的展开状态（不可变，每次 toggle 返回新实例）。
 */
export default class DetailState {
  isTagsOpen: boolean;
  isProcessOpen: boolean;
  logs: { isOpen: boolean; openedItems: Set<TraceLog> };
  references: { isOpen: boolean; openedItems: Set<TraceSpanReference> };
  isWarningsOpen: boolean;
  isStackTracesOpen: boolean;
  isReferencesOpen: boolean;
  /** Story 3.4：语义分组的「已折叠」名集（默认空=全部展开，与 Datadog 一致）。 */
  closedSections: Set<string>;

  constructor(oldState?: DetailState) {
    const {
      isTagsOpen,
      isProcessOpen,
      isReferencesOpen,
      isWarningsOpen,
      isStackTracesOpen,
      logs,
      references,
      closedSections,
    }: DetailState | Record<string, undefined> = oldState || {};
    this.isTagsOpen = Boolean(isTagsOpen);
    this.isProcessOpen = Boolean(isProcessOpen);
    this.isReferencesOpen = Boolean(isReferencesOpen);
    this.isWarningsOpen = Boolean(isWarningsOpen);
    this.isStackTracesOpen = Boolean(isStackTracesOpen);
    this.logs = {
      isOpen: Boolean(logs && logs.isOpen),
      openedItems: logs && logs.openedItems ? new Set(logs.openedItems) : new Set(),
    };
    this.references = {
      isOpen: Boolean(references && references.isOpen),
      openedItems: references && references.openedItems ? new Set(references.openedItems) : new Set(),
    };
    this.closedSections = closedSections ? new Set(closedSections) : new Set();
  }

  /** 切换语义分组折叠（不可变；默认展开，故 closed 集记录被折叠的组）。 */
  toggleSection(name: string) {
    const next = new DetailState(this);
    if (next.closedSections.has(name)) {
      next.closedSections.delete(name);
    } else {
      next.closedSections.add(name);
    }
    return next;
  }

  /** 该语义分组是否展开（默认 true）。 */
  isSectionOpen(name: string) {
    return !this.closedSections.has(name);
  }

  toggleTags() {
    const next = new DetailState(this);
    next.isTagsOpen = !this.isTagsOpen;
    return next;
  }

  toggleProcess() {
    const next = new DetailState(this);
    next.isProcessOpen = !this.isProcessOpen;
    return next;
  }

  toggleReferences() {
    const next = new DetailState(this);
    next.references.isOpen = !this.references.isOpen;
    return next;
  }

  toggleReferenceItem(reference: TraceSpanReference) {
    const next = new DetailState(this);
    if (next.references.openedItems.has(reference)) {
      next.references.openedItems.delete(reference);
    } else {
      next.references.openedItems.add(reference);
    }
    return next;
  }

  toggleWarnings() {
    const next = new DetailState(this);
    next.isWarningsOpen = !this.isWarningsOpen;
    return next;
  }

  toggleStackTraces() {
    const next = new DetailState(this);
    next.isStackTracesOpen = !this.isStackTracesOpen;
    return next;
  }

  toggleLogs() {
    const next = new DetailState(this);
    next.logs.isOpen = !this.logs.isOpen;
    return next;
  }

  toggleLogItem(logItem: TraceLog) {
    const next = new DetailState(this);
    if (next.logs.openedItems.has(logItem)) {
      next.logs.openedItems.delete(logItem);
    } else {
      next.logs.openedItems.add(logItem);
    }
    return next;
  }
}
