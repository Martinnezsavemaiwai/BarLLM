import { describe, it, expect } from "vitest";
import { deriveUsageState } from "./usage-state";

describe("deriveUsageState", () => {
  it.each([
    [-1, "error"],
    [NaN, "error"],
    [0, "good"],
    [59.9, "good"],
    [60, "warning"],
    [89.9, "warning"],
    [90, "critical"],
    [99.9, "critical"],
    [100, "full"],
    [150, "full"],
  ] as const)("%s%% -> %s", (percent, expected) => {
    expect(deriveUsageState(percent)).toBe(expected);
  });
});
