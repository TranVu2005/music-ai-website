import { describe, expect, it } from "vitest";
import { buildTrackSearchText, normalizeSearch } from "../../../src/lib/search/normalize";

describe("normalizeSearch", () => {
  it("strips Vietnamese vowel marks and lowercases mixed case", () => {
    expect(normalizeSearch("TiẾnG SáO ĐÊM ĐÔNG")).toBe("tieng sao dem dong");
  });

  it("maps Vietnamese d and both eth variants to d", () => {
    expect(normalizeSearch("đ Đ ð Ð Ðêm")).toBe("d d d d dem");
  });

  it("collapses all whitespace and trims the result", () => {
    expect(normalizeSearch(" \tĐêm\n\n Đông   Hà Nội\r ")).toBe("dem dong ha noi");
  });

  it("returns empty for empty and whitespace-only input", () => {
    expect(normalizeSearch("")).toBe("");
    expect(normalizeSearch(" \t\n ")).toBe("");
  });

  it("is idempotent", () => {
    for (const input of ["Đêm Đông", "Ðêm ðông", "  Tiếng\tsáo  ", "", "100%_\\"]) {
      expect(normalizeSearch(normalizeSearch(input))).toBe(normalizeSearch(input));
    }
  });
});

describe("buildTrackSearchText", () => {
  it("normalizes title and description together", () => {
    expect(buildTrackSearchText("Đêm Đông", "Tiếng sáo êm dịu")).toBe(
      "dem dong tieng sao em diu"
    );
  });

  it("handles a null description", () => {
    expect(buildTrackSearchText("Ðêm Đông", null)).toBe("dem dong");
  });
});
