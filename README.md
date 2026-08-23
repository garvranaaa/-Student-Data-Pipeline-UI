# Student Data Pipeline & UI

A robust, client-side React application for processing, cleaning, and filtering student assessment data. It securely processes raw CSV datasets directly in the browser—meaning no backend servers are needed, no database costs, and zero network latency during data processing.

## Features

- **Blazing Fast CSV Upload**: Processes thousands of rows instantaneously directly in the browser via Papa Parse.
- **Automatic Data Cleaning**: Validates column schemas, deduplicates identical/normalized records, and standardizes formats (e.g. name casing, gender capitalization).
- **Data Integrity & Validation**: Strictly enforces marks limits (0-100) and automatically calculates verifiable `Total` scores. Discards rows failing strict numeric validation.
- **Live Filtering**: Dynamically update the minimum Total score threshold to see qualifying students instantly.
- **Active / Debarred Management**: Click any student's status to instantly toggle their eligibility. Debarred students disappear from the qualifying shortlist but remain visible in the main dataset.
- **Real-Time Statistics**: Tracks matched count, average Math/Science/English scores, and average Total for the eligible shortlist dynamically as filters or statuses change.
- **Cleaned Data Export**: One-click download of the exact eligible shortlist—strictly excluding Debarred or non-qualifying students—back to a standardized CSV format.

## Architecture

The application is built using a strict unidirectional data flow, separating pure logic from React UI state. 

1. **CSV Parsing Layer** (`src/pipeline/parser.ts`): Parses raw string input into JS objects.
2. **Validation Layer** (`src/pipeline/validator.ts`): Checks for necessary headers and columns.
3. **Normalization Layer** (`src/pipeline/normalizers.ts`): Pure functions that clean messy string inputs.
4. **Cleaning Pipeline** (`src/pipeline/cleaner.ts`): Orchestrates parsing, deduplication, row-by-row normalization, and generates stable `Student` objects with calculated totals.
5. **State Layer** (`src/hooks/useStudentDataset.ts`): Maintains immutable React state using custom hooks. Stores only the *original cleaned dataset* and a Map of *overridden statuses*.
6. **Filtering & Statistics** (`src/services/filtering.ts`, `src/services/statistics.ts`): Pure computation derived on-the-fly using `useMemo` to prevent unnecessary re-renders. 
7. **Export** (`src/services/export.ts`): Native browser Blob handling for zero-dependency CSV downloads.

## Data-Cleaning Logic

The application enforces the following deterministic rules:

1. **Schema Check**: Requires exactly `Name`, `Gender`, `Grade`, `Math`, `Science`, `English`, `Total`.
2. **Deduplication**: Exact identical rows are removed. If two rows have identical normalized values (excluding raw Total), the later row is dropped.
3. **Name Normalization**: Trims whitespace. Capitalizes the first letter of every space-separated segment. Preserves valid internal apostrophes (e.g. `O'Brien`).
4. **Gender Normalization**: Standardizes to `Male`, `Female`, or `Unknown`.
5. **Grade Normalization**: Strips strings like `Grade ` to retain just the numeric value (e.g., `Grade 5` -> `5`).
6. **Marks Processing**: Trims whitespace, removes the ` marks` suffix, and parses as integers. Discards any row containing negative marks or marks > 100, or marks failing numeric coercion.
7. **Total Recalculation**: `Total` is forcefully recalculated as `Math + Science + English`. The system records a "correction" if the newly calculated total differs from the original.
8. **Student Identification**: A stable `FNV-1a` 32-bit hash is generated for each student based on their final cleaned attributes, preventing duplicate operations when the DOM updates.

## Local Setup

Ensure you have Node.js 20+ installed.

```bash
git clone <repository>
cd <repository-directory>
npm install
```

## Development

To start the Vite development server with Hot Module Replacement (HMR):

```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

## Testing

The project uses **Vitest** for unit and integration testing. 
There are 249 unit tests covering parsing, normalization, pipeline aggregation, deduplication, UI services, state transitions, and export formatting.

```bash
# Run all tests
npm run test
```

## Build

To produce a minified, production-ready build of the application:

```bash
npm run typecheck
npm run build
```

This ensures TypeScript strictness passes before bundling the assets into the `dist/` folder.

## Deployment

This application is designed as a **Static Site** (SPA). It runs completely client-side.
A GitHub Actions workflow is included at `.github/workflows/deploy.yml` which automatically builds and deploys the application to **GitHub Pages** for free.

**Steps to deploy:**
1. Push the code to a GitHub repository.
2. Go to **Settings > Pages**.
3. Under "Build and deployment", set the **Source** to **GitHub Actions**.
4. The workflow will automatically trigger, build the app, and provide a live URL.

*(Note: In automated agent environments without GitHub authentication tokens, the configuration is prepped and verified, but the actual remote push/trigger is left to the repository owner.)*

## Performance Profile

The application has been benchmarked on a standard 3,000-row dataset (`data/students.csv`).
- **Data Pipeline Benchmark**: ~18 ms (Processing 3,000 raw lines to clean objects).
- **End-to-End Upload Latency**: ~655 ms (Time elapsed from the user dropping the file to the React table fully rendering 3,000 rows on-screen).
- **DOM Updates**: Near-instant (O(1) Map lookups for status toggling with O(N) array filtering).

## Dataset Schema Expected

The application accepts CSV files containing the following column headers exactly:
`Name`, `Gender`, `Grade`, `Math`, `Science`, `English`, `Total`

_Example snippet:_
```csv
Name,Gender,Grade,Math,Science,English,Total
Navya,Male,11,47,63,74,184
Rohan,Female,3,16,77,8,101
Aditi,Female,11,28,43,46,117
```

