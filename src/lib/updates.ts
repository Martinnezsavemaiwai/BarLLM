import { getVersion } from "@tauri-apps/api/app";

const REPO = "Martinnezsavemaiwai/TokenGauge";

export type UpdateCheckResult =
  | { status: "up-to-date" }
  | { status: "available"; latestVersion: string }
  | { status: "error" };

/** Compare the running app version against the latest GitHub release tag. */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  try {
    const [current, res] = await Promise.all([
      getVersion(),
      fetch(`https://api.github.com/repos/${REPO}/releases/latest`),
    ]);
    if (!res.ok) return { status: "error" };

    const data = await res.json();
    const latest = String(data.tag_name ?? "").replace(/^v/, "");
    if (!latest) return { status: "error" };

    return latest !== current ? { status: "available", latestVersion: latest } : { status: "up-to-date" };
  } catch {
    return { status: "error" };
  }
}
