import { describe, it, expect } from "vitest";
import { formatTimeUntil, formatNumber } from "./format";

describe("formatTimeUntil", () => {
  it("returns 'now' for a past or elapsed target", () => {
    expect(formatTimeUntil(new Date(Date.now() - 1000))).toBe("now");
  });

  it("formats days and hours", () => {
    const target = new Date(Date.now() + (5 * 24 + 14) * 3600_000);
    expect(formatTimeUntil(target)).toBe("5d 14h");
  });

  it("formats sub-minute as < 1m", () => {
    const target = new Date(Date.now() + 30_000);
    expect(formatTimeUntil(target)).toBe("< 1m");
  });
});

describe("formatNumber", () => {
  it("adds thousands separators", () => {
    expect(formatNumber(6800)).toBe("6,800");
  });
});
