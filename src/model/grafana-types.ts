// 本地替换 @grafana/data 的 trace 相关类型（去 @grafana 依赖）。
// 形状与 @grafana/data 一致，便于移植的代码无缝使用。

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface TraceKeyValuePair<T = any> {
  key: string;
  value: T;
}

export interface TraceLog {
  timestamp: number;
  fields: TraceKeyValuePair[];
  name?: string;
}
