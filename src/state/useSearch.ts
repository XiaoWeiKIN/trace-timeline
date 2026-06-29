// 本地搜索状态（本项目自研，Story 4.1）。
// 维护查询串 / 命中集 / 只看匹配 / 只看错误 / 命中间环形导航；命中按 trace 顺序排列。
import { useCallback, useMemo, useState } from 'react';

import { isErrorSpan } from '../core';
import type { Trace } from '../model';

import { filterSpans } from './filterSpans';

export interface SearchState {
  query: string;
  setQuery: (q: string) => void;
  /** 命中 spanID 集（无查询时 undefined）。 */
  matches: Set<string> | undefined;
  /** 命中数（无查询时 0）。 */
  matchCount: number;
  showMatchesOnly: boolean;
  setShowMatchesOnly: (v: boolean) => void;
  /** 只看错误（Story 4.2；与查询取交集，并隐含只看匹配过滤）。 */
  errorsOnly: boolean;
  setErrorsOnly: (v: boolean) => void;
  /** 错误 span 数（Errors N 计数）。 */
  errorCount: number;
  /** 当前定位的命中 spanID（用于滚动 + 高亮强调）。 */
  focusedMatchId: string | undefined;
  /** 当前命中序号（1-based，无命中为 0）。 */
  focusedMatchIndex: number;
  nextMatch: () => void;
  prevMatch: () => void;
}

export function useSearch(trace: Trace | null | undefined): SearchState {
  const [query, setQueryRaw] = useState('');
  const [showMatchesOnly, setShowMatchesOnly] = useState(false);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [cursor, setCursor] = useState(0);

  const spans = trace?.spans;

  const errorIds = useMemo(() => {
    const s = new Set<string>();
    spans?.forEach((sp) => {
      if (isErrorSpan(sp)) {
        s.add(sp.spanID);
      }
    });
    return s;
  }, [spans]);
  const errorCount = errorIds.size;

  const matches = useMemo(() => {
    const byQuery = filterSpans(query, spans);
    if (!errorsOnly) {
      return byQuery;
    }
    // 只看错误：与查询命中取交集；无查询则就是错误集。
    if (!byQuery) {
      return new Set(errorIds);
    }
    return new Set([...byQuery].filter((id) => errorIds.has(id)));
  }, [query, spans, errorsOnly, errorIds]);

  // 命中按 trace 顺序排列，供 prev/next 导航。
  const orderedMatches = useMemo(() => {
    if (!matches || !spans) {
      return [];
    }
    return spans.filter((s) => matches.has(s.spanID)).map((s) => s.spanID);
  }, [matches, spans]);

  const setQuery = useCallback((q: string) => {
    setQueryRaw(q);
    setCursor(0);
  }, []);
  const setErrorsOnlyReset = useCallback((v: boolean) => {
    setErrorsOnly(v);
    setCursor(0);
  }, []);

  const matchCount = orderedMatches.length;
  const focusedMatchId = matchCount > 0 ? orderedMatches[cursor % matchCount] : undefined;
  const focusedMatchIndex = matchCount > 0 ? (cursor % matchCount) + 1 : 0;

  const nextMatch = useCallback(() => {
    setCursor((c) => c + 1);
  }, []);
  const prevMatch = useCallback(() => {
    setCursor((c) => (c - 1 + Math.max(1, orderedMatches.length)) % Math.max(1, orderedMatches.length));
  }, [orderedMatches.length]);

  return {
    query,
    setQuery,
    matches,
    matchCount,
    showMatchesOnly,
    setShowMatchesOnly,
    errorsOnly,
    setErrorsOnly: setErrorsOnlyReset,
    errorCount,
    focusedMatchId,
    focusedMatchIndex,
    nextMatch,
    prevMatch,
  };
}
