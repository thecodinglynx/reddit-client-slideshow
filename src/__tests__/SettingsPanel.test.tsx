import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SettingsPanel from "@/components/SettingsPanel";
import { DEFAULT_SETTINGS, SlideshowSettings } from "@/lib/types";

// Mock fetch for validation/suggestions
function mockFetchResponses(responses: Array<{ url: string; body: unknown }>) {
  const fetchSpy = vi.spyOn(global, "fetch");
  for (const r of responses) {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => r.body,
    } as Response);
  }
  return fetchSpy;
}

function renderPanel(overrides: Partial<{
  settings: SlideshowSettings;
  onSave: (s: SlideshowSettings) => void;
  onClose: () => void;
  isLoading: boolean;
  likedCount: number;
}> = {}) {
  // Mock the initial suggestions fetch
  const fetchSpy = vi.spyOn(global, "fetch");
  fetchSpy.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ results: [] }),
  } as Response);

  const props = {
    settings: DEFAULT_SETTINGS,
    onSave: vi.fn(),
    onClose: vi.fn(),
    isLoading: false,
    likedCount: 0,
    ...overrides,
  };
  const result = render(<SettingsPanel {...props} />);
  return { ...result, ...props, fetchSpy };
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
    const { fetchSpy } = renderPanel();

    // Mock the validation response
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: true, name: "wallpapers", subscribers: 100000 }),
    } as Response);
    // Mock suggestions after adding
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
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
    const { fetchSpy } = renderPanel();

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
    const { fetchSpy } = renderPanel();

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
    const { fetchSpy } = renderPanel();

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: true, name: "wallpapers", subscribers: 100000 }),
    } as Response);
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
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

  it("shows suggestions when available", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    // Initial suggestions fetch
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { name: "NaturePics", subscribers: 50000, description: "Nature photos", over18: false },
          { name: "WallpaperDump", subscribers: 30000, description: "Wallpapers", over18: false },
        ],
      }),
    } as Response);

    render(
      <SettingsPanel
        settings={DEFAULT_SETTINGS}
        onSave={vi.fn()}
        onClose={vi.fn()}
        isLoading={false}
        likedCount={0}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Suggestions")).toBeTruthy();
      expect(screen.getByText(/NaturePics/)).toBeTruthy();
      expect(screen.getByText(/WallpaperDump/)).toBeTruthy();
    });
  });

  it("adds suggestion to subreddit list when clicked", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { name: "Photography", subscribers: 100000, description: "Photo sub", over18: false },
        ],
      }),
    } as Response);

    render(
      <SettingsPanel
        settings={DEFAULT_SETTINGS}
        onSave={vi.fn()}
        onClose={vi.fn()}
        isLoading={false}
        likedCount={0}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Photography/)).toBeTruthy();
    });

    // Click the suggestion button
    const suggestionBtn = screen.getByText(/Photography/).closest("button")!;
    fireEvent.click(suggestionBtn);

    // Should now be in the subreddit tags
    expect(screen.getByText("r/photography")).toBeTruthy();
  });
});
