import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import { heldItems, isUniqueHeldItem, ITEM_GRADE_MAX } from "../data/gameData";
import { clampHeldGrade } from "../state/heldItemGrades";
import { asset } from "../ui/asset";
import { heldItemStatLines } from "../ui/format";
import { HeldItemDetailModal } from "../ui/heldItemDetail";
import { useHoldRepeat } from "../ui/useHoldRepeat";
import { GradeField } from "./GradeField";
import { statsAtGrade } from "./tips";
import type { HeldItem } from "../types";

/** Label beside the Items-page bulk grade chips. */
export const BULK_SET_ALL_LABEL = "Set all to";

/** Grades the bulk chips write. Last entry is the in-game cap. */
export const BULK_HELD_GRADE_PRESETS = [1, 10, 20, ITEM_GRADE_MAX] as const;

/** Visible text for one bulk chip. */
export function bulkHeldGradeChipLabel(value: number): string {
  return value === ITEM_GRADE_MAX ? "Max" : String(value);
}

/**
 * Copy `memory` and set `value` on every graded item in `items`.
 * Unique items and ids absent from `items` are left unchanged.
 */
export function gradesAfterBulkSet(
  memory: Record<string, number>,
  items: readonly HeldItem[],
  value: number,
): Record<string, number> {
  const next = { ...memory };
  const grade = clampHeldGrade(value);
  for (const item of items) {
    if (!isUniqueHeldItem(item)) next[item.id] = grade;
  }
  return next;
}

/**
 * Global held item grade inventory — set per-item grades (1–40) that sync with
 * the Builder's held-item slots.
 */
export function HeldItemsInventory() {
  const { heldItemGrade, setHeldItemGradeById } = useStore();
  const [query, setQuery] = useState("");
  const [detailItem, setDetailItem] = useState<HeldItem | null>(null);

  const shown = useMemo(
    () =>
      heldItems
        .filter((i) => i.displayName.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [query],
  );

  const gradedItems = shown.filter((i) => !isUniqueHeldItem(i));
  const uniqueItems = shown.filter((i) => isUniqueHeldItem(i));

  const detailGrade = detailItem ? heldItemGrade(detailItem.id) : 40;

  const setAllShown = (value: number) => {
    const next = gradesAfterBulkSet({}, gradedItems, value);
    for (const [id, grade] of Object.entries(next)) {
      setHeldItemGradeById(id, grade);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-3 shadow-sm">
      <div className="mb-3">
        <p className="text-xs text-muted">
          Set each item&apos;s grade (1–{ITEM_GRADE_MAX}). Grades apply everywhere that item appears
          in your builds. Tap an item&apos;s icon for full details.
        </p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search held items…"
        className="mb-3 min-h-11 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
      />

      {gradedItems.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">{BULK_SET_ALL_LABEL}</span>
          {BULK_HELD_GRADE_PRESETS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setAllShown(value)}
              className="min-h-11 rounded-full border border-line px-4 text-sm font-medium hover:bg-raise"
            >
              {bulkHeldGradeChipLabel(value)}
            </button>
          ))}
        </div>
      )}

      {gradedItems.length > 0 && (
        <div className="rounded-xl border border-line divide-y divide-line-soft">
          {gradedItems.map((item) => {
            const grade = heldItemGrade(item.id);
            return (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setDetailItem(item)}
                  aria-label={item.displayName}
                  className="h-11 w-11 shrink-0 rounded-lg bg-mon-bg p-1"
                >
                  <img
                    src={asset(item.iconAsset)}
                    alt=""
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{item.displayName}</p>
                  <p className="truncate text-[11px] text-muted">
                    {heldItemStatLines(statsAtGrade(item, grade))
                      .map((l) => `${l.label} ${l.value}`)
                      .join(" · ") || "—"}
                  </p>
                </div>
                <GradeStepper
                  item={item}
                  grade={grade}
                  onCommit={(g) => setHeldItemGradeById(item.id, g)}
                />
              </div>
            );
          })}
        </div>
      )}

      {uniqueItems.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1 text-sm font-semibold text-ink">Unique Items</h3>
          <p className="mb-2 text-xs text-muted">
            Mega Stones &amp; Rusted Sword have no grade or level.
          </p>
          <div className="rounded-xl border border-line divide-y divide-line-soft">
            {uniqueItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setDetailItem(item)}
                  aria-label={item.displayName}
                  className="h-11 w-11 shrink-0 rounded-lg bg-mon-bg p-1"
                >
                  <img
                    src={asset(item.iconAsset)}
                    alt=""
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{item.displayName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-2 text-xs text-faint">{shown.length} held items</p>

      <HeldItemDetailModal
        item={detailItem}
        grade={detailGrade}
        open={detailItem !== null}
        onClose={() => setDetailItem(null)}
      />
    </div>
  );
}

function GradeStepper({
  item,
  grade,
  onCommit,
}: {
  item: HeldItem;
  grade: number;
  onCommit: (g: number) => void;
}) {
  const decrement = useHoldRepeat(() => onCommit(Math.max(1, grade - 1)));
  const increment = useHoldRepeat(() => onCommit(Math.min(ITEM_GRADE_MAX, grade + 1)));

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={`${item.displayName} grade down`}
        className="min-h-11 min-w-11 select-none touch-none rounded-lg border border-line text-lg"
        {...decrement}
      >
        −
      </button>
      <GradeField value={grade} label={item.displayName} onCommit={onCommit} />
      <button
        type="button"
        aria-label={`${item.displayName} grade up`}
        className="min-h-11 min-w-11 select-none touch-none rounded-lg border border-line text-lg"
        {...increment}
      >
        +
      </button>
    </div>
  );
}
