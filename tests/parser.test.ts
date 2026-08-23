import { describe, it, expect } from "vitest";
import { parseCsv } from "@/pipeline/parser";
import { validateSchema, canonicaliseColumnName, REQUIRED_COLUMNS } from "@/pipeline/validator";

// ============================================================
// Helpers — minimal CSV builders for test fixtures
// ============================================================

const VALID_HEADER = "Name,Gender,Grade,Math,Science,English,Total";

function makeRow(
  name = "Navya",
  gender = "male",
  grade = "11",
  math = "47",
  science = "63",
  english = "74",
  total = "184"
): string {
  return `${name},${gender},${grade},${math},${science},${english},${total}`;
}

function makeCsv(...rows: string[]): string {
  return [VALID_HEADER, ...rows].join("\n");
}

// ============================================================
// parseCsv — basic structure tests
// ============================================================

describe("parseCsv", () => {
  describe("empty / blank input", () => {
    it("returns failure for empty string", () => {
      const result = parseCsv("");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/empty/i);
      }
    });

    it("returns failure for whitespace-only string", () => {
      const result = parseCsv("   \n  \t  ");
      expect(result.ok).toBe(false);
    });

    it("returns failure for header-only CSV (zero data rows)", () => {
      const result = parseCsv(VALID_HEADER);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/no data rows/i);
      }
    });
  });

  describe("valid CSV", () => {
    it("returns success with correct row count", () => {
      const csv = makeCsv(makeRow(), makeRow("Rohit", "M", "Grade 3", "16", "77", "8", "101"));
      const result = parseCsv(csv);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.rowCount).toBe(2);
      }
    });

    it("returns the expected 7 columns from the valid header", () => {
      const result = parseCsv(makeCsv(makeRow()));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.columns).toEqual(REQUIRED_COLUMNS);
      }
    });

    it("returns raw string values — does not coerce types", () => {
      const csv = makeCsv(makeRow("Navya'", "male", "11", "47", "63", "74", "184"));
      const result = parseCsv(csv);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const row = result.rows[0];
        // All values must remain as strings at this stage
        expect(typeof row["Math"]).toBe("string");
        expect(typeof row["Grade"]).toBe("string");
        expect(typeof row["Total"]).toBe("string");
      }
    });

    it("trims cell values", () => {
      const csv = `${VALID_HEADER}\n  Navya  ,  male  ,  11  ,  47  ,  63  ,  74  ,  184  `;
      const result = parseCsv(csv);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.rows[0]["Name"]).toBe("Navya");
        expect(result.rows[0]["Gender"]).toBe("male");
      }
    });

    it("trims column header whitespace", () => {
      const csv = `  Name  ,  Gender  ,  Grade  ,  Math  ,  Science  ,  English  ,  Total  \n${makeRow()}`;
      const result = parseCsv(csv);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.columns).toContain("Name");
        expect(result.columns).toContain("Gender");
      }
    });
  });

  describe("representative values from data/students.csv", () => {
    it("parses names with trailing apostrophe (Navya')", () => {
      const csv = makeCsv(makeRow("Navya'"));
      const result = parseCsv(csv);
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Raw value is preserved — normalization is Phase 2
        expect(result.rows[0]["Name"]).toBe("Navya'");
      }
    });

    it("parses all-caps name (ROHAN)", () => {
      const csv = makeCsv(makeRow("ROHAN", "F", "Grade 3", "16", "77", "8", "101"));
      const result = parseCsv(csv);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.rows[0]["Name"]).toBe("ROHAN");
      }
    });

    it("parses marks with text suffix ('28 marks')", () => {
      const csv = makeCsv(makeRow("Aditi'", "0", "Grade 11", "28 marks", "43 marks", "46", "117"));
      const result = parseCsv(csv);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.rows[0]["Math"]).toBe("28 marks");
        expect(result.rows[0]["Science"]).toBe("43 marks");
      }
    });

    it("parses grade with 'Grade N' prefix format", () => {
      const csv = makeCsv(makeRow("Test", "F", "Grade 11", "50", "50", "50", "150"));
      const result = parseCsv(csv);
      expect(result.ok).toBe(true);
      if (result.ok) {
        // Raw value preserved — normalization is Phase 2
        expect(result.rows[0]["Grade"]).toBe("Grade 11");
      }
    });

    it("parses all known gender representations without error", () => {
      const genders = ["male", "Female", "M", "m", "F", "f", "Male", "female", "1", "0"];
      const rows = genders.map((g) => makeRow("Test", g));
      const csv = makeCsv(...rows);
      const result = parseCsv(csv);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.rowCount).toBe(genders.length);
        const parsedGenders = result.rows.map((r) => r["Gender"]);
        expect(parsedGenders).toEqual(genders);
      }
    });
  });

  describe("extra columns", () => {
    it("accepts CSV with extra columns beyond the required seven", () => {
      const csv = `Name,Gender,Grade,Math,Science,English,Total,ExtraColumn\n${makeRow()},extra_value`;
      const result = parseCsv(csv);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.columns).toContain("ExtraColumn");
        expect(result.rows[0]["ExtraColumn"]).toBe("extra_value");
      }
    });
  });

  describe("malformed / problematic input", () => {
    it("handles a non-CSV text string without crashing", () => {
      // Papa Parse is lenient — it may or may not parse this as data rows.
      // The contract is: parseCsv never throws.
      expect(() => parseCsv("this is just plain text, not a proper csv")).not.toThrow();
    });

    it("handles mismatched column counts without crashing", () => {
      // Row with too few fields — Papa Parse still parses, missing fields become empty strings.
      const csv = `${VALID_HEADER}\nNavya,male`;
      expect(() => parseCsv(csv)).not.toThrow();
    });
  });
});

// ============================================================
// validateSchema
// ============================================================

describe("validateSchema", () => {
  describe("valid schema", () => {
    it("returns ok:true when all 7 required columns are present", () => {
      const result = validateSchema([...REQUIRED_COLUMNS]);
      expect(result.ok).toBe(true);
    });

    it("accepts extra columns beyond the required seven", () => {
      const result = validateSchema([...REQUIRED_COLUMNS, "ExtraColumn", "AnotherExtra"]);
      expect(result.ok).toBe(true);
    });

    it("is case-insensitive for column matching", () => {
      const lowercased = REQUIRED_COLUMNS.map((c) => c.toLowerCase());
      const result = validateSchema(lowercased);
      expect(result.ok).toBe(true);
    });

    it("is case-insensitive for UPPERCASE column names", () => {
      const uppercased = REQUIRED_COLUMNS.map((c) => c.toUpperCase());
      const result = validateSchema(uppercased);
      expect(result.ok).toBe(true);
    });

    it("accepts mixed-case column names", () => {
      const mixed = ["NAME", "gender", "Grade", "MATH", "science", "English", "total"];
      const result = validateSchema(mixed);
      expect(result.ok).toBe(true);
    });
  });

  describe("missing columns", () => {
    it("returns ok:false when all columns are missing", () => {
      const result = validateSchema([]);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.missing.length).toBe(REQUIRED_COLUMNS.length);
        expect(result.error).toMatch(/missing/i);
      }
    });

    it("returns ok:false when a single required column is missing (Math)", () => {
      const cols = REQUIRED_COLUMNS.filter((c) => c !== "Math");
      const result = validateSchema([...cols]);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.missing).toContain("Math");
        expect(result.missing).toHaveLength(1);
      }
    });

    it("returns ok:false when multiple required columns are missing", () => {
      const result = validateSchema(["Name", "Gender"]);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.missing).toContain("Grade");
        expect(result.missing).toContain("Math");
        expect(result.missing).toContain("Science");
        expect(result.missing).toContain("English");
        expect(result.missing).toContain("Total");
      }
    });

    it("reports found columns accurately", () => {
      const found = ["Name", "Gender", "Grade"];
      const result = validateSchema(found);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.found).toEqual(found);
      }
    });

    it("produces a human-readable error message listing missing columns", () => {
      const result = validateSchema(["Name"]);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/Gender/);
        expect(result.error).toMatch(/Math/);
      }
    });

    it("does NOT silently create missing required columns", () => {
      const result = validateSchema(["Name"]);
      // Spec requirement: "Do not silently create missing required columns."
      // The result must be a failure, never a success with invented columns.
      expect(result.ok).toBe(false);
    });
  });

  describe("empty dataset / header-only round-trip", () => {
    it("parseCsv of header-only + validateSchema returns failure at parse stage", () => {
      // Header-only CSV — parseCsv should fail before we even reach validateSchema
      const parseResult = parseCsv(VALID_HEADER);
      expect(parseResult.ok).toBe(false);
    });
  });
});

// ============================================================
// canonicaliseColumnName
// ============================================================

describe("canonicaliseColumnName", () => {
  it("maps 'Name' → 'Name'", () => {
    expect(canonicaliseColumnName("Name")).toBe("Name");
  });

  it("maps lowercase 'total' → 'Total'", () => {
    expect(canonicaliseColumnName("total")).toBe("Total");
  });

  it("maps all-caps 'MATH' → 'Math'", () => {
    expect(canonicaliseColumnName("MATH")).toBe("Math");
  });

  it("returns null for an unknown column name", () => {
    expect(canonicaliseColumnName("Age")).toBeNull();
    expect(canonicaliseColumnName("")).toBeNull();
    expect(canonicaliseColumnName("  ")).toBeNull();
  });

  it("trims whitespace before matching", () => {
    expect(canonicaliseColumnName("  English  ")).toBe("English");
  });
});
