import { describe, expect, it } from "vitest";
import { diffReleaseRows } from "./release-diff";

describe("diffReleaseRows", () => {
  it("separates added, changed, and removed rows by stable external key", () => {
    const result = diffReleaseRows(
      [{ externalKey: "a", name: "A", value: 1 }, { externalKey: "b", name: "B", value: 2 }],
      [{ externalKey: "a", name: "A", value: 3 }, { externalKey: "c", name: "C", value: 4 }],
    );
    expect(result).toEqual({ added: [{ externalKey: "c", name: "C" }], changed: [{ externalKey: "a", name: "A" }], removed: [{ externalKey: "b", name: "B" }] });
  });
});
