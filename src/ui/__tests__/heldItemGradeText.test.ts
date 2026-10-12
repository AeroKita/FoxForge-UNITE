import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { heldItems } from "../../data/gameData";
import { itemTip } from "../../components/tips";
import { HeldItemDetailBody } from "../heldItemDetail";
import type { HeldItem } from "../../types";

function item(id: string): HeldItem {
  const found = heldItems.find((held) => held.id === id);
  if (!found) throw new Error(`missing held item ${id}`);
  return found;
}

function body(id: string, grade: number, advanced = false): string {
  return renderToStaticMarkup(HeldItemDetailBody({ item: item(id), grade, advanced }))
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "");
}

/** Grade-10 Basic phrase. Grades 20–40 keep the archived sentence. */
const GRADE_10: Record<string, string> = {
  "accel-bracer": "Attack by 0.9%",
  "aeos-cookie": "increases by 150.",
  "amulet-coin": "increase by 80% and goal-scoring speed will increase by 10%",
  "assault-vest":
    "for 15 seconds, it is granted a shield that nullifies Sp. Atk damage equal to 15%",
  "attack-weight": "increases by 9.",
  "big-root": "recovery by 15%",
  "buddy-barrier": "equal to 20% of the holder's max HP",
  "choice-scarf": "increase by 35%",
  "curse-bangle": "weakened by 25%",
  "curse-incense": "weakened by 25%",
  "drain-crown": "equal to 12%",
  "drive-lens": "Sp. Atk by 0.9%",
  "energy-amplifier": "increased by 14%",
  "exp-share": "gains 4 more",
  "float-stone": "speed by 15%",
  "focus-band": "recovers 9%",
  leftovers: "recovers 3%",
  "muscle-band": "increased by 2%",
  "rapid-fire-scarf": "speed by 20%",
  "razor-claw": "minimum of 15 damage",
  "rescue-hood": "recovery effect by 20% and shield effect by 20%",
  "rocky-helmet": "equal to 2.2%",
  "score-shield": "equal to 7.5%",
  "shell-bell": "minimum of 65 HP",
  "slick-spoon": "ignore 12%",
  "sp--atk-specs": "increases by 12.",
  "tenacity-belt": "increased by 20% for 3 seconds",
  "vanguard-bell": "restores 8%",
  "weakness-policy": "minimum of 2% when",
  "wise-glasses": "by 5%",
};

describe("Basic held-item text at the selected grade", () => {
  it("shows Tenacity Belt's grade-10 percent on the detail card and the tooltip", () => {
    expect(body("tenacity-belt", 10)).toContain("increased by 20% for 3 seconds");
    expect(body("tenacity-belt", 10)).not.toContain("28%");
    const tip = renderToStaticMarkup(itemTip(item("tenacity-belt"), 10, false));
    expect(tip).toContain("increased by 20%");
    expect(tip).not.toContain("28%");
  });

  it("keeps the grade-20 sentence at grades 20 and 40, and the lower tier below 10", () => {
    expect(body("tenacity-belt", 1)).toContain("increased by 12% for 3 seconds");
    expect(body("tenacity-belt", 9)).toContain("increased by 12% for 3 seconds");
    expect(body("tenacity-belt", 19)).toContain("increased by 20% for 3 seconds");
    expect(body("tenacity-belt", 20)).toContain(item("tenacity-belt").description);
    expect(body("tenacity-belt", 40)).toContain(item("tenacity-belt").description);
  });

  it("fills the grade-10 number for every scaling held item and leaves the other words", () => {
    for (const [id, phrase] of Object.entries(GRADE_10)) {
      expect(body(id, 10), id).toContain(phrase);
    }
  });

  it("leaves Basic sentences that do not quote a grade-20 tier", () => {
    for (const id of [
      "scope-lens",
      "choice-specs",
      "charging-charm",
      "resonant-guard",
      "rusted-sword",
    ]) {
      expect(body(id, 10), id).toContain(item(id).description);
    }
  });

  it("keeps the slash-form Advanced sentence", () => {
    expect(body("tenacity-belt", 10, true)).toContain("12/20/28%");
    expect(body("tenacity-belt", 10, true)).toContain("Def. & Sp. Def.");
  });
});
