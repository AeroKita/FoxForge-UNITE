import { useState } from "react";
import { asset } from "../ui/asset";
import { clipBlobUrl, resolveClipSrc } from "../ui/moveClipPreload";
import { useTooltipMediaActive } from "../ui/tooltipMedia";

type Stage = "video" | "gif" | "icon" | "none";

/** Tooltip visual below the text: self-recorded clip if present, else the animated
 *  WebP, else the static icon, else nothing. Clips are cropped landscape (~2:1) and
 *  the icon is square — both contained in one fixed media box so layout stays stable. */
export function MoveMedia({
  videoAsset,
  gifAsset,
  iconAsset,
  name,
}: {
  videoAsset?: string;
  gifAsset?: string;
  iconAsset?: string;
  name: string;
}) {
  const active = useTooltipMediaActive();
  const first: Stage = videoAsset ? "video" : gifAsset ? "gif" : iconAsset ? "icon" : "none";
  const [stage, setStage] = useState<Stage>(first);
  const src =
    stage === "video"
      ? videoAsset
      : stage === "gif"
        ? gifAsset
        : stage === "icon"
          ? iconAsset
          : undefined;
  if (!src) return null;
  if (stage === "video" && !active) return null;
  const fallback = (s: Stage): Stage =>
    s === "video"
      ? gifAsset
        ? "gif"
        : iconAsset
          ? "icon"
          : "none"
      : s === "gif"
        ? iconAsset
          ? "icon"
          : "none"
        : "none";
  const cls = "max-h-[120px] w-auto max-w-[180px] rounded-md object-contain";
  return (
    <span className="mt-1.5 flex justify-center">
      {stage === "video" ? (
        <video
          src={resolveClipSrc(clipBlobUrl(src), asset(src))}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setStage(fallback)}
          className={cls}
        />
      ) : (
        <img
          src={asset(src)}
          alt={`${name} preview`}
          loading="lazy"
          onError={() => setStage(fallback)}
          className={cls}
        />
      )}
    </span>
  );
}
