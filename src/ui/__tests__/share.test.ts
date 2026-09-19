import { describe, expect, it, vi } from "vitest";
import { shareLink } from "../share";

function abortLike(): Error {
  const err = new Error("Share canceled");
  err.name = "AbortError";
  return err;
}

describe("shareLink", () => {
  it("returns shared when nav.share resolves", async () => {
    const nav = {
      share: vi.fn().mockResolvedValue(undefined),
      clipboard: { writeText: vi.fn() },
    };
    await expect(shareLink("https://example/#p=lucario", "FoxForge build", nav)).resolves.toBe(
      "shared",
    );
    expect(nav.share).toHaveBeenCalledWith({
      url: "https://example/#p=lucario",
      title: "FoxForge build",
    });
    expect(nav.clipboard.writeText).not.toHaveBeenCalled();
  });

  it("returns copied when share is missing and clipboard.writeText resolves", async () => {
    const nav = {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    };
    await expect(shareLink("https://example/#e=1g", "FoxForge emblem set", nav)).resolves.toBe(
      "copied",
    );
    expect(nav.clipboard.writeText).toHaveBeenCalledWith("https://example/#e=1g");
  });

  it("returns copied when share rejects with an AbortError-like error and clipboard works", async () => {
    const nav = {
      share: vi.fn().mockRejectedValue(abortLike()),
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    };
    await expect(
      shareLink("https://example/#o=abc", "FoxForge emblem inventory", nav),
    ).resolves.toBe("copied");
    expect(nav.clipboard.writeText).toHaveBeenCalledWith("https://example/#o=abc");
  });

  it("returns failed when both share and clipboard are unavailable", async () => {
    await expect(shareLink("https://example/#lv=15", "FoxForge build", {})).resolves.toBe("failed");
  });
});
