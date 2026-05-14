/**
 * Learn page: scatter of median earnings vs. admission rate, debt, or in-state / out-of-state tuition (College Scorecard).
 * Data: Most-Recent-Cohorts-Institution.csv
 */

/** Keys and CSV columns align with `EARNINGS_SERIES` in `new_script.js` (Explore). */
const earningsSliderLabels = [
  {
    field: "earn1YrAfterCompMdn",
    label: "Median earnings, 1 year after completion",
    axis: "Median earnings · 1 year after completion"
  },
  {
    field: "earn4YrAfterCompMdn",
    label: "Median earnings, 4 years after completion",
    axis: "Median earnings · 4 years after completion"
  }
];

/**
 * Scorecard CONTROL: 1 = public, 2 = private nonprofit, 3 = private for-profit.
 * "Prestigious" is private nonprofit (2) that meets isPrestigiousPrivate (SAT/ACT/admission heuristic).
 */
const CAT_PUBLIC = "Public";
const CAT_PRIVATE_NONPROFIT = "Private non-profit";
const CAT_PRIVATE_FOR_PROFIT = "Private for-profit";
const CAT_PRESTIGIOUS = "Prestigious";

const categoryColors = {
  [CAT_PUBLIC]: "#1f8a70",
  [CAT_PRIVATE_NONPROFIT]: "#c9a227",
  [CAT_PRESTIGIOUS]: "#7c3aed",
  [CAT_PRIVATE_FOR_PROFIT]: "#d4572f"
};

const categoryOrder = [
  CAT_PUBLIC,
  CAT_PRIVATE_NONPROFIT,
  CAT_PRIVATE_FOR_PROFIT,
  CAT_PRESTIGIOUS
];

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
    title: "in-state tuition",
    xField: "tuitionInState",
    axisBottom: "In-state tuition (TUITIONFEE_IN, same as Explore map)",
    xValid: (v) => v != null && v >= 0,
    domainFromData: (vals) => {
      if (!vals.length) return [0, 50000];
      const hi = d3.max(vals) ?? 0;
      return [0, Math.max(hi * 1.06, 1000)];
    },
    formatXAxis: (xScale) => d3.axisBottom(xScale).ticks(8).tickFormat(d3.format("$,.0f")),
    formatXTip: (v) => `In-state tuition: ${d3.format("$,.0f")(v)}`
  },
  tuitionOut: {
    key: "tuitionOut",
    title: "out-of-state tuition",
    xField: "tuitionOutState",
    axisBottom: "Out-of-state tuition (TUITIONFEE_OUT)",
    xValid: (v) => v != null && v >= 0,
    domainFromData: (vals) => {
      if (!vals.length) return [0, 50000];
      const hi = d3.max(vals) ?? 0;
      return [0, Math.max(hi * 1.06, 1000)];
    },
    formatXAxis: (xScale) => d3.axisBottom(xScale).ticks(8).tickFormat(d3.format("$,.0f")),
    formatXTip: (v) => `Out-of-state tuition: ${d3.format("$,.0f")(v)}`
  }
};

/** Short phrases for readers — avoids stats jargon in UI copy. */
function plainBottomAxisTopic(modeKey) {
  if (modeKey === "adm") return "how many applicants each school admits";
  if (modeKey === "debt") return "how much students typically borrow to finish";
  if (modeKey === "tuition") return "in-state sticker tuition";
  if (modeKey === "tuitionOut") return "out-of-state sticker tuition";
  return "the measure along the bottom";
}

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

/** Heuristic "Prestigious" bucket: private nonprofit with very high test scores or very low admission rate. */
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
  if (control === "3") category = CAT_PRIVATE_FOR_PROFIT;
  else if (control === "2" && isPrestigiousPrivate(row)) category = CAT_PRESTIGIOUS;
  else if (control === "1") category = CAT_PUBLIC;
  else if (control === "2") category = CAT_PRIVATE_NONPROFIT;
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
    tuitionOutState: num(row.TUITIONFEE_OUT),
    earn1YrAfterCompMdn: num(row.MD_EARN_WNE_1YR),
    earn4YrAfterCompMdn: num(row.MD_EARN_WNE_4YR)
  };
}

function getChartMode() {
  const sel = document.getElementById("chart-x-mode");
  const v = sel && sel.value;
  return chartModes[v] ? v : "adm";
}

function categoryVisible(cat) {
  const id = {
    [CAT_PUBLIC]: "filter-public",
    [CAT_PRIVATE_NONPROFIT]: "filter-private",
    [CAT_PRESTIGIOUS]: "filter-prestigious",
    [CAT_PRIVATE_FOR_PROFIT]: "filter-forprofit"
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

const EARN_FIELD_1YR = "earn1YrAfterCompMdn";
const EARN_FIELD_4YR = "earn4YrAfterCompMdn";

function rowsPassingFilters(rows) {
  return rows.filter((r) => passesFilters(r));
}

function rowsForCategory(rows, cat) {
  return rowsPassingFilters(rows).filter((r) => r.category === cat);
}

function medianEarnForRows(rows, earnField) {
  const vals = rows.map((r) => r[earnField]).filter((v) => v != null && Number.isFinite(v));
  if (vals.length < 4) return null;
  return d3.median(vals);
}

/** Friendly noun phrase for copy (lowercase where it reads mid-sentence). */
function friendlyInstitutionBucket(cat) {
  if (cat === CAT_PRESTIGIOUS) return "prestigious institutions";
  if (cat === CAT_PUBLIC) return "public institutions";
  if (cat === CAT_PRIVATE_NONPROFIT) return "private non-profit institutions";
  if (cat === CAT_PRIVATE_FOR_PROFIT) return "for-profit institutions";
  return `${cat} institutions`;
}

/**
 * Compare two categories on typical 1-year vs 4-year pay (same checkbox/state filters; no x-axis filter).
 * y1 and y4 are median(catA) - median(catB) at each horizon.
 */
function dualYearGapBetweenCategories(rows, catA, catB) {
  const ra = rowsForCategory(rows, catA);
  const rb = rowsForCategory(rows, catB);
  if (ra.length < 4 || rb.length < 4) return null;
  const a1 = medianEarnForRows(ra, EARN_FIELD_1YR);
  const b1 = medianEarnForRows(rb, EARN_FIELD_1YR);
  const a4 = medianEarnForRows(ra, EARN_FIELD_4YR);
  const b4 = medianEarnForRows(rb, EARN_FIELD_4YR);
  if (a1 == null || b1 == null || a4 == null || b4 == null) return null;
  const y1 = a1 - b1;
  const y4 = a4 - b4;
  return {
    y1,
    y4,
    abs1: Math.abs(y1),
    abs4: Math.abs(y4),
    labA: friendlyInstitutionBucket(catA),
    labB: friendlyInstitutionBucket(catB)
  };
}

function hedDekFromDualGap(fmtMoney, g) {
  if (!g) return null;
  if (g.abs1 < 2000 && g.abs4 < 2000) return null;
  const win1 = g.y1 >= 0 ? g.labA : g.labB;
  const lose1 = g.y1 >= 0 ? g.labB : g.labA;
  const win4 = g.y4 >= 0 ? g.labA : g.labB;
  const lose4 = g.y4 >= 0 ? g.labB : g.labA;
  const hed = `One year after graduation, graduates of ${win1} make about ${fmtMoney(g.abs1)} more on average than graduates of ${lose1} among the schools you’re showing.`;

  let dek = "";
  if (Math.sign(g.y1) === Math.sign(g.y4)) {
    if (g.abs4 > g.abs1 * 1.1) {
      dek = `After four years, that earnings gap widens to about ${fmtMoney(g.abs4)}, with ${win4} still ahead of ${lose4} on average in this slice.`;
    } else if (g.abs4 < g.abs1 * 0.9) {
      dek = `After four years, the gap narrows to about ${fmtMoney(g.abs4)} on average—${win4} still leads, but the distance gets smaller.`;
    } else {
      dek = `After four years, the gap is still near ${fmtMoney(g.abs4)} on average—roughly the same ballpark as the first year out.`;
    }
  } else {
    dek = `After four years, the picture shifts: graduates of ${win4} average about ${fmtMoney(g.abs4)} more than graduates of ${lose4}—so the ranking flips between the two horizons; dig into individual campuses before treating this as a rule.`;
  }
  return { hed, dek };
}

function pearsonForEarnField(plotRows, mode, earnField) {
  const xs = [];
  const ys = [];
  for (const r of plotRows) {
    const x = r[mode.xField];
    const y = r[earnField];
    if (x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y)) continue;
    xs.push(x);
    ys.push(y);
  }
  return xs.length >= 25 ? pearsonCorrelation(xs, ys) : null;
}

function correlationYearVoice(modeKey, r1, r4) {
  const strong = (r) => r != null && Math.abs(r) >= 0.12;
  if (!strong(r1) && !strong(r4)) return null;

  let second = "";
  if (strong(r1) && strong(r4)) {
    if (Math.abs(r4) > Math.abs(r1) * 1.08) second = " After four years, that same tilt looks a bit stronger on average.";
    else if (Math.abs(r4) < Math.abs(r1) * 0.92) second = " After four years, the tilt eases a little but still points the same way on average.";
    else second = " After four years, the picture is about as tilted as it is one year out.";
  } else if (strong(r4)) {
    second = " Looking four years out, that same direction still shows up for typical pay.";
  } else {
    second = " Looking four years out, the pattern is similar though a few campuses flip the story.";
  }

  if (modeKey === "debt") {
    if ((strong(r4) ? r4 : r1) < 0) {
      return `One year after graduation, graduates from schools with heavier typical borrowing more often sit lower on typical pay in this cloud.${second}`;
    }
    return `One year after graduation, heavier borrowing and higher pay often rise together for many of these campuses—money and outcomes are tangled, not simple opposites.${second}`;
  }
  if (modeKey === "adm") {
    if ((strong(r4) ? r4 : r1) < 0) {
      return `One year after graduation, pickier schools that admit a smaller share of applicants more often sit higher on typical pay here.${second}`;
    }
    return `One year after graduation, schools that admit a larger share of applicants more often sit a bit higher on typical pay here.${second}`;
  }
  if (modeKey === "tuition" || modeKey === "tuitionOut") {
    if ((strong(r4) ? r4 : r1) < 0) {
      return `One year after graduation, higher sticker tuition more often lines up with somewhat lower typical pay among these campuses.${second}`;
    }
    return `One year after graduation, higher sticker tuition and higher typical pay often rise together for many campuses here.${second}`;
  }
  return null;
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

function pearsonCorrelation(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = d3.mean(xs);
  const my = d3.mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const vx = xs[i] - mx;
    const vy = ys[i] - my;
    num += vx * vy;
    dx += vx * vx;
    dy += vy * vy;
  }
  const den = Math.sqrt(dx * dy);
  if (den === 0 || !Number.isFinite(den)) return null;
  const r = num / den;
  return Number.isFinite(r) ? r : null;
}

/**
 * Short trend bullets for the pull strip — plain language, big-picture patterns.
 */
function buildScatterCalloutLines(stats, plotRows, mode, modeKey, field, earningsLabel, rows) {
  const fmtMoney = (x) => `$${Math.round(x).toLocaleString("en-US")}`;
  const bottomTopic = plainBottomAxisTopic(modeKey);
  const nShown = plotRows.length;
  if (nShown === 0) {
    return [{ text: "Nothing to show yet—loosen a filter or pick another measure along the bottom.", fill: "#5a6172" }];
  }

  const r1 = pearsonForEarnField(plotRows, mode, EARN_FIELD_1YR);
  const r4 = pearsonForEarnField(plotRows, mode, EARN_FIELD_4YR);
  const corrVoice = correlationYearVoice(modeKey, r1, r4);

  const minN = 5;
  const rich = stats.filter((s) => s.count >= minN && s.median != null);
  let top;
  let bottom;
  if (rich.length >= 2) {
    const sorted = [...rich].sort((a, b) => b.median - a.median);
    top = sorted[0];
    bottom = sorted[sorted.length - 1];
  }

  const lines = [];

  if (categoryVisible(CAT_PRESTIGIOUS) && categoryVisible(CAT_PUBLIC)) {
    const g = dualYearGapBetweenCategories(rows, CAT_PRESTIGIOUS, CAT_PUBLIC);
    const pair = hedDekFromDualGap(fmtMoney, g);
    if (pair) {
      lines.push({ text: pair.hed, fill: categoryColors[CAT_PRESTIGIOUS] });
      lines.push({ text: pair.dek, fill: "#5a6172" });
    }
  }

  const isPrestPublicPair =
    top &&
    bottom &&
    ((top.group === CAT_PRESTIGIOUS && bottom.group === CAT_PUBLIC) ||
      (top.group === CAT_PUBLIC && bottom.group === CAT_PRESTIGIOUS));

  if (lines.length < 2 && top && bottom && top.group !== bottom.group && (!isPrestPublicPair || lines.length === 0)) {
    const g = dualYearGapBetweenCategories(rows, top.group, bottom.group);
    const pair = hedDekFromDualGap(fmtMoney, g);
    if (pair) {
      lines.push({ text: pair.hed, fill: categoryColors[top.group] || "#162033" });
      lines.push({ text: pair.dek, fill: "#5a6172" });
    }
  }

  if (lines.length < 3 && categoryVisible(CAT_PRIVATE_NONPROFIT) && categoryVisible(CAT_PRIVATE_FOR_PROFIT)) {
    const g = dualYearGapBetweenCategories(rows, CAT_PRIVATE_NONPROFIT, CAT_PRIVATE_FOR_PROFIT);
    const pair = hedDekFromDualGap(fmtMoney, g);
    if (pair) {
      lines.push({ text: pair.hed, fill: categoryColors[CAT_PRIVATE_NONPROFIT] });
      if (lines.length < 3) lines.push({ text: pair.dek, fill: "#5a6172" });
    }
  }

  if (lines.length < 3 && corrVoice) {
    lines.push({ text: corrVoice, fill: modeKey === "debt" ? "#a63d24" : "#135a4d" });
  }

  if (lines.length === 0) {
    lines.push({
      text: `${nShown.toLocaleString()} campuses match your choices—slide between one year and four years after graduation to see how the story shifts.`,
      fill: "#162033"
    });
  }

  const st = stateFilterActive();
  if (lines.length < 3 && st) {
    lines.push({
      text: `You’re only looking at ${st} right now; opening the filter to all states can change how wide these gaps look.`,
      fill: "#5a6172"
    });
  }

  if (
    lines.length < 3 &&
    corrVoice == null &&
    r1 != null &&
    r4 != null &&
    plotRows.length >= 25 &&
    Math.abs(r1) < 0.12 &&
    Math.abs(r4) < 0.12
  ) {
    lines.push({
      text: `One year and four years after graduation, pay and ${bottomTopic} still don’t line up in a neat straight line—plenty of schools break the mold.`,
      fill: "#5a6172"
    });
  }

  return lines.slice(0, 3);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function updateTrendPullCallouts(lines) {
  const el = document.getElementById("scatter-trend-callouts");
  if (!el) return;
  if (!lines || !lines.length) {
    el.innerHTML = "";
    el.classList.add("viz-trend-pull--empty");
    return;
  }
  el.classList.remove("viz-trend-pull--empty");
  const items = lines
    .map((L) => {
      const c = L.fill || "#135a4d";
      return `<li class="viz-trend-pull__item" style="--pull-accent:${escapeHtml(c)}"><span class="viz-trend-pull__text">${escapeHtml(L.text)}</span></li>`;
    })
    .join("");
  el.innerHTML = `<div class="viz-trend-pull__inner"><p class="viz-trend-pull__eyebrow">What stands out</p><ul class="viz-trend-pull__list">${items}</ul></div>`;
}

function renderScatter(animate = false) {
  const modeKey = getChartMode();
  const mode = chartModes[modeKey];
  const sliderIndex = scatterState.sliderIndex;
  const rows = scatterState.rows;
  const field = earningsSliderLabels[sliderIndex].field;

  const plotRows = rows.filter((r) => rowEligibleForPlot(r, sliderIndex, modeKey));

  const xVals = plotRows.map((d) => d[mode.xField]);
  const [x0, x1] = mode.domainFromData(xVals);
  const margin = { top: 24, right: 28, bottom: 64, left: 72 };
  const svg = d3.select("#earnings-scatter-chart");
  const parent = svg.node().parentElement;
  const rect = parent.getBoundingClientRect();
  const width = Math.max(rect.width, 520) - margin.left - margin.right;
  const height = 480 - margin.top - margin.bottom;
  const fullW = width + margin.left + margin.right;
  const fullH = height + margin.top + margin.bottom;

  let root = svg.select("g.scatter-plot-root");
  const isBootstrap = root.empty();
  if (isBootstrap) {
    animate = false;
    svg.selectAll("*").remove();
    svg.attr("width", fullW).attr("height", fullH);
    root = svg
      .append("g")
      .attr("class", "scatter-plot-root")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    root.append("g").attr("class", "scatter-grid");
    root.append("g").attr("class", "scatter-axis-x");
    root.append("g").attr("class", "scatter-axis-y");
    root.append("g").attr("class", "scatter-dots");
    root.append("text").attr("class", "scatter-ylabel");
    root.append("text").attr("class", "scatter-xlabel");
  } else {
    svg.attr("width", fullW).attr("height", fullH);
    root.attr("transform", `translate(${margin.left},${margin.top})`);
  }

  root.select("g.scatter-callouts").remove();

  const tDur = 400;
  const ease = d3.easeCubicInOut;
  const tsel = (sel) => (animate ? sel.transition().duration(tDur).ease(ease) : sel);

  const xScale = d3.scaleLinear().domain([x0, x1]).range([0, width]).nice();

  const yMax = d3.max(plotRows, (d) => d[field]) ?? 100000;
  const yScale = d3
    .scaleLinear()
    .domain([0, yMax * 1.06])
    .nice()
    .range([height, 0]);

  const jitterPx = 5;
  const circleCx = (d) => {
    const xv = d[mode.xField];
    const j = (hashUnitid(d.unitid + "x") - 0.5) * jitterPx * 2;
    return xScale(xv) + j;
  };
  const circleCy = (d) => {
    const j = (hashUnitid(d.unitid + "y") - 0.5) * jitterPx * 2;
    return yScale(d[field]) + j;
  };

  const grid = root.select(".scatter-grid").attr("opacity", 0.12);
  tsel(grid).call(d3.axisLeft(yScale).tickSize(-width).tickFormat(""));
  grid.select(".domain").remove();

  const axX = root.select(".scatter-axis-x").attr("transform", `translate(0,${height})`);
  tsel(axX).call(mode.formatXAxis(xScale));
  axX.selectAll("text").attr("font-size", "12px");
  axX.select(".domain").remove();

  const axY = root.select(".scatter-axis-y");
  tsel(axY).call(d3.axisLeft(yScale).tickFormat(d3.format("$,.0f")));
  axY.select(".domain").remove();

  const yCap = root
    .select(".scatter-ylabel")
    .attr("transform", "rotate(-90)")
    .attr("y", -60)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--ink)")
    .attr("font-size", "13px")
    .attr("font-weight", "600");
  tsel(yCap).text(earningsSliderLabels[sliderIndex].axis);

  const xCap = root
    .select(".scatter-xlabel")
    .attr("x", width / 2)
    .attr("y", height + 48)
    .attr("text-anchor", "middle")
    .attr("fill", "var(--ink)")
    .attr("font-size", "13px")
    .attr("font-weight", "600");
  tsel(xCap).text(mode.axisBottom);

  const tip = d3.select("#scatter-tooltip");
  const fmtMoney = d3.format("$,.0f");

  const dotG = root.select(".scatter-dots");
  const circles = dotG.selectAll("circle").data(plotRows, (d) => d.unitid);

  circles
    .exit()
    .interrupt()
    .transition()
    .duration(animate ? 220 : 0)
    .attr("r", 0)
    .attr("fill-opacity", 0)
    .remove();

  const enter = circles
    .enter()
    .append("circle")
    .attr("fill", (d) => categoryColors[d.category])
    .attr("stroke", "rgba(22, 32, 51, 0.35)")
    .attr("stroke-width", 0.8)
    .attr("cx", circleCx)
    .attr("cy", circleCy)
    .attr("r", 0)
    .attr("fill-opacity", 0);

  const merged = enter.merge(circles);
  tsel(merged)
    .attr("cx", circleCx)
    .attr("cy", circleCy)
    .attr("r", 4.5)
    .attr("fill-opacity", 0.5)
    .attr("fill", (d) => categoryColors[d.category]);

  merged
    .style("cursor", "default")
    .on("mouseenter", function (_event, d) {
      d3.select(this).interrupt();
      d3.select(this).attr("r", 7).attr("fill-opacity", 0.95);
      const mk = getChartMode();
      const m = chartModes[mk];
      const xv = d[m.xField];
      const si = scatterState.sliderIndex;
      const fld = earningsSliderLabels[si].field;
      tip.style("opacity", 1).html(
        `<strong>${d.name}</strong><br>${d.state} · ${d.category}<br>${m.formatXTip(xv)}<br>${earningsSliderLabels[si].label}: ${fmtMoney(d[fld])}`
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

  const stats = summarizeByCategory(rows, sliderIndex, modeKey);

  const titleEl = document.getElementById("scatter-chart-title-dynamic");
  if (titleEl) {
    titleEl.textContent = `Earnings vs. ${mode.title}`;
  }

  const calloutLines = buildScatterCalloutLines(
    stats,
    plotRows,
    mode,
    modeKey,
    field,
    earningsSliderLabels[sliderIndex].label,
    rows
  );
  updateTrendPullCallouts(calloutLines);
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
  if (!slider || !sliderValue) {
    if (window.__appLoading) window.__appLoading.markScatterReady();
    return;
  }
  const nHorizons = earningsSliderLabels.length;
  const maxIdx = nHorizons - 1;
  slider.min = "0";
  slider.max = String(maxIdx);
  slider.step = "1";
  slider.setAttribute("aria-valuemin", "0");
  slider.setAttribute("aria-valuemax", String(maxIdx));

  d3.csv("data/college_scorecard_data/Most-Recent-Cohorts-Institution.csv")
    .then((raw) => {
      scatterState.rows = raw.map(parseScatterRow).filter(Boolean);
      populateStateFilter(scatterState.rows);

      const rerender = () => renderScatter(false);

      slider.addEventListener("input", () => {
        scatterState.sliderIndex = Math.min(maxIdx, Math.max(0, +slider.value));
        slider.value = String(scatterState.sliderIndex);
        slider.setAttribute("aria-valuenow", String(scatterState.sliderIndex));
        sliderValue.textContent = earningsSliderLabels[scatterState.sliderIndex].label;
        renderScatter(true);
      });

      ["filter-public", "filter-private", "filter-forprofit", "filter-prestigious"].forEach((id) => {
        document.getElementById(id).addEventListener("change", rerender);
      });

      document.getElementById("state-filter").addEventListener("change", rerender);
      document.getElementById("chart-x-mode").addEventListener("change", rerender);

      window.addEventListener("resize", rerender);

      scatterState.sliderIndex = Math.min(maxIdx, Math.max(0, +slider.value || 0));
      slider.value = String(scatterState.sliderIndex);
      slider.setAttribute("aria-valuenow", String(scatterState.sliderIndex));
      sliderValue.textContent = earningsSliderLabels[scatterState.sliderIndex].label;
      rerender();
      if (window.__appLoading) window.__appLoading.markScatterReady();
    })
    .catch(() => {
      if (window.__appLoading) {
        window.__appLoading.setMessage("Could not load chart data.");
        window.__appLoading.markScatterReady();
      }
    });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLearnScatter);
} else {
  initLearnScatter();
}
