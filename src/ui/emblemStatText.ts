import type { Emblem, EmblemGrade } from "../types";
import { statLines, type StatLine } from "./format";

const lineCache = new Map<string, StatLine[]>();
const subtitleCache = new Map<string, string>();

function gradeKey(grade: EmblemGrade): "bronze" | "silver" | "gold" {
  return grade === "platinum" ? "gold" : grade;
}

/** Stat lines for one emblem grade. Later calls with the same id and grade reuse the first format. */
export function emblemGradeStatLines(
  emblem: Emblem,
  grade: EmblemGrade,
  precise = false,
): StatLine[] {
  const key = `${emblem.id}\0${gradeKey(grade)}\0${precise ? "p" : "r"}`;
  const hit = lineCache.get(key);
  if (hit) return hit;
  const lines = statLines(emblem.statsByGrade[gradeKey(grade)], precise);
  lineCache.set(key, lines);
  return lines;
}

/** One-line subtitle for an emblem tile. Unchanged tiles reuse the cached string. */
export function emblemGradeSubtitle(emblem: Emblem, grade: EmblemGrade, precise = true): string {
  const key = `${emblem.id}\0${gradeKey(grade)}\0${precise ? "p" : "r"}\0sub`;
  const hit = subtitleCache.get(key);
  if (hit !== undefined) return hit;
  const text =
    emblemGradeStatLines(emblem, grade, precise)
      .map((l) => `${l.label} ${l.value}`)
      .join(" · ") || "—";
  subtitleCache.set(key, text);
  return text;
}
