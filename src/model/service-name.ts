// 服务显示名 / 配色 key（重写自 grafana TraceView service-name.ts，无原版权头）。
import type { TraceProcess } from './types';

/** "namespace/serviceName"（有 namespace）或 "serviceName"。 */
export function getServiceDisplayName(process: TraceProcess): string {
  if (process.serviceNamespace) {
    return `${process.serviceNamespace}/${process.serviceName}`;
  }
  return process.serviceName;
}

/** 配色/去重用的服务唯一 key（含 namespace）。 */
export function getServiceColorKey(process: TraceProcess): string {
  return getServiceDisplayName(process);
}
