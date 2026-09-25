import { EmblemOptimizer } from "../EmblemOptimizer";
import type { Tab } from "../shell/TabBar";

interface OptimizeScreenProps {
  active: boolean;
  onNavigate: (tab: Tab) => void;
}

/** Optimize tab — emblem build search driven by the global Basic/Advanced mode toggle. */
export function OptimizeScreen({ active, onNavigate }: OptimizeScreenProps) {
  return (
    <EmblemOptimizer
      active={active}
      onNavigate={(page) => {
        if (page === "emblems") onNavigate("emblems");
      }}
    />
  );
}
