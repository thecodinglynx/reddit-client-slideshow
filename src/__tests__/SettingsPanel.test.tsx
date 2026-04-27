import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPanel from "@/components/SettingsPanel";
import { DEFAULT_SETTINGS, SlideshowSettings } from "@/lib/types";

function renderPanel(overrides: Partial<{
  settings: SlideshowSettings;
  isLoading: boolean;
  likedCount: number;
}> = {}) {
  const props = {
    settings: DEFAULT_SETTINGS,
    onSave: vi.fn(),
    onClose: vi.fn(),
    isLoading: false,
    likedCount: 0,
    ...overrides,
  };
  const result = render(<SettingsPanel {...props} />);
  return { ...result, ...props };
}

describe("SettingsPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders with default settings", () => {
    renderPanel();
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("shows subreddits by default", () => {
    renderPanel();
    expect(screen.getByText("r/earthporn")).toBeTruthy();
    expect(screen.getByText("r/pics")).toBeTruthy();
    expect(screen.getByText("r/itookapicture")).toBeTruthy();
  });

  it("shows close button", () => {
    const { onClose } = renderPanel();
    const closeBtn = screen.getByLabelText("Close settings");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("switches to users mode", () => {
    renderPanel();
    const usersBtn = screen.getByText("users");
    fireEvent.click(usersBtn);
    expect(screen.getByText("Add at least one user")).toBeTruthy();
  });

  it("validates subreddit before adding", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    renderPanel();

    // Mock the validation response
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: true, name: "wallpapers", subscribers: 100000 }),
    } as Response);

    const input = screen.getByPlaceholderText("e.g. earthporn");
    fireEvent.change(input, { target: { value: "wallpapers" } });

    const addBtn = screen.getAllByText("Add")[0];
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByText("r/wallpapers")).toBeTruthy();
    });
  });

  it("shows error for non-existent subreddit", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    renderPanel();

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: false }),
    } as Response);

    const input = screen.getByPlaceholderText("e.g. earthporn");
    fireEvent.change(input, { target: { value: "thisdoesnotexist999" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
      expect(screen.getByText(/doesn't exist/)).toBeTruthy();
    });
  });

  it("shows error for duplicate subreddit", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    renderPanel();

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: true, name: "pics", subscribers: 33000000 }),
    } as Response);

    const input = screen.getByPlaceholderText("e.g. earthporn");
    fireEvent.change(input, { target: { value: "pics" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText(/already in your list/)).toBeTruthy();
    });
  });

  it("strips r/ prefix from subreddit input", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    renderPanel();

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: true, name: "wallpapers", subscribers: 100000 }),
    } as Response);

    const input = screen.getByPlaceholderText("e.g. earthporn");
    fireEvent.change(input, { target: { value: "r/wallpapers" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("r/wallpapers")).toBeTruthy();
    });
  });

  it("removes a subreddit", () => {
    renderPanel();
    const removeBtn = screen.getByLabelText("Remove r/pics");
    fireEvent.click(removeBtn);
    expect(screen.queryByText("r/pics")).toBeNull();
  });

  it("switches sort order", () => {
    const { onSave } = renderPanel();
    fireEvent.click(screen.getByText("new"));
    fireEvent.click(screen.getByText("Apply & Start"));
    const savedSettings = onSave.mock.calls[0][0] as SlideshowSettings;
    expect(savedSettings.sortOrder).toBe("new");
  });

  it("shows timeframe options when sort is top", () => {
    renderPanel();
    fireEvent.click(screen.getByText("top"));
    expect(screen.getByText("hour")).toBeTruthy();
    expect(screen.getByText("week")).toBeTruthy();
    expect(screen.getByText("year")).toBeTruthy();
  });

  it("hides timeframe options when sort is not top", () => {
    renderPanel();
    expect(screen.queryByText("hour")).toBeNull();
  });

  it("toggles NSFW switch", () => {
    const { onSave } = renderPanel();
    const nsfwSwitch = screen.getByLabelText("Toggle NSFW content");
    fireEvent.click(nsfwSwitch);
    fireEvent.click(screen.getByText("Apply & Start"));
    const savedSettings = onSave.mock.calls[0][0] as SlideshowSettings;
    expect(savedSettings.showNsfw).toBe(true);
  });

  it("NSFW switch has correct aria attributes", () => {
    renderPanel();
    const nsfwSwitch = screen.getByLabelText("Toggle NSFW content");
    expect(nsfwSwitch).toHaveAttribute("role", "switch");
    expect(nsfwSwitch).toHaveAttribute("aria-checked", "false");
  });

  it("disables Apply button when no sources", () => {
    renderPanel();
    fireEvent.click(screen.getByLabelText("Remove r/earthporn"));
    fireEvent.click(screen.getByLabelText("Remove r/pics"));
    fireEvent.click(screen.getByLabelText("Remove r/itookapicture"));
    const applyBtn = screen.getByText("Apply & Start");
    expect(applyBtn).toBeDisabled();
  });

  it("shows loading state in Apply button", () => {
    renderPanel({ isLoading: true });
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("calls onClose when Cancel is clicked", () => {
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("adds and saves users in user mode", () => {
    const { onSave } = renderPanel();
    fireEvent.click(screen.getByText("users"));

    const input = screen.getByPlaceholderText("e.g. shittymorph");
    fireEvent.change(input, { target: { value: "testuser" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(screen.getByText("u/testuser")).toBeTruthy();
    fireEvent.click(screen.getByText("Apply & Start"));

    const saved = onSave.mock.calls[0][0] as SlideshowSettings;
    expect(saved.sourceMode).toBe("users");
    expect(saved.users).toContain("testuser");
  });

  it("removes a user", () => {
    renderPanel({
      settings: { ...DEFAULT_SETTINGS, sourceMode: "users", users: ["alice", "bob"] },
    });
    fireEvent.click(screen.getByLabelText("Remove u/alice"));
    expect(screen.queryByText("u/alice")).toBeNull();
    expect(screen.getByText("u/bob")).toBeTruthy();
  });

  it("shows 'Full' label when video duration is 0", () => {
    renderPanel();
    expect(screen.getByText("Full")).toBeTruthy();
  });

  // ── Discover section tests ──

  it("shows Discover subreddits button when subreddits exist", () => {
    renderPanel();
    expect(screen.getByText("Discover subreddits")).toBeTruthy();
  });

  it("does not show Discover when no subreddits", () => {
    renderPanel({
      settings: { ...DEFAULT_SETTINGS, subreddits: [] },
    });
    expect(screen.queryByText("Discover subreddits")).toBeNull();
  });

  it("fetches discoveries when Discover is opened", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { name: "NaturePics", subscribers: 50000, description: "Nature photos", over18: false, score: 2000 },
          { name: "WallpaperDump", subscribers: 30000, description: "Wallpapers galore", over18: false, score: 1500 },
        ],
      }),
    } as Response);

    renderPanel();

    fireEvent.click(screen.getByText("Discover subreddits"));

    await waitFor(() => {
      expect(screen.getByText(/NaturePics/)).toBeTruthy();
      expect(screen.getByText(/WallpaperDump/)).toBeTruthy();
      expect(screen.getByText("Nature photos")).toBeTruthy();
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/reddit/discover?seeds=")
    );
  });

  it("adds discovered subreddit when clicked", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { name: "Photography", subscribers: 100000, description: "Photo sub", over18: false, score: 3000 },
        ],
      }),
    } as Response);

    renderPanel();
    fireEvent.click(screen.getByText("Discover subreddits"));

    await waitFor(() => {
      expect(screen.getByText(/Photography/)).toBeTruthy();
    });

    const discoveryBtn = screen.getByText(/Photography/).closest("button")!;
    fireEvent.click(discoveryBtn);

    expect(screen.getByText("r/photography")).toBeTruthy();
  });

  it("auto-refreshes discoveries when subreddits change", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    // First discover call
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { name: "NaturePics", subscribers: 50000, description: "Nature", over18: false, score: 2000 },
        ],
      }),
    } as Response);

    renderPanel();
    fireEvent.click(screen.getByText("Discover subreddits"));

    await waitFor(() => {
      expect(screen.getByText(/NaturePics/)).toBeTruthy();
    });

    // Mock validation for adding a new sub
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: true, name: "landscapes", subscribers: 80000 }),
    } as Response);
    // Mock the auto-refresh discover call
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { name: "SkyPorn", subscribers: 40000, description: "Sky photos", over18: false, score: 1800 },
        ],
      }),
    } as Response);

    const input = screen.getByPlaceholderText("e.g. earthporn");
    fireEvent.change(input, { target: { value: "landscapes" } });
    fireEvent.click(screen.getAllByText("Add")[0]);

    await waitFor(() => {
      expect(screen.getByText("r/landscapes")).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByText(/SkyPorn/)).toBeTruthy();
    });
  });

  it("shows search autocomplete when typing in input", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { name: "wallpapers", subscribers: 200000, description: "Wallpapers", over18: false },
          { name: "wallpaperdump", subscribers: 50000, description: "Dumps", over18: false },
        ],
      }),
    } as Response);

    renderPanel();

    const input = screen.getByPlaceholderText("e.g. earthporn");
    fireEvent.change(input, { target: { value: "wallp" } });

    await waitFor(() => {
      expect(screen.getByText(/wallpaperdump/)).toBeTruthy();
    });
  });
});
