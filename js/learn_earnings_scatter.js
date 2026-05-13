/**
 * Learn page: scatter of median earnings vs. admission rate, debt, or tuition (College Scorecard).
 * Data: Most-Recent-Cohorts-Institution.csv
 */

const earningsSliderLabels = [
  {
    field: "y1P50Earnings",
    label: "Median earnings (6 yr after entry, P6)",
    axis: "Median earnings (6 yr after entry, P6)"
  },
  {
    field: "y5P50Earnings",
    label: "Median earnings (8 yr after entry, P8)",
    axis: "Median earnings (8 yr after entry, P8)"
  },
  {
    field: "y10P50Earnings",
    label: "Median earnings (10 yr after entry, P10)",
    axis: "Median earnings (10 yr after entry, P10)"
  }
];

const categoryColors = {
  Public: "#1f8a70",
  Private: "#c9a227",
  Prestigious: "#7c3aed",
  "For-profit": "#d4572f"
};

const categoryOrder = ["Public", "Private", "Prestigious", "For-profit"];

const chartModes = {
  adm: {
    key: "adm",
    title: "admission rate",
    xField: "admRate",
    axisBottom: "Admission rate (share admitted)",
    xValid: (v) => v != null && v >= 0 && v <= 1,
    domainFromData: (vals) => [0, 1],
    formatXAxis: (xScale) => d3.axisBottom(xScale).ticks(10, ".0%"),
    formatXTip: (v) => `Admitted: ${d3.format(".1%")(v)}`
  },
  debt: {
    key: "debt",
    title: "graduate debt",
    xField: "completerDebt",
    axisBottom: "Median graduate debt (completers, GRAD_DEBT_MDN)",
    xValid: (v) => v != null && v > 0,
    domainFromData: (vals) => {
      if (!vals.length) return [0, 50000];
      const hi = d3.max(vals) ?? 0;
      return [0, hi * 1.06];
    },
    formatXAxis: (xScale) => d3.axisBottom(xScale).ticks(8).tickFormat(d3.format("$,.0f")),
    formatXTip: (v) => `Completer debt: ${d3.format("$,.0f")(v)}`
  },
  tuition: {
    key: "tuition",
    title: "tuition",
    xField: "tuitionInState",
    axisBottom: "In-state tuition (TUITIONFEE_IN, same as Explore map)",
    xValid: (v) => v != null && v >= 0,
    domainFromData: (vals) => {
      if (!vals.length) return [0, 50000];
      const hi = d3.max(vals) ?? 0;
      return [0, Math.max(hi * 1.06, 1000)];
    },
    formatXAxis: (xScale) => d3.axisBottom(xScale).ticks(8).tickFormat(d3.format("$,.0f")),
    formatXTip: (v) => `Tuition: ${d3.format("$,.0f")(v)}`
  }
};

const scatterState = {
  rows: [],
  sliderIndex: 0
};

function num(v) {
  if (v === "" || v == null || v === "PrivacySuppressed") return null;
  const n = +v;
  return Number.isFinite(n) ? n : null;
}

function hashUnitid(unitid) {
  const s = String(unitid);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return (h >>> 0) / 4294967295;
}

function isPrestigiousPrivate(row) {
  const sat = num(row.SAT_AVG) ?? num(row.SAT_AVG_ALL);
  const adm = num(row.ADM_RATE);
  const act = num(row.ACTCMMID);
  if (sat != null && sat >= 1430) return true;
  if (act != null && act >= 33) return true;
  if (adm != null && adm > 0 && adm <= 0.12) return true;
  return false;
}

function parseScatterRow(row) {
  const control = row.CONTROL;

  let category;
  if (control === "3") category = "For-profit";
  else if (control === "2" && isPrestigiousPrivate(row)) category = "Prestigious";
  else if (control === "1") category = "Public";
  else if (control === "2") category = "Private";
  else return null;

  return {
    unitid: row.UNITID,
    name: row.INSTNM,
    state: row.STABBR,
    control,
    category,
    admRate: num(row.ADM_RATE),
    completerDebt: num(row.GRAD_DEBT_MDN),
    tuitionInState: num(row.TUITIONFEE_IN),
    y1P50Earnings: num(row.MD_EARN_WNE_P6),
    y5P50Earnings: num(row.MD_EARN_WNE_P8),
    y10P50Earnings: num(row.MD_EARN_WNE_P10)
  };
}

function getChartMode() {
  const sel = document.getElementById("chart-x-mode");
  const v = sel && sel.value;
  return chartModes[v] ? v : "adm";
}

function getX(d) {
  const mode = chartModes[getChartMode()];
  return d[mode.xField];
}

function categoryVisible(cat) {
  const id = {
    Public: "filter-public",
    Private: "filter-private",
    Prestigious: "filter-prestigious",
    "For-profit": "filter-forprofit"
  }[cat];
  const el = document.getElementById(id);
  return el ? el.checked : true;
}

function stateFilterActive() {
  const sel = document.getElementById("state-filter");
  if (!sel) return null;
  const v = sel.value;
  return v === "" ? null : v;
}

function passesFilters(d) {
  if (!categoryVisible(d.category)) return false;
  const st = stateFilterActive();
  if (st != null && d.state !== st) return false;
  return true;
}

function rowEligibleForPlot(r, sliderIndex, modeKey) {
  const mode = chartModes[modeKey];
  const f = earningsSliderLabels[sliderIndex].field;
  if (!passesFilters(r) || r[f] == null) return false;
  const xv = r[mode.xField];
  return mode.xValid(xv);
}

function summarizeByCategory(rows, sliderIndex, modeKey) {
  const f = earningsSliderLabels[sliderIndex].field;
  return categoryOrder.map((cat) => {
    const vals = rows
      .filter((r) => r.category === cat && rowEligibleForPlot(r, sliderIndex, modeKey))
      .map((r) => r[f]);
    if (!vals.length) {
      return { group: cat, count: 0, median: null, mean: null, min: null, max: null, q1: null, q3: null };
    }
    const sorted = [...vals].sort((a, b) => a - b);
    return {
      group: cat,
      count: vals.length,
      mean: d3.mean(vals),
      median: d3.median(vals),
      q1: d3.quantile(sorted, 0.25),
      q3: d3.quantile(sorted, 0.75),
      min: d3.min(vals),
      max: d3.max(vals)
    };
  });
}

function updateStatsDisplay(stats) {
  const statsContainer = document.getElementById("scatter-stats-container");
  statsContainer.innerHTML = "";

  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.fontSize = "14px";

  const headerRow = table.insertRow();
  ["Category", "Count", "Median", "Mean", "Min", "Max", "Q1–Q3"].forEach((header) => {
    const cell = headerRow.insertCell();
    cell.textContent = header;
    cell.style.padding = "10px";
    cell.style.borderBottom = "1px solid rgba(22, 32, 51, 0.1)";
    cell.style.fontWeight = "600";
    cell.style.backgroundColor = "rgba(31, 138, 112, 0.05)";
  });

  stats.forEach((d) => {
    const row = table.insertRow();
    const fmt = (x) =>
      x == null ? "—" : `$${x.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    const cells = [
      d.group,
      d.count,
      fmt(d.median),
      fmt(d.mean),
      fmt(d.min),
      fmt(d.max),
      d.q1 == null ? "—" : `${fmt(d.q1)}–${fmt(d.q3)}`
    ];
    cells.forEach((cellText, idx) => {
      const cell = row.insertCell();
      cell.textContent = cellText;
      cell.style.padding = "10px";
      cell.style.borderBottom = "1px solid rgba(22, 32, 51, 0.05)";
      if (idx === 0) cell.style.fontWeight = "500";
    });
  });

  statsContainer.appendChild(table);
}

function renderScatter() {
  const modeKey = getChartMode();
  const mode = chartModes[modeKey];
  const sliderIndex = scatterState.sliderIndex;
  const rows = scatterState.rows;
  const field = earningsSliderLabels[sliderIndex].field;

  const plotRows = rows.filter((r) => rowEligibleForPlot(r, sliderIndex, modeKey));

  const xVals = plotRows.map((d) => getX(d));
  const [x0, x1] = mode.domainFromData(xVals);
  const margin = { top: 24, right: 28, bottom: 64, left: 72 };
  const svg = d3.select("#earnings-scatter-chart");
  const parent = svg.node().parentElement;
  const rect = parent.getBoundingClientRect();
  const width = Math.max(rect.width, 520) - margin.left - margin.right;
  const height = 480 - margin.top - margin.bottom;

  svg.selectAll("*").remove();

  const g = svg
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear().domain([x0, x1]).range([0, width]).nice();

  const yMax = d3.max(plotRows, (d) => d[field]) ?? 100000;
  const yScale = d3
    .scaleLinear()
    .domain([0, yMax * 1.06])
    .nice()
    .range([height, 0]);

  const jitterPx = 5;

  g.append("g")
    .attr("class", "grid")
    .attr("opacity", 0.12)
    .call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""));

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(mode.formatXAxis(xScale))
    .selectAll("text")
    .attr("font-size", "12px");

  g.append("g").call(d3.axisLeft(yScale).tickFormat(d3.format("$,.0f")));

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -52)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--ink)")
    .attr("font-size", "13px")
    .attr("font-weight", "600")
    .text(earningsSliderLabels[sliderIndex].axis);

  g.append("text")
    .attr("x", width / 2)
    .attr("y", height + 48)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--ink)")
    .attr("font-size", "13px")
    .attr("font-weight", "600")
    .text(mode.axisBottom);

  const tip = d3.select("#scatter-tooltip");
  const fmtMoney = d3.format("$,.0f");

  g.selectAll("circle")
    .data(plotRows, (d) => d.unitid)
    .join("circle")
    .attr("r", 4.5)
    .attr("fill", (d) => categoryColors[d.category])
    .attr("fill-opacity", 0.5)
    .attr("stroke", "rgba(22, 32, 51, 0.35)")
    .attr("stroke-width", 0.8)
    .attr("cx", (d) => {
      const xv = getX(d);
      const j = (hashUnitid(d.unitid + "x") - 0.5) * jitterPx * 2;
      return xScale(xv) + j;
    })
    .attr("cy", (d) => {
      const j = (hashUnitid(d.unitid + "y") - 0.5) * jitterPx * 2;
      return yScale(d[field]) + j;
    })
    .style("cursor", "default")
    .on("mouseenter", function (event, d) {
      d3.select(this).attr("r", 7).attr("fill-opacity", 0.95);
      const xv = getX(d);
      tip.style("opacity", 1).html(
        `<strong>${d.name}</strong><br>${d.state} · ${d.category}<br>${mode.formatXTip(xv)}<br>${earningsSliderLabels[sliderIndex].label}: ${fmtMoney(d[field])}`
      );
    })
    .on("mousemove", (event) => {
      const box = parent.getBoundingClientRect();
      tip.style("left", `${event.clientX - box.left + 12}px`).style("top", `${event.clientY - box.top + 12}px`);
    })
    .on("mouseleave", function () {
      d3.select(this).attr("r", 4.5).attr("fill-opacity", 0.5);
      tip.style("opacity", 0);
    });

  const nShown = plotRows.length;
  const stats = summarizeByCategory(rows, sliderIndex, modeKey);
  const sumTable = d3.sum(stats, (s) => s.count);

  const titleEl = document.getElementById("scatter-chart-title");
  const descEl = document.getElementById("scatter-chart-description");
  if (titleEl) {
    titleEl.textContent = `Earnings vs. ${mode.title} (${earningsSliderLabels[sliderIndex].label})`;
  }
  if (descEl) {
    descEl.textContent = `${nShown.toLocaleString()} schools on the plot. The summary table uses the same rules, so category counts sum to ${sumTable.toLocaleString()}. Earnings and tuition match Explore (P6/P8/P10; in-state tuition only).`;
  }

  updateStatsDisplay(stats);
}

function populateStateFilter(rows) {
  const sel = document.getElementById("state-filter");
  const current = sel.value;
  const states = [...new Set(rows.map((r) => r.state).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">All states</option>';
  for (const st of states) {
    const opt = document.createElement("option");
    opt.value = st;
    opt.textContent = st;
    sel.appendChild(opt);
  }
  if (states.includes(current)) sel.value = current;
}

function initLearnScatter() {
  const slider = document.getElementById("earnings-horizon-slider");
  const sliderValue = document.getElementById("earnings-horizon-value");

  d3.csv("data/college_scorecard_data/Most-Recent-Cohorts-Institution.csv").then((raw) => {
    scatterState.rows = raw.map(parseScatterRow).filter(Boolean);
    populateStateFilter(scatterState.rows);

    const rerender = () => renderScatter();

    slider.addEventListener("input", () => {
      scatterState.sliderIndex = +slider.value;
      slider.setAttribute("aria-valuenow", String(scatterState.sliderIndex));
      sliderValue.textContent = earningsSliderLabels[scatterState.sliderIndex].label;
      rerender();
    });

    ["filter-public", "filter-private", "filter-prestigious", "filter-forprofit"].forEach((id) => {
      document.getElementById(id).addEventListener("change", rerender);
    });

    document.getElementById("state-filter").addEventListener("change", rerender);
    document.getElementById("chart-x-mode").addEventListener("change", rerender);

    window.addEventListener("resize", rerender);

    scatterState.sliderIndex = +slider.value;
    sliderValue.textContent = earningsSliderLabels[scatterState.sliderIndex].label;
    rerender();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLearnScatter);
} else {
  initLearnScatter();
}
