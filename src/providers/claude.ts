import { invoke } from "@tauri-apps/api/core";
import type { Provider, UsageSnapshot } from "../types/provider";

export class ClaudeProvider implements Provider {
  id = "claude";
  name = "Claude";
  icon = "claude";

  async getUsage(): Promise<UsageSnapshot> {
    try {
      const data = await invoke<{
        usedPercent: number;
        remainingPercent: number;
        used: number;
        limit: number;
        history: number[];
        apiUsedPercent: number | null;
        apiResetAt: string | null;
      }>("get_claude_usage");

      return {
        usedPercent: data.usedPercent,
        remainingPercent: data.remainingPercent,
        used: data.used,
        limit: data.limit,
        history: data.history,
        apiUsedPercent: data.apiUsedPercent ?? undefined,
        resetAt: data.apiResetAt ? new Date(data.apiResetAt) : undefined,
        source: data.apiUsedPercent !== null && data.apiUsedPercent !== undefined ? "hybrid" : "local-file",
        updatedAt: new Date(),
        currentModel: "Claude Code",
      };
    } catch (e: any) {
      if (typeof e === "string" && e.includes("directory not found")) {
        const err = new Error("Usage data file not found");
        err.name = "FileNotFoundError";
        throw err;
      }
      throw new Error(typeof e === "string" ? e : "Unknown error");
    }
  }
}
