import { describe, it, expect } from "vitest";
import { LEGAL_DATA_ATTRIBUTION } from "../brand";

describe("Legal data attribution", () => {
  it("credits Unite-DB and in-game text, not Serebii", () => {
    expect(LEGAL_DATA_ATTRIBUTION).toContain("Some data from the amazing Unite-DB team");
    expect(LEGAL_DATA_ATTRIBUTION).not.toContain("Most data is from");
    expect(LEGAL_DATA_ATTRIBUTION).toContain("All values verified against official in-game text");
    expect(LEGAL_DATA_ATTRIBUTION).toContain("Attack-speed model from Mathcord");
    expect(LEGAL_DATA_ATTRIBUTION).not.toMatch(/serebii/i);
    expect(LEGAL_DATA_ATTRIBUTION).not.toMatch(/game8/i);
    expect(LEGAL_DATA_ATTRIBUTION).not.toContain("Some values verified");
  });
});
