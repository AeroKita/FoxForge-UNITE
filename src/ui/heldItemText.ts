import { activeTierIndex } from "../engine/formulas";

const SLASH_GROUP = /\d+(?:\.\d+)?%?(?:\/\d+(?:\.\d+)?%?)+/g;
const NUMBER_TOKEN = /(?<!\d)(\d+(?:\.\d+)?)(%)?/g;

type Triple = {
  percent: boolean;
  hundredths: [number, number, number];
};

function toHundredths(raw: string): number {
  const [whole, frac = ""] = raw.split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

function formatHundredths(value: number): string {
  const rounded = Math.round(value);
  const whole = Math.trunc(rounded / 100);
  const frac = Math.abs(rounded % 100);
  if (frac === 0) return String(whole);
  if (frac % 10 === 0) return `${whole}.${frac / 10}`;
  return `${whole}.${String(frac).padStart(2, "0")}`;
}

function triplesFrom(advanced: string): Triple[] {
  const triples: Triple[] = [];
  for (const match of advanced.matchAll(SLASH_GROUP)) {
    const parts = match[0].split("/");
    if (parts.length !== 3) continue;
    triples.push({
      percent: parts.some((part) => part.endsWith("%")),
      hundredths: parts.map((part) => toHundredths(part.replace(/%$/, ""))) as [
        number,
        number,
        number,
      ],
    });
  }
  return triples;
}

/**
 * Basic held-item copy is the grade-20 in-game sentence. Swap each grade-20
 * effect number for the 1 / 10 / 20 tier that matches `grade`. Grades 20–40
 * keep the archived sentence. Advanced stays the UNITE-DB slash text.
 *
 * ponytail: k=2 only — Accel Bracer and Drive Lens quote the KO bonus, two
 * stacks of the per-stack tier. Another multiple needs a roster check.
 */
export function heldItemDescription(
  item: { description: string; descriptionAdvanced?: string },
  grade: number,
  advanced: boolean,
): string {
  if (advanced && item.descriptionAdvanced) return item.descriptionAdvanced;
  const advancedText = item.descriptionAdvanced;
  if (!advancedText) return item.description;
  const index = activeTierIndex(grade);
  if (index === 2) return item.description;

  const triples = triplesFrom(advancedText);
  const replacements: { start: number; end: number; text: string }[] = [];
  for (const match of item.description.matchAll(NUMBER_TOKEN)) {
    const percent = Boolean(match[2]);
    const value = toHundredths(match[1]);
    let chosen: { k: number; triple: Triple } | null = null;
    let conflict = false;
    for (const triple of triples) {
      if (triple.percent !== percent) continue;
      const grade20 = triple.hundredths[2];
      if (grade20 === 0 || value % grade20 !== 0) continue;
      const k = value / grade20;
      if (k !== 1 && k !== 2) continue;
      if (!chosen || k < chosen.k) {
        chosen = { k, triple };
        conflict = false;
      } else if (k === chosen.k && triple.hundredths[index] !== chosen.triple.hundredths[index]) {
        conflict = true;
      }
    }
    if (!chosen || conflict) continue;
    const start = match.index ?? 0;
    replacements.push({
      start,
      end: start + match[0].length,
      text: formatHundredths(chosen.k * chosen.triple.hundredths[index]) + (percent ? "%" : ""),
    });
  }

  let text = item.description;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    text = text.slice(0, replacement.start) + replacement.text + text.slice(replacement.end);
  }
  return text;
}
