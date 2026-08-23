# Application Architecture

## 1. Architecture Decision

Use a client-side React application.

Technology:

```text
React
TypeScript
Vite
Tailwind CSS
shadcn/ui
Papa Parse
Vitest
```

No backend is required for the core assessment.

---

# 2. Why Client-Side?

The supplied dataset contains 3,000 rows.

This is small enough for browser-side CSV parsing and in-memory filtering.

Benefits:

- extremely low interaction latency
- no API round trips
- no backend cold starts
- no database
- simple free deployment
- simpler architecture
- student data does not need to be uploaded to a server
- filtering and status changes can happen immediately

---

# 3. High-Level Architecture

```text
                  Browser
                     │
                     ▼
              CSV File Upload
                     │
                     ▼
                Papa Parse
                     │
                     ▼
             Validation Layer
                     │
                     ▼
             Cleaning Pipeline
                     │
                     ▼
             Clean Student Model
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
   React Application       Application State
                                │
                   ┌────────────┼────────────┐
                   ▼            ▼            ▼
               Threshold      Status       Search
                   │            │            │
                   └────────────┼────────────┘
                                ▼
                         Shortlist Engine
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
               Statistics               CSV Export
```

---

# 4. Suggested Project Structure

```text
student-data-pipeline/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── FileUploader.tsx
│   │   ├── DatasetSummary.tsx
│   │   ├── StudentTable.tsx
│   │   ├── StatusToggle.tsx
│   │   ├── FilterBar.tsx
│   │   ├── StatisticsCards.tsx
│   │   ├── ShortlistTable.tsx
│   │   ├── ExportButton.tsx
│   │   └── EmptyState.tsx
│   │
│   ├── pipeline/
│   │   ├── parser.ts
│   │   ├── cleaner.ts
│   │   ├── normalizers.ts
│   │   ├── validator.ts
│   │   └── deduplicator.ts
│   │
│   ├── services/
│   │   ├── filtering.ts
│   │   ├── statistics.ts
│   │   └── export.ts
│   │
│   ├── types/
│   │   └── student.ts
│   │
│   ├── hooks/
│   │   └── useStudentDataset.ts
│   │
│   ├── utils/
│   │   └── formatters.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── tests/
│   ├── normalizers.test.ts
│   ├── cleaner.test.ts
│   ├── filtering.test.ts
│   ├── statistics.test.ts
│   └── export.test.ts
│
├── docs/
│   ├── 01-PROJECT-SPEC.md
│   ├── 02-DATA-CLEANING-SPEC.md
│   ├── 03-ARCHITECTURE.md
│   ├── 04-IMPLEMENTATION-PLAN.md
│   └── 05-ANTIGRAVITY-WORKFLOW.md
│
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.*
├── .gitignore
└── LICENSE
```

---

# 5. Core Data Model

The original dataset has:

```text
Name
Gender
Grade
Math
Science
English
Total
```

The internal application model should additionally contain:

```text
studentId
status
```

Example conceptual model:

```typescript
type StudentStatus = "Active" | "Debarred";

interface Student {
  studentId: string;
  name: string;
  gender: "Male" | "Female" | "Unknown";
  grade: number;
  math: number;
  science: number;
  english: number;
  total: number;
  status: StudentStatus;
}
```

Do not expose implementation details unnecessarily in the UI.

---

# 6. State Model

Application state should contain:

```text
cleanedStudents
statusByStudentId
minimumTotal
searchQuery
processingState
cleaningMetadata
errors
```

The cleaned dataset must not be recreated every time a filter changes.

---

# 7. Filtering

The shortlist engine should conceptually perform:

```typescript
students
  .filter(student => student.status === "Active")
  .filter(student => student.total >= minimumTotal)
  .filter(matchesSearchIfPresent)
```

The filtering function should be pure and independently testable.

---

# 8. Status Management

Status changes should update only the affected student's status.

Changing status must not trigger:

- CSV reparsing
- data cleaning
- file upload
- network request

After the state update, React should update the shortlist.

---

# 9. Statistics

Statistics should be calculated from the current shortlist.

At minimum:

```text
matchedCount
averageTotal
```

Recommended:

```text
averageMath
averageScience
averageEnglish
```

All statistics must update when:

- threshold changes
- student is debarred
- student is undebarred
- search changes

---

# 10. Export

Generate the CSV from the current shortlist.

The export must use cleaned values.

Do not export the raw uploaded values.

Do not include Debarred students.

---

# 11. Performance Design

The cleaning pipeline runs once per uploaded file.

Filtering runs against the in-memory cleaned array.

Use memoization where it improves clarity/performance, such as:

```text
useMemo
```

for derived shortlist/statistics.

Do not prematurely optimize with complicated caching.

For 3,000 rows, straightforward O(n) filtering is sufficient.

---

# 12. UI Design

The application should have a polished but restrained dashboard.

Recommended sections:

1. Header
2. Upload area
3. Data-quality summary
4. Cleaned data table
5. Filter controls
6. Shortlist statistics
7. Shortlist table
8. Export action

The interface should make the Active/Debarred behavior obvious.

---

# 13. Responsive Behavior

The application should remain usable on:

- desktop
- laptop
- tablet-sized screens

The primary assessment experience is desktop browser use.

The student table may use horizontal scrolling rather than compressing columns into unreadable text.

---

# 14. Error Handling

Handle:

- no file
- non-CSV file
- malformed CSV
- missing columns
- invalid marks
- invalid grade
- unknown gender
- missing required values
- completely empty dataset

Errors should be human-readable.

Never expose raw stack traces to the end user.

---

# 15. Deployment Architecture

Build:

```text
npm run build
```

Deploy the generated static application.

No runtime backend is necessary.

The application should work entirely from the deployed browser page.