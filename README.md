# After Graduation

After Graduation is an interactive D3.js site that uses U.S. Department of Education **College Scorecard** data to explore how median earnings after completion relate to admissions, debt, tuition, and aid. The experience is organized into three sections on one page—**Learn** (scatter), **Explore** (map), and **Compare** (saved schools and small multiples)—with a separate [about.html](about.html) page for documentation, team roles, and AI-use transparency.

## Running locally

Open `index.html` in a modern browser from a local or static server (the page loads CSVs with D3; some environments block `file://` fetches). No build step is required.

## How each section uses the data

### Learn

- Scatter plot: median earnings (1 or 4 years after completion) vs. admission rate, completer debt, in-state tuition, or out-of-state tuition.
- Filters: institution segments (public, private nonprofit, for-profit), optional “prestigious” private nonprofit highlight, and state.
- Narrative callouts summarize patterns for the current filter set.

**Script:** `js/learn_earnings_scatter.js`

### Explore

- U.S. map (Albers USA) with one dot per institution that has lat/long.
- **Color by** median earnings (1 or 4 years), earnings-to-debt ratio, completer debt, in-state tuition, or Pell rate.
- **Size by** median earnings (1 or 4 years), in-state tuition, or completer debt.
- State filter, zoom controls, tooltips, and click-to-add for Compare.
- Detail panel combines institution-level metrics with top field-of-study rows from the FoS file.

**Script:** `js/new_script.js` (map, card, search, Compare)

### Compare

- Search the full parsed institution list (not only map-eligible rows), filter by state, add schools to a tray.
- Toggle in-state vs out-of-state tuition for the comparison charts.
- For each saved school: summary tiles (debt, tuition, earnings-to-debt) and a line chart of the two earnings horizons with horizontal reference lines for completer debt and published tuition.

## Overall Development Process

We used AI to support all stages of the development process.
After the proposal, we developed an initial website draft with three sections to interact with a subset of the data.
Once this was in a usable state and reviewed during the peer review session, the dataset was switched over to the full one.
An About section was added to the webpage to provide additional information.
Each section was developed and finalized one after another, starting with Learn, then Explore, and finally Compare.

### Team Contributions (Also shown on the About page)

We all worked together throughout the entire process while also focusing on different parts.

Shayan Sobhani - Data Integration/ Analysis & about.html
- Created the about.html webpage and helped with the styling portions of the webpage.
- Documented project structure and data preparation within the multiple datasets we found from the College Scorecard.
- Cross tested load performance, missing values, and map eligibility.
- Helped with the compare section of the webpage and the functinality of how the UI worked, as before we had a different version.
- Helped navigate Cursor and Claude to generate the code for the maps and figure out which datasets align the best with the story that we wanted to tell.

Elijah Verzi - Data Analysis and Webpage Development
- Researched various potential datasets and identified the College Scorecard as the most relevant and comprehensive source of data for this project.
- Developed the general layout and narrative of the webpage, landing on a Learn, Explore, and Compare structure that would be intuitive and beneficial for the user.
- Analyzed the College Scorecard dataset documentation to determine the necessary data fields to extract and integrate into the project.
- Guided Cursor to generate the initial code for the scatter plot, and reviewed and adjusted the code to ensure it met our needs and requirements.

Imirie Billey - Data Integration & Visualization Functionality
- Designed code for different iterations of the Learn and Compare sections.
- Ensured the Learn and Compare sections are well-integrated and provide a good user experience.
- Integrated the final dataset we curated into the map and card sections, ensuring that the data is accurately represented and visually appealing.
- Expanded the functionality of the Compare section to include additional features and improvements.
- Tested the map and card sections for functionality, usability, and performance, making adjustments as needed to optimize the user experience.

Jonathan Vo - Initial Webpage Setup, Explore Iteration
- Implemented the initial data loading, visualizations, and page layout for the Learn, Explore, and Compare sections agreed upon using a subset of the final dataset.
- Iterate through the design of the Explore map visualization along with its functional connection to the Compare section through Codex prompting.
- Tweaked how data is served to support loading the complete College Scorecard dataset on GitHub Pages.

## Dataset Files

These files power `index.html` as shipped. They live in `data/college_scorecard_data/` and are read directly in the browser.

### `Most-Recent-Cohorts-Institution.csv`

Institution-level “most recent cohorts” extract from College Scorecard. Each row is one campus.

**Identity & geography**

- `UNITID`, `INSTNM`, `CITY`, `STABBR`
- `LATITUDE`, `LONGITUDE` (map points; institutions without coordinates are omitted from the map but remain searchable in Compare)

**Admissions & sector**

- `CONTROL` (public / private nonprofit / private for-profit), `ADM_RATE` (admission rate for the scatter horizontal axis when selected)

**Cost & aid signals**

- `TUITIONFEE_IN`, `TUITIONFEE_OUT` (published tuition; used on Learn, map encodings, and Compare)
- `ROOMBOARD_ON`, `BOOKSUPPLY` (optional cost context in parsed objects)
- `NPT4_PUB`, `NPT4_PRIV` (net price fields surfaced as estimated annual cost where parsed)
- `PCTPELL_DCS_POOLED_SUPP` (Pell grant rate; map coloring option)

**Debt & repayment**

- `GRAD_DEBT_MDN` (median graduate debt for completers—primary debt measure)
- `DEBT_MDN`, `GRAD_DEBT_MDN10YR_SUPP` (overall median debt and monthly payment where used)

**Earnings after completion**

- `MD_EARN_WNE_1YR` — median earnings one year after completion  
- `MD_EARN_WNE_4YR` — median earnings four years after completion  

These drive the Learn vertical axis and map metric/size options, and appear in the map card and Compare charts.

**Derived in code**

- **Earnings-to-debt ratio** — one-year median earnings divided by completer debt when both are present and debt is greater than zero (`js/new_script.js`).

### `Most-Recent-Cohorts-Field-of-Study.csv`

Program-level extract keyed by `UNITID`. Used to enrich the **Explore** detail card when you hover or focus an institution.

**Columns consumed**

- `UNITID`, `INSTNM`, `CIPCODE`, `CIPDESC`
- `EARN_MDN_1YR`, `EARN_MDN_4YR`, `EARN_COUNT_WNE_1YR` (sorting “top” majors by count where available)

**Script:** `js/new_script.js`

### Loading overlay

**Script:** `js/app_loading.js` — coordinates dismissal of the full-page overlay once the scatter and main bundle have finished their first CSV loads.

## Source and updates

- **College Scorecard data:** [https://collegescorecard.ed.gov/data/](https://collegescorecard.ed.gov/data/)
- When you drop in newer “most recent cohorts” files, keep variable names consistent with `parseInstitutionRow` and `parseFieldOfStudyRow` in `js/new_script.js` and the scatter loader in `js/learn_earnings_scatter.js`.

## Project pages

| File | Purpose |
|------|---------|
| `index.html` | Main visualization (Learn, Explore, Compare) |
| `about.html` | README-style documentation, team contributions, AI disclosure |
