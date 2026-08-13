export interface UsageSnapshot {
  usedPercent: number;
  remainingPercent: number;

  /** Absolute usage count — only if the data source provides it */
  used?: number;
  /** Usage quota/limit — only if the data source provides it */
  limit?: number;

  resetAt?: Date;
  currentModel?: string;
  account?: string;

  /** Where this data came from (for debugging) */
  source?: "local-file" | "cli" | "api" | "mock" | "hybrid";
  /** When this snapshot was captured */
  updatedAt?: Date;

  history?: number[]; // 24 hourly buckets
  apiUsedPercent?: number;
}

export type UsageState =
  | "good" // 0–60%
  | "warning" // 60–90%
  | "critical" // 90–99%
  | "full" // 100%
  | "no_access" // Provider not logged in / no credentials
  | "loading" // Fetching data
  | "error"; // Data source unreadable

export interface Provider {
  id: string;
  name: string;
  icon: string;
  getUsage(): Promise<UsageSnapshot>;
}
