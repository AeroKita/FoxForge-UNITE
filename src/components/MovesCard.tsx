import { useStore } from "../state/store";
import { pokemonById } from "../data/gameData";
import {
  baseMove,
  upgradeOptions,
  resolveFinalMove,
  uniteMoves,
  playablePassives,
  type FinalSlot,
} from "../engine/moves";
import { CollapsibleCard } from "./CollapsibleCard";
import { Tooltip } from "./Tooltip";
import { MoveIcon } from "./MoveIcon";
import { MoveMedia } from "./MoveMedia";
import { moveTip, pickDescription } from "./tips";
import type { Ability, Move, PassivePhase, Pokemon } from "../types";

/** Flip to `false` to hide Pre-Mega / Mega chips without touching the rows. */
const SHOW_PASSIVE_PHASE_CHIPS = true;

/** A read-only move row (base skill, Unite move) — icon + name + tooltip. */
function MoveRow({
  move,
  dimLabel,
  advanced,
}: {
  move: Move;
  dimLabel?: string;
  advanced: boolean;
}) {
  return (
    <Tooltip content={moveTip(move, advanced)}>
      <span className="flex items-center gap-2">
        <MoveIcon src={move.iconAsset} alt={move.name} size="h-8 w-8" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink">{move.name}</span>
          <span className="text-[10px] uppercase text-faint">
            {dimLabel}
            {dimLabel && move.moveType ? " · " : ""}
            {move.moveType}
          </span>
        </span>
      </span>
    </Tooltip>
  );
}

/**
 * An interactive move slot: the base skill (locked) plus the upgrade options the
 * player chooses between. The selected upgrade is the "final move" shown in the
 * Builds card. Clicking an option updates the loadout (single source of truth).
 */
function ChoosableMoveSlot({
  label,
  pokemon,
  slot,
}: {
  label: string;
  pokemon: Pokemon;
  slot: FinalSlot;
}) {
  const { loadout, dispatch, expert } = useStore();
  const base = baseMove(pokemon, slot);
  const options = upgradeOptions(pokemon, slot);
  const chosenId = slot === "move1" ? loadout.move1Id : loadout.move2Id;
  const selected = resolveFinalMove(pokemon, slot, chosenId);
  if (!base && options.length === 0) return null;

  return (
    <div>
      <p className="mb-1 text-xs font-medium text-faint">{label}</p>
      {base && <MoveRow move={base} dimLabel="Base" advanced={expert} />}
      {options.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5">
          {options.map((u) => {
            const isSel = selected?.id === u.id;
            return (
              <Tooltip key={u.id} content={moveTip(u, expert)} className="w-full">
                <button
                  type="button"
                  onClick={() => dispatch({ type: "setMove", slot, moveId: u.id })}
                  aria-pressed={isSel}
                  className={`flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition ${
                    isSel
                      ? "border-accent bg-accent-weak ring-1 ring-accent"
                      : "border-line hover:bg-raise"
                  }`}
                >
                  <MoveIcon src={u.iconAsset} alt={u.name} size="h-8 w-8" />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{u.name}</span>
                  {u.upgradeLevel ? (
                    <span className="shrink-0 rounded bg-raise px-1 text-[10px] text-faint">
                      Lv {u.upgradeLevel}
                    </span>
                  ) : null}
                  {isSel && <span className="shrink-0 text-xs font-bold text-accent-ink">✓</span>}
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PassivePhaseChip({ phase }: { phase: PassivePhase }) {
  if (!SHOW_PASSIVE_PHASE_CHIPS) return null;
  const mega = phase === "mega";
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        mega ? "bg-accent-weak text-accent-ink" : "bg-raise text-faint"
      }`}
    >
      {mega ? "Mega" : "Pre-Mega"}
    </span>
  );
}

function PassiveRow({ ability, advanced }: { ability: Ability; advanced: boolean }) {
  const desc = pickDescription(ability, advanced);
  return (
    <Tooltip
      content={
        <span>
          <span className="font-semibold">{ability.name}</span>
          {desc && <span className="mt-0.5 block text-faint">{desc}</span>}
          <MoveMedia
            videoAsset={ability.videoAsset}
            gifAsset={ability.gifAsset}
            iconAsset={ability.iconAsset}
            name={ability.name}
          />
        </span>
      }
    >
      <span className="flex items-center gap-2">
        <MoveIcon src={ability.iconAsset} alt={ability.name} size="h-8 w-8" />
        <span className="min-w-0 truncate text-sm font-medium text-ink">{ability.name}</span>
        {ability.phase ? <PassivePhaseChip phase={ability.phase} /> : null}
      </span>
    </Tooltip>
  );
}

/** The selected Pokémon's move kit — Move 1 / Move 2 are choosable; the two
 *  selected upgrades are the "final moves" shown in the Builds card. */
export function MovesCard() {
  const { loadout, expert } = useStore();
  const pokemon = loadout.pokemonId ? pokemonById.get(loadout.pokemonId) : null;
  if (!pokemon) return null;

  const uniteList = uniteMoves(pokemon);
  const passives = playablePassives(pokemon);

  return (
    <CollapsibleCard title="Moves" persistKey="moves" tone="sky" defaultOpen={false}>
      <p className="mb-3 text-xs text-faint">
        {pokemon.displayName}'s kit — pick one upgrade per move; your picks set the final moves in
        the Builds card.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChoosableMoveSlot label="Move 1" pokemon={pokemon} slot="move1" />
        <ChoosableMoveSlot label="Move 2" pokemon={pokemon} slot="move2" />
        {uniteList.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-medium text-faint">
              {uniteList.length > 1 ? "Unite Moves" : "Unite Move"}
            </p>
            <div className="flex flex-col gap-1.5">
              {uniteList.map((u) => (
                <MoveRow key={u.id} move={u} advanced={expert} />
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="mb-1 text-xs font-medium text-faint">
            {passives.length > 1 ? "Passives" : "Passive"}
          </p>
          <div className="flex flex-col gap-1.5">
            {passives.map((ability) => (
              <PassiveRow key={ability.id} ability={ability} advanced={expert} />
            ))}
          </div>
        </div>
      </div>
    </CollapsibleCard>
  );
}
