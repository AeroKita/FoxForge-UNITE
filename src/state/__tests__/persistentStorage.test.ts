import { afterEach, describe, expect, it, vi } from "vitest";
import { isStandaloneDisplay, requestPersistentStorage } from "../persistentStorage";

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query === "(display-mode: standalone)" ? matches : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("isStandaloneDisplay", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is true when the standalone display-mode media query matches", () => {
    mockMatchMedia(true);
    vi.stubGlobal("navigator", { standalone: false });
    expect(isStandaloneDisplay()).toBe(true);
  });

  it("is true when navigator.standalone is set even if the media query is false", () => {
    mockMatchMedia(false);
    vi.stubGlobal("navigator", { standalone: true });
    expect(isStandaloneDisplay()).toBe(true);
  });

  it("is false when neither signal is set", () => {
    mockMatchMedia(false);
    vi.stubGlobal("navigator", { standalone: false });
    expect(isStandaloneDisplay()).toBe(false);
  });
});

describe("requestPersistentStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when persist() resolves true", async () => {
    vi.stubGlobal("navigator", { storage: { persist: vi.fn(async () => true) } });
    expect(await requestPersistentStorage()).toBe(true);
  });

  it("returns false when the StorageManager API is missing", async () => {
    vi.stubGlobal("navigator", {});
    expect(await requestPersistentStorage()).toBe(false);
  });

  it("returns false when persist() throws", async () => {
    vi.stubGlobal("navigator", {
      storage: {
        persist: vi.fn(async () => {
          throw new Error("denied");
        }),
      },
    });
    expect(await requestPersistentStorage()).toBe(false);
  });
});
