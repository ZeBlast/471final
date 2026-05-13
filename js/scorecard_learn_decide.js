/**
 * Learn page: state aggregates from College Scorecard institution CSV
 * (same source as explore.html / new_script.js).
 */
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

const formatCurrency = d3.format("$,.0f");
const formatRatio = d3.format(".2f");

const dataState = {
  allRows: [],
  learnRate: "avgY1Earnings",
  learnCost: "avgCompleterDebt",
  learnSort: "avgY1Earnings"
};

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

function formatRate(value) {
  if (value == null || Number.isNaN(value)) {
    return "N/A";
  }
  return `${Math.round(value * 100)}%`;
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

function populateSelect(selector, values, selectedValue, formatter = (d) => d) {
  const select = d3.select(selector);
  select.selectAll("option")
    .data(values)
    .join("option")
    .attr("value", (d) => d)
    .property("selected", (d) => d === selectedValue)
    .text((d) => formatter(d));
}

function renderEmptySvgMessage(svg, width, height, message) {
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--muted)")
    .text(message);
}

function renderLearnSection() {
  const rows = dataState.allRows.filter((d) => d.state);
  const data = summarizeStates(rows)
    .filter((d) => d[dataState.learnRate] != null && d[dataState.learnCost] != null && d[dataState.learnSort] != null)
    .sort((a, b) => d3.descending(a[dataState.learnSort], b[dataState.learnSort]))
    .slice(0, 18);

  renderStateEarningsChart(data);
  renderStateEfficiencyChart(data);
}

function renderStateEarningsChart(data) {
  const svg = d3.select("#employment-chart");
  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;
  const margin = { top: 20, right: 168, bottom: 22, left: 84 };

  svg.selectAll("*").remove();
  if (!data.length) {
    return renderEmptySvgMessage(svg, width, height, "No state rows available for the selected metrics.");
  }

  const y = d3.scaleBand()
    .domain(data.map((d) => d.state))
    .range([margin.top, height - margin.bottom])
    .padding(0.26);

  const maxValue = d3.max(data, (d) => Math.max(d[dataState.learnRate] || 0, d.avgCompleterDebt || 0));
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
    .attr("width", (d) => x(d[dataState.learnRate]) - x(0))
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
    .attr("x", (d) => x(Math.max(d[dataState.learnRate], d.avgCompleterDebt)) + 8)
    .attr("y", y.bandwidth() / 2)
    .attr("dominant-baseline", "middle")
    .attr("fill", "var(--muted)")
    .attr("font-size", 12)
    .text((d) => `${formatValue(dataState.learnRate, d[dataState.learnRate])} | ${formatCurrency(d.avgCompleterDebt)} debt`);

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
    return renderEmptySvgMessage(svg, width, height, "No state rows available for the selected metrics.");
  }

  let effTip = d3.select("#efficiency-tooltip");
  if (effTip.empty()) {
    effTip = d3.select(".learn-layout").append("div")
      .attr("id", "efficiency-tooltip")
      .attr("class", "tooltip hidden")
      .style("position", "absolute")
      .style("pointer-events", "none");
  }

  const x = d3.scaleBand()
    .domain(data.map((d) => d.state))
    .range([margin.left, width - margin.right])
    .padding(0.35);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, (d) => Math.max(d.avgY1Earnings || 0, d[dataState.learnCost] || 0)) * 1.1])
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

  groups.append("rect")
    .attr("x", -x.bandwidth() / 2)
    .attr("y", margin.top)
    .attr("width", x.bandwidth())
    .attr("height", height - margin.bottom - margin.top)
    .attr("fill", "transparent")
    .on("mousemove", function(event) {
      const [px, py] = d3.pointer(event, d3.select(".learn-layout").node());
      const d = d3.select(this).datum();
      effTip.classed("hidden", false)
        .style("left", `${px + 12}px`)
        .style("top", `${py - 20}px`)
        .html(`
          <strong>${d.state}</strong>
          <p>Year-1 earnings: ${formatValue("avgY1Earnings", d.avgY1Earnings)}</p>
          <p>Earnings-to-debt ratio: ${formatValue("avgEarningsDebtRatio", d.avgEarningsDebtRatio)}</p>
          <p>${metricLabels[dataState.learnCost]}: ${formatValue(dataState.learnCost, d[dataState.learnCost])}</p>
          <p>Schools: ${d.schoolCount}</p>
        `);
    })
    .on("mouseleave", () => effTip.classed("hidden", true));

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
    .attr("y1", (d) => y(d[dataState.learnCost]))
    .attr("y2", (d) => y(d[dataState.learnCost]))
    .attr("stroke", "var(--accent)")
    .attr("stroke-width", 4)
    .attr("stroke-linecap", "round");

  groups.append("text")
    .attr("x", 0)
    .attr("y", (d) => y(d[dataState.learnCost]) - 10)
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

function initLearnPage() {
  d3.select("#learn-rate").on("change", (event) => {
    dataState.learnRate = event.target.value;
    renderLearnSection();
  });

  d3.select("#learn-cost").on("change", (event) => {
    dataState.learnCost = event.target.value;
    renderLearnSection();
  });

  d3.select("#learn-sort").on("change", (event) => {
    dataState.learnSort = event.target.value;
    renderLearnSection();
  });
}

async function bootstrapLearn() {
  dataState.allRows = await d3.csv(
    "data/college_scorecard_data/Most-Recent-Cohorts-Institution.csv",
    parseInstitutionRow
  );
  initLearnPage();
  renderLearnSection();
  window.addEventListener("resize", renderLearnSection);
}

if (document.getElementById("employment-chart")) {
  bootstrapLearn();
}
