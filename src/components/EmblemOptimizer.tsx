/**
 * EmblemOptimizer — thin container for the "⚡ Optimize" tab.
 *
 * State and derivations live in useEmblemOptimizer(); presentational UI is split
 * across src/components/optimizer/ (Basic vs Advanced views).
 */

import { useStore } from "../state/store";
import { useEmblemOptimizer } from "../state/useEmblemOptimizer";
import { SearchProgressOverlay } from "./SearchProgressOverlay";
import { AdvancedOptimizer } from "./optimizer/AdvancedOptimizer";
import { BasicOptimizer } from "./optimizer/BasicOptimizer";

export function EmblemOptimizer({
  active,
  onNavigate,
}: {
  active: boolean;
  onNavigate?: (page: string) => void;
}) {
  const { expert, setMode: setViewMode } = useStore();
  const { shared, basic, advanced } = useEmblemOptimizer(active);

  return (
    <div className="flex flex-col gap-3">
      {expert ? (
        <AdvancedOptimizer
          shared={shared}
          advanced={advanced}
          onNavigate={onNavigate}
          setViewMode={setViewMode}
        />
      ) : (
        <BasicOptimizer
          shared={shared}
          basic={basic}
          onNavigate={onNavigate}
          setViewMode={setViewMode}
        />
      )}

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
