/**
 * Production chunk names. The patch bundle stays separate so a data refresh
 * does not bust the app shell. Recharts, d3, and victory-vendor must not be
 * forced into a named chunk: that pull also captured React, which put the
 * charts chunk on the boot path of every visitor.
 */
export function productionManualChunk(id: string): string | undefined {
  if (id.includes("patch-current.json")) return "game-data";
  return undefined;
}
