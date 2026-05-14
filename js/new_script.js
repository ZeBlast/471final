/**
 * Institution median earnings: College Scorecard dictionary-style paths map to CSV columns
 * in Most-Recent-Cohorts-Institution.csv (see learn/explore dataset notes).
 */
const EARNINGS_SERIES = [
  {
    key: "earn1YrAfterCompMdn",
    csv: "MD_EARN_WNE_1YR",
    mapLabel: "Median earnings, 1 year after completion",
    lineLabel: "1 year",
    cardCaption: "Median earnings, 1 year after completion"
  },
  {
    key: "earn4YrAfterCompMdn",
    csv: "MD_EARN_WNE_4YR",
    mapLabel: "Median earnings, 4 years after completion",
    lineLabel: "4 years",
    cardCaption: "Median earnings, 4 years after completion"
  }
];

const DEFAULT_EARNINGS_METRIC = "earn4YrAfterCompMdn";

const metricLabels = {
  ...Object.fromEntries(EARNINGS_SERIES.map((s) => [s.key, s.mapLabel])),
  earningsDebtRatio: "Earnings-to-debt ratio (1-year median earnings ÷ completer debt)",
  completerDebt: "Median graduate debt (completers)",
  tuitionInState: "In-state tuition (TUITIONFEE_IN)",
  tuitionOutState: "Out-of-state tuition",
  pellGrantRate: "Pell grant rate",
  totalCostEstimate: "Estimated annual cost",
  monthlyPayment: "Monthly payment"
};

function mapMetricOptionKeys() {
  return [
    ...EARNINGS_SERIES.map((s) => s.key),
    "earningsDebtRatio",
    "completerDebt",
    "tuitionInState",
    "pellGrantRate"
  ];
}

function mapSizeOptionKeys() {
  return [...EARNINGS_SERIES.map((s) => s.key), "tuitionInState", "completerDebt"];
}

function ensureMapMetricAndSizeValid() {
  if (state.mapSize === "totalCostEstimate") {
    state.mapSize = "tuitionInState";
  }
  const mOpts = mapMetricOptionKeys();
  const sOpts = mapSizeOptionKeys();
  if (!mOpts.includes(state.mapMetric)) {
    state.mapMetric = DEFAULT_EARNINGS_METRIC;
  }
  if (!sOpts.includes(state.mapSize)) {
    state.mapSize = DEFAULT_EARNINGS_METRIC;
  }
}

function refreshMapMetricAndSizeSelects() {
  ensureMapMetricAndSizeValid();
  populateSelect("#map-metric", mapMetricOptionKeys(), state.mapMetric, (d) => metricLabels[d]);
  populateSelect("#map-size", mapSizeOptionKeys(), state.mapSize, (d) => metricLabels[d]);
}

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
  fieldOfStudyRows: [],
  selectedState: "All States",
  mapMetric: DEFAULT_EARNINGS_METRIC,
  mapSize: DEFAULT_EARNINGS_METRIC,
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

  const [institutionRows, fieldRows] = await Promise.all([
    d3.csv("data/college_scorecard_data/Most-Recent-Cohorts-Institution.csv"),
    d3.csv("data/college_scorecard_data/Most-Recent-Cohorts-Field-of-Study.csv", parseFieldOfStudyRow)
  ]);

  const parsedInstitutions = institutionRows.map(parseInstitutionRow);
  state.scorecardInstitutions = parsedInstitutions;
  state.fieldOfStudyRows = fieldRows;

  refreshScorecardRows();

  populateSelect("#map-state", state.stateOptions, state.selectedState);
  refreshMapMetricAndSizeSelects();

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

function refreshScorecardRows() {
  state.allInstitutions = state.scorecardInstitutions;
  state.allRows = state.scorecardInstitutions.filter((row) => row.lat != null && row.lon != null);

  state.stateOptions = [
    "All States",
    ...Array.from(new Set(state.allRows.map((d) => d.state))).sort(d3.ascending)
  ];

  if (!state.stateOptions.includes(state.selectedState)) {
    state.selectedState = "All States";
    d3.select("#map-state").property("value", "All States");
  }
}

function parseScorecardMedianEarn(row, column) {
  const v = row[column];
  if (v === "" || v == null || v === "PrivacySuppressed") return null;
  const n = +v;
  return Number.isFinite(n) ? n : null;
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
    earningsDebtRatio: null,
    gradCohort: "Most Recent"
  };

  for (const s of EARNINGS_SERIES) {
    parsed[s.key] = parseScorecardMedianEarn(row, s.csv);
  }

  if (parsed.earn1YrAfterCompMdn != null && parsed.completerDebt != null && parsed.completerDebt > 0) {
    parsed.earningsDebtRatio = parsed.earn1YrAfterCompMdn / parsed.completerDebt;
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
    earnCount1yr: row.EARN_COUNT_WNE_1YR === "" ? 0 : +row.EARN_COUNT_WNE_1YR
  };
}

function initializeControls() {
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
  return "College Scorecard (most recent cohort extract)";
}

function renderProjectionSection() {
  const container = d3.select(".projection-charts");
  if (container.empty()) {
    return;
  }
  container.selectAll("*").remove();

  state.savedColleges.forEach((college) => {
    const article = container.append("article").attr("class", "chart-panel");
    const tuitionMetric = state.projectionResidency;
    const publishedTuition = college[tuitionMetric] ?? college.tuitionInState;
    const debt = college.completerDebt ?? college.medianDebtOverall ?? 0;
    const tuitionTileLabel = tuitionMetric === "tuitionOutState"
      ? "Out-of-state tuition (TUITIONFEE_OUT)"
      : "In-state tuition (TUITIONFEE_IN)";

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
        <span class="summary-label">${tuitionTileLabel}</span>
        <strong>${formatValue(tuitionMetric, publishedTuition)}</strong>
      </div>
      <div class="summary-tile">
        <span class="summary-label">Earnings-to-debt (1-year median earnings ÷ completer debt)</span>
        <strong>${formatValue("earningsDebtRatio", college.earningsDebtRatio)}</strong>
      </div>
    `);

    const svg = article.append("svg").attr("aria-label", `Earnings chart for ${college.name}`);
    renderEarningsHorizonChartForCollege(svg, college, debt, publishedTuition);
  });
}

function renderEarningsHorizonChartForCollege(svg, college, debt, publishedTuition) {
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;
  const margin = { top: 36, right: 24, bottom: 50, left: 72 };

  svg.selectAll("*").remove();

  const series = EARNINGS_SERIES;
  const earningsPoints = series
    .map((s) => ({
      value: college[s.key],
      label: s.lineLabel
    }))
    .filter((d) => d.value != null && Number.isFinite(d.value));

  if (!earningsPoints.length) {
    return renderEmptySvgMessage(svg, width, height, "No earnings horizons are available for this institution.");
  }

  const cost = Number.isFinite(publishedTuition) && publishedTuition > 0 ? publishedTuition : null;
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
      .text("Published tuition (Learn / Explore)");
  }

  const legend = svg.append("g").attr("class", "projection-inline-legend");
  legend.append("text")
    .attr("x", margin.left)
    .attr("y", 16)
    .attr("font-size", 11)
    .attr("fill", "var(--muted)")
    .text("Teal: median earnings 1 and 4 years after completion (see dataset note). Gold: published tuition from the toggle.");

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
    Number.isFinite(d[state.mapMetric]) &&
    Number.isFinite(d[state.mapSize])
  );
}

function getStateMeta(feature) {
  return stateFipsToMeta[String(feature.id).padStart(2, "0")];
}

/** Approximate 2-letter bold label box (px) — below this, the state polygon is too tight for the text. */
const STATE_LABEL_MIN_BOUNDS = { w: 34, h: 15 };

/** Label column inset from right edge of map (px); smaller = anchors further right, away from land. */
const STATE_SIDEBAR_LABEL_X_INSET = 4;

/** Sidebar anchors may nudge left this many px from the column for overlap only (keeps text off the map). */
const STATE_SIDEBAR_ANCHOR_MAX_LEFT_NUDGE = 40;

/** Only use a horizontal sidebar if centroid is east of this fraction of map width (avoids huge lines). */
const STATE_SIDEBAR_MIN_CX_FRAC = 0.44;

/** Skip sidebar if horizontal span would exceed this fraction of map width. */
const STATE_SIDEBAR_MAX_LINE_FRAC = 0.52;

/**
 * Always use margin label + leader (no bounds / span checks). VT, NH, and ME stay centroid labels.
 */
const STATE_SIDEBAR_FORCE_LINE_STATES = new Set(["DC", "MD", "CT", "MA", "RI", "DE"]);

/** Never use optional sidebar placement; label stays on centroid with no leader line. */
const STATE_SIDEBAR_NEVER_LINE_STATES = new Set(["VT", "NH", "ME"]);

/** Approximate rendered 2-letter label box for overlap checks (px; includes halo stroke). */
const STATE_LABEL_TEXT_W = 40;
const STATE_LABEL_TEXT_H = 20;
const LABEL_MARGIN = 26;
/** Max nudge for centroid labels from true centroid (px). */
const CENTROID_LABEL_MAX_NUDGE = 28;

function stateLabelFitsInsideBounds(feature, path) {
  const b = path.bounds(feature);
  if (!b) return true;
  const [[x0, y0], [x1, y1]] = b;
  const bw = x1 - x0;
  const bh = y1 - y0;
  return bw >= STATE_LABEL_MIN_BOUNDS.w && bh >= STATE_LABEL_MIN_BOUNDS.h;
}

/** Axis-aligned bbox for overlap tests (`text-anchor: end` → text lies left of anchor x). */
function stateLabelTextBBox(d) {
  const w = STATE_LABEL_TEXT_W;
  const h = STATE_LABEL_TEXT_H;
  const hh = h / 2;
  if (d.isSidebar || d.textAnchor === "end") {
    return { left: d.x - w, right: d.x, top: d.y - hh, bottom: d.y + hh };
  }
  const hw = w / 2;
  return { left: d.x - hw, right: d.x + hw, top: d.y - hh, bottom: d.y + hh };
}

function stateLabelBboxesOverlap(a, b) {
  const A = stateLabelTextBBox(a);
  const B = stateLabelTextBBox(b);
  return !(A.right <= B.left || B.right <= A.left || A.bottom <= B.top || B.bottom <= A.top);
}

/** Pack sidebar anchors at the right edge; small tx/ty nudges yield slightly slanted leaders. */
function packSidebarLabelAnchors(rows, labelX, mapWidth, mapHeight) {
  rows.sort((a, b) => a.cy - b.cy);
  const placed = [];
  const probe = { x: 0, y: 0, isSidebar: true, textAnchor: "end" };
  for (const r of rows) {
    let tx = labelX;
    let ty = Math.max(LABEL_MARGIN, Math.min(mapHeight - LABEL_MARGIN, r.cy));
    probe.x = tx;
    probe.y = ty;
    const ok = () => placed.every((p) => !stateLabelBboxesOverlap(probe, p));
    let n = 0;
    while (!ok() && n < 520) {
      const phase = n % 8;
      if (phase <= 1) ty += phase === 0 ? 4 : -4;
      else if (phase <= 3) tx += phase === 2 ? -2 : 2;
      else if (phase <= 5) ty += phase === 4 ? -3 : 3;
      else tx += phase === 6 ? -2 : 2;
      n++;
      ty = Math.max(LABEL_MARGIN, Math.min(mapHeight - LABEL_MARGIN, ty));
      tx = Math.min(mapWidth - 2, Math.max(labelX - STATE_SIDEBAR_ANCHOR_MAX_LEFT_NUDGE, tx));
      probe.x = tx;
      probe.y = ty;
    }
    placed.push({ x: tx, y: ty, isSidebar: true, textAnchor: "end" });
    r.tx = tx;
    r.ty = ty;
  }
}

function clampSidebarLabelPosition(d, labelX, mapWidth, mapHeight) {
  d.x = Math.min(mapWidth - 2, Math.max(labelX - STATE_SIDEBAR_ANCHOR_MAX_LEFT_NUDGE, d.x));
  d.y = Math.max(LABEL_MARGIN, Math.min(mapHeight - LABEL_MARGIN, d.y));
}

function clampCentroidLabelPosition(d) {
  if (STATE_SIDEBAR_NEVER_LINE_STATES.has(d.abbr)) return;
  const cdx = d.x - d.cx;
  const cdy = d.y - d.cy;
  const cd = Math.hypot(cdx, cdy);
  if (cd > CENTROID_LABEL_MAX_NUDGE && cd > 1e-6) {
    d.x = d.cx + (cdx / cd) * CENTROID_LABEL_MAX_NUDGE;
    d.y = d.cy + (cdy / cd) * CENTROID_LABEL_MAX_NUDGE;
  }
}

/** Move `mov` off `fix` by full penetration along the shallower axis (`fix` stays put). */
function pushMovableOffFixed(mov, fix, bump) {
  const F = stateLabelTextBBox(fix);
  const M = stateLabelTextBBox(mov);
  const ox = Math.min(F.right, M.right) - Math.max(F.left, M.left);
  const oy = Math.min(F.bottom, M.bottom) - Math.max(F.top, M.top);
  if (ox <= 0 || oy <= 0) return;
  if (ox < oy) {
    const dir = (M.left + M.right) / 2 < (F.left + F.right) / 2 ? -1 : 1;
    mov.x += dir * (ox + bump);
  } else {
    const dir = (M.top + M.bottom) / 2 < (F.top + F.bottom) / 2 ? -1 : 1;
    mov.y += dir * (oy + bump);
  }
}

/**
 * Resolve overlaps using label text bboxes (sidebar = end-anchored). Uses weighted
 * separation so centroid labels absorb more motion than sidebar when both collide.
 */
function resolveAllStateLabelOverlaps(layout, labelX, mapWidth, mapHeight) {
  const n = layout.length;
  for (let iter = 0; iter < 280; iter++) {
    let anyOverlap = false;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = layout[i];
        const b = layout[j];
        if (!stateLabelBboxesOverlap(a, b)) continue;
        const aLock = STATE_SIDEBAR_NEVER_LINE_STATES.has(a.abbr);
        const bLock = STATE_SIDEBAR_NEVER_LINE_STATES.has(b.abbr);
        if (aLock && bLock) continue;

        anyOverlap = true;
        const bump = 0.6;

        if (aLock && !bLock) {
          pushMovableOffFixed(b, a, bump);
          if (b.isSidebar) clampSidebarLabelPosition(b, labelX, mapWidth, mapHeight);
          else clampCentroidLabelPosition(b);
          continue;
        }
        if (bLock && !aLock) {
          pushMovableOffFixed(a, b, bump);
          if (a.isSidebar) clampSidebarLabelPosition(a, labelX, mapWidth, mapHeight);
          else clampCentroidLabelPosition(a);
          continue;
        }

        const A = stateLabelTextBBox(a);
        const B = stateLabelTextBBox(b);
        const ox = Math.min(A.right, B.right) - Math.max(A.left, B.left);
        const oy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
        if (ox <= 0 || oy <= 0) continue;

        let dx = 0;
        let dy = 0;
        if (ox < oy) {
          const dir = (A.left + A.right) / 2 < (B.left + B.right) / 2 ? -1 : 1;
          dx = dir * (ox / 2 + bump);
        } else {
          const dir = (A.top + A.bottom) / 2 < (B.top + B.bottom) / 2 ? -1 : 1;
          dy = dir * (oy / 2 + bump);
        }

        const mass = (d) => (d.isSidebar ? 2.5 : 1);
        const ma = mass(a);
        const mb = mass(b);
        const fa = mb / (ma + mb);
        const fb = ma / (ma + mb);

        a.x += dx * 2 * fa;
        a.y += dy * 2 * fa;
        b.x -= dx * 2 * fb;
        b.y -= dy * 2 * fb;

        if (a.isSidebar) clampSidebarLabelPosition(a, labelX, mapWidth, mapHeight);
        else clampCentroidLabelPosition(a);

        if (b.isSidebar) clampSidebarLabelPosition(b, labelX, mapWidth, mapHeight);
        else clampCentroidLabelPosition(b);
      }
    }
    if (!anyOverlap) break;
  }

  for (const d of layout) {
    if (d.isSidebar) clampSidebarLabelPosition(d, labelX, mapWidth, mapHeight);
    else clampCentroidLabelPosition(d);
  }

  for (const d of layout) {
    if (STATE_SIDEBAR_NEVER_LINE_STATES.has(d.abbr)) {
      d.x = d.cx;
      d.y = d.cy;
      d.showLeader = false;
      d.textAnchor = "middle";
      d.isSidebar = false;
    } else if (!d.isSidebar) {
      d.showLeader = Math.hypot(d.x - d.cx, d.y - d.cy) > 3;
    }
  }
}

function layoutStateLabelPositions(features, path, mapWidth, mapHeight) {
  const pending = [];
  for (const feature of features) {
    const meta = getStateMeta(feature);
    if (!meta) continue;
    const [cx, cy] = path.centroid(feature);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
    pending.push({ feature, abbr: meta.abbr, cx, cy });
  }

  const labelX = mapWidth - STATE_SIDEBAR_LABEL_X_INSET;
  const sidebarByAbbr = new Map();

  for (const d of pending.filter((x) => STATE_SIDEBAR_FORCE_LINE_STATES.has(x.abbr))) {
    sidebarByAbbr.set(d.abbr, { ...d });
  }

  const labelXRef = labelX;
  const optional = pending
    .filter((d) => !sidebarByAbbr.has(d.abbr))
    .filter((d) => !STATE_SIDEBAR_NEVER_LINE_STATES.has(d.abbr))
    .filter((d) => !stateLabelFitsInsideBounds(d.feature, path))
    .filter((d) => d.cx > mapWidth * STATE_SIDEBAR_MIN_CX_FRAC)
    .filter((d) => Math.abs(labelXRef - d.cx) <= mapWidth * STATE_SIDEBAR_MAX_LINE_FRAC)
    .sort((a, b) => a.cy - b.cy);

  for (const d of optional) {
    sidebarByAbbr.set(d.abbr, { ...d });
  }

  const sidebarRows = [...sidebarByAbbr.values()];
  packSidebarLabelAnchors(sidebarRows, labelX, mapWidth, mapHeight);
  const sidebarPacked = new Map(sidebarRows.map((r) => [r.abbr, { tx: r.tx, ty: r.ty }]));

  const layout = pending.map((d) => {
    const packed = sidebarPacked.get(d.abbr);
    if (packed) {
      return {
        ...d,
        x: packed.tx,
        y: packed.ty,
        cx: d.cx,
        cy: d.cy,
        showLeader: true,
        textAnchor: "end",
        isSidebar: true
      };
    }
    return {
      ...d,
      x: d.cx,
      y: d.cy,
      cx: d.cx,
      cy: d.cy,
      showLeader: false,
      textAnchor: "middle",
      isSidebar: false
    };
  });

  resolveAllStateLabelOverlaps(layout, labelX, mapWidth, mapHeight);
  return layout;
}

function computeStateMetrics() {
  const stateMetrics = d3.rollup(
    state.allRows.filter((d) => Number.isFinite(d[state.mapMetric])),
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
        const invK = 1 / event.transform.k;
        zoomGroup.selectAll("circle").attr("r", (d) => Math.max(0.02, radius(d[state.mapSize]) / event.transform.k));
        zoomGroup.selectAll("circle").attr("stroke-width", (d) => Math.max(0.005, 1.2 / event.transform.k));
        zoomGroup.selectAll(".state-labels .state-label-item text").attr("transform", (d) => {
          return `translate(${d.x},${d.y}) scale(${invK})`;
        });
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

    if (state.selectedState === "All States") {
      const labelFeatures = statesFeature.features.filter((feature) => {
        const meta = getStateMeta(feature);
        if (!meta || !state.stateOptions.includes(meta.abbr)) {
          return false;
        }
        const [cx, cy] = path.centroid(feature);
        return Number.isFinite(cx) && Number.isFinite(cy);
      });
      const labelLayout = layoutStateLabelPositions(labelFeatures, path, width, height);
      const labelRoot = pathGroup.append("g")
        .attr("class", "state-labels")
        .attr("pointer-events", "none");

      const labelItem = labelRoot.selectAll("g.state-label-item")
        .data(labelLayout)
        .join("g")
        .attr("class", "state-label-item");

      labelItem.append("line")
        .attr("class", "state-label-leader")
        .attr("visibility", (d) => (d.showLeader ? "visible" : "hidden"))
        .attr("x1", (d) => d.cx)
        .attr("y1", (d) => d.cy)
        .attr("x2", (d) => d.x)
        .attr("y2", (d) => d.y)
        .attr("stroke", "rgba(22, 32, 51, 0.42)")
        .attr("stroke-width", 1.35)
        .attr("stroke-linecap", "round")
        .style("vector-effect", "non-scaling-stroke");

      labelItem.append("text")
        .attr("transform", (d) => `translate(${d.x},${d.y}) scale(1)`)
        .attr("text-anchor", (d) => d.textAnchor)
        .attr("dominant-baseline", "middle")
        .attr("font-size", 12.5)
        .attr("font-weight", 800)
        .attr("letter-spacing", "0.06em")
        .attr("font-family", "Source Sans 3, system-ui, sans-serif")
        .attr("text-rendering", "geometricPrecision")
        .attr("fill", "#162033")
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2.75)
        .attr("stroke-linejoin", "round")
        .attr("paint-order", "stroke fill")
        .text((d) => d.abbr);
    }

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
  const legend = d3.select("#map-legend");
  legend.selectAll("*").remove();
  const [lowColor, highColor] = colorScale.range();
  const metric = state.mapMetric;
  const caption = metricLabels[metric] || metric;
  const lo = formatValue(metric, extent[0]);
  const hi = formatValue(metric, extent[1]);
  const isState = state.selectedState === "All States";
  const hint = isState
    ? "Warm tones = lower values · Cool teal = higher values · Each state is colored by its average for the selected metric (schools in this extract with map coordinates)."
    : "Warm tones = lower values · Cool teal = higher values · Each dot is colored by this metric for that institution.";

  legend.append("p").attr("class", "map-legend-caption").text(caption);
  legend.append("div")
    .attr("class", "map-legend-bar-wrap")
    .append("div")
    .attr("class", "map-legend-bar")
    .style("background", `linear-gradient(90deg, ${lowColor}, ${highColor})`);
  const ticks = legend.append("div").attr("class", "map-legend-ticks");
  ticks.append("span").attr("class", "map-legend-min").text(lo);
  ticks.append("span").attr("class", "map-legend-max").text(hi);
  legend.append("span").attr("class", "map-legend-hint").text(hint);
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
          <span>Major median (1 year after program)</span>
          <strong>${formatValue("earn1YrAfterCompMdn", matchingFOS[0].earnMdn1yr)}</strong>
        </div>
        <div class="metric-tile">
          <span>Majors with data</span>
          <strong>${matchingFOS.length}</strong>
        </div>
      </div>`
    : "<p class=\"meta\">No field-of-study details available for this institution.</p>";

  const earnTiles = EARNINGS_SERIES
    .map(
      (s) => `
      <div class="metric-tile">
        <span>${s.cardCaption}</span>
        <strong>${formatValue(s.key, college[s.key])}</strong>
      </div>`
    )
    .join("");

  d3.select("#college-card").html(`
    <strong>${college.name}</strong>
    <p class="meta">${college.city || "Unknown city"}, ${college.state} · ${dataCohortCaption()}</p>
    <div class="metric-grid">
      ${earnTiles}
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
