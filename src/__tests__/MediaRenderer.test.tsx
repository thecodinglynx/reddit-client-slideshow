import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MediaRenderer from "@/components/MediaRenderer";
import { MediaItem } from "@/lib/types";

function makeImageItem(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "img1",
    type: "image",
    url: "https://i.redd.it/test.jpg",
    title: "Test Image",
    author: "testuser",
    subreddit: "pics",
    score: 100,
    permalink: "/r/pics/comments/abc/test/",
    ...overrides,
  };
}

function makeVideoItem(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "vid1",
    type: "video",
    url: "https://v.redd.it/test/DASH_720.mp4",
    title: "Test Video",
    author: "videouser",
    subreddit: "videos",
    score: 500,
    permalink: "/r/videos/comments/vid/test/",
    duration: 30,
    ...overrides,
  };
}

function makeGifItem(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "gif1",
    type: "gif",
    url: "https://i.imgur.com/test.mp4",
    title: "Test GIF",
    author: "gifuser",
    subreddit: "gifs",
    score: 200,
    permalink: "/r/gifs/comments/gif/test/",
    ...overrides,
  };
}

describe("MediaRenderer", () => {
  it("renders an image for image type", () => {
    const item = makeImageItem();
    render(<MediaRenderer item={item} isActive={true} />);

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", item.url);
    expect(img).toHaveAttribute("alt", item.title);
  });

  it("renders a video element for video type", () => {
    const item = makeVideoItem();
    const { container } = render(<MediaRenderer item={item} isActive={true} />);

    const video = container.querySelector("video");
    expect(video).toBeTruthy();
    expect(video!.getAttribute("src")).toBe(item.url);
    expect(video!.hasAttribute("controls")).toBe(true);
  });

  it("renders a video element for gif type (muted, loop, no controls)", () => {
    const item = makeGifItem();
    const { container } = render(<MediaRenderer item={item} isActive={true} />);

    const video = container.querySelector("video");
    expect(video).toBeTruthy();
    expect(video!.muted).toBe(true);
    expect(video!.loop).toBe(true);
    expect(video!.hasAttribute("controls")).toBe(false);
  });

  it("shows loading spinner before media loads", () => {
    const item = makeImageItem();
    const { container } = render(<MediaRenderer item={item} isActive={true} />);

    // Spinner should be visible (animate-spin class)
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("hides spinner after image loads", () => {
    const item = makeImageItem();
    const { container } = render(<MediaRenderer item={item} isActive={true} />);

    const img = screen.getByRole("img");
    fireEvent.load(img);

    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeNull();
  });

  it("shows error state when image fails to load", () => {
    const item = makeImageItem();
    render(<MediaRenderer item={item} isActive={true} />);

    const img = screen.getByRole("img");
    fireEvent.error(img);

    expect(screen.getByText("Failed to load media")).toBeTruthy();
    expect(screen.getByText(item.url)).toBeTruthy();
  });

  it("shows error state when video fails to load", () => {
    const item = makeVideoItem();
    const { container } = render(<MediaRenderer item={item} isActive={true} />);

    const video = container.querySelector("video")!;
    fireEvent.error(video);

    expect(screen.getByText("Failed to load media")).toBeTruthy();
  });

  it("calls onDurationKnown when video metadata loads", () => {
    const onDurationKnown = vi.fn();
    const item = makeVideoItem();
    const { container } = render(
      <MediaRenderer item={item} isActive={true} onDurationKnown={onDurationKnown} />
    );

    const video = container.querySelector("video")!;
    Object.defineProperty(video, "duration", { value: 45, writable: true });
    fireEvent.loadedMetadata(video);

    expect(onDurationKnown).toHaveBeenCalledWith(45);
  });

  it("has pointer-events-auto on video elements", () => {
    const item = makeVideoItem();
    const { container } = render(<MediaRenderer item={item} isActive={true} />);

    const video = container.querySelector("video")!;
    expect(video.className).toContain("pointer-events-auto");
  });

  it("applies opacity transition classes", () => {
    const item = makeImageItem();
    render(<MediaRenderer item={item} isActive={true} />);

    const img = screen.getByRole("img");
    // Before load, should have opacity-0
    expect(img.className).toContain("opacity-0");

    fireEvent.load(img);
    // After load, should have opacity-100
    expect(img.className).toContain("opacity-100");
  });
});
