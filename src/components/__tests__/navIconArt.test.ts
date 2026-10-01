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
});
