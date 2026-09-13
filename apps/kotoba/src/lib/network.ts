"use client";

/** WiFi-only gate for online LLM upgrades. */

export type ConnectionType =
  | "bluetooth"
  | "cellular"
  | "ethernet"
  | "none"
  | "wifi"
  | "wimax"
  | "other"
  | "unknown"
  | string;

/** WiFi + ethernet (plus unknown/other for browsers without Network Information API). */
export function isAllowedConnectionType(type: ConnectionType | undefined): boolean {
  if (!type) return true;
  return type === "wifi" || type === "ethernet" || type === "unknown" || type === "other";
}

export function shouldAttemptOnlineUpgrade(opts?: { onLine?: boolean; connectionType?: ConnectionType }): boolean {
  const onLine = opts?.onLine ?? (typeof navigator === "undefined" ? true : navigator.onLine);
  if (onLine === false) return false;
  const connType =
    opts?.connectionType ??
    (typeof navigator === "undefined"
      ? undefined
      : (navigator as Navigator & { connection?: { type?: ConnectionType } }).connection?.type);
  if (!connType) return true;
  if (connType === "none") return false;
  return isAllowedConnectionType(connType);
}
