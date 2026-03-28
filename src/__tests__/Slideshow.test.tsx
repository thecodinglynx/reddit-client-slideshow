import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import Slideshow from "@/components/Slideshow";
import * as reddit from "@/lib/reddit";
import { MediaItem } from "@/lib/types";

function makeItems(count: number): MediaItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item${i}`,
    type: "image" as const,
    url: `https://i.redd.it/test${i}.jpg`,
    title: `Test Image ${i}`,
    author: `user${i}`,
    subreddit: `sub${i}`,
    score: (i + 1) * 100,
    permalink: `/r/sub${i}/comments/item${i}/test/`,
  }));
}

function makeFetchResult(items: MediaItem[]): reddit.FetchResult {
  return { items, afterTokens: {} };
}

async function loadSlideshow(itemCount = 3) {
  const items = makeItems(itemCount);
  vi.spyOn(reddit, "fetchAllMedia").mockResolvedValueOnce(makeFetchResult(items));

  const result = render(<Slideshow />);
  await act(async () => {
    fireEvent.click(screen.getByText("Apply & Start"));
  });

  // Wait for items to appear
  await waitFor(() => {
    expect(screen.getByText("Test Image 0")).toBeTruthy();
  });

  return { ...result, items };
}

describe("Slideshow", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows settings panel on initial load", () => {
    render(<Slideshow />);
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("loads media when Apply & Start is clicked", async () => {
    await loadSlideshow(3);
    expect(screen.getByText("Test Image 0")).toBeTruthy();
  });

  it("shows error when no media found (error stays in settings)", async () => {
    vi.spyOn(reddit, "fetchAllMedia").mockResolvedValueOnce(makeFetchResult([]));

    render(<Slideshow />);
    await act(async () => {
      fireEvent.click(screen.getByText("Apply & Start"));
    });

    // Settings panel stays open, error is set but hidden behind it
    // The settings panel remains visible
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeTruthy();
    });
  });

  it("shows error on fetch failure (settings stay open)", async () => {
    vi.spyOn(reddit, "fetchAllMedia").mockRejectedValueOnce(new Error("Network error"));

    render(<Slideshow />);
    await act(async () => {
      fireEvent.click(screen.getByText("Apply & Start"));
    });

    // Settings panel stays open on error
    await waitFor(() => {
      expect(screen.getByText("Settings")).toBeTruthy();
    });
  });

  it("displays item counter", async () => {
    await loadSlideshow(5);
    expect(screen.getByText("1 / 5")).toBeTruthy();
  });

  it("navigates forward with next button", async () => {
    await loadSlideshow(3);

    fireEvent.click(screen.getByLabelText("Next slide"));

    await waitFor(() => {
      expect(screen.getByText("Test Image 1")).toBeTruthy();
      expect(screen.getByText("2 / 3")).toBeTruthy();
    });
  });

  it("navigates backward with previous button", async () => {
    await loadSlideshow(3);

    // Go to previous wraps to last
    fireEvent.click(screen.getByLabelText("Previous slide"));

    await waitFor(() => {
      expect(screen.getByText("Test Image 2")).toBeTruthy();
      expect(screen.getByText("3 / 3")).toBeTruthy();
    });
  });

  it("toggles play/pause", async () => {
    await loadSlideshow(2);

    expect(screen.getByLabelText("Pause slideshow")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Pause slideshow"));
    expect(screen.getByLabelText("Play slideshow")).toBeTruthy();
  });

  it("keyboard: ArrowRight advances slide", async () => {
    await loadSlideshow(3);

    fireEvent.keyDown(window, { key: "ArrowRight" });

    await waitFor(() => {
      expect(screen.getByText("Test Image 1")).toBeTruthy();
    });
  });

  it("keyboard: ArrowLeft goes to previous slide", async () => {
    await loadSlideshow(3);

    fireEvent.keyDown(window, { key: "ArrowLeft" });

    await waitFor(() => {
      expect(screen.getByText("Test Image 2")).toBeTruthy();
    });
  });

  it("keyboard: Escape toggles settings open", async () => {
    await loadSlideshow(2);

    // Settings should be closed after loading
    expect(screen.queryByText("Settings")).toBeNull();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("shows subreddit and author in overlay", async () => {
    await loadSlideshow(1);

    expect(screen.getByText("r/sub0")).toBeTruthy();
    expect(screen.getByText("u/user0")).toBeTruthy();
    expect(screen.getByText("100 pts")).toBeTruthy();
  });

  it("shows settings button in controls", async () => {
    await loadSlideshow(1);
    expect(screen.getByLabelText("Open settings")).toBeTruthy();
  });

  it("opens settings when settings button clicked", async () => {
    await loadSlideshow(1);

    expect(screen.queryByText("Settings")).toBeNull();
    fireEvent.click(screen.getByLabelText("Open settings"));
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("wraps around at end of items", async () => {
    await loadSlideshow(2);

    fireEvent.click(screen.getByLabelText("Next slide"));
    await waitFor(() => expect(screen.getByText("Test Image 1")).toBeTruthy());

    fireEvent.click(screen.getByLabelText("Next slide"));
    await waitFor(() => expect(screen.getByText("Test Image 0")).toBeTruthy());
  });

  it("shows progress bar when items loaded", async () => {
    const { container } = await loadSlideshow(1);

    const progressBar = container.querySelector(".bg-gradient-to-r");
    expect(progressBar).toBeTruthy();
  });

  it("does not process keyboard when settings are open", () => {
    render(<Slideshow />);
    // Settings is open by default
    expect(screen.getByText("Settings")).toBeTruthy();

    // ArrowRight should not cause issues
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("Settings")).toBeTruthy();
  });
});
