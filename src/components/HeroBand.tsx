import { useState } from "react";
import { useStore } from "../state/store";
import { pokemonById } from "../data/gameData";
import { ROLE_COLOR, ROLE_LABEL, ROLE_BAND } from "../ui/theme";
import { asset } from "../ui/asset";
import { PokemonPickerSheet } from "./PokemonPicker";

/** Role-tinted hero band: portrait, chips, level slider; empty state CTA. */
export function HeroBand() {
  const { loadout, dispatch } = useStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const pokemon = loadout.pokemonId ? pokemonById.get(loadout.pokemonId) : null;

  if (!pokemon) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-base font-bold text-ink">Choose your Pokémon</h2>
        <p className="mt-1 text-sm text-muted">
          Pick a Pokémon to forge a build — stats update live as you edit.
        </p>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mt-4 min-h-12 w-full rounded-xl bg-accent font-semibold text-white"
        >
          Choose a Pokémon
        </button>
        {pickerOpen && <PokemonPickerSheet onClose={() => setPickerOpen(false)} />}
      </div>
    );
  }

  const roleStyle = ROLE_COLOR[pokemon.role];

  return (
    <section className={`rounded-2xl border border-line p-4 ${ROLE_BAND[pokemon.role].band}`}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Change Pokémon"
          onClick={() => setPickerOpen(true)}
          className="shrink-0"
        >
          <img
            src={asset(pokemon.iconAsset)}
            alt=""
            className={`h-14 w-14 rounded-full object-cover ring-2 ${ROLE_BAND[pokemon.role].ring}`}
          />
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="block w-full truncate text-left text-lg font-bold leading-tight text-ink"
          >
            {pokemon.displayName}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleStyle.bg} ${roleStyle.text}`}
            >
              {ROLE_LABEL[pokemon.role]}
            </span>
            <span className="rounded-full bg-surface/70 px-2 py-0.5 text-[11px] capitalize text-muted">
              {pokemon.attackType}
            </span>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-grade-badge px-2 py-0.5 text-sm font-bold text-white">
          Lv {loadout.level}
        </span>
      </div>
      <div className="mt-3">
        <input
          type="range"
          min={1}
          max={15}
          value={loadout.level}
          onChange={(e) => dispatch({ type: "setLevel", level: Number(e.target.value) })}
          className="block w-full accent-grade-slider"
          aria-label="Level"
        />
      </div>
      {pickerOpen && <PokemonPickerSheet onClose={() => setPickerOpen(false)} />}
    </section>
  );
}
