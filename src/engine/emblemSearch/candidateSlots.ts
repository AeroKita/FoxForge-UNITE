import type { EmblemSetBonus, EmblemSlot } from "../../types";
import type { EmblemCandidate } from "./types";

/**
 * Convert EmblemCandidates → EmblemSlot[] from the candidate fields alone.
 * This module must not import game data: the search worker loads it, and the
 * full bundle (patch JSON, zod, IndexedDB) does not belong in that graph.
 */
export function candidatesToEmblemSlots(
  candidates: EmblemCandidate[],
  _setBonuses: EmblemSetBonus[],
): EmblemSlot[] {
  return candidates.map((c) => ({
    emblem: {
      id: c.id,
      pokemonName: c.pokemonName,
      colors: [...c.colors],
      iconAsset: "",
      goldOnly: false,
      statsByGrade: {
        bronze: { ...c.stats },
        silver: { ...c.stats },
        gold: { ...c.stats },
      },
    },
    grade: c.grade,
  }));
}
