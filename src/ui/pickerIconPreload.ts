import { useEffect, useMemo } from "react";
import { pokemonList } from "../data/gameData";
import { asset } from "./asset";
import { imagesBlockingClipPreload } from "./moveClipPreload";

/** One thumbnail in flight so this queue cannot crowd out move-clip fetches. */
export const PICKER_ICON_WARM_CONCURRENCY = 1;

/**
 * Distinct picker thumbnails in roster order.
 * Blank paths are omitted. Only `iconAsset` is read.
 */
export function pickerIconPaths(list: { iconAsset?: string }[]): string[] {
  const paths: string[] = [];
  const seen = new Set<string>();
  for (const pokemon of list) {
    const path = pokemon.iconAsset?.trim() ?? "";
    if (!path || seen.has(path)) continue;
    seen.add(path);
    paths.push(path);
  }
  return paths;
}

/**
 * Whether background thumbnail warmup may start.
 * Save-data skips the queue. A page that has not loaded, or a view that still
 * has started images in flight, waits. Lazy images the browser has not started
 * do not count.
 */
export function pickerIconWarmupGate(input: {
  pageLoaded: boolean;
  blockingImages: number;
  saveData: boolean;
}): "skip" | "wait" | "ready" {
  if (input.saveData) return "skip";
  if (!input.pageLoaded || input.blockingImages > 0) return "wait";
  return "ready";
}

const warmedIcons = new Map<string, HTMLImageElement>();

function readSaveData(): boolean {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

function imageSnapshot(img: HTMLImageElement) {
  return { complete: img.complete, loading: img.loading, currentSrc: img.currentSrc };
}

function blockingImages(root: ParentNode): number {
  return imagesBlockingClipPreload([...root.querySelectorAll("img")].map(imageSnapshot));
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

/** Wait until images that have already started are done. Unstarted lazy images are ignored. */
async function whenStartedImagesSettled(root: ParentNode): Promise<void> {
  for (let pass = 0; pass < 5; pass++) {
    const pending = [...root.querySelectorAll("img")].filter(
      (img) => imagesBlockingClipPreload([imageSnapshot(img)]) === 1,
    );
    if (pending.length === 0) return;
    await Promise.all(pending.map((img) => whenImageSettled(img)));
  }
}

function warmIcon(url: string, cancelled: () => boolean): Promise<void> {
  if (warmedIcons.has(url)) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.fetchPriority = "low";
    const finish = () => resolve();
    img.addEventListener(
      "load",
      () => {
        if (!cancelled()) warmedIcons.set(url, img);
        finish();
      },
      { once: true },
    );
    img.addEventListener("error", finish, { once: true });
    img.src = url;
  });
}

function viewRoot(): ParentNode {
  return document.querySelector("main") ?? document.body;
}

/**
 * Warm every Choose a Pokémon thumbnail after the current view's started
 * images finish. One low-priority image at a time. Does not fetch clips.
 */
export function usePreloadPickerIcons(): void {
  const urls = useMemo(() => pickerIconPaths(pokemonList).map((path) => asset(path)), []);

  useEffect(() => {
    if (typeof window === "undefined" || urls.length === 0) return;
    let cancelled = false;
    let timer = 0;
    let idle = 0;
    let usedIdle = false;
    let removeLoad: (() => void) | undefined;

    const clearIdle = () => {
      if (!idle) return;
      if (usedIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      idle = 0;
    };

    const scheduleIdle = (task: () => void) => {
      usedIdle = typeof window.requestIdleCallback === "function";
      if (usedIdle) {
        idle = window.requestIdleCallback(
          () => {
            idle = 0;
            task();
          },
          { timeout: 1500 },
        );
      } else {
        idle = window.setTimeout(() => {
          idle = 0;
          task();
        }, 1);
      }
    };

    const pump = (cursor: number) => {
      if (cancelled) return;
      const root = viewRoot();
      const gate = pickerIconWarmupGate({
        pageLoaded: document.readyState === "complete",
        blockingImages: blockingImages(root),
        saveData: readSaveData(),
      });
      if (gate === "skip") return;
      if (gate === "wait") {
        void whenStartedImagesSettled(root).then(() => {
          if (!cancelled) scheduleIdle(() => pump(cursor));
        });
        return;
      }

      let next = cursor;
      const batch: Promise<void>[] = [];
      while (batch.length < PICKER_ICON_WARM_CONCURRENCY && next < urls.length) {
        const url = urls[next];
        next += 1;
        if (warmedIcons.has(url)) continue;
        batch.push(warmIcon(url, () => cancelled));
      }
      if (batch.length === 0) return;
      void Promise.all(batch).then(() => {
        if (cancelled || next >= urls.length) return;
        scheduleIdle(() => pump(next));
      });
    };

    const afterLoad = () => {
      if (cancelled) return;
      void whenStartedImagesSettled(viewRoot()).then(() => {
        if (!cancelled) scheduleIdle(() => pump(0));
      });
    };

    if (document.readyState === "complete") {
      timer = window.setTimeout(afterLoad, 0);
    } else {
      const onLoad = () => {
        timer = window.setTimeout(afterLoad, 0);
      };
      window.addEventListener("load", onLoad, { once: true });
      removeLoad = () => window.removeEventListener("load", onLoad);
    }

    return () => {
      cancelled = true;
      removeLoad?.();
      if (timer) window.clearTimeout(timer);
      clearIdle();
    };
  }, [urls]);
}
