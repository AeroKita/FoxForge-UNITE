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
  attackSpeedBreakpoints,
  chartShowsOocLine,
  formatLevelChartValue,
  LEVEL_CHART_METRICS,
  levelChartOocValue,
  levelChartValue,
  type LevelChartKey,
} from "../ui/levelChart";

const LEVELS = Array.from({ length: 15 }, (_, i) => i + 1);

const BREAKPOINT_METRICS: ReadonlySet<LevelChartKey> = new Set(["attackSpeed", "aps"]);

function SpeedLegend({ inCombat }: { inCombat: string }) {
  return (
    <div
      className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted"
      aria-label="Speed lines"
    >
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className="inline-block h-0.5 w-4 rounded-full"
          style={{ backgroundColor: inCombat }}
        />
        In combat
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden
          className="inline-block h-px w-4"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, var(--color-muted) 0 3px, transparent 3px 5px)",
          }}
        />
        Out of combat
      </span>
    </div>
  );
}

function levelDot(color: string, active: boolean) {
  return function LevelDot(props: {
    cx?: number;
    cy?: number;
    payload?: { breakpoint?: boolean };
  }) {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return <g />;
    const hit = Boolean(payload?.breakpoint);
    return (
      <circle
        cx={cx}
        cy={cy}
        r={hit ? (active ? 6 : 5) : active ? 5 : 2}
        fill={hit ? "var(--color-surface)" : color}
        stroke={color}
        strokeWidth={hit ? 2 : 0}
      />
    );
  };
}

export function LevelGraph() {
  const { loadout, heldSlotGrades } = useStore();
  const [metricKey, setMetricKey] = useState<LevelChartKey>("attack");
  const metric = LEVEL_CHART_METRICS.find((m) => m.key === metricKey)!;

  const chart = useMemo(() => {
    if (!loadout.pokemonId) return { points: [], caption: null as string | null, showOoc: false };
    const rows = LEVELS.map((level) => {
      const d = deriveAtLevel(loadout, level, true, heldSlotGrades);
      return {
        level,
        value: levelChartValue(d, metricKey),
        ooc: metricKey === "moveSpeed" ? levelChartOocValue(d) : null,
        frames: d.attackSpeed?.frames ?? null,
      };
    });
    const showBreaks = BREAKPOINT_METRICS.has(metricKey);
    const marks = showBreaks ? attackSpeedBreakpoints(rows.map((row) => row.frames)) : [];
    const marked = new Set(marks);
    const showOoc =
      metricKey === "moveSpeed" &&
      chartShowsOocLine(
        rows.map((row) => row.value),
        rows.map((row) => row.ooc),
      );
    return {
      points: rows.map((row) => ({
        level: row.level,
        value: row.value,
        ooc: showOoc ? row.ooc : undefined,
        breakpoint: marked.has(row.level),
      })),
      caption: marks.length > 0 ? "Rings mark Attack Speed breakpoints." : null,
      showOoc,
    };
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
        <LineChart data={chart.points} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
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
            formatter={(v, name) => [
              formatLevelChartValue(Number(v), metricKey),
              chart.showOoc ? String(name) : metric.label,
            ]}
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
          {chart.showOoc && (
            <Line
              type="monotone"
              dataKey="ooc"
              name="Out of combat"
              stroke="var(--color-muted)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              activeDot={{ r: 3, fill: "var(--color-muted)" }}
              isAnimationActive={false}
            />
          )}
          <Line
            // stepAfter puts the vertical jump on the level where the frame count changes.
            type={metricKey === "aps" ? "stepAfter" : "monotone"}
            dataKey="value"
            name={chart.showOoc ? "In combat" : metric.label}
            stroke={metric.color}
            strokeWidth={2.5}
            dot={levelDot(metric.color, false)}
            activeDot={levelDot(metric.color, true)}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      {chart.showOoc && <SpeedLegend inCombat={metric.color} />}
      {chart.caption && <p className="mt-2 text-xs text-muted">{chart.caption}</p>}
    </CollapsibleCard>
  );
}
