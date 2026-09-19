import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { pokemonById } from "../data/gameData";
import { MAX_SAVED_LOADOUTS } from "../state/loadout";
import { shareLink } from "../ui/share";
import { useTransientValue } from "../ui/transientValue";
import { asset } from "../ui/asset";
import { BottomSheet } from "./shell/BottomSheet";

export function MyBuildsSheet({ onClose }: { onClose: () => void }) {
  const { loadout, saved, save, remove, loadSaved, saveError, dispatch, shareUrl } = useStore();
  const [name, setName] = useState("");
  const [copied, flashCopied] = useTransientValue<true>(1500);
  const [status, showStatus] = useTransientValue<string>(2000);
  const [savedId, flashSaved] = useTransientValue<string>(1500);
  const [loadedId, flashLoaded] = useTransientValue<string>(1500);

  const share = async () => {
    const result = await shareLink(shareUrl(), "FoxForge build");
    if (result === "copied") flashCopied(true);
    else if (result === "failed") {
      showStatus("Couldn't copy the link — long-press the address bar instead.");
    }
  };

  const handleSave = () => {
    const pokemon = loadout.pokemonId ? pokemonById.get(loadout.pokemonId) : null;
    const entry = save(name.trim() || `${pokemon?.displayName ?? "Build"} ${saved.length + 1}`);
    if (!entry) return;
    flashSaved(entry.id);
    showStatus(`Saved “${entry.name}”`);
    setName("");
  };

  useEffect(() => {
    if (!savedId) return;
    document.getElementById(`saved-loadout-${savedId}`)?.scrollIntoView({ block: "nearest" });
  }, [savedId]);

  return (
    <BottomSheet title="My Builds" onClose={onClose}>
      <div className="mb-3 flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Loadout name…"
          className="min-h-11 flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={handleSave}
          disabled={!loadout.pokemonId || saved.length >= MAX_SAVED_LOADOUTS}
          className="min-h-11 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong active:scale-[0.98] disabled:opacity-40"
        >
          {savedId ? "Saved ✓" : "Save"}
        </button>
      </div>
      {saveError && <p className="mb-2 text-xs text-neg">{saveError}</p>}
      <div className="mb-2 flex flex-wrap gap-2">
        <button
          onClick={() => void share()}
          disabled={!loadout.pokemonId}
          className="min-h-11 flex-1 rounded-lg border border-line px-3 py-2.5 text-sm font-medium text-ink hover:bg-raise disabled:opacity-40"
        >
          {copied ? "Link copied ✓" : "Share build"}
        </button>
        <button
          onClick={() => dispatch({ type: "reset" })}
          className="min-h-11 rounded-lg border border-line px-3 py-2.5 text-sm font-medium text-muted hover:bg-neg/10 hover:text-neg"
        >
          Clear
        </button>
      </div>
      <p role="status" aria-live="polite" className="mb-2 min-h-4 text-xs text-muted">
        {status ?? ""}
      </p>
      <div className="mb-1 flex items-center justify-between text-xs text-faint">
        <span>Saved loadouts</span>
        <span>
          {saved.length}/{MAX_SAVED_LOADOUTS}
        </span>
      </div>
      {saved.length === 0 ? (
        <p className="text-sm text-faint">No saved loadouts yet.</p>
      ) : (
        <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
          {saved.map((s) => {
            const p = s.pokemonId ? pokemonById.get(s.pokemonId) : null;
            const highlighted = s.id === savedId || s.id === loadedId;
            return (
              <li
                id={`saved-loadout-${s.id}`}
                key={s.id}
                className={`flex min-h-11 items-center gap-2 rounded-lg border border-line-soft px-3 py-1 transition-colors ${
                  highlighted ? "bg-accent-weak ring-2 ring-accent" : ""
                }`}
              >
                {p && <img src={asset(p.iconAsset)} alt="" className="h-7 w-7 object-contain" />}
                <span className="flex-1 truncate text-sm text-ink">{s.name}</span>
                <button
                  onClick={() => {
                    loadSaved(s);
                    flashLoaded(s.id);
                    showStatus(`Loaded “${s.name}”`);
                  }}
                  className="min-h-11 min-w-11 rounded-lg px-2 text-sm font-medium text-accent-ink transition hover:bg-accent-weak active:scale-[0.98]"
                >
                  {loadedId === s.id ? "Loaded ✓" : "Load"}
                </button>
                <button
                  onClick={() => remove(s.id)}
                  className="min-h-11 min-w-11 rounded-lg px-2 text-sm text-neg hover:bg-neg/10"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </BottomSheet>
  );
}
