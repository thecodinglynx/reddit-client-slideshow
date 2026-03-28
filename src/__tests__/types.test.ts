import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS } from "@/lib/types";

describe("DEFAULT_SETTINGS", () => {
  it("has subreddits source mode by default", () => {
    expect(DEFAULT_SETTINGS.sourceMode).toBe("subreddits");
  });

  it("has default subreddits", () => {
    expect(DEFAULT_SETTINGS.subreddits).toEqual(["earthporn", "pics", "itookapicture"]);
  });

  it("has empty users list", () => {
    expect(DEFAULT_SETTINGS.users).toEqual([]);
  });

  it("has hot sort order", () => {
    expect(DEFAULT_SETTINGS.sortOrder).toBe("hot");
  });

  it("has day timeframe", () => {
    expect(DEFAULT_SETTINGS.topTimeframe).toBe("day");
  });

  it("has 5s image duration", () => {
    expect(DEFAULT_SETTINGS.imageDuration).toBe(5);
  });

  it("has 8s gif duration", () => {
    expect(DEFAULT_SETTINGS.gifDuration).toBe(8);
  });

  it("has 0 (full) video duration", () => {
    expect(DEFAULT_SETTINGS.videoDuration).toBe(0);
  });

  it("has nsfw disabled", () => {
    expect(DEFAULT_SETTINGS.showNsfw).toBe(false);
  });

  it("has autoPlay enabled", () => {
    expect(DEFAULT_SETTINGS.autoPlay).toBe(true);
  });
});
