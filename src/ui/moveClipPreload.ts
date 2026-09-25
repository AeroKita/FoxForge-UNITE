import { useEffect, useMemo } from "react";
import type { Pokemon } from "../types";
import { asset } from "./asset";

/** Every distinct gameplay clip for the current Pokémon, moves and passives. */
export function clipVideoUrls(pokemon: {
  moves: { videoAsset?: string }[];
  passiveAbility?: { videoAsset?: string };
  extraPassives?: { videoAsset?: string }[];
}): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (url?: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };
  for (const move of pokemon.moves) add(move.videoAsset);
  add(pokemon.passiveAbility?.videoAsset);
  for (const passive of pokemon.extraPassives ?? []) add(passive.videoAsset);
  return urls;
}

/**
 * Clips may start only after the document load event and after images that
 * have already started (not off-screen lazy images) have finished.
 */
export function clipPreloadGate(input: {
  pageLoaded: boolean;
  blockingImages: number;
}): "wait" | "ready" {
  if (!input.pageLoaded || input.blockingImages > 0) return "wait";
  return "ready";
}

/** Images still using bandwidth. Lazy images the browser has not started do not count. */
export function imagesBlockingClipPreload(
  imgs: { complete: boolean; loading: string; currentSrc: string }[],
): number {
  let n = 0;
  for (const img of imgs) {
    if (img.complete) continue;
    if (img.loading === "lazy" && img.currentSrc === "") continue;
    n++;
  }
  return n;
}

const clipBlobs = new Map<string, string>();

/** Prefer the preloaded object URL so playback does not request the file again. */
export function resolveClipSrc(warmed: string | undefined, assetUrl: string): string {
  return warmed ?? assetUrl;
}

export function clipBlobUrl(path: string): string | undefined {
  return clipBlobs.get(path);
}

function releaseClip(path: string) {
  const url = clipBlobs.get(path);
  if (!url) return;
  URL.revokeObjectURL(url);
  clipBlobs.delete(path);
}

async function warmClip(path: string, cancelled: () => boolean): Promise<void> {
  try {
    const res = await fetch(asset(path), { priority: "low" });
    if (cancelled() || !res.ok) return;
    const blob = await res.blob();
    if (cancelled()) return;
    const objectUrl = URL.createObjectURL(blob);
    if (cancelled()) {
      URL.revokeObjectURL(objectUrl);
      return;
    }
    releaseClip(path);
    clipBlobs.set(path, objectUrl);
    if (cancelled()) releaseClip(path);
  } catch {
    /* Playback falls back to the asset URL. */
  }
}

function imageSnapshot(img: HTMLImageElement) {
  return { complete: img.complete, loading: img.loading, currentSrc: img.currentSrc };
}

function whenImageSettled(img: HTMLImageElement): Promise<void> {
  if (img.complete) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => resolve();
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
    if (img.complete) done();
  });
}

async function whenViewImagesSettled(root: ParentNode): Promise<void> {
  for (let pass = 0; pass < 5; pass++) {
    const pending = [...root.querySelectorAll("img")].filter(
      (img) => imagesBlockingClipPreload([imageSnapshot(img)]) === 1,
    );
    if (pending.length === 0) return;
    await Promise.all(pending.map((img) => whenImageSettled(img)));
  }
}

function scheduleIdle(task: () => void): number {
  if (typeof window.requestIdleCallback === "function") {
    return window.requestIdleCallback(task, { timeout: 1500 });
  }
  return window.setTimeout(task, 1);
}

/**
 * Fetch the current Pokémon's clips at low priority after the page has settled.
 * Hidden tooltip videos do not start these downloads.
 */
export function usePreloadMoveClips(pokemon: Pokemon | null): void {
  const urls = useMemo(() => (pokemon ? clipVideoUrls(pokemon) : []), [pokemon]);

  useEffect(() => {
    if (typeof window === "undefined" || urls.length === 0) return;
    let cancelled = false;
    let timer = 0;
    let idle = 0;
    let usedIdleCallback = false;
    let removeLoad: (() => void) | undefined;

    const fetchClips = () => {
      if (cancelled) return;
      usedIdleCallback = typeof window.requestIdleCallback === "function";
      idle = scheduleIdle(() => {
        if (cancelled) return;
        for (const path of urls) void warmClip(path, () => cancelled);
      });
    };

    const afterPaint = () => {
      if (cancelled) return;
      const root = document.querySelector("main") ?? document.body;
      void whenViewImagesSettled(root).then(() => {
        if (cancelled) return;
        const blocking = imagesBlockingClipPreload(
          [...root.querySelectorAll("img")].map((img) => imageSnapshot(img)),
        );
        if (clipPreloadGate({ pageLoaded: true, blockingImages: blocking }) !== "ready") return;
        fetchClips();
      });
    };

    if (document.readyState === "complete") {
      timer = window.setTimeout(afterPaint, 0);
    } else {
      const onLoad = () => {
        timer = window.setTimeout(afterPaint, 0);
      };
      window.addEventListener("load", onLoad, { once: true });
      removeLoad = () => window.removeEventListener("load", onLoad);
    }

    return () => {
      cancelled = true;
      removeLoad?.();
      if (timer) window.clearTimeout(timer);
      if (idle) {
        if (usedIdleCallback) window.cancelIdleCallback(idle);
        else window.clearTimeout(idle);
      }
      for (const path of urls) releaseClip(path);
    };
  }, [urls]);
}
