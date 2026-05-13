const metricLabels = {
  y1P50Earnings: "Median year-1 earnings",
  y5P50Earnings: "Median year-5 earnings",
  y10P50Earnings: "Median year-10 earnings",
  earningsDebtRatio: "Year-1 earnings-to-debt ratio",
  completerDebt: "Completer debt",
  tuitionInState: "In-state tuition",
  tuitionOutState: "Out-of-state tuition",
  pellGrantRate: "Pell grant rate",
  totalCostEstimate: "Estimated annual cost",
  monthlyPayment: "Monthly payment"
};

const COHORT_SCORECARD = "SCORECARD";
const cohortOrder = ["0000", "2001", "2004", "2007", "2010", "2011", "2013", "2016", "2019"];

const stateFipsToMeta = {
  "01": { abbr: "AL", name: "Alabama" },
  "02": { abbr: "AK", name: "Alaska" },
  "04": { abbr: "AZ", name: "Arizona" },
  "05": { abbr: "AR", name: "Arkansas" },
  "06": { abbr: "CA", name: "California" },
  "08": { abbr: "CO", name: "Colorado" },
  "09": { abbr: "CT", name: "Connecticut" },
  "10": { abbr: "DE", name: "Delaware" },
  "11": { abbr: "DC", name: "District of Columbia" },
  "12": { abbr: "FL", name: "Florida" },
  "13": { abbr: "GA", name: "Georgia" },
  "15": { abbr: "HI", name: "Hawaii" },
  "16": { abbr: "ID", name: "Idaho" },
  "17": { abbr: "IL", name: "Illinois" },
  "18": { abbr: "IN", name: "Indiana" },
  "19": { abbr: "IA", name: "Iowa" },
  "20": { abbr: "KS", name: "Kansas" },
  "21": { abbr: "KY", name: "Kentucky" },
  "22": { abbr: "LA", name: "Louisiana" },
  "23": { abbr: "ME", name: "Maine" },
  "24": { abbr: "MD", name: "Maryland" },
  "25": { abbr: "MA", name: "Massachusetts" },
  "26": { abbr: "MI", name: "Michigan" },
  "27": { abbr: "MN", name: "Minnesota" },
  "28": { abbr: "MS", name: "Mississippi" },
  "29": { abbr: "MO", name: "Missouri" },
  "30": { abbr: "MT", name: "Montana" },
  "31": { abbr: "NE", name: "Nebraska" },
  "32": { abbr: "NV", name: "Nevada" },
  "33": { abbr: "NH", name: "New Hampshire" },
  "34": { abbr: "NJ", name: "New Jersey" },
  "35": { abbr: "NM", name: "New Mexico" },
  "36": { abbr: "NY", name: "New York" },
  "37": { abbr: "NC", name: "North Carolina" },
  "38": { abbr: "ND", name: "North Dakota" },
  "39": { abbr: "OH", name: "Ohio" },
  "40": { abbr: "OK", name: "Oklahoma" },
  "41": { abbr: "OR", name: "Oregon" },
  "42": { abbr: "PA", name: "Pennsylvania" },
  "44": { abbr: "RI", name: "Rhode Island" },
  "45": { abbr: "SC", name: "South Carolina" },
  "46": { abbr: "SD", name: "South Dakota" },
  "47": { abbr: "TN", name: "Tennessee" },
  "48": { abbr: "TX", name: "Texas" },
  "49": { abbr: "UT", name: "Utah" },
  "50": { abbr: "VT", name: "Vermont" },
  "51": { abbr: "VA", name: "Virginia" },
  "53": { abbr: "WA", name: "Washington" },
  "54": { abbr: "WV", name: "West Virginia" },
  "55": { abbr: "WI", name: "Wisconsin" },
  "56": { abbr: "WY", name: "Wyoming" }
};

const state = {
  allRows: [],
  allInstitutions: [],
  scorecardInstitutions: [],
  pseoAllRows: [],
  fieldOfStudyRows: [],
  selectedCohort: COHORT_SCORECARD,
  selectedState: "All States",
  mapMetric: "y1P50Earnings",
  mapSize: "y1P50Earnings",
  selectedCollege: null,
  stateOptions: ["All States"],
  savedColleges: [],
  projectionResidency: "tuitionInState"
};

const formatCurrency = d3.format("$,.0f");

initialize();

async function initialize() {
  // Show initial loading indicator
  const svg = d3.select("#us-map");
  svg.selectAll("*").remove();
  svg.append("text")
    .attr("x", "50%")
    .attr("y", "50%")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", "var(--muted)")
    .text("Loading data...");

  const [institutionRows, fieldRows, pseoRows] = await Promise.all([
    d3.csv("data/college_scorecard_data/Most-Recent-Cohorts-Institution.csv"),
    d3.csv("data/college_scorecard_data/Most-Recent-Cohorts-Field-of-Study.csv", parseFieldOfStudyRow),
    d3.csv("data/combined_pseo_all_cohorts.csv")
  ]);

  const parsedInstitutions = institutionRows.map(parseInstitutionRow);
  state.scorecardInstitutions = parsedInstitutions;
  state.pseoAllRows = pseoRows.map(parsePseoRow);
  state.fieldOfStudyRows = fieldRows;

  const pseoCohortOptions = [...new Set(state.pseoAllRows.map((d) => d.gradCohort))]
    .filter((c) => c != null && c !== "")
    .sort((a, b) => cohortOrder.indexOf(a) - cohortOrder.indexOf(b));
  const cohortSelectValues = [COHORT_SCORECARD, ...pseoCohortOptions];

  if (!cohortSelectValues.includes(state.selectedCohort)) {
    state.selectedCohort = COHORT_SCORECARD;
  }

  applyCohortDataset();

  populateSelect("#global-cohort", cohortSelectValues, state.selectedCohort, formatExploreCohortLabel);
  populateSelect("#map-state", state.stateOptions, state.selectedState);
  populateSelect("#map-metric", Object.keys(metricLabels), state.mapMetric, (d) => metricLabels[d]);
  populateSelect("#map-size", [
    "y1P50Earnings",
    "y5P50Earnings",
    "y10P50Earnings",
    "totalCostEstimate",
    "completerDebt"
  ], state.mapSize, (d) => metricLabels[d]);

  initializeControls();
  initializeDecideControls();
  d3.select("#back-to-country").on("click", () => {
    state.selectedState = "All States";
    state.selectedCollege = null;
    d3.select("#map-state").property("value", "All States");
    renderMapSection();
  });
  renderSavedColleges();
  renderProjectionSection();
  renderDecideSearchHint();
  renderMapSection();
  window.addEventListener("resize", () => {
    renderMapSection();
    renderProjectionSection();
  });
}

function formatExploreCohortLabel(value) {
  if (value === COHORT_SCORECARD) {
    return "Most recent (College Scorecard)";
  }
  return value === "0000" ? "Aggregate (0000)" : String(value);
}

function applyCohortDataset() {
  if (state.selectedCohort === COHORT_SCORECARD) {
    state.allInstitutions = state.scorecardInstitutions;
    state.allRows = state.scorecardInstitutions.filter((row) => row.lat != null && row.lon != null);
  } else {
    const cohortRows = state.pseoAllRows.filter((d) => String(d.gradCohort) === String(state.selectedCohort));
    state.allInstitutions = cohortRows;
    state.allRows = cohortRows.filter((row) => row.lat != null && row.lon != null);
  }

  state.stateOptions = [
    "All States",
    ...Array.from(new Set(state.allRows.map((d) => d.state))).sort(d3.ascending)
  ];

  if (!state.stateOptions.includes(state.selectedState)) {
    state.selectedState = "All States";
    d3.select("#map-state").property("value", "All States");
  }
}

function parsePseoRow(row) {
  const numericFields = [
    "lat", "lon", "tuitionInState", "tuitionOutState", "roomCost", "bookCost", "totalCostEstimate",
    "loanPrincipal", "pellGrantRate", "federalLoanRate", "studentsWithAnyLoan", "medianDebtOverall",
    "completerDebt", "monthlyPayment", "gradCohortYears", "y1P25Earnings", "y1P50Earnings", "y1P75Earnings",
    "y1GradsEarn", "y1IpedsCount", "y5P25Earnings", "y5P50Earnings", "y5P75Earnings", "y5GradsEarn",
    "y5IpedsCount", "y10P25Earnings", "y10P50Earnings", "y10P75Earnings", "y10GradsEarn", "y10IpedsCount",
    "earningsDebtRatio"
  ];

  const parsed = { ...row };
  for (const field of numericFields) {
    parsed[field] = row[field] === "" ? null : +row[field];
  }
  parsed.unitid = row.pseoInstitutionId;
  return parsed;
}

function parseInstitutionRow(row) {
  const parsed = {
    unitid: row.UNITID,
    name: row.INSTNM,
    city: row.CITY,
    state: row.STABBR,
    lat: row.LATITUDE === "" ? null : +row.LATITUDE,
    lon: row.LONGITUDE === "" ? null : +row.LONGITUDE,
    tuitionInState: row.TUITIONFEE_IN === "" ? null : +row.TUITIONFEE_IN,
    tuitionOutState: row.TUITIONFEE_OUT === "" ? null : +row.TUITIONFEE_OUT,
    roomCost: row.ROOMBOARD_ON === "" ? null : +row.ROOMBOARD_ON,
    bookCost: row.BOOKSUPPLY === "" ? null : +row.BOOKSUPPLY,
    totalCostEstimate: row.NPT4_PUB === "" ? (row.NPT4_PRIV === "" ? null : +row.NPT4_PRIV) : +row.NPT4_PUB,
    completerDebt: row.GRAD_DEBT_MDN === "" ? null : +row.GRAD_DEBT_MDN,
    medianDebtOverall: row.DEBT_MDN === "" ? null : +row.DEBT_MDN,
    monthlyPayment: row.GRAD_DEBT_MDN10YR_SUPP === "" ? null : +row.GRAD_DEBT_MDN10YR_SUPP,
    pellGrantRate: row.PCTPELL_DCS_POOLED_SUPP === "" ? null : +row.PCTPELL_DCS_POOLED_SUPP,
    y1P50Earnings: row.MD_EARN_WNE_P6 === "" ? null : +row.MD_EARN_WNE_P6,
    y5P50Earnings: row.MD_EARN_WNE_P8 === "" ? null : +row.MD_EARN_WNE_P8,
    y10P50Earnings: row.MD_EARN_WNE_P10 === "" ? null : +row.MD_EARN_WNE_P10,
    earningsDebtRatio: null,
    gradCohort: "Most Recent"
  };

  if (parsed.y1P50Earnings != null && parsed.completerDebt != null && parsed.completerDebt > 0) {
    parsed.earningsDebtRatio = parsed.y1P50Earnings / parsed.completerDebt;
  }

  return parsed;
}

function parseFieldOfStudyRow(row) {
  return {
    unitid: row.UNITID,
    instnm: row.INSTNM,
    cipCode: row.CIPCODE,
    cipDesc: row.CIPDESC,
    earnMdn1yr: row.EARN_MDN_1YR === "" ? null : +row.EARN_MDN_1YR,
    earnMdn4yr: row.EARN_MDN_4YR === "" ? null : +row.EARN_MDN_4YR,
    earnMdn5yr: row.EARN_MDN_5YR === "" ? null : +row.EARN_MDN_5YR,
    earnCount1yr: row.EARN_COUNT_WNE_1YR === "" ? 0 : +row.EARN_COUNT_WNE_1YR
  };
}

function initializeControls() {
  d3.select("#global-cohort").on("change", (event) => {
    state.selectedCohort = event.target.value;
    state.selectedCollege = null;
    state.savedColleges = [];
    applyCohortDataset();
    populateSelect("#map-state", state.stateOptions, state.selectedState);
    d3.select("#map-state").property("value", state.selectedState);
    const searchState = d3.select("#decide-search-state");
    if (!searchState.empty()) {
      const states = ["All States", ...Array.from(new Set(state.allInstitutions.map((d) => d.state))).sort(d3.ascending)];
      populateSelect("#decide-search-state", states, "All States");
    }
    renderSavedColleges();
    renderProjectionSection();
    renderDecideSearchHint();
    renderMapSection();
  });

  d3.select("#map-metric").on("change", (event) => {
    state.mapMetric = event.target.value;
    renderMapSection();
  });

  d3.select("#map-state").on("change", (event) => {
    state.selectedState = event.target.value;
    state.selectedCollege = null;
    renderMapSection();
  });

  d3.select("#map-size").on("change", (event) => {
    state.mapSize = event.target.value;
    renderMapSection();
  });
}

function initializeDecideControls() {
  const residency = d3.select("#projection-residency");
  if (residency.empty()) {
    return;
  }

  residency.on("change", (event) => {
    state.projectionResidency = event.target.value;
    renderProjectionSection();
  });

  const searchState = d3.select("#decide-search-state");
  const searchInput = d3.select("#decide-search");
  if (searchState.empty() || searchInput.empty()) {
    return;
  }

  const states = ["All States", ...Array.from(new Set(state.allInstitutions.map((d) => d.state))).sort(d3.ascending)];
  populateSelect("#decide-search-state", states, "All States");

  const onSearch = () => {
    runDecideSearch(searchInput.property("value"), searchState.property("value"));
  };

  searchInput.on("input", onSearch);
  searchState.on("change", onSearch);
}

function renderDecideSearchHint() {
  const box = d3.select("#decide-search-results");
  if (box.empty()) {
    return;
  }
  if (d3.select("#decide-search").property("value")?.trim().length >= 2) {
    return;
  }
  box.selectAll("*").remove();
  box.append("p")
    .attr("class", "footnote")
    .text("Type at least 2 characters to search the full Scorecard institution list, or click a map dot after drilling into a state.");
}

function runDecideSearch(query, stateFilter) {
  const box = d3.select("#decide-search-results");
  if (box.empty()) {
    return;
  }

  const q = query.trim().toLowerCase();
  box.selectAll("*").remove();

  if (q.length < 2) {
    renderDecideSearchHint();
    return;
  }

  let pool = state.allInstitutions;
  if (stateFilter && stateFilter !== "All States") {
    pool = pool.filter((d) => d.state === stateFilter);
  }

  const matches = pool
    .filter((d) => d.name && d.name.toLowerCase().includes(q))
    .sort((a, b) => d3.ascending(a.name, b.name))
    .slice(0, 24);

  if (!matches.length) {
    box.append("p").attr("class", "footnote").text("No matches. Try a different spelling or state filter.");
    return;
  }

  const ul = box.append("ul").attr("class", "decide-search-list");
  ul.selectAll("li")
    .data(matches)
    .join("li")
    .html((d) => `<button type="button" class="decide-pick-btn" data-unitid="${d.unitid}">${d.name} <span class="meta">— ${d.city || ""}, ${d.state}</span></button>`);

  ul.selectAll(".decide-pick-btn").on("click", function() {
    const id = this.getAttribute("data-unitid");
    const row = state.allInstitutions.find((d) => String(d.unitid) === String(id));
    if (row) {
      addToSaved(row);
      d3.select("#decide-search").property("value", "");
      renderDecideSearchHint();
    }
  });
}

function addToSaved(college) {
  if (!college || state.savedColleges.some((c) => String(c.unitid) === String(college.unitid))) {
    return;
  }
  state.savedColleges.push(college);
  renderSavedColleges();
  renderProjectionSection();
}

function renderSavedColleges() {
  const container = d3.select("#saved-colleges");
  if (container.empty()) {
    return;
  }
  container.selectAll("*").remove();
  if (!state.savedColleges.length) {
    container.append("p").text("No colleges in your comparison yet. Drill into a state on the map and click a dot, or search above.");
    return;
  }
  const list = container.append("ul").attr("class", "saved-colleges-list");
  list.selectAll("li")
    .data(state.savedColleges)
    .join("li")
    .html((d) => `<span>${d.name} (${d.state})</span><button class="remove-btn" data-unitid="${d.unitid}">Remove</button>`);
  list.selectAll(".remove-btn").on("click", function() {
    const id = this.getAttribute("data-unitid");
    state.savedColleges = state.savedColleges.filter((c) => String(c.unitid) !== String(id));
    renderSavedColleges();
    renderProjectionSection();
  });
}

function renderEmptySvgMessage(svg, width, height, message) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--muted)")
    .text(message);
}

function dataCohortCaption() {
  if (state.selectedCohort === COHORT_SCORECARD) {
    return "College Scorecard (most recent)";
  }
  return `PSEO · Graduation cohort ${state.selectedCohort}`;
}

function renderProjectionSection() {
  const container = d3.select(".projection-charts");
  if (container.empty()) {
    return;
  }
  container.selectAll("*").remove();

  state.savedColleges.forEach((college) => {
    const article = container.append("article").attr("class", "chart-panel");
    const tuition = college[state.projectionResidency] ?? college.tuitionInState ?? 0;
    const totalCost = tuition + (college.roomCost || 0) + (college.bookCost || 0);
    const debt = college.completerDebt ?? college.medianDebtOverall ?? 0;

    article.append("div").attr("class", "chart-header").html(`
      <div>
        <h3>${college.name}</h3>
        <p>${college.city || "Unknown city"}, ${college.state} | ${dataCohortCaption()}</p>
      </div>
    `);

    article.append("div").attr("class", "summary-tiles").html(`
      <div class="summary-tile">
        <span class="summary-label">Completer debt</span>
        <strong>${formatValue("completerDebt", debt)}</strong>
      </div>
      <div class="summary-tile">
        <span class="summary-label">Estimated annual cost</span>
        <strong>${formatValue("totalCostEstimate", totalCost)}</strong>
      </div>
      <div class="summary-tile">
        <span class="summary-label">Year-1 earnings to debt</span>
        <strong>${formatValue("earningsDebtRatio", college.earningsDebtRatio)}</strong>
      </div>
    `);

    const svg = article.append("svg").attr("aria-label", `Earnings chart for ${college.name}`);
    renderEarningsHorizonChartForCollege(svg, college, debt, totalCost);
  });
}

function renderEarningsHorizonChartForCollege(svg, college, debt, totalCost) {
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;
  const margin = { top: 36, right: 24, bottom: 50, left: 72 };

  svg.selectAll("*").remove();

  const earningsPoints = [
    { year: 1, value: college.y1P50Earnings, label: "Year 1" },
    { year: 5, value: college.y5P50Earnings, label: "Year 5" },
    { year: 10, value: college.y10P50Earnings, label: "Year 10" }
  ].filter((d) => d.value != null);

  if (!earningsPoints.length) {
    return renderEmptySvgMessage(svg, width, height, "No earnings horizons are available for this institution.");
  }

  const cost = Number.isFinite(totalCost) && totalCost > 0 ? totalCost : null;
  const debtVal = Number.isFinite(debt) && debt > 0 ? debt : 0;
  const yMax = d3.max([
    ...earningsPoints.map((d) => d.value),
    debtVal,
    cost ?? 0
  ]) * 1.15;

  const x = d3.scalePoint()
    .domain(earningsPoints.map((d) => d.label))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, yMax])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
    .call((g) => g.select(".domain").remove());

  const line = d3.line()
    .x((d) => x(d.label))
    .y((d) => y(d.value))
    .curve(d3.curveMonotoneX);

  svg.append("path")
    .datum(earningsPoints)
    .attr("fill", "none")
    .attr("stroke", "var(--teal)")
    .attr("stroke-width", 4)
    .attr("d", line);

  if (debtVal > 0) {
    svg.append("line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", y(debtVal))
      .attr("y2", y(debtVal))
      .attr("stroke", "var(--accent)")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", "8 6");

    svg.append("text")
      .attr("x", width - margin.right - 4)
      .attr("y", y(debtVal) - 6)
      .attr("text-anchor", "end")
      .attr("font-size", 11)
      .attr("fill", "var(--accent)")
      .attr("font-weight", 600)
      .text("Completer debt");
  }

  if (cost != null && cost > 0) {
    svg.append("line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", y(cost))
      .attr("y2", y(cost))
      .attr("stroke", "var(--gold)")
      .attr("stroke-width", 3)
      .attr("stroke-dasharray", "4 6");

    svg.append("text")
      .attr("x", width - margin.right - 4)
      .attr("y", y(cost) + (cost < debtVal ? 14 : -6))
      .attr("text-anchor", "end")
      .attr("font-size", 11)
      .attr("fill", "var(--gold)")
      .attr("font-weight", 600)
      .text("Est. annual cost (tuition view)");
  }

  const legend = svg.append("g").attr("class", "projection-inline-legend");
  legend.append("text")
    .attr("x", margin.left)
    .attr("y", 16)
    .attr("font-size", 11)
    .attr("fill", "var(--muted)")
    .text("Teal: median earnings by year after completion. Lines use the tuition toggle for cost.");

  svg.append("g")
    .selectAll("circle")
    .data(earningsPoints)
    .join("circle")
    .attr("cx", (d) => x(d.label))
    .attr("cy", (d) => y(d.value))
    .attr("r", 6)
    .attr("fill", "var(--teal)")
    .attr("stroke", "#fff")
    .attr("stroke-width", 2);

  svg.append("g")
    .selectAll("text.value")
    .data(earningsPoints)
    .join("text")
    .attr("x", (d) => x(d.label))
    .attr("y", (d) => y(d.value) - 12)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .text((d) => formatCurrency(d.value));

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .call((g) => g.select(".domain").remove());

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickFormat((d) => formatCurrency(d)))
    .call((g) => g.select(".domain").remove());
}

function populateSelect(selector, values, selectedValue, formatter = (d) => d) {
  const select = d3.select(selector);
  select.selectAll("option").remove();
  select.selectAll("option")
    .data(values)
    .join("option")
    .attr("value", (d) => d)
    .property("selected", (d) => String(d) === String(selectedValue))
    .text((d) => formatter(d));
}

function getFilteredInstitutions() {
  return state.allRows.filter((d) =>
    (state.selectedState === "All States" || d.state === state.selectedState) &&
    d[state.mapMetric] != null &&
    d[state.mapSize] != null
  );
}

function getStateMeta(feature) {
  return stateFipsToMeta[String(feature.id).padStart(2, "0")];
}

function computeStateMetrics() {
  const stateMetrics = d3.rollup(
    state.allRows.filter((d) => d[state.mapMetric] != null),
    (rows) => ({
      count: rows.length,
      metric: d3.mean(rows, (row) => row[state.mapMetric])
    }),
    (row) => row.state
  );

  return stateMetrics;
}

async function renderMapSection() {
  const svg = d3.select("#us-map");
  const width = svg.node().clientWidth;
  const height = Math.max(520, Math.round(width * 0.62));
  const tooltip = d3.select("#map-tooltip");
  const mapWrap = d3.select(".map-wrap");

  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.selectAll("*").remove();

  // Show loading indicator
  const loadingGroup = svg.append("g").attr("class", "loading");
  loadingGroup.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("fill", "var(--muted)")
    .text("Loading map...");

  const institutions = getFilteredInstitutions().filter((d) => d.lat != null && d.lon != null);
  const stateMetrics = computeStateMetrics();

  const stateMetricValues = Array.from(stateMetrics.values())
    .map((metrics) => metrics.metric)
    .filter((value) => value != null);

  if (state.selectedState === "All States" && !stateMetricValues.length) {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--muted)")
      .text("No state-level data is available for the selected metric.");
    return;
  }

  if (state.selectedState !== "All States" && !institutions.length) {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--muted)")
      .text("No colleges match the current state or metric filter.");
    return;
  }

  const colorExtent = state.selectedState === "All States"
    ? d3.extent(stateMetricValues)
    : d3.extent(institutions, (d) => d[state.mapMetric]);

  if (colorExtent[0] === colorExtent[1]) {
    colorExtent[1] = colorExtent[0] === 0 ? 1 : colorExtent[0] * 1.1;
  }

  const color = d3.scaleLinear().domain(colorExtent).range(["#e58d4a", "#1f8a70"]);
  const radius = d3.scaleSqrt().domain(d3.extent(institutions, (d) => d[state.mapSize])).range([4, 16]);

  renderLegend(color, colorExtent);

  try {
    const us = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");
    const statesFeature = topojson.feature(us, us.objects.states);
    const projection = d3.geoAlbersUsa().fitSize([width, height], statesFeature);
    const path = d3.geoPath(projection);

    const zoomGroup = svg.append("g").attr("class", "zoom-group");
    const zoom = d3.zoom()
      .scaleExtent(state.selectedState === "All States" ? [1, 12] : [1, 500])
      .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
        zoomGroup.selectAll("circle").attr("r", (d) => Math.max(0.02, radius(d[state.mapSize]) / event.transform.k));
        zoomGroup.selectAll("circle").attr("stroke-width", (d) => Math.max(0.005, 1.2 / event.transform.k));
      });

    svg.style("touch-action", "none");
    svg.call(zoom);
    svg.node().__zoom_ref = zoom;

    function resetZoom() {
      svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
    }

    function zoomToFeature(feature) {
      const [[x0, y0], [x1, y1]] = path.bounds(feature);
      const dx = x1 - x0;
      const dy = y1 - y0;
      const x = (x0 + x1) / 2;
      const y = (y0 + y1) / 2;
      const scale = Math.min(12, 0.9 / Math.max(dx / width, dy / height));
      const translate = [width / 2 - scale * x, height / 2 - scale * y];
      svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
    }

    const pathGroup = zoomGroup.append("g");
    pathGroup.append("g")
      .selectAll("path")
      .data(statesFeature.features)
      .join("path")
      .attr("d", path)
      .attr("fill", (feature) => {
        if (state.selectedState === "All States") {
          const meta = getStateMeta(feature);
          const row = meta ? stateMetrics.get(meta.abbr) : null;
          return row && row.metric != null ? color(row.metric) : "#f0f1f4";
        }
        return "#f6f0e6";
      })
      .attr("stroke", "rgba(22, 32, 51, 0.16)")
      .attr("stroke-width", 1)
      .style("cursor", state.selectedState === "All States" ? "pointer" : "default")
      .on("click", (event, feature) => {
        if (state.selectedState !== "All States") {
          return;
        }
        const meta = getStateMeta(feature);
        if (meta && state.stateOptions.includes(meta.abbr)) {
          state.selectedState = meta.abbr;
          state.selectedCollege = null;
          d3.select("#map-state").property("value", meta.abbr);
          renderMapSection();
        }
      })
      .on("mouseover", (event, feature) => {
        if (state.selectedState !== "All States") {
          return;
        }
        const meta = getStateMeta(feature);
        const row = meta ? stateMetrics.get(meta.abbr) : null;
        if (!meta) {
          hideTooltip(tooltip);
          return;
        }

        const metricLabel = metricLabels[state.mapMetric];
        const metricValue = row && row.metric != null ? formatValue(state.mapMetric, row.metric) : "No data";
        const countLabel = row ? `${row.count} institutions` : "No institutions";

        tooltip.classed("hidden", false)
          .html(`
            <strong>${meta.name}</strong>
            <p class="meta">${countLabel}</p>
            <p>${metricLabel}: ${metricValue}</p>
            <p class="meta" style="margin-top:6px;color:var(--teal)">Click to drill into this state.</p>
          `);
        moveTooltip(event, width, height, mapWrap, tooltip);
      })
      .on("mousemove", (event) => {
        if (state.selectedState === "All States") {
          moveTooltip(event, width, height, mapWrap, tooltip);
        }
      })
      .on("mouseout", () => hideTooltip(tooltip));

    if (state.selectedState !== "All States") {
      const circleGroup = zoomGroup.append("g").attr("class", "institution-group");
      const circles = circleGroup.selectAll("circle")
        .data(institutions)
        .join("circle")
        .attr("cx", (d) => projection([d.lon, d.lat])?.[0] ?? -100)
        .attr("cy", (d) => projection([d.lon, d.lat])?.[1] ?? -100)
        .attr("r", (d) => radius(d[state.mapSize]))
        .attr("fill", (d) => color(d[state.mapMetric]))
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1.2)
        .attr("opacity", 0.9)
        .on("mouseover", (event, d) => showTooltip(d, event, width, height, mapWrap, tooltip))
        .on("mousemove", (event, d) => moveTooltip(event, width, height, mapWrap, tooltip))
        .on("mouseout", () => hideTooltip(tooltip))
        .on("click", (event, d) => {
          selectCollege(d);
          addToSaved(d);
        });

      const identityTransform = d3.zoomIdentity;
      circles.attr("r", (d) => Math.max(0.2, radius(d[state.mapSize]) / identityTransform.k));
      circles.attr("stroke-width", (d) => Math.max(0.02, 1.2 / identityTransform.k));
    }

    d3.select("#zoom-in").on("click", () => svg.transition().call(zoom.scaleBy, 1.5));
    d3.select("#zoom-out").on("click", () => svg.transition().call(zoom.scaleBy, 1 / 1.5));
    d3.select("#zoom-reset").on("click", () => resetZoom());

    if (state.selectedState !== "All States") {
      const stateFeature = statesFeature.features.find((feature) => getStateMeta(feature)?.abbr === state.selectedState);
      if (stateFeature) {
        zoomToFeature(stateFeature);
      }
    } else {
      resetZoom();
    }

    loadingGroup.remove();
  } catch (error) {
    loadingGroup.select("text").text("Unable to load basemap data. Please check your network connection.");
  }

  d3.select("#back-to-country").classed("hidden", state.selectedState === "All States");

  if (state.selectedState === "All States") {
    d3.select("#college-card").html(
      `<p>Click a state to inspect institution-level outcomes.</p>`
    );
  } else if (state.selectedCollege) {
    updateCollegeCard(state.selectedCollege);
  } else {
    d3.select("#college-card").html(
      `<p>Click an institution dot to preview the profile and add it to Section 3 below.</p>`
    );
  }
}

function showTooltip(d, event, width, height, mapWrap, tooltip) {
  tooltip.classed("hidden", false)
    .html(`
      <strong>${d.name}</strong>
      <p class="meta">${d.city || "Unknown city"}, ${d.state}</p>
      <p>${metricLabels[state.mapMetric]}: ${formatValue(state.mapMetric, d[state.mapMetric])}</p>
      <p>${metricLabels[state.mapSize]}: ${formatValue(state.mapSize, d[state.mapSize])}</p>
      <p class="meta" style="margin-top:6px;color:var(--teal)">Click the point to preview the card and add to Decide below.</p>
    `);
  moveTooltip(event, width, height, mapWrap, tooltip);
}

function moveTooltip(event, width, height, mapWrap, tooltip) {
  const [pointerX, pointerY] = d3.pointer(event, mapWrap.node());
  const tooltipLeft = pointerX > width * 0.72 ? pointerX - 260 : pointerX + 18;
  const tooltipTop = pointerY > height * 0.72 ? pointerY - 138 : pointerY + 18;

  tooltip.style("left", `${Math.max(8, tooltipLeft)}px`)
    .style("top", `${Math.max(8, tooltipTop)}px`);
}

function hideTooltip(tooltip) {
  tooltip.classed("hidden", true);
}

function selectCollege(college) {
  state.selectedCollege = college;
  updateCollegeCard(college);
}

function renderLegend(colorScale, extent) {
  d3.select("#map-legend").html(`
    <span><i class="legend-swatch" style="background:${colorScale(extent[0])}"></i>Lower</span>
    <span><i class="legend-swatch" style="background:${colorScale((extent[0] + extent[1]) / 2)}"></i>Mid</span>
    <span><i class="legend-swatch" style="background:${colorScale(extent[1])}"></i>Higher</span>
  `);
}

function updateCollegeCard(college) {
  const matchingFOS = state.fieldOfStudyRows
    .filter((row) => String(row.unitid) === String(college.unitid))
    .sort((a, b) => d3.descending(a.earnCount1yr, b.earnCount1yr))
    .slice(0, 3);

  const fosHtml = matchingFOS.length
    ? `<div class="metric-grid">
        <div class="metric-tile">
          <span>Top major</span>
          <strong>${matchingFOS[0].cipDesc || "N/A"}</strong>
        </div>
        <div class="metric-tile">
          <span>Year-1 earnings</span>
          <strong>${formatValue("y1P50Earnings", matchingFOS[0].earnMdn1yr)}</strong>
        </div>
        <div class="metric-tile">
          <span>Majors with data</span>
          <strong>${matchingFOS.length}</strong>
        </div>
      </div>`
    : "<p class=\"meta\">No field-of-study details available for this institution.</p>";

  d3.select("#college-card").html(`
    <strong>${college.name}</strong>
    <p class="meta">${college.city || "Unknown city"}, ${college.state} · ${dataCohortCaption()}</p>
    <div class="metric-grid">
      <div class="metric-tile">
        <span>Median Year-1 Earnings</span>
        <strong>${formatValue("y1P50Earnings", college.y1P50Earnings)}</strong>
      </div>
      <div class="metric-tile">
        <span>Median Year-5 Earnings</span>
        <strong>${formatValue("y5P50Earnings", college.y5P50Earnings)}</strong>
      </div>
      <div class="metric-tile">
        <span>Median Year-10 Earnings</span>
        <strong>${formatValue("y10P50Earnings", college.y10P50Earnings)}</strong>
      </div>
      <div class="metric-tile">
        <span>Completer Debt</span>
        <strong>${formatValue("completerDebt", college.completerDebt)}</strong>
      </div>
      <div class="metric-tile">
        <span>In-State Tuition</span>
        <strong>${formatValue("tuitionInState", college.tuitionInState)}</strong>
      </div>
      <div class="metric-tile">
        <span>Pell Grant Rate</span>
        <strong>${formatRate(college.pellGrantRate)}</strong>
      </div>
    </div>
    ${fosHtml}
  `);
}

function formatValue(metric, value) {
  if (value == null || Number.isNaN(value)) {
    return "N/A";
  }
  const m = metric.toLowerCase();
  if (m.includes("rate")) {
    return `${Math.round(value * 100)}%`;
  }
  if (m.includes("ratio")) {
    return `${d3.format(".2f")(value)}x`;
  }
  if (metric === "monthlyPayment") {
    return `${d3.format("$,.0f")(value)}/mo`;
  }
  return d3.format("$,.0f")(value);
}
function formatRate(value) {
  if (value == null || Number.isNaN(value)) {
    return "N/A";
  }
  return `${Math.round(value * 100)}%`;
}
