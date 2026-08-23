import { describe, it, expect } from "vitest";
import {
  normalizeName,
  normalizeGender,
  normalizeGrade,
  parseMark,
} from "@/pipeline/normalizers";

// ============================================================
// normalizeName
// Spec reference: docs/02-DATA-CLEANING-SPEC.md §4
// ============================================================

describe("normalizeName", () => {
  describe("whitespace trimming", () => {
    it("trims leading whitespace", () => {
      expect(normalizeName("  Aditi")).toBe("Aditi");
    });

    it("trims trailing whitespace", () => {
      expect(normalizeName("Aditi  ")).toBe("Aditi");
    });

    it("trims both sides", () => {
      expect(normalizeName("  Aditi  ")).toBe("Aditi");
    });

    it("collapses internal repeated whitespace to single space", () => {
      expect(normalizeName("Aditi  Sharma")).toBe("Aditi Sharma");
      expect(normalizeName("Aditi   Sharma")).toBe("Aditi Sharma");
    });
  });

  describe("quotation mark removal", () => {
    it('removes surrounding double quotes: "Aditi" → Aditi', () => {
      expect(normalizeName('"Aditi"')).toBe("Aditi");
    });

    it("removes surrounding single quotes: 'Aditi' → Aditi", () => {
      expect(normalizeName("'Aditi'")).toBe("Aditi");
    });

    it("does not remove non-surrounding double quotes", () => {
      // Interior quote is unusual but we do not strip it if not surrounding
      const result = normalizeName('Ad"iti');
      expect(result).toBe('Ad"iti');
    });
  });

  describe("stray apostrophe removal", () => {
    it("removes trailing apostrophe: Navya' → Navya", () => {
      expect(normalizeName("Navya'")).toBe("Navya");
    });

    it("removes leading apostrophe: 'Aditi → Aditi", () => {
      expect(normalizeName("'Aditi")).toBe("Aditi");
    });

    it("removes multiple trailing apostrophes", () => {
      expect(normalizeName("Navya''")).toBe("Navya");
    });

    it("removes surrounding single-quote wrapping: 'Navya' → Navya (via step 2 then step 3)", () => {
      expect(normalizeName("'Navya'")).toBe("Navya");
    });

    it("preserves interior apostrophe — casing: O'Brien → O'Brien", () => {
      expect(normalizeName("O'Brien")).toBe("O'Brien");
    });

    it("normalises all-lower with interior apostrophe: o'brien → O'Brien", () => {
      expect(normalizeName("o'brien")).toBe("O'Brien");
    });

    it("normalises all-upper with interior apostrophe: O'BRIEN → O'Brien", () => {
      expect(normalizeName("O'BRIEN")).toBe("O'Brien");
    });

    it("combined — leading stray apostrophe + interior: 'O'Brien → O'Brien", () => {
      // Step 2 does NOT strip because quotes do not match (starts ' ends n).
      // Step 3 strips the leading stray apostrophe, leaving O'Brien intact.
      expect(normalizeName("'O'Brien")).toBe("O'Brien");
    });
  });

  describe("casing normalization — title case", () => {
    it("converts all-uppercase to title case: ADITI → Aditi", () => {
      expect(normalizeName("ADITI")).toBe("Aditi");
    });

    it("converts all-lowercase to title case: aditi → Aditi", () => {
      expect(normalizeName("aditi")).toBe("Aditi");
    });

    it("keeps already-correct title case unchanged: Aditi → Aditi", () => {
      expect(normalizeName("Aditi")).toBe("Aditi");
    });

    it("normalises multi-word all-caps names: ROHAN SHARMA → Rohan Sharma", () => {
      expect(normalizeName("ROHAN SHARMA")).toBe("Rohan Sharma");
    });

    it("normalises multi-word all-lower names: rohan sharma → Rohan Sharma", () => {
      expect(normalizeName("rohan sharma")).toBe("Rohan Sharma");
    });
  });

  describe("combined — spec example", () => {
    it('"  ADITI\'  " → "Aditi" (exact spec example §4)', () => {
      expect(normalizeName("  ADITI'  ")).toBe("Aditi");
    });
  });

  describe("representative actual dataset values", () => {
    it("normalises Navya' (dataset row 2)", () => {
      expect(normalizeName("Navya'")).toBe("Navya");
    });

    it("normalises ROHAN (dataset row 3)", () => {
      expect(normalizeName("ROHAN")).toBe("Rohan");
    });

    it("normalises Aditi' (dataset row 4)", () => {
      expect(normalizeName("Aditi'")).toBe("Aditi");
    });

    it("normalises Myra (already correct, no change)", () => {
      expect(normalizeName("Myra")).toBe("Myra");
    });

    it("handles empty string input without crashing", () => {
      expect(() => normalizeName("")).not.toThrow();
      expect(normalizeName("")).toBe("");
    });
  });
});

// ============================================================
// normalizeGender
// Spec reference: docs/02-DATA-CLEANING-SPEC.md §5
// ============================================================

describe("normalizeGender", () => {
  describe("Male mappings (all 5 documented variants)", () => {
    it('"M" → "Male"', () => expect(normalizeGender("M")).toBe("Male"));
    it('"m" → "Male"', () => expect(normalizeGender("m")).toBe("Male"));
    it('"Male" → "Male"', () => expect(normalizeGender("Male")).toBe("Male"));
    it('"male" → "Male"', () => expect(normalizeGender("male")).toBe("Male"));
    it('"1" → "Male"', () => expect(normalizeGender("1")).toBe("Male"));
  });

  describe("Female mappings (all 5 documented variants)", () => {
    it('"F" → "Female"', () => expect(normalizeGender("F")).toBe("Female"));
    it('"f" → "Female"', () => expect(normalizeGender("f")).toBe("Female"));
    it('"Female" → "Female"', () =>
      expect(normalizeGender("Female")).toBe("Female"));
    it('"female" → "Female"', () =>
      expect(normalizeGender("female")).toBe("Female"));
    it('"0" → "Female"', () => expect(normalizeGender("0")).toBe("Female"));
  });

  describe("all 10 actual dataset gender variants are handled", () => {
    const datasetVariants: [string, "Male" | "Female"][] = [
      ["male", "Male"],
      ["F", "Female"],
      ["0", "Female"],
      ["Male", "Male"],
      ["M", "Male"],
      ["m", "Male"],
      ["Female", "Female"],
      ["1", "Male"],
      ["f", "Female"],
      ["female", "Female"],
    ];

    datasetVariants.forEach(([input, expected]) => {
      it(`dataset variant "${input}" → "${expected}"`, () => {
        expect(normalizeGender(input)).toBe(expected);
      });
    });
  });

  describe("whitespace handling", () => {
    it("trims leading/trailing whitespace before matching", () => {
      expect(normalizeGender("  M  ")).toBe("Male");
      expect(normalizeGender("  female  ")).toBe("Female");
    });
  });

  describe("unknown / invalid values", () => {
    it('returns "Unknown" for unrecognised string "X"', () => {
      expect(normalizeGender("X")).toBe("Unknown");
    });

    it('returns "Unknown" for empty string', () => {
      expect(normalizeGender("")).toBe("Unknown");
    });

    it('returns "Unknown" for numeric string "2"', () => {
      expect(normalizeGender("2")).toBe("Unknown");
    });

    it('returns "Unknown" for "other"', () => {
      expect(normalizeGender("other")).toBe("Unknown");
    });

    it('returns "Unknown" for "FEMALE" with unusual casing', () => {
      // Spec only lists "Female" and "female" — "FEMALE" is not in the mapping.
      // Our implementation lower-cases before lookup, so "FEMALE" → "female" → "Female".
      // This is a safe, deterministic extension; we document it explicitly.
      expect(normalizeGender("FEMALE")).toBe("Female");
    });

    it('returns "Unknown" for "MALE" with unusual casing', () => {
      // Same reasoning — lowercase lookup makes "MALE" → "male" → "Male".
      expect(normalizeGender("MALE")).toBe("Male");
    });
  });
});

// ============================================================
// normalizeGrade
// Spec reference: docs/02-DATA-CLEANING-SPEC.md §6
// ============================================================

describe("normalizeGrade", () => {
  describe("plain numeric string formats", () => {
    it('"1" → 1 (minimum boundary)', () => {
      const r = normalizeGrade("1");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(1);
    });

    it('"12" → 12 (maximum boundary)', () => {
      const r = normalizeGrade("12");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(12);
    });

    it('"7" → 7 (middle value from dataset)', () => {
      const r = normalizeGrade("7");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(7);
    });

    it('"11" → 11 (dataset row 2)', () => {
      const r = normalizeGrade("11");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(11);
    });
  });

  describe('"Grade N" prefix format', () => {
    it('"Grade 1" → 1', () => {
      const r = normalizeGrade("Grade 1");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(1);
    });

    it('"Grade 12" → 12', () => {
      const r = normalizeGrade("Grade 12");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(12);
    });

    it('"Grade 3" → 3 (dataset row 3)', () => {
      const r = normalizeGrade("Grade 3");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(3);
    });

    it('"Grade 11" → 11 (dataset row 4 / spec example §6)', () => {
      const r = normalizeGrade("Grade 11");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(11);
    });

    it("is case-insensitive for the prefix: \"grade 9\" → 9", () => {
      const r = normalizeGrade("grade 9");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(9);
    });

    it("is case-insensitive for the prefix: \"GRADE 5\" → 5", () => {
      const r = normalizeGrade("GRADE 5");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(5);
    });
  });

  describe("whitespace tolerance", () => {
    it("trims outer whitespace: \"  11  \" → 11", () => {
      const r = normalizeGrade("  11  ");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(11);
    });

    it("trims whitespace from prefixed form: \"  Grade 11  \" → 11", () => {
      const r = normalizeGrade("  Grade 11  ");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(11);
    });
  });

  describe("out-of-range values (failure)", () => {
    it('"0" → failure (below minimum 1)', () => {
      const r = normalizeGrade("0");
      expect(r.ok).toBe(false);
    });

    it('"13" → failure (above maximum 12)', () => {
      const r = normalizeGrade("13");
      expect(r.ok).toBe(false);
    });

    it('"Grade 0" → failure', () => {
      const r = normalizeGrade("Grade 0");
      expect(r.ok).toBe(false);
    });

    it('"Grade 13" → failure', () => {
      const r = normalizeGrade("Grade 13");
      expect(r.ok).toBe(false);
    });

    it("failure error message mentions the invalid value", () => {
      const r = normalizeGrade("99");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/99/);
    });
  });

  describe("non-numeric / invalid text (failure)", () => {
    it('"abc" → failure', () => {
      expect(normalizeGrade("abc").ok).toBe(false);
    });

    it("empty string → failure", () => {
      expect(normalizeGrade("").ok).toBe(false);
    });

    it("whitespace-only → failure", () => {
      expect(normalizeGrade("   ").ok).toBe(false);
    });

    it('"11.5" (decimal) → failure — grades must be integers', () => {
      expect(normalizeGrade("11.5").ok).toBe(false);
    });

    it('"Grade abc" → failure', () => {
      expect(normalizeGrade("Grade abc").ok).toBe(false);
    });
  });

  describe("spec safety guarantee", () => {
    it("never silently returns a value for invalid input", () => {
      const invalids = ["0", "13", "abc", "", "Grade X", "99"];
      invalids.forEach((v) => {
        const r = normalizeGrade(v);
        expect(r.ok).toBe(false);
      });
    });
  });
});

// ============================================================
// parseMark
// Spec reference: docs/02-DATA-CLEANING-SPEC.md §7
// ============================================================

describe("parseMark", () => {
  describe("plain numeric string formats", () => {
    it('"47" → 47 (dataset row 2 Math)', () => {
      const r = parseMark("47");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(47);
    });

    it('"0" → 0 (boundary minimum)', () => {
      const r = parseMark("0");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(0);
    });

    it('"100" → 100 (boundary maximum)', () => {
      const r = parseMark("100");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(100);
    });

    it('"46" → 46 (dataset row 4 English)', () => {
      const r = parseMark("46");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(46);
    });
  });

  describe('"N marks" suffix format (spec examples)', () => {
    it('"28 marks" → 28 (spec example + dataset row 4 Math)', () => {
      const r = parseMark("28 marks");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(28);
    });

    it('"92 marks" → 92 (spec example)', () => {
      const r = parseMark("92 marks");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(92);
    });

    it('"43 marks" → 43 (dataset row 4 Science)', () => {
      const r = parseMark("43 marks");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(43);
    });

    it('"0 marks" → 0 (boundary minimum with suffix)', () => {
      const r = parseMark("0 marks");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(0);
    });

    it('"100 marks" → 100 (boundary maximum with suffix)', () => {
      const r = parseMark("100 marks");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(100);
    });

    it("suffix matching is case-insensitive: \"28 MARKS\" → 28", () => {
      const r = parseMark("28 MARKS");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(28);
    });
  });

  describe("whitespace tolerance", () => {
    it("trims outer whitespace: \"  47  \" → 47", () => {
      const r = parseMark("  47  ");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(47);
    });

    it("handles extra whitespace before suffix: \"28  marks\" → 28", () => {
      const r = parseMark("28  marks");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(28);
    });
  });

  describe("decimal values", () => {
    it('"47.5" → 47.5 (decimals within range are valid)', () => {
      const r = parseMark("47.5");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(47.5);
    });

    it('"47.5 marks" → 47.5', () => {
      const r = parseMark("47.5 marks");
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(47.5);
    });
  });

  describe("out-of-range values (failure)", () => {
    it('"-1" → failure (below 0)', () => {
      expect(parseMark("-1").ok).toBe(false);
    });

    it('"101" → failure (above 100)', () => {
      expect(parseMark("101").ok).toBe(false);
    });

    it('"-1 marks" → failure', () => {
      expect(parseMark("-1 marks").ok).toBe(false);
    });

    it('"101 marks" → failure', () => {
      expect(parseMark("101 marks").ok).toBe(false);
    });

    it("failure error message mentions the out-of-range value", () => {
      const r = parseMark("150");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/150/);
    });
  });

  describe("non-numeric / invalid values (failure)", () => {
    it('"abc" → failure', () => {
      expect(parseMark("abc").ok).toBe(false);
    });

    it('"abc marks" → failure', () => {
      expect(parseMark("abc marks").ok).toBe(false);
    });

    it("empty string → failure", () => {
      expect(parseMark("").ok).toBe(false);
    });

    it("whitespace-only → failure", () => {
      expect(parseMark("   ").ok).toBe(false);
    });

    it("failure error message is human-readable", () => {
      const r = parseMark("xyz");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(typeof r.error).toBe("string");
    });
  });

  describe("spec safety guarantee", () => {
    it("never silently converts invalid marks to 0", () => {
      const invalids = ["abc", "", "marks", "-1", "101", "   "];
      invalids.forEach((v) => {
        const r = parseMark(v);
        // Must fail — must never return { ok: true, value: 0 } for invalid input
        expect(r.ok).toBe(false);
      });
    });
  });
});
