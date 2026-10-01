import { useMemo, useRef, useState, type ReactNode } from "react";
import { asset } from "../ui/asset";
import { EMBLEM_COLOR_HEX, EMBLEM_GRADE_HEX, readableTextColor } from "../ui/colors";
import {
  emblemPickerFilterCaption,
  emblemPickerTileVisible,
  type EmblemStatSign,
} from "../ui/emblemInventoryFilter";
import {
  commitEmblemPickerFilters,
  defaultEmblemPickerFilters,
  loadEmblemPickerFilters,
  type EmblemPickerFilters,
} from "../state/rememberedFilters";
import { BottomSheet } from "./shell/BottomSheet";
import { Tooltip } from "./Tooltip";
import { SetGlyph } from "./SetGlyph";
import { EmblemFace } from "./EmblemFace";
import { EmblemStatFilters } from "./EmblemFilterBar";
import type { EmblemColor, EmblemGrade, StatBlock } from "../types";

export interface PickItem {
  id: string;
  name: string;
  icon: string;
  subtitle?: string;
  title?: string; // hover tooltip (e.g. item description)
  tip?: ReactNode; // rich long-press/hover tooltip content (e.g. itemTip output)
  colors?: EmblemColor[];
  disabled?: boolean;
  group?: string;
}

const GRADES: EmblemGrade[] = ["bronze", "silver", "gold"];

interface Props {
  title: string;
  items: PickItem[];
  onPick: (id: string, grade?: EmblemGrade) => void;
  onClear?: () => void; // when set, render a dashed "Empty slot" tile that clears the slot then closes
  onClose: () => void;
  filters?: { label: string; predicate: (id: string) => boolean; activeColor?: string }[];
  grades?: boolean; // show a Bronze/Silver/Gold toggle (emblems)
  owned?: Set<string>; // keys are `${id}:${grade}`; enables ownership stars + "Owned only"
  onToggleOwn?: (id: string, grade: EmblemGrade) => void;
  iconForGrade?: (id: string, grade: EmblemGrade) => string; // grade-correct image (emblems)
  tipForGrade?: (id: string, grade: EmblemGrade) => ReactNode; // grade-aware tooltip (emblems)
  subtitleForGrade?: (id: string, grade: EmblemGrade) => string; // grade-aware subtitle (emblems)
  goldOnlyIds?: Set<string>; // hide from silver/bronze pickers (UNITE-DB gold-only emblems)
  initialFilterLabel?: string;
  footer?: ReactNode;
  groupInfo?: Record<string, { title: string; hint?: string }>;
  /**
   * Emblem picker only. Adds the inventory Stats row (+/− and one stat) and
   * remembers color, owned-only, stat, and sign. Grade and the name search
   * start fresh each time the sheet opens.
   */
  filterByEmblemStats?: boolean;
  /** Grade-aware stat match. Called only while a stat or sign is selected. */
  matchesEmblemStats?: (
    id: string,
    grade: EmblemGrade,
    stat: keyof StatBlock | null,
    sign: EmblemStatSign | null,
  ) => boolean;
}

function asPickerColor(label: string | null): EmblemColor | null {
  if (label && Object.prototype.hasOwnProperty.call(EMBLEM_COLOR_HEX, label)) {
    return label as EmblemColor;
  }
  return null;
}

export function PickerModal({
  title,
  items,
  onPick,
  onClose,
  filters,
  grades,
  owned,
  onToggleOwn,
  iconForGrade,
  tipForGrade,
  subtitleForGrade,
  onClear,
  goldOnlyIds,
  initialFilterLabel,
  groupInfo,
  filterByEmblemStats,
  matchesEmblemStats,
}: Props) {
  const [remembered] = useState(() => (filterByEmblemStats ? loadEmblemPickerFilters() : null));
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(
    initialFilterLabel ?? remembered?.color ?? null,
  );
  const [ownedOnly, setOwnedOnly] = useState(remembered?.ownedOnly ?? false);
  const [grade, setGrade] = useState<EmblemGrade>("gold");
  const [stat, setStat] = useState<keyof StatBlock | null>(remembered?.stat ?? null);
  const [sign, setSign] = useState<EmblemStatSign | null>(remembered?.sign ?? null);
  const filtersRef = useRef<EmblemPickerFilters>({
    color: asPickerColor(initialFilterLabel ?? remembered?.color ?? null),
    ownedOnly: remembered?.ownedOnly ?? false,
    stat: remembered?.stat ?? null,
    sign: remembered?.sign ?? null,
  });

  const rememberPicker = (patch: Partial<EmblemPickerFilters>) => {
    if (!filterByEmblemStats) return;
    const next = commitEmblemPickerFilters({ ...filtersRef.current, ...patch });
    filtersRef.current = next;
  };

  const clearPickerFilters = () => {
    setActiveFilter(null);
    setOwnedOnly(false);
    setStat(null);
    setSign(null);
    const cleared = defaultEmblemPickerFilters();
    filtersRef.current = cleared;
    if (filterByEmblemStats) commitEmblemPickerFilters(cleared);
  };

  const isOwned = (id: string) => owned?.has(grades ? `${id}:${grade}` : id);

  const statActive = filterByEmblemStats === true && (stat != null || sign != null);
  const shown = useMemo(() => {
    const f = filters?.find((x) => x.label === activeFilter);
    return items.filter((it) =>
      emblemPickerTileVisible({
        name: it.name,
        query,
        passesColor: !f || f.predicate(it.id),
        passesOwned: !ownedOnly || !!isOwned(it.id),
        passesGrade: !grades || grade === "gold" || !goldOnlyIds?.has(it.id),
        statActive,
        passesStat: statActive ? (matchesEmblemStats?.(it.id, grade, stat, sign) ?? false) : true,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    items,
    query,
    activeFilter,
    filters,
    ownedOnly,
    owned,
    grade,
    goldOnlyIds,
    statActive,
    stat,
    sign,
    matchesEmblemStats,
  ]);

  const pickerCaption = filterByEmblemStats
    ? emblemPickerFilterCaption({
        color: asPickerColor(activeFilter) ?? "all",
        stat,
        sign,
        ownedOnly,
      })
    : null;
  const canClearFilters =
    filterByEmblemStats === true &&
    (activeFilter !== null || ownedOnly || stat != null || sign != null);

  const ungrouped = useMemo(() => shown.filter((it) => !it.group), [shown]);
  const groupIds = useMemo(
    () => [...new Set(shown.flatMap((it) => (it.group ? [it.group] : [])))],
    [shown],
  );

  const ownedCount = owned
    ? grades
      ? [...owned].filter((k) => k.endsWith(`:${grade}`)).length
      : owned.size
    : 0;

  return (
    <BottomSheet title={title} onClose={onClose} fillHeight>
      <div className="sticky top-0 z-10 -mx-4 border-b border-line bg-surface px-4 pb-3 pt-1">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          className="mb-3 min-h-11 w-full rounded-lg border border-line px-3 text-sm outline-none focus:border-accent"
        />
        {grades && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs font-medium text-muted">Grade</span>
            <div className="flex gap-1 rounded-lg bg-raise p-0.5">
              {GRADES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGrade(g)}
                  style={
                    grade === g
                      ? {
                          background: EMBLEM_GRADE_HEX[g],
                          color: readableTextColor(EMBLEM_GRADE_HEX[g]),
                        }
                      : undefined
                  }
                  className={`min-h-11 rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${
                    grade === g ? "shadow-sm" : "text-muted hover:text-ink"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}
        {(filters || owned) && (
          <div className="flex items-center gap-1.5">
            {owned && (
              <FilterChip
                label={`★ Owned (${ownedCount})`}
                active={ownedOnly}
                onClick={() => {
                  const next = !ownedOnly;
                  setOwnedOnly(next);
                  rememberPicker({ ownedOnly: next });
                }}
              />
            )}
            {filters && filters.length > 0 && (
              <div
                role="group"
                aria-label="Color"
                className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5"
              >
                <FilterChip
                  label="All"
                  active={activeFilter === null && !ownedOnly}
                  onClick={() => {
                    setActiveFilter(null);
                    setOwnedOnly(false);
                    rememberPicker({ color: null, ownedOnly: false });
                  }}
                />
                {filters.map((f) => (
                  <FilterChip
                    key={f.label}
                    label={f.label}
                    active={activeFilter === f.label}
                    activeColor={f.activeColor}
                    glyph={f.label as EmblemColor}
                    onClick={() => {
                      setActiveFilter(f.label);
                      rememberPicker({ color: asPickerColor(f.label) });
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {filterByEmblemStats && (
          <div className="mt-2">
            <EmblemStatFilters
              stat={stat}
              onStat={(next) => {
                setStat(next);
                rememberPicker({ stat: next });
              }}
              sign={sign}
              onSign={(next) => {
                setSign(next);
                rememberPicker({ sign: next });
              }}
              canClear={canClearFilters}
              onClear={clearPickerFilters}
            />
            <p className="mt-1 text-xs text-faint">
              {shown.length} shown{pickerCaption ? ` · ${pickerCaption}` : ""}
            </p>
          </div>
        )}
      </div>
      {filterByEmblemStats && shown.length === 0 && (
        <p className="mt-3 px-2 py-8 text-center text-sm text-muted">
          No emblems match these filters.
        </p>
      )}
      {(shown.length > 0 || onClear) && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {onClear && (
            <button
              type="button"
              onClick={() => {
                onClear();
                onClose();
              }}
              title="Empty slot"
              className="flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line p-2 text-center text-faint hover:border-accent hover:bg-accent-weak"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                className="h-12 w-12"
                aria-hidden="true"
              >
                <line x1="9" y1="9" x2="15" y2="15" />
                <line x1="15" y1="9" x2="9" y2="15" />
              </svg>
              <span className="text-xs font-medium leading-tight">Empty slot</span>
            </button>
          )}
          {ungrouped.map((it) => (
            <PickerTile
              key={it.id}
              item={it}
              grade={grade}
              grades={grades}
              ownedHere={!!isOwned(it.id)}
              iconForGrade={iconForGrade}
              tipForGrade={tipForGrade}
              subtitleForGrade={subtitleForGrade}
              onToggleOwn={onToggleOwn}
              onPick={onPick}
              onClose={onClose}
            />
          ))}
        </div>
      )}
      {groupIds.map((groupId) => {
        const meta = groupInfo?.[groupId];
        const groupItems = shown.filter((it) => it.group === groupId);
        if (groupItems.length === 0) return null;
        return (
          <div key={groupId} className="mt-4">
            <h3 className="text-sm font-semibold text-ink">{meta?.title ?? groupId}</h3>
            {meta?.hint && <p className="mb-2 text-xs text-muted">{meta.hint}</p>}
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {groupItems.map((it) => (
                <PickerTile
                  key={it.id}
                  item={it}
                  grade={grade}
                  grades={grades}
                  ownedHere={!!isOwned(it.id)}
                  iconForGrade={iconForGrade}
                  tipForGrade={tipForGrade}
                  subtitleForGrade={subtitleForGrade}
                  onToggleOwn={onToggleOwn}
                  onPick={onPick}
                  onClose={onClose}
                />
              ))}
            </div>
          </div>
        );
      })}
    </BottomSheet>
  );
}

function PickerTile({
  item,
  grade,
  grades,
  ownedHere,
  iconForGrade,
  tipForGrade,
  subtitleForGrade,
  onToggleOwn,
  onPick,
  onClose,
}: {
  item: PickItem;
  grade: EmblemGrade;
  grades?: boolean;
  ownedHere: boolean;
  iconForGrade?: (id: string, grade: EmblemGrade) => string;
  tipForGrade?: (id: string, grade: EmblemGrade) => ReactNode;
  subtitleForGrade?: (id: string, grade: EmblemGrade) => string;
  onToggleOwn?: (id: string, grade: EmblemGrade) => void;
  onPick: (id: string, grade?: EmblemGrade) => void;
  onClose: () => void;
}) {
  const tip = grades && tipForGrade ? tipForGrade(item.id, grade) : item.tip;
  const subtitle = grades && subtitleForGrade ? subtitleForGrade(item.id, grade) : item.subtitle;
  const tile = (
    <button
      type="button"
      aria-disabled={item.disabled || undefined}
      onClick={() => {
        if (item.disabled) return;
        onPick(item.id, grades ? grade : undefined);
        onClose();
      }}
      title={item.title ?? item.name}
      className={`relative flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center ${
        item.disabled
          ? "cursor-default border-line opacity-50 grayscale"
          : `hover:border-accent hover:bg-accent-weak ${
              ownedHere ? "border-as-border bg-as-bg" : "border-line"
            }`
      }`}
    >
      {item.colors && item.colors.length > 0 ? (
        <EmblemFace
          src={asset(grades && iconForGrade ? iconForGrade(item.id, grade) : item.icon)}
          alt={item.name}
          colors={item.colors}
          sizeClass="h-12 w-12"
          glyphClass="h-3 w-3"
        />
      ) : (
        <img
          src={asset(grades && iconForGrade ? iconForGrade(item.id, grade) : item.icon)}
          alt={item.name}
          loading="lazy"
          className="h-12 w-12 object-contain"
        />
      )}
      {onToggleOwn && (
        <span
          role="button"
          title={ownedHere ? `Owned (${grade}) — click to unmark` : `Mark ${grade} as owned`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleOwn(item.id, grade);
          }}
          className={`absolute right-1 top-1 flex min-h-11 min-w-11 items-center justify-center text-sm leading-none ${ownedHere ? "text-as-ink" : "text-faint hover:text-as-ink"}`}
        >
          ★
        </span>
      )}
      <span className="text-xs font-medium leading-tight text-ink">{item.name}</span>
      {subtitle && <span className="text-[10px] text-faint">{subtitle}</span>}
    </button>
  );
  return tip ? (
    <Tooltip content={tip} className="w-full">
      {tile}
    </Tooltip>
  ) : (
    <span className="contents">{tile}</span>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  activeColor,
  glyph,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  activeColor?: string;
  glyph?: EmblemColor;
}) {
  const style =
    active && activeColor
      ? { background: activeColor, color: readableTextColor(activeColor) }
      : undefined;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={style}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium whitespace-nowrap capitalize ${
        active
          ? activeColor
            ? "border-line"
            : "border-transparent bg-accent text-white"
          : "border-transparent bg-raise text-muted hover:bg-raise"
      }`}
    >
      {glyph && <SetGlyph color={glyph} sizeClass="h-4 w-4" />}
      {label}
    </button>
  );
}
