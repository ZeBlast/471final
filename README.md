# After Graduation

This project is an interactive D3 webpage about post-college outcomes. It combines College Scorecard financial data with Post-Secondary Employment Outcomes (PSEO) earnings data to compare colleges, states, debt, cost, and earnings across multiple graduation cohorts.

## Datasets

### `schools.csv`
Used for institution identity and location data.

Fields used:
- `name`, `city`, `state`
- `lat`, `lon`
- `tuition_in_state`, `tuition_out_of_state`
- `room_oncampus`, `room_offcampus`
- `booksupply`

Purpose:
- powers the college map
- provides tuition and estimated yearly cost
- provides labels and geographic placement

### `aid.csv`
Used for borrowing and debt metrics.

Fields used:
- `loan_principal`
- `pell_grant_rate`
- `federal_loan_rate`
- `students_with_any_loan`
- `median_debt_suppressed`

Parsed from nested debt fields:
- overall median debt
- completer debt
- monthly payment for completers

Purpose:
- adds debt and aid context to each school
- supports debt burden, Pell rate, and borrowing comparisons

The above CSVs were downloaded from https://www.kaggle.com/datasets/akibmir/college-scorecard/

### `pseo_all_institutions.csv`
Used as the institution lookup for PSEO.

Fields used:
- `institution`
- `label`
- `institution_state`

Purpose:
- provides the PSEO institution name/id side of the merge
- is matched to Scorecard schools by state and institution name

### `pseoe_all.csv`
Used for earnings outcomes by cohort.

Filters used:
- `inst_level = I`
- `cip_level = A`
- `degree_level = 05`

Cohorts used:
- aggregate `0000`
- `2001`, `2004`, `2007`, `2010`, `2013`, `2016`, `2019`

Fields used:
- `grad_cohort`
- `grad_cohort_years`
- `y1_p50_earnings`, `y5_p50_earnings`, `y10_p50_earnings`
- related p25/p75 and count fields when available

Purpose:
- powers the cohort selector
- provides year 1, year 5, and year 10 earnings where available
- drives state summaries and school-level earnings comparisons

The above CSVs were downloaded from https://lehd.ces.census.gov/data/pseo_experimental.html

## Combined Data

### `combined_pseo_all_cohorts.csv`
This is the main dataset used by the webpage at runtime.

It merges:
- school identity, location, and tuition from `schools.csv`
- debt and aid metrics from `aid.csv`
- cohort earnings from the PSEO files

Each row represents:
- one matched institution
- for one graduation cohort

## How The Visualizations Use The Data

### Learn
- aggregates the combined data by state within the selected cohort
- compares earnings, debt, cost, Pell rate, and earnings-to-debt ratio

### Explore
- plots matched institutions on a US map using latitude/longitude
- colors and sizes colleges by earnings, debt, tuition, or aid metrics

### Decide
- lets the user inspect one college within one cohort
- compares tuition, total estimated cost, completer debt, and available earnings horizons

## Important Notes

- The app reads `combined_pseo_all_cohorts.csv` directly in the browser with D3.
- The local PSEO file does not contain cohorts after `2019`.
- Not every cohort has populated `y1`, `y5`, and `y10` earnings columns, so availability depends on the selected cohort.
