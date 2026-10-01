import type { ReactNode } from "react";

export type Tab = "build" | "optimize" | "compare" | "emblems" | "items";

export type AdvancedTabSlot = "compare" | "optimize";

interface TabBarProps {
  active: Tab;
  onChange: (t: Tab) => void;
  tabs: { id: Tab; label: string; icon: ReactNode }[];
  /** When false, Compare and Optimize stay mounted at flex-grow 0 so Basic↔Advanced can animate. */
  advancedVisible: boolean;
}

const COLUMN_EASE = "motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]";

/**
 * Flex track. Compare and Optimize are their own items so each column can
 * delay independently. A single grid-template-columns transition cannot.
 */
export function tabBarTrackClass(): string {
  return "mx-auto flex w-full max-w-2xl";
}

/**
 * Basic sends Compare and Optimize back to Builds. Every other tab stays put.
 */
export function tabForMode(expert: boolean, tab: Tab): Tab {
  if (!expert && (tab === "compare" || tab === "optimize")) return "build";
  return tab;
}

function advancedSlot(id: Tab): AdvancedTabSlot | null {
  return id === "compare" || id === "optimize" ? id : null;
}

/**
 * Column motion, staggered in reading order.
 * Entering Advanced: Compare grows immediately, Optimize 150ms later.
 * Leaving Advanced: Optimize collapses immediately, Compare 150ms later.
 * Each item fades on that same stagger, 75ms after its column starts opening
 * and fast enough on the way out that the label is gone before the column shuts.
 */
export function tabBarAdvancedSlotClass(slot: AdvancedTabSlot, visible: boolean): string {
  const delay =
    slot === "compare"
      ? visible
        ? "motion-safe:delay-0"
        : "motion-safe:delay-150"
      : visible
        ? "motion-safe:delay-150"
        : "motion-safe:delay-0";
  return [
    "min-w-0 shrink basis-0 overflow-hidden",
    visible ? "grow" : "grow-0 pointer-events-none",
    "motion-safe:transition-[flex-grow]",
    "motion-safe:duration-300",
    COLUMN_EASE,
    delay,
  ].join(" ");
}

export function tabBarAdvancedItemClass(slot: AdvancedTabSlot, visible: boolean): string {
  const shownDelay = slot === "compare" ? "motion-safe:delay-75" : "motion-safe:delay-[225ms]";
  const hiddenDelay = slot === "compare" ? "motion-safe:delay-150" : "";
  return [
    "flex min-h-14 w-full min-w-[4.5rem] flex-col items-center justify-center gap-0.5 px-1",
    "motion-safe:transition-[opacity,transform]",
    COLUMN_EASE,
    visible
      ? `opacity-100 translate-x-0 scale-100 motion-safe:duration-300 ${shownDelay}`
      : `pointer-events-none opacity-0 translate-x-2 scale-[0.92] motion-safe:duration-150${hiddenDelay ? ` ${hiddenDelay}` : ""}`,
  ].join(" ");
}

function BuildIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 3h5v5" />
      <path d="M8 21H3v-5" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  );
}

function EmblemsIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function ItemsIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    </svg>
  );
}

function OptimizeIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export const TAB_ICONS: Record<Tab, ReactNode> = {
  build: <BuildIcon />,
  optimize: <OptimizeIcon />,
  compare: <CompareIcon />,
  emblems: <EmblemsIcon />,
  items: <ItemsIcon />,
};

export const MAIN_TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "build", label: "Builds", icon: TAB_ICONS.build },
  { id: "emblems", label: "Emblems", icon: TAB_ICONS.emblems },
  { id: "items", label: "Items", icon: TAB_ICONS.items },
  { id: "compare", label: "Compare", icon: TAB_ICONS.compare },
  { id: "optimize", label: "Optimize", icon: TAB_ICONS.optimize },
];

const TAB_INK = {
  active: "text-[var(--color-tab-active)]",
  idle: "text-[var(--color-tab-ink)]",
} as const;

/**
 * Fixed bottom navigation for primary app destinations.
 */
export function TabBar({ active, onChange, tabs, advancedVisible }: TabBarProps) {
  return (
    <nav
      role="tablist"
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-[var(--color-tab-bg)] pb-safe"
    >
      <div className={tabBarTrackClass()}>
        {tabs.map((tab) => {
          const slot = advancedSlot(tab.id);
          const isHiddenAdvanced = slot !== null && !advancedVisible;
          const isActive = active === tab.id && !isHiddenAdvanced;
          const ink = isActive ? TAB_INK.active : TAB_INK.idle;
          const itemClass =
            slot !== null
              ? `${tabBarAdvancedItemClass(slot, advancedVisible)} ${ink}`
              : `flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 transition ${ink}`;
          return (
            <div
              key={tab.id}
              className={
                slot !== null
                  ? tabBarAdvancedSlotClass(slot, advancedVisible)
                  : "min-w-0 shrink basis-0 grow"
              }
              {...(isHiddenAdvanced ? { inert: true } : {})}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-hidden={isHiddenAdvanced || undefined}
                tabIndex={isHiddenAdvanced ? -1 : undefined}
                onClick={() => {
                  if (isHiddenAdvanced) return;
                  onChange(tab.id);
                }}
                className={itemClass}
              >
                {tab.icon}
                <span className="text-[11px] font-medium leading-none">{tab.label}</span>
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
