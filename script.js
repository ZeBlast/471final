const metricLabels = {
  avgY1Earnings: "Median year-1 earnings",
  avgY5Earnings: "Median year-5 earnings",
  avgY10Earnings: "Median year-10 earnings",
  avgEarningsDebtRatio: "Year-1 earnings-to-debt ratio",
  avgPellGrantRate: "Pell grant rate",
  avgCompleterDebt: "Completer debt",
  avgMedianDebt: "Median debt",
  avgTotalCostEstimate: "Estimated annual cost",
  schoolCount: "Matched college count",
  y1P50Earnings: "Median year-1 earnings",
  y5P50Earnings: "Median year-5 earnings",
  y10P50Earnings: "Median year-10 earnings",
  earningsDebtRatio: "Year-1 earnings-to-debt ratio",
  completerDebt: "Completer debt",
  tuitionInState: "In-state tuition",
  pellGrantRate: "Pell grant rate",
  totalCostEstimate: "Estimated annual cost",
  monthlyPayment: "Monthly payment"
};

const cohortOrder = ["0000", "2001", "2004", "2007", "2010", "2011", "2013", "2016", "2019"];
const formatCurrency = d3.format("$,.0f");
const formatRatio = d3.format(".2f");
const formatRate = (value) => value == null ? "N/A" : `${Math.round(value * 100)}%`;

const state = {
  allRows: [],
  cohortOptions: [],
  selectedCohort: "2019",
  stateOptions: ["All States"],
  learnRate: "avgY1Earnings",
  learnCost: "avgCompleterDebt",
  learnSort: "avgY1Earnings",
  mapMetric: "y1P50Earnings",
  mapState: "All States",
  mapSize: "y1P50Earnings",
  projectionState: "All States",
  projectionCollege: "",
  projectionResidency: "tuitionInState"
};

initialize();

async function initialize() {
  const rows = await d3.csv("combined_pseo_all_cohorts.csv", parseRow);
  state.allRows = rows;
  state.cohortOptions = [...new Set(rows.map((d) => d.gradCohort))]
    .sort((a, b) => cohortOrder.indexOf(a) - cohortOrder.indexOf(b));
  if (!state.cohortOptions.includes(state.selectedCohort)) {
    state.selectedCohort = state.cohortOptions[0];
  }

  populateSelect("#global-cohort", state.cohortOptions, state.selectedCohort, formatCohortLabel);
  recalcDerivedState();
  initializeControls();
  renderAll();
  window.addEventListener("resize", renderAll);
}

function parseRow(row) {
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
  return parsed;
}

function getCohortRows() {
  return state.allRows.filter((d) => d.gradCohort === state.selectedCohort);
}

function recalcDerivedState() {
  const cohortRows = getCohortRows();
  state.stateOptions = ["All States", ...[...new Set(cohortRows.map((d) => d.state))].sort(d3.ascending)];
  if (!state.stateOptions.includes(state.mapState)) {
    state.mapState = "All States";
  }
  if (!state.stateOptions.includes(state.projectionState)) {
    state.projectionState = "All States";
  }
  updateStateBoundSelects();
  refreshCollegeSelect();
}

function initializeControls() {
  d3.select("#global-cohort").on("change", (event) => {
    state.selectedCohort = event.target.value;
    recalcDerivedState();
    renderAll();
  });

  d3.select("#learn-rate").on("change", (event) => {
    state.learnRate = event.target.value;
    renderLearnSection();
  });

  d3.select("#learn-cost").on("change", (event) => {
    state.learnCost = event.target.value;
    renderLearnSection();
  });

  d3.select("#learn-sort").on("change", (event) => {
    state.learnSort = event.target.value;
    renderLearnSection();
  });

  d3.select("#map-metric").on("change", (event) => {
    state.mapMetric = event.target.value;
    renderMapSection();
  });

  d3.select("#map-state").on("change", (event) => {
    state.mapState = event.target.value;
    syncProjectionState(event.target.value);
    renderMapSection();
  });

  d3.select("#map-size").on("change", (event) => {
    state.mapSize = event.target.value;
    renderMapSection();
  });

  d3.select("#projection-state").on("change", (event) => {
    state.projectionState = event.target.value;
    syncMapState(event.target.value);
    refreshCollegeSelect();
    renderProjectionSection();
  });

  d3.select("#projection-college").on("change", (event) => {
    state.projectionCollege = event.target.value;
    renderProjectionSection();
  });

  d3.select("#projection-residency").on("change", (event) => {
    state.projectionResidency = event.target.value;
    renderProjectionSection();
  });
}

function populateSelect(selector, values, selectedValue, formatter = (d) => d) {
  const select = d3.select(selector);
  select.selectAll("option")
    .data(values)
    .join("option")
    .attr("value", (d) => d)
    .property("selected", (d) => d === selectedValue)
    .text((d) => formatter(d));
}

function updateStateBoundSelects() {
  populateSelect("#map-state", state.stateOptions, state.mapState);
  populateSelect("#projection-state", state.stateOptions, state.projectionState);
  d3.select("#global-cohort").property("value", state.selectedCohort);
}

function syncProjectionState(selectedState) {
  state.projectionState = selectedState;
  d3.select("#projection-state").property("value", selectedState);
  refreshCollegeSelect();
  renderProjectionSection();
}

function syncMapState(selectedState) {
  state.mapState = selectedState;
  d3.select("#map-state").property("value", selectedState);
}

function getFilteredInstitutions(selectedState = state.mapState) {
  return getCohortRows().filter((d) => selectedState === "All States" || d.state === selectedState);
}

function refreshCollegeSelect() {
  const colleges = getFilteredInstitutions(state.projectionState)
    .map((d) => d.name)
    .sort(d3.ascending);

  if (!colleges.length) {
    state.projectionCollege = "";
    populateSelect("#projection-college", [""], "");
    return;
  }

  if (!colleges.includes(state.projectionCollege)) {
    state.projectionCollege = colleges[0];
  }

  populateSelect("#projection-college", colleges, state.projectionCollege);
}

function summarizeStates(rows) {
  const grouped = d3.group(rows, (d) => d.state);
  return [...grouped.entries()].map(([stateCode, values]) => ({
    state: stateCode,
    schoolCount: values.length,
    avgY1Earnings: d3.mean(values, (d) => d.y1P50Earnings),
    avgY5Earnings: d3.mean(values, (d) => d.y5P50Earnings),
    avgY10Earnings: d3.mean(values, (d) => d.y10P50Earnings),
    avgEarningsDebtRatio: d3.mean(values, (d) => d.earningsDebtRatio),
    avgPellGrantRate: d3.mean(values, (d) => d.pellGrantRate),
    avgCompleterDebt: d3.mean(values, (d) => d.completerDebt),
    avgMedianDebt: d3.mean(values, (d) => d.medianDebtOverall),
    avgTotalCostEstimate: d3.mean(values, (d) => d.totalCostEstimate)
  }));
}

function renderAll() {
  renderLearnSection();
  renderMapSection();
  renderProjectionSection();
}

function renderLearnSection() {
  const data = summarizeStates(getCohortRows())
    .filter((d) => d[state.learnRate] != null && d[state.learnCost] != null && d[state.learnSort] != null)
    .sort((a, b) => d3.descending(a[state.learnSort], b[state.learnSort]))
    .slice(0, 18);

  renderStateEarningsChart(data);
  renderStateEfficiencyChart(data);
}

function renderStateEarningsChart(data) {
  const svg = d3.select("#employment-chart");
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;
  const margin = { top: 20, right: 32, bottom: 22, left: 116 };

  svg.selectAll("*").remove();
  if (!data.length) {
    return renderEmptySvgMessage(svg, width, height, "No state rows available for this cohort and metric.");
  }

  const y = d3.scaleBand()
    .domain(data.map((d) => d.state))
    .range([margin.top, height - margin.bottom])
    .padding(0.26);

  const maxValue = d3.max(data, (d) => Math.max(d[state.learnRate] || 0, d.avgCompleterDebt || 0));
  const x = d3.scaleLinear()
    .domain([0, maxValue * 1.08])
    .range([margin.left, width - margin.right]);

  const rows = svg.append("g")
    .selectAll("g")
    .data(data)
    .join("g")
    .attr("transform", (d) => `translate(0,${y(d.state)})`);

  rows.append("rect")
    .attr("x", x(0))
    .attr("y", 0)
    .attr("width", (d) => x(d[state.learnRate]) - x(0))
    .attr("height", y.bandwidth() / 2)
    .attr("rx", 8)
    .attr("fill", "var(--teal)");

  rows.append("rect")
    .attr("x", x(0))
    .attr("y", y.bandwidth() / 2 + 4)
    .attr("width", (d) => x(d.avgCompleterDebt) - x(0))
    .attr("height", y.bandwidth() / 2 - 4)
    .attr("rx", 8)
    .attr("fill", "var(--danger)");

  rows.append("text")
    .attr("x", margin.left - 10)
    .attr("y", y.bandwidth() / 2)
    .attr("dominant-baseline", "middle")
    .attr("text-anchor", "end")
    .attr("font-weight", 700)
    .text((d) => d.state);

  rows.append("text")
    .attr("x", (d) => x(Math.max(d[state.learnRate], d.avgCompleterDebt)) + 8)
    .attr("y", y.bandwidth() / 2)
    .attr("dominant-baseline", "middle")
    .attr("fill", "var(--muted)")
    .attr("font-size", 12)
    .text((d) => `${formatValue(state.learnRate, d[state.learnRate])} | ${formatCurrency(d.avgCompleterDebt)} debt`);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat((d) => formatCurrency(d)))
    .call((g) => g.select(".domain").remove());
}

function renderStateEfficiencyChart(data) {
  const svg = d3.select("#debt-chart");
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;
  const margin = { top: 24, right: 20, bottom: 80, left: 64 };

  svg.selectAll("*").remove();
  if (!data.length) {
    return renderEmptySvgMessage(svg, width, height, "No state rows available for this cohort and metric.");
  }

  const x = d3.scaleBand()
    .domain(data.map((d) => d.state))
    .range([margin.left, width - margin.right])
    .padding(0.35);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, (d) => Math.max(d.avgY1Earnings || 0, d[state.learnCost] || 0)) * 1.1])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
    .call((g) => g.select(".domain").remove());

  const groups = svg.append("g")
    .selectAll("g")
    .data(data)
    .join("g")
    .attr("transform", (d) => `translate(${x(d.state) + x.bandwidth() / 2},0)`);

  groups.append("circle")
    .attr("cx", -12)
    .attr("cy", (d) => y(d.avgY1Earnings || 0))
    .attr("r", 5)
    .attr("fill", "var(--gold)");

  groups.append("circle")
    .attr("cx", 12)
    .attr("cy", (d) => y((d.avgEarningsDebtRatio || 0) * 10000))
    .attr("r", 5)
    .attr("fill", "var(--teal-soft)");

  groups.append("line")
    .attr("x1", -24)
    .attr("x2", 24)
    .attr("y1", (d) => y(d[state.learnCost]))
    .attr("y2", (d) => y(d[state.learnCost]))
    .attr("stroke", "var(--accent)")
    .attr("stroke-width", 4)
    .attr("stroke-linecap", "round");

  groups.append("text")
    .attr("x", 0)
    .attr("y", (d) => y(d[state.learnCost]) - 10)
    .attr("text-anchor", "middle")
    .attr("font-size", 11)
    .attr("font-weight", 700)
    .text((d) => `${formatRatio(d.avgEarningsDebtRatio || 0)}x`);

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x))
    .call((g) => g.selectAll("text")
      .attr("transform", "rotate(-25)")
      .style("text-anchor", "end")
      .attr("dx", "-0.6em")
      .attr("dy", "0.4em"))
    .call((g) => g.select(".domain").remove());

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickFormat((d) => formatCurrency(d)))
    .call((g) => g.select(".domain").remove());
}

async function renderMapSection() {
  const svg = d3.select("#us-map");
  const width = svg.node().clientWidth;
  const height = Math.max(500, Math.round(width * 0.62));
  const tooltip = d3.select("#map-tooltip");
  const mapWrap = d3.select(".map-wrap");
  const data = getFilteredInstitutions(state.mapState)
    .filter((d) => d[state.mapMetric] != null && d[state.mapSize] != null && d.lat != null && d.lon != null);

  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.selectAll("*").remove();

  if (!data.length) {
    return renderEmptyMap(svg, width, height, "No colleges match the current cohort and filter.");
  }

  const colorExtent = d3.extent(data, (d) => d[state.mapMetric]);
  const sizeExtent = d3.extent(data, (d) => d[state.mapSize]);
  const color = d3.scaleLinear().domain(colorExtent).range(["#c94141", "#1f8a70"]);
  const radius = d3.scaleSqrt().domain(sizeExtent).range([4, 14]);

  renderLegend(color, colorExtent);

  try {
    const us = await d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json");
    const statesFeature = topojson.feature(us, us.objects.states);
    const projection = d3.geoAlbersUsa().fitSize([width, height], statesFeature);
    const path = d3.geoPath(projection);

    svg.append("g")
      .selectAll("path")
      .data(statesFeature.features)
      .join("path")
      .attr("d", path)
      .attr("fill", "#f9f3e8")
      .attr("stroke", "rgba(22, 32, 51, 0.18)")
      .attr("stroke-width", 1);

    svg.append("g")
      .selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", (d) => projection([d.lon, d.lat])?.[0] ?? -100)
      .attr("cy", (d) => projection([d.lon, d.lat])?.[1] ?? -100)
      .attr("r", (d) => radius(d[state.mapSize]))
      .attr("fill", (d) => color(d[state.mapMetric]))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.2)
      .attr("opacity", 0.86)
      .on("mousemove", (event, d) => {
        updateCollegeCard(d);
        const [pointerX, pointerY] = d3.pointer(event, mapWrap.node());
        const tooltipLeft = pointerX > width * 0.7 ? pointerX - 280 : pointerX + 16;
        const tooltipTop = pointerY > height * 0.75 ? pointerY - 140 : pointerY + 16;

        tooltip.classed("hidden", false)
          .style("left", `${Math.max(8, tooltipLeft)}px`)
          .style("top", `${Math.max(8, tooltipTop)}px`)
          .html(`
            <strong>${d.name}</strong>
            <p class="meta">${d.city || "Unknown city"}, ${d.state} | ${formatCohortLabel(d.gradCohort)}</p>
            <p>${metricLabels[state.mapMetric]}: ${formatValue(state.mapMetric, d[state.mapMetric])}</p>
            <p>${metricLabels[state.mapSize]}: ${formatValue(state.mapSize, d[state.mapSize])}</p>
            <p>Available horizons: ${availableHorizonsLabel(d)}</p>
          `);
      })
      .on("mouseleave", () => tooltip.classed("hidden", true));
  } catch (error) {
    renderEmptyMap(svg, width, height, "Map data could not be loaded. Check your internet connection for the basemap.");
  }
}

function renderEmptyMap(svg, width, height, message) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--muted)")
    .text(message);
}

function renderEmptySvgMessage(svg, width, height, message) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--muted)")
    .text(message);
}

function renderLegend(colorScale, extent) {
  d3.select("#map-legend").html(`
    <span><i class="legend-swatch" style="background:${colorScale(extent[0])}"></i>Lower ${metricLabels[state.mapMetric].toLowerCase()}</span>
    <span><i class="legend-swatch" style="background:${colorScale((extent[0] + extent[1]) / 2)}"></i>Mid</span>
    <span><i class="legend-swatch" style="background:${colorScale(extent[1])}"></i>Higher ${metricLabels[state.mapMetric].toLowerCase()}</span>
  `);
}

function updateCollegeCard(college) {
  d3.select("#college-card").html(`
    <strong>${college.name}</strong>
    <p class="meta">${college.city || "Unknown city"}, ${college.state} | ${formatCohortLabel(college.gradCohort)}</p>
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
  `);
}

function renderProjectionSection() {
  const college = getFilteredInstitutions(state.projectionState).find((d) => d.name === state.projectionCollege)
    || getCohortRows().find((d) => d.name === state.projectionCollege)
    || getCohortRows()[0];

  if (!college) {
    return;
  }

  const tuition = college[state.projectionResidency] ?? college.tuitionInState ?? 0;
  const totalCost = tuition + (college.roomCost || 0) + (college.bookCost || 0);
  const debt = college.completerDebt ?? college.medianDebtOverall ?? 0;

  d3.select("#projection-summary").html(`
    <div class="summary-tile">
      <span class="summary-label">${formatCohortLabel(college.gradCohort)}</span>
      <strong>${availableHorizonsLabel(college)}</strong>
    </div>
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

  renderEarningsHorizonChart(college, debt);
  renderSnapshotChart(tuition, totalCost, debt, college);
}

function renderEarningsHorizonChart(college, debt) {
  const svg = d3.select("#projection-line-chart");
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;
  const margin = { top: 24, right: 24, bottom: 50, left: 72 };

  svg.selectAll("*").remove();

  const earningsPoints = [
    { year: 1, value: college.y1P50Earnings, label: "Year 1" },
    { year: 5, value: college.y5P50Earnings, label: "Year 5" },
    { year: 10, value: college.y10P50Earnings, label: "Year 10" }
  ].filter((d) => d.value != null);

  if (!earningsPoints.length) {
    return renderEmptySvgMessage(svg, width, height, "No earnings horizons are available for this cohort.");
  }

  const x = d3.scalePoint()
    .domain(earningsPoints.map((d) => d.label))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(earningsPoints, (d) => Math.max(d.value, debt || 0)) * 1.15])
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

  svg.append("line")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("y1", y(debt))
    .attr("y2", y(debt))
    .attr("stroke", "var(--accent)")
    .attr("stroke-width", 3)
    .attr("stroke-dasharray", "8 6");

  svg.append("text")
    .attr("x", width - margin.right)
    .attr("y", y(debt) - 10)
    .attr("text-anchor", "end")
    .attr("fill", "var(--accent)")
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .text(`Completer debt: ${formatCurrency(debt)}`);

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

function renderSnapshotChart(tuition, totalCost, debt, college) {
  const svg = d3.select("#debt-earnings-chart");
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;
  const margin = { top: 24, right: 24, bottom: 60, left: 60 };

  svg.selectAll("*").remove();

  const data = [
    { label: "Tuition", value: tuition || 0, fill: "var(--gold)" },
    { label: "Total Cost", value: totalCost || 0, fill: "var(--accent-soft)" },
    { label: "Debt", value: debt || 0, fill: "var(--accent)" },
    { label: "Year 1", value: college.y1P50Earnings || 0, fill: "var(--teal)" },
    { label: "Year 5", value: college.y5P50Earnings || 0, fill: "var(--teal-soft)" },
    { label: "Year 10", value: college.y10P50Earnings || 0, fill: "#4ca98d" }
  ].filter((d) => d.value > 0);

  if (!data.length) {
    return renderEmptySvgMessage(svg, width, height, "No snapshot values are available for this cohort.");
  }

  const x = d3.scaleBand()
    .domain(data.map((d) => d.label))
    .range([margin.left, width - margin.right])
    .padding(0.22);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, (d) => d.value) * 1.15])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg.append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSize(-(width - margin.left - margin.right)).tickFormat(""))
    .call((g) => g.select(".domain").remove());

  svg.append("g")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", (d) => x(d.label))
    .attr("y", (d) => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", (d) => y(0) - y(d.value))
    .attr("rx", 16)
    .attr("fill", (d) => d.fill);

  svg.append("g")
    .selectAll("text")
    .data(data)
    .join("text")
    .attr("x", (d) => x(d.label) + x.bandwidth() / 2)
    .attr("y", (d) => y(d.value) - 10)
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

function availableHorizonsLabel(college) {
  const labels = [];
  if (college.y1P50Earnings != null) labels.push("Y1");
  if (college.y5P50Earnings != null) labels.push("Y5");
  if (college.y10P50Earnings != null) labels.push("Y10");
  return labels.length ? labels.join(" / ") : "None";
}

function formatCohortLabel(cohort) {
  return cohort === "0000" ? "Aggregate (0000)" : cohort;
}

function formatValue(metric, value) {
  if (value == null || Number.isNaN(value)) {
    return "N/A";
  }
  if (metric.toLowerCase().includes("rate")) {
    return formatRate(value);
  }
  if (metric.toLowerCase().includes("ratio")) {
    return `${formatRatio(value)}x`;
  }
  if (metric === "monthlyPayment") {
    return `${formatCurrency(value)}/mo`;
  }
  return formatCurrency(value);
}
