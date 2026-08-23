# Antigravity Development Workflow

## Important

This project must NOT be implemented through one giant AI prompt.

Antigravity should work as an engineering agent under controlled instructions.

The repository documentation is the source of truth.

Before making changes, read:

```text
docs/01-PROJECT-SPEC.md
docs/02-DATA-CLEANING-SPEC.md
docs/03-ARCHITECTURE.md
docs/04-IMPLEMENTATION-PLAN.md
```

Never contradict these documents without first explaining why.

---

# GLOBAL RULES FOR ANTIGRAVITY

1. Do not rewrite working code unnecessarily.
2. Do not introduce dependencies without justification.
3. Do not add backend infrastructure.
4. Do not use AI/LLM APIs for cleaning.
5. Do not invent data.
6. Do not silently change the cleaning specification.
7. Keep business logic outside React UI components.
8. Prefer pure, testable functions.
9. Run tests after meaningful changes.
10. Run production build before declaring a phase complete.
11. Do not hide TypeScript errors.
12. Do not use `any` unless there is a documented reason.
13. Do not remove tests to make the build pass.
14. Do not optimize prematurely.
15. Preserve the assessment requirements exactly.

---

# PHASE 0 PROMPT — PROJECT INITIALIZATION

Read all files under `docs/`.

Then initialize the project according to the architecture.

Tasks:

- create Vite React TypeScript project
- configure Tailwind
- configure the selected component system
- install Papa Parse
- install Vitest
- establish the project structure
- create/update README
- configure scripts
- verify development server
- verify production build

Do NOT implement the application features yet.

After implementation:

1. run the development build/check
2. run production build
3. report files created
4. report dependencies added
5. report any issues

Do not proceed to another phase automatically.

---

# PHASE 1 PROMPT — DATA LAYER

Read:

```text
01-PROJECT-SPEC.md
02-DATA-CLEANING-SPEC.md
03-ARCHITECTURE.md
```

Implement the typed data model and CSV parsing layer.

Create:

```text
src/types/student.ts
src/pipeline/parser.ts
src/pipeline/validator.ts
```

Implement schema validation and robust CSV parsing.

Do not implement UI.

Write unit tests.

Use the supplied dataset as a real test fixture if practical, but do not bundle unnecessary personal/raw data into production unless required.

Run tests.

Run TypeScript checks.

Stop and report results.

---

# PHASE 2 PROMPT — NORMALIZATION

Implement:

```text
normalizeName()
normalizeGender()
normalizeGrade()
parseMark()
```

Follow `02-DATA-CLEANING-SPEC.md` exactly.

Use actual examples from the supplied dataset.

Add unit tests for every documented normalization rule.

Important:

Do not use fuzzy matching.

Do not guess unknown values.

Do not modify Total in the normalizer.

Run:

```text
tests
typecheck
build
```

Stop after reporting results.

---

# PHASE 3 PROMPT — CLEANING PIPELINE

Implement the complete cleaning pipeline.

Expected structure:

```text
raw rows
→ schema validation
→ normalization
→ numeric validation
→ missing-value validation
→ Total recalculation
→ duplicate removal
→ stable ID
→ Active status
```

Return cleaned students plus metadata.

Keep this logic independent from React.

Add tests for:

- valid rows
- invalid rows
- duplicate rows
- normalized duplicates
- Total mismatch
- missing values
- invalid marks
- invalid grade
- unknown gender

Run all tests.

Use the supplied 3,000-row dataset to verify real behavior.

Report:

```text
input rows
output rows
duplicates
invalid records
Total corrections
```

Do not proceed to UI until the cleaning pipeline is stable.

---

# PHASE 4 PROMPT — STATE LAYER

Implement application state for:

```text
cleanedStudents
statusByStudentId
minimumTotal
searchQuery
processing state
cleaning metadata
errors
```

Status must persist during normal React interactions.

Do not put cleaning logic into components.

Create reusable hooks/services where appropriate.

Add tests for status transitions.

Stop after testing.

---

# PHASE 5 PROMPT — UPLOAD UI

Build the CSV upload interface.

Requirements:

- drag/drop or browse
- CSV validation
- processing indicator
- error display
- successful processing state
- cleaning metadata

After upload, display a clear summary.

Do not implement shortlist filtering yet unless needed to wire state.

Focus only on upload → cleaning → cleaned dataset state.

Test using the supplied CSV.

---

# PHASE 6 PROMPT — CLEANED TABLE

Implement the cleaned student table.

Requirements:

- readable columns
- horizontal scrolling if needed
- status control
- clear Active/Debarred state
- good empty state
- good loading state

Do not hide records unnecessarily.

Make the table usable with 3,000 rows.

Do not implement pagination unless it materially improves performance/usability.

---

# PHASE 7 PROMPT — LIVE SHORTLIST

Implement minimum Total filtering.

Required condition:

```text
student.status === "Active"
AND
student.total >= minimumTotal
```

The threshold must update immediately.

Do not reparse the CSV.

Do not rerun the cleaning pipeline.

Do not make a network request.

Add tests for:

- threshold
- zero matches
- all matches
- boundary equality
- Debarred student exclusion

---

# PHASE 8 PROMPT — STATUS INTERACTION

Audit the Active/Debarred implementation against the official requirement.

Test this exact scenario:

1. Upload dataset.
2. Choose an eligible student.
3. Set threshold so the student appears.
4. Change Active → Debarred.
5. Verify immediate disappearance.
6. Change threshold.
7. Verify the student remains excluded.
8. Change Debarred → Active.
9. Verify immediate return if score qualifies.

Do not accept a workaround involving re-uploading.

---

# PHASE 9 PROMPT — STATISTICS

Implement current-shortlist statistics.

At minimum:

```text
Matched count
Average Total
```

Recommended:

```text
Average Math
Average Science
Average English
```

Statistics must derive from the current shortlist, not the entire dataset.

Test threshold/status changes.

---

# PHASE 10 PROMPT — EXPORT

Implement CSV export.

Export exactly the current shortlist.

Verify:

```text
Active only
Total >= threshold
cleaned values
correct headers
```

Test exported content programmatically.

---

# PHASE 11 PROMPT — UI POLISH

Now improve the UI.

Do not change business logic.

Focus on:

- professional visual hierarchy
- clear dashboard layout
- responsive table
- accessible controls
- obvious status controls
- clean statistics cards
- clear upload state
- empty/error states
- polished buttons
- consistent spacing
- keyboard accessibility

Avoid excessive animations.

The interface should feel like a professional assessment submission rather than a generic template.

---

# PHASE 12 PROMPT — PERFORMANCE AUDIT

Use the supplied 3,000-row dataset.

Measure/inspect:

- initial page load
- CSV parsing
- cleaning
- first render
- threshold change
- status toggle
- search
- export

Ensure:

- cleaning happens once per upload
- derived shortlist is computed efficiently
- status updates are localized
- no unnecessary network requests exist
- no unnecessary expensive React rerenders occur

Do not add complex optimization unless profiling demonstrates a problem.

Report any meaningful latency.

---

# PHASE 13 PROMPT — QA

Perform a complete requirements audit.

Read:

```text
01-PROJECT-SPEC.md
02-DATA-CLEANING-SPEC.md
03-ARCHITECTURE.md
04-IMPLEMENTATION-PLAN.md
```

For every requirement, identify:

```text
Requirement
Implementation location
Test
Result
```

Test:

- valid CSV
- malformed CSV
- missing columns
- empty CSV
- formatting inconsistencies
- missing values
- invalid marks
- invalid grade
- unknown gender
- duplicate records
- Total mismatch
- minimum score
- Active/Debarred
- Undebar
- export

Fix all discovered issues.

Run:

```text
tests
typecheck
production build
```

Do not declare complete until all pass.

---

# PHASE 14 PROMPT — README & DOCUMENTATION

Create the final README.

It must contain:

- project overview
- screenshots
- feature list
- architecture
- cleaning methodology
- exact normalization rules
- local setup
- development commands
- testing
- deployment
- performance design
- privacy/client-side processing explanation
- demo video placeholder
- live demo placeholder
- limitations

Do not claim functionality that is not actually implemented.

---

# PHASE 15 PROMPT — DEPLOYMENT

Prepare production deployment.

Use a free static host.

Before deployment:

```text
npm run build
```

must succeed.

Deploy.

Then manually test the production URL.

Test:

- page load
- upload
- cleaning
- filtering
- status toggle
- shortlist
- statistics
- export

Test in a clean browser/incognito window.

---

# PHASE 16 PROMPT — FINAL ASSESSMENT AUDIT

This is the final gate.

Pretend you are the evaluator.

Evaluate the application against:

1. Data Cleaning & Pipeline Robustness
2. UI Functionality & Real-Time Interactivity
3. Time Latency & Performance
4. Code Quality & Architecture
5. Documentation & Video Demonstration

Identify anything that could lose marks.

Do not make cosmetic changes merely for the sake of change.

Fix only verified issues.

Then produce a final report:

```text
Core requirements:
PASS/FAIL

Cleaning:
PASS/FAIL

Filtering:
PASS/FAIL

Debar/Undebar:
PASS/FAIL

Export:
PASS/FAIL

Tests:
PASS/FAIL

Build:
PASS/FAIL

Deployment:
PASS/FAIL

README:
PASS/FAIL

Demo:
PASS/FAIL
```

Also provide a final list of files changed.

Do not declare the project ready for submission if any core requirement fails.