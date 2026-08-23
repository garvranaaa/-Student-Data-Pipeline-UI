# Implementation Plan

## Principle

Build in controlled stages.

Do not ask an AI coding agent to implement the entire project in one pass.

Each stage must be implemented, tested and reviewed before proceeding.

---

# Phase 0 — Repository & Environment

Tasks:

- initialize Vite React TypeScript project
- install required dependencies
- configure Tailwind
- configure UI component system
- configure Vitest
- establish folder structure
- create documentation files
- create initial README
- verify development server
- verify production build

Acceptance:

```text
npm run dev
```

works.

```text
npm run build
```

works.

Tests can run.

---

# Phase 1 — Data Model & Parsing

Implement:

- Student type
- raw CSV row type
- Papa Parse integration
- schema validation
- CSV error handling

Tests:

- valid CSV
- malformed CSV
- missing column
- extra column
- empty CSV

Acceptance:

A valid CSV can be parsed into raw records without UI dependency.

---

# Phase 2 — Normalization Functions

Implement independently testable pure functions:

```text
normalizeName()
normalizeGender()
normalizeGrade()
parseMark()
```

Use the supplied dataset as a test source.

Test:

```text
"ADITI" → "Aditi"
"Aditi'" → "Aditi"
"Grade 11" → 11
"28 marks" → 28
"male" → Male
"m" → Male
"1" → Male
"female" → Female
"0" → Female
```

Acceptance:

All known dataset formatting variants normalize correctly.

---

# Phase 3 — Cleaning Pipeline

Implement:

```text
cleanDataset()
```

Pipeline:

```text
parse
→ schema validation
→ normalization
→ numeric validation
→ missing-value detection
→ Total recalculation
→ duplicate removal
→ stable ID
→ Active status
```

Return:

```text
cleanedStudents
cleaningMetadata
errors/warnings
```

Acceptance:

The supplied 3,000-row dataset processes successfully.

---

# Phase 4 — Cleaning Tests

Create comprehensive tests.

At minimum:

- column normalization
- name normalization
- gender normalization
- grade normalization
- mark parsing
- mark range validation
- missing values
- Total recalculation
- duplicate removal
- stable IDs

Test actual examples from the supplied dataset.

Acceptance:

All tests pass.

---

# Phase 5 — Application State

Implement the main dataset hook/state layer.

Responsibilities:

- store cleaned dataset
- store status
- update status
- reset dataset on new upload
- expose derived state

Do not put cleaning algorithms inside React components.

Acceptance:

The UI can consume a cleaned Student[] independently from the uploader.

---

# Phase 6 — Upload UI

Implement:

- drag/drop or file selector
- file validation
- loading/processing state
- success state
- error state
- cleaning summary

Show:

```text
Original rows
Cleaned rows
Duplicates removed
Invalid rows
Total corrections
```

Acceptance:

Uploading the supplied CSV immediately produces the cleaned dataset.

---

# Phase 7 — Cleaned Data Table

Implement:

- table
- column headers
- readable values
- status control
- scrolling/pagination if required
- empty state

Do not load unnecessary table libraries unless required.

3,000 rows should remain usable.

Acceptance:

All cleaned students can be inspected.

---

# Phase 8 — Status Management

Implement:

```text
Active
Debarred
```

Status changes must be instant.

Test:

1. Pick an eligible student.
2. Debar them.
3. Confirm they disappear from shortlist.
4. Change them back to Active.
5. Confirm they return if eligible.

Acceptance:

No dataset re-upload is required.

---

# Phase 9 — Filtering

Implement:

```text
minimumTotal
```

and optional search.

Shortlist condition:

```text
Active AND Total >= minimumTotal
```

Use in-memory filtering.

Acceptance:

Changing the threshold updates results immediately.

---

# Phase 10 — Statistics

Implement:

- matched count
- average total
- average Math
- average Science
- average English

Statistics must always describe the current shortlist.

Acceptance:

Statistics change correctly after threshold/status changes.

---

# Phase 11 — CSV Export

Implement browser-side CSV generation.

Export:

```text
current shortlist only
```

Acceptance:

A downloaded CSV:

- contains cleaned data
- contains only active students
- respects minimum Total
- opens correctly in spreadsheet software

---

# Phase 12 — UI Polish

Improve:

- spacing
- typography
- hierarchy
- responsive layout
- loading states
- empty states
- error states
- accessibility
- hover/focus states
- table usability

Do not sacrifice clarity for visual effects.

---

# Phase 13 — Performance Review

Measure:

- initial load
- upload processing
- threshold change
- status toggle
- search
- export

Use the supplied 3,000-row dataset.

The application should feel immediate after upload.

Do not add premature complexity.

---

# Phase 14 — Full QA

Test:

### Upload

- correct CSV
- malformed CSV
- wrong schema
- empty CSV

### Cleaning

- names
- gender
- grades
- marks
- totals
- duplicates
- missing data

### Filtering

- low threshold
- high threshold
- no matches
- all matches

### Status

- Active → Debarred
- Debarred → Active
- debarred student above threshold
- debarred student below threshold

### Export

- correct rows
- correct values
- no debarred records

---

# Phase 15 — Deployment

Create production build.

Deploy to selected free static host.

Verify:

- upload works
- processing works
- filtering works
- status works
- export works
- page refresh works

Test from a clean browser.

---

# Phase 16 — README

README must contain:

1. Project overview
2. Screenshots
3. Features
4. Architecture
5. Cleaning logic
6. Local installation
7. Running locally
8. Testing
9. Deployment
10. Performance considerations
11. Privacy/client-side processing note
12. Demo video
13. Known limitations

---

# Phase 17 — Demo Video

Maximum:

```text
90 seconds
```

Demonstrate:

```text
Upload
→ Cleaning
→ Cleaned table
→ Minimum Total
→ Statistics
→ Debar
→ Immediate exclusion
→ Undebar
→ Export
```

Do not waste video time on code.

---

# Phase 18 — Final Audit

Before submission compare the finished application against:

```text
01-PROJECT-SPEC.md
02-DATA-CLEANING-SPEC.md
03-ARCHITECTURE.md
```

Every requirement must have an explicit verification.

Do not submit if any core requirement is untested.