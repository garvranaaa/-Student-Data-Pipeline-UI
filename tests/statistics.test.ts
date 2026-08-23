import { describe, it, expect } from "vitest";
import { computeStats } from "@/services/statistics";
import type { Student } from "@/types/student";

function makeStudent(overrides: Partial<Student> & { studentId: string }): Student {
  return {
    name: "Test",
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

describe("computeStats", () => {
  it("returns zeros for empty shortlist", () => {
    const stats = computeStats([]);
    expect(stats.matchedCount).toBe(0);
    expect(stats.averageTotal).toBe(0);
    expect(stats.averageMath).toBe(0);
    expect(stats.averageScience).toBe(0);
    expect(stats.averageEnglish).toBe(0);
  });

  it("returns correct stats for a single student", () => {
    const s = makeStudent({ studentId: "s1", math: 80, science: 70, english: 90, total: 240 });
    const stats = computeStats([s]);
    expect(stats.matchedCount).toBe(1);
    expect(stats.averageTotal).toBe(240);
    expect(stats.averageMath).toBe(80);
    expect(stats.averageScience).toBe(70);
    expect(stats.averageEnglish).toBe(90);
  });

  it("returns correct averages for multiple students", () => {
    const students = [
      makeStudent({ studentId: "s1", math: 100, science: 100, english: 100, total: 300 }),
      makeStudent({ studentId: "s2", math: 0, science: 0, english: 0, total: 0 }),
    ];
    const stats = computeStats(students);
    expect(stats.matchedCount).toBe(2);
    expect(stats.averageTotal).toBe(150);
    expect(stats.averageMath).toBe(50);
    expect(stats.averageScience).toBe(50);
    expect(stats.averageEnglish).toBe(50);
  });

  it("matchedCount equals shortlist length", () => {
    const students = [
      makeStudent({ studentId: "s1" }),
      makeStudent({ studentId: "s2" }),
      makeStudent({ studentId: "s3" }),
    ];
    expect(computeStats(students).matchedCount).toBe(3);
  });

  it("statistics update correctly after removing a student (simulated threshold change)", () => {
    // This simulates what happens when a student is debarred and drops off the shortlist
    const allStudents = [
      makeStudent({ studentId: "s1", total: 200, math: 70, science: 70, english: 60 }),
      makeStudent({ studentId: "s2", total: 100, math: 30, science: 30, english: 40 }),
    ];
    const reduced = [allStudents[0]]; // s2 debarred/filtered
    const statsAll = computeStats(allStudents);
    const statsReduced = computeStats(reduced);

    expect(statsAll.matchedCount).toBe(2);
    expect(statsReduced.matchedCount).toBe(1);
    expect(statsReduced.averageTotal).toBe(200);
  });
});
