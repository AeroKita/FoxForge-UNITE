import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useStore } from "../state/store";
import { deriveAtLevel } from "../engine/derive";
import { CollapsibleCard } from "./CollapsibleCard";
import {
  formatLevelChartValue,
  LEVEL_CHART_METRICS,
  levelChartValue,
  type LevelChartKey,
} from "../ui/levelChart";

const LEVELS = Array.from({ length: 15 }, (_, i) => i + 1);

export function LevelGraph() {
  const { loadout, heldSlotGrades } = useStore();
  const [metricKey, setMetricKey] = useState<LevelChartKey>("attack");
  const metric = LEVEL_CHART_METRICS.find((m) => m.key === metricKey)!;

  const data = useMemo(() => {
    if (!loadout.pokemonId) return [];
    return LEVELS.map((level) => {
      const d = deriveAtLevel(loadout, level, true, heldSlotGrades);
      return { level, value: levelChartValue(d, metricKey) };
    });
  }, [loadout, metricKey, heldSlotGrades]);

  if (!loadout.pokemonId) return null;

  const metricPills = (
    <div
      role="group"
      aria-label="Chart metric"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5"
    >
      {LEVEL_CHART_METRICS.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => setMetricKey(m.key)}
          className={`min-h-11 shrink-0 rounded-full px-3 text-sm font-medium whitespace-nowrap transition ${
            m.key === metricKey ? "text-white" : "bg-raise text-muted hover:bg-raise"
          }`}
          style={m.key === metricKey ? { backgroundColor: m.color } : undefined}
        >
          {m.label}
        </button>
      ))}
    </div>
  );

  return (
    <CollapsibleCard title="Stats Charts" persistKey="levelgraph">
      <div className="mb-3">{metricPills}</div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
          <XAxis
            dataKey="level"
            tick={{ fontSize: 12, fill: "var(--color-muted)" }}
            tickLine={false}
            stroke="var(--color-line)"
            label={{
              value: "Level",
              position: "insideBottom",
              offset: -2,
              fontSize: 11,
              fill: "var(--color-muted)",
            }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "var(--color-muted)" }}
            tickLine={false}
            stroke="var(--color-line)"
            width={metric.suffix === "%" ? 56 : 48}
            domain={["auto", "auto"]}
            tickFormatter={
              metric.suffix === "%" ? (v) => formatLevelChartValue(Number(v), metricKey) : undefined
            }
          />
          <Tooltip
            formatter={(v) => [formatLevelChartValue(Number(v), metricKey), metric.label]}
            labelFormatter={(l) => `Level ${l}`}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--color-line)",
              background: "var(--color-surface)",
              color: "var(--color-ink)",
              fontSize: 12,
            }}
          />
          <ReferenceLine
            x={loadout.level}
            stroke={metric.color}
            strokeDasharray="4 4"
            label={{ value: "current", fontSize: 10, fill: metric.color }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={metric.color}
            strokeWidth={2.5}
            dot={{ r: 2 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </CollapsibleCard>
  );
}
