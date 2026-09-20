import { describe, expect, it } from "vitest";
import { partitionHeldPickerItems, type HeldPickRow } from "../heldPicker";

const rows: HeldPickRow[] = [
  { id: "attack-weight", name: "Attack Weight" },
  { id: "charizardite-x", name: "Charizardite X" },
  { id: "lucarionite", name: "Lucarionite" },
  { id: "muscle-band", name: "Muscle Band" },
  { id: "rusted-sword", name: "Rusted Sword" },
];

describe("partitionHeldPickerItems", () => {
  it("keeps graded items in the main list and unique items in their own group", () => {
    const { regular, unique } = partitionHeldPickerItems(rows, (id) =>
      ["charizardite-x", "lucarionite", "rusted-sword"].includes(id),
    );
    expect(regular.map((r) => r.id)).toEqual(["attack-weight", "muscle-band"]);
    expect(unique.map((r) => r.id)).toEqual(["charizardite-x", "lucarionite", "rusted-sword"]);
  });

  it("marks unique rows disabled so the picker cannot select them", () => {
    const { unique } = partitionHeldPickerItems(rows, (id) => id === "lucarionite");
    expect(unique).toEqual([
      { id: "lucarionite", name: "Lucarionite", disabled: true, group: "unique" },
    ]);
  });

  it("leaves regular rows selectable", () => {
    const { regular } = partitionHeldPickerItems(rows, (id) => id === "lucarionite");
    expect(regular.every((r) => !r.disabled)).toBe(true);
  });
});
