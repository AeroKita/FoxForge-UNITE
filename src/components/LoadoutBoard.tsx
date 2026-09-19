import { useMemo, useState } from "react";
import { useStore } from "../state/store";
import {
  heldItems,
  battleItems,
  emblems,
  heldItemById,
  battleItemById,
  emblemById,
  isUniqueHeldItem,
  pokemonById,
} from "../data/gameData";
import { MAX_EMBLEM_SLOTS } from "../engine/emblems";
import { asset } from "../ui/asset";
import { emblemIconForGrade } from "../ui/emblemIcon";
import { heldItemStatLines, statLines } from "../ui/format";
import { gradesForEmblem } from "../ui/emblems";
import { ALL_EMBLEM_COLORS, EMBLEM_COLOR_HEX } from "../ui/colors";
import { shareLink } from "../ui/share";
import { useTransientValue } from "../ui/transientValue";
import { PickerModal, type PickItem } from "./PickerModal";
import { Tooltip } from "./Tooltip";
import { GradeField } from "./GradeField";
import { BottomSheet } from "./shell/BottomSheet";
import { MyBuildsSheet } from "./MyBuildsSheet";
import { EmblemWheel } from "./EmblemWheel";
import { EmblemPanels } from "./EmblemPanels";
import { itemTip, emblemTip, statsAtGrade, battleItemTip, pickDescription } from "./tips";
import type { BattleItem, HeldItem } from "../types";

type Picker =
  | { kind: "held"; slot: number }
  | { kind: "battle" }
  | { kind: "emblem"; initialFilterLabel?: string }
  | null;

export function LoadoutBoard() {
  const {
    loadout,
    dispatch,
    owned,
    toggleOwned,
    heldSlotGrades,
    setHeldItemGradeForSlot,
    heldItemGrade,
    emblemShareUrl,
    expert,
  } = useStore();
  const [picker, setPicker] = useState<Picker>(null);
  const [buildsOpen, setBuildsOpen] = useState(false);
  const [gradeSlot, setGradeSlot] = useState<number | null>(null);
  const [emblemSheet, setEmblemSheet] = useState<number | null>(null);
  const [copiedEmblems, flashCopiedEmblems] = useTransientValue<true>(1500);

  const emblemGoldOnlyIds = useMemo(
    () => new Set(emblems.filter((e) => e.goldOnly).map((e) => e.id)),
    [],
  );

  const heldPickItems: PickItem[] = heldItems.map((i) => ({
    id: i.id,
    name: i.displayName,
    icon: i.iconAsset,
    title: i.description,
    tip: itemTip(i, heldItemGrade(i.id)),
  }));
  const battlePickItems: PickItem[] = battleItems.map((i) => ({
    id: i.id,
    name: i.displayName,
    icon: i.iconAsset,
    title: pickDescription(i, expert),
    tip: battleItemTip(i, expert),
  }));
  const emblemPickItems: PickItem[] = emblems.map((e) => ({
    id: e.id,
    name: e.pokemonName,
    icon: e.iconAsset,
    colors: e.colors,
  }));

  const slots = useMemo(
    () =>
      Array.from({ length: MAX_EMBLEM_SLOTS }, (_, i) => {
        const pick = loadout.emblems[i];
        if (!pick) return null;
        const emblem = emblemById.get(pick.emblemId);
        return emblem ? { emblem, grade: pick.grade } : null;
      }),
    [loadout.emblems],
  );

  const pokemon = loadout.pokemonId ? (pokemonById.get(loadout.pokemonId) ?? null) : null;

  const gradeSheetItem =
    gradeSlot != null && loadout.heldItemIds[gradeSlot]
      ? heldItemById.get(loadout.heldItemIds[gradeSlot]!)
      : null;
  const gradeSheetGrade = gradeSlot != null ? heldSlotGrades[gradeSlot] : 1;

  const emblemSheetData =
    emblemSheet != null && loadout.emblems[emblemSheet]
      ? (() => {
          const pick = loadout.emblems[emblemSheet]!;
          const emblem = emblemById.get(pick.emblemId);
          return emblem ? { emblem, pick, index: emblemSheet } : null;
        })()
      : null;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Loadout</h3>
        <button
          type="button"
          aria-label="My builds"
          onClick={() => setBuildsOpen(true)}
          className="flex min-h-11 min-w-11 items-center justify-center text-muted hover:text-ink"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      </div>

      <p className="mb-3 text-xs text-faint">
        Tap a slot to swap items — tap an item's name to set its grade.
      </p>

      <div className="flex items-center gap-2">
        {loadout.heldItemIds.map((id, slot) => {
          const item = id ? heldItemById.get(id) : null;
          const grade = heldSlotGrades[slot];
          return (
            <div key={`held-${slot}`} className="flex flex-col items-center">
              <SlotTile
                item={item ?? null}
                grade={grade}
                onGradeTap={item && !isUniqueHeldItem(item) ? () => setGradeSlot(slot) : undefined}
                emptyLabel="Held"
                onClick={() => setPicker({ kind: "held", slot })}
                tip={item ? itemTip(item, grade) : "Add a held item"}
              />
            </div>
          );
        })}
        <div className="h-10 w-px bg-line" aria-hidden />
        <div className="flex flex-col items-center">
          <SlotTile
            item={loadout.battleItemId ? (battleItemById.get(loadout.battleItemId) ?? null) : null}
            emptyLabel="Trainer"
            onClick={() => setPicker({ kind: "battle" })}
            tip={
              loadout.battleItemId && battleItemById.get(loadout.battleItemId)
                ? battleItemTip(battleItemById.get(loadout.battleItemId)!, expert)
                : "Add a Trainer Item"
            }
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
        <div>
          <EmblemWheel
            slots={slots}
            size="lg"
            onSlotClick={(i) => setEmblemSheet(i)}
            onEmptyClick={() => setPicker({ kind: "emblem" })}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void shareLink(emblemShareUrl(), "FoxForge emblem set").then((result) => {
                  if (result === "copied") flashCopiedEmblems(true);
                });
              }}
              disabled={loadout.emblems.length === 0}
              className="min-h-11 flex-1 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink hover:bg-raise disabled:opacity-40"
            >
              {copiedEmblems ? "Link copied ✓" : "Copy emblem link"}
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "applyBuild", emblems: [] })}
              disabled={loadout.emblems.length === 0}
              className="min-h-11 rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted hover:text-neg disabled:opacity-40"
            >
              Clear emblems
            </button>
          </div>
        </div>
        <EmblemPanels
          picks={loadout.emblems}
          pokemon={pokemon}
          level={loadout.level}
          onRowClick={(color) => setPicker({ kind: "emblem", initialFilterLabel: color })}
        />
      </div>

      {picker?.kind === "held" && (
        <PickerModal
          title="Choose Held Item"
          items={heldPickItems}
          onPick={(id) => dispatch({ type: "setHeldItem", slot: picker.slot, id })}
          onClear={() => dispatch({ type: "setHeldItem", slot: picker.slot, id: null })}
          onClose={() => setPicker(null)}
        />
      )}
      {picker?.kind === "battle" && (
        <PickerModal
          title="Choose Trainer Item"
          items={battlePickItems}
          onPick={(id) => dispatch({ type: "setBattleItem", id })}
          onClear={() => dispatch({ type: "setBattleItem", id: null })}
          onClose={() => setPicker(null)}
        />
      )}
      {picker?.kind === "emblem" && (
        <PickerModal
          title="Choose Emblem"
          initialFilterLabel={picker.initialFilterLabel}
          items={emblemPickItems}
          onPick={(id, grade) =>
            dispatch({ type: "addEmblem", emblemId: id, grade: grade ?? "gold" })
          }
          onClose={() => setPicker(null)}
          grades
          owned={owned}
          onToggleOwn={toggleOwned}
          goldOnlyIds={emblemGoldOnlyIds}
          iconForGrade={(id, g) => emblemIconForGrade({ id }, g)}
          subtitleForGrade={(id, g) => {
            const e = emblemById.get(id);
            if (!e) return "";
            return (
              statLines(e.statsByGrade[g === "platinum" ? "gold" : g], true)
                .map((l) => `${l.label} ${l.value}`)
                .join(" · ") || "—"
            );
          }}
          tipForGrade={(id, g) => {
            const e = emblemById.get(id);
            return e ? emblemTip(e, g) : null;
          }}
          filters={ALL_EMBLEM_COLORS.map((c) => ({
            label: c,
            activeColor: EMBLEM_COLOR_HEX[c],
            predicate: (id) => emblemById.get(id)?.colors.includes(c) ?? false,
          }))}
        />
      )}

      {gradeSlot != null && gradeSheetItem && (
        <BottomSheet title={gradeSheetItem.displayName} onClose={() => setGradeSlot(null)}>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-xs font-medium text-muted">Grade</label>
            <GradeField
              value={gradeSheetGrade}
              label={gradeSheetItem.displayName}
              onCommit={(g) => setHeldItemGradeForSlot(gradeSlot, g)}
            />
          </div>
          <div className="py-3">
            <input
              type="range"
              min={1}
              max={40}
              value={gradeSheetGrade}
              onChange={(e) => setHeldItemGradeForSlot(gradeSlot, Number(e.target.value))}
              className="block w-full accent-grade-slider"
              aria-label="Grade"
            />
          </div>
          <p className="font-mono text-[10px] text-faint">
            {heldItemStatLines(statsAtGrade(gradeSheetItem, gradeSheetGrade))
              .map((l) => `${l.label} ${l.value}`)
              .join(" · ") || "—"}
          </p>
        </BottomSheet>
      )}

      {emblemSheetData && (
        <BottomSheet
          title={emblemSheetData.emblem.pokemonName}
          onClose={() => setEmblemSheet(null)}
        >
          <div className="mb-4 text-sm text-muted">
            {emblemTip(emblemSheetData.emblem, emblemSheetData.pick.grade)}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {gradesForEmblem(emblemSheetData.emblem).map((g) => {
              const on = emblemSheetData.pick.grade === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "setEmblemGrade",
                      index: emblemSheetData.index,
                      grade: g,
                    })
                  }
                  className={`min-h-11 rounded-lg border px-4 text-sm capitalize ${
                    on ? "border-accent bg-accent-weak" : "border-line"
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: "removeEmblem", index: emblemSheetData.index });
              setEmblemSheet(null);
            }}
            className="min-h-11 w-full rounded-lg border border-line text-sm text-neg"
          >
            Remove
          </button>
        </BottomSheet>
      )}

      {buildsOpen && <MyBuildsSheet onClose={() => setBuildsOpen(false)} />}
    </section>
  );
}

function SlotTile({
  item,
  grade,
  onGradeTap,
  emptyLabel,
  onClick,
  tip,
}: {
  item: HeldItem | BattleItem | null;
  grade?: number;
  onGradeTap?: () => void;
  emptyLabel: string;
  onClick: () => void;
  tip: React.ReactNode;
}) {
  const tile = item ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={item.displayName}
      className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-raise"
    >
      <img src={asset(item.iconAsset)} alt="" className="h-10 w-10 object-contain" />
    </button>
  ) : (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Add ${emptyLabel.toLowerCase()} item`}
      className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-line text-2xl text-faint"
    >
      +
    </button>
  );

  const captionClass = "w-16 min-h-7 text-center text-[11px] leading-[13px] text-muted break-words";

  return (
    <>
      <Tooltip content={tip}>{tile}</Tooltip>
      {item && onGradeTap && grade != null ? (
        <button
          type="button"
          onClick={onGradeTap}
          aria-label={`${item.displayName} grade`}
          className={`mt-0.5 min-h-11 ${captionClass}`}
        >
          {item.displayName} · {grade}
        </button>
      ) : (
        <span className={`mt-0.5 flex min-h-11 items-start justify-center pt-0.5 ${captionClass}`}>
          {item ? item.displayName : emptyLabel}
        </span>
      )}
    </>
  );
}
