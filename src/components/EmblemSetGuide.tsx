import { EMBLEM_SET_UI_HEX } from "../ui/colors";
import {
  COLOR_SET_GUIDE_TITLE,
  emblemSetGuideRows,
  type EmblemSetGuideRow,
} from "../ui/setProgress";
import { SetGlyph } from "./SetGlyph";
import { BottomSheet } from "./shell/BottomSheet";

function GuideCard({ row }: { row: EmblemSetGuideRow }) {
  const fill = EMBLEM_SET_UI_HEX[row.color];
  return (
    <article className="rounded-xl bg-raise px-3 py-2.5 ring-1 ring-line">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="h-6 w-1.5 shrink-0 rounded-full"
          style={{ background: fill }}
          aria-hidden
        />
        <SetGlyph color={row.color} sizeClass="h-7 w-7 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold capitalize text-ink">{row.color}</p>
          <p className="text-xs text-muted">{row.noun}</p>
        </div>
      </div>
      <div className="flex gap-1.5">
        {row.tiers.map((t) => (
          <div
            key={t.count}
            className="flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center rounded-lg bg-surface ring-1 ring-line"
          >
            <span className="text-[10px] font-bold tabular-nums text-faint">{t.count}</span>
            <span className="font-mono text-xs font-semibold tabular-nums text-ink">
              {t.magnitude}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function GuideSection({ title, rows }: { title: string; rows: EmblemSetGuideRow[] }) {
  return (
    <section className="mb-4 last:mb-0">
      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-faint">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <GuideCard key={r.color} row={r} />
        ))}
      </div>
    </section>
  );
}

/** Color-Set Guide: same glyphs and threshold numbers as Equipped Sets. */
export function EmblemSetGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  const rows = emblemSetGuideRows();
  return (
    <BottomSheet title={COLOR_SET_GUIDE_TITLE} onClose={onClose}>
      <ul className="mb-4 space-y-1.5 text-xs leading-snug text-muted">
        <li>Multiples of a color unlock a bonus. The highest tier you reach applies.</li>
        <li>Only one unique Emblem counts — you cannot use multiples of the same Emblem.</li>
        <li>A dual-color Emblem counts for both colors.</li>
      </ul>
      <GuideSection title="Stat sets" rows={rows.filter((r) => r.kind === "stat")} />
      <GuideSection title="Utility sets" rows={rows.filter((r) => r.kind === "utility")} />
    </BottomSheet>
  );
}
