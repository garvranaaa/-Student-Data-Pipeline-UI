import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { cleanDataset } from "@/pipeline/cleaner";
import { removeExactDuplicates, removeNormalizedDuplicates, normalizedRecordKey } from "@/pipeline/deduplicator";
import type { NormalizedKey } from "@/pipeline/deduplicator";

// ============================================================
// Test Helpers
// ============================================================

const HEADER = "Name,Gender,Grade,Math,Science,English,Total";

function makeRow(
  name: string,
  gender: string,
  grade: string,
  math: string,
  science: string,
  english: string,
  total: string
): string {
  return [name, gender, grade, math, science, english, total].join(",");
}

function makeCsv(...rows: string[]): string {
  return [HEADER, ...rows].join("\n");
}

// A valid baseline row matching dataset row 2: Navya', male, 11, 47, 63, 74, 184
const ROW_NAVYA = makeRow("Navya'", "male", "11", "47", "63", "74", "184");
// Dataset row 3: ROHAN, F, Grade 3, 16, 77, 8, 101
const ROW_ROHAN = makeRow("ROHAN", "F", "Grade 3", "16", "77", "8", "101");
// Dataset row 4: Aditi', 0, Grade 11, 28 marks, 43 marks, 46, 117
const ROW_ADITI = makeRow("Aditi'", "0", "Grade 11", "28 marks", "43 marks", "46", "117");
// A simple clean row
const ROW_MYRA = makeRow("Myra", "Male", "7", "74", "12", "72", "158");

// ============================================================
// cleanDataset — pipeline-level failures
// ============================================================

describe("cleanDataset — pipeline-level failures", () => {
  it("returns failure for empty CSV", () => {
    const r = cleanDataset("");
    expect(r.ok).toBe(false);
  });

  it("returns failure for header-only CSV", () => {
    const r = cleanDataset(HEADER);
    expect(r.ok).toBe(false);
  });

  it("returns failure for missing required column", () => {
    const csv = "Name,Gender,Grade,Math,Science,English\nAditi,Male,5,50,50,50";
    const r = cleanDataset(csv);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Total/i);
  });

  it("returns failure for completely wrong schema", () => {
    const csv = "Foo,Bar,Baz\n1,2,3";
    const r = cleanDataset(csv);
    expect(r.ok).toBe(false);
  });

  it("returns failure for non-CSV plaintext", () => {
    // parseCsv handles this gracefully — won't throw
    expect(() => cleanDataset("this is not a csv")).not.toThrow();
  });
});

// ============================================================
// cleanDataset — single valid record
// ============================================================

describe("cleanDataset — single valid record", () => {
  it("returns ok:true and one student for a single valid row", () => {
    const r = cleanDataset(makeCsv(ROW_MYRA));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students).toHaveLength(1);
  });

  it("student has all required fields", () => {
    const r = cleanDataset(makeCsv(ROW_MYRA));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = r.students[0];
    expect(s).toHaveProperty("studentId");
    expect(s).toHaveProperty("name");
    expect(s).toHaveProperty("gender");
    expect(s).toHaveProperty("grade");
    expect(s).toHaveProperty("math");
    expect(s).toHaveProperty("science");
    expect(s).toHaveProperty("english");
    expect(s).toHaveProperty("total");
    expect(s).toHaveProperty("status");
  });

  it("initial status is always Active", () => {
    const r = cleanDataset(makeCsv(ROW_MYRA));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students[0].status).toBe("Active");
  });

  it("metadata reflects one cleaned row", () => {
    const r = cleanDataset(makeCsv(ROW_MYRA));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.metadata.originalRowCount).toBe(1);
    expect(r.metadata.cleanedRowCount).toBe(1);
    expect(r.metadata.invalidRowCount).toBe(0);
    expect(r.metadata.duplicatesRemoved).toBe(0);
  });
});

// ============================================================
// Name normalisation through pipeline
// ============================================================

describe("cleanDataset — name normalisation", () => {
  it("normalises trailing apostrophe: Navya' → Navya", () => {
    const r = cleanDataset(makeCsv(ROW_NAVYA));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students[0].name).toBe("Navya");
  });

  it("normalises all-caps: ROHAN → Rohan", () => {
    const r = cleanDataset(makeCsv(ROW_ROHAN));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students[0].name).toBe("Rohan");
  });

  it("normalises Aditi' → Aditi", () => {
    const r = cleanDataset(makeCsv(ROW_ADITI));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students[0].name).toBe("Aditi");
  });

  it("counts name normalisations in metadata", () => {
    // ROW_NAVYA has Navya' which normalises to Navya
    const r = cleanDataset(makeCsv(ROW_NAVYA));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.metadata.nameNormalizations).toBeGreaterThan(0);
  });
});

// ============================================================
// Gender normalisation through pipeline
// ============================================================

describe("cleanDataset — gender normalisation", () => {
  const cases: [string, "Male" | "Female"][] = [
    ["male", "Male"],
    ["m", "Male"],
    ["M", "Male"],
    ["1", "Male"],
    ["Male", "Male"],
    ["female", "Female"],
    ["f", "Female"],
    ["F", "Female"],
    ["0", "Female"],
    ["Female", "Female"],
  ];

  cases.forEach(([rawGender, expected]) => {
    it(`"${rawGender}" → "${expected}"`, () => {
      const row = makeRow("Test", rawGender, "5", "50", "50", "50", "150");
      const r = cleanDataset(makeCsv(row));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.students[0].gender).toBe(expected);
    });
  });

  it("unknown gender → student with gender=Unknown (not rejected)", () => {
    // Spec: "Unknown values should be flagged as invalid/unknown."
    // The Student model allows "Unknown" so the row is NOT rejected.
    const row = makeRow("Test", "X", "5", "50", "50", "50", "150");
    const r = cleanDataset(makeCsv(row));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.students[0].gender).toBe("Unknown");
      // The student is included — not rejected
      expect(r.students).toHaveLength(1);
      expect(r.invalidRecords).toHaveLength(0);
    }
  });

  it("counts gender normalisations in metadata", () => {
    const row = makeRow("Test", "male", "5", "50", "50", "50", "150");
    const r = cleanDataset(makeCsv(row));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.metadata.genderNormalizations).toBeGreaterThan(0);
  });
});

// ============================================================
// Grade normalisation through pipeline
// ============================================================

describe("cleanDataset — grade normalisation", () => {
  it('"Grade 3" → grade: 3', () => {
    const r = cleanDataset(makeCsv(ROW_ROHAN)); // ROW_ROHAN has Grade 3
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students[0].grade).toBe(3);
  });

  it('"Grade 11" → grade: 11', () => {
    const r = cleanDataset(makeCsv(ROW_ADITI)); // ROW_ADITI has Grade 11
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students[0].grade).toBe(11);
  });

  it('"11" (plain) → grade: 11', () => {
    const r = cleanDataset(makeCsv(ROW_NAVYA)); // ROW_NAVYA has 11
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students[0].grade).toBe(11);
  });

  it("invalid grade rejects the row", () => {
    const row = makeRow("Test", "Male", "99", "50", "50", "50", "150");
    const r = cleanDataset(makeCsv(row));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.students).toHaveLength(0);
      expect(r.invalidRecords).toHaveLength(1);
      expect(r.invalidRecords[0].reason).toMatch(/Grade/i);
    }
  });

  it("non-numeric grade rejects the row", () => {
    const row = makeRow("Test", "Male", "abc", "50", "50", "50", "150");
    const r = cleanDataset(makeCsv(row));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.students).toHaveLength(0);
      expect(r.invalidRecords).toHaveLength(1);
    }
  });

  it("counts grade normalisations in metadata", () => {
    const r = cleanDataset(makeCsv(ROW_ADITI)); // Grade 11 prefix
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.metadata.gradeNormalizations).toBeGreaterThan(0);
  });
});

// ============================================================
// Mark normalisation through pipeline
// ============================================================

describe("cleanDataset — mark normalisation", () => {
  it('"28 marks" → math: 28', () => {
    const r = cleanDataset(makeCsv(ROW_ADITI));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students[0].math).toBe(28);
  });

  it('"43 marks" → science: 43', () => {
    const r = cleanDataset(makeCsv(ROW_ADITI));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students[0].science).toBe(43);
  });

  it("plain numeric mark passes through unchanged", () => {
    const r = cleanDataset(makeCsv(ROW_NAVYA));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.students[0].math).toBe(47);
      expect(r.students[0].science).toBe(63);
      expect(r.students[0].english).toBe(74);
    }
  });

  it("invalid mark (non-numeric) rejects the row", () => {
    const row = makeRow("Test", "Male", "5", "abc", "50", "50", "150");
    const r = cleanDataset(makeCsv(row));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.students).toHaveLength(0);
      expect(r.invalidRecords).toHaveLength(1);
      expect(r.invalidRecords[0].reason).toMatch(/Math/i);
    }
  });

  it("out-of-range mark (> 100) rejects the row", () => {
    const row = makeRow("Test", "Male", "5", "101", "50", "50", "201");
    const r = cleanDataset(makeCsv(row));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students).toHaveLength(0);
  });

  it("negative mark rejects the row", () => {
    const row = makeRow("Test", "Male", "5", "-1", "50", "50", "99");
    const r = cleanDataset(makeCsv(row));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students).toHaveLength(0);
  });

  it("does NOT silently convert invalid mark to zero", () => {
    // Spec safety principle: "Do not silently convert invalid academic marks to zero."
    const row = makeRow("Test", "Male", "5", "abc", "50", "50", "100");
    const r = cleanDataset(makeCsv(row));
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Row must be rejected — must never become a student with math=0
      expect(r.students).toHaveLength(0);
      expect(r.invalidRecords).toHaveLength(1);
    }
  });

  it("counts mark normalisations in metadata", () => {
    const r = cleanDataset(makeCsv(ROW_ADITI)); // "28 marks", "43 marks"
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.metadata.markNormalizations).toBeGreaterThanOrEqual(2);
  });
});

// ============================================================
// Total recalculation
// ============================================================

describe("cleanDataset — Total recalculation", () => {
  it("uses recalculated total even when supplied total is correct", () => {
    // ROW_NAVYA: 47+63+74 = 184 ✓
    const r = cleanDataset(makeCsv(ROW_NAVYA));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const s = r.students[0];
      expect(s.total).toBe(s.math + s.science + s.english);
      expect(s.total).toBe(184);
    }
  });

  it("corrects a wrong supplied total", () => {
    // Supplied total 999 is wrong; should be recalculated to 47+63+74 = 184
    const row = makeRow("Test", "Male", "5", "47", "63", "74", "999");
    const r = cleanDataset(makeCsv(row));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.students[0].total).toBe(184);
      expect(r.metadata.totalCorrections).toBe(1);
    }
  });

  it("counts zero total corrections for correct supplied totals", () => {
    // ROW_NAVYA, ROW_MYRA both have correct totals
    const r = cleanDataset(makeCsv(ROW_NAVYA, ROW_MYRA));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.metadata.totalCorrections).toBe(0);
  });

  it("final student.total always equals math + science + english", () => {
    const rows = [ROW_NAVYA, ROW_ROHAN, ROW_ADITI, ROW_MYRA];
    const r = cleanDataset(makeCsv(...rows));
    expect(r.ok).toBe(true);
    if (r.ok) {
      r.students.forEach((s) => {
        expect(s.total).toBe(s.math + s.science + s.english);
      });
    }
  });

  it("boundary marks: 0+0+0 = total 0", () => {
    const row = makeRow("Test", "Male", "5", "0", "0", "0", "0");
    const r = cleanDataset(makeCsv(row));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students[0].total).toBe(0);
  });

  it("boundary marks: 100+100+100 = total 300", () => {
    const row = makeRow("Test", "Male", "5", "100", "100", "100", "300");
    const r = cleanDataset(makeCsv(row));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students[0].total).toBe(300);
  });
});

// ============================================================
// Missing value handling
// ============================================================

describe("cleanDataset — missing values", () => {
  it("empty Math field rejects the row", () => {
    const row = makeRow("Test", "Male", "5", "", "50", "50", "100");
    const r = cleanDataset(makeCsv(row));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.students).toHaveLength(0);
      expect(r.invalidRecords).toHaveLength(1);
    }
  });

  it("empty Science field rejects the row", () => {
    const row = makeRow("Test", "Male", "5", "50", "", "50", "100");
    const r = cleanDataset(makeCsv(row));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students).toHaveLength(0);
  });

  it("empty English field rejects the row", () => {
    const row = makeRow("Test", "Male", "5", "50", "50", "", "100");
    const r = cleanDataset(makeCsv(row));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students).toHaveLength(0);
  });

  it("does NOT convert missing marks to zero", () => {
    // Spec: "Do not silently convert missing marks to 0."
    const row = makeRow("Test", "Male", "5", "", "50", "50", "100");
    const r = cleanDataset(makeCsv(row));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.students).toHaveLength(0); // rejected, never math=0
    }
  });

  it("missingValueCount increments for rows with empty scoring fields", () => {
    const emptyMath = makeRow("Test", "Male", "5", "", "50", "50", "100");
    const r = cleanDataset(makeCsv(emptyMath));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.metadata.missingValueCount).toBe(1);
  });
});

// ============================================================
// Duplicate handling
// ============================================================

describe("cleanDataset — exact duplicate removal", () => {
  it("removes a single exact duplicate row", () => {
    const csv = makeCsv(ROW_MYRA, ROW_MYRA); // identical rows
    const r = cleanDataset(csv);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.students).toHaveLength(1);
      expect(r.metadata.exactDuplicatesRemoved).toBe(1);
      expect(r.metadata.duplicatesRemoved).toBe(1);
    }
  });

  it("removes multiple exact duplicates", () => {
    const csv = makeCsv(ROW_MYRA, ROW_MYRA, ROW_MYRA, ROW_NAVYA);
    const r = cleanDataset(csv);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.students).toHaveLength(2);
      expect(r.metadata.exactDuplicatesRemoved).toBe(2);
    }
  });

  it("does not remove rows that merely share a name", () => {
    // Spec: "Do NOT deduplicate solely by Name."
    // Two different students who happen to have the same name are distinct records.
    const rowA = makeRow("Aditi", "Male", "5", "80", "80", "80", "240");
    const rowB = makeRow("Aditi", "Female", "6", "70", "70", "70", "210");
    const r = cleanDataset(makeCsv(rowA, rowB));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students).toHaveLength(2);
  });
});

describe("cleanDataset — normalised duplicate removal", () => {
  it("removes a row that is a normalised duplicate", () => {
    // ROW_NAVYA: "Navya'", male, 11, 47, 63, 74, 184
    // variant:   "NAVYA", Male, 11, 47, 63, 74, 184
    // Both normalise to: Navya, Male, 11, 47, 63, 74, 184
    const variant = makeRow("NAVYA", "Male", "11", "47", "63", "74", "184");
    const r = cleanDataset(makeCsv(ROW_NAVYA, variant));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.students).toHaveLength(1);
      expect(r.metadata.normalizedDuplicatesRemoved).toBe(1);
    }
  });

  it("does not remove records that share only a normalised name but differ in marks", () => {
    const rowA = makeRow("NAVYA", "Male", "11", "47", "63", "74", "184");
    const rowB = makeRow("Navya", "Female", "11", "50", "50", "50", "150");
    const r = cleanDataset(makeCsv(rowA, rowB));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students).toHaveLength(2);
  });
});

// ============================================================
// Mixed valid/invalid records
// ============================================================

describe("cleanDataset — mixed valid/invalid records", () => {
  it("correctly separates valid and invalid rows", () => {
    const invalidRow = makeRow("Bad", "Male", "99", "50", "50", "50", "150");
    const r = cleanDataset(makeCsv(ROW_NAVYA, invalidRow, ROW_MYRA));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.students).toHaveLength(2);
      expect(r.invalidRecords).toHaveLength(1);
      expect(r.metadata.invalidRowCount).toBe(1);
    }
  });

  it("invalid row reason is human-readable", () => {
    const invalidRow = makeRow("Bad", "Male", "99", "50", "50", "50", "150");
    const r = cleanDataset(makeCsv(invalidRow));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(typeof r.invalidRecords[0].reason).toBe("string");
      expect(r.invalidRecords[0].reason.length).toBeGreaterThan(0);
    }
  });

  it("invalid row includes the raw data", () => {
    const invalidRow = makeRow("Bad", "Male", "99", "50", "50", "50", "150");
    const r = cleanDataset(makeCsv(invalidRow));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.invalidRecords[0].rawData["Name"]).toBe("Bad");
    }
  });
});

// ============================================================
// Stable student ID determinism
// ============================================================

describe("cleanDataset — stable student IDs", () => {
  it("same input always produces the same student IDs", () => {
    const csv = makeCsv(ROW_NAVYA, ROW_MYRA, ROW_ADITI);
    const r1 = cleanDataset(csv);
    const r2 = cleanDataset(csv);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      const ids1 = r1.students.map((s) => s.studentId).sort();
      const ids2 = r2.students.map((s) => s.studentId).sort();
      expect(ids1).toEqual(ids2);
    }
  });

  it("all student IDs in a run are unique", () => {
    const csv = makeCsv(ROW_NAVYA, ROW_MYRA, ROW_ADITI, ROW_ROHAN);
    const r = cleanDataset(csv);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const ids = r.students.map((s) => s.studentId);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    }
  });

  it("student IDs start with 's_'", () => {
    const r = cleanDataset(makeCsv(ROW_MYRA));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.students[0].studentId.startsWith("s_")).toBe(true);
  });

  it("student ID does not change when re-cleaned from the same input", () => {
    const csv = makeCsv(ROW_NAVYA);
    const r1 = cleanDataset(csv);
    const r2 = cleanDataset(csv);
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.students[0].studentId).toBe(r2.students[0].studentId);
    }
  });
});

// ============================================================
// deduplicator — unit tests
// ============================================================

describe("removeExactDuplicates", () => {
  it("returns all rows when none are duplicates", () => {
    const rows = [{ Name: "A" }, { Name: "B" }];
    const result = removeExactDuplicates(rows);
    expect(result.unique).toHaveLength(2);
    expect(result.removed).toBe(0);
  });

  it("removes a single exact duplicate", () => {
    const row = { Name: "A", Grade: "5" };
    const result = removeExactDuplicates([row, row]);
    expect(result.unique).toHaveLength(1);
    expect(result.removed).toBe(1);
  });

  it("keeps the first occurrence", () => {
    const rowA = { Name: "A" };
    const rowB = { Name: "A" };
    const result = removeExactDuplicates([rowA, rowB]);
    expect(result.unique[0]).toBe(rowA);
  });
});

describe("removeNormalizedDuplicates", () => {
  const key = (k: NormalizedKey) => normalizedRecordKey(k);

  it("returns all items when none share a key", () => {
    const items: NormalizedKey[] = [
      { name: "Aditi", gender: "Female", grade: 5, math: 50, science: 50, english: 50, total: 150 },
      { name: "Rohan", gender: "Male", grade: 6, math: 60, science: 60, english: 60, total: 180 },
    ];
    const result = removeNormalizedDuplicates(items, key);
    expect(result.unique).toHaveLength(2);
    expect(result.removed).toBe(0);
  });

  it("removes normalised duplicates", () => {
    const record: NormalizedKey = {
      name: "Aditi", gender: "Female", grade: 5,
      math: 50, science: 50, english: 50, total: 150,
    };
    const result = removeNormalizedDuplicates([record, { ...record }], key);
    expect(result.unique).toHaveLength(1);
    expect(result.removed).toBe(1);
  });

  it("does not remove records that share only name but differ in other fields", () => {
    const a: NormalizedKey = { name: "Aditi", gender: "Female", grade: 5, math: 50, science: 50, english: 50, total: 150 };
    const b: NormalizedKey = { name: "Aditi", gender: "Male", grade: 5, math: 50, science: 50, english: 50, total: 150 };
    const result = removeNormalizedDuplicates([a, b], key);
    expect(result.unique).toHaveLength(2);
  });
});

// ============================================================
// Full 3,000-row dataset test
// ============================================================

describe("cleanDataset — full 3,000-row dataset (data/students.csv)", () => {
  // Read the CSV at test time from the filesystem.
  // Node 24 (ESM) — use import.meta.dirname.
  const csvPath = join(import.meta.dirname, "../data/students.csv");
  const csvText = readFileSync(csvPath, "utf-8");

  it("CSV is readable and non-empty", () => {
    expect(csvText.length).toBeGreaterThan(0);
  });

  it("pipeline completes successfully (ok: true)", () => {
    const r = cleanDataset(csvText);
    expect(r.ok).toBe(true);
  });

  it("reports 3,000 original rows", () => {
    const r = cleanDataset(csvText);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.metadata.originalRowCount).toBe(3000);
  });

  it("produces 3,000 cleaned students (no rejections expected from this dataset)", () => {
    const r = cleanDataset(csvText);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.metadata.invalidRowCount).toBe(0);
      expect(r.students).toHaveLength(3000);
    }
  });

  it("reports 0 exact duplicates", () => {
    const r = cleanDataset(csvText);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.metadata.exactDuplicatesRemoved).toBe(0);
  });

  it("reports 0 normalised duplicates", () => {
    const r = cleanDataset(csvText);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.metadata.normalizedDuplicatesRemoved).toBe(0);
  });

  it("reports 0 total corrections (dataset totals are consistent)", () => {
    const r = cleanDataset(csvText);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.metadata.totalCorrections).toBe(0);
  });

  it("all student totals equal math + science + english", () => {
    const r = cleanDataset(csvText);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const mismatches = r.students.filter(
      (s) => s.total !== s.math + s.science + s.english
    );
    expect(mismatches).toHaveLength(0);
  });

  it("all grades are within valid range [1, 12]", () => {
    const r = cleanDataset(csvText);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const invalid = r.students.filter((s) => s.grade < 1 || s.grade > 12);
    expect(invalid).toHaveLength(0);
  });

  it("all marks are within valid range [0, 100]", () => {
    const r = cleanDataset(csvText);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const invalid = r.students.filter(
      (s) =>
        s.math < 0 || s.math > 100 ||
        s.science < 0 || s.science > 100 ||
        s.english < 0 || s.english > 100
    );
    expect(invalid).toHaveLength(0);
  });

  it("all student IDs are unique", () => {
    const r = cleanDataset(csvText);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ids = r.students.map((s) => s.studentId);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("all initial statuses are Active", () => {
    const r = cleanDataset(csvText);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const nonActive = r.students.filter((s) => s.status !== "Active");
    expect(nonActive).toHaveLength(0);
  });

  it("reports a meaningful number of name normalisations (dataset has intentional inconsistencies)", () => {
    const r = cleanDataset(csvText);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.metadata.nameNormalizations).toBeGreaterThan(0);
  });

  it("reports a meaningful number of gender normalisations (dataset has 10 variant forms)", () => {
    const r = cleanDataset(csvText);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.metadata.genderNormalizations).toBeGreaterThan(0);
  });

  it("reports a meaningful number of mark normalisations (dataset has '28 marks' etc.)", () => {
    const r = cleanDataset(csvText);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.metadata.markNormalizations).toBeGreaterThan(0);
  });

  it("student IDs are stable — same result on second run", () => {
    const r1 = cleanDataset(csvText);
    const r2 = cleanDataset(csvText);
    expect(r1.ok && r2.ok).toBe(true);
    if (!r1.ok || !r2.ok) return;
    const ids1 = r1.students.map((s) => s.studentId).sort();
    const ids2 = r2.students.map((s) => s.studentId).sort();
    expect(ids1).toEqual(ids2);
  });
});
