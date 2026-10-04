import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const navDir = path.resolve("src/assets/nav");

/** Share of the file occupied by opaque pixels. Near 1 means the art is cropped tight. */
async function contentFill(name: string): Promise<{ width: number; height: number }> {
  const file = path.join(navDir, name);
  const source = sharp(file);
  const meta = await source.metadata();
  const trimmed = await source.trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  return {
    width: trimmed.info.width / meta.width!,
    height: trimmed.info.height / meta.height!,
  };
}

/** Eyes are the two tall side shapes. The mouth is the lower center shape. */
async function rotomParts(name: string): Promise<{
  eyes: { pixels: number }[];
  eyeMedianRun: number;
  mouth: { pixels: number; medianRun: number };
}> {
  const { data, info } = await sharp(path.join(navDir, name))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const on = (x: number, y: number) => data[(y * width + x) * 4 + 3] > 40;
  const seen = new Uint8Array(width * height);
  const labels = new Int16Array(width * height);
  const components: { id: number; pixels: number; minX: number; maxX: number; minY: number }[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (!on(x, y) || seen[start]) continue;
      const id = components.length + 1;
      let pixels = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      const queue = [start];
      seen[start] = 1;
      labels[start] = id;
      while (queue.length) {
        const here = queue.pop()!;
        const px = here % width;
        const py = (here / width) | 0;
        pixels++;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nx = px + dx;
          const ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          if (seen[next] || !on(nx, ny)) continue;
          seen[next] = 1;
          labels[next] = id;
          queue.push(next);
        }
      }
      components.push({ id, pixels, minX, maxX, minY });
    }
  }
  const medianRun = (id: number) => {
    const runs: number[] = [];
    for (let y = 0; y < height; y++) {
      let run = 0;
      for (let x = 0; x < width; x++) {
        if (labels[y * width + x] === id) run++;
        else if (run > 2) {
          runs.push(run);
          run = 0;
        } else run = 0;
      }
      if (run > 2) runs.push(run);
    }
    runs.sort((a, b) => a - b);
    return runs[Math.floor(runs.length / 2)] ?? 0;
  };
  const eyes = components.filter((part) => part.minY < 40);
  const mouth = components.filter((part) => part.minY >= 40).sort((a, b) => b.pixels - a.pixels)[0];
  return {
    eyes: eyes.map((eye) => ({ pixels: eye.pixels })),
    eyeMedianRun: Math.min(...eyes.map((eye) => medianRun(eye.id))),
    mouth: { pixels: mouth?.pixels ?? 0, medianRun: mouth ? medianRun(mouth.id) : 0 },
  };
}

describe("tab silhouette art", () => {
  it("crops Lucario and Pikachu tight so they fill the slot the way Leftovers does", async () => {
    const leftovers = await contentFill("leftovers_icon_outline.png");
    const lucario = await contentFill("lucario_icon_outline.png");
    const pikachu = await contentFill("pikachu_icon_outline.png");

    expect(leftovers.height).toBeGreaterThan(0.8);
    expect(lucario.width).toBeGreaterThan(0.85);
    expect(lucario.height).toBeGreaterThan(0.9);
    expect(pikachu.width).toBeGreaterThan(0.85);
    expect(pikachu.height).toBeGreaterThan(0.9);
  });

  it("crops the Rotom face tight so Optimize fills the same slot", async () => {
    const face = await contentFill("rotomface_icon_outline.png");
    expect(face.width).toBeGreaterThan(0.85);
    expect(face.height).toBeGreaterThan(0.9);
  });

  it("keeps the Rotom mouth no thicker than the eyes", async () => {
    const parts = await rotomParts("rotomface_icon_outline.png");
    expect(parts.eyes.map((eye) => eye.pixels).sort((a, b) => a - b)).toEqual([12117, 12158]);
    expect(parts.mouth.pixels).toBeGreaterThan(1500);
    expect(parts.mouth.medianRun).toBeLessThanOrEqual(parts.eyeMedianRun + 2);
  });
});
