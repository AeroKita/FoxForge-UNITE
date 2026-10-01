/**
 * EmblemOptimizer — container for the Advanced-only Optimize tab.
 *
 * State and derivations live in useEmblemOptimizer(); the screen is
 * AdvancedOptimizer under src/components/optimizer/.
 */

import { useStore } from "../state/store";
import { useEmblemOptimizer } from "../state/useEmblemOptimizer";
import { SearchProgressOverlay } from "./SearchProgressOverlay";
import { AdvancedOptimizer } from "./optimizer/AdvancedOptimizer";

export function EmblemOptimizer({
  active,
  onNavigate,
}: {
  active: boolean;
  onNavigate?: (page: string) => void;
}) {
  const { setMode: setViewMode } = useStore();
  const { shared, advanced } = useEmblemOptimizer(active);

  return (
    <div className="flex flex-col gap-3">
      <AdvancedOptimizer
        shared={shared}
        advanced={advanced}
        onNavigate={onNavigate}
        setViewMode={setViewMode}
      />

      {shared.searchState.status === "running" && shared.searchState.progress && (
        <SearchProgressOverlay
          progress={shared.searchState.progress}
          eta={shared.searchState.eta}
          onCancel={shared.cancel}
        />
      )}

      {shared.toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4"
        >
          <div className="flex items-center gap-3 rounded-xl border border-pos/40 bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-lg">
            <span className="text-pos">✓</span>
            <span>{shared.toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
