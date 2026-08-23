# Student Data Pipeline & UI
## Official Project Specification

## 1. Project Objective

Build a simple, functional web interface that allows users to:

1. Upload a raw student CSV dataset.
2. Automatically clean and validate the dataset.
3. Inspect the cleaned dataset.
4. Set a minimum total score requirement.
5. View a live shortlist of eligible students.
6. View basic shortlist statistics.
7. Mark individual students as Active or Debarred.
8. Immediately exclude Debarred students from the shortlist.
9. Export the final shortlist as CSV.

The application must prioritize robustness, responsiveness, clean architecture, and usability.

---

# 2. Official Dataset Schema

The input dataset contains:

| Column | Meaning |
|---|---|
| Name | Student's full name |
| Gender | Student's gender |
| Grade | Academic grade level |
| Math | Mathematics marks |
| Science | Science marks |
| English | English marks |
| Total | Sum of Math, Science and English |

The application must validate the expected schema before processing.

---

# 3. Core Requirements

## 3.1 Data Upload & Cleaning

The application must provide a CSV file uploader.

Immediately after upload, the application must process the file.

The cleaning pipeline must handle:

- duplicates
- typos / formatting inconsistencies
- missing values
- numeric conversion
- validation
- Total validation
- Total recalculation

The cleaned dataset must be displayed in a clear table.

---

# 4. Dynamic Filtering & Statistics

The application must provide an input for a minimum Total score.

The shortlist must update immediately when the threshold changes.

Only students satisfying:

```text
Status = Active
AND
Total >= Minimum Total
```

should appear in the shortlist.

The interface must display useful statistics, including at minimum:

- matched student count
- average score

Additional useful statistics may include:

- average Math
- average Science
- average English
- total records
- active records
- debarred records
- records cleaned/removed

---

# 5. Active / Debarred Management

Every cleaned student must have an interactive status control.

Allowed states:

```text
Active
Debarred
```

Default state:

```text
Active
```

When a student is changed to Debarred:

1. Their status must update immediately.
2. They must immediately disappear from the live shortlist if they otherwise qualify.
3. They must not be considered for minimum-score filtering.
4. The user must not need to upload the dataset again.

When changed back to Active:

1. Their status must update immediately.
2. If they satisfy the minimum score threshold, they should immediately become eligible again.

Status must survive ordinary UI interactions such as changing the score threshold or search query.

---

# 6. CSV Export

Provide a download button for the final shortlist.

The exported CSV must contain only students who satisfy:

```text
Active
AND
Total >= minimum threshold
```

The exported data must use cleaned/normalized values.

The export must not contain Debarred students.

---

# 7. User Experience Requirements

The interface should clearly communicate:

- whether a file has been uploaded
- how many records were processed
- whether cleaning occurred successfully
- duplicate count
- invalid/problematic records if applicable
- current minimum score
- current shortlist count
- current average scores
- Active/Debarred status

The application should provide useful error messages instead of crashing.

---

# 8. Performance Requirements

Performance is explicitly part of the judging criteria.

The application should:

- clean the dataset once after upload
- retain the cleaned dataset in application state
- perform filtering in memory
- avoid unnecessary network requests
- avoid re-uploading/reprocessing when the score threshold changes
- avoid recomputing the cleaning pipeline for simple UI interactions
- update Debar/Undebar state immediately
- keep filtering responsive for at least the supplied 3,000-row dataset

The architecture should be capable of handling substantially more than 3,000 records without unnecessary complexity.

---

# 9. Technology Direction

Preferred implementation:

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui or similarly lightweight UI components
- Papa Parse for CSV parsing
- Vitest for automated tests

The core application should be client-side.

A backend/database is not required.

Do not introduce unnecessary infrastructure.

---

# 10. Deployment

A free static hosting solution should be used where practical.

Candidate platforms:

- Vercel
- Netlify
- GitHub Pages

The final selected platform must support the built Vite application reliably.

---

# 11. Deliverables

Required:

1. GitHub repository
2. Clean source code
3. README.md
4. Local setup instructions
5. Cleaning logic explanation
6. ≤90-second video demo linked/embedded in README

Preferred bonus:

7. Live deployed application

The official assessment also provides a submission form and dataset link.

---

# 12. Judging Criteria

The implementation must explicitly optimize for:

### Data Cleaning & Pipeline Robustness

The cleaning logic must be deterministic, explainable, testable and safe.

### UI Functionality & Real-Time Interactivity

Upload, filtering, status changes and export must work correctly and visibly.

### Time Latency & Performance

Interactions should feel immediate, particularly filtering and Debar/Undebar operations.

### Code Quality & Architecture

The code should have clear separation between:

- UI
- data types
- parsing
- cleaning
- validation
- filtering
- statistics
- export

### Documentation & Video Demonstration

The README and demonstration must clearly communicate the solution.

---

# 13. Engineering Principles

Do not over-engineer the solution.

Do not add:

- authentication
- databases
- microservices
- AI/LLM APIs
- unnecessary backend APIs
- unnecessary cloud infrastructure

Prefer:

- deterministic logic
- typed data structures
- pure functions
- testable modules
- clear error handling
- responsive UI
- simple deployment

---

# 14. Definition of Done

The project is complete only when:

- [ ] CSV upload works
- [ ] Invalid file/schema is handled
- [ ] Cleaning pipeline works
- [ ] Names are normalized
- [ ] Gender is normalized
- [ ] Grade is normalized
- [ ] Marks are normalized
- [ ] Missing values are handled safely
- [ ] Duplicates are detected/removed
- [ ] Total is validated
- [ ] Total is recalculated when necessary
- [ ] Cleaned data is visible
- [ ] Minimum Total filter works
- [ ] Statistics update live
- [ ] Active/Debarred control works
- [ ] Debarred students disappear immediately
- [ ] Undebarring works immediately
- [ ] Status survives filtering interactions
- [ ] CSV export works
- [ ] Export excludes Debarred students
- [ ] Automated tests pass
- [ ] Production build passes
- [ ] Application is deployed
- [ ] README is complete
- [ ] 90-second demo is recorded
- [ ] Final submission is manually tested