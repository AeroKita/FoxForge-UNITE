import { useMemo, useRef, useState } from "react";
import { useStore } from "../state/store";
import {
  commitEmblemPageFilters,
  loadEmblemPageFilters,
  type EmblemPageFilters,
} from "../state/rememberedFilters";
import { emblems as allEmblems } from "../data/gameData";
import { asset } from "../ui/asset";
import { EMBLEM_GRADE_HEX } from "../ui/colors";
import { emblemGradeSubtitle } from "../ui/emblemStatText";
import {
  emblemMatchesInventoryFilters,
  inventoryFilterCaption,
  type EmblemStatSign,
} from "../ui/emblemInventoryFilter";
import { emblemsForGrade } from "../ui/emblems";
import { ownedKey } from "../state/loadout";
import { emblemIconForGrade } from "../ui/emblemIcon";
import { COLOR_SET_GUIDE_TITLE } from "../ui/setProgress";
import { shareLink } from "../ui/share";
import { useTransientValue } from "../ui/transientValue";
import { EmblemFilterBar } from "./EmblemFilterBar";
import { EmblemSetGuide } from "./EmblemSetGuide";
import { EmblemFace } from "./EmblemFace";
import { Tooltip } from "./Tooltip";
import { emblemTip } from "./tips";
import type { EmblemColor, EmblemGrade, StatBlock } from "../types";

const GRADES: EmblemGrade[] = ["bronze", "silver", "gold"];

/**
 * Manage which emblems you own, per grade (Bronze/Silver/Gold independent).
 * Search, filter by color and by positive or negative stats, bulk own/clear the
 * current view, and see live counts.
 */
export function InventoryManager() {
  const {
    owned,
    toggleOwned,
    bulkSetOwned,
    ownedShareUrl,
    pendingOwnedImport,
    applyPendingOwnedImport,
    dismissPendingOwnedImport,
  } = useStore();
  const [pageFilters, setPageFilters] = useState<EmblemPageFilters>(() => loadEmblemPageFilters());
  const pageFiltersRef = useRef(pageFilters);
  pageFiltersRef.current = pageFilters;
  const { grade, color, stat, sign } = pageFilters;
  const rememberPageFilters = (patch: Partial<EmblemPageFilters>) => {
    const next = commitEmblemPageFilters({ ...pageFiltersRef.current, ...patch });
    pageFiltersRef.current = next;
    setPageFilters(next);
  };
  const setGrade = (next: EmblemGrade) => {
    if (next === "platinum") return;
    rememberPageFilters({ grade: next });
  };
  const [query, setQuery] = useState("");
  const setColor = (next: EmblemColor | "all") => rememberPageFilters({ color: next });
  const setStat = (next: keyof StatBlock | null) => rememberPageFilters({ stat: next });
  const setSign = (next: EmblemStatSign | null) => rememberPageFilters({ sign: next });
  const [guideOpen, setGuideOpen] = useState(false);
  const [copied, flashCopied] = useTransientValue<true>(1500);
  const [status, showStatus] = useTransientValue<string>(2000);

  const gradeEmblems = useMemo(() => emblemsForGrade(allEmblems, grade), [grade]);

  const filters = { query, color, stat, sign };
  const shown = useMemo(
    () =>
      gradeEmblems.filter((emblem) =>
        emblemMatchesInventoryFilters(emblem, grade, { query, color, stat, sign }),
      ),
    [gradeEmblems, grade, query, color, stat, sign],
  );
  const caption = inventoryFilterCaption(filters);

  const ownedCount = useMemo(
    () => gradeEmblems.reduce((n, e) => n + (owned.has(ownedKey(e.id, grade)) ? 1 : 0), 0),
    [owned, grade, gradeEmblems],
  );
  const shownIds = shown.map((e) => e.id);

  const shareInventory = async () => {
    const result = await shareLink(ownedShareUrl(), "FoxForge emblem inventory");
    if (result === "copied") flashCopied(true);
    else if (result === "failed") {
      showStatus("Couldn't copy the link — long-press the address bar instead.");
    }
  };

  const applyImport = (mode: "replace" | "merge") => {
    const n = pendingOwnedImport?.size ?? 0;
    applyPendingOwnedImport(mode);
    showStatus(`Imported ${n} owned emblem${n === 1 ? "" : "s"} ✓`);
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            Inventory
            <button
              onClick={() => setGuideOpen(true)}
              aria-label={COLOR_SET_GUIDE_TITLE}
              title="What do the colors do?"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-sm font-bold text-muted hover:bg-raise hover:text-ink"
            >
              ?
            </button>
          </h2>
          <p className="text-xs text-muted">
            Mark what you own per grade — owned emblems are highlighted in pickers and preferred by
            recommendations.
          </p>
        </div>
        <div className="text-right text-sm">
          <span className="font-semibold" style={{ color: EMBLEM_GRADE_HEX[grade] }}>
            {ownedCount}
          </span>
          <span className="text-faint">
            {" "}
            / {gradeEmblems.length} {grade} owned
          </span>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void shareInventory()}
          className="min-h-11 rounded-lg border border-line px-3 py-2.5 text-sm font-medium text-ink hover:bg-raise"
        >
          {copied ? "Link copied ✓" : "Share inventory link"}
        </button>
        <p className="text-xs text-muted">
          Open the link on another device to bring your collection over.
        </p>
        <p role="status" aria-live="polite" className="min-h-4 text-xs text-muted">
          {status ?? ""}
        </p>
      </div>

      <div className="mb-3 flex flex-col gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="min-h-11 w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
        />

        <div className="flex w-fit gap-1 rounded-lg bg-raise p-0.5">
          {GRADES.map((g) => (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className={`min-h-11 rounded-md px-3 py-2 text-xs font-semibold capitalize transition ${
                grade === g ? "bg-surface shadow-sm" : "text-muted hover:text-ink"
              }`}
              style={grade === g ? { color: EMBLEM_GRADE_HEX[g] } : undefined}
            >
              {g}
            </button>
          ))}
        </div>

        <EmblemFilterBar
          color={color}
          onColor={setColor}
          stat={stat}
          onStat={setStat}
          sign={sign}
          onSign={setSign}
          onClear={() => rememberPageFilters({ color: "all", stat: null, sign: null })}
        />

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => bulkSetOwned(shownIds, grade, true)}
            className="min-h-11 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Own all shown
          </button>
          <button
            onClick={() => bulkSetOwned(shownIds, grade, false)}
            className="min-h-11 rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted hover:bg-raise"
          >
            Clear shown
          </button>
        </div>
      </div>

      {pendingOwnedImport && (
        <div className="mb-3 rounded-xl border border-accent bg-accent-weak p-3">
          <p className="mb-2 text-sm text-ink">
            This link carries an emblem inventory ({pendingOwnedImport.size} owned).
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyImport("merge")}
              className="min-h-11 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-strong"
            >
              Merge
            </button>
            <button
              type="button"
              onClick={() => applyImport("replace")}
              className="min-h-11 rounded-lg bg-neg px-3 py-2 text-sm font-semibold text-white"
            >
              Replace mine
            </button>
            <button
              type="button"
              onClick={dismissPendingOwnedImport}
              className="min-h-11 rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted hover:bg-raise"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2 md:grid-cols-3">
        {shown.length === 0 && (
          <p className="col-span-full px-2 py-8 text-center text-sm text-muted">
            No emblems match these filters.
          </p>
        )}
        {shown.map((e) => {
          const isOwned = owned.has(ownedKey(e.id, grade));
          const subtitle = emblemGradeSubtitle(e, grade, true);
          return (
            <Tooltip key={e.id} content={emblemTip(e, grade)} className="w-full">
              <button
                onClick={() => toggleOwned(e.id, grade)}
                className={`relative flex min-h-11 w-full items-center gap-2 rounded-xl border p-2 text-left transition ${
                  isOwned ? "border-as-border bg-as-bg" : "border-line hover:border-line"
                }`}
              >
                <span className="shrink-0">
                  <EmblemFace
                    src={asset(emblemIconForGrade(e, grade))}
                    alt={e.pokemonName}
                    colors={e.colors}
                    sizeClass="h-10 w-10"
                    glyphClass="h-3 w-3"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-ink">
                    {e.pokemonName}
                  </span>
                  <span className="block truncate text-[10px] text-faint">{subtitle}</span>
                </span>
                <span
                  className={`text-base leading-none ${isOwned ? "text-as-ink" : "text-faint"}`}
                >
                  ★
                </span>
              </button>
            </Tooltip>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-faint">
        {shown.length} shown{caption ? ` · ${caption}` : ""}
      </p>
      <EmblemSetGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
