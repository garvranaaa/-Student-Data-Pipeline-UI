import { describe, it, expect } from "vitest";
import { computeShortlist } from "@/services/filtering";
import type { Student, StudentStatus } from "@/types/student";

// ============================================================
// Helpers
// ============================================================

function makeStudent(overrides: Partial<Student> & { studentId: string }): Student {
  return {
    name: "Test Student",
    gender: "Male",
    grade: 5,
    math: 50,
    science: 50,
    english: 50,
    total: 150,
    status: "Active",
    ...overrides,
  };
}

const noOverrides = new Map<string, StudentStatus>();

// ============================================================
// computeShortlist
// ============================================================

describe("computeShortlist", () => {
  describe("empty inputs", () => {
    it("returns empty array for empty students", () => {
      expect(computeShortlist([], noOverrides, 0)).toHaveLength(0);
    });

    it("returns empty array when all students are debarred via statusByStudentId", () => {
      const s = makeStudent({ studentId: "s1", total: 200 });
      const map = new Map<string, StudentStatus>([["s1", "Debarred"]]);
      expect(computeShortlist([s], map, 0)).toHaveLength(0);
    });
  });

  describe("status filtering", () => {
    it("includes Active students", () => {
      const s = makeStudent({ studentId: "s1", total: 100 });
      expect(computeShortlist([s], noOverrides, 0)).toHaveLength(1);
    });

    it("excludes student debarred via statusByStudentId override", () => {
      const s = makeStudent({ studentId: "s1", total: 100 });
      const map = new Map<string, StudentStatus>([["s1", "Debarred"]]);
      expect(computeShortlist([s], map, 0)).toHaveLength(0);
    });

    it("includes student when override is Active", () => {
      const s = makeStudent({ studentId: "s1", status: "Active", total: 100 });
      const map = new Map<string, StudentStatus>([["s1", "Active"]]);
      expect(computeShortlist([s], map, 0)).toHaveLength(1);
    });

    it("uses statusByStudentId override over Student.status field", () => {
      // Student.status says Active but override says Debarred
      const s = makeStudent({ studentId: "s1", status: "Active", total: 100 });
      const map = new Map<string, StudentStatus>([["s1", "Debarred"]]);
      expect(computeShortlist([s], map, 0)).toHaveLength(0);
    });

    it("falls back to Student.status when no override exists", () => {
      const s = makeStudent({ studentId: "s1", status: "Active", total: 100 });
      expect(computeShortlist([s], noOverrides, 0)).toHaveLength(1);
    });
  });

  describe("total threshold filtering", () => {
    it("includes student when total equals minimumTotal (boundary inclusive)", () => {
      const s = makeStudent({ studentId: "s1", total: 150 });
      expect(computeShortlist([s], noOverrides, 150)).toHaveLength(1);
    });

    it("includes student when total exceeds minimumTotal", () => {
      const s = makeStudent({ studentId: "s1", total: 200 });
      expect(computeShortlist([s], noOverrides, 150)).toHaveLength(1);
    });

    it("excludes student when total is below minimumTotal", () => {
      const s = makeStudent({ studentId: "s1", total: 149 });
      expect(computeShortlist([s], noOverrides, 150)).toHaveLength(0);
    });

    it("threshold of 0 includes all Active students", () => {
      const students = [
        makeStudent({ studentId: "s1", total: 0 }),
        makeStudent({ studentId: "s2", total: 300 }),
      ];
      expect(computeShortlist(students, noOverrides, 0)).toHaveLength(2);
    });

    it("threshold of 300 includes only perfect score students", () => {
      const students = [
        makeStudent({ studentId: "s1", total: 299 }),
        makeStudent({ studentId: "s2", total: 300 }),
      ];
      expect(computeShortlist(students, noOverrides, 300)).toHaveLength(1);
      expect(computeShortlist(students, noOverrides, 300)[0].studentId).toBe("s2");
    });
  });

  describe("combined status + threshold", () => {
    it("excludes debarred student even if their total qualifies", () => {
      const s = makeStudent({ studentId: "s1", total: 300 });
      const map = new Map<string, StudentStatus>([["s1", "Debarred"]]);
      expect(computeShortlist([s], map, 0)).toHaveLength(0);
    });

    it("handles mixed valid/debarred/threshold students correctly", () => {
      const students = [
        makeStudent({ studentId: "s1", total: 200 }), // Active, qualifies
        makeStudent({ studentId: "s2", total: 100 }), // Active, below threshold
        makeStudent({ studentId: "s3", total: 200 }), // will be Debarred
        makeStudent({ studentId: "s4", total: 250 }), // Active, qualifies
      ];
      const map = new Map<string, StudentStatus>([["s3", "Debarred"]]);
      const result = computeShortlist(students, map, 150);
      expect(result).toHaveLength(2);
      expect(result.map((s) => s.studentId)).toContain("s1");
      expect(result.map((s) => s.studentId)).toContain("s4");
    });

    it("does not mutate the input array", () => {
      const students = [makeStudent({ studentId: "s1", total: 200 })];
      const original = [...students];
      computeShortlist(students, noOverrides, 0);
      expect(students).toEqual(original);
    });
  });

  describe("status change simulation", () => {
    it("re-adding student to shortlist after undebarring", () => {
      const s = makeStudent({ studentId: "s1", total: 200 });

      // Initially active, qualifies
      expect(computeShortlist([s], noOverrides, 150)).toHaveLength(1);

      // Debar
      const debarredMap = new Map<string, StudentStatus>([["s1", "Debarred"]]);
      expect(computeShortlist([s], debarredMap, 150)).toHaveLength(0);

      // Undebar
      const undebaredMap = new Map<string, StudentStatus>([["s1", "Active"]]);
      expect(computeShortlist([s], undebaredMap, 150)).toHaveLength(1);
    });
  });
});
