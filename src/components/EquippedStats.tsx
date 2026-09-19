import type { ImpactRow, OocGainRow } from "../ui/emblemWheel";

function Delta({ label, delta, sign }: { label: string; delta: string; sign: "pos" | "neg" }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className={`font-mono text-sm font-semibold tabular-nums ${
          sign === "pos" ? "text-pos" : "text-neg"
        }`}
      >
        {delta}
      </dd>
    </div>
  );
}

export function EquippedStats({
  rows,
  oocGain,
}: {
  rows: ImpactRow[];
  oocGain?: OocGainRow | null;
}) {
  const empty = rows.length === 0 && !oocGain;

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
        Equipped Stats
      </h4>
      {empty ? (
        <p className="text-sm text-faint">Equip emblems to see their effect on this Pokémon.</p>
      ) : (
        <dl className="flex flex-col gap-1">
          {rows.map((row) => (
            <Delta key={row.key} label={row.label} delta={row.delta} sign={row.sign} />
          ))}
          {oocGain && <Delta label={oocGain.label} delta={oocGain.delta} sign={oocGain.sign} />}
        </dl>
      )}
    </div>
  );
}
