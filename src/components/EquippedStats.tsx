import type { EmblemColor } from "../types";
import { formatActiveSetBonuses } from "../ui/setProgress";
import type { ImpactRow } from "../ui/emblemWheel";

export function EquippedStats({
  rows,
  setBonuses,
  oocMoveSpeed,
}: {
  rows: ImpactRow[];
  setBonuses: { color: EmblemColor; bonusPercent: number }[];
  oocMoveSpeed?: number | null;
}) {
  const yellowActive = setBonuses.some((b) => b.color === "yellow");
  const empty = rows.length === 0 && !(yellowActive && oocMoveSpeed != null);

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
        Equipped Stats
      </h4>
      {empty ? (
        <p className="text-sm text-faint">Equip emblems to see their effect on this Pokémon.</p>
      ) : (
        <>
          <table className="w-full text-sm">
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-line-soft">
                  <td className="py-1 text-muted">{row.label}</td>
                  <td className="py-1 text-right font-mono text-xs text-muted">
                    {row.before} → {row.after}
                  </td>
                  <td
                    className={`py-1 text-right font-mono text-xs ${
                      row.sign === "pos" ? "text-pos" : "text-neg"
                    }`}
                  >
                    {row.delta}
                  </td>
                </tr>
              ))}
              {yellowActive && oocMoveSpeed != null && (
                <tr className="border-b border-line-soft">
                  <td className="py-1 text-muted">Move speed (out of combat)</td>
                  <td className="py-1 text-right font-mono text-xs text-muted" colSpan={2}>
                    {oocMoveSpeed.toLocaleString()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {setBonuses.length > 0 && (
            <p className="mt-2 text-xs text-faint">
              Set bonuses: {formatActiveSetBonuses(setBonuses)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
